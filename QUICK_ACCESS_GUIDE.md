# 🚀 Quick Access Guide - Minima AWS UIs

## ⚡ Immediate Access (No Installation Required)

### 1. Simple Test UI (Currently Working)
**Location:** `test-ui.html`
**Access:** Simply open the file in your browser

```powershell
# Open directly
start c:\Engineering\minima-aws\test-ui.html
```

**Features:**
- ✅ Login
- ✅ File upload
- ✅ View files
- ✅ Chat with documents

**Test Credentials:**
- User ID: `test`
- Password: `test123`

**Prerequisites:** Backend services must be running
```powershell
cd c:\Engineering\minima-aws
docker compose up -d
```

---

## 🎯 New UIs (Require Node.js)

### Option A: Install Node.js (One-time Setup)

**1. Download Node.js:**
- Visit: https://nodejs.org/
- Download: LTS version (recommended)
- Install with default settings

**2. Verify Installation:**
```powershell
node --version
npm --version
```

**3. Start Admin Console:**
```powershell
cd c:\Engineering\minima-aws\minima-admin
npm install          # First time only (~2-3 minutes)
npm run dev          # Start dev server
```
**Access:** http://localhost:3001

**4. Start Chat Widget Demo:**
```powershell
cd c:\Engineering\minima-aws\minima-chat-widget
npm install          # First time only
npm run dev          # Start dev server
```
**Access:** http://localhost:5173

---

### Option B: Use Docker (Alternative)

If you prefer Docker, let me create Dockerfiles:

**Admin Console via Docker:**
```powershell
cd c:\Engineering\minima-aws\minima-admin
docker build -t minima-admin .
docker run -p 3001:3001 minima-admin
```
**Access:** http://localhost:3001

---

## 📊 UI Comparison

| UI | Status | Access Method | Features |
|----|--------|---------------|----------|
| **test-ui.html** | ✅ Ready | Open in browser | Basic upload + chat |
| **mnma-ui/** | ✅ Ready | Docker or npm | Material-UI, full features |
| **minima-admin/** | ⏳ Need Node.js | `npm run dev` | Enterprise admin console |
| **minima-chat-widget/** | ⏳ Need Node.js | `npm run dev` | Embeddable chat demo |

---

## 🔧 Current Backend Status

Check if backend is running:
```powershell
docker ps
```

Should show:
- ✅ mnma-upload (port 8001)
- ✅ mnma-index (port 8002)
- ✅ mnma-chat (port 8003)
- ✅ qdrant (port 6333)

Start backend if not running:
```powershell
cd c:\Engineering\minima-aws
docker compose up -d
```

---

## ✅ What You Can Access RIGHT NOW

### 1. Test UI (Simplest - No Setup)
```powershell
# 1. Ensure backend is running
docker compose up -d

# 2. Open test UI
start test-ui.html

# 3. Login and use chat
User: test
Pass: test123
```

### 2. Existing React UI (If Docker is working)
```powershell
# Check if it's running
docker ps | Select-String "mnma-ui"

# If not, start it (if Docker build succeeded earlier)
docker compose up -d mnma-ui

# Access
start http://localhost:3000
```

---

## 🐛 Troubleshooting

### "Chat is not working"
```powershell
# Check backend
docker ps

# Verify chat service
curl http://localhost:8003/docs

# Use test user (has indexed documents)
User ID: test
```

### "Can't access admin console"
**Issue:** Node.js not installed

**Solution:**
1. Install Node.js from https://nodejs.org/
2. Restart PowerShell
3. Run `npm --version` to verify
4. Then run `npm install` in admin console folder

### "Port already in use"
```powershell
# Kill process on port (example: 3001)
Get-Process -Id (Get-NetTCPConnection -LocalPort 3001).OwningProcess | Stop-Process
```

---

## 📖 Next Steps

### If you just want to TEST the system:
✅ Use `test-ui.html` (works immediately)

### If you want the full admin experience:
1. Install Node.js
2. Run admin console with `npm run dev`
3. Access at http://localhost:3001

### If you want to embed chat in another app:
1. Install Node.js
2. Build chat widget: `cd minima-chat-widget && npm run build`
3. Use the generated `dist/minima-chat.js` file

---

## 🆘 Quick Help Commands

```powershell
# Check what's running
docker ps

# View backend logs
docker compose logs -f mnma-chat

# Restart everything
docker compose restart

# Check Node.js installation
node --version
npm --version
```

---

**Current Recommendation:** 

Since Node.js is not installed, use **test-ui.html** for immediate access:

```powershell
cd c:\Engineering\minima-aws
docker compose up -d
start test-ui.html
```

Login with:
- User: `test`  
- Password: `test123`

Once you install Node.js, you'll be able to access the new enterprise admin console and chat widget demos!
