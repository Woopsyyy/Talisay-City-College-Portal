-- ============================================
-- COMMON SQL QUERIES FOR TCC PORTAL
-- Quick reference for frequently used queries
-- ============================================

-- ============================================
-- USER QUERIES
-- ============================================

-- Get all users with their roles
SELECT id, username, full_name, email, role, school_id, created_at
FROM users
ORDER BY role, full_name;

-- Get students only
SELECT id, username, full_name, email, school_id, created_at
FROM users
WHERE role = 'student'
ORDER BY full_name;

-- Get teachers only
SELECT id, username, full_name, email, school_id, created_at
FROM users
WHERE role = 'teacher'
ORDER BY full_name;

-- Search users by name or username
SELECT id, username, full_name, email, role
FROM users
WHERE full_name LIKE '%search_term%' 
   OR username LIKE '%search_term%'
ORDER BY full_name;

-- Get user with full details
SELECT u.*, 
       (SELECT COUNT(*) FROM user_assignments WHERE user_id = u.id) AS assignment_count
FROM users u
WHERE u.id = ?;

-- ============================================
-- SECTION & ENROLLMENT QUERIES
-- ============================================

-- Get all students in a specific section
SELECT u.id, u.username, u.full_name, u.school_id, u.email
FROM users u
INNER JOIN user_assignments ua ON u.id = ua.user_id
WHERE ua.section_id = ?
  AND ua.status = 'active'
ORDER BY u.full_name;

-- Get student's current section
SELECT s.id, s.section_name, s.grade_level, s.school_year
FROM sections s
INNER JOIN user_assignments ua ON s.id = ua.section_id
WHERE ua.user_id = ?
  AND ua.status = 'active'
LIMIT 1;

-- Get all sections with student counts
SELECT s.id, s.section_name, s.grade_level, s.school_year,
       COUNT(ua.user_id) AS student_count
FROM sections s
LEFT JOIN user_assignments ua ON s.id = ua.section_id AND ua.status = 'active'
GROUP BY s.id, s.section_name, s.grade_level, s.school_year
ORDER BY s.school_year DESC, s.section_name;

-- ============================================
-- TEACHER ASSIGNMENT QUERIES
-- ============================================

-- Get teacher's assigned subjects and sections
SELECT ta.id, 
       u.full_name AS teacher_name,
       sub.subject_code,
       sub.subject_name,
       sec.section_name,
       ta.school_year,
       ta.semester,
       ta.status
FROM teacher_assignments ta
INNER JOIN users u ON ta.teacher_id = u.id
INNER JOIN subjects sub ON ta.subject_id = sub.id
INNER JOIN sections sec ON ta.section_id = sec.id
WHERE ta.teacher_id = ?
  AND ta.status = 'active'
ORDER BY ta.school_year DESC, ta.semester, sub.subject_name;

-- Get all teachers assigned to a specific subject
SELECT DISTINCT u.id, u.username, u.full_name, u.email
FROM users u
INNER JOIN teacher_assignments ta ON u.id = ta.teacher_id
WHERE ta.subject_id = ?
  AND ta.status = 'active'
ORDER BY u.full_name;

-- ============================================
-- SCHEDULE QUERIES
-- ============================================

-- Get student's weekly schedule
SELECT DISTINCT
    sch.day_of_week,
    sch.start_time,
    sch.end_time,
    sub.subject_code,
    sub.subject_name,
    t.full_name AS teacher_name,
    sec.section_name
FROM study_load sl
INNER JOIN teacher_assignments ta ON sl.subject_id = ta.subject_id 
    AND sl.section_id = ta.section_id
INNER JOIN schedules sch ON ta.id = sch.teacher_assignment_id
INNER JOIN subjects sub ON sl.subject_id = sub.id
INNER JOIN sections sec ON sl.section_id = sec.id
INNER JOIN users t ON ta.teacher_id = t.id
WHERE sl.student_id = ?
  AND sl.enrollment_status = 'enrolled'
