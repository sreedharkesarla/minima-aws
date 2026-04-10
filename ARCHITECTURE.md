# Minima AWS - Project Architecture & UI Implementation

## 📋 Table of Contents
1. [System Overview](#system-overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Backend Services Architecture](#backend-services-architecture)
4. [Data Storage Layer](#data-storage-layer)
5. [AWS Integration](#aws-integration)
6. [UI Implementation](#ui-implementation)
7. [Communication Protocols](#communication-protocols)
8. [Technology Stack](#technology-stack)
9. [Deployment Architecture](#deployment-architecture)
10. [Data Flow](#data-flow)

---

## 🎯 System Overview

**Minima AWS** is a Retrieval-Augmented Generation (RAG) system that enables users to upload documents, automatically index them using AI-powered embeddings, and engage in intelligent conversations about the document content using AWS Bedrock's large language models.

### Key Capabilities
- **Document Upload & Management**: Upload PDF, TXT, DOCX files with automatic processing  
- **AI-Powered Indexing**: Vector embeddings using AWS Bedrock Titan (1536 dimensions)
- **Intelligent Chat**: Conversational Q&A over documents using Claude 3 Haiku
- **Real-time Processing**: Asynchronous message queues for scalable document processing
- **Multi-User Support**: User-specific document collections and chat sessions
- **Professional Admin UI**: React-based Material-UI admin interface with role management
- **Processing Pipeline Visibility**: Real-time status tracking of document processing stages
- **Source Attribution**: Chat responses show which documents were used as sources

---

## 🏗️ Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            CLIENT LAYER                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌──────────────────────┐              ┌──────────────────────┐         │
│  │   test-ui.html       │              │   React UI           │         │
│  │   (Simple HTML)      │              │   (mnma-ui/)         │         │
│  │                      │              │                      │         │
│  │  • Login             │              │  • Material-UI       │         │
│  │  • Upload Files      │              │  • TypeScript        │         │
│  │  • View Files        │              │  • React Router      │         │
│  │  • WebSocket Chat    │              │  • Context API       │         │
│  └──────────────────────┘              └──────────────────────┘         │
│           │                                       │                      │
│           └───────────────────┬───────────────────┘                      │
│                               │                                          │
└───────────────────────────────┼──────────────────────────────────────────┘
                                │
                    HTTP/REST + WebSocket
                                │
┌───────────────────────────────┼──────────────────────────────────────────┐
│                         BACKEND SERVICES                                  │
├───────────────────────────────┼──────────────────────────────────────────┤
│                               │                                           │
│   ┌────────────────┐    ┌─────┴──────┐    ┌──────────────┐             │
│   │  mnma-upload   │    │ mnma-index │    │  mnma-chat   │             │
│   │   Port 8001    │    │ Port 8002  │    │  Port 8003   │             │
│   ├────────────────┤    ├────────────┤    ├──────────────┤             │
│   │ • File Upload  │    │ • SQS Poll │    │ • WebSocket  │             │
│   │ • S3 Storage   │    │ • Download │    │ • Vector     │             │
│   │ • SQS Push     │    │ • Chunk    │    │   Search     │             │
│   │ • DB Register  │    │ • Embed    │    │ • LLM Query  │             │
│   │ • CORS API     │    │ • Qdrant   │    │ • RAG Engine │             │
│   └────────┬───────┘    └─────┬──────┘    └──────┬───────┘             │
│            │                  │                   │                      │
└────────────┼──────────────────┼───────────────────┼──────────────────────┘
             │                  │                   │
             │                  │                   │
┌────────────┼──────────────────┼───────────────────┼──────────────────────┐
│                         DATA & STORAGE LAYER                              │
├────────────┼──────────────────┼───────────────────┼──────────────────────┤
│            │                  │                   │                       │
│   ┌────────▼────────┐  ┌──────▼──────┐  ┌────────▼────────┐             │
│   │   AWS SQS       │  │  AWS S3     │  │   Qdrant        │             │
│   │   (Queue)       │  │  (Bucket)   │  │   (Vector DB)   │             │
│   │                 │  │             │  │                 │             │
│   │ • Async Jobs    │  │ • Raw Files │  │ • Embeddings    │             │
│   │ • Indexing      │  │ • Persist   │  │ • Collections   │             │
│   └─────────────────┘  └─────────────┘  │ • Search Index  │             │
│                                         └─────────────────┘             │
│                                                                           │
│   ┌───────────────────────────────────────────────────────┐             │
│   │              MySQL 8.0 (RDS)                          │             │
│   │                                                       │             │
│   │  Tables:                                              │             │
│   │  • files: user_id, file_id, status, s3_path          │             │
│   │  • users: user_id, password (future)                 │             │
│   │  • conversations: conv_id, timestamp (future)        │             │
│   └───────────────────────────────────────────────────────┘             │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
             │                                          │
             │                                          │
┌────────────┼──────────────────────────────────────────┼──────────────────┐
│                            AWS BEDROCK                                    │
├────────────┼──────────────────────────────────────────┼──────────────────┤
│            │                                          │                   │
│   ┌────────▼────────────────┐         ┌──────────────▼────────────┐     │
│   │  Titan Text Embeddings  │         │  Claude 3 Haiku           │     │
│   │  (amazon.titan-embed-   │         │  (anthropic.claude-3-     │     │
│   │   text-v1)              │         │   haiku-20240307-v1:0)    │     │
│   │                         │         │                           │     │
│   │  • 1536 dimensions      │         │  • Conversational AI      │     │
│   │  • Document chunking    │         │  • Context-aware          │     │
│   │  • Semantic vectors     │         │  • RAG responses          │     │
│   └─────────────────────────┘         └───────────────────────────┘     │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Backend Services Architecture

### 1. **mnma-upload Service** (Port 8001)

**Purpose**: Handles file uploads, storage, and indexing job initiation

**Technology Stack**:
- FastAPI (Python 3.9)
- AWS S3 SDK (boto3)
- AWS SQS SDK
- PyMySQL (MySQL connector)
- CORS middleware for cross-origin requests

**Key Components**:
```
mnma-upload/
├── app.py                    # FastAPI application, lifespan management
├── api.py                    # REST API endpoints
├── uploader.py               # File upload logic
├── aws_s3_helper.py          # S3 operations wrapper
├── aws_rds_helper.py         # MySQL operations wrapper
├── sqs.py                    # SQS message queue wrapper
├── async_loop.py             # Async event loop
├── async_queue.py            # Internal async queue
├── dependencies.py           # Shared dependencies
├── config.yml                # Service configuration
├── requirements.txt          # Python dependencies
└── Dockerfile                # Container definition
```

**API Endpoints**:
```python
POST   /upload/upload_file/{user_id}      # Upload file, save to S3, queue indexing
GET    /upload/get_files/{user_id}        # List user's files with status
DELETE /upload/delete_file/{user_id}/{file_id}  # Delete file from S3 + DB
GET    /upload/health                     # Health check endpoint
```

**Data Flow**:
1. Client uploads file via HTTP POST multipart/form-data
2. Upload service saves file to S3 bucket (`{AWS_FILES_PATH}/{user_id}/{file_id}`)
3. Registers file in MySQL `files` table (status: "uploaded")
4. Sends SQS message with `{user_id, file_id, s3_path}` to trigger indexing
5. Returns file metadata to client

**Configuration** (`config.yml`):
```yaml
aws:
  bucket_name: ${AWS_BUCKET_NAME}
  files_path: ${AWS_FILES_PATH}
  sqs_queue: ${AWS_SQS_QUEUE}
database:
  host: ${RDS_DB_INSTANCE}
  name: ${RDS_DB_NAME}
  user: ${RDS_DB_USER}
  password: ${RDS_DB_PASSWORD}
  port: ${RDS_DB_PORT}
```

---

### 2. **mnma-index Service** (Port 8002)

**Purpose**: Async document processing - download, chunk, embed, and index into Qdrant

**Technology Stack**:
- FastAPI (Python 3.9)
- LangChain (document processing, chunking)
- AWS Bedrock Titan Embeddings
- Qdrant Client (vector database)
- SQS Long Polling

**Key Components**:
```
mnma-index/
├── app.py                    # FastAPI app, SQS consumer
├── indexer.py                # Core indexing logic
├── aws_s3_helper.py          # Download from S3
├── aws_rds_helper.py         # Update file status in DB
├── sqs.py                    # SQS message consumer
├── async_loop.py             # Background task runner
├── async_queue.py            # Internal task queue
├── dependencies.py           # Shared services
├── config.yml                # Service configuration
├── requirements.txt          # Python dependencies
└── Dockerfile                # Container definition
```

**Processing Pipeline**:
```python
# 1. SQS Long Polling (20s wait time, batch of 10 messages)
messages = sqs.receive_messages(queue_name, max_messages=10, wait_time=20)

# 2. For each message:
#    a. Download file from S3
file_content = s3_helper.download_file(s3_path)

#    b. Load document (PDF, TXT, DOCX)
loader = UnstructuredFileLoader(file_path)
documents = loader.load()

#    c. Chunk into smaller pieces (RecursiveCharacterTextSplitter)
splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
chunks = splitter.split_documents(documents)

#    d. Generate embeddings using AWS Bedrock Titan
embeddings = BedrockEmbeddings(model_id="amazon.titan-embed-text-v1")
vectors = []
for chunk in chunks:
    vector = embeddings.embed_query(chunk.page_content)  # 1536-dim vector
    vectors.append(vector)

#    e. Store in Qdrant vector database
qdrant_client.upsert(
    collection_name=f"{user_id}",
    points=[
        {
            "id": f"{file_id}_{chunk_id}",
            "vector": vector,
            "payload": {
                "text": chunk.page_content,
                "file_id": file_id,
                "source": file_name
            }
        }
        for chunk_id, vector in enumerate(vectors)
    ]
)

#    f. Update MySQL file status to "indexed"
rds_helper.update_file_status(file_id, "indexed")

#    g. Delete SQS message
sqs.delete_message(queue_name, receipt_handle)
```

**Vector Store Schema** (Qdrant):
- **Collection Name**: `{user_id}` (one collection per user)
- **Vector Dimension**: 1536 (Titan embeddings)
- **Distance Metric**: Cosine similarity
- **Payload Fields**:
  - `text`: Original chunk text
  - `file_id`: Source file identifier
  - `source`: Original filename
  - `chunk_id`: Chunk sequence number

**Configuration** (`config.yml`):
```yaml
qdrant:
  host: ${QDRANT_BOOTSTRAP}
  port: 6333
  collection: ${QDRANT_COLLECTION}
embeddings:
  model_id: ${EMBEDDING_MODEL_ID}  # amazon.titan-embed-text-v1
  dimension: ${EMBEDDING_SIZE}      # 1536
aws:
  region: ${AWS_DEFAULT_REGION}
  sqs_queue: ${AWS_SQS_QUEUE}
```

---

### 3. **mnma-chat Service** (Port 8003)

**Purpose**: Real-time conversational AI over indexed documents via WebSocket

**Technology Stack**:
- FastAPI with WebSocket support
- LangChain RAG chain
- AWS Bedrock Claude 3 Haiku
- Qdrant vector search
- Async streaming responses

**Key Components**:
```
mnma-chat/
├── app.py                          # WebSocket endpoint
├── chat_retriever.py               # RAG retrieval logic
├── async_socket_to_chat.py         # WS → Chat queue
├── async_question_to_answer.py     # Question → Answer pipeline
├── async_answer_to_socket.py       # Answer → WS streaming
├── async_queue.py                  # Internal async queues
├── control_flow_commands.py        # Special commands (!clear, !help)
├── config.yml                      # Service configuration
├── requirements.txt                # Python dependencies
└── Dockerfile                      # Container definition
```

**WebSocket Protocol**:
```
Connection URL: ws://localhost:8003/chat/{user_id}/{conversation_id}/{file_ids}

Parameters:
  - user_id: User identifier (used for Qdrant collection)
  - conversation_id: Unique chat session ID (for history)
  - file_ids: Comma-separated file IDs to search (optional, searches all if empty)

Message Format (Client → Server):
{
  "type": "question",
  "content": "What is the warranty period?"
}

Message Format (Server → Client):
{
  "type": "answer",
  "content": "Based on your documents...",
  "sources": [
    {"file_id": "abc123", "chunk_id": 5, "score": 0.89}
  ]
}

Special Commands:
  !clear  - Clear conversation history
  !help   - Show available commands
```

**RAG Pipeline**:
```python
# 1. Receive question from WebSocket
question = await websocket.receive_json()

# 2. Generate question embedding
embeddings = BedrockEmbeddings(model_id="amazon.titan-embed-text-v1")
question_vector = embeddings.embed_query(question["content"])

# 3. Search Qdrant for relevant chunks
results = qdrant_client.search(
    collection_name=user_id,
    query_vector=question_vector,
    limit=5,  # Top 5 most relevant chunks
    score_threshold=0.7,  # Minimum similarity score
    query_filter={
        "must": [
            {"key": "file_id", "match": {"any": file_ids}}
        ]
    } if file_ids else None
)

# 4. Build context from retrieved chunks
context = "\n\n".join([hit.payload["text"] for hit in results])

# 5. Create RAG prompt
prompt = f"""
You are a helpful assistant. Answer the question based ONLY on the following context.

Context:
{context}

Question: {question["content"]}

Answer:
"""

# 6. Query Claude 3 Haiku via Bedrock
llm = Bedrock(model_id="anthropic.claude-3-haiku-20240307-v1:0")
answer_stream = llm.stream(prompt)

# 7. Stream response back to client
for chunk in answer_stream:
    await websocket.send_json({
        "type": "answer_chunk",
        "content": chunk
    })

# 8. Send completion message
await websocket.send_json({
    "type": "answer_complete",
    "sources": [
        {
            "file_id": hit.payload["file_id"],
            "source": hit.payload["source"],
            "score": hit.score
        }
        for hit in results
    ]
})
```

**Async Queue Architecture**:
```
WebSocket → socket_to_chat_queue → question_to_answer_queue → answer_to_socket_queue → WebSocket

Flow:
  1. async_socket_to_chat.py: Receives WS messages, pushes to question queue
  2. async_question_to_answer.py: Processes question, retrieves context, queries LLM
  3. async_answer_to_socket.py: Streams answer chunks back to WebSocket
```

**Configuration** (`config.yml`):
```yaml
qdrant:
  host: ${QDRANT_BOOTSTRAP}
  port: 6333
chat:
  model_id: ${CHAT_MODEL_ID}        # anthropic.claude-3-haiku-20240307-v1:0
  temperature: 0.7
  max_tokens: 2000
embeddings:
  model_id: ${EMBEDDING_MODEL_ID}   # amazon.titan-embed-text-v1
retrieval:
  top_k: 5                           # Number of chunks to retrieve
  score_threshold: 0.7               # Minimum similarity score
```

---

## 💾 Data Storage Layer

### 1. **MySQL Database (AWS RDS)**

**Purpose**: Relational storage for file metadata, user info, and conversation history

**Schema**:
```sql
-- Files table
CREATE TABLE files (
    id INT AUTO_INCREMENT PRIMARY KEY,
    file_id VARCHAR(255) UNIQUE NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    s3_path VARCHAR(500) NOT NULL,
    status ENUM('uploaded', 'indexing', 'indexed', 'failed') DEFAULT 'uploaded',
    file_size BIGINT,
    mime_type VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_file_id (file_id),
    INDEX idx_status (status)
);

-- Users table (future enhancement)
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255),
    email VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Conversations table (future enhancement)
CREATE TABLE conversations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    conversation_id VARCHAR(255) UNIQUE NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    title VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);
```

**Current Data** (as of last check):
```
Files table:
  - 2 records
  - User: "test"
  - Files: test-db-fix.txt (indexed), STEMboree.pdf (indexed)
```

---

### 2. **Qdrant Vector Database**

**Purpose**: Semantic search over document embeddings

**Collections**:
```
Collection: "test"
  - Vectors: 109
  - Dimension: 1536
  - Distance: Cosine
  - Status: Green
  - Points: Contains chunks from 2 indexed files

Collection: "domin-user"
  - Vectors: 0
  - Dimension: 1536
  - Distance: Cosine
  - Status: Green
  - Points: Empty (no documents indexed yet)
```

**Vector Point Structure**:
```json
{
  "id": "file123_chunk5",
  "vector": [0.123, -0.456, 0.789, ...],  // 1536 floats
  "payload": {
    "text": "The warranty period is 2 years from date of purchase...",
    "file_id": "file123",
    "source": "warranty_policy.pdf",
    "chunk_id": 5,
    "page": 3
  }
}
```

**Configuration**:
- **Port**: 6333 (REST API), 6334 (gRPC)
- **Storage**: Persistent volume `./qdrant_data`
- **Log Level**: INFO

---

### 3. **AWS S3 Bucket**

**Purpose**: Object storage for uploaded files

**Structure**:
```
s3://{AWS_BUCKET_NAME}/
└── {AWS_FILES_PATH}/
    └── {user_id}/
        └── {file_id}.{extension}

Example:
s3://minima-docs/
└── uploads/
    ├── test/
    │   ├── abc123.pdf
    │   └── def456.txt
    └── domin-user/
        └── ghi789.docx
```

**File Lifecycle**:
1. Upload: Client → FastAPI → S3
2. Index: S3 → Download → Process → Qdrant
3. Delete: Remove from S3 + DB + Qdrant (future)

---

### 4. **AWS SQS Queue**

**Purpose**: Asynchronous message queue for indexing jobs

**Configuration**:
- **Queue Name**: `${AWS_SQS_QUEUE}`
- **Visibility Timeout**: 300 seconds (5 minutes)
- **Message Retention**: 4 days
- **Long Polling**: 20 seconds

**Message Format**:
```json
{
  "user_id": "test",
  "file_id": "abc123",
  "filename": "document.pdf",
  "s3_path": "uploads/test/abc123.pdf",
  "timestamp": "2026-04-07T10:30:00Z"
}
```

**Flow**:
1. **Producer** (mnma-upload): Pushes message after file upload
2. **Consumer** (mnma-index): Long polls, processes batch, deletes message
3. **Retry**: If processing fails, message reappears after visibility timeout

---

## ☁️ AWS Integration

### AWS Services Used

#### 1. **AWS Bedrock**
```yaml
Purpose: Serverless AI models
Models Used:
  - Titan Text Embeddings v1: Document vectorization (1536-dim)
  - Claude 3 Haiku: Conversational AI for RAG responses
Region: ${AWS_DEFAULT_REGION}
Authentication: IAM credentials (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
```

**Titan Embeddings Configuration**:
```python
from langchain_community.embeddings import BedrockEmbeddings

embeddings = BedrockEmbeddings(
    model_id="amazon.titan-embed-text-v1",
    region_name=os.getenv("AWS_DEFAULT_REGION")
)

# Generates 1536-dimensional vectors
vector = embeddings.embed_query("Sample text")
# Returns: [0.123, -0.456, ...]  (1536 floats)
```

**Claude 3 Haiku Configuration**:
```python
from langchain_community.llms import Bedrock

llm = Bedrock(
    model_id="anthropic.claude-3-haiku-20240307-v1:0",
    region_name=os.getenv("AWS_DEFAULT_REGION"),
    model_kwargs={
        "temperature": 0.7,
        "max_tokens": 2000
    }
)

# Streaming responses
for chunk in llm.stream(prompt):
    print(chunk, end="", flush=True)
```

#### 2. **AWS S3**
```yaml
Purpose: File storage
Bucket: ${AWS_BUCKET_NAME}
Operations:
  - PutObject: Upload files
  - GetObject: Download for indexing
  - DeleteObject: File cleanup
  - ListObjects: List user files (future)
```

#### 3. **AWS SQS**
```yaml
Purpose: Async job queue
Queue: ${AWS_SQS_QUEUE}
Operations:
  - SendMessage: Trigger indexing
  - ReceiveMessage: Long polling (20s)
  - DeleteMessage: Acknowledge processing
```

#### 4. **AWS RDS (MySQL 8.0)**
```yaml
Purpose: Metadata storage
Instance: ${RDS_DB_INSTANCE}
Database: ${RDS_DB_NAME}
Port: ${RDS_DB_PORT}
Operations:
  - File registration
  - Status tracking
  - User management (future)
```

**Environment Variables** (`.env`):
```bash
# AWS Credentials
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_DEFAULT_REGION=us-east-1

# S3
AWS_BUCKET_NAME=minima-docs
AWS_FILES_PATH=uploads
LOCAL_FILES_PATH=/tmp/uploads

# SQS
AWS_SQS_QUEUE=minima-indexing-queue

# RDS
RDS_DB_INSTANCE=minima-db.abc123.us-east-1.rds.amazonaws.com
RDS_DB_NAME=minima
RDS_DB_USER=admin
RDS_DB_PASSWORD=...
RDS_DB_PORT=3306

# Qdrant
QDRANT_BOOTSTRAP=qdrant:6333
QDRANT_COLLECTION=default

# Models
EMBEDDING_MODEL_ID=amazon.titan-embed-text-v1
EMBEDDING_SIZE=1536
CHAT_MODEL_ID=anthropic.claude-3-haiku-20240307-v1:0
```

---

## 🎨 UI Implementation

### Option 1: Simple HTML Test UI (`test-ui.html`)

**Purpose**: Lightweight, zero-dependency test interface for immediate use

**Technology Stack**:
- Vanilla JavaScript (ES6+)
- Native WebSocket API
- localStorage for session persistence
- No build process required

**Structure**:
```html
<!DOCTYPE html>
<html>
<head>
    <title>Minima - Test UI</title>
    <style>
        /* Embedded CSS - professional styling */
        .tabs { display: flex; border-bottom: 2px solid #ddd; }
        .tab { padding: 12px 24px; cursor: pointer; }
        .tab.active { background: #007bff; color: white; }
        .connection-status.connected { background: #28a745; }
        .connection-status.disconnected { background: #dc3545; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Minima - Document Intelligence</h1>
        
        <!-- Tab Navigation -->
        <div class="tabs">
            <div class="tab active" onclick="showTab('login')">Login</div>
            <div class="tab" onclick="showTab('upload')">Upload Files</div>
            <div class="tab" onclick="showTab('files')">My Files</div>
            <div class="tab" onclick="showTab('chat')">Chat</div>
        </div>
        
        <!-- Login Tab -->
        <div id="login-tab" class="tab-content active">
            <input id="userId" type="text" placeholder="User ID" />
            <input id="password" type="password" placeholder="Password" />
            <button onclick="login()">Login</button>
        </div>
        
        <!-- Upload Tab -->
        <div id="upload-tab" class="tab-content">
            <input id="fileInput" type="file" />
            <button onclick="uploadFile()">Upload</button>
            <div id="uploadStatus"></div>
        </div>
        
        <!-- Files Tab -->
        <div id="files-tab" class="tab-content">
            <button onclick="loadFiles()">Refresh</button>
            <table id="filesTable">
                <tr><th>Filename</th><th>Status</th><th>Actions</th></tr>
            </table>
        </div>
        
        <!-- Chat Tab -->
        <div id="chat-tab" class="tab-content">
            <div class="connection-status disconnected" id="connectionStatus">
                Disconnected
            </div>
            <button onclick="connectChat()">Connect</button>
            <div id="chatMessages"></div>
            <input id="messageInput" placeholder="Ask a question..." />
            <button id="sendBtn" onclick="sendMessage()" disabled>Send</button>
        </div>
    </div>
    
    <script>
        // State management
        let currentUser = localStorage.getItem('userId') || '';
        let websocket = null;
        let conversationId = Date.now().toString();
        
        // API Base URLs
        const UPLOAD_API = 'http://localhost:8001/upload';
        const CHAT_WS = 'ws://localhost:8003/chat';
        
        // Login function
        function login() {
            const userId = document.getElementById('userId').value;
            const password = document.getElementById('password').value;
            
            if (!userId) {
                alert('Please enter User ID');
                return;
            }
            
            currentUser = userId;
            localStorage.setItem('userId', userId);
            alert(`Logged in as: ${userId}`);
            showTab('upload');
        }
        
        // File upload with FormData
        async function uploadFile() {
            if (!currentUser) {
                alert('Please login first');
                showTab('login');
                return;
            }
            
            const fileInput = document.getElementById('fileInput');
            if (!fileInput.files.length) {
                alert('Please select a file');
                return;
            }
            
            const formData = new FormData();
            formData.append('file', fileInput.files[0]);
            
            try {
                const response = await fetch(
                    `${UPLOAD_API}/upload_file/${currentUser}`,
                    {
                        method: 'POST',
                        body: formData
                    }
                );
                
                if (response.ok) {
                    const result = await response.json();
                    alert('File uploaded successfully!');
                    fileInput.value = '';
                    document.getElementById('uploadStatus').innerHTML = 
                        `<p style="color: green;">Uploaded: ${result.filename}</p>
                         <p>Indexing in progress... (wait ~30 seconds)</p>`;
                } else {
                    alert('Upload failed');
                }
            } catch (error) {
                alert(`Error: ${error.message}`);
            }
        }
        
        // Load files list
        async function loadFiles() {
            if (!currentUser) {
                alert('Please login first');
                return;
            }
            
            try {
                const response = await fetch(
                    `${UPLOAD_API}/get_files/${currentUser}`
                );
                const files = await response.json();
                
                const table = document.getElementById('filesTable');
                // Clear existing rows (except header)
                table.innerHTML = '<tr><th>Filename</th><th>Status</th><th>Actions</th></tr>';
                
                files.forEach(file => {
                    const row = table.insertRow();
                    row.innerHTML = `
                        <td>${file.filename}</td>
                        <td><span class="status-${file.status}">${file.status}</span></td>
                        <td><button onclick="deleteFile('${file.file_id}')">Delete</button></td>
                    `;
                });
            } catch (error) {
                alert(`Error loading files: ${error.message}`);
            }
        }
        
        // Connect to chat WebSocket
        async function connectChat() {
            if (!currentUser) {
                alert('Please login first');
                showTab('login');
                return;
            }
            
            // Check if user has files BEFORE connecting
            try {
                const response = await fetch(
                    `${UPLOAD_API}/get_files/${currentUser}`
                );
                const files = await response.json();
                
                if (files.length === 0) {
                    alert('Please upload and index some documents first before using chat!');
                    showTab('upload');
                    return;
                }
                
                // Check if any files are indexed
                const indexedFiles = files.filter(f => f.status === 'indexed');
                if (indexedFiles.length === 0) {
                    alert('Your files are still being indexed. Please wait ~30 seconds and try again.');
                    return;
                }
                
                // Get file IDs for indexed files
                const fileIds = indexedFiles.map(f => f.file_id).join(',');
                
                // Connect WebSocket
                const wsUrl = `${CHAT_WS}/${currentUser}/${conversationId}/${fileIds}`;
                websocket = new WebSocket(wsUrl);
                
                websocket.onopen = () => {
                    document.getElementById('connectionStatus').className = 
                        'connection-status connected';
                    document.getElementById('connectionStatus').textContent = 
                        'Connected';
                    document.getElementById('sendBtn').disabled = false;
                };
                
                websocket.onmessage = (event) => {
                    const data = JSON.parse(event.data);
                    const messagesDiv = document.getElementById('chatMessages');
                    
                    if (data.type === 'answer') {
                        const msgDiv = document.createElement('div');
                        msgDiv.className = 'message assistant';
                        msgDiv.textContent = data.content;
                        messagesDiv.appendChild(msgDiv);
                        messagesDiv.scrollTop = messagesDiv.scrollHeight;
                    }
                };
                
                websocket.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    alert('Chat connection error');
                };
                
                websocket.onclose = () => {
                    document.getElementById('connectionStatus').className = 
                        'connection-status disconnected';
                    document.getElementById('connectionStatus').textContent = 
                        'Disconnected';
                    document.getElementById('sendBtn').disabled = true;
                };
            } catch (error) {
                alert(`Error checking files: ${error.message}`);
            }
        }
        
        // Send message
        function sendMessage() {
            const input = document.getElementById('messageInput');
            const message = input.value.trim();
            
            if (!message || !websocket || websocket.readyState !== WebSocket.OPEN) {
                return;
            }
            
            // Display user message
            const messagesDiv = document.getElementById('chatMessages');
            const msgDiv = document.createElement('div');
            msgDiv.className = 'message user';
            msgDiv.textContent = message;
            messagesDiv.appendChild(msgDiv);
            
            // Send to WebSocket
            websocket.send(JSON.stringify({
                type: 'question',
                content: message
            }));
            
            input.value = '';
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }
        
        // Tab switching
        function showTab(tabName) {
            // Hide all tabs
            document.querySelectorAll('.tab-content').forEach(tab => {
                tab.classList.remove('active');
            });
            document.querySelectorAll('.tab').forEach(tab => {
                tab.classList.remove('active');
            });
            
            // Show selected tab
            document.getElementById(`${tabName}-tab`).classList.add('active');
            event.target.classList.add('active');
            
            // Auto-load data for some tabs
            if (tabName === 'files') {
                loadFiles();
            }
        }
        
        // Auto-login if userId stored
        if (currentUser) {
            document.getElementById('userId').value = currentUser;
            document.querySelector('.tabs .tab:nth-child(2)').click(); // Go to Upload tab
        }
    </script>
</body>
</html>
```

**Key Features**:
1. ✅ **No Dependencies**: Runs directly in browser - just open the file
2. ✅ **Session Persistence**: Uses localStorage to remember logged-in user
3. ✅ **File Validation**: Checks if user has indexed documents before allowing chat
4. ✅ **Real-time Updates**: WebSocket for live chat responses
5. ✅ **Status Indicators**: Visual feedback for connection state (green/red)
6. ✅ **4 Tabs**: Login → Upload → Files → Chat (logical workflow)

**Usage**:
```bash
# Simply open in browser
start test-ui.html  # Windows
# OR
open test-ui.html   # macOS
# OR
xdg-open test-ui.html  # Linux
```

**Recent Improvements**:
- Added file existence check before chat connection
- Added status validation (only indexed files allowed)
- Added helpful guidance text in chat tab
- Improved error messages for better UX

---

### Option 2: Professional React UI (`mnma-ui/`)

**Purpose**: Full-featured, production-ready application with advanced UI/UX

**Technology Stack**:
```json
{
  "framework": "React 18.2.0",
  "language": "TypeScript 5.2.2",
  "build": "Vite 5.1.4",
  "ui": "Material-UI 5.15.11",
  "routing": "React Router 6.22.0",
  "http": "Axios 1.6.7",
  "state": "Context API + useReducer"
}
```

**Project Structure**:
```
mnma-ui/
├── public/
│   └── vite.svg
├── src/
│   ├── components/               # Reusable UI components
│   │   ├── ChatWindow.tsx        # Message display area
│   │   ├── ChatInput.tsx         # Message input with send button
│   │   ├── ChatMessage.tsx       # Individual message bubble
│   │   ├── FileList.tsx          # Table of uploaded files
│   │   ├── FileListItem.tsx      # Single file row
│   │   ├── FileUploadZone.tsx    # Drag-and-drop upload area
│   │   ├── ConnectionStatus.tsx  # WebSocket status indicator
│   │   └── NotificationSnackbar.tsx  # Toast notifications
│   │
│   ├── pages/                    # Route-level pages
│   │   ├── DocumentsPage.tsx     # Upload + file management
│   │   └── ChatPage.tsx          # Chat interface
│   │
│   ├── services/                 # Backend integration
│   │   ├── uploadApi.ts          # REST API calls (Axios)
│   │   └── chatWebSocket.ts      # WebSocket client
│   │
│   ├── hooks/                    # Custom React hooks
│   │   ├── useChat.ts            # Chat logic + WebSocket
│   │   ├── useFileUpload.ts      # File upload with progress
│   │   └── useFileList.ts        # File list management
│   │
│   ├── contexts/                 # Global state
│   │   └── AppContext.tsx        # User session, notifications
│   │
│   ├── types/                    # TypeScript definitions
│   │   └── index.ts              # Interfaces (File, Message, User)
│   │
│   ├── App.tsx                   # Root component + routing
│   ├── main.tsx                  # Entry point
│   └── vite-env.d.ts             # Vite types
│
├── index.html                    # HTML entry
├── package.json                  # Dependencies
├── tsconfig.json                 # TypeScript config
├── vite.config.ts                # Vite build config
├── Dockerfile                    # Container definition
└── .dockerignore                 # Docker build exclusions
```

**Key Components**:

#### 1. **App.tsx** (Root Component)
```typescript
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline, AppBar, Toolbar, Typography } from '@mui/material';
import { AppProvider } from './contexts/AppContext';
import { DocumentsPage } from './pages/DocumentsPage';
import { ChatPage } from './pages/ChatPage';
import { NotificationSnackbar } from './components/NotificationSnackbar';

const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },
    secondary: { main: '#dc004e' },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppProvider>
        <BrowserRouter>
          <AppBar position="static">
            <Toolbar>
              <Typography variant="h6">Minima - Document Intelligence</Typography>
            </Toolbar>
          </AppBar>

          <Routes>
            <Route path="/" element={<DocumentsPage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>

          <NotificationSnackbar />
        </BrowserRouter>
      </AppProvider>
    </ThemeProvider>
  );
}

export default App;
```

#### 2. **AppContext.tsx** (Global State Management)
```typescript
import React, { createContext, useContext, useReducer, ReactNode } from 'react';

interface AppState {
  user: { userId: string; isAuthenticated: boolean } | null;
  notification: { message: string; severity: 'success' | 'error' | 'info' } | null;
}

type AppAction =
  | { type: 'SET_USER'; payload: { userId: string } }
  | { type: 'LOGOUT' }
  | { type: 'SHOW_NOTIFICATION'; payload: { message: string; severity: 'success' | 'error' | 'info' } }
  | { type: 'HIDE_NOTIFICATION' };

const initialState: AppState = {
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  notification: null,
};

const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_USER':
      localStorage.setItem('user', JSON.stringify({ userId: action.payload.userId, isAuthenticated: true }));
      return { ...state, user: { userId: action.payload.userId, isAuthenticated: true } };
    case 'LOGOUT':
      localStorage.removeItem('user');
      return { ...state, user: null };
    case 'SHOW_NOTIFICATION':
      return { ...state, notification: action.payload };
    case 'HIDE_NOTIFICATION':
      return { ...state, notification: null };
    default:
      return state;
  }
};

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
};
```

#### 3. **uploadApi.ts** (REST API Service)
```typescript
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001/upload';

export interface FileMetadata {
  file_id: string;
  filename: string;
  status: 'uploaded' | 'indexing' | 'indexed' | 'failed';
  created_at: string;
  file_size?: number;
}

export const uploadApi = {
  // Upload file
  uploadFile: async (userId: string, file: File): Promise<FileMetadata> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await axios.post(
      `${API_BASE_URL}/upload_file/${userId}`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 100));
          console.log(`Upload progress: ${percentCompleted}%`);
        }
      }
    );
    
    return response.data;
  },

  // Get user's files
  getFiles: async (userId: string): Promise<FileMetadata[]> => {
    const response = await axios.get(`${API_BASE_URL}/get_files/${userId}`);
    return response.data;
  },

  // Delete file
  deleteFile: async (userId: string, fileId: string): Promise<void> => {
    await axios.delete(`${API_BASE_URL}/delete_file/${userId}/${fileId}`);
  },
};
```

#### 4. **chatWebSocket.ts** (WebSocket Client)
```typescript
export class ChatWebSocket {
  private ws: WebSocket | null = null;
  private userId: string;
  private conversationId: string;
  private fileIds: string[];
  private onMessage: (message: ChatMessage) => void;
  private onStatusChange: (status: 'connected' | 'disconnected') => void;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor(
    userId: string,
    conversationId: string,
    fileIds: string[],
    onMessage: (message: ChatMessage) => void,
    onStatusChange: (status: 'connected' | 'disconnected') => void
  ) {
    this.userId = userId;
    this.conversationId = conversationId;
    this.fileIds = fileIds;
    this.onMessage = onMessage;
    this.onStatusChange = onStatusChange;
  }

  connect() {
    const wsUrl = `ws://localhost:8003/chat/${this.userId}/${this.conversationId}/${this.fileIds.join(',')}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.onStatusChange('connected');
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.onMessage(data);
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.ws.onclose = () => {
      console.log('WebSocket closed');
      this.onStatusChange('disconnected');
      this.attemptReconnect();
    };
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      setTimeout(() => this.connect(), 3000);
    }
  }

  sendMessage(content: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'question', content }));
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
```

#### 5. **useChat.ts** (Custom Hook)
```typescript
import { useState, useEffect, useCallback } from 'react';
import { ChatWebSocket } from '../services/chatWebSocket';
import { ChatMessage } from '../types';
import { v4 as uuidv4 } from 'uuid';

export const useChat = (userId: string, fileIds: string[]) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [chatClient, setChatClient] = useState<ChatWebSocket | null>(null);
  const conversationId = useState(() => uuidv4())[0];

  const handleMessage = useCallback((message: ChatMessage) => {
    setMessages(prev => [...prev, message]);
  }, []);

  const handleStatusChange = useCallback((status: 'connected' | 'disconnected') => {
    setIsConnected(status === 'connected');
  }, []);

  const connect = useCallback(() => {
    if (fileIds.length === 0) {
      console.warn('No files to chat about');
      return;
    }

    const client = new ChatWebSocket(
      userId,
      conversationId,
      fileIds,
      handleMessage,
      handleStatusChange
    );
    client.connect();
    setChatClient(client);
  }, [userId, conversationId, fileIds, handleMessage, handleStatusChange]);

  const sendMessage = useCallback((content: string) => {
    if (chatClient && isConnected) {
      chatClient.sendMessage(content);
      
      // Add user message to UI immediately
      setMessages(prev => [...prev, {
        id: uuidv4(),
        type: 'question',
        content,
        timestamp: new Date().toISOString()
      }]);
    }
  }, [chatClient, isConnected]);

  const disconnect = useCallback(() => {
    if (chatClient) {
      chatClient.disconnect();
      setChatClient(null);
    }
  }, [chatClient]);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return { messages, isConnected, connect, disconnect, sendMessage };
};
```

#### 6. **DocumentsPage.tsx** (Upload & File Management)
```typescript
import React from 'react';
import { Container, Grid, Paper, Typography, Box, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { FileUploadZone } from '../components/FileUploadZone';
import { FileList } from '../components/FileList';
import { useAppContext } from '../contexts/AppContext';

export const DocumentsPage: React.FC = () => {
  const { state } = useAppContext();
  const navigate = useNavigate();

  if (!state.user) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Paper sx={{ p: 4 }}>
          <Typography variant="h5">Please login first</Typography>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">My Documents</Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={() => navigate('/chat')}
        >
          Go to Chat
        </Button>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <FileUploadZone userId={state.user.userId} />
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <FileList userId={state.user.userId} />
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};
```

#### 7. **ChatPage.tsx** (Conversational Interface)
```typescript
import React, { useEffect, useState } from 'react';
import { Container, Grid, Paper, Typography, Box, Button, CircularProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { ChatWindow } from '../components/ChatWindow';
import { ChatInput } from '../components/ChatInput';
import { ConnectionStatus } from '../components/ConnectionStatus';
import { useAppContext } from '../contexts/AppContext';
import { useChat } from '../hooks/useChat';
import { uploadApi } from '../services/uploadApi';

export const ChatPage: React.FC = () => {
  const { state, dispatch } = useAppContext();
  const navigate = useNavigate();
  const [fileIds, setFileIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const { messages, isConnected, connect, disconnect, sendMessage } = useChat(
    state.user?.userId || '',
    fileIds
  );

  useEffect(() => {
    if (!state.user) {
      navigate('/');
      return;
    }

    // Load indexed files
    const loadFiles = async () => {
      try {
        const files = await uploadApi.getFiles(state.user!.userId);
        const indexed = files.filter(f => f.status === 'indexed');
        
        if (indexed.length === 0) {
          dispatch({
            type: 'SHOW_NOTIFICATION',
            payload: {
              message: 'No indexed documents found. Please upload files first.',
              severity: 'warning'
            }
          });
          setTimeout(() => navigate('/'), 2000);
          return;
        }

        setFileIds(indexed.map(f => f.file_id));
        setLoading(false);
      } catch (error) {
        dispatch({
          type: 'SHOW_NOTIFICATION',
          payload: { message: 'Error loading files', severity: 'error' }
        });
      }
    };

    loadFiles();
  }, [state.user, navigate, dispatch]);

  if (!state.user) return null;
  if (loading) return <CircularProgress />;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4, height: 'calc(100vh - 150px)' }}>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4">Chat with Documents</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <ConnectionStatus isConnected={isConnected} />
          {!isConnected ? (
            <Button variant="contained" onClick={connect}>Connect</Button>
          ) : (
            <Button variant="outlined" onClick={disconnect}>Disconnect</Button>
          )}
          <Button variant="text" onClick={() => navigate('/')}>Back to Documents</Button>
        </Box>
      </Box>

      <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <ChatWindow messages={messages} />
        <ChatInput onSend={sendMessage} disabled={!isConnected} />
      </Paper>
    </Container>
  );
};
```

**Building & Running**:
```bash
# Development mode (local)
cd mnma-ui
npm install          # Install dependencies (~5 min first time)
npm run dev          # Start dev server on http://localhost:5173

# Production build
npm run build        # Compiles TypeScript + Vite → dist/
npm run preview      # Preview production build

# Docker deployment
cd ..
docker compose build mnma-ui    # Build container (slow on Alpine)
docker compose up -d mnma-ui    # Run on http://localhost:3000
```

**Advantages over Simple HTML**:
1. ✅ **Type Safety**: TypeScript catches errors at compile time
2. ✅ **Component Reusability**: DRY principle with React components
3. ✅ **Professional UI**: Material-UI for consistent enterprise design
4. ✅ **State Management**: Context API for global state (user session, notifications)
5. ✅ **Routing**: Multi-page app with React Router
6. ✅ **Custom Hooks**: Encapsulated business logic (useChat, useFileUpload)
7. ✅ **Error Handling**: Comprehensive try/catch with user feedback
8. ✅ **Scalability**: Easy to add new features (admin panel, analytics, etc.)

---

### Option 3: Admin UI (`documindai-admin/`)

**Purpose**: Professional React-based administrative interface with advanced document management and monitoring

**Technology Stack**:
- React 18 + TypeScript
- Material-UI v5 (MUI)
- React Router v6
- Vite (build tool)
- Context API (state management)

**Key Features**:
1. **Tabbed File Intake Page**: Separate tabs for uploading and managing documents
2. **Processing Pipeline Visualization**: Real-time status tracking across upload → processing → indexed stages
3. **Grid View Document Management**: Card-based layout with preview, download, and delete actions
4. **Bulk Operations**: Multi-select and bulk delete functionality
5. **Advanced Filtering**: Search by filename, filter by status (uploaded/processing/indexed/failed)
6. **User & Role Management**: Admin capabilities for managing user access
7. **System Health Monitoring**: Real-time service status and performance metrics
8. **Chat Interface**: Integrated chat with source attribution showing which documents were used

**Key Components**:
```
documindai-admin/
├── src/
│   ├── App.tsx                       # Main app with routing
│   ├── main.tsx                      # Entry point
│   ├── components/
│   │   ├── AppShell.tsx             # Layout with navigation
│   │   ├── ConnectionStatus.tsx      # WebSocket status indicator
│   │   └── NotificationSnackbar.tsx  # Toast notifications
│   ├── pages/
│   │   ├── LoginPage.tsx            # User authentication
│   │   ├── DashboardPage.tsx        # Admin dashboard
│   │   ├── FileIntakePage.tsx       # **Tabbed file upload & management**
│   │   ├── ProcessingPipelinePage.tsx  # **Pipeline status visualization**
│   │   ├── ChatPage.tsx             # Chat interface with sources
│   │   ├── UsersRolesPage.tsx       # User management
│   │   └── SystemHealthPage.tsx     # Service monitoring
│   ├── contexts/
│   │   └── AppContext.tsx           # Global state management
│   ├── services/
│   │   ├── adminApi.ts              # API client for backend services
│   │   └── websocket.ts             # WebSocket connection management
│   └── types/
│       └── index.ts                  # TypeScript type definitions
├── package.json                      # Dependencies
├── tsconfig.json                     # TypeScript config
├── vite.config.ts                    # Vite bundler config
├── nginx.conf                        # Production web server config
└── Dockerfile                        # Container definition
```

#### File Intake Page - Tabbed Interface

**Tab 1: Upload**
```typescript
<Box sx={{ p: 3 }}>
  <Typography variant="h6">Upload Files</Typography>
  
  {/* Drag & Drop Zone */}
  <Box {...getRootProps()} sx={{ 
    border: '2px dashed',
    borderColor: isDragActive ? 'primary.main' : 'grey.400',
    borderRadius: 2,
    p: 4,
    textAlign: 'center',
    cursor: 'pointer'
  }}>
    <CloudUpload sx={{ fontSize: 48, mb: 1 }} />
    <Typography>
      {isDragActive ? 'Drop files here...' : 'Drag & drop files or click to browse'}
    </Typography>
    <Typography variant="caption" color="text.secondary">
      Supported: PDF, TXT, DOCX
    </Typography>
  </Box>
  
  {/* Metadata Form */}
  <FormControl fullWidth required>
    <InputLabel>Document Type</InputLabel>
    <Select value={metadata.documentType} onChange={handleTypeChange}>
      {documentTypes.map(type => (
        <MenuItem key={type} value={type}>{type}</MenuItem>
      ))}
    </Select>
  </FormControl>
  
  <FormControl fullWidth required>
    <InputLabel>Sensitivity</InputLabel>
    <Select value={metadata.sensitivity}>
      <MenuItem value="public">Public</MenuItem>
      <MenuItem value="internal">Internal</MenuItem>
      <MenuItem value="confidential">Confidential</MenuItem>
    </Select>
  </FormControl>
  
  {/* Tags Input */}
  <TextField
    label="Tags (optional)"
    value={tagInput}
    onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
    helperText="e.g., Q2, finance, vendor-x"
  />
  
  <Button variant="contained" onClick={handleUpload} disabled={uploading}>
    {uploading ? 'Uploading...' : 'Upload Files'}
  </Button>
</Box>
```

**Tab 2: Uploaded Files**
```typescript
<Box sx={{ p: 3 }}>
  {/* Search & Filter Controls */}
  <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
    <TextField
      placeholder="Search files..."
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      InputProps={{
        startAdornment: <Search />
      }}
    />
    
    <FormControl size="small" sx={{ minWidth: 150 }}>
      <InputLabel>Status</InputLabel>
      <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
        <MenuItem value="all">All Status</MenuItem>
        <MenuItem value="uploaded">Uploaded</MenuItem>
        <MenuItem value="processing">Processing</MenuItem>
        <MenuItem value="indexed">Indexed</MenuItem>
        <MenuItem value="failed">Failed</MenuItem>
      </Select>
    </FormControl>
    
    {selectedDocuments.length > 0 && (
      <Button
        variant="outlined"
        color="error"
        startIcon={<DeleteSweep />}
        onClick={handleBulkDelete}
      >
        Delete ({selectedDocuments.length})
      </Button>
    )}
  </Box>
  
  {/* Grid View with Document Cards */}
  <Grid container spacing={2}>
    {filteredDocuments.map(doc => (
      <Grid item xs={12} sm={6} md={4} key={doc.fileId}>
        <Card sx={{ 
          height: '100%',
          border: selectedDocuments.includes(doc.fileId) ? '2px solid' : '1px solid',
          '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 }
        }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
              <Checkbox
                checked={selectedDocuments.includes(doc.fileId)}
                onChange={() => handleToggleDocument(doc.fileId)}
              />
              <Description sx={{ fontSize: 40, color: 'primary.main' }} />
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  {doc.filename}
                </Typography>
                <Chip
                  size="small"
                  icon={doc.status === 'indexed' ? <CheckCircle /> : <CircularProgress size={16} />}
                  label={doc.status === 'uploaded' ? 'Indexing...' : doc.status}
                  color={doc.status === 'indexed' ? 'success' : 'warning'}
                />
              </Box>
            </Box>
            
            {/* Document Metadata */}
            {doc.s3Path && (
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Folder sx={{ fontSize: 16, mr: 0.5 }} />
                <Typography variant="caption">
                  {doc.s3Path.split('/').slice(0, -1).join('/')}
                </Typography>
              </Box>
            )}
            
            {doc.documentType && (
              <Chip size="small" label={doc.documentType} variant="outlined" />
            )}
            
            {doc.sensitivity && (
              <Chip
                size="small"
                label={doc.sensitivity}
                color={doc.sensitivity === 'confidential' ? 'error' : 'warning'}
              />
            )}
            
            {doc.tags && doc.tags.map(tag => (
              <Chip key={tag} size="small" label={tag} />
            ))}
          </CardContent>
          
          <CardActions>
            <Tooltip title="Preview">
              <IconButton size="small" onClick={() => setPreviewFile(doc)}>
                <Visibility />
              </IconButton>
            </Tooltip>
            <Tooltip title="Download">
              <IconButton size="small" onClick={() => handleDownload(doc)}>
                <Download />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton size="small" color="error" onClick={() => handleDelete(doc.fileId)}>
                <Delete />
              </IconButton>
            </Tooltip>
          </CardActions>
        </Card>
      </Grid>
    ))}
  </Grid>
  
  {/* Auto-refresh indicator */}
  {autoRefresh && (
    <Typography variant="caption" color="primary">
      <CircularProgress size={12} /> Auto-refreshing every 5 seconds...
    </Typography>
  )}
</Box>
```

#### Processing Pipeline Page

Real-time visualization of document processing flow across three stages:

```typescript
<ProcessingPipelinePage>
  <Typography variant="h4">Processing Pipeline</Typography>
  
  {/* Visual Flow Diagram */}
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
    {/* Stage 1: Uploaded */}
    <Card sx={{ flex: 1, bgcolor: 'info.light', cursor: 'pointer' }}
          onClick={() => setExpandedStage('uploaded')}>
      <CardHeader 
        title={`Uploaded (${pipelineData.uploaded.count})`}
        avatar={<CloudUpload />}
      />
      <Collapse in={expandedStage === 'uploaded'}>
        <CardContent>
          {pipelineData.uploaded.files.map(file => (
            <Typography key={file.fileId}>{file.filename}</Typography>
          ))}
        </CardContent>
      </Collapse>
    </Card>
    
    <ArrowForward />
    
    {/* Stage 2: Processing */}
    <Card sx={{ flex: 1, bgcolor: 'warning.light', cursor: 'pointer' }}
          onClick={() => setExpandedStage('processing')}>
      <CardHeader 
        title={`Processing (${pipelineData.processing.count})`}
        avatar={<HourglassEmpty />}
      />
      <Typography variant="caption">
        Extracting text & generating embeddings
      </Typography>
      <Collapse in={expandedStage === 'processing'}>
        <CardContent>
          {pipelineData.processing.files.map(file => (
            <Box key={file.fileId}>
              <Typography>{file.filename}</Typography>
              <LinearProgress />
            </Box>
          ))}
        </CardContent>
      </Collapse>
    </Card>
    
    <ArrowForward />
    
    {/* Stage 3: Indexed */}
    <Card sx={{ flex: 1, bgcolor: 'success.light', cursor: 'pointer' }}
          onClick={() => setExpandedStage('indexed')}>
      <CardHeader 
        title={`Indexed (${pipelineData.indexed.count})`}
        avatar={<CheckCircle />}
      />
      <Collapse in={expandedStage === 'indexed'}>
        <CardContent>
          {pipelineData.indexed.files.map(file => (
            <Typography key={file.fileId}>✓ {file.filename}</Typography>
          ))}
        </CardContent>
      </Collapse>
    </Card>
  </Box>
  
  {/* Recent Activity Table */}
  <TableContainer>
    <Table>
      <TableHead>
        <TableRow>
          <TableCell>Filename</TableCell>
          <TableCell>Status</TableCell>
          <TableCell>Last Update</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {pipelineData.recent_files.map(file => (
          <TableRow key={file.fileId}>
            <TableCell>{file.filename}</TableCell>
            <TableCell>
              <Chip label={file.status} color={getStatusColor(file.status)} />
            </TableCell>
            <TableCell>{formatTimestamp(file.updatedAt)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </TableContainer>
  
  {/* Auto-refresh toggle */}
  <Switch
    checked={autoRefresh}
    onChange={() => setAutoRefresh(!autoRefresh)}
    label={autoRefresh ? "Auto-refresh ON (2s)" : "Auto-refresh OFF"}
  />
</ProcessingPipelinePage>
```

**Pipeline Status API**:
```typescript
// GET /upload/pipeline-status/{user_id}
interface PipelineData {
  pipeline: {
    uploaded: { count: number; files: PipelineFile[] };
    processing: { count: number; files: PipelineFile[] };
    indexed: { count: number; files: PipelineFile[] };
  };
  recent_files: PipelineFile[];
  total_files: number;
}
```

#### Chat Page with Source Attribution

Enhanced chat interface that shows which documents contributed to each response:

```typescript
<ChatMessage>
  {message.type === 'assistant' && (
    <Paper sx={{ p: 2, mb: 2, bgcolor: 'grey.100' }}>
      <Typography variant="body1">{message.content}</Typography>
      
      {/* Source Documents */}
      {message.sources && message.sources.length > 0 && (
        <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <InfoIcon fontSize="small" />
            Sources: {message.sources.length} document{message.sources.length > 1 ? 's' : ''}
          </Typography>
          <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {message.sources.map((source, idx) => (
              <Chip
                key={idx}
                icon={<Description />}
                label={source.filename}
                size="small"
                variant="outlined"
                onClick={() => showSourcePreview(source)}
              />
            ))}
          </Box>
        </Box>
      )}
    </Paper>
  )}
</ChatMessage>
```

**Building & Deployment**:
```bash
# Development
cd documindai-admin
npm install
npm run dev          # http://localhost:3001

# Production build
npm run build        # → dist/

# Docker deployment
docker-compose build documindai-admin
docker-compose up -d documindai-admin  # http://localhost:3001
```

**Key Improvements over Simple UI**:
1. ✅ **Tabbed Interface**: Separate upload and management workflows
2. ✅ **Pipeline Visibility**: Real-time tracking of document processing stages
3. ✅ **Bulk Operations**: Select multiple documents for batch deletion
4. ✅ **Advanced Search**: Filter by filename, status, document type
5. ✅ **Source Attribution**: See which documents contributed to chat responses
6. ✅ **Auto-refresh**: Automatically updates processing status every 2-5 seconds
7. ✅ **Grid View**: Card-based layout with rich metadata display
8. ✅ **User Management**: Admin capabilities for managing users and roles
9. ✅ **System Monitoring**: Health checks and performance metrics
10. ✅ **Professional Design**: Material-UI components with responsive layout

---

## 🛠️ Recent Improvements & Bug Fixes

### MySQL Autocommit Fix (April 9, 2026)

**Problem**: Pipeline status API was caching stale data, showing files as "uploaded" when they were actually "indexed".

**Root Cause**: MySQL connection without `autocommit=True` was caching query results within transactions.

**Solution**: Added `autocommit=True` to PyMySQL connections in both upload and index services:
```python
# documindai-upload/aws_rds_helper.py & documindai-index/aws_rds_helper.py
self.connection = pymysql.connect(
    host=endpoint,
    database=self.database,
    user=self.user,
    password=self.password,
    port=int(self.port),
    cursorclass=cursors.DictCursor,
    connect_timeout=10,
    read_timeout=30,
    write_timeout=30,
    autocommit=True  # ← Prevents query caching
)
```

**Result**: Real-time status updates without needing service restarts.

### Reindexing Loop Fix (April 9, 2026)

**Problem**: Files were being reindexed repeatedly, creating duplicate SQS messages.

**Root Cause**: Index service was checking file status BEFORE updating it to "processing", allowing duplicate SQS messages to trigger multiple indexing jobs.

**Solution**: Reordered operations to check-and-update status atomically:
```python
# documindai-index/async_loop.py
async def process_message(message):
    # 1. Check status first
    current_status = await indexer.get_file_status(file_id)
    if current_status == 'indexed':
        logger.info(f"File {file_id} already indexed, skipping")
        sqs.delete_message(queue_name, receipt_handle)
        return
    
    # 2. Update to processing (prevents duplicates)
    await indexer.update_file_status(file_id, 'processing')
    
    # 3. Perform indexing
    await indexer.index_file(file_id, s3_path)
    
    # 4. Update to indexed
    await indexer.update_file_status(file_id, 'indexed')
    
    # 5. Delete SQS message
    sqs.delete_message(queue_name, receipt_handle)
```

**Result**: Files are indexed exactly once, no duplicate processing.

### Source Attribution in Chat (April 9, 2026)

**Enhancement**: Chat responses now show which documents were used as sources.

**Implementation**:
```python
# documindai-chat/async_question_to_answer.py
def format_response_with_sources(answer: str, source_documents: List[Document]) -> dict:
    # Extract unique sources
    sources = []
    seen_files = set()
    
    for doc in source_documents:
        file_id = doc.metadata.get('file_id')
        if file_id and file_id not in seen_files:
            sources.append({
                'file_id': file_id,
                'filename': doc.metadata.get('source', 'Unknown'),
                'chunk_text': doc.page_content[:200]  # Preview
            })
            seen_files.add(file_id)
    
    return {
        'answer': answer,
        'sources': sources,
        'source_count': len(sources)
    }
```

**WebSocket Response Format**:
```json
{
  "type": "stream",
  "content": "AI response text...",
  "sources": [
    {
      "file_id": "abc123",
      "filename": "document.pdf",
      "chunk_text": "Relevant excerpt from the document..."
    }
  ],
  "source_count": 2
}
```

**Result**: Users can verify which documents contributed to responses, improving transparency and trust.

### Processing Speed Note

Small text files (< 10KB) process in 1-2 seconds, which is faster than the typical UI refresh interval (2-5 seconds). This is expected behavior - to observe the "processing" stage, upload larger PDF files (5+ pages, ~2MB) which take 30-120 seconds to index.

---

## 🔌 Communication Protocols

### 1. **REST API** (Upload Service)

**Base URL**: `http://localhost:8001/upload`

**Endpoints**:

#### Upload File
```http
POST /upload_file/{user_id}
Content-Type: multipart/form-data

Form Data:
  file: <binary file data>

Response (200 OK):
{
  "file_id": "abc123",
  "filename": "document.pdf",
  "status": "uploaded",
  "s3_path": "uploads/test/abc123.pdf",
  "created_at": "2026-04-07T10:30:00Z"
}
```

#### Get Files
```http
GET /upload/get_files/{user_id}

Response (200 OK):
[
  {
    "file_id": "abc123",
    "filename": "document.pdf",
    "status": "indexed",
    "created_at": "2026-04-07T10:30:00Z",
    "file_size": 524288
  },
  {
    "file_id": "def456",
    "filename": "notes.txt",
    "status": "indexing",
    "created_at": "2026-04-07T10:32:15Z",
    "file_size": 2048
  }
]
```

#### Delete File
```http
DELETE /upload/delete_file/{user_id}/{file_id}

Response (200 OK):
{
  "message": "File deleted successfully"
}
```

---

### 2. **WebSocket Protocol** (Chat Service)

**Connection URL**: `ws://localhost:8003/chat/{user_id}/{conversation_id}/{file_ids}`

**Parameters**:
- `user_id`: User identifier (used for Qdrant collection)
- `conversation_id`: Unique session ID (UUID recommended)
- `file_ids`: Comma-separated list (e.g., `abc123,def456`) or empty for all files

**Message Format (Client → Server)**:
```json
{
  "type": "question",
  "content": "What is the warranty period?"
}
```

**Message Format (Server → Client - Answer)**:
```json
{
  "type": "answer",
  "content": "Based on your documents, the warranty period is 2 years from the date of purchase. This covers manufacturing defects and normal wear.",
  "sources": [
    {
      "file_id": "abc123",
      "source": "warranty_policy.pdf",
      "score": 0.89,
      "chunk_id": 5
    },
    {
      "file_id": "abc123",
      "source": "warranty_policy.pdf",
      "score": 0.82,
      "chunk_id": 7
    }
  ],
  "timestamp": "2026-04-07T10:35:42Z"
}
```

**Special Commands**:
```json
// Clear conversation history
{ "type": "command", "content": "!clear" }

// Get help
{ "type": "command", "content": "!help" }

// System response
{
  "type": "system",
  "content": "Conversation history cleared"
}
```

**Connection Lifecycle**:
```
1. Client connects: ws://localhost:8003/chat/test/uuid123/abc,def
2. Server validates user and loads Qdrant collection
3. Connection established (onopen event)
4. Client sends questions, server streams answers
5. Client can send !clear, !help commands
6. Connection closes (onclose event)
7. Client can reconnect with same or new conversation_id
```

---

## 🛠️ Technology Stack

### Backend Services
```yaml
Language: Python 3.9
Web Framework: FastAPI 0.100+
Async: asyncio, aiofiles
HTTP Client: httpx, requests
Database: PyMySQL (MySQL 8.0 connector)
Vector DB: qdrant-client
LLM Framework: LangChain 0.1+
AWS SDK: boto3 (S3, SQS, Bedrock)
Environment: python-dotenv
Parsing: pypdf, unstructured, python-docx
YAML: PyYAML
Retries: tenacity
Logging: Python logging module
```

### Frontend (React UI)
```yaml
Framework: React 18.2.0
Language: TypeScript 5.2.2
Build Tool: Vite 5.1.4
Bundler: esbuild (via Vite)
UI Library: Material-UI 5.15.11
Icons: @mui/icons-material 5.15.11
Styling: Emotion (@emotion/react, @emotion/styled)
Routing: React Router DOM 6.22.0
HTTP Client: Axios 1.6.7
UUID: uuid 9.0.1
Linting: ESLint 8.56 + TypeScript ESLint
```

### Frontend (Test UI)
```yaml
Language: JavaScript ES6+
APIs: Fetch API, WebSocket API
Storage: localStorage
Dependencies: None (vanilla JS)
Runtime: Browser (modern browsers)
```

### Infrastructure
```yaml
Containerization: Docker 20+, Docker Compose 3.9
Vector Database: Qdrant latest (1.7+)
Relational DB: MySQL 8.0 (AWS RDS compatible)
Message Queue: AWS SQS
Object Storage: AWS S3
AI Platform: AWS Bedrock
Runtime: Node.js 18-alpine (React UI), Python 3.9-slim (backend)
```

### AWS Services
```yaml
Bedrock Models:
  - amazon.titan-embed-text-v1 (embeddings, 1536-dim)
  - anthropic.claude-3-haiku-20240307-v1:0 (chat)
S3: File storage
SQS: Message queue
RDS: MySQL database (or local MySQL)
IAM: Access credentials
```

---

## 🚀 Deployment Architecture

### Docker Compose Setup

**File**: `docker-compose.yml`

```yaml
version: '3.9'
services:
  # Vector database
  qdrant:
    image: qdrant/qdrant:latest
    container_name: qdrant
    ports:
      - 6333:6333  # REST API
      - 6334:6334  # gRPC
    volumes:
      - ./qdrant_data:/qdrant/storage
    environment:
      QDRANT__LOG_LEVEL: INFO

  # Upload service
  mnma-upload:
    build: ./mnma-upload
    ports:
      - 8001:8000
    volumes:
      - ./mnma-upload:/usr/src/app
    env_file:
      - .env
    environment:
      - PYTHONUNBUFFERED=TRUE
      - AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
      - AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
      # ... (all env vars)
    depends_on:
      - qdrant

  # Indexing service
  mnma-index:
    build: ./mnma-index
    ports:
      - 8002:8000
    volumes:
      - ./mnma-index:/usr/src/app
    env_file:
      - .env
    environment:
      - PYTHONUNBUFFERED=TRUE
      # ... (all env vars)
    depends_on:
      - mnma-upload
      - qdrant

  # Chat service
  mnma-chat:
    build: ./mnma-chat
    ports:
      - 8003:8000
    volumes:
      - ./mnma-chat:/usr/src/app
    env_file:
      - .env
    environment:
      - PYTHONUNBUFFERED=TRUE
      # ... (all env vars)
    depends_on:
      - qdrant

  # React UI (optional)
  mnma-ui:
    build: ./mnma-ui
    ports:
      - 3000:3000
    depends_on:
      - mnma-upload
      - mnma-chat
      - qdrant

  # Admin UI (production-ready)
  documindai-admin:
    build: ./documindai-admin
    ports:
      - 3001:80
    depends_on:
      - mnma-upload
      - mnma-chat
      - qdrant
```

**Deployment Commands**:
```bash
# Build all services
docker compose build

# Start all services
docker compose up -d

# View logs
docker compose logs -f

# Stop all services
docker compose down

# Rebuild specific service
docker compose build mnma-upload
docker compose up -d mnma-upload
```

**Service URLs** (after deployment):
```
Qdrant Dashboard:   http://localhost:6333/dashboard
Upload API Docs:    http://localhost:8001/docs
Index API Docs:     http://localhost:8002/docs
Chat API Docs:      http://localhost:8003/docs
React UI:           http://localhost:3000
Admin UI:           http://localhost:3001  ← Production admin interface
Test UI:            file:///.../test-ui.html
```

---

## 📊 Data Flow

### 1. **File Upload Flow**

```
┌─────────────┐
│   Client    │
│  (Browser)  │
└──────┬──────┘
       │
       │ 1. POST /upload_file/{user_id}
       │    (multipart/form-data)
       ▼
┌──────────────┐
│ mnma-upload  │
│  FastAPI     │
└──────┬───────┘
       │
       ├─ 2. Save to S3: uploads/{user_id}/{file_id}.pdf
       │     ▼
       │  ┌────────┐
       │  │ AWS S3 │
       │  └────────┘
       │
       ├─ 3. Register in MySQL: INSERT INTO files (...)
       │     ▼
       │  ┌────────┐
       │  │ MySQL  │
       │  └────────┘
       │
       ├─ 4. Send SQS message: {user_id, file_id, s3_path}
       │     ▼
       │  ┌────────┐
       │  │AWS SQS │
       │  └────────┘
       │
       └─ 5. Return JSON response
          ▼
       ┌─────────────┐
       │   Client    │
       │  (Success)  │
       └─────────────┘
```

---

### 2. **Document Indexing Flow**

```
┌──────────────┐
│ mnma-index   │
│  (SQS Poll)  │
└──────┬───────┘
       │
       │ 1. Long poll SQS (20s wait, batch 10)
       │
       ▼
    ┌────────┐
    │AWS SQS │
    └────┬───┘
         │
         │ 2. Receive messages: [{user_id, file_id, s3_path}, ...]
         │
         ▼
    ┌──────────────┐
    │ mnma-index   │
    │  Processor   │
    └──────┬───────┘
           │
           ├─ 3. Download file from S3
           │     ▼
           │  ┌────────┐
           │  │ AWS S3 │
           │  └────────┘
           │
           ├─ 4. Load document (PDF/TXT/DOCX)
           │     UnstructuredFileLoader
           │
           ├─ 5. Chunk text
           │     RecursiveCharacterTextSplitter
           │     (chunk_size=1000, overlap=200)
           │
           ├─ 6. Generate embeddings
           │     AWS Bedrock Titan
           │     ▼
           │  ┌──────────────┐
           │  │ AWS Bedrock  │
           │  │ Titan Embed  │
           │  └──────────────┘
           │     Returns: 1536-dim vectors
           │
           ├─ 7. Store in Qdrant
           │     Collection: {user_id}
           │     ▼
           │  ┌────────┐
           │  │ Qdrant │
           │  └────────┘
           │
           ├─ 8. Update MySQL status: "indexed"
           │     ▼
           │  ┌────────┐
           │  │ MySQL  │
           │  └────────┘
           │
           └─ 9. Delete SQS message (acknowledge)
              ▼
           ┌────────┐
           │AWS SQS │
           └────────┘
```

---

### 3. **Chat/RAG Flow**

```
┌─────────────┐
│   Client    │
│  (Browser)  │
└──────┬──────┘
       │
       │ 1. WebSocket connect:
       │    ws://.../{user_id}/{conv_id}/{file_ids}
       │
       ▼
┌──────────────┐
│  mnma-chat   │
│  WebSocket   │
└──────┬───────┘
       │
       │ 2. Send question: {"type": "question", "content": "..."}
       │
       ▼
┌──────────────┐
│ Chat Queue   │
│  (async)     │
└──────┬───────┘
       │
       ├─ 3. Embed question
       │     AWS Bedrock Titan
       │     ▼
       │  ┌──────────────┐
       │  │ AWS Bedrock  │
       │  │ Titan Embed  │
       │  └──────────────┘
       │     Returns: 1536-dim vector
       │
       ├─ 4. Search Qdrant
       │     collection={user_id}, top_k=5, threshold=0.7
       │     ▼
       │  ┌────────┐
       │  │ Qdrant │
       │  └────┬───┘
       │       │
       │       └─ Returns: Top 5 similar chunks with scores
       │
       ├─ 5. Build RAG prompt:
       │     Context: [chunk1, chunk2, ...]
       │     Question: "..."
       │
       ├─ 6. Query Claude 3 Haiku
       │     AWS Bedrock Claude
       │     ▼
       │  ┌──────────────┐
       │  │ AWS Bedrock  │
       │  │ Claude Haiku │
       │  └──────────────┘
       │     Streams: answer chunks
       │
       └─ 7. Stream answer to client
          ▼
       ┌─────────────┐
       │   Client    │
       │  (Display)  │
       └─────────────┘
          Real-time streaming response
```

---

## 📈 System Characteristics

### Performance Metrics
```yaml
File Upload:
  - Small files (<1MB): ~200ms
  - Large files (>10MB): ~2-5 seconds
  - Network dependent

Document Indexing:
  - Text file (1000 words): ~10 seconds
  - PDF (10 pages): ~30 seconds
  - Processing: Download + Parse + Chunk + Embed + Store

Vector Search:
  - Query time: <100ms
  - Collection size: 1000 vectors
  - Top-K=5 retrieval

Chat Response:
  - Time to first token: ~500ms
  - Streaming: Real-time chunks
  - Full response (200 words): ~3-5 seconds

Concurrent Users:
  - Upload service: ~50 concurrent uploads
  - Chat service: ~100 concurrent WebSocket connections
  - Qdrant: ~1000 queries/second
```

### Scalability Considerations
```yaml
Horizontal Scaling:
  - Multiple mnma-upload instances (load balancer)
  - Multiple mnma-index workers (SQS consumers)
  - Multiple mnma-chat instances (sticky sessions)

Vertical Scaling:
  - Qdrant memory: 16GB+ for 1M vectors
  - MySQL connections: Pool size 20-50
  - AWS Bedrock: Rate limits (throttling)

Storage:
  - S3: Unlimited (pay-per-use)
  - Qdrant: RAM + disk (persistent)
  - MySQL: 100GB+ for metadata
```

### Security Features
```yaml
Authentication:
  - Basic user ID (current)
  - Future: JWT tokens, OAuth2

Authorization:
  - User-specific collections in Qdrant
  - S3 folder isolation by user_id
  - MySQL row-level user_id filtering

Data Encryption:
  - S3: Server-side encryption (SSE)
  - MySQL: TLS connections
  - Bedrock: In-transit encryption

CORS:
  - Enabled for development (*), 
  - Production: Restrict to specific origins
```

---

## 🎓 Summary

### System Highlights

1. **Modular Microservices**: Three independent FastAPI services (upload, index, chat) with clear separation of concerns

2. **Async Processing**: SQS-based job queue enables decoupled, scalable document indexing without blocking user uploads

3. **AI-Powered**: AWS Bedrock Titan for embeddings + Claude for chat = production-ready, managed AI infrastructure

4. **Triple UI Strategy**: 
   - **Admin UI** (documindai-admin): Production-ready Material-UI interface with advanced features
   - **React UI** (mnma-ui): Professional chat-focused interface
   - **Test UI**: Simple HTML for quick testing

5. **Vector Search**: Qdrant provides fast, accurate semantic search over document embeddings

6. **Real-time Chat**: WebSocket protocol enables streaming AI responses with source attribution

7. **Cloud-Native**: Docker Compose for local dev, AWS services (S3, SQS, Bedrock, RDS) for production deployment

8. **Type Safety**: TypeScript in React UI catches errors at compile time, Python type hints in backend

9. **Observability**: Structured logging, health checks, FastAPI auto-docs for each service

10. **Extensibility**: Clear architecture makes it easy to add features (auth, multi-tenancy, analytics, etc.)

### Key Features Added (April 2026)

- ✅ **Tabbed File Intake**: Separate upload and document management workflows
- ✅ **Processing Pipeline Visualization**: Real-time status tracking across upload → processing → indexed stages
- ✅ **Bulk Operations**: Multi-select and bulk delete functionality
- ✅ **Source Attribution**: Chat responses show which documents contributed to answers
- ✅ **Grid View Management**: Card-based document layout with rich metadata display
- ✅ **Auto-refresh**: Automatic status updates every 2-5 seconds
- ✅ **MySQL Optimization**: Added autocommit to prevent query caching
- ✅ **Reindexing Fix**: Eliminated duplicate processing with check-and-update atomicity

---

**Document Version**: 2.0  
**Last Updated**: April 10, 2026  
**Status**: Production-Ready (Backend + Admin UI), Testing (React UI)

