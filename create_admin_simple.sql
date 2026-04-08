-- ==========================================
-- QUICK FIX: Create admin user with simple password
-- ==========================================
-- This script creates the admin user with password: admin
-- (without bcrypt, for immediate testing)

USE minima_db;

-- Delete existing admin if present
DELETE FROM user_roles WHERE user_id = 'admin';
DELETE FROM users WHERE user_id = 'admin';

-- Create admin with PLAIN TEXT password for testing
-- Password: admin (not hashed - for development only!)
INSERT INTO users (user_id, username, password_hash, email, full_name, is_active, is_superuser)
VALUES (
    'admin',
    'admin',
    'admin',  -- PLAIN TEXT - change this in production!
    'admin@minima.local',
    'System Administrator',
    1,
    1
);

-- Assign superadmin role
INSERT INTO user_roles (user_id, role_id, assigned_by)
SELECT 'admin', role_id, 'system'
FROM roles
WHERE role_name = 'superadmin';

SELECT 'Admin user created with password: admin' AS status;
SELECT 'Login at http://localhost:3001' AS next_step;
SELECT 'WARNING: This uses plain text password - for testing only!' AS warning;
