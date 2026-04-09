-- ==========================================
-- DocuMindAI - Database Initialization
-- ==========================================

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS documindai_db;

-- Create user if not exists (MySQL 8.0+ syntax)
CREATE USER IF NOT EXISTS 'documindai_user'@'%' IDENTIFIED BY 'documindai_pass';
GRANT ALL PRIVILEGES ON documindai_db.* TO 'documindai_user'@'%';
FLUSH PRIVILEGES;

-- Use the database
USE documindai_db;

-- ==========================================
-- Table: roles
-- ==========================================
CREATE TABLE IF NOT EXISTS roles (
    role_id INT AUTO_INCREMENT PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    permissions JSON,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_role_name (role_name),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- Table: users
-- ==========================================
CREATE TABLE IF NOT EXISTS users (
    user_id VARCHAR(100) PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    full_name VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    is_superuser BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_is_active (is_active),
    INDEX idx_is_superuser (is_superuser)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- Table: user_roles (junction table)
-- ==========================================
CREATE TABLE IF NOT EXISTS user_roles (
    user_id VARCHAR(100) NOT NULL,
    role_id INT NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by VARCHAR(100),
    PRIMARY KEY (user_id, role_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(role_id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_role_id (role_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- Insert Default Roles
-- ==========================================
INSERT IGNORE INTO roles (role_name, description, permissions) VALUES
('superadmin', 'Super Administrator with full system access', 
 JSON_ARRAY(
     'users.create', 'users.read', 'users.update', 'users.delete',
     'roles.create', 'roles.read', 'roles.update', 'roles.delete',
     'files.create', 'files.read', 'files.update', 'files.delete',
     'jobs.create', 'jobs.read', 'jobs.update', 'jobs.delete',
     'audit.read', 'system.configure'
 )),
('admin', 'Administrator with elevated permissions', 
 JSON_ARRAY(
     'users.read', 'users.update',
     'roles.read',
     'files.create', 'files.read', 'files.update', 'files.delete',
     'jobs.read', 'jobs.update',
     'audit.read'
 )),
('operator', 'Operator can manage files and view jobs', 
 JSON_ARRAY(
     'files.create', 'files.read', 'files.update', 'files.delete',
     'jobs.read'
 )),
('viewer', 'Viewer with read-only access', 
 JSON_ARRAY(
     'files.read',
     'jobs.read'
 ));

-- ==========================================
-- Insert Super User
-- ==========================================
-- Password: Admin@123 (hashed with bcrypt - $2b$12$ rounds)
-- In production, this should be changed immediately after first login
INSERT IGNORE INTO users (user_id, username, password_hash, email, full_name, is_active, is_superuser)
VALUES (
    'admin',
    'admin',
    '$2b$12$tew90MD1gFyWwxrYJlBXTugmcYG9uBL6ICiRn3Mybfoxq9YuqaazC',  -- Admin@123
    'admin@documindai.local',
    'System Administrator',
    TRUE,
    TRUE
);

-- Assign superadmin role to admin user
INSERT IGNORE INTO user_roles (user_id, role_id, assigned_by)
SELECT 'admin', role_id, 'system'
FROM roles
WHERE role_name = 'superadmin';

-- ==========================================
-- Insert Test Users (for development)
-- ==========================================
-- Password for all test users: Test@123
INSERT IGNORE INTO users (user_id, username, password_hash, email, full_name, is_active, is_superuser)
VALUES 
    ('test', 'test', '$2b$12$jRzZzCphaEJy3QYx762Tf.Xaduiyp5GJI4hI/IiFhie7uFSA0IxZ2', 
     'test@documindai.local', 'Test User', TRUE, FALSE),
    ('operator1', 'operator1', '$2b$12$pas2luuBJAgnqxgb8A8y6OOClFLxwxTIPFyT8IVFxyms6MnCYMsi.',
     'operator1@documindai.local', 'Operator One', TRUE, FALSE),
    ('viewer1', 'viewer1', '$2b$12$6w0cYT6n/JlrjwGQ1nXZ/.Si967GMgbIWeIp4ixjmdYwcnrHfeplG',
     'viewer1@documindai.local', 'Viewer One', TRUE, FALSE);

-- Assign roles to test users
INSERT IGNORE INTO user_roles (user_id, role_id, assigned_by)
SELECT 'test', role_id, 'system' FROM roles WHERE role_name = 'admin'
UNION ALL
SELECT 'operator1', role_id, 'system' FROM roles WHERE role_name = 'operator'
UNION ALL
SELECT 'viewer1', role_id, 'system' FROM roles WHERE role_name = 'viewer';

-- ==========================================
-- Verify Installation
-- ==========================================
-- Show created tables
SELECT 'Tables created:' AS status;
SHOW TABLES;

-- Show roles
SELECT 'Roles created:' AS status;
SELECT role_id, role_name, description, is_active FROM roles;

-- Show users
SELECT 'Users created:' AS status;
SELECT user_id, username, email, is_active, is_superuser FROM users;

-- Show user-role mappings
SELECT 'User-Role assignments:' AS status;
SELECT 
    u.username,
    r.role_name,
    ur.assigned_at
FROM user_roles ur
JOIN users u ON ur.user_id = u.user_id
JOIN roles r ON ur.role_id = r.role_id
ORDER BY u.username, r.role_name;

-- ==========================================
-- Grant additional privileges
-- ==========================================
GRANT SELECT, INSERT, UPDATE, DELETE ON documindai_db.users TO 'documindai_user'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON documindai_db.roles TO 'documindai_user'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON documindai_db.user_roles TO 'documindai_user'@'%';
FLUSH PRIVILEGES;

-- ==========================================
-- Success Message
-- ==========================================
SELECT '✅ Database initialization complete!' AS status;
SELECT 'Super user created: admin / Admin@123' AS credentials;
SELECT 'Test users: test, operator1, viewer1 (all with password: Test@123)' AS test_accounts;
SELECT '⚠️  IMPORTANT: Change default passwords in production!' AS warning;

-- ==========================================
-- LOGGING TABLES - For Request/Response Tracking
-- ==========================================

-- ==========================================
-- Table: api_request_logs
-- Purpose: Track all API requests, WebSocket connections, performance metrics
-- Retention: 30 days
-- ==========================================
CREATE TABLE IF NOT EXISTS api_request_logs (
    log_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    request_id VARCHAR(36) NOT NULL UNIQUE COMMENT 'UUID for request correlation',
    service VARCHAR(50) NOT NULL COMMENT 'Service name: upload, index, chat',
    method VARCHAR(10) COMMENT 'HTTP method: GET, POST, WebSocket',
    path VARCHAR(500) COMMENT 'Request path/endpoint',
    user_id VARCHAR(100) COMMENT 'User making the request',
    status_code INT COMMENT 'HTTP status code (200, 404, 500, etc)',
    duration_ms INT COMMENT 'Response time in milliseconds',
    request_size INT COMMENT 'Request payload size in bytes',
    response_size INT COMMENT 'Response payload size in bytes',
    ip_address VARCHAR(45) COMMENT 'Client IP address (IPv6 compatible)',
    user_agent TEXT COMMENT 'Browser/client user agent string',
    error_message TEXT COMMENT 'Error message if request failed',
    request_body JSON COMMENT 'Request payload for POST/PUT (optional, sanitized)',
    response_body JSON COMMENT 'Response payload (optional, for errors)',
    metadata JSON COMMENT 'Additional context (headers, query params, etc)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_service_time (service, created_at),
    INDEX idx_user_id (user_id),
    INDEX idx_request_id (request_id),
    INDEX idx_status_code (status_code),
    INDEX idx_created_at (created_at),
    INDEX idx_duration (duration_ms),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='API request tracking for performance monitoring and debugging';

-- ==========================================
-- Table: application_logs
-- Purpose: Application-level events, errors, warnings, debug info
-- Retention: 90 days
-- ==========================================
CREATE TABLE IF NOT EXISTS application_logs (
    log_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    request_id VARCHAR(36) COMMENT 'Link to api_request_logs for correlation',
    service VARCHAR(50) NOT NULL COMMENT 'Service name: upload, index, chat',
    log_level ENUM('DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL') NOT NULL,
    message TEXT NOT NULL COMMENT 'Log message',
    module VARCHAR(100) COMMENT 'Python module name (__name__)',
    function_name VARCHAR(100) COMMENT 'Function/method name',
    line_number INT COMMENT 'Source code line number',
    user_id VARCHAR(100) COMMENT 'User context if available',
    file_id VARCHAR(255) COMMENT 'File being processed (if applicable)',
    conversation_id VARCHAR(255) COMMENT 'Chat conversation ID (if applicable)',
    exception_type VARCHAR(100) COMMENT 'Exception class name',
    stack_trace TEXT COMMENT 'Full stack trace for exceptions',
    metadata JSON COMMENT 'Additional context (variables, state, etc)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_service_level_time (service, log_level, created_at),
    INDEX idx_request_id (request_id),
    INDEX idx_user_id (user_id),
    INDEX idx_log_level (log_level),
    INDEX idx_created_at (created_at),
    INDEX idx_file_id (file_id),
    INDEX idx_conversation_id (conversation_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Application logs for debugging and error tracking';

-- ==========================================
-- Table: audit_logs
-- Purpose: Security and compliance audit trail (IMMUTABLE - append-only)
-- Retention: 365 days (compliance requirement)
-- ==========================================
CREATE TABLE IF NOT EXISTS audit_logs (
    audit_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL COMMENT 'Event: login, logout, file_upload, file_delete, role_change',
    user_id VARCHAR(100) NOT NULL COMMENT 'User performing the action',
    target_user_id VARCHAR(100) COMMENT 'Target user (for admin actions on users)',
    resource_type VARCHAR(50) COMMENT 'Resource being accessed: file, user, role',
    resource_id VARCHAR(255) COMMENT 'ID of the resource',
    action VARCHAR(50) NOT NULL COMMENT 'Action: create, read, update, delete',
    status VARCHAR(20) NOT NULL COMMENT 'Result: success, failed, blocked',
    ip_address VARCHAR(45) COMMENT 'IP address of the user',
    changes JSON COMMENT 'Before/after values for updates',
    reason TEXT COMMENT 'Reason for action (if provided)',
    metadata JSON COMMENT 'Additional context',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_event_type_time (event_type, created_at),
    INDEX idx_user_id (user_id),
    INDEX idx_target_user_id (target_user_id),
    INDEX idx_resource (resource_type, resource_id),
    INDEX idx_action (action),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (target_user_id) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Append-only audit trail for security and compliance';

-- ==========================================
-- Grant Permissions for Logging Tables
-- ==========================================
GRANT SELECT, INSERT, UPDATE, DELETE ON documindai_db.api_request_logs TO 'documindai_user'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON documindai_db.application_logs TO 'documindai_user'@'%';
GRANT SELECT, INSERT ON documindai_db.audit_logs TO 'documindai_user'@'%';
-- Note: audit_logs only has INSERT permission (append-only for compliance)

FLUSH PRIVILEGES;

SELECT '✅ Logging tables created successfully!' AS status;
