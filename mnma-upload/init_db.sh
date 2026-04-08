#!/bin/bash

# ==========================================
# Minima Admin Database Initialization Script
# ==========================================

echo "🔧 Initializing Minima Admin Database..."

# Wait for MySQL to be ready
echo "⏳ Waiting for MySQL to be available..."
until mysql -h"${RDS_DB_INSTANCE}" -u"${RDS_DB_USER}" -p"${RDS_DB_PASSWORD}" -e "SELECT 1" >/dev/null 2>&1; do
  echo "MySQL is unavailable - sleeping"
  sleep 2
done

echo "✅ MySQL is up - executing init script"

# Execute the SQL initialization script
mysql -h"${RDS_DB_INSTANCE}" -u"${RDS_DB_USER}" -p"${RDS_DB_PASSWORD}" < /app/init_admin_db.sql

if [ $? -eq 0 ]; then
    echo "✅ Database initialized successfully!"
    echo "   Super user: admin / Admin@123"
    echo "   Test users: test, operator1, viewer1 (password: Test@123)"
    echo "   ⚠️  Change default passwords in production!"
else
    echo "❌ Database initialization failed!"
    exit 1
fi
