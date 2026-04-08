# 🚀 Quick Start Guide - Authentication System

## Login to Minima Admin

### Step 1: Access the Application
```
http://localhost:3001
```
You will be redirected to the login page automatically if not logged in.

### Step 2: Login with Default Credentials

**Super Administrator:**
- Username: `admin`
- Password: `Admin@123`

**Test Administrator:**
- Username: `test`
- Password: `Test@123`

**Operator:**
- Username: `operator1`
- Password: `Test@123`

**Viewer:**
- Username: `viewer1`
- Password: `Test@123`

### Step 3: After Login
- You'll be redirected to the File Intake page
- Your username appears in the top-right corner
- Click the menu icon to access different pages
- Click your username dropdown to logout

## 🔑 User Roles & Permissions

### superadmin (admin user)
- ✅ Manage users (create, update, delete)
- ✅ Manage roles and permissions
- ✅ Upload and manage files
- ✅ View and manage jobs
- ✅ View audit logs
- ✅ System configuration

### admin (test user)
- ✅ View and update users
- ✅ View roles
- ✅ Upload and manage files
- ✅ View and update jobs
- ✅ View audit logs

### operator (operator1 user)
- ✅ Upload and manage files
- ✅ View jobs
- ❌ Cannot manage users
- ❌ No audit log access

### viewer (viewer1 user)
- ✅ View files
- ✅ View jobs
- ❌ Cannot upload or modify
- ❌ No admin access

## 🔧 Setup (First Time)

### 1. Rebuild Services
```bash
# Run the setup script
setup-auth.bat

# Or manually:
docker compose build mnma-upload minima-admin
docker compose up -d mnma-upload minima-admin
```

### 2. Database is Auto-Initialized
The database tables and default users are created automatically when `mnma-upload` starts.

Check logs to confirm:
```bash
docker compose logs mnma-upload | findstr "Database initialized"
```

You should see:
```
✅ Database initialized successfully!
   📝 Default credentials:
      Super user: admin / Admin@123
      Test users: test, operator1, viewer1 / Test@123
```

### 3. Access Admin Console
```
http://localhost:3001
```

## ⚠️ Security Warnings

**IMPORTANT - Production Checklist:**

1. ✅ Change default passwords immediately
2. ✅ Use HTTPS (SSL/TLS) in production
3. ✅ Set up environment variables for secrets
4. ✅ Remove test users in production
5. ✅ Add rate limiting on login endpoint
6. ✅ Implement JWT tokens for stateless auth
7. ✅ Enable 2FA/MFA for admin accounts
8. ✅ Regular security audits

**Current Security Status:**
- 🟡 Passwords in database (bcrypt hashed - GOOD)
- 🟡 User data in localStorage (NOT ideal for production)
- 🟡 No JWT tokens (sessions not stateless)
- 🟡 No rate limiting (vulnerable to brute force)
- 🔴 Default passwords (CHANGE IMMEDIATELY in production)

## 🧪 Testing

### Test Login Flow
1. Go to http://localhost:3001
2. Enter: admin / Admin@123
3. Click "Sign In"
4. Should redirect to File Intake page
5. Username "admin" appears in top bar

### Test Logout
1. Click username dropdown (top-right)
2. Click "Logout"
3. Should redirect to login page
4. Try accessing http://localhost:3001/intake
5. Should redirect back to login

### Test API Directly
```powershell
# Test login API
curl -X POST http://localhost:8001/upload/auth/login `
  -H "Content-Type: application/json" `
  -d '{\"username\":\"admin\",\"password\":\"Admin@123\"}'
```

Expected response:
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

## 🔄 Change Password

### Option 1: Direct SQL Update
```sql
-- Generate new password hash first (use Python/bcrypt)
-- Then update database:
USE minima_db;

UPDATE users 
SET password_hash = '$2b$12$YOUR_NEW_HASH_HERE'
WHERE username = 'admin';
```

### Option 2: Python Script
```python
import bcrypt

# Generate hash
password = "YourNewPassword123"
hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt(rounds=12))
print(hashed.decode('utf-8'))

# Use this hash in SQL UPDATE command
```

## 🛠️ Troubleshooting

### Can't Login - "Invalid username or password"
```bash
# Check if user exists
docker exec -it minima-aws-mnma-upload-1 mysql \
  -h ${RDS_DB_INSTANCE} -u minima_user -p \
  -e "SELECT username, is_active FROM minima_db.users WHERE username='admin';"

# Expected: admin | 1
```

### Database Not Initialized
```bash
# Check if tables exist
docker exec -it minima-aws-mnma-upload-1 mysql \
  -h ${RDS_DB_INSTANCE} -u minima_user -p \
  -e "SHOW TABLES FROM minima_db;"

# Should show: users, roles, user_roles

# Re-run initialization
docker compose restart mnma-upload
docker compose logs -f mnma-upload
```

### Login Page Not Showing
```bash
# Rebuild admin console
docker compose build minima-admin
docker compose up -d minima-admin

# Check logs
docker compose logs minima-admin
```

### Stuck on Login Redirect Loop
- Clear browser localStorage: F12 → Application → Local Storage → Clear
- Check browser console for errors
- Verify API is responding: http://localhost:8001/upload/docs

## 📝 Files Reference

**Frontend (minima-admin/):**
- `src/pages/LoginPage.tsx` - Login page component
- `src/components/ProtectedRoute.tsx` - Route protection
- `src/App.tsx` - Routing with login/protected routes

**Backend (mnma-upload/):**
- `auth.py` - Login API endpoints
- `app.py` - Includes auth router
- `entrypoint.sh` - Startup script with DB init
- `init_admin_db.sql` - Database schema + default data

**Database:**
- `init_admin_db.sql` - Full initialization script

**Documentation:**
- `AUTH_SETUP.md` - Complete authentication documentation
- `QUICKSTART_LOGIN.md` - This guide

---

**Need Help?**
- Check logs: `docker compose logs -f mnma-upload minima-admin`
- View API docs: http://localhost:8001/upload/docs
- Read full docs: [AUTH_SETUP.md](AUTH_SETUP.md)
