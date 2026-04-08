# Quick Fix - Start MySQL for Minima Auth

## Problem
The `mnma-upload` service needs MySQL to initialize the admin database, but MySQL isn't running.

## Solution Options

### Option 1: Start Local MySQL (Quick)
If you have MySQL installed:
```powershell
# Start MySQL service
net start MySQL80  # or MySQL57, check your version

# Or use services.msc to start MySQL manually
```

### Option 2: Add MySQL to Docker Compose (Recommended)

Add this to `docker-compose.yml`:

```yaml
services:
  # ... existing services ...
  
  mysql:
    image: mysql:8.0
    container_name: minima-mysql
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD: rootpassword
      MYSQL_DATABASE: minima_db
      MYSQL_USER: minima_user
      MYSQL_PASSWORD: minima_user
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
      - ./init_admin_db.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  mysql_data:
```

Then update `.env`:
```
RDS_DB_INSTANCE=mysql  # Change from host.docker.internal
```

Then restart:
```bash
docker compose up -d mysql
docker compose restart mnma-upload minima-admin
```

### Option 3: Use Existing MySQL Setup
If MySQL is already set up elsewhere:
1. Import the SQL script:
   ```bash
   mysql -h localhost -u minima_user -p < init_admin_db.sql
   ```
2. Restart services:
   ```bash
   docker compose restart mnma-upload
   ```

## Current Issue
```
mnma-upload-1  | ⏳ Waiting for MySQL...
mnma-upload-1  |   MySQL is unavailable - sleeping
```

The service is looking for MySQL at: `host.docker.internal:3306`

## Check MySQL Status
```powershell
# Check if MySQL service is running
Get-Service | Where-Object {$_.Name -like "*mysql*"}

# Check if port 3306 is listening
Test-NetConnection -ComputerName localhost -Port 3306
```

## Next Steps
1. Choose one of the options above
2. Ensure MySQL is accessible
3. The init script will run automatically on next startup
4. Login will work with default credentials: admin / Admin@123

---
**Quick Command to Add MySQL Container:**
```bash
# Copy docker-compose section above, then:
docker compose up -d mysql
docker compose restart mnma-upload minima-admin
```
