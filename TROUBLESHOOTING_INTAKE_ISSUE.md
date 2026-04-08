# Minima Admin Troubleshooting Guide

## Issue: Empty/Blank Intake Page After Login

### What I've Done:
1. ✅ Rebuilt the admin container with error boundary component
2. ✅ Added comprehensive error handling to catch React errors
3. ✅ Verified all backend services are running
4. ✅ Confirmed database is initialized with admin user
5. ✅ Verified nginx configuration and routing
6. ✅ Confirmed JavaScript files are being served correctly

### Current Status:
- **Admin Container**: Running (http://localhost:3001)
- **Database**: Initialized with admin user
- **Login Credentials**: admin / Admin@123
- **New Build Hash**: index-Bmh4GfUh.js (includes error boundary)

### Next Steps - Please Try:

#### 1. Clear Browser Cache (IMPORTANT!)
The browser may be caching the old broken JavaScript file.

**Option A - Hard Refresh:**
- Press `Ctrl + Shift + R` (Windows/Linux)
- Or `Cmd + Shift + R` (Mac)

**Option B - Clear Cache:**
- Press `Ctrl + Shift + Delete`
- Select "Cached images and files"
- Choose "All time"
- Click "Clear data"

#### 2. Access Admin Console
1. Go to: http://localhost:3001
2. Login with: admin / Admin@123
3. You should be redirected to /intake

#### 3. What You Should See:

**Scenario A - Success ✅**
- Sidebar with menu items (File Intake, Processing Queue, Audit Logs, Users & Roles)
- Top navigation bar with notifications and profile icon
- Main content area with "File Intake & Processing" heading
- File upload drag-and-drop area
- Form fields for Document Type and Sensitivity

**Scenario B - React Error (Better!) ⚠️**
- Red error box with detailed error message
- Stack trace information
- "Reload Page" button
- **If you see this**: Copy the error message and share it

**Scenario C - Still Blank ❌**
- Completely white/blank page
- **If you see this**: Open Developer Tools (F12) and check:
  - Console tab: Look for RED errors
  - Network tab: Look for failed requests (red/404)
  - Copy any error messages you see

### Diagnostic Tools Created:

1. **admin-test.html** - Basic connectivity test
   - Open: `c:\Engineering\minima-aws\admin-test.html`
   - This will test if services are accessible

2. **diagnose-admin.html** - Detailed diagnostics
   - Open: `c:\Engineering\minima-aws\diagnose-admin.html`
   - This will check file loading and API endpoints

### Common Issues and Solutions:

#### Issue: Browser is Caching Old Files
**Solution**: Hard refresh (Ctrl+Shift+R) or clear cache completely

#### Issue: JavaScript Module Loading Error
**Check**: Browser console for specific error message
**Typical causes**: MIME type issues, CORS, or module import errors

#### Issue: API Endpoints Not Responding
**Check**: Network tab in Developer Tools
**Verify**: Backend services are running with `docker ps`

#### Issue: React Component Rendering Error
**Now handled by**: Error Boundary component (will show red error box instead of blank page)

### If Still Having Issues:

Please provide the following information:

1. **Browser Console Errors**:
   - Press F12
   - Go to Console tab
   - Copy the FIRST red error message

2. **Network Tab Info**:
   - Press F12
   - Go to Network tab
   - Refresh page (Ctrl+R)
   - Look for any red/failed requests
   - Note which URL failed and the status code

3. **Error Boundary Output**:
   - If you see a red error box, copy the entire error message

4. **Browser Version**:
   - What browser are you using? (Chrome, Firefox, Edge, etc.)
   - Version number

### Technical Details:

**Container**: minima-aws-minima-admin-1
**Port**: 3001
**Nginx Root**: /usr/share/nginx/html
**Current JS Bundle**: index-Bmh4GfUh.js (530.8K)
**API Proxy**: /api/auth → mnma-upload:8000/auth/
**React Router**: SPA with client-side routing

### Files Modified:
- ✅ Added: src/components/ErrorBoundary.tsx
- ✅ Updated: src/main.tsx (wrapped App with ErrorBoundary)
- ✅ Created: admin-test.html (diagnostics)
- ✅ Created: diagnose-admin.html (detailed tests)
- ✅ Rebuilt: Docker container with latest changes

---

**Status**: Waiting for user feedback after cache clear and hard refresh.
