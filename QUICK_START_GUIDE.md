# 🎯 QUICK START GUIDE - Settings & System Health

**Access URL:** http://localhost:3001  
**Login:** admin / Admin@123

---

## 🗺️ WHERE TO FIND THE NEW PAGES

### In the Navigation Menu (Left Sidebar):

```
📊 Dashboard              (existing)
📤 File Intake            (existing)
⏳ Processing Queue       (existing)
💬 Ask Chat               (existing)
👥 Users & Roles          (existing)
📈 Usage & Costs          (existing)
🏥 System Health          ← NEW! (7th item)
⚙️ Settings               ← NEW! (8th item - bottom)
```

---

## ⚙️ SETTINGS PAGE - Quick Overview

**URL:** http://localhost:3001/settings

### What You'll See:

#### Top Section:
- Page title: "System Settings"
- Subtitle: "View system configuration and model settings (read-only for security)"
- Refresh button (blue circular arrow icon)

#### Main Content (6 Cards):

1. **AWS Configuration Card** (top left)
   - Cloud icon (blue)
   - Shows: Region, S3 Bucket, SQS Queue, Credentials status

2. **Qdrant Vector Database Card** (top right)
   - Memory chip icon (purple)
   - Shows: URL, Collection Name, Vector Dimensions

3. **AI Models Card** (middle left)
   - Brain/Psychology icon (light blue)
   - Shows: Embedding Model, Chat Model, Dimensions
   - Info alert about model parameters

4. **MySQL Database Card** (middle right)
   - Storage icon (green)
   - Shows: Host, Port, Database Name, User

5. **Microservices Card** (bottom - full width)
   - 4 colored boxes showing service ports:
     - Upload API: 8001 (blue)
     - Index API: 8002 (purple)
     - Chat Service: WS (light blue) + "Internal" badge
     - Admin UI: 3001 (green)

6. **Security Notice** (very bottom - full width)
   - Yellow warning alert
   - Explains settings are read-only

---

## 🏥 SYSTEM HEALTH PAGE - Quick Overview

**URL:** http://localhost:3001/health

### What You'll See:

#### Top Section:
- Page title: "System Health Monitor"
- Last updated timestamp
- Auto-refresh toggle chip (green when ON)
- Refresh button (animated rotation when loading)

#### Status Banner:
- Large colored box (green or yellow)
- Big status icon
- "System Status: Healthy" or "System Status: Degraded"
- Subtitle describing overall state

#### Service Cards (Grid Layout):

1. **MySQL Database** (top left)
   - Storage/Memory icon
   - Status chip (green/red)
   - Response time
   - Status message

2. **Qdrant Vector DB** (top middle)
   - Memory icon
   - Status chip
   - Response time
   - **Collection count** (blue chip)
   - **Total vectors** (purple chip)
   - List of collections with vector counts

3. **AWS S3 Storage** (top right)
   - Cloud icon
   - Status chip
   - Response time
   - Bucket name

4. **Upload API** (bottom left)
   - Cloud upload icon
   - Always shows healthy
   - Port display

5. **Index Service** (bottom middle)
   - Search icon
   - Status chip
   - Response time
   - Port display

6. **Chat Service** (bottom right)
   - Chat icon
   - Status chip
   - Protocol info (WebSocket)

#### Performance Summary (Bottom):
- Section title: "Performance Summary"
- Progress bars for each service
- Color-coded by response time:
  - Green bar = fast (< 500ms)
  - Yellow bar = medium (500-1000ms)
  - Red bar = slow (> 1000ms)
- Exact milliseconds shown below each bar

---

## 🎨 VISUAL INDICATORS

### Status Chips:
- ✅ **Green "Healthy"** - Service is operational
- ❌ **Red "Unhealthy"** - Service has issues
- ⚠️ **Yellow "Degraded"** - Service has warnings

### Response Time Chips:
- 🟢 **Green** - Excellent (< 500ms)
- 🟡 **Yellow** - Good (500-1000ms)
- 🔴 **Red** - Slow (> 1000ms)

---

## 🔄 INTERACTIVE FEATURES

### Settings Page:
1. **Refresh Button** (top right)
   - Click to reload settings
   - Icon spins during load

### System Health Page:
1. **Auto-Refresh Toggle** (top right)
   - Click to enable/disable
   - Changes from gray to green when ON
   - Updates every 30 seconds when enabled

2. **Manual Refresh Button** (top right)
   - Click to update immediately
   - Icon rotates during load
   - Disabled while loading

---

## 📱 RESPONSIVE DESIGN

Both pages are fully responsive:
- **Desktop:** Cards in grid layout (2-3 columns)
- **Tablet:** Cards in 2 columns
- **Mobile:** Cards stack in single column

---

## 🎯 WHAT TO TEST

### Settings Page:
- [ ] Page loads without errors
- [ ] All 6 cards display
- [ ] AWS credentials show "Configured" (green chip)
- [ ] Model names display correctly
- [ ] Service ports show 8001, 8002, 3001
- [ ] Refresh button works
- [ ] Security notice appears at bottom

### System Health Page:
- [ ] Page loads without errors
- [ ] Overall status banner shows
- [ ] All service cards display
- [ ] Status chips show colors (green/yellow/red)
- [ ] Response times display (numbers + chips)
- [ ] Qdrant shows collection count
- [ ] Performance summary bars appear
- [ ] Auto-refresh toggle works
- [ ] Manual refresh works
- [ ] Last updated time shows

---

## 🚦 EXPECTED STATUS

On first load, you might see:

| Service | Expected Status | Why |
|---------|----------------|-----|
| Qdrant | ✅ Healthy | Should be running |
| Chat Service | ✅ Healthy | Should be running |
| Upload API | ✅ Healthy | Always healthy (you're using it) |
| Database | ⚠️ May vary | Depends on config |
| S3 | ⚠️ May vary | Depends on AWS creds |
| Index Service | ⚠️ May vary | Depends on service state |

**Don't worry if some show "unhealthy" initially** - this just means they need configuration or restart. The health page helps you identify what needs attention!

---

## 💡 PRO TIPS

1. **Keep Health Page Open:**
   - Enable auto-refresh
   - Leave it on a second monitor
   - Monitor system in real-time

2. **Check Settings First:**
   - Verify configuration before troubleshooting
   - Confirm AWS credentials are set
   - Check model names match expected

3. **Use Response Times:**
   - Green (< 500ms) is excellent
   - Yellow (500-1000ms) is acceptable
   - Red (> 1000ms) means investigate

4. **Qdrant Metrics:**
   - Total vectors = documents indexed
   - Collections = namespaces in use
   - Use this to verify indexing worked

---

**Everything is ready for you to explore in the morning!** ✨

Just login, click the new menu items, and enjoy the powerful new monitoring capabilities!
