CREATE TABLE IF NOT EXISTS api_rate_limits (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ip_address VARCHAR(45) NOT NULL,
    request_count INT DEFAULT 1,
    window_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (ip_address)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add indexes for performance optimization
-- ensure indexes exist on foreign keys which are often queried
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);

CREATE INDEX idx_teacher_assignments_status ON teacher_assignments(status);
CREATE INDEX idx_teacher_assignments_teacher_id ON teacher_assignments(teacher_id);
CREATE INDEX idx_teacher_assignments_subject_id ON teacher_assignments(subject_id);

CREATE INDEX idx_user_assignments_status ON user_assignments(status);
CREATE INDEX idx_user_assignments_user_id ON user_assignments(user_id);
CREATE INDEX idx_user_assignments_section_id ON user_assignments(section_id);
