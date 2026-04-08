# Delete Functionality Fix - April 8, 2026

## Problem Identified

**Issue**: When deleting files through the UI, only the database record was removed. Files remained in:
- ✗ AWS S3 bucket (wasting storage and incurring costs)
- ✗ Qdrant vector database (polluting search results)
- ✓ MySQL database (only this was deleted)

## Root Cause

The `delete_document()` function in `aws_rds_helper.py` only executed a SQL DELETE query without cleaning up:
1. The actual file in S3
2. The indexed vectors in Qdrant

This led to "orphaned" files that couldn't be accessed but still consumed resources.

## What Was Fixed

### Code Changes

**File: `documindai-upload/aws_rds_helper.py`**

#### 1. Added Required Imports
```python
from aws_s3_helper import AwsS3Helper
from qdrant_client import QdrantClient
```

#### 2. Rewrote `delete_document()` Function
The function now performs a **3-step cleanup**:

**Step 1: Fetch File Records**
```python
# Get file_id and file_name (S3 path) from database
fetch_query = "SELECT file_id, file_name FROM peakdefence WHERE file_id IN (%s) AND user_id = %s"
```

**Step 2: Delete from S3**
```python
AwsS3Helper.delete_file(file_name, bucket)
logger.info(f"Deleted from S3: {file_name}")
```

**Step 3: Delete from Qdrant**
```python
# Delete all vectors with matching file_id
qdrant_client.delete(
    collection_name=user_id,
    points_selector={
        "filter": {
            "must": [
                {"key": "metadata.file_id", "match": {"value": file_id}}
            ]
        }
    }
)
```

**Step 4: Delete from Database**
```python
delete_query = "DELETE FROM peakdefence WHERE file_id IN (%s) AND user_id = %s"
self.cursor.execute(delete_query, params)
self.connection.commit()
```

#### 3. Added Dependency
**File: `documindai-upload/requirements.txt`**
```python
qdrant-client
```

## How It Works Now

### Complete Cleanup Workflow

```
User clicks "Delete" in UI
         ↓
Frontend calls: POST /upload/remove_file/
         ↓
Backend delete_document() executes:
         ↓
    ┌────────────────────────────────┐
    │  1. Query database for files   │
    └────────────────────────────────┘
         ↓
    ┌────────────────────────────────┐
    │  2. Delete from S3             │
    │     - Removes actual file      │
    └────────────────────────────────┘
         ↓
    ┌────────────────────────────────┐
    │  3. Delete from Qdrant         │
    │     - Removes all vectors      │
    │     - Filters by file_id       │
    └────────────────────────────────┘
         ↓
    ┌────────────────────────────────┐
    │  4. Delete from MySQL          │
    │     - Removes metadata record  │
    └────────────────────────────────┘
         ↓
    Return success message
```

### Error Handling

Each deletion step has independent error handling:
- S3 deletion failure: **Logged but continues**
- Qdrant deletion failure: **Logged but continues**
- Database deletion: **Only fails if critical error**

This ensures partial cleanup is better than no cleanup.

## Testing the Fix

### 1. Upload a Test File

```powershell
# Go to UI
http://localhost:3001/intake

# Upload a small PDF
# Document type: "Control_Data_Guide"
```

### 2. Verify Indexing

```powershell
# Check file status (should be 'indexed')
docker exec documindai-mysql mysql -uroot -proot123 documindai_db -e "SELECT file_id, user_id, file_name, status FROM peakdefence WHERE user_id='admin';"

# Check S3 (file should exist)
aws s3 ls s3://product-genius-files/TM/

# Check Qdrant (should have vectors)
curl -s http://localhost:6333/collections/admin | ConvertFrom-Json | Select-Object -ExpandProperty result | Select-Object points_count
```

### 3. Delete the File

```
Click the trash icon next to the file in the UI
```

### 4. Verify Complete Deletion

