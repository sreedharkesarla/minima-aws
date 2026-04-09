# Quick Reference - Common Commands

## 🚀 Quick Access
- **Admin UI:** http://localhost:3001
- **Login:** admin / Admin@123
- **Test Users:** test, operator1, viewer1 (password: Test@123)

## 🔧 Service Management

### View All Services
```powershell
docker-compose ps
```

### Restart Specific Service
```powershell
docker-compose restart documindai-upload
docker-compose restart documindai-index
docker-compose restart documindai-chat
docker-compose restart documindai-admin
```

### View Service Logs
```powershell
docker logs -f documindai-documindai-upload-1
docker logs -f documindai-documindai-index-1
docker logs -f documindai-documindai-chat-1
docker logs -f documindai-documindai-admin-1
```

### Rebuild Service
```powershell
docker-compose build documindai-upload
docker-compose build documindai-index
docker-compose build documindai-chat
docker-compose build documindai-admin
```

### Restart All Services
```powershell
docker-compose up -d
```

## 🗄️ Database Commands

### Access MySQL
```powershell
docker exec -it documindai-mysql mysql -uroot -proot123 documindai_db
```

### Quick Data Checks
```powershell
# Count users
docker exec documindai-mysql mysql -uroot -proot123 documindai_db -e "SELECT COUNT(*) FROM users;" -t

# Count files
docker exec documindai-mysql mysql -uroot -proot123 documindai_db -e "SELECT COUNT(*) FROM peakdefence;" -t

# Count token usage
docker exec documindai-mysql mysql -uroot -proot123 documindai_db -e "SELECT COUNT(*) FROM token_usage;" -t

# Recent API logs
docker exec documindai-mysql mysql -uroot -proot123 documindai_db -e "SELECT * FROM api_request_logs ORDER BY created_at DESC LIMIT 10;" -t
```

### Backup Database
```powershell
docker exec documindai-mysql mysqldump -uroot -proot123 documindai_db > backup_$(Get-Date -Format "yyyyMMdd_HHmmss").sql
```

### Restore Database
```powershell
Get-Content backup_YYYYMMDD_HHMMSS.sql | docker exec -i documindai-mysql mysql -uroot -proot123 documindai_db
```

## 📊 System Health Checks

### Quick Health Check
```powershell
# All services
docker-compose ps

# Database health
docker exec documindai-mysql mysql -uroot -proot123 -e "SELECT 1;" 2>&1

# Qdrant health
Invoke-WebRequest -Uri "http://localhost:6333" -UseBasicParsing

# Upload API health
Invoke-WebRequest -Uri "http://localhost:8001/upload/health/system" -UseBasicParsing

# Admin UI health
Invoke-WebRequest -Uri "http://localhost:3001" -UseBasicParsing
```

### Check API Endpoints
```powershell
# Users
Invoke-WebRequest -Uri "http://localhost:3001/api/upload/users" -UseBasicParsing | ConvertFrom-Json

# Roles
Invoke-WebRequest -Uri "http://localhost:3001/api/upload/roles" -UseBasicParsing | ConvertFrom-Json

# Files
Invoke-WebRequest -Uri "http://localhost:3001/api/upload/get_files/admin" -UseBasicParsing | ConvertFrom-Json

# Logs
Invoke-WebRequest -Uri "http://localhost:3001/api/upload/logs/api-requests?limit=10" -UseBasicParsing | ConvertFrom-Json
```

## 🔍 Troubleshooting

### Service Not Starting
```powershell
# Check logs
docker logs documindai-documindai-upload-1 --tail 50

# Rebuild and restart
docker-compose build documindai-upload
docker-compose up -d documindai-upload
```

### Database Connection Issues
```powershell
# Check MySQL is running
docker ps | Select-String "mysql"

# Check connection
docker exec documindai-mysql mysql -uroot -proot123 -e "SELECT 1;"

# Restart MySQL
docker-compose restart mysql
```

### Clear All Data and Fresh Start
```powershell
# WARNING: This deletes all data
docker-compose down
docker volume prune
Get-Content init_admin_db.sql | docker exec -i documindai-mysql mysql -uroot -proot123 documindai_db
docker-compose up -d
```

## 📈 Monitoring

### Watch Logs in Real-time
```powershell
# All services (separate windows)
docker logs -f documindai-documindai-upload-1
docker logs -f documindai-documindai-index-1
docker logs -f documindai-documindai-chat-1
```

### Monitor API Requests
```powershell
# Watch last 20 API requests
while ($true) {
    docker exec documindai-mysql mysql -uroot -proot123 documindai_db -e "SELECT service, method, path, status_code, duration_ms, created_at FROM api_request_logs ORDER BY created_at DESC LIMIT 20;" -t
    Start-Sleep -Seconds 5
}
```

### Check Token Usage
```powershell
docker exec documindai-mysql mysql -uroot -proot123 documindai_db -e "SELECT operation_type, COUNT(*) as operations, SUM(total_tokens) as tokens, SUM(total_cost) as cost_usd FROM token_usage GROUP BY operation_type;" -t
```

## 🎯 Common Tasks

### Add New User
```powershell
# Via Admin UI: http://localhost:3001/users
# Or via SQL:
docker exec documindai-mysql mysql -uroot -proot123 documindai_db -e "
INSERT INTO users (user_id, username, password_hash, email, full_name, is_active) 
VALUES ('newuser', 'newuser', '$2b$12$hashed_password', 'new@example.com', 'New User', TRUE);
"
```

### Upload File
- Via Admin UI: http://localhost:3001/intake
- Or via API: POST to http://localhost:8001/upload/upload_files/

### View Logs
- Via Admin UI: http://localhost:3001/logs
- Or via SQL queries (see Database Commands above)

## 📁 Important Files

- **Database Schema:** `init_admin_db.sql`
- **Token Tracking:** `create_usage_tracking.sql`
- **Docker Config:** `docker-compose.yml`
- **Upload Service:** `documindai-upload/app.py`
- **Index Service:** `documindai-index/app.py`
- **Chat Service:** `documindai-chat/app.py`
- **Admin UI:** `documindai-admin/src/`
- **Logs Documentation:** `LOGGING_QUICKSTART.md`
- **System Report:** `SYSTEM_DIAGNOSTIC_REPORT.md`

## 🆘 Emergency Commands

### Stop Everything
```powershell
docker-compose down
```

### Start Everything
```powershell
docker-compose up -d
```

### Reset Qdrant
```powershell
docker-compose down
docker volume rm documindai_qdrant_data
docker-compose up -d
```

### View All Volumes
```powershell
docker volume ls
```

---

For detailed troubleshooting, see:
- `SYSTEM_DIAGNOSTIC_REPORT.md` - Recent diagnostic results
- `LOGGING_QUICKSTART.md` - Logging system documentation
- Docker logs: `docker logs <container_name>`
