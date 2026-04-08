-- ==========================================
-- Minima Admin - Database Initialization
-- ==========================================

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS minima_db;

-- Create user if not exists (MySQL 8.0+ syntax)
CREATE USER IF NOT EXISTS 'minima_user'@'%' IDENTIFIED BY 'minima_user';
GRANT ALL PRIVILEGES ON minima_db.* TO 'minima_user'@'%';
FLUSH PRIVILEGES;

-- Use the database
USE minima_db;

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
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIxKTZn2Y2',  -- Admin@123
    'admin@minima.local',
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
    ('test', 'test', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIxKTZn2Y2', 
     'test@minima.local', 'Test User', TRUE, FALSE),
    ('operator1', 'operator1', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIxKTZn2Y2',
     'operator1@minima.local', 'Operator One', TRUE, FALSE),
    ('viewer1', 'viewer1', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIxKTZn2Y2',
     'viewer1@minima.local', 'Viewer One', TRUE, FALSE);

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
GRANT SELECT, INSERT, UPDATE, DELETE ON minima_db.users TO 'minima_user'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON minima_db.roles TO 'minima_user'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON minima_db.user_roles TO 'minima_user'@'%';
FLUSH PRIVILEGES;

-- ==========================================
-- Success Message
-- ==========================================
SELECT '✅ Database initialization complete!' AS status;
SELECT 'Super user created: admin / Admin@123' AS credentials;
SELECT 'Test users: test, operator1, viewer1 (all with password: Test@123)' AS test_accounts;
SELECT '⚠️  IMPORTANT: Change default passwords in production!' AS warning;