```powershell
# ✓ Database - File should be GONE
docker exec documindai-mysql mysql -uroot -proot123 documindai_db -e "SELECT * FROM peakdefence WHERE user_id='admin';"

# ✓ S3 - File should be GONE
aws s3 ls s3://product-genius-files/TM/

# ✓ Qdrant - Vector count should DECREASE
curl -s http://localhost:6333/collections/admin | ConvertFrom-Json | Select-Object -ExpandProperty result | Select-Object points_count
```

### Expected Results

**BEFORE Delete:**
- Database: 1 record
- S3: 1 file
- Qdrant: X vectors (e.g., 150 for a 10-page PDF)

**AFTER Delete:**
- Database: 0 records ✓
- S3: 0 files ✓
- Qdrant: 0 vectors (or X - Y if multiple files) ✓

## Detailed Logs

### Successful Deletion Logs

```
INFO:aws_rds_helper:Fetched 1 file records for deletion
INFO:aws_rds_helper:Deleted from S3: TM/test_document.pdf
INFO:aws_rds_helper:Deleted from Qdrant collection 'admin': file_id=abc-123-def
INFO:aws_rds_helper:Successfully deleted 1 documents
INFO:aws_rds_helper:Documents deleted: file_ids=['abc-123-def'], user_id=admin
```

### Check Upload Service Logs

```powershell
docker logs documindai-documindai-upload-1 --tail 50 -f
```

Look for lines like:
- `Deleted from S3: TM/filename.pdf`
- `Deleted from Qdrant collection 'admin': file_id=...`
- `Successfully deleted X documents`

## Benefits

### Cost Savings
- No more orphaned S3 files accumulating storage charges
- Qdrant collection stays clean and efficient

### Data Integrity
- Database, S3, and Qdrant stay synchronized
- No confusion about which files are "actually" available

### Search Accuracy
- Deleted files no longer appear in chat/search results
- Qdrant queries only return valid documents

## Troubleshooting

### If Delete Fails

**Check logs for specific error:**
```powershell
docker logs documindai-documindai-upload-1 --tail 100 | Select-String -Pattern "delete|error" -Context 2
```

**Common Issues:**

1. **S3 Permission Error**
   - Error: `AccessDenied` or `Forbidden`
   - Fix: Verify AWS credentials have `s3:DeleteObject` permission

2. **Qdrant Connection Error**
   - Error: `Connection refused` or `Collection doesn't exist`
   - Fix: Ensure Qdrant service is running (`docker ps | grep qdrant`)

3. **Database Error**
   - Error: `cursor closed` or `connection lost`
   - Fix: Service will auto-reconnect on next request

### Manual Cleanup (If Needed)

If delete failed partially, you can manually clean up:

```powershell
# 1. Find orphaned files
docker exec documindai-mysql mysql -uroot -proot123 documindai_db -e "SELECT file_id, file_name FROM peakdefence WHERE user_id='admin';"

# 2. Delete from S3 manually
aws s3 rm s3://product-genius-files/TM/filename.pdf

# 3. Delete from Qdrant manually
curl -X POST http://localhost:6333/collections/admin/points/delete \
  -H "Content-Type: application/json" \
  -d '{"filter":{"must":[{"key":"metadata.file_id","match":{"value":"YOUR_FILE_ID"}}]}}'

# 4. Delete from database manually
docker exec documindai-mysql mysql -uroot -proot123 documindai_db -e "DELETE FROM peakdefence WHERE file_id='YOUR_FILE_ID';"
```

## Summary

**Fixed Services:**
- ✓ Upload service rebuilt with qdrant-client dependency
- ✓ Delete function now removes from S3, Qdrant, and MySQL
- ✓ Comprehensive error handling and logging
- ✓ Service tested and running

**Verification Commands:**
```powershell
# Quick test
1. Upload file → Delete file → Check all 3 systems

# Deep verification
docker logs documindai-documindai-upload-1 --tail 20
```

The delete functionality is now **production-ready** with complete cleanup across all storage systems.
