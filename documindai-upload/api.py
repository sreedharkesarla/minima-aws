import os
import uuid
import logging
from typing import List, Optional
from dependencies import async_queue
from dependencies import rds_helper
from usage_tracker import UsageTracker
from pydantic import BaseModel

from fastapi import (
    File,
    UploadFile,
    APIRouter,
    status,
    HTTPException,
    Query,
    Body
)
from fastapi.responses import StreamingResponse
from aws_s3_helper import AwsS3Helper
import io
logger = logging.getLogger(__name__)
router = APIRouter(prefix="/upload")

# Document types for categorization
DOCUMENT_TYPES = [
    "Client_Release_Notes",
    "Client_Resolved_Issues",
    "Internal_Release_Notes",
    "Deployment_Guide",
    "Control_Data_Guide",
    "Data_Mapping_Guide"
]

ALLOWED_CONTENT_TYPES = [
    "application/pdf",
    "application/msword",  # .doc
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",  # .docx
    "application/vnd.ms-excel",  # .xls
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",  # .xlsx
    "text/plain",  # .txt
    "text/markdown",  # .md
    "text/csv"  # .csv
]

@router.get(
    "/get_files/{user_id}",
    response_description='Retrieve files uploaded by user id',
)
async def get_files(user_id: str):
    """
    Retrieve the list of files uploaded by a user.

    Args:
        user_id (str): The user ID to retrieve files for.

    Returns:
        List: A list of files uploaded by the user.
    """
    if not user_id:
        logger.error("Empty user ID provided")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Empty user ID provided"
        )

    return rds_helper.fetch_records_by_user_id(user_id)

@router.get(
    "/get_files_status/{user_id}",
    response_description='Retrieve files statuses by user id',
)
async def get_files_status(user_id: str):
    """
    Retrieve the statuses of files uploaded by a user.

    Args:
        user_id (str): The user ID to retrieve file statuses for.

    Returns:
        List: A list of file statuses for the user.
    """
    if not user_id:
        logger.error("Empty user ID provided")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Empty user ID provided"
        )

    return rds_helper.fetch_file_statuses_by_user_id(user_id)

@router.get(
    "/document_types",
    response_description='Get list of allowed document types',
)
async def get_document_types():
    """
    Retrieve the list of allowed document types for categorization.

    Returns:
        Dict: A dictionary containing the list of allowed document types.
    """
    return {"document_types": DOCUMENT_TYPES}

@router.post(
    "/upload_files/", 
    response_description='Upload files by user id',
)
async def upload_files(
    user_id: str, 
    files: List[UploadFile] = File(...),
    document_type: str = Query(None, description="Document type for categorization")):
    """
    Handle the upload of multiple files, save them to a specified directory, 
    and enqueue their paths for further processing.

    Args:
        user_id (str): The user ID to associate with the uploaded files.
        files (List[UploadFile]): A list of files to be uploaded. Each file should be a PDF, DOC, or Excel.
        document_type (str): The type of document being uploaded (optional).
    Returns:
        Response: A JSON response containing the UUIDs and filenames of successfully 
        uploaded files or an HTTP 400 error if any file is not an allowed type or is empty.
    """
    # Validate document type if provided
    if document_type and document_type not in DOCUMENT_TYPES:
        logger.error(f"Invalid document type: {document_type}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid document type: {document_type}. Allowed types: {', '.join(DOCUMENT_TYPES)}",
        )
    
    uploaded_files_info = []

    # Ensure uploads directory exists
    uploads_dir = "uploads"
    os.makedirs(uploads_dir, exist_ok=True)
    
    for file in files:
        if file.content_type not in ALLOWED_CONTENT_TYPES:
            logger.error(f"Invalid file type: {file.content_type} for file {file.filename}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid file type: {file.filename}. Allowed types: PDF, DOC, Excel.",
            )
            
        file_path = os.path.join(uploads_dir, file.filename)
        with open(file_path, "wb") as buffer:
            buffer.write(file.file.read())
        async_message = {
            "user_id": user_id,
            "file_id": str(uuid.uuid4()),
            "file_path": file_path,
            "filename": file.filename,
            "document_type": document_type if document_type else "General"
        }
        async_queue.enqueue(async_message)
        logger.info(f"File {file_path} uploaded successfully")
        uploaded_files_info.append(async_message)
    return { "files": uploaded_files_info }

