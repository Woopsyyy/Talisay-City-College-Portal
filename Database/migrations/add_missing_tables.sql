-- Add missing tables and update existing ones for TCC Portal

USE TccPortal;

-- Update subjects table to include course, major, year_level, semester
ALTER TABLE subjects 
ADD COLUMN IF NOT EXISTS title VARCHAR(100) AFTER subject_code,
ADD COLUMN IF NOT EXISTS course VARCHAR(50) AFTER units,
ADD COLUMN IF NOT EXISTS major VARCHAR(50) AFTER course,
ADD COLUMN IF NOT EXISTS year_level INT AFTER major,
ADD COLUMN IF NOT EXISTS semester VARCHAR(20) AFTER year_level;

-- Update user_assignments to include all required fields
ALTER TABLE user_assignments 
ADD COLUMN IF NOT EXISTS year_level INT AFTER section_id,
ADD COLUMN IF NOT EXISTS section VARCHAR(50) AFTER year_level,
ADD COLUMN IF NOT EXISTS department VARCHAR(100) AFTER section,
ADD COLUMN IF NOT EXISTS major VARCHAR(100) AFTER department,
ADD COLUMN IF NOT EXISTS payment ENUM('paid', 'partial', 'unpaid') DEFAULT 'paid' AFTER major,
ADD COLUMN IF NOT EXISTS amount_lacking DECIMAL(10,2) DEFAULT 0 AFTER payment,
ADD COLUMN IF NOT EXISTS sanctions BOOLEAN DEFAULT FALSE AFTER amount_lacking,
ADD COLUMN IF NOT EXISTS sanction_reason TEXT AFTER sanctions;

-- Create study_load table
CREATE TABLE IF NOT EXISTS study_load (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course VARCHAR(50) NOT NULL,
    major VARCHAR(50) DEFAULT '',
    year_level INT NOT NULL,
    section VARCHAR(50) NOT NULL,
    subject_code VARCHAR(20) NOT NULL,
    subject_title VARCHAR(100) NOT NULL,
    units DECIMAL(3,1) NOT NULL,
    semester VARCHAR(20) NOT NULL,
    teacher VARCHAR(100) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_course_major (course, major),
    INDEX idx_year_section (year_level, section),
    INDEX idx_subject_code (subject_code),
    INDEX idx_semester (semester)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add index to subjects for better performance
ALTER TABLE subjects
ADD INDEX IF NOT EXISTS idx_course_year (course, year_level, semester);

-- Migration complete
SELECT 'Database schema updated successfully' AS message;
