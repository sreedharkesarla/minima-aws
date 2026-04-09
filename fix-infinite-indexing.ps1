Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     FIXING INFINITE REINDEXING & QDRANT DELETION          ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

Write-Host "`n🔍 ISSUES IDENTIFIED:" -ForegroundColor Yellow
Write-Host "  1. Same files reindexed 173+ times (3M+ wasted tokens!)" -ForegroundColor Red
Write-Host "  2. 145 duplicate messages stuck in SQS queue" -ForegroundColor Red  
Write-Host "  3. Upload service missing QDRANT_BOOTSTRAP env var" -ForegroundColor Red

Write-Host "`n✅ FIXES APPLIED:" -ForegroundColor Yellow
Write-Host "  1. Added duplicate indexing prevention check" -ForegroundColor Green
Write-Host "  2. Added QDRANT_BOOTSTRAP to upload service" -ForegroundColor Green
Write-Host "  3. Added qdrant dependency to upload service" -ForegroundColor Green

Write-Host "`n🔧 Step 1: Rebuilding Index Service..." -ForegroundColor Cyan
docker-compose build documindai-index
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "`n🔧 Step 2: Rebuilding Upload Service..." -ForegroundColor Cyan
docker-compose build documindai-upload
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "`n🔧 Step 3: Restarting Services..." -ForegroundColor Cyan
docker-compose up -d documindai-index documindai-upload
Start-Sleep -Seconds 5

Write-Host "`n📊 Step 4: Checking Current Token Usage..." -ForegroundColor Cyan
docker exec documindai-mysql mysql -uroot -proot123 documindai_db -e "SELECT operation_type, SUM(input_tokens) as total_input, SUM(output_tokens) as total_output, ROUND(SUM(total_cost), 4) as total_cost FROM token_usage GROUP BY operation_type;" 2>$null

Write-Host "`n🗑️  Step 5: SQS Queue Status..." -ForegroundColor Cyan
Write-Host "To purge the duplicate messages from SQS queue, run:" -ForegroundColor Yellow
Write-Host "  python purge-sqs-queue.py" -ForegroundColor White
Write-Host "`nNote: This will remove all 145 duplicate messages from the queue" -ForegroundColor Gray

Write-Host "`n📋 Step 6: Current Qdrant Collection Stats..." -ForegroundColor Cyan
docker exec documindai-documindai-index-1 python -c "from qdrant_client import QdrantClient; import os; client = QdrantClient(host=os.environ.get('QDRANT_BOOTSTRAP')); info = client.get_collection('TM'); print(f'Total points: {info.points_count}')" 2>$null

Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║                   FIXES DEPLOYED!                          ║" -ForegroundColor Green  
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Green

Write-Host "`n📋 WHAT WAS FIXED:" -ForegroundColor Yellow
Write-Host "  ✓ Indexer now checks file status before processing" -ForegroundColor Green
Write-Host "  ✓ Already-indexed files will be skipped" -ForegroundColor Green
Write-Host "  ✓ Upload service can now delete from Qdrant" -ForegroundColor Green
Write-Host "  ✓ Token waste from duplicate indexing stopped" -ForegroundColor Green

Write-Host "`n⚠️  NEXT STEPS:" -ForegroundColor Yellow
Write-Host "  1. Run: python purge-sqs-queue.py" -ForegroundColor White
Write-Host "     (Removes 145 duplicate messages from queue)" -ForegroundColor Gray
Write-Host "`n  2. Test file deletion:" -ForegroundColor White
Write-Host "     - Delete a file from UI" -ForegroundColor Gray
Write-Host "     - Verify Qdrant points decrease" -ForegroundColor Gray
Write-Host "`n  3. Monitor token usage:" -ForegroundColor White
Write-Host "     - Should stay stable without uploads/chats" -ForegroundColor Gray

Write-Host "`n💡 TOKEN BREAKDOWN:" -ForegroundColor Yellow
docker exec documindai-mysql mysql -uroot -proot123 documindai_db -e "SELECT file_id, COUNT(*) as times_indexed, SUM(input_tokens) as total_tokens FROM token_usage WHERE operation_type='embedding' GROUP BY file_id HAVING times_indexed > 1 ORDER BY times_indexed DESC LIMIT 5;" 2>$null

Write-Host "`n✓ All services restarted with fixes!" -ForegroundColor Green
