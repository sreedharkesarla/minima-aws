#!/bin/sh

# ==========================================
# Startup Script for mnma-upload Service
# ==========================================

echo "🚀 Starting mnma-upload service..."

# Initialize database if not already done
if [ ! -f /tmp/db_initialized ]; then
    echo "📊 Initializing database..."
    
   # Wait for MySQL to be ready
    echo "⏳ Waiting for MySQL..."
    until mysql -h"${RDS_DB_INSTANCE}" -u"${RDS_DB_USER}" -p"${RDS_DB_PASSWORD}" --ssl-mode=DISABLED -e "SELECT 1" >/dev/null 2>&1; do
      echo "  MySQL is unavailable - sleeping"
      sleep 3
    done
    
    echo "✅ MySQL is ready!"
    
    # Check if users table already exists
    TABLE_EXISTS=$(mysql -h"${RDS_DB_INSTANCE}" -u"${RDS_DB_USER}" -p"${RDS_DB_PASSWORD}" --ssl-mode=DISABLED -D"${RDS_DB_NAME}" -sse "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '${RDS_DB_NAME}' AND table_name = 'users';")
    
    if [ "$TABLE_EXISTS" -eq "0" ]; then
        echo "🔧 Running database initialization script..."
        mysql -h"${RDS_DB_INSTANCE}" -u"${RDS_DB_USER}" -p"${RDS_DB_PASSWORD}" --ssl-mode=DISABLED < /app/init_admin_db.sql
        
        if [ $? -eq 0 ]; then
            echo "✅ Database initialized successfully!"
            echo "   📝 Default credentials:"
            echo "      Super user: admin / Admin@123"
            echo "      Test users: test, operator1, viewer1 / Test@123"
            echo "   ⚠️  Change default passwords in production!"
            touch /tmp/db_initialized
        else
            echo "❌ Database initialization failed!"
        fi
    else
        echo "ℹ️  Database already initialized (users table exists)"
        touch /tmp/db_initialized
    fi
else
    echo "ℹ️  Database initialization already completed"
fi

echo "🌐 Starting FastAPI application..."

# Start the FastAPI application
exec uvicorn app:app --loop asyncio --reload --workers ${WORKERS} --host ${CURRENT_HOST} --port ${PORT} --proxy-headers