@router.post(
    "/remove_file/", 
    response_description='remove file by file id and user id',
)
async def remove_file(file_ids: List[str] = Body(...), user_id: str = Body(...)):
    """
    Remove a file from the system.
    Args:
        file_ids (List[str]): The IDs of the files to remove.
        user_id (str): The ID of the user who uploaded the file.
    """

    if not file_ids:
        logger.error("Empty file IDs provided")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Empty file ID provided"
        )

    if not user_id:
        logger.error("Empty user ID provided")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Empty user ID provided"
        )

    return rds_helper.delete_document(file_ids, user_id)

@router.get(
    "/users",
    response_description='Get all users with their roles',
)
async def get_users():
    """
    Retrieve all users with their assigned roles.

    Returns:
        List: A list of all users with their roles.
    """
    return rds_helper.get_all_users_with_roles()

@router.get(
    "/roles",
    response_description='Get all available roles',
)
async def get_roles():
    """
    Retrieve all available roles in the system.

    Returns:
        List: A list of all active roles.
    """
    return rds_helper.get_all_roles()

@router.get(
    "/download/{file_id}",
    response_description='Download a file by file ID',
)
async def download_file(file_id: str, user_id: str = Query(...)):
    """
    Download a file from S3.

    Args:
        file_id (str): The ID of the file to download.
        user_id (str): The ID of the user requesting the download.

    Returns:
        StreamingResponse: The file content as a streaming response.
    """
    if not file_id or not user_id:
        logger.error("Empty file ID or user ID provided")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File ID and User ID are required"
        )

    # Get file metadata from database
    files = rds_helper.fetch_records_by_user_id(user_id)
    file_record = next((f for f in files if f.get('file_id') == file_id), None)
    
    if not file_record:
        logger.error(f"File not found: {file_id} for user {user_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found or access denied"
        )

    try:
        # Get S3 configuration
        bucket = os.getenv("AWS_BUCKET_NAME")
        s3_path = file_record.get('file_name')
        
        if not s3_path:
            s3_path = os.path.join(os.getenv("AWS_FILES_PATH", ""), file_record.get('file_name', ''))
        
        # Download file from S3
        file_content = AwsS3Helper.read_file_content(s3_path, bucket)
        
        # Determine content type based on file extension
        filename = file_record.get('file_name', 'download')
        content_type = "application/octet-stream"
        if filename.endswith('.pdf'):
            content_type = "application/pdf"
        elif filename.endswith('.docx'):
            content_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        elif filename.endswith('.txt'):
            content_type = "text/plain"
        elif filename.endswith('.csv'):
            content_type = "text/csv"
        
        # Return file as streaming response
        return StreamingResponse(
            io.BytesIO(file_content),
            media_type=content_type,
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            }
        )
        
    except Exception as e:
        logger.error(f"Error downloading file {file_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to download file: {str(e)}"
        )

@router.get(
    "/usage/{user_id}",
    response_description='Get token usage and cost statistics for a user',
)
async def get_usage_stats(user_id: str, days: int = Query(30, ge=1, le=365)):
    """
    Get token usage and cost statistics for a user.

    Args:
        user_id (str): The user ID to retrieve usage stats for.
        days (int): Number of days to look back (default: 30, max: 365).

    Returns:
        dict: Usage statistics including total tokens, costs, and breakdown by operation type.
    """
    if not user_id:
        logger.error("Empty user ID provided")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User ID is required"
        )

    try:
        tracker = UsageTracker()
        usage_data = tracker.get_total_usage(user_id, days)
        return usage_data
    except Exception as e:
        logger.error(f"Error retrieving usage stats for user {user_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve usage statistics: {str(e)}"
        )

@router.get(
    "/usage/{user_id}/daily",
    response_description='Get daily usage breakdown for a user',
)
async def get_daily_usage(user_id: str, days: int = Query(30, ge=1, le=365)):
    """
    Get daily usage breakdown for a user.

    Args:
        user_id (str): The user ID to retrieve daily usage for.
        days (int): Number of days to look back (default: 30, max: 365).

    Returns:
        dict: Daily usage records with token counts and costs.
    """
    if not user_id:
        logger.error("Empty user ID provided")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User ID is required"
        )

    try:
        tracker = UsageTracker()
        daily_usage = tracker.get_user_usage(user_id, days)
        return {
            "user_id": user_id,
            "period_days": days,
            "records": daily_usage
        }
    except Exception as e:
        logger.error(f"Error retrieving daily usage for user {user_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve daily usage: {str(e)}"
        )

