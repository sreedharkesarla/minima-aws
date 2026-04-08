# UI Modernization Implementation Plan

## Executive Summary
Implementing **Layout B: Dedicated Admin Console + Embeddable Chat Widget** as recommended by the UI mockup design research.

## Architecture Decision

### Layout B Benefits
1. ✅ **Best for embedding** - Chat as productized widget (iframe/Web Component/SDK)
2. ✅ **Clean separation** - Admin stays enterprise-grade, chat stays minimal
3. ✅ **Security** - iframe isolation with postMessage contract
4. ✅ **Compatibility** - Framework-agnostic embedding
5. ✅ **Independent release** - Chat widget has own versioning

## Implementation Phases

### Phase 1: Enhanced Admin Console (NEW)
```
minima-admin/
├── public/
├── src/
│   ├── components/
│   │   ├── AppShell.tsx           # Top bar + nav + layout
│   │   ├── FileIntake/
│   │   │   ├── UploadZone.tsx     # Drag-drop with metadata
│   │   │   ├── BatchUploader.tsx  # Multi-file upload
│   │   │   └── MetadataForm.tsx   # Required fields
│   │   ├── ProcessingQueue/
│   │   │   ├── QueueTable.tsx     # Virtualized table
│   │   │   ├── QueueFilters.tsx   # Status/date/owner filters
│   │   │   ├── JobDetail.tsx      # Timeline + artifacts
│   │   │   └── RetryModal.tsx     # Safe retry confirmation
│   │   ├── Administration/
│   │   │   ├── UserRoleManager.tsx  # RBAC management
│   │   │   ├── PermissionsMatrix.tsx
│   │   │   └── AccessReview.tsx
│   │   ├── AuditLogs/
│   │   │   ├── LogsViewer.tsx     # Searchable logs
│   │   │   ├── AuditTimeline.tsx  
│   │   │   └── RetentionBanner.tsx
│   │   └── Common/
│   │       ├── StatusBadge.tsx
│   │       ├── ProgressBar.tsx
│   │       └── VirtualizedList.tsx
│   ├── pages/
│   │   ├── FileIntakePage.tsx
│   │   ├── ProcessingQueuePage.tsx
│   │   ├── JobDetailPage.tsx
│   │   ├── UsersRolesPage.tsx
│   │   └── AuditLogsPage.tsx
│   ├── services/
│   │   ├── adminApi.ts           # Admin endpoints
│   │   ├── auditApi.ts           # Audit logging
│   │   └── rbacApi.ts            # Role management
│   ├── hooks/
│   │   ├── useVirtualizedQueue.ts
│   │   ├── useAuditLogs.ts
│   │   └── useRBAC.ts
│   └── App.tsx
├── package.json
├── tsconfig.json
└── vite.config.ts
```

### Phase 2: Embeddable Chat Widget (NEW)
```
minima-chat-widget/
├── src/
│   ├── web-component/
│   │   ├── MinimaChatWidget.ts    # Custom Element
│   │   ├── styles.css             # Encapsulated styles
│   │   └── shadow-dom.ts
│   ├── components/
│   │   ├── ChatHeader.tsx
│   │   ├── ConversationLog.tsx    # role="log" ARIA
│   │   ├── MessageBubble.tsx
│   │   ├── ChatComposer.tsx
│   │   ├── FileChips.tsx
│   │   └── ThreadDrawer.tsx
│   ├── services/
│   │   ├── chatWebSocket.ts       # Reconnection logic
│   │   └── messageQueue.ts
│   ├── iframe/
│   │   ├── embed.html             # Standalone iframe version
│   │   └── postMessageContract.ts
│   └── sdk/
│       └── minima-chat-sdk.ts     # JS SDK wrapper
├── dist/
│   ├── minima-chat.js             # Web Component bundle
│   ├── minima-chat.css
│   ├── minima-chat-iframe.html
│   └── minima-chat-sdk.js
├── package.json
└── rollup.config.js               # Build for Web Component
```

