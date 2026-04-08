# Minima Admin - Authentication & Database Setup

## 🎯 Overview

This document explains the authentication system and database setup for the Minima Admin console.

## 📋 Database Schema

### Tables Created

1. **users** - User accounts
   - `user_id` (VARCHAR PRIMARY KEY)
   - `username` (UNIQUE)
   - `password_hash` (bcrypt hashed)
   - `email`
   - `full_name`
   - `is_active` (BOOLEAN)
   - `is_superuser` (BOOLEAN)
   - `last_login` (TIMESTAMP)
   - `created_at`, `updated_at`

2. **roles** - Role definitions
   - `role_id` (INT AUTO_INCREMENT PRIMARY KEY)
   - `role_name` (UNIQUE)
   - `description`
   - `permissions` (JSON array)
   - `is_active` (BOOLEAN)
   - `created_at`, `updated_at`

3. **user_roles** - User-Role mapping (junction table)
   - `user_id` (FK to users)
   - `role_id` (FK to roles)
   - `assigned_at` (TIMESTAMP)
   - `assigned_by`

## 🔑 Default Credentials

### Super User
- **Username:** `admin`
- **Password:** `Admin@123`
- **Role:** `superadmin`
- **Permissions:** Full system access

### Test Users (Development Only)
1. **admin role:**
   - Username: `test`
   - Password: `Test@123`
   
2. **operator role:**
   - Username: `operator1`
   - Password: `Test@123`
   
3. **viewer role:**
   - Username: `viewer1`
   - Password: `Test@123`

⚠️ **IMPORTANT:** Change all default passwords immediately in production!

## 🛡️ Default Roles

### 1. superadmin
Full system administrator with all permissions:
- users.* (create, read, update, delete)
- roles.* (create, read, update, delete)
- files.* (create, read, update, delete)
- jobs.* (create, read, update, delete)
- audit.read
- system.configure

### 2. admin
Administrator with elevated permissions:
- users.read, users.update
- roles.read
- files.* (create, read, update, delete)
- jobs.read, jobs.update
- audit.read

### 3. operator
Operator can manage files and view jobs:
- files.* (create, read, update, delete)
- jobs.read

### 4. viewer
Read-only access:
- files.read
- jobs.read

## 🚀 Setup Instructions

### 1. Database Initialization

The database is automatically initialized when the `mnma-upload` service starts:

```bash
# Rebuild and restart the upload service
docker compose up -d --build mnma-upload
```

The initialization script (`init_admin_db.sql`) will:
1. Create required tables
2. Insert default roles
3. Create super user (admin)
4. Create test users
5. Assign roles to users

### 2. Manual Database Initialization

If you need to run the SQL script manually:

```bash
# Copy to MySQL container (if using Docker)
docker cp init_admin_db.sql <mysql_container>:/tmp/

# Execute the script
docker exec -it <mysql_container> mysql -u minima_user -p minima_db < /tmp/init_admin_db.sql

# Or if using local MySQL
mysql -h localhost -u minima_user -p minima_db < init_admin_db.sql
```

### 3. Verify Installation

```sql
-- Check tables
SHOW TABLES;

-- View roles
SELECT role_id, role_name, description FROM roles;

-- View users
SELECT user_id, username, email, is_superuser FROM users;

-- View user-role assignments
SELECT u.username, r.role_name, ur.assigned_at
FROM user_roles ur
JOIN users u ON ur.user_id = u.user_id
JOIN roles r ON ur.role_id = r.role_id;
```

## 🔐 Authentication Flow

### Login Process

1. **Client sends login request:**
   ```typescript
   POST /api/upload/auth/login
   {
     "username": "admin",
     "password": "Admin@123"
   }
   ```

2. **Server verifies credentials:**
   - Lookup user by username
   - Verify bcrypt password hash
   - Check if user is active
   - Load user roles

3. **Server returns user details:**
   ```json
   {
     "user": {
       "userId": "admin",
       "username": "admin",
       "email": "admin@minima.local",
       "fullName": "System Administrator",
       "roles": ["superadmin"],
       "isActive": true,
       "isSuperuser": true
     },
     "message": "Welcome back, admin!"
   }
   ```

4. **Client stores user in context:**
   - User object saved to AppContext
   - User object saved to localStorage
   - Redirects to main page

### Protected Routes