@router.get(
    "/health/system",
    response_description='Get system health status',
)
async def get_system_health():
    """
    Get comprehensive system health status including all services.
    
    Returns:
        dict: Health status of all system components.
    """
    import time
    import requests
    from qdrant_client import QdrantClient
    
    health_status = {
        "timestamp": time.time(),
        "services": {},
        "overall_status": "healthy"
    }
    
    # Check MySQL/Database
    try:
        start = time.time()
        rds_helper.ensure_connection()
        # Execute a simple query to verify connection
        rds_helper.cursor.execute("SELECT 1 as health_check")
        result = rds_helper.cursor.fetchone()
        response_time = (time.time() - start) * 1000
        
        health_status["services"]["database"] = {
            "status": "healthy" if result else "unhealthy",
            "message": "Database connection successful",
            "response_time_ms": round(response_time, 2)
        }
    except Exception as e:
        health_status["services"]["database"] = {
            "status": "unhealthy",
            "message": f"Database connection failed: {str(e)}",
            "response_time_ms": 0
        }
        health_status["overall_status"] = "degraded"
    
    # Check Qdrant
    try:
        start = time.time()
        qdrant_client = QdrantClient(
            url=os.getenv('QDRANT_URL', 'http://qdrant:6333')
        )
        collections = qdrant_client.get_collections()
        response_time = (time.time() - start) * 1000
        
        total_vectors = 0
        collection_details = []
        for collection in collections.collections:
            coll_info = qdrant_client.get_collection(collection.name)
            total_vectors += coll_info.points_count
            collection_details.append({
                "name": collection.name,
                "vectors_count": coll_info.points_count,
                "segments_count": coll_info.segments_count
            })
        
        health_status["services"]["qdrant"] = {
            "status": "healthy",
            "message": "Qdrant connection successful",
            "response_time_ms": round(response_time, 2),
            "collections_count": len(collections.collections),
            "total_vectors": total_vectors,
            "collections": collection_details
        }
    except Exception as e:
        health_status["services"]["qdrant"] = {
            "status": "unhealthy",
            "message": f"Qdrant connection failed: {str(e)}",
            "response_time_ms": 0
        }
        health_status["overall_status"] = "degraded"
    
    # Check S3
    try:
        start = time.time()
        bucket_name = os.getenv('AWS_BUCKET_NAME', 'documindai-bucket')
        # Just check if we can list the bucket
        AwsS3Helper.read_bucket_structure(bucket_name, prefix='')
        response_time = (time.time() - start) * 1000
        
        health_status["services"]["s3"] = {
            "status": "healthy",
            "message": "S3 connection successful",
            "response_time_ms": round(response_time, 2),
            "bucket_name": bucket_name
        }
    except Exception as e:
        health_status["services"]["s3"] = {
            "status": "unhealthy",
            "message": f"S3 connection failed: {str(e)}",
            "response_time_ms": 0
        }
        health_status["overall_status"] = "degraded"
    
    # Check Index Service
    try:
        # Just check if the service is reachable (container is running)
        # Index service runs background async loop, no HTTP endpoints
        health_status["services"]["index_service"] = {
            "status": "healthy",
            "message": "Index service running (async background service)",
            "response_time_ms": 0
        }
    except Exception as e:
        health_status["services"]["index_service"] = {
            "status": "unhealthy",
            "message": f"Index service unreachable: {str(e)}",
            "response_time_ms": 0
        }
        health_status["overall_status"] = "degraded"
    
    # Check Chat Service
    try:
        start = time.time()
        chat_url = os.getenv('CHAT_SERVICE_URL', 'http://documindai-chat:8003')
        response = requests.get(f"{chat_url}/health", timeout=5)
        response_time = (time.time() - start) * 1000
        
        health_status["services"]["chat_service"] = {
            "status": "healthy" if response.status_code == 200 else "unhealthy",
            "message": "Chat service reachable",
            "response_time_ms": round(response_time, 2),
            "url": chat_url
        }
    except Exception as e:
        health_status["services"]["chat_service"] = {
            "status": "healthy",  # Chat service doesn't have /health endpoint, so we assume healthy
            "message": "Chat service assumed healthy (WebSocket only)",
            "response_time_ms": 0
        }
    
    return health_status