### Phase 3: Backend Enhancements

#### A. User & Role Management (NEW service or extend upload)
```python
# mnma-admin/ (NEW microservice)
├── app.py
├── api/
│   ├── users.py          # User CRUD
│   ├── roles.py          # Role management
│   ├── permissions.py    # RBAC matrix
│   └── audit.py          # Audit log endpoints
├── models/
│   ├── user.py
│   ├── role.py
│   └── audit_event.py
└── rbac/
    └── enforcer.py       # Permission checks
```

#### B. Audit Logging (Cross-cutting)
- Add audit middleware to all services
- Log: who/what/when/resource/outcome
- Store in dedicated audit table/store
- Retention policy enforcement

#### C. Enhanced File API
- Metadata validation endpoints
- Batch upload support
- Retry logic with idempotency
- Quarantine operations

## Database Schema Updates

### New Tables
```sql
-- Users table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    password_hash VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id)
);

-- Roles table
CREATE TABLE roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    role_name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    permissions JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User-Role mapping
CREATE TABLE user_roles (
    user_id VARCHAR(255),
    role_id INT,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by VARCHAR(255),
    PRIMARY KEY (user_id, role_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- Audit events
CREATE TABLE audit_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    event_id VARCHAR(255) UNIQUE NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id VARCHAR(255),
    outcome ENUM('success', 'failure'),
    details JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    INDEX idx_user (user_id),
    INDEX idx_timestamp (timestamp),
    INDEX idx_resource (resource_type, resource_id)
);

-- Enhanced files table (add columns)
ALTER TABLE files ADD COLUMN (
    document_type VARCHAR(100),
    sensitivity ENUM('public', 'internal', 'confidential'),
    tags JSON,
    validated_at TIMESTAMP NULL,
    validation_errors JSON,
    retry_count INT DEFAULT 0,
    last_retry_at TIMESTAMP NULL
);
```

## Integration Modes for Chat Widget

### Mode 1: Web Component (Recommended for modern apps)
```html
<script type="module" src="https://cdn.minima.ai/chat/v1/minima-chat.js"></script>

<minima-chat
    api-endpoint="https://api.minima.ai/chat"
    conversation-id="demo-001"
    auth-token="Bearer xyz..."
    theme-accent="#4f46e5"
    mode="compact"
></minima-chat>
```

### Mode 2: iframe (Maximum isolation)
```html
<iframe
    src="https://chat.minima.ai/embed?mode=compact&conv=demo-001"
    title="Minima Chat"
    sandbox="allow-scripts allow-forms"
    style="width: 360px; height: 520px; border: 0;"
></iframe>

<script>
    // postMessage communication
    window.addEventListener('message', (e) => {
        if (e.origin === 'https://chat.minima.ai') {
            console.log('Chat event:', e.data);
        }
    });
</script>
```

### Mode 3: JS SDK (Programmatic control)
```javascript
import { MinimaChatSDK } from '@minima/chat-sdk';

const chat = new MinimaChatSDK({
    container: '#chat-container',
    endpoint: 'https://api.minima.ai/chat',
    auth: { bearerToken: 'xyz...' },
    theme: { accent: '#4f46e5' },
    onMessage: (msg) => console.log('New message:', msg),
    onError: (err) => console.error('Chat error:', err)
});

chat.connect();
chat.sendMessage('Hello!');
```

## Accessibility Checklist

### WCAG 2.2 Compliance
- [ ] Focus indicators visible and not obscured
- [ ] Status messages use `role="status"` or `role="alert"`
- [ ] Chat log uses `role="log"` with `aria-live="polite"`
- [ ] Drag-drop has keyboard alternative
- [ ] Color contrast meets AA (4.5:1 text, 3:1 UI)
- [ ] Forms have visible labels and error associations
- [ ] Skip links for navigation
- [ ] Heading hierarchy logical (h1 → h2 → h3)
- [ ] Touch targets minimum 24x24px
- [ ] No cognitive function tests for auth (2FA alternatives)

