import os
import uuid
import boto3
import logging
from aws_rds_helper import RDSHelper
from qdrant_client import QdrantClient
from langchain_aws import BedrockEmbeddings
from langchain_qdrant import QdrantVectorStore
from qdrant_client.http.models import Distance, VectorParams
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.document_loaders.pdf import AmazonTextractPDFLoader
from langchain_community.document_loaders import (
    TextLoader,
    CSVLoader,
    UnstructuredWordDocumentLoader,
    UnstructuredExcelLoader,
)
from usage_tracker import UsageTracker

loggers = logging.getLogger(__name__)

class Indexer:
    """
    The Indexer class is responsible for processing and indexing various types of documents into a Qdrant vector store.
    It supports PDF, Excel, Word, and text files stored in an S3 bucket, converts them into embeddings using Bedrock,
    and stores them in Qdrant for later retrieval.

    Attributes:
        textract (boto3.client): A client for AWS Textract, used for processing PDF documents.
        client_bedrock (boto3.client): A client for AWS Bedrock, used for generating embeddings.
        embeddings (BedrockEmbeddings): The embedding model initialized with the Bedrock client.
        qdrant (QdrantClient): The client for interacting with the Qdrant vector store.
        vector_store (QdrantVectorStore): The vector store initialized with Qdrant and the embedding model.
    """

    def __init__(self, rds_helper: RDSHelper):
        """
        Initializes the Indexer with necessary AWS and Qdrant clients, and sets up the vector store.
        """
        self.textract = boto3.client(
            service_name="textract", 
            region_name=os.environ.get("AWS_DEFAULT_REGION")
        )
        self.client_bedrock = boto3.client(
            service_name='bedrock-runtime', 
            region_name=os.environ.get("AWS_DEFAULT_REGION")
        )
        self.embeddings = BedrockEmbeddings(
            model_id=os.environ.get("EMBEDDING_MODEL_ID"),
            client=self.client_bedrock,        
        )
        self.qdrant = QdrantClient(
            host=os.environ.get("QDRANT_BOOTSTRAP"), 
        )
        self.rds_helper = rds_helper
        self.usage_tracker = UsageTracker()

    def setup_collection(self, user_id):
        """
        Sets up a new collection in Qdrant for a given user.

        Args:
            user_id (str): The unique identifier for the user.

        Returns:
            vector_store: Vector store initialized with the new collection.
        """
        
        collection_name = "TM"  # Use TM as collection name for all users
        embedding_size = int(os.environ.get("EMBEDDING_SIZE"))
        if not self.qdrant.collection_exists(collection_name):
            try:
                self.qdrant.create_collection(
                    collection_name=collection_name,
                    vectors_config=VectorParams(
                        size=embedding_size, 
                        distance=Distance.COSINE
                    ),
                )
            except Exception as e:
                # Collection might have been created by another process
                loggers.warning(f"Collection creation failed (may already exist): {e}")
        
        return QdrantVectorStore(
            client=self.qdrant,
            collection_name=collection_name,
            embedding=self.embeddings,
        )
                

    def index_file(self, message):
        """
        Processes and indexes a file from an S3 bucket based on its file type.

        Args:
            message (dict): A dictionary containing the file metadata, including the bucket and path.
            loop (asyncio.AbstractEventLoop): The event loop for running asynchronous tasks.

        Depending on the file extension, the method uses appropriate loaders to read the file content:
        - PDFs are processed using AWS Textract.
        - Excel files are processed using an UnstructuredExcelLoader.
        - Word documents are processed using an UnstructuredWordDocumentLoader.
        - Text files are processed using a TextLoader.

        The content is then converted into embeddings and stored in the Qdrant vector store.

        Raises:
            Exception: If there is an error in loading or vectorizing the documents.

        """
        path, bucket = message["path"], message["bucket"]
        file_id, user_id = message["file_id"], message["user_id"]
        
        # CRITICAL FIX: Check if file is already indexed to prevent infinite reindexing
        try:
            existing_status = self.rds_helper.get_file_status([file_id])
            if existing_status and len(existing_status) > 0:
                status = existing_status[0].get("status")
                if status == "indexed":
                    loggers.warning(f"File {file_id} is already indexed. Skipping re-indexing to prevent duplicate processing.")
                    loggers.info(f"Skipped duplicate indexing for: {path}")
                    return
        except Exception as e:
            loggers.error(f"Error checking file status: {e}. Proceeding with indexing.")
        
        vector_store = self.setup_collection(user_id)
        _, file_extension = os.path.splitext(path)    
        file_extension = file_extension.lower()
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=250)
        loggers.info(f"Extracting text from file: {path}")

        if file_extension == ".pdf":
            file_path = f"s3://{bucket}/{path}"
            loggers.info(f"PDF file: {file_path}")
            loader = AmazonTextractPDFLoader(file_path=file_path, client=self.textract)
        elif file_extension == ".xls":
            loader = UnstructuredExcelLoader(self.download_file(bucket, path))
        elif file_extension == ".docx":
            loader = UnstructuredWordDocumentLoader(self.download_file(bucket, path))
        elif file_extension == ".txt" or file_extension == ".md":
            loader = TextLoader(self.download_file(bucket, path))
        elif file_extension == ".csv":
            loader = CSVLoader(self.download_file(bucket, path))
        else:
            loggers.error(f"Unsupported file type: {file_extension}")

        try:
            # loggers.info(f"Loading file content: {path}")
            # documents = loader.load()
            # loggers.info(f"Document loaded: {len(documents)}")
            # documents = text_splitter.split_documents(documents)
            # loggers.info(f"Documents split: {len(documents)}")
            loggers.info(f"Loading file content: {path}")
            documents = loader.load_and_split(text_splitter)
            loggers.info(f"Documents loaded: {len(documents)}")
            def update_metadata(doc):
                doc.metadata["file_id"] = file_id
                doc.metadata["user_id"] = user_id
                return doc
            documents = [update_metadata(doc) for doc in documents]
                
            loggers.info(f"Inserting into vector storage: {path}")
            uuids = [str(uuid.uuid4()) for _ in range(len(documents))]
            vector_store.add_documents(documents=documents, ids=uuids)
            
            # Track embedding token usage
            try:
                # Calculate total text length for token estimation
                total_text = " ".join([doc.page_content for doc in documents])
                # Rough estimation: ~4 characters per token
                estimated_tokens = len(total_text) // 4
                
                file_name = os.path.basename(path)
                self.usage_tracker.track_usage(
                    user_id=user_id,
                    operation_type='embedding',
                    model_id=os.environ.get("EMBEDDING_MODEL_ID"),
                    input_tokens=estimated_tokens,
                    output_tokens=0,  # Embedding models don't produce output tokens
                    file_id=file_id,
                    operation_details={
                        'file_name': file_name,
                        'file_type': file_extension,
                        'chunks': len(documents),
                        'total_chars': len(total_text)
                    }
                )
            except Exception as e:
                loggers.error(f"Failed to track embedding usage: {e}")
            
            saved = self.rds_helper.update_status_for_files([file_id], "indexed")
            loggers.info(f"Saved: {saved}")
            loggers.info(f"updated status for file_id {file_id}")
            
        except Exception as e:
            loggers.error(f"Error to vectorize file: {path}")
            loggers.error(f"Error: {e}")
        finally:
            self.delete_file(path)

    def delete_file(self, path):
        try:
            folder_path = os.environ.get("LOCAL_FILES_PATH")
            file_path = os.path.join(folder_path, os.path.basename(path))
            if os.path.exists(file_path):
                os.remove(f"{file_path}")
                loggers.info(f"{file_path} has been removed successfully.")
        except Exception as e:
            loggers.error(f"An error occurred while trying to delete {file_path}: {e}")
    
    def download_file(self, bucket: str, path: str):
        """
        Downloads a file from an S3 bucket to a local temporary directory.

        Args:
            bucket (str): The name of the S3 bucket.
            path (str): The S3 key (path) to the file.

        Returns:
            str: The local path to the downloaded file.
        """
        s3 = boto3.client("s3")
        local_folder = os.environ.get("LOCAL_FILES_PATH")
        basename = os.path.basename(path)
        local_path = os.path.join(local_folder, basename)
        s3.download_file(bucket, path, local_path)
        return local_path