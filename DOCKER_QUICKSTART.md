# Minima AWS - Docker Services Quick Reference

## 🚀 Quick Start Commands

### Check if builds are complete
```powershell
docker images | Select-String "minima"
```

### Start UI services (after build completes)
```powershell
docker compose up -d minima-admin minima-chat-widget
```

### Or use the automated script
```cmd
check-and-start.bat
```

## 📊 Service URLs

Once running:
- **Admin Console:** http://localhost:3001
- **Chat Widget:** http://localhost:3002
- **Upload API:** http://localhost:8001
- **Index API:** http://localhost:8002
- **Chat API:** http://localhost:8003
- **Qdrant:** http://localhost:6333

## 🔍 Status Checks

### View all running containers
```powershell
docker compose ps
```

### View logs
```powershell
# All services
docker compose logs -f

# Specific service
docker compose logs -f minima-admin
docker compose logs -f minima-chat-widget
```

### Check service health
```powershell
docker inspect minima-aws-minima-admin-1 | Select-String "Health"
docker inspect minima-aws-minima-chat-widget-1 | Select-String "Health"
```

## 🛠️ Management Commands

### Stop services
```powershell
docker compose stop minima-admin minima-chat-widget
```

### Restart services
```powershell
docker compose restart minima-admin minima-chat-widget
```

### Rebuild and restart
```powershell
docker compose up -d --build minima-admin
docker compose up -d --build minima-chat-widget
```

### Stop all services
```powershell
docker compose down
```

### Remove containers and start fresh
```powershell
docker compose down
docker compose up -d
```

## 📁 Project Structure

```
minima-aws/
├── docker-compose.yml          # Service orchestration
├── start-docker-uis.bat        # Build both UIs
├── check-and-start.bat         # Check build & start
├── DOCKER_DEPLOYMENT.md        # Full deployment guide
├── BUILD_STATUS.md             # Build progress info
│
├── minima-admin/               # Admin console
│   ├── Dockerfile              # Multi-stage build
│   ├── nginx.conf              # Nginx config
│   ├── .dockerignore           # Build exclusions
│   └── src/                    # React app source
│
├── minima-chat-widget/         # Chat widget
│   ├── Dockerfile              # Multi-stage build
│   ├── nginx.conf              # Nginx config
│   ├── .dockerignore           # Build exclusions
│   └── src/                    # Web Component source
│
└── Backend services...
    ├── mnma-upload/
    ├── mnma-index/
    └── mnma-chat/
```

## 🐛 Troubleshooting

### Build fails
```powershell
# Clear Docker cache and rebuild
docker compose build --no-cache minima-admin
docker compose build --no-cache minima-chat-widget
```

### Port already in use
```powershell
# Find what's using the port
netstat -ano | findstr :3001

# Kill the process
taskkill /F /PID <process_id>

# Or change port in docker-compose.yml
```

### Service won't start
```powershell
# Check logs for errors
docker compose logs minima-admin

# Restart the service
docker compose restart minima-admin
```

### Can't access UI
```powershell
# Ensure service is running
docker compose ps | Select-String minima

# Check if port is accessible
Test-NetConnection -ComputerName localhost -Port 3001

# Try accessing health endpoint
curl http://localhost:3001
```

### Need to rebuild
```powershell
# Remove old container and image
docker compose down minima-admin
docker rmi minima-aws-minima-admin

# Rebuild and start
docker compose up -d --build minima-admin
```

## 📚 Documentation

- **[DOCKER_DEPLOYMENT.md](DOCKER_DEPLOYMENT.md)** - Complete deployment guide
- **[BUILD_STATUS.md](BUILD_STATUS.md)** - Build progress details
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System architecture
- **[UI_IMPLEMENTATION.md](UI_IMPLEMENTATION.md)** - UI documentation
- **[QUICK_ACCESS_GUIDE.md](QUICK_ACCESS_GUIDE.md)** - Access troubleshooting
- **[TEST_REPORT.md](TEST_REPORT.md)** - System test results

## ⚡ Performance Tips

### View resource usage
```powershell
docker stats minima-admin minima-chat-widget
```

### Limit resources
Edit `docker-compose.yml` and add:
```yaml
minima-admin:
  deploy:
    resources:
      limits:
        cpus: '0.5'
        memory: 512M
```

### Clean up unused resources
```powershell
# Remove stopped containers
docker container prune

# Remove unused images
docker image prune

# Remove everything unused
docker system prune -a
```

## 🔄 Updates

### Update code and rebuild
```powershell
git pull
docker compose up -d --build minima-admin minima-chat-widget
```

### Update single service
```powershell
docker compose up -d --build minima-admin
```

## 🎯 Next Steps

1. **Wait for builds to complete** (~5-10 minutes)
2. **Run:** `check-and-start.bat` or `docker compose up -d minima-admin minima-chat-widget`
3. **Access:** http://localhost:3001
4. **Enjoy your Dockerized UI!** 🎉

---

**Created:** April 7, 2026  
**Docker Compose Version:** 3.9  
**Services:** 7 total (4 backend + 3 UI)
