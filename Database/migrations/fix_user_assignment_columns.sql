-- Force modify columns to ensure they are correct types, handling case where they exist but are wrong
USE TccPortal;

ALTER TABLE user_assignments MODIFY COLUMN payment VARCHAR(20) DEFAULT 'paid';
ALTER TABLE user_assignments MODIFY COLUMN year_level VARCHAR(20) DEFAULT NULL;
ALTER TABLE user_assignments MODIFY COLUMN section VARCHAR(50) DEFAULT NULL;
ALTER TABLE user_assignments MODIFY COLUMN department VARCHAR(100) DEFAULT NULL;
ALTER TABLE user_assignments MODIFY COLUMN major VARCHAR(100) DEFAULT NULL;
