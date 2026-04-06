CREATE DATABASE minima_db;
CREATE USER 'minima_user'@'%' IDENTIFIED BY 'minima_user';
GRANT ALL PRIVILEGES ON minima_db.* TO 'minima_user'@'%';
FLUSH PRIVILEGES;
