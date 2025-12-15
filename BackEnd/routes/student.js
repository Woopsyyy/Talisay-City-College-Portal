const express = require("express");
const db = require("../config/database");
const Logger = require("../config/logger");
const router = express.Router();

// Middleware to check if user is authenticated and is a student
const isStudent = (req, res, next) => {
  if (!req.session.user_id) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  // Allow all authenticated users to access student endpoints (students, teachers, admins can view student data)
  next();
};

// Get student's assignment (user_assignments for logged-in user)
router.get("/assignment", isStudent, async (req, res) => {
  try {
    const userId = req.session.user_id;
    const username = req.session.username;
    const fullName = req.session.full_name;

    // Try multiple lookup strategies
    let assignment = null;

    // Strategy 1: By user_id
    if (userId) {
      const result = await db.query(
        "SELECT id, user_id, username, year, section, department, major, payment, sanctions, owing_amount FROM user_assignments WHERE user_id = $1 LIMIT 1",
        [userId]
      );
      if (Array.isArray(result) && result.length > 0) {
        assignment = result[0];
      } else if (result && !Array.isArray(result)) {
        assignment = result;
      }
    }

    // Strategy 2: By exact username or full_name
    if (!assignment && username) {
      const result = await db.query(
        "SELECT id, user_id, username, year, section, department, major, payment, sanctions, owing_amount FROM user_assignments WHERE username = $1 OR username = $2 LIMIT 1",
        [username, fullName || username]
      );
      if (Array.isArray(result) && result.length > 0) {
        assignment = result[0];
      } else if (result && !Array.isArray(result)) {
        assignment = result;
      }
    }

    // Strategy 3: Fuzzy LIKE match
    if (!assignment && (username || fullName)) {
      const searchTerm = fullName || username;
      const result = await db.query(
        "SELECT id, user_id, username, year, section, department, major, payment, sanctions, owing_amount FROM user_assignments WHERE username LIKE $1 LIMIT 1",
        [`%${searchTerm}%`]
      );
      if (Array.isArray(result) && result.length > 0) {
        assignment = result[0];
      } else if (result && !Array.isArray(result)) {
        assignment = result;
      }
    }

    if (assignment) {
      res.json(assignment);
    } else {
      res.json(null);
    }
  } catch (error) {
    Logger.error("Get student assignment error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get student's grades
router.get("/grades", isStudent, async (req, res) => {
  try {
    const userId = req.session.user_id;
    const username = req.session.username;
    const fullName = req.session.full_name;

    // Build query with multiple matching strategies
    let conditions = [];
    let params = [];
    let paramIndex = 1;

    // Use user_id as primary identifier, fallback to username/full_name
    if (userId) {
      conditions.push(`sg.user_id = $${paramIndex++}`);
      params.push(userId);
    } else if (username) {
      conditions.push(`sg.username = $${paramIndex++}`);
      params.push(username);
    } else if (fullName) {
      conditions.push(`sg.username = $${paramIndex++}`);
      params.push(fullName);
    }

    if (conditions.length === 0) {
      return res.json([]);
    }

    const sql = `
      SELECT DISTINCT sg.id, sg.user_id, sg.username, sg.year, sg.semester, sg.subject, 
             sg.instructor, sg.prelim_grade, sg.midterm_grade, sg.finals_grade,
             CAST(sg.year AS INTEGER) AS year_int
      FROM student_grades sg
      WHERE (${conditions.join(" OR ")})
      ORDER BY year_int, sg.semester, sg.subject
    `;

    const grades = await db.query(sql, params);
    res.json(Array.isArray(grades) ? grades : grades ? [grades] : []);
  } catch (error) {
    Logger.error("Get student grades error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get student's study load
router.get("/study-load", async (req, res) => {
  try {
    const userId = req.session.user_id;
    const username = req.session.username;
    const fullName = req.session.full_name;

    if (!userId && !username && !fullName) {
      return res.json([]);
    }

    // First, get the student's assignment to find year, section, department, major
    let assignment = null;

    if (userId) {
      const result = await db.query(
        "SELECT year, section, department, major FROM user_assignments WHERE user_id = $1 LIMIT 1",
        [userId]
      );
      if (Array.isArray(result) && result.length > 0) {
        assignment = result[0];
      } else if (result && !Array.isArray(result)) {
        assignment = result;
      }
    }

    if (!assignment && (username || fullName)) {
      const searchTerm = fullName || username;
      const result = await db.query(
        "SELECT year, section, department, major FROM user_assignments WHERE username = $1 OR username = $2 OR username LIKE $3 LIMIT 1",
        [username, fullName || username, `%${searchTerm}%`]
      );
      if (Array.isArray(result) && result.length > 0) {
        assignment = result[0];
      } else if (result && !Array.isArray(result)) {
        assignment = result;
      }
    }

    if (
      !assignment ||
      !assignment.year ||
      !assignment.section ||
      !assignment.department
    ) {
      return res.json([]);
    }

    const course = (assignment.department || "")
      .toUpperCase()
      .replace("BSEED", "BSED");
    const major = assignment.major || "";
    const yearLevel = parseInt(assignment.year) || null;
    const section = assignment.section;

    if (!yearLevel) {
      return res.json([]);
    }

    // Try multiple query strategies
    let studyLoad = [];

    // Check if teacher_assignments table has new schema (teacher_name, subject_code) or old (username, subject)
    let hasNewSchema = false;
    try {
      const schemaCheck = await db.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'teacher_assignments' AND column_name IN ('teacher_name', 'subject_code')
      `);
      const columns = Array.isArray(schemaCheck)
        ? schemaCheck.map((c) => c.column_name)
        : schemaCheck?.column_name
        ? [schemaCheck.column_name]
        : [];
      hasNewSchema =
        columns.includes("teacher_name") && columns.includes("subject_code");
    } catch (err) {
      console.error("Error checking teacher_assignments schema:", err);
    }

    // Strategy 1: Exact match with major (if major is set)
    if (major) {
      let query;
      if (hasNewSchema) {
        // New schema: teacher_name, subject_code - also join with users to get full_name if teacher_name is username
        query = `
          SELECT 
            sl.subject_code, 
            sl.subject_title, 
            sl.units, 
            sl.semester, 
            COALESCE(
              NULLIF(TRIM(sl.teacher), ''), 
              NULLIF(TRIM(COALESCE(u.full_name, ta.teacher_name)), ''), 
              NULLIF(TRIM(ta.teacher_name), ''),
              ''
            ) as teacher
          FROM study_load sl
          LEFT JOIN teacher_assignments ta ON UPPER(TRIM(BOTH ' ' FROM sl.subject_code)) = UPPER(TRIM(BOTH ' ' FROM ta.subject_code))
          LEFT JOIN users u ON ta.user_id = u.id
          WHERE sl.course = $1 AND sl.major = $2 AND sl.year_level = $3 AND sl.section = $4
          ORDER BY sl.semester, sl.subject_code
        `;
      } else {
        // Old schema: username, subject - join with users to get full_name
        query = `
          SELECT 
            sl.subject_code, 
            sl.subject_title, 
            sl.units, 
            sl.semester, 
            COALESCE(
              NULLIF(TRIM(sl.teacher), ''), 
              NULLIF(TRIM(u.full_name), ''), 
              NULLIF(TRIM(ta.username), ''),
              ''
            ) as teacher
          FROM study_load sl
          LEFT JOIN teacher_assignments ta ON UPPER(TRIM(BOTH ' ' FROM sl.subject_code)) = UPPER(TRIM(BOTH ' ' FROM ta.subject))
          LEFT JOIN users u ON ta.username = u.username
          WHERE sl.course = $1 AND sl.major = $2 AND sl.year_level = $3 AND sl.section = $4
          ORDER BY sl.semester, sl.subject_code
        `;
      }

      const result = await db.query(query, [course, major, yearLevel, section]);
      if (Array.isArray(result)) {
        studyLoad = result;
      } else if (result) {
        studyLoad = [result];
      }
    }

    // Strategy 2: Case-insensitive major match
    if (studyLoad.length === 0 && major) {
      let query;
      if (hasNewSchema) {
        query = `
          SELECT 
            sl.subject_code, 
            sl.subject_title, 
            sl.units, 
            sl.semester, 
            COALESCE(
              NULLIF(TRIM(sl.teacher), ''), 
              NULLIF(TRIM(COALESCE(u.full_name, ta.teacher_name)), ''), 
              NULLIF(TRIM(ta.teacher_name), ''),
              ''
            ) as teacher
          FROM study_load sl
          LEFT JOIN teacher_assignments ta ON UPPER(TRIM(BOTH ' ' FROM sl.subject_code)) = UPPER(TRIM(BOTH ' ' FROM ta.subject_code))
          LEFT JOIN users u ON ta.user_id = u.id
          WHERE sl.course = $1 AND LOWER(TRIM(sl.major)) = LOWER(TRIM($2)) AND sl.year_level = $3 AND sl.section = $4
          ORDER BY sl.semester, sl.subject_code
        `;
      } else {
        query = `
          SELECT 
            sl.subject_code, 
            sl.subject_title, 
            sl.units, 
            sl.semester, 
            COALESCE(
              NULLIF(TRIM(sl.teacher), ''), 
              NULLIF(TRIM(u.full_name), ''), 
              NULLIF(TRIM(ta.username), ''),
              ''
            ) as teacher
          FROM study_load sl
          LEFT JOIN teacher_assignments ta ON UPPER(TRIM(BOTH ' ' FROM sl.subject_code)) = UPPER(TRIM(BOTH ' ' FROM ta.subject))
          LEFT JOIN users u ON ta.username = u.username
          WHERE sl.course = $1 AND LOWER(TRIM(sl.major)) = LOWER(TRIM($2)) AND sl.year_level = $3 AND sl.section = $4
          ORDER BY sl.semester, sl.subject_code
        `;
      }
      const result = await db.query(query, [course, major, yearLevel, section]);
      if (Array.isArray(result)) {
        studyLoad = result;
      } else if (result) {
        studyLoad = [result];
      }
    }

    // Strategy 3: Match without major (for courses that don't require major)
    if (studyLoad.length === 0) {
      let query;
      if (hasNewSchema) {
        query = `
          SELECT 
            sl.subject_code, 
            sl.subject_title, 
            sl.units, 
            sl.semester, 
            COALESCE(
              NULLIF(TRIM(sl.teacher), ''), 
              NULLIF(TRIM(COALESCE(u.full_name, ta.teacher_name)), ''), 
              NULLIF(TRIM(ta.teacher_name), ''),
              ''
            ) as teacher
          FROM study_load sl
          LEFT JOIN teacher_assignments ta ON UPPER(TRIM(BOTH ' ' FROM sl.subject_code)) = UPPER(TRIM(BOTH ' ' FROM ta.subject_code))
          LEFT JOIN users u ON ta.user_id = u.id
          WHERE sl.course = $1 AND sl.year_level = $2 AND sl.section = $3 
            AND (sl.major IS NULL OR TRIM(sl.major) = '' OR LOWER(TRIM(sl.major)) = 'general')
          ORDER BY sl.semester, sl.subject_code
        `;
      } else {
        query = `
          SELECT 
            sl.subject_code, 
            sl.subject_title, 
            sl.units, 
            sl.semester, 
            COALESCE(
              NULLIF(TRIM(sl.teacher), ''), 
              NULLIF(TRIM(u.full_name), ''), 
              NULLIF(TRIM(ta.username), ''),
              ''
            ) as teacher
          FROM study_load sl
          LEFT JOIN teacher_assignments ta ON UPPER(TRIM(BOTH ' ' FROM sl.subject_code)) = UPPER(TRIM(BOTH ' ' FROM ta.subject))
          LEFT JOIN users u ON ta.username = u.username
          WHERE sl.course = $1 AND sl.year_level = $2 AND sl.section = $3 
            AND (sl.major IS NULL OR TRIM(sl.major) = '' OR LOWER(TRIM(sl.major)) = 'general')
          ORDER BY sl.semester, sl.subject_code
        `;
      }
      const result = await db.query(query, [course, yearLevel, section]);
      if (Array.isArray(result)) {
        studyLoad = result;
      } else if (result) {
        studyLoad = [result];
      }
    }

    if (studyLoad.length > 0) {
      Logger.dataSaved("study_load", `${course}`);
    }

    res.json(studyLoad);
  } catch (error) {
    Logger.error("Get student study load error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get announcements (students can view all announcements)
// Note: Announcements are public, so we allow access even without strict student check
router.get("/announcements", async (req, res) => {
  try {
    const announcements = await db.query(
      "SELECT id, title, content, year, department, major, date FROM announcements ORDER BY date DESC"
    );

    const result = Array.isArray(announcements)
      ? announcements
      : announcements
      ? [announcements]
      : [];

    res.json(result);
  } catch (error) {
    Logger.error("Get student announcements error:", error);
    console.error("Error stack:", error.stack);
    res
      .status(500)
      .json({ error: "Internal server error", message: error.message });
  }
});

// Get projects (students can view all projects)
router.get("/projects", isStudent, async (req, res) => {
  try {
    // Reuse the admin projects endpoint logic
    const projects = await db.query(
      "SELECT id, name, budget, started, completed FROM projects ORDER BY started DESC"
    );
    res.json(Array.isArray(projects) ? projects : projects ? [projects] : []);
  } catch (error) {
    Logger.error("Get student projects error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get evaluation settings (check if enabled)
router.get("/evaluation-settings", async (req, res) => {
  try {
    // Ensure table exists first
    await db.query(`
      CREATE TABLE IF NOT EXISTS evaluation_settings (
        setting_key VARCHAR(100) PRIMARY KEY,
        setting_value VARCHAR(255) NOT NULL
      )
    `);

    const result = await db.query(
      "SELECT setting_value FROM evaluation_settings WHERE setting_key = 'evaluations_enabled' LIMIT 1"
    );
    const enabled =
      result && result.length > 0
        ? result[0].setting_value === "1" || result[0].setting_value === true
        : true;
    res.json({ enabled });
  } catch (error) {
    Logger.error("Get evaluation settings error:", error);
    res.json({ enabled: true });
  }
});

// Get teachers for student's section
router.get("/evaluation/teachers", isStudent, async (req, res) => {
  try {
    const userId = req.session.user_id;
    const username = req.session.username;
    const fullName = req.session.full_name;

    // Get student's section
    let studentSection = null;
    let assignment = null;

    if (userId) {
      const result = await db.query(
        "SELECT year, section FROM user_assignments WHERE user_id = $1 LIMIT 1",
        [userId]
      );

      if (Array.isArray(result) && result.length > 0) {
        assignment = result[0];
      } else if (result && !Array.isArray(result)) {
        assignment = result;
      }
    }

    if (!assignment && (username || fullName)) {
      const result = await db.query(
        "SELECT year, section FROM user_assignments WHERE username = $1 OR username = $2 LIMIT 1",
        [username, fullName || username]
      );

      if (Array.isArray(result) && result.length > 0) {
        assignment = result[0];
      } else if (result && !Array.isArray(result)) {
        assignment = result;
      }
    }

    if (!assignment || !assignment.section) {
      return res.json({ teachers: [] });
    }

    studentSection = assignment.section;

    // Get teachers from schedules and study_load tables
    const teachersMap = new Map();

    // From schedules table - try exact match first, then case-insensitive
    let schedulesTeachers = await db.query(
      "SELECT DISTINCT instructor, subject FROM schedules WHERE section = $1 AND instructor IS NOT NULL AND instructor != '' ORDER BY instructor, subject",
      [studentSection]
    );

    // If no results, try case-insensitive match
    if (
      (!Array.isArray(schedulesTeachers) || schedulesTeachers.length === 0) &&
      schedulesTeachers &&
      !Array.isArray(schedulesTeachers) &&
      !schedulesTeachers.instructor
    ) {
      schedulesTeachers = await db.query(
        "SELECT DISTINCT instructor, subject FROM schedules WHERE LOWER(TRIM(section)) = LOWER(TRIM($1)) AND instructor IS NOT NULL AND instructor != '' ORDER BY instructor, subject",
        [studentSection]
      );
    }

    if (Array.isArray(schedulesTeachers)) {
      schedulesTeachers.forEach((row) => {
        const teacherName = row.instructor;
        const subject = row.subject;
        if (teacherName && subject) {
          if (!teachersMap.has(teacherName)) {
            teachersMap.set(teacherName, []);
          }
          if (!teachersMap.get(teacherName).includes(subject)) {
            teachersMap.get(teacherName).push(subject);
          }
        }
      });
    }

    // From study_load table - try exact match first, then case-insensitive
    let studyLoadTeachers = await db.query(
      "SELECT DISTINCT teacher, subject_title FROM study_load WHERE section = $1 AND teacher IS NOT NULL AND teacher != '' ORDER BY teacher, subject_title",
      [studentSection]
    );

    // If no results, try case-insensitive match
    if (
      (!Array.isArray(studyLoadTeachers) || studyLoadTeachers.length === 0) &&
      studyLoadTeachers &&
      !Array.isArray(studyLoadTeachers) &&
      !studyLoadTeachers.teacher
    ) {
      studyLoadTeachers = await db.query(
        "SELECT DISTINCT teacher, subject_title FROM study_load WHERE LOWER(TRIM(section)) = LOWER(TRIM($1)) AND teacher IS NOT NULL AND teacher != '' ORDER BY teacher, subject_title",
        [studentSection]
      );
    }

    if (Array.isArray(studyLoadTeachers)) {
      studyLoadTeachers.forEach((row) => {
        const teacherName = row.teacher;
        const subject = row.subject_title;
        if (teacherName && subject) {
          if (!teachersMap.has(teacherName)) {
            teachersMap.set(teacherName, []);
          }
          if (!teachersMap.get(teacherName).includes(subject)) {
            teachersMap.get(teacherName).push(subject);
          }
        }
      });
    }

    // Get teacher IDs and check if already evaluated
    const teachers = [];
    for (const [teacherName, subjects] of teachersMap.entries()) {
      // Get teacher user_id
      const userResult = await db.query(
        "SELECT id FROM users WHERE full_name = $1 OR username = $1 LIMIT 1",
        [teacherName]
      );
      const teacherId =
        Array.isArray(userResult) && userResult.length > 0
          ? userResult[0].id
          : userResult && !Array.isArray(userResult)
          ? userResult.id
          : 0;

      // Check if already evaluated
      let alreadyEvaluated = false;
      if (userId && teacherId) {
        const tableCheck = await db.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'teacher_evaluations'
          )
        `);

        if (tableCheck && tableCheck[0] && tableCheck[0].exists) {
          const evalCheck = await db.query(
            "SELECT id FROM teacher_evaluations WHERE student_id = $1 AND teacher_id = $2 AND semester = 'First Semester' AND school_year = '2025-2026' LIMIT 1",
            [userId, teacherId]
          );
          alreadyEvaluated =
            (Array.isArray(evalCheck) && evalCheck.length > 0) ||
            (evalCheck && !Array.isArray(evalCheck));
        }
      }

      teachers.push({
        id: teacherId,
        name: teacherName,
        subjects: subjects,
        evaluated: alreadyEvaluated,
      });
    }

    res.json({ teachers });
  } catch (error) {
    Logger.error("Get evaluation teachers error:", error);
    console.error("Error stack:", error.stack);
    res
      .status(500)
      .json({ error: "Internal server error", message: error.message });
  }
});

// Submit evaluation
router.post("/evaluation/submit", isStudent, async (req, res) => {
  try {
    const userId = req.session.user_id;
    const {
      teacher_id,
      teacher_name,
      subject,
      student_section,
      part1_q1,
      part1_q2,
      part1_q3,
      part1_q4,
      part1_q5,
      part1_q6,
      part1_q7,
      part1_q8,
      part1_q9,
      part1_q10,
      part2_q1,
      part2_q2,
      part2_q3,
      part2_q4,
      part2_q5,
      part2_q6,
      part2_q7,
      part2_q8,
      satisfaction_rating,
      recommend_teacher,
      comments,
    } = req.body;

    if (!teacher_id || !teacher_name) {
      return res
        .status(400)
        .json({ error: "Teacher ID and name are required" });
    }

    // Ensure table exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS teacher_evaluations (
        id SERIAL PRIMARY KEY,
        student_id INTEGER,
        teacher_id INTEGER NOT NULL,
        teacher_name VARCHAR(255) NOT NULL,
        subject TEXT,
        student_section VARCHAR(50),
        semester VARCHAR(50) DEFAULT 'First Semester',
        school_year VARCHAR(50) DEFAULT '2025-2026',
        part1_q1 INTEGER,
        part1_q2 INTEGER,
        part1_q3 INTEGER,
        part1_q4 INTEGER,
        part1_q5 INTEGER,
        part1_q6 INTEGER,
        part1_q7 INTEGER,
        part1_q8 INTEGER,
        part1_q9 INTEGER,
        part1_q10 INTEGER,
        part2_q1 INTEGER,
        part2_q2 INTEGER,
        part2_q3 INTEGER,
        part2_q4 INTEGER,
        part2_q5 INTEGER,
        part2_q6 INTEGER,
        part2_q7 INTEGER,
        part2_q8 INTEGER,
        satisfaction_rating INTEGER,
        recommend_teacher VARCHAR(10),
        comments TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Check if already evaluated
    if (userId) {
      const existing = await db.query(
        "SELECT id FROM teacher_evaluations WHERE student_id = $1 AND teacher_id = $2 AND semester = 'First Semester' AND school_year = '2025-2026' LIMIT 1",
        [userId, teacher_id]
      );
      if (
        (Array.isArray(existing) && existing.length > 0) ||
        (existing && !Array.isArray(existing))
      ) {
        return res
          .status(400)
          .json({
            error: "You have already evaluated this teacher for this semester",
          });
      }
    }

    // Insert evaluation
    await db.query(
      `
      INSERT INTO teacher_evaluations (
        student_id, teacher_id, teacher_name, subject, student_section,
        part1_q1, part1_q2, part1_q3, part1_q4, part1_q5,
        part1_q6, part1_q7, part1_q8, part1_q9, part1_q10,
        part2_q1, part2_q2, part2_q3, part2_q4, part2_q5,
        part2_q6, part2_q7, part2_q8,
        satisfaction_rating, recommend_teacher, comments
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25, $26
      )
    `,
      [
        userId || null,
        teacher_id,
        teacher_name,
        subject || null,
        student_section || null,
        parseInt(part1_q1) || null,
        parseInt(part1_q2) || null,
        parseInt(part1_q3) || null,
        parseInt(part1_q4) || null,
        parseInt(part1_q5) || null,
        parseInt(part1_q6) || null,
        parseInt(part1_q7) || null,
        parseInt(part1_q8) || null,
        parseInt(part1_q9) || null,
        parseInt(part1_q10) || null,
        parseInt(part2_q1) || null,
        parseInt(part2_q2) || null,
        parseInt(part2_q3) || null,
        parseInt(part2_q4) || null,
        parseInt(part2_q5) || null,
        parseInt(part2_q6) || null,
        parseInt(part2_q7) || null,
        parseInt(part2_q8) || null,
        parseInt(satisfaction_rating) || null,
        recommend_teacher || null,
        comments || null,
      ]
    );

    res.json({ success: true, message: "Evaluation submitted successfully" });
  } catch (error) {
    Logger.error("Submit evaluation error:", error);
    res
      .status(500)
      .json({ error: "Internal server error", message: error.message });
  }
});

module.exports = router;