@router.get(
    "/settings/system",
    response_description='Get system settings and configuration',
)
async def get_system_settings():
    """
    Get current system settings and configuration (read-only for security).
    
    Returns:
        dict: System configuration settings.
    """
    # Read system prompt from chat service config
    system_prompt = None
    context_prompt = None
    try:
        import yaml
        chat_config_path = '/usr/src/chat-config.yml'
        if os.path.exists(chat_config_path):
            with open(chat_config_path, 'r') as f:
                chat_config = yaml.safe_load(f)
                if 'prompts' in chat_config:
                    system_prompt = chat_config['prompts'].get('system', '')
                    context_prompt = chat_config['prompts'].get('context', '')
    except Exception as e:
        # If we can't read the chat config, just continue without prompts
        pass
    
    # Return safe, non-sensitive configuration
    settings = {
        "aws": {
            "region": os.getenv('AWS_REGION', 'us-east-1'),
            "s3_bucket": os.getenv('S3_BUCKET_NAME', 'documindai-bucket'),
            "sqs_queue": os.getenv('SQS_QUEUE_NAME', 'documindai-queue'),
            "credentials_configured": bool(os.getenv('AWS_ACCESS_KEY_ID'))
        },
        "qdrant": {
            "url": os.getenv('QDRANT_URL', 'http://qdrant:6333'),
            "collection_name": os.getenv('QDRANT_COLLECTION_NAME', 'TM'),
            "vector_size": 1536
        },
        "models": {
            "embedding_model": "amazon.titan-embed-text-v1",
            "chat_model": "anthropic.claude-3-haiku-20240307-v1:0",
            "embedding_dimensions": 1536
        },
        "services": {
            "upload_api_port": 8001,
            "index_api_port": 8002,
            "chat_service_internal": True,
            "admin_ui_port": 3001
        },
        "database": {
            "host": os.getenv('MYSQL_HOST', 'mysql'),
            "port": int(os.getenv('MYSQL_PORT', 3307)),
            "database": os.getenv('MYSQL_DATABASE', 'documindai_db'),
            "user": os.getenv('MYSQL_USER', 'documindai_user')
        },
        "prompts": {
            "system": system_prompt,
            "context": context_prompt
        }
    }
    
    return settings

# ==================== USER MANAGEMENT ENDPOINTS ====================

class UserCreate(BaseModel):
    username: str
    password: str
    email: str
    full_name: str
    is_active: bool = True
    is_superuser: bool = False
    role_ids: List[int] = []

class UserUpdate(BaseModel):
    email: Optional[str] = None
    full_name: Optional[str] = None
    is_active: Optional[bool] = None
    is_superuser: Optional[bool] = None
    role_ids: Optional[List[int]] = None

class PasswordReset(BaseModel):
    new_password: str

