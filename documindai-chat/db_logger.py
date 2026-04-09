"""
Database logger for async logging to MySQL.
Provides non-blocking log insertion to api_request_logs and application_logs tables.
"""
import os
import json
import logging
import pymysql
from typing import Optional, Dict, Any
from datetime import datetime

logger = logging.getLogger(__name__)

class DatabaseLogger:
    """
    Async database logger for request and application logs.
    Provides methods to log API requests and application events to MySQL.
    """
    
    def __init__(self):
        """Initialize database connection for logging"""
        self.connection = None
        self.ensure_connection()
    
    def ensure_connection(self):
        """Ensure database connection is active, reconnect if needed"""
        try:
            if not self.connection or not self.connection.open:
                self.connection = pymysql.connect(
                    host=os.environ.get("RDS_DB_INSTANCE", "mysql"),
                    user=os.environ.get("RDS_DB_USER", "documindai_user"),
                    password=os.environ.get("RDS_DB_PASSWORD", "documindai_pass"),
                    database=os.environ.get("RDS_DB_NAME", "documindai_db"),
                    port=int(os.environ.get("RDS_DB_PORT", 3306)),
                    cursorclass=pymysql.cursors.DictCursor,
                    connect_timeout=5
                )
        except Exception as e:
            logger.error(f"Failed to connect to logging database: {e}")
            self.connection = None
    
    async def log_request(
        self,
        request_id: str,
        service: str,
        method: str,
        path: str,
        user_id: Optional[str] = None,
        status_code: Optional[int] = None,
        duration_ms: Optional[int] = None,
        request_size: Optional[int] = None,
        response_size: Optional[int] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        error_message: Optional[str] = None,
        metadata: Optional[Dict] = None
    ) -> bool:
        """
        Log an API request to the database.
        
        Args:
            request_id: Unique request identifier (UUID)
            service: Service name (upload, index, chat)
            method: HTTP method (GET, POST, WebSocket)
            path: Request path/endpoint
            user_id: User making the request
            status_code: HTTP status code
            duration_ms: Response time in milliseconds
            request_size: Request payload size in bytes
            response_size: Response payload size in bytes
            ip_address: Client IP address
            user_agent: Browser/client user agent
            error_message: Error message if request failed
            metadata: Additional context
            
        Returns:
            True if logging succeeded, False otherwise
        """
        if not self.connection:
            self.ensure_connection()
            if not self.connection:
                return False
        
        try:
            with self.connection.cursor() as cursor:
                sql = """
                    INSERT INTO api_request_logs 
                    (request_id, service, method, path, user_id, status_code, 
                     duration_ms, request_size, response_size, ip_address, 
                     user_agent, error_message, metadata)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """
                cursor.execute(sql, (
                    request_id,
                    service,
                    method,
                    path,
                    user_id,
                    status_code,
                    duration_ms,
                    request_size,
                    response_size,
                    ip_address,
                    user_agent[:500] if user_agent else None,  # Truncate long user agents
                    error_message[:1000] if error_message else None,  # Truncate long errors
                    json.dumps(metadata) if metadata else None
                ))
            self.connection.commit()
            return True
        except Exception as e:
            logger.error(f"Failed to log request: {e}")
            return False
    
    async def log_application(
        self,
        service: str,
        log_level: str,
        message: str,
        request_id: Optional[str] = None,
        module: Optional[str] = None,
        function_name: Optional[str] = None,
        line_number: Optional[int] = None,
        user_id: Optional[str] = None,
        file_id: Optional[str] = None,
        conversation_id: Optional[str] = None,
        exception_type: Optional[str] = None,
        stack_trace: Optional[str] = None,
        metadata: Optional[Dict] = None
    ) -> bool:
        """
        Log an application event to the database.
        
        Args:
            service: Service name (upload, index, chat)
            log_level: Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
            message: Log message
            request_id: Link to API request
            module: Python module name
            function_name: Function/method name
            line_number: Source code line number
            user_id: User context
            file_id: File being processed
            conversation_id: Chat conversation ID
            exception_type: Exception class name
            stack_trace: Full stack trace
            metadata: Additional context
            
        Returns:
            True if logging succeeded, False otherwise
        """
        if not self.connection:
            self.ensure_connection()
            if not self.connection:
                return False
        
        try:
            with self.connection.cursor() as cursor:
                sql = """
                    INSERT INTO application_logs 
                    (request_id, service, log_level, message, module, function_name, 
                     line_number, user_id, file_id, conversation_id, exception_type, 
                     stack_trace, metadata)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """
                cursor.execute(sql, (
                    request_id,
                    service,
                    log_level.upper(),
                    message[:1000],  # Truncate very long messages
                    module,
                    function_name,
                    line_number,
                    user_id,
                    file_id,
                    conversation_id,
                    exception_type,
                    stack_trace[:5000] if stack_trace else None,  # Truncate long stack traces
                    json.dumps(metadata) if metadata else None
                ))
            self.connection.commit()
            return True
        except Exception as e:
            logger.error(f"Failed to log application event: {e}")
            return False
    
    async def log_audit(
        self,
        event_type: str,
        user_id: str,
        action: str,
        status: str,
        target_user_id: Optional[str] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        changes: Optional[Dict] = None,
        reason: Optional[str] = None,
        metadata: Optional[Dict] = None
    ) -> bool:
        """
        Log an audit event to the database (security/compliance trail).
        
        Args:
            event_type: Event type (login, file_upload, file_delete, role_change)
            user_id: User performing the action
            action: Action (create, read, update, delete)
            status: Result (success, failed, blocked)
            target_user_id: Target user (for admin actions)
            resource_type: Resource type (file, user, role)
            resource_id: Resource identifier
            ip_address: IP address of the user
            changes: Before/after values
            reason: Reason for action
            metadata: Additional context
            
        Returns:
            True if logging succeeded, False otherwise
        """
        if not self.connection:
            self.ensure_connection()
            if not self.connection:
                return False
        
        try:
            with self.connection.cursor() as cursor:
                sql = """
                    INSERT INTO audit_logs 
                    (event_type, user_id, target_user_id, resource_type, resource_id, 
                     action, status, ip_address, changes, reason, metadata)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """
                cursor.execute(sql, (
                    event_type,
                    user_id,
                    target_user_id,
                    resource_type,
                    resource_id,
                    action,
                    status,
                    ip_address,
                    json.dumps(changes) if changes else None,
                    reason,
                    json.dumps(metadata) if metadata else None
                ))
            self.connection.commit()
            return True
        except Exception as e:
            logger.error(f"Failed to log audit event: {e}")
            return False
    
    def close(self):
        """Close database connection"""
        if self.connection:
            self.connection.close()
            self.connection = None
