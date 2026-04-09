"""
WebSocket connection logging for chat service.
Tracks WebSocket connections, messages, and session durations.
"""
import time
import uuid
import logging
from typing import Optional
from db_logger import DatabaseLogger

logger = logging.getLogger(__name__)

class WebSocketLogger:
    """
    Logger for WebSocket connections in chat service.
    Tracks connection lifecycle, message counts, and errors.
    """
    
    def __init__(self):
        """Initialize WebSocket logger"""
        self.db_logger = DatabaseLogger()
        self.active_sessions = {}
    
    async def log_connection_start(
        self,
        session_id: str,
        user_id: str,
        conversation_id: str,
        file_ids: Optional[str] = None,
        ip_address: Optional[str] = None
    ):
        """
        Log WebSocket connection start.
        
        Args:
            session_id: Unique session identifier
            user_id: User ID
            conversation_id: Conversation ID
            file_ids: Comma-separated file IDs
            ip_address: Client IP address
        """
        self.active_sessions[session_id] = {
            'start_time': time.time(),
            'message_count': 0,
            'user_id': user_id,
            'conversation_id': conversation_id
        }
        
        # Log to API request logs as a WebSocket connection
        await self.db_logger.log_request(
            request_id=session_id,
            service="chat",
            method="WebSocket",
            path=f"/chat/{user_id}/{conversation_id}/{file_ids or 'none'}",
            user_id=user_id,
            status_code=101,  # Switching Protocols
            duration_ms=0,
            ip_address=ip_address,
            metadata={
                'type': 'websocket_connect',
                'conversation_id': conversation_id,
                'file_ids': file_ids
            }
        )
        
        logger.info(f"WebSocket session started: {session_id} | User: {user_id} | Conversation: {conversation_id}")
    
    async def log_message(
        self,
        session_id: str,
        message_type: str,
        message_size: int = 0
    ):
        """
        Log a WebSocket message.
        
        Args:
            session_id: Session identifier
            message_type: Type of message (question, answer, error)
            message_size: Size of message in bytes
        """
        if session_id in self.active_sessions:
            self.active_sessions[session_id]['message_count'] += 1
            logger.debug(f"WebSocket message: {session_id} | Type: {message_type} | Size: {message_size}B")
    
    async def log_connection_end(
        self,
        session_id: str,
        status: str = "normal",
        error_message: Optional[str] = None
    ):
        """
        Log WebSocket connection end.
        
        Args:
            session_id: Session identifier
            status: Connection close status (normal, error, timeout)
            error_message: Error message if connection failed
        """
        if session_id not in self.active_sessions:
            logger.warning(f"Attempted to close unknown session: {session_id}")
            return
        
        session_data = self.active_sessions[session_id]
        duration_ms = int((time.time() - session_data['start_time']) * 1000)
        message_count = session_data['message_count']
        
        # Determine status code
        status_code = 200 if status == "normal" else 500
        
        # Log session end to API request logs
        await self.db_logger.log_request(
            request_id=f"{session_id}_close",
            service="chat",
            method="WebSocket",
            path="/chat/disconnect",
            user_id=session_data['user_id'],
            status_code=status_code,
            duration_ms=duration_ms,
            error_message=error_message,
            metadata={
                'type': 'websocket_disconnect',
                'session_duration_ms': duration_ms,
                'message_count': message_count,
                'close_status': status
            }
        )
        
        # Log application event for errors
        if status != "normal":
            await self.db_logger.log_application(
                service="chat",
                log_level="ERROR",
                message=f"WebSocket session ended abnormally: {error_message or 'Unknown error'}",
                request_id=session_id,
                user_id=session_data['user_id'],
                conversation_id=session_data['conversation_id'],
                metadata={
                    'session_duration_ms': duration_ms,
                    'message_count': message_count
                }
            )
        
        logger.info(
            f"WebSocket session ended: {session_id} | "
            f"Duration: {duration_ms}ms | "
            f"Messages: {message_count} | "
            f"Status: {status}"
        )
        
        # Clean up session data
        del self.active_sessions[session_id]
    
    async def log_error(
        self,
        session_id: str,
        error_message: str,
        exception_type: Optional[str] = None,
        stack_trace: Optional[str] = None
    ):
        """
        Log a WebSocket error.
        
        Args:
            session_id: Session identifier
            error_message: Error message
            exception_type: Exception type
            stack_trace: Full stack trace
        """
        session_data = self.active_sessions.get(session_id, {})
        
        await self.db_logger.log_application(
            service="chat",
            log_level="ERROR",
            message=error_message,
            request_id=session_id,
            user_id=session_data.get('user_id'),
            conversation_id=session_data.get('conversation_id'),
            exception_type=exception_type,
            stack_trace=stack_trace
        )
        
        logger.error(f"WebSocket error: {session_id} | {error_message}")
