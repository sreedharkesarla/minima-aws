-- Quick setup for local MySQL
-- Run this manually if auto-initialization fails

-- Create database and user
CREATE DATABASE IF NOT EXISTS minima_db;
CREATE USER IF NOT EXISTS 'minima_user'@'%' IDENTIFIED BY 'minima_user';
GRANT ALL PRIVILEGES ON minima_db.* TO 'minima_user'@'%';
FLUSH PRIVILEGES;

USE minima_db;

-- Create tables
CREATE TABLE IF NOT EXISTS roles (
    role_id INT AUTO_INCREMENT PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    permissions JSON,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS user_roles (
    user_id VARCHAR(100) NOT NULL,
    role_id INT NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by VARCHAR(100),
    PRIMARY KEY (user_id, role_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(role_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Insert default roles
INSERT IGNORE INTO roles (role_name, description, permissions) VALUES
('superadmin', 'Super Administrator', JSON_ARRAY('users.create','users.read','users.update','users.delete','roles.create','roles.read','roles.update','roles.delete','files.create','files.read','files.update','files.delete','jobs.create','jobs.read','jobs.update','jobs.delete','audit.read','system.configure')),
('admin', 'Administrator', JSON_ARRAY('users.read','users.update','roles.read','files.create','files.read','files.update','files.delete','jobs.read','jobs.update','audit.read')),
('operator', 'Operator', JSON_ARRAY('files.create','files.read','files.update','files.delete','jobs.read')),
('viewer', 'Viewer', JSON_ARRAY('files.read','jobs.read'));

-- Insert super user (password: Admin@123)
INSERT IGNORE INTO users (user_id, username, password_hash, email, full_name, is_active, is_superuser)
VALUES ('admin', 'admin', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIxKTZn2Y2', 'admin@minima.local', 'System Administrator', TRUE, TRUE);

-- Insert test users (password: Test@123)
INSERT IGNORE INTO users (user_id, username, password_hash, email, full_name, is_active, is_superuser)
VALUES 
    ('test', 'test', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIxKTZn2Y2', 'test@minima.local', 'Test User', TRUE, FALSE),
    ('operator1', 'operator1', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIxKTZn2Y2', 'operator1@minima.local', 'Operator One', TRUE, FALSE),
    ('viewer1', 'viewer1', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIxKTZn2Y2', 'viewer1@minima.local', 'Viewer One', TRUE, FALSE);

-- Assign roles
INSERT IGNORE INTO user_roles (user_id, role_id, assigned_by)
SELECT 'admin', role_id, 'system' FROM roles WHERE role_name = 'superadmin'
UNION ALL SELECT 'test', role_id, 'system' FROM roles WHERE role_name = 'admin'
UNION ALL SELECT 'operator1', role_id, 'system' FROM roles WHERE role_name = 'operator'
UNION ALL SELECT 'viewer1', role_id, 'system' FROM roles WHERE role_name = 'viewer';

SELECT 'Setup complete!' AS status;
