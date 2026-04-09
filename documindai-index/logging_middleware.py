"""
Request logging middleware for FastAPI.
Automatically logs all incoming requests and responses.
"""
import time
import uuid
import logging
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
from typing import Callable
from db_logger import DatabaseLogger

logger = logging.getLogger(__name__)

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware to log all API requests and responses.
    Captures request metadata, response times, status codes, and errors.
    """
    
    def __init__(self, app: ASGIApp, service_name: str):
        super().__init__(app)
        self.service_name = service_name
        self.db_logger = DatabaseLogger()
        
        # Only log these paths (indexing operations)
        self.log_paths = [
            '/index/process',        # Document indexing
            '/index/reindex',        # Re-indexing
            '/index/delete',         # Vector deletion
            '/index/batch',          # Batch operations
        ]
        
        logger.info(f"RequestLoggingMiddleware initialized for service: {service_name}")
        logger.info(f"Logging filtered paths: {self.log_paths}")
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Process request and log details.
        
        Args:
            request: Incoming FastAPI request
            call_next: Next middleware/route handler
            
        Returns:
            Response from the application
        """
        # Generate unique request ID
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        
        # Capture start time
        start_time = time.time()
        
        # Extract request metadata
        user_id = getattr(request.state, 'user_id', None)
        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get('user-agent')
        method = request.method
        path = str(request.url.path)
        
        # Skip logging for paths not in our filter list
        should_log = any(path.startswith(log_path) for log_path in self.log_paths)
        
        # Get request size (approximate)
        request_size = int(request.headers.get('content-length', 0))
        
        # Process request
        status_code = 500  # Default to error
        error_message = None
        response = None
        
        try:
            response = await call_next(request)
            status_code = response.status_code
        except Exception as e:
            status_code = 500
            error_message = str(e)
            logger.error(f"Request {request_id} failed: {e}", exc_info=True)
            # Re-raise to let FastAPI handle it
            raise
        finally:
            # Calculate duration
            duration_ms = int((time.time() - start_time) * 1000)
            
            # Get response size (if available)
            response_size = 0
            if response and hasattr(response, 'headers'):
                response_size = int(response.headers.get('content-length', 0))
            
            # Log to database only for filtered paths (async, non-blocking)
            if should_log:
                try:
                    await self.db_logger.log_request(
                        request_id=request_id,
                        service=self.service_name,
                        method=method,
                        path=path,
                        user_id=user_id,
                        status_code=status_code,
                        duration_ms=duration_ms,
                        request_size=request_size,
                        response_size=response_size,
                        ip_address=ip_address,
                        user_agent=user_agent,
                        error_message=error_message,
                        metadata={
                            'query_params': dict(request.query_params) if request.query_params else None,
                            'headers': {k: v for k, v in request.headers.items() 
                                      if k.lower() not in ['authorization', 'cookie']}  # Don't log sensitive headers
                        }
                    )
                except Exception as log_error:
                    # Don't fail the request if logging fails
                    logger.error(f"Failed to log request {request_id}: {log_error}")
            
            # Log to stdout as well (for Docker logs) - always log for debugging
            log_message = (
                f"[{request_id}] {method} {path} | "
                f"Status: {status_code} | "
                f"Duration: {duration_ms}ms | "
                f"User: {user_id or 'anonymous'}"
            )
            if status_code >= 500:
                logger.error(log_message)
            elif status_code >= 400:
                logger.warning(log_message)
            else:
                logger.info(log_message)
        
        # Add request ID to response headers
        if response:
            response.headers['X-Request-ID'] = request_id
        
        return response
