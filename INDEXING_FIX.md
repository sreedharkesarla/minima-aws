# File Indexing Fix - April 8, 2026

## Problem Identified

**Issue**: Files were uploaded successfully but not being indexed into Qdrant, leaving them stuck in "uploaded" status.

**Root Cause**: The SQS message processing had a critical bug:
1. Messages were deleted from SQS **immediately** after being received
2. File indexing happened **asynchronously** after message deletion
3. When indexing failed, the message was already gone and couldn't be retried

## What Was Fixed

### 1. **Message Deletion Timing** (`documindai-index/app.py`)
- **Before**: Deleted message immediately after enqueueing
- **After**: Message metadata (receipt handle) is passed through the processing pipeline
- **Result**: Message only deleted after successful indexing

### 2. **Async Processing** (`documindai-index/async_loop.py`)
- **Before**: Used `run_in_executor()` without awaiting (fire-and-forget)
- **After**: Properly awaits executor result before deleting SQS message
- **Result**: Indexing completes before message is removed from queue

### 3. **SQS Visibility Timeout** (`documindai-index/sqs.py`)
- **Before**: 30 seconds (too short for large PDFs)
- **After**: 900 seconds (15 minutes)
- **Result**: Large PDF processing with Textract has enough time to complete

## How the System Works Now

### Collection Naming
- Each user gets their own Qdrant collection named after their `user_id`
- Example: User "admin" → Collection "admin"
- The `QDRANT_COLLECTION` env var is not used (per-user isolation)

### Indexing Flow
1. File uploaded → Saved to S3 → Status: "uploaded"
2. Message sent to SQS queue
3. Index service receives message (becomes invisible for 15 min)
4. PDF processed with AWS Textract → Chunks created → Embeddings generated
5. Vectors added to user's Qdrant collection
6. File status updated to "indexed"
7. **Only then** message deleted from SQS

### Failure Recovery
- If indexing fails, message stays in SQS
- After visibility timeout (15 min), message becomes visible again
- Automatic retry on next poll

## Testing the Fix

### Steps to Re-index Your File

1. **Delete the existing file** (currently stuck in "uploaded" status):
   - Go to http://localhost:3001/intake
   - Delete: `PeopleFluent_SUITE_26.04_Control_Data_Guide.pdf`

2. **Re-upload the file**:
   - Select document type: "Control_Data_Guide"
   - Upload the same PDF file
   - Wait for upload to complete

3. **Monitor indexing** (give it 1-2 minutes for large PDFs):
   ```powershell
   # Check indexing logs
   docker logs documindai-documindai-index-1 --tail 50 -f
   
   # Check file status
   docker exec documindai-mysql mysql -uroot -proot123 documindai_db -e "SELECT file_id, user_id, LEFT(file_name, 40) as file, status FROM peakdefence ORDER BY id DESC LIMIT 3;"
   
   # Check Qdrant collection
   curl -s http://localhost:6333/collections/admin | ConvertFrom-Json | Select-Object -ExpandProperty result | Select-Object points_count, status
   ```

4. **Verify success**:
   - File status should change to "indexed"
   - Qdrant collection "admin" should show `points_count > 0`
   - You should be able to ask questions about the file in the Chat tab

## Expected Behavior

### Successful Indexing Logs
```
INFO:app:Message received: {...}
INFO:async_loop:Processing message: {...}
INFO:indexer:Extracting text from file: TM/PeopleFluent_SUITE_26.04_Control_Data_Guide.pdf
INFO:indexer:PDF file: s3://product-genius-files/TM/PeopleFluent_SUITE_26.04_Control_Data_Guide.pdf
INFO:indexer:Documents loaded: 123
INFO:indexer:Inserting into vector storage: TM/PeopleFluent_SUITE_26.04_Control_Data_Guide.pdf
INFO:indexer:updated status for file_id 91afdaaf-1b8c-43ad-94e6-8cbf8d6e2452
INFO:async_loop:Successfully processed and deleted message from SQS
```

### Qdrant Dashboard
- URL: http://localhost:6333/dashboard
- Collection: `admin`
- Should show vectors with metadata: `file_id`, `user_id`, `source`

## Technical Details

### Code Changes

#### app.py
```python
# Now passes receipt handle through the pipeline
message_data = {
    'body': message['Body'],
    'receipt_handle': message['ReceiptHandle'],
    'queue_name': queue_name
}
async_queue.enqueue(message_data)
```

#### async_loop.py
```python
# Awaits indexing completion
await loop_obj.run_in_executor(executor, indexer.index_file, parsed)

# Only deletes after success
if receipt_handle and queue_name:
    sqs.delete_message(queue_name, receipt_handle)
```

## Troubleshooting

### If file stays in "uploaded" status after 15+ minutes:
1. Check index service logs for errors
2. Verify AWS credentials are valid
3. Ensure Textract service is accessible
4. Check S3 bucket permissions

### If indexing seems slow:
- Large PDFs (100+ pages) can take 5-10 minutes
- Textract processes pages sequentially
- First-time embedding model load adds 30-60 seconds

### If collection shows 0 points but status is "indexed":
- This indicates a data inconsistency
- Check logs for partial failures
- May need to re-upload the file

## Additional Notes

- All services have been rebuilt and restarted with the fix
- The visibility timeout gives ample time for large document processing
- Failed messages will automatically retry (up to SQS retention period of 4 days)
- Monitor logs during first few uploads to confirm stable operation
