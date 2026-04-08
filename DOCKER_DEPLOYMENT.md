# Docker Deployment Guide

## Services Overview

| Service | Port | URL | Description |
|---------|------|-----|-------------|
| mnma-upload | 8001 | http://localhost:8001 | File upload API |
| mnma-index | 8002 | http://localhost:8002 | Document indexing service |
| mnma-chat | 8003 | http://localhost:8003 | RAG chat API |
| qdrant | 6333 | http://localhost:6333 | Vector database |
| mnma-ui | 3000 | http://localhost:3000 | Original React UI |
| **minima-admin** | **3001** | **http://localhost:3001** | **Enterprise admin console** |
| **minima-chat-widget** | **3002** | **http://localhost:3002** | **Embeddable chat widget** |

## Quick Start

### Start All Services
```bash
docker compose up -d
```

### Start Specific Services
```bash
# Backend only
docker compose up -d mnma-upload mnma-index mnma-chat qdrant

# UIs only
docker compose up -d minima-admin minima-chat-widget

# Everything
docker compose up -d
```

### Build and Start
```bash
# Rebuild all services
docker compose up -d --build

# Rebuild specific service
docker compose up -d --build minima-admin
docker compose up -d --build minima-chat-widget
```

### View Logs
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f minima-admin
docker compose logs -f minima-chat-widget
```

### Stop Services
```bash
# Stop all
docker compose down

# Stop specific service
docker compose stop minima-admin
```

## Service Details

### Minima Admin Console
- **Port:** 3001
- **URL:** http://localhost:3001
- **Technology:** React 18 + TypeScript + Material-UI + Nginx
- **Features:**
  - File intake with drag-drop upload
  - Processing queue monitoring
  - User and role management (scaffolded)
  - Audit logging (scaffolded)
  - Responsive design
  - WCAG 2.2 compliant

**Build Details:**
- Multi-stage Docker build
- Stage 1: Node.js 18 (build React app)
- Stage 2: Nginx Alpine (serve static files)
- Production-optimized with gzip compression
- API proxy configured for backend services

**API Routes:**
- `/api/upload/` → mnma-upload:8000
- `/api/index/` → mnma-index:8000
- `/api/chat/` → mnma-chat:8000

### Minima Chat Widget
- **Port:** 3002
- **URL:** http://localhost:3002
- **Technology:** TypeScript Web Component + Nginx
- **Features:**
  - Framework-agnostic Custom Element
  - Shadow DOM for style encapsulation
  - WebSocket connection to chat service
  - Auto-reconnect with exponential backoff
  - CORS enabled for embedding
  - Theme customization via CSS variables

**Build Details:**
- Multi-stage Docker build
- Stage 1: Node.js 18 (build Web Component)
- Stage 2: Nginx Alpine (serve widget + demos)
- CORS headers configured for cross-origin embedding

**Files Served:**
- `/demo.html` → Integration examples
- `/chat-embed.html` → Standalone iframe version
- `/minima-chat.js` → Web Component bundle
- `/minima-chat.css` → Widget styles

## Health Checks

All services include health checks:

```bash
# Check service health
docker compose ps

# Detailed health status
docker inspect --format='{{json .State.Health}}' minima-aws-minima-admin-1 | jq
docker inspect --format='{{json .State.Health}}' minima-aws-minima-chat-widget-1 | jq
```

## Troubleshooting

### Build Failures

**Problem:** npm install timeout
```bash
# Solution: Build with no cache
docker compose build --no-cache minima-admin
docker compose build --no-cache minima-chat-widget
```

**Problem:** Port already in use
```bash
# Check what's using the port
netstat -ano | findstr :3001
netstat -ano | findstr :3002

# Kill the process or change port in docker-compose.yml
```

### Runtime Issues

**Problem:** Service won't start
```bash
# Check logs
docker compose logs minima-admin
docker compose logs minima-chat-widget

# Restart service
docker compose restart minima-admin
```

**Problem:** Can't connect to backend
```bash
# Ensure backend services are running
docker compose ps | findstr mnma

# Check network connectivity
docker compose exec minima-admin wget -O- http://mnma-upload:8000/docs
```

### Container Management

```bash
# Remove all stopped containers
docker compose rm

