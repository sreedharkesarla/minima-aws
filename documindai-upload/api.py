import os
import uuid
import logging
from typing import List
from dependencies import async_queue
from dependencies import rds_helper

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