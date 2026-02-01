USE TccPortal;

ALTER TABLE teacher_assignments 
ADD COLUMN status ENUM('active', 'inactive') DEFAULT 'active';