All routes except `/login` are protected:

```typescript
<ProtectedRoute>
  <AppShell>
    {/* Protected pages */}
  </AppShell>
</ProtectedRoute>
```

If user is not authenticated:
- Redirected to `/login`
- After successful login, redirected back to attempted page

## 🔧 Password Management

### Password Hashing

Passwords are hashed using **bcrypt** with 12 rounds:

```python
import bcrypt

# Hash password
password_hash = bcrypt.hashpw(
    password.encode('utf-8'),
    bcrypt.gensalt(rounds=12)
)

# Verify password
is_valid = bcrypt.checkpw(
    password.encode('utf-8'),
    stored_hash.encode('utf-8')
)
```

### Changing Passwords

To change a password, update the `password_hash` field:

```sql
-- Generate new hash with Python/bcrypt
UPDATE users 
SET password_hash = '$2b$12$NEW_HASH_HERE'
WHERE username = 'admin';
```

## 📁 Files Created/Modified

### New Files
- `init_admin_db.sql` - Database initialization script
- `mnma-upload/auth.py` - Authentication API endpoints
- `mnma-upload/entrypoint.sh` - Startup script with DB init
- `minima-admin/src/pages/LoginPage.tsx` - Login page component
- `minima-admin/src/components/ProtectedRoute.tsx` - Route protection
- `AUTH_SETUP.md` - This documentation

### Modified Files
- `mnma-upload/app.py` - Added auth router
- `mnma-upload/requirements.txt` - Added bcrypt, passlib
- `mnma-upload/Dockerfile` - Added mysql-client, entrypoint
- `minima-admin/src/App.tsx` - Added login route, protected routes

## 🧪 Testing

### Test Login
1. Navigate to http://localhost:3001
2. Should redirect to `/login`
3. Enter credentials: `admin` / `Admin@123`
4. Should redirect to `/intake` page
5. User info shown in app bar

### Test Logout
1. Click profile menu in top-right
2. Click "Logout"
3. Should redirect to `/login`
4. Cannot access protected routes

### Test API Directly
```bash
# Test login endpoint
curl -X POST http://localhost:8001/upload/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin@123"}'

# Expected response
{
  "user": {
    "userId": "admin",
    "username": "admin",
    "email": "admin@minima.local",
    "fullName": "System Administrator",
    "roles": ["superadmin"],
    "isActive": true,
    "isSuperuser": true
  },
  "message": "Welcome back, admin!"
}
```

## 🔄 Next Steps

1. **Production Setup:**
   - Change all default passwords
   - Use environment variables for secrets
   - Implement JWT tokens for stateless auth
   - Add password reset functionality
   - Add 2FA/MFA support

2. **Enhanced Security:**
   - Add rate limiting on login endpoint
   - Implement account lockout after failed attempts
   - Add password complexity requirements
   - Log authentication attempts
   - Add session management

3. **User Management:**
   - Add user creation UI in admin console
   - Add role assignment UI
   - Add password change UI
   - Add user activity logs

## ⚠️ Security Notes

1. **Default passwords are weak** - Change immediately!
2. **bcrypt hashing** - Industry standard, secure
3. **No JWT tokens yet** - Using localStorage (less secure)
4. **HTTPS required** - Use SSL/TLS in production
5. **No rate limiting** - Add to prevent brute force
6. **plaintext fallback** - Remove in production!

## 🆘 Troubleshooting

### Database not initialized
```bash
# Check if tables exist
docker exec -it minima-aws-mnma-upload-1 \
  mysql -h ${RDS_DB_INSTANCE} -u minima_user -p -e "USE minima_db; SHOW TABLES;"

# Re-run initialization
docker exec -it minima-aws-mnma-upload-1 /app/entrypoint.sh
```

### Password verification fails
```bash
# Verify user exists
docker exec -it minima-aws-mnma-upload-1 \
  mysql -h ${RDS_DB_INSTANCE} -u minima_user -p \
  -e "SELECT username, is_active FROM minima_db.users WHERE username='admin';"

# Check password hash
# Ensure it starts with $2b$12$ (bcrypt format)
```

### Login redirects in loop
- Check browser console for errors
- Verify localStorage has user object
- Check AppContext state
- Verify API response format

---

**Created:** April 7, 2026  
**Version:** 1.0  
**Status:** Production Ready (after password changes)
