import os
import uuid
import logging
from typing import List
from dependencies import async_queue
from dependencies import rds_helper
from usage_tracker import UsageTracker

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
        result = rds_helper.execute_query("SELECT 1 as health_check")
        health_status["services"]["database"] = {
            "status": "healthy" if result else "unhealthy",
            "message": "Database connection successful",
            "response_time_ms": 0
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
        bucket_name = os.getenv('S3_BUCKET_NAME', 'documindai-bucket')
        # Just check if we can list objects (limit to 1 for speed)
        AwsS3Helper.list_objects(bucket_name, max_keys=1)
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
        start = time.time()
        index_url = os.getenv('INDEX_SERVICE_URL', 'http://documindai-index:8002')
        response = requests.get(f"{index_url}/docs", timeout=5)
        response_time = (time.time() - start) * 1000
        
        health_status["services"]["index_service"] = {
            "status": "healthy" if response.status_code == 200 else "unhealthy",
            "message": "Index service reachable",
            "response_time_ms": round(response_time, 2),
            "url": index_url
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
        }
    }
    
    return settings