# Remove and rebuild
docker compose down
docker compose up -d --build

# Clear everything (including volumes)
docker compose down -v
```

## Development vs Production

### Development Mode (Local)
```bash
# Admin Console
cd minima-admin
npm install
npm run dev
# Runs on http://localhost:5173

# Chat Widget
cd minima-chat-widget
npm install
npm run dev
# Runs on http://localhost:5173
```

### Production Mode (Docker)
```bash
# Built with optimizations
docker compose up -d minima-admin minima-chat-widget

# Admin Console: http://localhost:3001
# Chat Widget: http://localhost:3002
```

## Performance Optimization

### Nginx Configuration
- Gzip compression enabled
- Static asset caching (1 year)
- Security headers configured
- Health check endpoint

### Build Optimization
- Multi-stage builds (small final image)
- .dockerignore excludes unnecessary files
- Production builds only
- No development dependencies

### Resource Usage
```bash
# Check container stats
docker stats minima-admin minima-chat-widget

# Limit resources (add to docker-compose.yml)
# deploy:
#   resources:
#     limits:
#       cpus: '0.5'
#       memory: 512M
```

## Updating Services

### Update Code
```bash
# Pull latest code
git pull

# Rebuild and restart
docker compose up -d --build minima-admin minima-chat-widget
```

### Update Dependencies
```bash
# Update package.json versions
cd minima-admin
npm update

# Rebuild Docker image
docker compose build --no-cache minima-admin
docker compose up -d minima-admin
```

## Backup and Recovery

### Backup Configuration
```bash
# Export docker-compose.yml and .env
cp docker-compose.yml docker-compose.yml.backup
cp .env .env.backup
```

### Backup Data
```bash
# Qdrant data
tar -czf qdrant_backup.tar.gz qdrant_data/

# MySQL data (if using volume)
docker compose exec mnma-upload mysqldump -u ${RDS_DB_USER} -p${RDS_DB_PASSWORD} ${RDS_DB_NAME} > backup.sql
```

## Production Deployment

### Environment Variables
```bash
# Create production .env
cp .env .env.production

# Edit production values
# - AWS credentials
# - RDS connection strings
# - API endpoints
```

### Security Hardening
1. **Use secrets management** (Docker secrets or AWS Secrets Manager)
2. **Enable HTTPS** (add SSL certificates to nginx)
3. **Restrict CORS** (update nginx.conf with specific origins)
4. **Add authentication** (implement OAuth or JWT)
5. **Network isolation** (use Docker networks)

### Monitoring
```bash
# Install monitoring tools
docker run -d --name cadvisor \
  -p 8080:8080 \
  -v /:/rootfs:ro \
  -v /var/run:/var/run:ro \
  -v /sys:/sys:ro \
  -v /var/lib/docker/:/var/lib/docker:ro \
  gcr.io/cadvisor/cadvisor:latest
```

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Build and Deploy

on:
  push:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Build Docker images
        run: |
          docker compose build minima-admin
          docker compose build minima-chat-widget
      
      - name: Push to registry
        run: |
          docker tag minima-admin:latest registry.example.com/minima-admin:latest
          docker push registry.example.com/minima-admin:latest
```

## Cost Optimization

### Reduce Image Size
- ✅ Multi-stage builds (save ~80% space)
- ✅ Alpine-based images where possible
- ✅ .dockerignore to exclude unnecessary files
- Consider distroless images for production

### Resource Limits
```yaml
# In docker-compose.yml
minima-admin:
  deploy:
    resources:
      limits:
        cpus: '0.50'
        memory: 512M
      reservations:
        cpus: '0.25'
        memory: 256M
```

## Next Steps

1. **Access the UIs:**
   - Admin Console: http://localhost:3001
   - Chat Widget: http://localhost:3002

2. **Test functionality:**
   - Upload files via admin console
   - Monitor processing queue
   - Test chat widget integration

3. **Customize:**
   - Update branding in UI components
   - Configure API endpoints
   - Adjust resource limits

4. **Deploy to production:**
   - Set up SSL certificates
   - Configure domain names
   - Enable monitoring and logging