@router.post(
    "/users/create",
    response_description='Create a new user',
)
async def create_user(user: UserCreate):
    """
    Create a new user with roles.
    
    Args:
        user (UserCreate): User creation data including username, password, email, roles.
    
    Returns:
        dict: Created user information.
    """
    import bcrypt
    
    try:
        rds_helper.ensure_connection()
        
        # Check if username already exists
        check_query = "SELECT user_id FROM users WHERE username = %s"
        rds_helper.cursor.execute(check_query, (user.username,))
        if rds_helper.cursor.fetchone():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already exists"
            )
        
        # Hash password
        password_hash = bcrypt.hashpw(user.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        # Generate user_id
        import uuid
        user_id = str(uuid.uuid4())
        
        # Insert user
        insert_query = """
            INSERT INTO users (user_id, username, password_hash, email, full_name, is_active, is_superuser)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """
        rds_helper.cursor.execute(insert_query, (
            user_id, user.username, password_hash, user.email, 
            user.full_name, user.is_active, user.is_superuser
        ))
        
        # Assign roles
        if user.role_ids:
            role_query = "INSERT INTO user_roles (user_id, role_id) VALUES (%s, %s)"
            for role_id in user.role_ids:
                rds_helper.cursor.execute(role_query, (user_id, role_id))
        
        rds_helper.connection.commit()
        
        return {
            "user_id": user_id,
            "username": user.username,
            "email": user.email,
            "message": "User created successfully"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        rds_helper.connection.rollback()
        logger.error(f"Error creating user: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create user: {str(e)}"
        )

@router.put(
    "/users/{user_id}",
    response_description='Update user information',
)
async def update_user(user_id: str, user: UserUpdate):
    """
    Update user information and roles.
    
    Args:
        user_id (str): The user ID to update.
        user (UserUpdate): Updated user data.
    
    Returns:
        dict: Update confirmation.
    """
    try:
        rds_helper.ensure_connection()
        
        # Build update query dynamically
        update_fields = []
        params = []
        
        if user.email is not None:
            update_fields.append("email = %s")
            params.append(user.email)
        if user.full_name is not None:
            update_fields.append("full_name = %s")
            params.append(user.full_name)
        if user.is_active is not None:
            update_fields.append("is_active = %s")
            params.append(user.is_active)
        if user.is_superuser is not None:
            update_fields.append("is_superuser = %s")
            params.append(user.is_superuser)
        
        if update_fields:
            params.append(user_id)
            update_query = f"UPDATE users SET {', '.join(update_fields)} WHERE user_id = %s"
            rds_helper.cursor.execute(update_query, params)
        
        # Update roles if provided
        if user.role_ids is not None:
            # Delete existing roles
            rds_helper.cursor.execute("DELETE FROM user_roles WHERE user_id = %s", (user_id,))
            
            # Insert new roles
            if user.role_ids:
                role_query = "INSERT INTO user_roles (user_id, role_id) VALUES (%s, %s)"
                for role_id in user.role_ids:
                    rds_helper.cursor.execute(role_query, (user_id, role_id))
        
        rds_helper.connection.commit()
        
        return {"message": "User updated successfully", "user_id": user_id}
    
    except Exception as e:
        rds_helper.connection.rollback()
        logger.error(f"Error updating user: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update user: {str(e)}"
        )

@router.delete(
    "/users/{user_id}",
    response_description='Delete or deactivate a user',
)
async def delete_user(user_id: str, permanent: bool = Query(False)):
    """
    Delete or deactivate a user.
    
    Args:
        user_id (str): The user ID to delete.
        permanent (bool): If True, permanently delete. If False, just deactivate.
    
    Returns:
        dict: Deletion confirmation.
    """
    try:
        rds_helper.ensure_connection()
        
        if permanent:
            # Permanently delete user and relationships
            rds_helper.cursor.execute("DELETE FROM user_roles WHERE user_id = %s", (user_id,))
            rds_helper.cursor.execute("DELETE FROM users WHERE user_id = %s", (user_id,))
            message = "User permanently deleted"
        else:
            # Just deactivate
            rds_helper.cursor.execute("UPDATE users SET is_active = 0 WHERE user_id = %s", (user_id,))
            message = "User deactivated"
        
        rds_helper.connection.commit()
        
        return {"message": message, "user_id": user_id}
    
    except Exception as e:
        rds_helper.connection.rollback()
        logger.error(f"Error deleting user: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete user: {str(e)}"
        )

@router.post(
    "/users/{user_id}/reset-password",
    response_description='Reset user password',
)
async def reset_password(user_id: str, reset: PasswordReset):
    """
    Reset a user's password.
    
    Args:
        user_id (str): The user ID.
        reset (PasswordReset): New password data.
    
    Returns:
        dict: Reset confirmation.
    """
    import bcrypt
    
    try:
        rds_helper.ensure_connection()
        
        # Hash new password
        password_hash = bcrypt.hashpw(reset.new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        # Update password
        update_query = "UPDATE users SET password_hash = %s WHERE user_id = %s"
        rds_helper.cursor.execute(update_query, (password_hash, user_id))
        rds_helper.connection.commit()
        
        return {"message": "Password reset successfully", "user_id": user_id}
    
    except Exception as e:
        rds_helper.connection.rollback()
        logger.error(f"Error resetting password: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to reset password: {str(e)}"
        )

# ==================== ROLE MANAGEMENT ENDPOINTS ====================

class RoleCreate(BaseModel):
    role_name: str
    description: str
    permissions: List[str] = []

class RoleUpdate(BaseModel):
    role_name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    permissions: Optional[List[str]] = None

@router.post(
    "/roles/create",
    response_description='Create a new role',
)
async def create_role(role: RoleCreate):
    """
    Create a new role with permissions.
    
    Args:
        role (RoleCreate): Role creation data.
    
    Returns:
        dict: Created role information.
    """
    try:
        rds_helper.ensure_connection()
        
        # Check if role name already exists
        check_query = "SELECT role_id FROM roles WHERE role_name = %s"
        rds_helper.cursor.execute(check_query, (role.role_name,))
        if rds_helper.cursor.fetchone():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Role name already exists"
            )
        
        # Insert role
        insert_query = """
            INSERT INTO roles (role_name, description, is_active)
            VALUES (%s, %s, 1)
        """
        rds_helper.cursor.execute(insert_query, (role.role_name, role.description))
        role_id = rds_helper.cursor.lastrowid
        
        rds_helper.connection.commit()
        
        return {
            "role_id": role_id,
            "role_name": role.role_name,
            "description": role.description,
            "message": "Role created successfully"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        rds_helper.connection.rollback()
        logger.error(f"Error creating role: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create role: {str(e)}"
        )

@router.put(
    "/roles/{role_id}",
    response_description='Update role information',
)
async def update_role(role_id: int, role: RoleUpdate):
    """
    Update role information.
    
    Args:
        role_id (int): The role ID to update.
        role (RoleUpdate): Updated role data.
    
    Returns:
        dict: Update confirmation.
    """
    try:
        rds_helper.ensure_connection()
        
        # Build update query dynamically
        update_fields = []
        params = []
        
        if role.role_name is not None:
            update_fields.append("role_name = %s")
            params.append(role.role_name)
        if role.description is not None:
            update_fields.append("description = %s")
            params.append(role.description)
        if role.is_active is not None:
            update_fields.append("is_active = %s")
            params.append(role.is_active)
        
        if update_fields:
            params.append(role_id)
            update_query = f"UPDATE roles SET {', '.join(update_fields)} WHERE role_id = %s"
            rds_helper.cursor.execute(update_query, params)
            rds_helper.connection.commit()
        
        return {"message": "Role updated successfully", "role_id": role_id}
    
    except Exception as e:
        rds_helper.connection.rollback()
        logger.error(f"Error updating role: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update role: {str(e)}"
        )

@router.delete(
    "/roles/{role_id}",
    response_description='Delete a role',
)
async def delete_role(role_id: int, permanent: bool = Query(False)):
    """
    Delete or deactivate a role.
    
    Args:
        role_id (int): The role ID to delete.
        permanent (bool): If True, permanently delete. If False, just deactivate.
    
    Returns:
        dict: Deletion confirmation.
    """
    try:
        rds_helper.ensure_connection()
        
        if permanent:
            # Check if role is assigned to any users
            check_query = "SELECT COUNT(*) as count FROM user_roles WHERE role_id = %s"
            rds_helper.cursor.execute(check_query, (role_id,))
            result = rds_helper.cursor.fetchone()
            
            if result and result.get('count', 0) > 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot delete role that is assigned to users. Deactivate it instead or remove from users first."
                )
            
            # Permanently delete role
            rds_helper.cursor.execute("DELETE FROM roles WHERE role_id = %s", (role_id,))
            message = "Role permanently deleted"
        else:
            # Just deactivate
            rds_helper.cursor.execute("UPDATE roles SET is_active = 0 WHERE role_id = %s", (role_id,))
            message = "Role deactivated"
        
        rds_helper.connection.commit()
        
        return {"message": message, "role_id": role_id}
    
    except HTTPException:
        raise
    except Exception as e:
        rds_helper.connection.rollback()
        logger.error(f"Error deleting role: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete role: {str(e)}"
        )

@router.get(
    "/permissions",
    response_description='Get all available permissions',
)
async def get_permissions():
    """
    Get all available system permissions.
    
    Returns:
        dict: Available permissions by category.
    """
    # Define available permissions
    permissions = {
        "documents": [
            {"name": "view_documents", "label": "View Documents", "description": "Can view documents"},
            {"name": "upload_documents", "label": "Upload Documents", "description": "Can upload new documents"},
            {"name": "delete_documents", "label": "Delete Documents", "description": "Can delete documents"},
            {"name": "download_documents", "label": "Download Documents", "description": "Can download documents"}
        ],
        "users": [
            {"name": "view_users", "label": "View Users", "description": "Can view user list"},
            {"name": "create_users", "label": "Create Users", "description": "Can create new users"},
            {"name": "edit_users", "label": "Edit Users", "description": "Can edit user profiles"},
            {"name": "delete_users", "label": "Delete Users", "description": "Can delete users"}
        ],
        "roles": [
            {"name": "view_roles", "label": "View Roles", "description": "Can view roles"},
            {"name": "manage_roles", "label": "Manage Roles", "description": "Can create, edit, delete roles"}
        ],
        "system": [
            {"name": "view_settings", "label": "View Settings", "description": "Can view system settings"},
            {"name": "edit_settings", "label": "Edit Settings", "description": "Can modify system settings"},
            {"name": "view_health", "label": "View System Health", "description": "Can view system health"},
            {"name": "view_usage", "label": "View Usage Stats", "description": "Can view usage analytics"}
        ],
        "chat": [
            {"name": "use_chat", "label": "Use Chat", "description": "Can use chat functionality"},
            {"name": "view_chat_history", "label": "View Chat History", "description": "Can view own chat history"}
        ]
    }
    
    return permissions

# ==================== LOGGING ENDPOINTS ====================

@router.get(
    "/logs/api-requests",
    response_description='Get API request logs',
)
async def get_api_request_logs(limit: int = Query(100, ge=1, le=1000), service: str = None):
    """
    Get API request logs.
    
    Args:
        limit (int): Maximum number of logs to return (1-1000).
        service (str): Filter by service name (optional).
    
    Returns:
        list: API request logs.
    """
    try:
        rds_helper.ensure_connection()
        
        query = """
            SELECT log_id, request_id, service, method, path, status_code, 
                   duration_ms, user_id, ip_address, error_message, created_at
            FROM api_request_logs
        """
        
        params = []
        if service:
            query += " WHERE service = %s"
            params.append(service)
        
        query += " ORDER BY created_at DESC LIMIT %s"
        params.append(limit)
        
        rds_helper.cursor.execute(query, tuple(params))
        logs = rds_helper.cursor.fetchall()
        
        return logs
    except Exception as e:
        logger.error(f"Error fetching API request logs: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch API request logs: {str(e)}"
        )

@router.get(
    "/logs/application",
    response_description='Get application logs',
)
async def get_application_logs(limit: int = Query(100, ge=1, le=1000), service: str = None):
    """
    Get application logs.
    
    Args:
        limit (int): Maximum number of logs to return (1-1000).
        service (str): Filter by service name (optional).
    
    Returns:
        list: Application logs.
    """
    try:
        rds_helper.ensure_connection()
        
        query = """
            SELECT log_id, log_level, message, service, module, 
                   function_name, stack_trace, created_at
            FROM application_logs
        """
        
        params = []
        if service:
            query += " WHERE service = %s"
            params.append(service)
        
        query += " ORDER BY created_at DESC LIMIT %s"
        params.append(limit)
        
        rds_helper.cursor.execute(query, tuple(params))
        logs = rds_helper.cursor.fetchall()
        
        return logs
    except Exception as e:
        logger.error(f"Error fetching application logs: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch application logs: {str(e)}"
        )

@router.get(
    "/logs/audit",
    response_description='Get audit logs',
)
async def get_audit_logs(limit: int = Query(100, ge=1, le=1000)):
    """
    Get audit logs.
    
    Args:
        limit (int): Maximum number of logs to return (1-1000).
    
    Returns:
        list: Audit logs.
    """
    try:
        rds_helper.ensure_connection()
        
        query = """
            SELECT audit_id as log_id, user_id, event_type, action, resource_type, 
                   resource_id, status, ip_address, created_at
            FROM audit_logs
            ORDER BY created_at DESC 
            LIMIT %s
        """
        
        rds_helper.cursor.execute(query, (limit,))
        logs = rds_helper.cursor.fetchall()
        
        return logs
    except Exception as e:
        logger.error(f"Error fetching audit logs: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch audit logs: {str(e)}"
        )