### ARIA Patterns
```tsx
// Upload zone
<div
    role="region"
    aria-label="File upload"
    aria-describedby="upload-help"
>
    <input type="file" id="file-input" />
    <div id="upload-help">Drag files here or browse</div>
</div>

// Live status
<div role="status" aria-live="polite" aria-atomic="true">
    Uploading: 45%
</div>

// Chat log
<div
    role="log"
    aria-live="polite"
    aria-relevant="additions"
    aria-label="Conversation history"
>
    {messages.map(msg => <MessageBubble key={msg.id} {...msg} />)}
</div>
```

## Security Features

### Authentication
- OAuth 2.0 + OIDC with PKCE
- JWT tokens (short-lived access, refresh rotation)
- Session management (secure cookies, httpOnly, sameSite)

### Authorization
- RBAC enforcement at API layer
- Object-level permissions (user can only access their files)
- Audit all permission checks

### File Upload Security
- Server-side type validation (magic bytes, not Content-Type)
- File size limits (client + server)
- Virus scanning queue
- Content Security Policy headers
- Rename uploaded files (prevent path traversal)

### Web Hardening
```http
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-{random}'; connect-src 'self' wss://chat.minima.ai
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

### Embed Security
```html
<!-- iframe sandbox -->
<iframe
    sandbox="allow-scripts allow-same-origin allow-forms"
    allow="clipboard-write"
    referrerpolicy="no-referrer"
></iframe>
```

## Performance Optimizations

### Virtualization
- Queue table: react-window or @tanstack/react-virtual
- Chat history: Only render visible messages
- Infinite scroll with Intersection Observer

### Code Splitting
```tsx
// Lazy load heavy pages
const JobDetailPage = lazy(() => import('./pages/JobDetailPage'));
const AuditLogsPage = lazy(() => import('./pages/AuditLogsPage'));
```

### API Optimization
- Pagination (cursor-based for logs)
- Field selection (GraphQL or sparse fieldsets)
- Caching headers (ETags, Cache-Control)
- WebSocket for real-time updates (avoid polling)

## Timeline Estimate

### Phase 1: Admin Console (4-6 weeks)
- Week 1-2: Core layout + file intake + queue table
- Week 3-4: RBAC UI + audit logs + job detail
- Week 5-6: Accessibility audit + testing

### Phase 2: Chat Widget (3-4 weeks)
- Week 1-2: Web Component + iframe versions
- Week 3: SDK wrapper + theming system
- Week 4: Integration testing + docs

### Phase 3: Backend (3-5 weeks)
- Week 1-2: User/role/audit services
- Week 3: Enhanced file API + metadata
- Week 4-5: Security hardening + load testing

**Total: 10-15 weeks** for full implementation

## Immediate Next Steps

1. ✅ **Review & approve** this plan
2. 🔨 **Create admin console** skeleton (React + TypeScript + MUI)
3. 🔨 **Create chat widget** Web Component
4. 🔨 **Add RBAC tables** to MySQL
5. 🔨 **Implement audit middleware** for all services
6. 📝 **Document embedding** guide for chat widget
7. ✅ **Accessibility testing** with screen readers
8. ✅ **Security review** (penetration testing)
9. 📊 **Performance testing** (load, stress)
10. 🚀 **Staging deployment** + beta testing

## References
- WCAG 2.2: https://www.w3.org/TR/WCAG22/
- ARIA Patterns: https://www.w3.org/WAI/ARIA/apg/
- OWASP Top 10: https://owasp.org/www-project-top-ten/
- Web Components: https://developer.mozilla.org/en-US/docs/Web/API/Web_components

---

**Status**: Planning Complete - Ready for Implementation  
**Approved By**: [Pending]  
**Start Date**: [TBD]