ORDER BY 
    FIELD(sch.day_of_week, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'),
    sch.start_time;

-- Get teacher's weekly schedule
SELECT 
    sch.day_of_week,
    sch.start_time,
    sch.end_time,
    sub.subject_code,
    sub.subject_name,
    sec.section_name,
    ta.school_year,
    ta.semester
FROM schedules sch
INNER JOIN teacher_assignments ta ON sch.teacher_assignment_id = ta.id
INNER JOIN subjects sub ON ta.subject_id = sub.id
INNER JOIN sections sec ON ta.section_id = sec.id
WHERE ta.teacher_id = ?
  AND ta.status = 'active'
ORDER BY 
    FIELD(sch.day_of_week, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'),
    sch.start_time;

-- ============================================
-- GRADE QUERIES
-- ============================================

-- Get student's grades for current semester
SELECT 
    sub.subject_code,
    sub.subject_name,
    g.prelim_grade,
    g.midterm_grade,
    g.finals_grade,
    g.final_grade,
    g.remarks,
    t.full_name AS teacher_name,
    g.school_year,
    g.semester
FROM grades g
INNER JOIN subjects sub ON g.subject_id = sub.id
INNER JOIN users t ON g.teacher_id = t.id
WHERE g.student_id = ?
  AND g.school_year = ?
  AND g.semester = ?
ORDER BY sub.subject_name;

-- Get all grades for a student
SELECT 
    sub.subject_code,
    sub.subject_name,
    g.prelim_grade,
    g.midterm_grade,
    g.finals_grade,
    g.final_grade,
    g.remarks,
    g.school_year,
    g.semester
FROM grades g
INNER JOIN subjects sub ON g.subject_id = sub.id
WHERE g.student_id = ?
ORDER BY g.school_year DESC, g.semester, sub.subject_name;

-- Get grades by teacher for a specific subject and section
SELECT 
    u.id AS student_id,
    u.school_id,
    u.full_name AS student_name,
    g.prelim_grade,
    g.midterm_grade,
    g.finals_grade,
    g.final_grade,
    g.remarks
FROM grades g
INNER JOIN users u ON g.student_id = u.id
WHERE g.teacher_id = ?
  AND g.subject_id = ?
  AND g.section_id = ?
  AND g.school_year = ?
  AND g.semester = ?
ORDER BY u.full_name;

-- Calculate class average for a subject
SELECT 
    AVG(final_grade) AS class_average,
    COUNT(*) AS total_students,
    SUM(CASE WHEN remarks = 'PASSED' THEN 1 ELSE 0 END) AS passed_count,
    SUM(CASE WHEN remarks = 'FAILED' THEN 1 ELSE 0 END) AS failed_count
FROM grades
WHERE subject_id = ?
  AND section_id = ?
  AND school_year = ?
  AND semester = ?
  AND final_grade IS NOT NULL;

-- ============================================
-- ATTENDANCE QUERIES
-- ============================================

-- Get student attendance for a date range
SELECT 
    al.attendance_date,
    al.check_in_time,
    al.check_out_time,
    al.status,
    sub.subject_code,
    sub.subject_name,
    sec.section_name
FROM attendance_logs al
INNER JOIN schedules sch ON al.schedule_id = sch.id
INNER JOIN teacher_assignments ta ON sch.teacher_assignment_id = ta.id
INNER JOIN subjects sub ON ta.subject_id = sub.id
INNER JOIN sections sec ON ta.section_id = sec.id
WHERE al.user_id = ?
  AND al.attendance_date BETWEEN ? AND ?
ORDER BY al.attendance_date DESC;

-- Get attendance summary for a student
SELECT 
    COUNT(*) AS total_days,
    SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) AS present_count,
    SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) AS absent_count,
    SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) AS late_count,
    SUM(CASE WHEN status = 'excused' THEN 1 ELSE 0 END) AS excused_count,
    ROUND((SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2) AS attendance_rate
FROM attendance_logs
WHERE user_id = ?
  AND attendance_date BETWEEN ? AND ?;

-- ============================================
-- ANNOUNCEMENT QUERIES
-- ============================================

-- Get active announcements for a specific role
SELECT id, title, content, published_at, priority, author_id
FROM announcements
WHERE is_published = TRUE
  AND (target_role = 'all' OR target_role = ?)
  AND (expires_at IS NULL OR expires_at > NOW())
ORDER BY 
    FIELD(priority, 'high', 'medium', 'low'),
    published_at DESC
LIMIT 10;

-- Get all announcements by author
SELECT id, title, content, target_role, priority, is_published, published_at, expires_at
FROM announcements
WHERE author_id = ?
ORDER BY published_at DESC;

-- ============================================
-- PROJECT QUERIES
-- ============================================

-- Get student's projects
SELECT DISTINCT
    p.id,
    p.title,
    p.description,
    p.due_date,
    p.max_score,
    p.status,
    sub.subject_code,
    sub.subject_name,
    t.full_name AS teacher_name
FROM projects p
INNER JOIN study_load sl ON p.subject_id = sl.subject_id 
    AND p.section_id = sl.section_id
INNER JOIN subjects sub ON p.subject_id = sub.id
INNER JOIN users t ON p.teacher_id = t.id
WHERE sl.student_id = ?
  AND sl.enrollment_status = 'enrolled'
  AND p.status = 'published'
ORDER BY p.due_date ASC;

-- Get teacher's projects
SELECT 
    p.id,
    p.title,
    p.description,
    p.due_date,
    p.max_score,
    p.status,
    sub.subject_code,
    sub.subject_name,
    sec.section_name
FROM projects p
INNER JOIN subjects sub ON p.subject_id = sub.id
INNER JOIN sections sec ON p.section_id = sec.id
WHERE p.teacher_id = ?
ORDER BY p.due_date DESC;

-- ============================================
-- BUILDING & ROOM QUERIES
-- ============================================

-- Get all buildings with room assignments
SELECT 
    b.id,
    b.building_name,
    b.num_floors,
    b.rooms_per_floor,
    COUNT(DISTINCT sa.id) AS assigned_rooms
FROM buildings b
LEFT JOIN section_assignments sa ON b.id = sa.building_id AND sa.status = 'active'
GROUP BY b.id, b.building_name, b.num_floors, b.rooms_per_floor
ORDER BY b.building_name;

-- Get room assignment details
SELECT 
    sa.id,
    b.building_name,
    sa.floor_number,
    sa.room_number,
    sec.section_name,
    sec.grade_level,
    sa.school_year
FROM section_assignments sa
INNER JOIN buildings b ON sa.building_id = b.id
INNER JOIN sections sec ON sa.section_id = sec.id
WHERE sa.status = 'active'
ORDER BY b.building_name, sa.floor_number, sa.room_number;

-- ============================================
-- EVALUATION QUERIES
-- ============================================

-- Get teacher evaluation statistics
SELECT 
    t.id AS teacher_id,
    t.full_name AS teacher_name,
    COUNT(te.id) AS total_evaluations,
    ROUND(AVG(te.rating_overall), 2) AS avg_overall_rating,
    ROUND(AVG(te.rating_teaching_quality), 2) AS avg_teaching_quality,
    ROUND(AVG(te.rating_communication), 2) AS avg_communication,
    ROUND(AVG(te.rating_preparation), 2) AS avg_preparation,
    ROUND(AVG(te.rating_responsiveness), 2) AS avg_responsiveness
FROM users t
LEFT JOIN teacher_evaluations te ON t.id = te.teacher_id
WHERE t.role = 'teacher'
GROUP BY t.id, t.full_name
ORDER BY avg_overall_rating DESC;

-- Get lowest rated teachers
SELECT 
    t.id AS teacher_id,
    t.full_name AS teacher_name,
    COUNT(te.id) AS evaluation_count,
    ROUND(AVG(te.rating_overall), 2) AS avg_rating
FROM users t
INNER JOIN teacher_evaluations te ON t.id = te.teacher_id
WHERE t.role = 'teacher'
GROUP BY t.id, t.full_name
HAVING COUNT(te.id) >= 5
ORDER BY avg_rating ASC
LIMIT 10;

-- Check if student has evaluated a teacher
SELECT COUNT(*) AS has_evaluated
FROM teacher_evaluations
WHERE teacher_id = ?
  AND student_id = ?
  AND subject_id = ?
  AND school_year = ?
  AND semester = ?;

-- ============================================
-- STATISTICS & REPORTS
-- ============================================

-- Get system statistics (Dashboard)
SELECT 
    (SELECT COUNT(*) FROM users WHERE role = 'student') AS total_students,
    (SELECT COUNT(*) FROM users WHERE role = 'teacher') AS total_teachers,
    (SELECT COUNT(*) FROM sections) AS total_sections,
    (SELECT COUNT(*) FROM subjects) AS total_subjects,
    (SELECT COUNT(*) FROM buildings) AS total_buildings,
    (SELECT COUNT(*) FROM announcements WHERE is_published = TRUE) AS active_announcements;

-- Get enrollment summary by section
SELECT 
    s.section_name,
    s.grade_level,
    s.school_year,
    COUNT(DISTINCT ua.user_id) AS enrolled_students,
    COUNT(DISTINCT ta.teacher_id) AS assigned_teachers
FROM sections s
LEFT JOIN user_assignments ua ON s.id = ua.section_id AND ua.status = 'active'
LEFT JOIN teacher_assignments ta ON s.id = ta.section_id AND ta.status = 'active'
GROUP BY s.id, s.section_name, s.grade_level, s.school_year
ORDER BY s.school_year DESC, s.section_name;

-- ============================================
-- END OF COMMON QUERIES
-- ============================================
