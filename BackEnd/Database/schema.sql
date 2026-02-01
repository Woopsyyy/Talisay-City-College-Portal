-- ============================================
-- TCC Portal Database Schema (MySQL)
-- Talisay City College Management System
-- ============================================

-- Drop existing database if needed and create fresh
-- Note: In shared hosting or some managed environments, you might need to create the DB manually.
CREATE DATABASE IF NOT EXISTS tccportal CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE tccportal;

-- ============================================
-- CORE TABLES
-- ============================================

-- Users Table (Students, Teachers, Admin, GO)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role ENUM('student', 'teacher', 'admin', 'go') DEFAULT 'student',
    school_id VARCHAR(50) DEFAULT NULL,
    image_path VARCHAR(255) DEFAULT '/images/sample.jpg',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_school_id (school_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sections Table
CREATE TABLE IF NOT EXISTS sections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    section_name VARCHAR(50) UNIQUE NOT NULL,
    grade_level VARCHAR(20) NOT NULL,
    school_year VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_section_name (section_name),
    INDEX idx_school_year (school_year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Subjects Table
CREATE TABLE IF NOT EXISTS subjects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    subject_code VARCHAR(20) UNIQUE NOT NULL,
    subject_name VARCHAR(100) NOT NULL,
    description TEXT,
    units INT DEFAULT 3,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_subject_code (subject_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Buildings Table
CREATE TABLE IF NOT EXISTS buildings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    building_name VARCHAR(50) UNIQUE NOT NULL,
    num_floors INT NOT NULL DEFAULT 1,
    rooms_per_floor INT NOT NULL DEFAULT 10,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_building_name (building_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- ASSIGNMENT TABLES
-- ============================================

-- User Assignments (Students to Sections)
CREATE TABLE IF NOT EXISTS user_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    section_id INT NOT NULL,
    assignment_type ENUM('primary', 'secondary') DEFAULT 'primary',
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_section (user_id, section_id),
    INDEX idx_user_id (user_id),
    INDEX idx_section_id (section_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Teacher Assignments (Teachers to Subjects and Sections)
CREATE TABLE IF NOT EXISTS teacher_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    teacher_id INT NOT NULL,
    subject_id INT NOT NULL,
    section_id INT NOT NULL,
    school_year VARCHAR(20) NOT NULL,
    semester ENUM('1st', '2nd', 'summer') DEFAULT '1st',
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE,
    INDEX idx_teacher_id (teacher_id),
    INDEX idx_subject_id (subject_id),
    INDEX idx_section_id (section_id),
    INDEX idx_school_year (school_year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Section Room Assignments
CREATE TABLE IF NOT EXISTS section_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    section_id INT NOT NULL,
    building_id INT NOT NULL,
    floor_number INT NOT NULL,
    room_number INT NOT NULL,
    school_year VARCHAR(20) NOT NULL,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE,
    FOREIGN KEY (building_id) REFERENCES buildings(id) ON DELETE CASCADE,
    UNIQUE KEY unique_room_assignment (building_id, floor_number, room_number, school_year),
    INDEX idx_section_id (section_id),
    INDEX idx_building_id (building_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- SCHEDULE & ATTENDANCE
-- ============================================

-- Schedules Table
CREATE TABLE IF NOT EXISTS schedules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    teacher_assignment_id INT NOT NULL,
    day_of_week ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday') NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    room_id INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_assignment_id) REFERENCES teacher_assignments(id) ON DELETE CASCADE,
    INDEX idx_teacher_assignment (teacher_assignment_id),
    INDEX idx_day_of_week (day_of_week)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Attendance Logs
CREATE TABLE IF NOT EXISTS attendance_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    schedule_id INT NOT NULL,
    attendance_date DATE NOT NULL,
    check_in_time DATETIME,
    check_out_time DATETIME,
    status ENUM('present', 'absent', 'late', 'excused') DEFAULT 'absent',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE,
    UNIQUE KEY unique_attendance (user_id, schedule_id, attendance_date),
    INDEX idx_user_id (user_id),
    INDEX idx_schedule_id (schedule_id),
    INDEX idx_attendance_date (attendance_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- ACADEMIC RECORDS
-- ============================================

-- Grades Table
CREATE TABLE IF NOT EXISTS grades (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    subject_id INT NOT NULL,
    teacher_id INT NOT NULL,
    section_id INT NOT NULL,
    school_year VARCHAR(20) NOT NULL,
    semester ENUM('1st', '2nd', 'summer') DEFAULT '1st',
    prelim_grade DECIMAL(5,2) DEFAULT NULL,
    midterm_grade DECIMAL(5,2) DEFAULT NULL,
    finals_grade DECIMAL(5,2) DEFAULT NULL,
    final_grade DECIMAL(5,2) DEFAULT NULL,
    remarks VARCHAR(50) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE,
    UNIQUE KEY unique_grade_record (student_id, subject_id, school_year, semester),
    INDEX idx_student_id (student_id),
    INDEX idx_subject_id (subject_id),
    INDEX idx_teacher_id (teacher_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Study Load (Enrolled Subjects per Student)
CREATE TABLE IF NOT EXISTS study_load (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    subject_id INT NOT NULL,
    section_id INT NOT NULL,
    school_year VARCHAR(20) NOT NULL,
    semester ENUM('1st', '2nd', 'summer') DEFAULT '1st',
    enrollment_status ENUM('enrolled', 'dropped', 'completed') DEFAULT 'enrolled',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE,
    UNIQUE KEY unique_enrollment (student_id, subject_id, school_year, semester),
    INDEX idx_student_id (student_id),
    INDEX idx_subject_id (subject_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- PROJECTS & ANNOUNCEMENTS
-- ============================================

-- Projects Table
CREATE TABLE IF NOT EXISTS projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    teacher_id INT NOT NULL,
    subject_id INT NOT NULL,
    section_id INT NOT NULL,
    due_date DATETIME,
    max_score INT DEFAULT 100,
    status ENUM('draft', 'published', 'closed') DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE,
    INDEX idx_teacher_id (teacher_id),
    INDEX idx_subject_id (subject_id),
    INDEX idx_section_id (section_id),
    INDEX idx_due_date (due_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Announcements Table
CREATE TABLE IF NOT EXISTS announcements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    author_id INT NOT NULL,
    target_role ENUM('all', 'student', 'teacher', 'admin') DEFAULT 'all',
    priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
    is_published BOOLEAN DEFAULT TRUE,
    published_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_author_id (author_id),
    INDEX idx_target_role (target_role),
    INDEX idx_published_at (published_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- EVALUATION SYSTEM
-- ============================================

-- Evaluation Settings
CREATE TABLE IF NOT EXISTS evaluation_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(50) UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Teacher Evaluations
CREATE TABLE IF NOT EXISTS teacher_evaluations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    teacher_id INT NOT NULL,
    student_id INT NOT NULL,
    subject_id INT NOT NULL,
    school_year VARCHAR(20) NOT NULL,
    semester ENUM('1st', '2nd', 'summer') DEFAULT '1st',
    rating_teaching_quality INT CHECK (rating_teaching_quality BETWEEN 1 AND 5),
    rating_communication INT CHECK (rating_communication BETWEEN 1 AND 5),
    rating_preparation INT CHECK (rating_preparation BETWEEN 1 AND 5),
    rating_responsiveness INT CHECK (rating_responsiveness BETWEEN 1 AND 5),
    rating_overall INT CHECK (rating_overall BETWEEN 1 AND 5),
    comments TEXT,
    is_anonymous BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    UNIQUE KEY unique_evaluation (teacher_id, student_id, subject_id, school_year, semester),
    INDEX idx_teacher_id (teacher_id),
    INDEX idx_student_id (student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- VIEWS FOR REPORTING
-- ============================================

-- View: Student Grade Report
CREATE OR REPLACE VIEW view_student_grades AS
SELECT 
    u.id AS student_id,
    u.username,
    u.full_name AS student_name,
    u.school_id,
    sub.subject_code,
    sub.subject_name,
    g.school_year,
    g.semester,
    g.prelim_grade,
    g.midterm_grade,
    g.finals_grade,
    g.final_grade,
    g.remarks,
    t.full_name AS teacher_name,
    sec.section_name
FROM grades g
INNER JOIN users u ON g.student_id = u.id
INNER JOIN subjects sub ON g.subject_id = sub.id
INNER JOIN users t ON g.teacher_id = t.id
INNER JOIN sections sec ON g.section_id = sec.id;

-- View: Teacher Schedule Overview
CREATE OR REPLACE VIEW view_teacher_schedules AS
SELECT 
    u.id AS teacher_id,
    u.full_name AS teacher_name,
    sub.subject_code,
    sub.subject_name,
    sec.section_name,
    sch.day_of_week,
    sch.start_time,
    sch.end_time,
    ta.school_year,
    ta.semester
FROM schedules sch
INNER JOIN teacher_assignments ta ON sch.teacher_assignment_id = ta.id
INNER JOIN users u ON ta.teacher_id = u.id
INNER JOIN subjects sub ON ta.subject_id = sub.id
INNER JOIN sections sec ON ta.section_id = sec.id
WHERE ta.status = 'active';

-- View: Section Student List
CREATE OR REPLACE VIEW view_section_students AS
SELECT 
    sec.id AS section_id,
    sec.section_name,
    sec.grade_level,
    sec.school_year,
    u.id AS student_id,
    u.username,
    u.full_name AS student_name,
    u.school_id,
    u.email,
    ua.status AS assignment_status
FROM user_assignments ua
INNER JOIN users u ON ua.user_id = u.id
INNER JOIN sections sec ON ua.section_id = sec.id
WHERE u.role = 'student' AND ua.status = 'active';

-- ============================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================

-- Insert default admin user (password: admin123)
INSERT IGNORE INTO users (username, password, email, full_name, role, school_id) VALUES
('admin', '$2y$12$vD6jU8MQMTbWiDhw0H9eh.0zvpgQ0uLdE3UrTBIMGP1cJOCqVCX4G', 'admin@tcc.edu.ph', 'System Administrator', 'admin', 'ADMIN001');

-- Insert sample teacher (password: teacher123)
INSERT IGNORE INTO users (username, password, email, full_name, role, school_id) VALUES
('jdoe', '$2y$12$vQCHb9DzMl/gKCAYTN14WufRaL6n9MWjTW3fUZ1jQFMAK82KmmOQS', 'jdoe@tcc.edu.ph', 'John Doe', 'teacher', 'T001');

-- Insert sample student (password: student123)
INSERT IGNORE INTO users (username, password, email, full_name, role, school_id) VALUES
('jsmith', '$2y$12$xkVlxjqeLL83BmmLwDkSWOnxKNXVfzCCiDjxMzqygn/LJnOZmjJBS', 'jsmith@tcc.edu.ph', 'Jane Smith', 'student', 'S2024001');

-- Insert sample sections
INSERT IGNORE INTO sections (section_name, grade_level, school_year) VALUES
('BSIT-1A', '1st Year', '2024-2025'),
('BSIT-2A', '2nd Year', '2024-2025'),
('BSCS-1A', '1st Year', '2024-2025');

-- Insert sample subjects
INSERT IGNORE INTO subjects (subject_code, subject_name, description, units) VALUES
('CS101', 'Introduction to Computing', 'Basic computer concepts and programming', 3),
('MATH101', 'College Algebra', 'Fundamental algebra concepts', 3),
('ENG101', 'English Communication', 'Communication skills development', 3),
('PE101', 'Physical Education', 'Physical fitness and sports', 2);

-- Insert sample buildings
INSERT IGNORE INTO buildings (building_name, num_floors, rooms_per_floor, description) VALUES
('Main Building', 3, 10, 'Primary academic building'),
('Science Building', 2, 8, 'Laboratory and science classrooms'),
('IT Building', 4, 12, 'Information Technology facilities');

-- Insert evaluation settings
INSERT IGNORE INTO evaluation_settings (setting_key, setting_value, description) VALUES
('evaluation_enabled', 'true', 'Enable/disable teacher evaluation system'),
('evaluation_period_start', '2024-11-01', 'Start date for evaluation period'),
('evaluation_period_end', '2024-11-30', 'End date for evaluation period'),
('min_evaluations_required', '10', 'Minimum number of evaluations per teacher');
