-- Fix assignments constraints to allow string-based sections or optional section_id
USE TccPortal;

-- Modify user_assignments
ALTER TABLE user_assignments MODIFY COLUMN section_id INT NULL;
ALTER TABLE user_assignments ADD COLUMN IF NOT EXISTS section VARCHAR(50);

-- Modify teacher_assignments
ALTER TABLE teacher_assignments MODIFY COLUMN section_id INT NULL;
ALTER TABLE teacher_assignments MODIFY COLUMN school_year VARCHAR(20) NULL;
ALTER TABLE teacher_assignments ADD COLUMN IF NOT EXISTS section VARCHAR(50);
