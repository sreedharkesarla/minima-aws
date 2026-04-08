# Final Setup - MySQL Connection Fix

## Current Status
✅ Authentication system fully implemented  
⚠️ MySQL connection from Docker needs configuration

## The Issue
Docker container cannot connect to host MySQL using `host.docker.internal`.

## Solution Options

### Option 1: Manual SQL Import (Quickest)
Run the SQL script directly on your host MySQL:

\`\`\`powershell
# Find MySQL bin folder (usually C:\Program Files\MySQL\MySQL Server 8.0\bin)
cd "C:\Program Files\MySQL\MySQL Server 8.0\bin"

# Run the init script
.\mysql.exe -u root -p < "C:\Engineering\minima-aws\init_admin_db.sql"
# Enter MySQL root password when prompted

# Or use quick_init.sql for simpler version
.\mysql.exe -u root -p < "C:\Engineering\minima-aws\quick_init.sql"
\`\`\`

After running the script, restart:
\`\`\`powershell
docker compose restart mnma-upload minima-admin
\`\`\`

### Option 2: Windows Firewall
Allow MySQL port through firewall:

\`\`\`powershell
# Run as Administrator
New-NetFirewallRule -DisplayName "MySQL for Docker" -Direction Inbound -Protocol TCP -LocalPort 3306 -Action Allow

# Restart Docker containers
docker compose restart mnma-upload
\`\`\`

### Option 3: Add MySQL to Docker Compose (Recommended for Development)

1. Stop current services:
\`\`\`bash
docker compose down
\`\`\`

2. Add to `docker-compose.yml`:
\`\`\`yaml
services:
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
      - "3307:3306"  # Use 3307 to avoid conflict with host MySQL
    volumes:
      - mysql_data:/var/lib/mysql
      - ./init_admin_db.sql:/docker-entrypoint-initdb.d/01-init.sql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Update mnma-upload dependency
  mnma-upload:
    depends_on:
      mysql:
        condition: service_healthy

volumes:
  mysql_data:
\`\`\`

3. Update `.env`:
\`\`\`
RDS_DB_INSTANCE=mysql  # Change from host.docker.internal
RDS_DB_PORT=3306       # Keep as 3306 (internal Docker port)
\`\`\`

4. Start services:
\`\`\`bash
docker compose up -d
\`\`\`

## Verification

After fixing MySQL connection, verify:

\`\`\`bash
# Check logs
docker compose logs mnma-upload | findstr "Database initialized"

# Should see:
# ✅ Database initialized successfully!
# Super user: admin / Admin@123
\`\`\`

Then test login:
\`\`\`
http://localhost:3001
Login: admin / Admin@123
\`\`\`

## Files Ready to Use

All code is implemented and ready:
- ✅ Login page UI
- ✅ Protected routes
- ✅ Auth API endpoints
- ✅ Database schema
- ✅ Init script with default users
- ✅ Bcrypt password hashing

Only MySQL connection needs to be configured!
