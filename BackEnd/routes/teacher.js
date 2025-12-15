const express = require("express");
const db = require("../config/database");
const Logger = require("../config/logger");
const router = express.Router();

// Middleware to check if user is teacher
const isTeacher = (req, res, next) => {
  if (req.session.role !== "teacher") {
    return res.status(403).json({ error: "Access denied. Teacher only." });
  }
  next();
};

// Apply teacher middleware to all routes
router.use(isTeacher);

// Get schedule for logged-in teacher
router.get("/schedule", async (req, res) => {
  try {
    const username = req.session.username;
    const fullName = req.session.full_name;

    const instructorNames = [fullName, username].filter(Boolean);
    if (instructorNames.length === 0) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Build case-insensitive exact match OR relaxed LIKE match to handle formatting differences
    const clausesExact = instructorNames.map(
      (_, idx) => `LOWER(TRIM(instructor)) = LOWER(TRIM($${idx + 1}))`
    );
    const clausesLike = instructorNames.map(
      (_, idx) => `LOWER(instructor) LIKE LOWER('%' || $${idx + 1} || '%')`
    );

    const schedules = await db.query(
      `
        SELECT id, year, subject, day, time_start, time_end, room, building, instructor, section
        FROM schedules
        WHERE (${clausesExact.join(" OR ")})
           OR (${clausesLike.join(" OR ")})
        ORDER BY day, time_start
      `,
      instructorNames
    );

    // Fallback: if no direct instructor match, try by subjects assigned to teacher
    let results = Array.isArray(schedules)
      ? schedules
      : schedules
      ? [schedules]
      : [];
    if (!results || results.length === 0) {
      // Detect teacher_assignments schema
      const tableInfo = await db.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'teacher_assignments'
      `);
      const columns = tableInfo.map((col) => col.column_name);
      const hasNewSchema =
        columns.includes("teacher_name") && columns.includes("subject_code");

      let subjQuery;
      if (hasNewSchema) {
        subjQuery = `SELECT DISTINCT subject_code AS subject FROM teacher_assignments WHERE user_id = $1 OR teacher_name = $2`;
      } else {
        subjQuery = `SELECT DISTINCT subject FROM teacher_assignments WHERE user_id = $1 OR username = $2`;
      }
      const subjects = await db.query(subjQuery, [
        req.session.user_id || null,
        username,
      ]);
      const subjectList = Array.isArray(subjects)
        ? subjects.map((s) => s.subject).filter(Boolean)
        : [];

      if (subjectList.length > 0) {
        const placeholders = subjectList.map((_, i) => `$${i + 1}`).join(",");
        const fallbackSchedules = await db.query(
          `
            SELECT id, year, subject, day, time_start, time_end, room, building, instructor, section
            FROM schedules
            WHERE subject IN (${placeholders})
            ORDER BY day, time_start
          `,
          subjectList
        );
        results = Array.isArray(fallbackSchedules)
          ? fallbackSchedules
          : fallbackSchedules
          ? [fallbackSchedules]
          : [];
      }
    }

    res.json(results);
  } catch (error) {
    Logger.error("Get teacher schedule error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get subjects assigned to the logged-in teacher
router.get("/subjects", async (req, res) => {
  try {
    const userId = req.session.user_id;
    const username = req.session.username;

    if (!userId && !username) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Check table structure
    const tableInfo = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'teacher_assignments'
    `);
    const columns = tableInfo.map((col) => col.column_name);
    const hasNewSchema =
      columns.includes("teacher_name") && columns.includes("subject_code");

    let query;
    if (hasNewSchema) {
      query = `SELECT DISTINCT ta.subject_code, s.subject_code, s.title, s.units, s.course, s.major, s.year_level, s.semester
               FROM teacher_assignments ta
               JOIN subjects s ON ta.subject_code = s.subject_code
               WHERE ta.user_id = $1 OR ta.teacher_name = $2
               ORDER BY s.course, s.major, s.year_level, s.subject_code`;
    } else {
      query = `SELECT DISTINCT ta.subject as subject_code, s.subject_code, s.title, s.units, s.course, s.major, s.year_level, s.semester
               FROM teacher_assignments ta
               JOIN subjects s ON ta.subject = s.subject_code
               WHERE ta.user_id = $1 OR ta.username = $2
               ORDER BY s.course, s.major, s.year_level, s.subject_code`;
    }

    const subjects = await db.query(query, [userId, username]);
    res.json(Array.isArray(subjects) ? subjects : subjects ? [subjects] : []);
  } catch (error) {
    Logger.error("Get teacher subjects error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get students by section
router.get("/students", async (req, res) => {
  try {
    const { section } = req.query;
    if (!section) {
      return res.status(400).json({ error: "Section is required" });
    }

    const students = await db.query(
      `SELECT u.id, u.username, u.full_name, u.school_id, u.image_path, ua.year, ua.section, ua.department, ua.major
       FROM users u
       JOIN user_assignments ua ON u.id = ua.user_id
       WHERE u.role = 'student' AND ua.section = $1
       ORDER BY u.full_name, u.username`,
      [section]
    );

    res.json(Array.isArray(students) ? students : students ? [students] : []);
  } catch (error) {
    Logger.error("Get students by section error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get all sections (for filtering)
router.get("/sections", async (_req, res) => {
  try {
    const sections = await db.query(
      "SELECT DISTINCT section FROM user_assignments WHERE section IS NOT NULL AND section <> '' ORDER BY section"
    );
    const list = Array.isArray(sections)
      ? sections.map((s) => s.section).filter(Boolean)
      : [];
    res.json({ sections: list });
  } catch (error) {
    Logger.error("Get sections error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get grades for students taught by the logged-in teacher
router.get("/grades", async (req, res) => {
  try {
    const userId = req.session.user_id;
    const username = req.session.username;

    if (!userId && !username) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Get subjects assigned to this teacher
    const tableInfo = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'teacher_assignments'
    `);
    const columns = tableInfo.map((col) => col.column_name);
    const hasNewSchema =
      columns.includes("teacher_name") && columns.includes("subject_code");

    let subjectQuery;
    if (hasNewSchema) {
      subjectQuery = `SELECT DISTINCT subject_code FROM teacher_assignments 
                     WHERE user_id = $1 OR teacher_name = $2`;
    } else {
      subjectQuery = `SELECT DISTINCT subject as subject_code FROM teacher_assignments 
                     WHERE user_id = $1 OR username = $2`;
    }

    const teacherSubjects = await db.query(subjectQuery, [userId, username]);
    const subjectCodes = teacherSubjects.map((s) => s.subject_code);

    if (subjectCodes.length === 0) {
      return res.json([]);
    }

    // Get grades for students in these subjects
    // Use IN clause with parameterized query for safety
    const placeholders = subjectCodes.map((_, i) => `$${i + 1}`).join(",");
    const grades = await db.query(
      `SELECT sg.id, sg.user_id, sg.username, sg.year, sg.semester, sg.subject, 
              sg.prelim_grade, sg.midterm_grade, sg.finals_grade, sg.instructor,
              u.full_name AS student_name, u.image_path, ua.section
       FROM student_grades sg
       LEFT JOIN users u ON sg.user_id = u.id
       LEFT JOIN user_assignments ua ON sg.user_id = ua.user_id AND sg.year = ua.year
       WHERE sg.subject IN (${placeholders})
       ORDER BY sg.year, sg.semester, sg.subject, u.full_name`,
      subjectCodes
    );

    res.json(Array.isArray(grades) ? grades : grades ? [grades] : []);
  } catch (error) {
    Logger.error("Get teacher grades error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create grade (only for subjects assigned to the teacher)
router.post("/grades", async (req, res) => {
  try {
    const userId = req.session.user_id;
    const username = req.session.username;
    const {
      user_id,
      username: studentUsername,
      year,
      semester,
      subject,
      instructor,
      prelim_grade,
      midterm_grade,
      finals_grade,
    } = req.body;

    if (!studentUsername || !year || !semester || !subject) {
      return res
        .status(400)
        .json({ error: "Username, year, semester, and subject are required" });
    }

    // Verify teacher is assigned to this subject
    const tableInfo = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'teacher_assignments'
    `);
    const columns = tableInfo.map((col) => col.column_name);
    const hasNewSchema =
      columns.includes("teacher_name") && columns.includes("subject_code");

    let checkQuery;
    if (hasNewSchema) {
      checkQuery = `SELECT id FROM teacher_assignments 
                   WHERE subject_code = $1 AND (user_id = $2 OR teacher_name = $3)`;
    } else {
      checkQuery = `SELECT id FROM teacher_assignments 
                   WHERE subject = $1 AND (user_id = $2 OR username = $3)`;
    }

    const assignment = await db.query(checkQuery, [subject, userId, username]);
    if (!assignment || assignment.length === 0) {
      return res
        .status(403)
        .json({ error: "You are not assigned to teach this subject" });
    }

    const result = await db.query(
      "INSERT INTO student_grades (user_id, username, year, semester, subject, instructor, prelim_grade, midterm_grade, finals_grade) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id",
      [
        user_id || null,
        studentUsername,
        year,
        semester,
        subject,
        instructor || null,
        prelim_grade || null,
        midterm_grade || null,
        finals_grade || null,
      ]
    );
    const insertId =
      result.id || (Array.isArray(result) ? result[0]?.id : result?.id);
    res.status(201).json({ success: true, id: insertId });
  } catch (error) {
    Logger.error("Create grade error:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// Update grade (only for subjects assigned to the teacher)
router.put("/grades/:id", async (req, res) => {
  try {
    const userId = req.session.user_id;
    const username = req.session.username;
    const { id } = req.params;
    const {
      user_id,
      username: studentUsername,
      year,
      semester,
      subject,
      instructor,
      prelim_grade,
      midterm_grade,
      finals_grade,
    } = req.body;

    if (!studentUsername || !year || !semester || !subject) {
      return res
        .status(400)
        .json({ error: "Username, year, semester, and subject are required" });
    }

    // Get the existing grade to check subject
    const existingGrade = await db.query(
      "SELECT subject FROM student_grades WHERE id = $1",
      [id]
    );
    if (!existingGrade || existingGrade.length === 0) {
      return res.status(404).json({ error: "Grade not found" });
    }

    // Verify teacher is assigned to this subject
    const tableInfo = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'teacher_assignments'
    `);
    const columns = tableInfo.map((col) => col.column_name);
    const hasNewSchema =
      columns.includes("teacher_name") && columns.includes("subject_code");

    let checkQuery;
    if (hasNewSchema) {
      checkQuery = `SELECT id FROM teacher_assignments 
                   WHERE subject_code = $1 AND (user_id = $2 OR teacher_name = $3)`;
    } else {
      checkQuery = `SELECT id FROM teacher_assignments 
                   WHERE subject = $1 AND (user_id = $2 OR username = $3)`;
    }

    const assignment = await db.query(checkQuery, [subject, userId, username]);
    if (!assignment || assignment.length === 0) {
      return res
        .status(403)
        .json({ error: "You are not assigned to teach this subject" });
    }

    await db.query(
      "UPDATE student_grades SET user_id = $1, username = $2, year = $3, semester = $4, subject = $5, instructor = $6, prelim_grade = $7, midterm_grade = $8, finals_grade = $9, updated_at = CURRENT_TIMESTAMP WHERE id = $10",
      [
        user_id || null,
        studentUsername,
        year,
        semester,
        subject,
        instructor || null,
        prelim_grade || null,
        midterm_grade || null,
        finals_grade || null,
        id,
      ]
    );
    res.json({ success: true });
  } catch (error) {
    Logger.error("Update grade error:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// Delete grade (only for subjects assigned to the teacher)
router.delete("/grades/:id", async (req, res) => {
  try {
    const userId = req.session.user_id;
    const username = req.session.username;
    const { id } = req.params;

    // Get the existing grade to check subject
    const existingGrade = await db.query(
      "SELECT subject FROM student_grades WHERE id = $1",
      [id]
    );
    if (!existingGrade || existingGrade.length === 0) {
      return res.status(404).json({ error: "Grade not found" });
    }

    const subject = existingGrade[0].subject;

    // Verify teacher is assigned to this subject
    const tableInfo = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'teacher_assignments'
    `);
    const columns = tableInfo.map((col) => col.column_name);
    const hasNewSchema =
      columns.includes("teacher_name") && columns.includes("subject_code");

    let checkQuery;
    if (hasNewSchema) {
      checkQuery = `SELECT id FROM teacher_assignments 
                   WHERE subject_code = $1 AND (user_id = $2 OR teacher_name = $3)`;
    } else {
      checkQuery = `SELECT id FROM teacher_assignments 
                   WHERE subject = $1 AND (user_id = $2 OR username = $3)`;
    }

    const assignment = await db.query(checkQuery, [subject, userId, username]);
    if (!assignment || assignment.length === 0) {
      return res
        .status(403)
        .json({ error: "You are not assigned to teach this subject" });
    }

    await db.query("DELETE FROM student_grades WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (error) {
    Logger.error("Delete grade error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get announcements (teachers can view all announcements)
router.get("/announcements", async (req, res) => {
  try {
    const announcements = await db.query(
      "SELECT id, title, content, year, department, major, date FROM announcements ORDER BY date DESC"
    );
    res.json(
      Array.isArray(announcements)
        ? announcements
        : announcements
        ? [announcements]
        : []
    );
  } catch (error) {
    Logger.error("Get teacher announcements error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get projects (teachers can view all projects)
router.get("/projects", async (req, res) => {
  try {
    const projects = await db.query(
      "SELECT id, name, budget, started, completed FROM projects ORDER BY started DESC"
    );
    res.json(Array.isArray(projects) ? projects : projects ? [projects] : []);
  } catch (error) {
    Logger.error("Get teacher projects error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get evaluation statistics for logged-in teacher
router.get("/evaluation-statistics", async (req, res) => {
  try {
    const userId = req.session.user_id;
    const username = req.session.username;
    const fullName = req.session.full_name;

    // Check if table exists
    const tableCheck = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'teacher_evaluations'
      )
    `);

    if (!tableCheck || !tableCheck[0] || !tableCheck[0].exists) {
      return res.json({
        success: true,
        total: 0,
        overall: { average: 0, percentage: 0 },
        statistics: {},
      });
    }

    // Get evaluations for this teacher
    let evaluations = [];
    if (userId) {
      evaluations = await db.query(
        "SELECT * FROM teacher_evaluations WHERE teacher_id = $1 AND semester = 'First Semester' AND school_year = '2025-2026'",
        [userId]
      );
    }

    // If no results by userId, try by teacher_name
    if ((!Array.isArray(evaluations) || evaluations.length === 0) && fullName) {
      evaluations = await db.query(
        "SELECT * FROM teacher_evaluations WHERE teacher_name = $1 AND semester = 'First Semester' AND school_year = '2025-2026'",
        [fullName]
      );
    }

    if (!Array.isArray(evaluations) || evaluations.length === 0) {
      return res.json({
        success: true,
        total: 0,
        overall: { average: 0, percentage: 0 },
        statistics: {},
      });
    }

    const total = evaluations.length;
    const statistics = {};

    // Calculate statistics for Part I questions (q1-q10)
    for (let i = 1; i <= 10; i++) {
      const qKey = `part1_q${i}`;
      const values = evaluations
        .map((e) => parseFloat(e[qKey]))
        .filter((v) => !isNaN(v));
      const average =
        values.length > 0
          ? values.reduce((a, b) => a + b, 0) / values.length
          : 0;
      const percentage = (average / 4.0) * 100;
      statistics[qKey] = {
        average,
        percentage,
        responses: values.length,
      };
    }

    // Calculate statistics for Part II questions (q1-q8)
    for (let i = 1; i <= 8; i++) {
      const qKey = `part2_q${i}`;
      const values = evaluations
        .map((e) => parseFloat(e[qKey]))
        .filter((v) => !isNaN(v));
      const average =
        values.length > 0
          ? values.reduce((a, b) => a + b, 0) / values.length
          : 0;
      const percentage = (average / 4.0) * 100;
      statistics[qKey] = {
        average,
        percentage,
        responses: values.length,
      };
    }

    // Calculate satisfaction rating
    const satisfactionValues = evaluations
      .map((e) => parseFloat(e.satisfaction_rating))
      .filter((v) => !isNaN(v));
    const satisfactionAverage =
      satisfactionValues.length > 0
        ? satisfactionValues.reduce((a, b) => a + b, 0) /
          satisfactionValues.length
        : 0;
    const satisfactionPercentage = (satisfactionAverage / 10.0) * 100;
    statistics.satisfaction = {
      average: satisfactionAverage,
      percentage: satisfactionPercentage,
      responses: satisfactionValues.length,
    };

    // Calculate recommendation
    const recommendationYes = evaluations.filter(
      (e) => e.recommend_teacher === "YES"
    ).length;
    const recommendationNo = evaluations.filter(
      (e) => e.recommend_teacher === "NO"
    ).length;
    const recommendationTotal = recommendationYes + recommendationNo;
    const recommendationPercentage =
      recommendationTotal > 0
        ? (recommendationYes / recommendationTotal) * 100
        : 0;
    statistics.recommendation = {
      yes: recommendationYes,
      no: recommendationNo,
      percentage: recommendationPercentage,
      total: recommendationTotal,
    };

    // Calculate overall average (average of all 18 questions)
    const allAverages = [];
    for (let i = 1; i <= 10; i++) {
      if (statistics[`part1_q${i}`])
        allAverages.push(statistics[`part1_q${i}`].average);
    }
    for (let i = 1; i <= 8; i++) {
      if (statistics[`part2_q${i}`])
        allAverages.push(statistics[`part2_q${i}`].average);
    }
    const overallAverage =
      allAverages.length > 0
        ? allAverages.reduce((a, b) => a + b, 0) / allAverages.length
        : 0;
    const overallPercentage = (overallAverage / 4.0) * 100;

    res.json({
      success: true,
      total,
      overall: {
        average: overallAverage,
        percentage: overallPercentage,
      },
      statistics,
    });
  } catch (error) {
    Logger.error("Get evaluation statistics error:", error);
    res
      .status(500)
      .json({ error: "Internal server error", message: error.message });
  }
});

module.exports = router;
