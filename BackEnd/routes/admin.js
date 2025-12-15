const express = require("express");
const db = require("../config/database");
const Logger = require("../config/logger");
const router = express.Router();
const fs = require("fs");
const path = require("path");

// Development-friendly public announcement creation endpoint (no auth) - useful while migrating frontend
// WARNING: This route bypasses admin checks and should only be used for development/testing.
router.post("/announcements/public", async (req, res) => {
  try {
    const { title, content, year, department, major } = req.body;
    if (!title || !content)
      return res.status(400).json({ error: "Title and content are required" });

    const sql = `INSERT INTO announcements (title, content, year, department, major) VALUES ($1,$2,$3,$4,$5) RETURNING id`;
    const inserted = await db.query(sql, [
      title,
      content,
      year || null,
      department || null,
      major || null,
    ]);
    const insertedId =
      inserted.id || (Array.isArray(inserted) ? inserted[0]?.id : inserted?.id);

    // Log to audit (best effort)
    try {
      await db.query(
        "INSERT INTO audit_log (admin_user, action, target_table, target_id, details) VALUES ($1,$2,$3,$4,$5)",
        [
          "dev",
          "create",
          "announcements",
          insertedId || null,
          `created announcement id=${insertedId}`,
        ]
      );
    } catch (e) {
      console.warn("Audit log failed (dev):", e.message);
    }
    res.status(201).json({ success: true, id: insertedId });
  } catch (error) {
    Logger.error("Create announcement (public) error:", error);
    // Return error message for easier debugging in development
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
  if (req.session.role !== "admin") {
    return res.status(403).json({ error: "Access denied. Admin only." });
  }
  next();
};

// Apply admin middleware to all routes
router.use(isAdmin);

// Get announcements
router.get("/announcements", async (req, res) => {
  try {
    const announcements = await db.query(
      "SELECT * FROM announcements ORDER BY date DESC"
    );
    // Ensure we always return an array
    const result = Array.isArray(announcements)
      ? announcements
      : announcements
      ? [announcements]
      : [];
    res.json(result);
  } catch (error) {
    Logger.error("Get announcements error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create announcement
router.post("/announcements", async (req, res) => {
  try {
    const { title, content, year, department, major } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: "Title and content are required" });
    }

    const sql = `INSERT INTO announcements (title, content, year, department, major) 
                     VALUES ($1, $2, $3, $4, $5) RETURNING id`;
    const inserted = await db.query(sql, [
      title,
      content,
      year || null,
      department || null,
      major || null,
    ]);
    const insertId =
      inserted.id || (Array.isArray(inserted) ? inserted[0]?.id : inserted?.id);

    // Log to audit
    await db.query(
      "INSERT INTO audit_log (admin_user, action, target_table, target_id, details) VALUES ($1, $2, $3, $4, $5)",
      [
        req.session.username,
        "create",
        "announcements",
        insertId,
        `created announcement id=${insertId}`,
      ]
    );

    res.status(201).json({ success: true, id: insertId });
  } catch (error) {
    Logger.error("Create announcement error:", error);
    // Include underlying error message to help diagnose failures during development
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// Update announcement
router.put("/announcements/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, year, department, major } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: "Title and content are required" });
    }

    const sql = `UPDATE announcements SET title = $1, content = $2, year = $3, department = $4, major = $5 WHERE id = $6 RETURNING id`;
    const updated = await db.query(sql, [
      title,
      content,
      year || null,
      department || null,
      major || null,
      id,
    ]);

    // Log to audit
    await db.query(
      "INSERT INTO audit_log (admin_user, action, target_table, target_id, details) VALUES ($1, $2, $3, $4, $5)",
      [
        req.session.username,
        "update",
        "announcements",
        id,
        `updated announcement id=${id}`,
      ]
    );

    res.json({ success: true, id });
  } catch (error) {
    Logger.error("Update announcement error:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// Delete announcement
router.delete("/announcements/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("DELETE FROM announcements WHERE id = $1", [id]);

    // Log to audit
    await db.query(
      "INSERT INTO audit_log (admin_user, action, target_table, target_id, details) VALUES ($1, $2, $3, $4, $5)",
      [
        req.session.username,
        "delete",
        "announcements",
        id,
        `deleted announcement id=${id}`,
      ]
    );

    res.json({ success: true });
  } catch (error) {
    Logger.error("Delete announcement error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get users
router.get("/users", async (req, res) => {
  try {
    const users = await db.query(
      "SELECT id, username, full_name, school_id, role, image_path, created_at FROM users ORDER BY created_at DESC"
    );
    res.json(users);
  } catch (error) {
    Logger.error("Get users error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get user assignments (student assignment records)
router.get("/user-assignments", async (req, res) => {
  try {
    const rows = await db.query(
      "SELECT id, user_id, username, year, section, department, major, payment, sanctions, owing_amount FROM user_assignments ORDER BY year, username"
    );
    // Ensure we always return an array
    const assignments = Array.isArray(rows) ? rows : rows ? [rows] : [];
    res.json(assignments);
  } catch (error) {
    Logger.error("Get user assignments error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get section assignments
router.get("/section-assignments", async (req, res) => {
  try {
    const rows = await db.query(
      "SELECT id, year, section, building, floor, room FROM section_assignments ORDER BY year, section"
    );
    res.json(rows);
  } catch (error) {
    Logger.error("Get section assignments error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get grades (student_grades)
router.get("/grades", async (req, res) => {
  try {
    const rows = await db.query(
      "SELECT sg.id, sg.user_id, sg.username, sg.year, sg.semester, sg.subject, sg.prelim_grade, sg.midterm_grade, sg.finals_grade, u.full_name AS student_name FROM student_grades sg LEFT JOIN users u ON sg.user_id = u.id ORDER BY sg.year, sg.username"
    );
    res.json(rows);
  } catch (error) {
    Logger.error("Get grades error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get sections
router.get("/sections", async (req, res) => {
  try {
    const sections = await db.query(
      "SELECT * FROM sections ORDER BY year, name"
    );
    // Ensure we always return an array
    res.json(Array.isArray(sections) ? sections : sections ? [sections] : []);
  } catch (error) {
    Logger.error("Get sections error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get subjects
router.get("/subjects", async (req, res) => {
  try {
    const subjects = await db.query(
      "SELECT * FROM subjects ORDER BY course, major, year_level, subject_code"
    );
    // Ensure we always return an array
    res.json(Array.isArray(subjects) ? subjects : subjects ? [subjects] : []);
  } catch (error) {
    Logger.error("Get subjects error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get schedules
router.get("/schedules", async (req, res) => {
  try {
    const schedules = await db.query(
      "SELECT * FROM schedules ORDER BY year, day, time_start"
    );
    // Ensure we always return an array
    res.json(
      Array.isArray(schedules) ? schedules : schedules ? [schedules] : []
    );
  } catch (error) {
    Logger.error("Get schedules error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get buildings (with full details for buildings section)
router.get("/buildings", async (req, res) => {
  try {
    // Get buildings from the buildings table with full details
    let buildings = await db.query(
      "SELECT name, floors, rooms_per_floor FROM buildings ORDER BY name"
    );

    // If no buildings in table, also check schedules for existing building values
    if (!buildings || buildings.length === 0) {
      const scheduleBuildings = await db.query(
        "SELECT DISTINCT building as name FROM schedules WHERE building IS NOT NULL ORDER BY building"
      );
      buildings = scheduleBuildings || [];
      // Add default floors and rooms_per_floor for schedule buildings
      buildings = buildings.map((b) => ({
        name: b.name || b.building || "",
        floors: 4,
        rooms_per_floor: 4,
      }));
    } else {
      // Also get distinct buildings from schedules and merge
      const scheduleBuildings = await db.query(
        "SELECT DISTINCT building as name FROM schedules WHERE building IS NOT NULL ORDER BY building"
      );
      if (scheduleBuildings && scheduleBuildings.length > 0) {
        // Merge and deduplicate
        const buildingMap = new Map();
        buildings.forEach((b) => buildingMap.set(b.name, b));
        scheduleBuildings.forEach((b) => {
          const name = b.name || b.building || "";
          if (!buildingMap.has(name)) {
            buildingMap.set(name, { name, floors: 4, rooms_per_floor: 4 });
          }
        });
        buildings = Array.from(buildingMap.values()).sort((a, b) =>
          a.name.localeCompare(b.name)
        );
      }
    }

    // Ensure we always return an array of objects with 'name', 'floors', 'rooms_per_floor' properties
    if (!Array.isArray(buildings)) {
      buildings = buildings ? [buildings] : [];
    }

    // Normalize to ensure all have required properties
    buildings = buildings
      .map((b) => ({
        name: typeof b === "string" ? b : b.name || b.building || "",
        floors: b.floors || 4,
        rooms_per_floor: b.rooms_per_floor || 4,
      }))
      .filter((b) => b.name);

    res.json(buildings);
  } catch (error) {
    Logger.error("Get buildings error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create building
router.post("/buildings", async (req, res) => {
  try {
    const { building, floors, rooms } = req.body;

    if (!building) {
      return res.status(400).json({ error: "Building name is required" });
    }

    const buildingName = building.toUpperCase().trim();
    const floorsNum = parseInt(floors) || 4;
    const roomsNum = parseInt(rooms) || 4;

    // Check if building already exists
    const existing = await db.query(
      "SELECT name FROM buildings WHERE name = $1",
      [buildingName]
    );
    if (existing && existing.length > 0) {
      // Update existing building
      await db.query(
        "UPDATE buildings SET floors = $1, rooms_per_floor = $2 WHERE name = $3",
        [floorsNum, roomsNum, buildingName]
      );
      res.json({ success: true, message: "Building updated successfully" });
    } else {
      // Create new building
      await db.query(
        "INSERT INTO buildings (name, floors, rooms_per_floor) VALUES ($1, $2, $3)",
        [buildingName, floorsNum, roomsNum]
      );
      res.json({ success: true, message: "Building created successfully" });
    }
  } catch (error) {
    Logger.error("Create building error:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// Delete building
router.delete("/buildings/:name", async (req, res) => {
  try {
    const { name } = req.params;
    const buildingName = decodeURIComponent(name).toUpperCase().trim();

    // Check if building exists first
    const existing = await db.query(
      "SELECT name FROM buildings WHERE name = $1",
      [buildingName]
    );
    if (!existing || existing.length === 0) {
      return res.status(404).json({ error: "Building not found" });
    }

    await db.query("DELETE FROM buildings WHERE name = $1", [buildingName]);
    res.json({ success: true, message: "Building deleted successfully" });
  } catch (error) {
    Logger.error("Delete building error:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// Get user suggestions (for search/autocomplete)
router.get("/user-suggestions", async (req, res) => {
  try {
    const { q, role } = req.query;
    if (!q || q.length < 2) {
      return res.json([]);
    }

    let query =
      "SELECT id, username, full_name, role FROM users WHERE (username ILIKE $1 OR full_name ILIKE $1)";
    const params = [`%${q}%`];

    if (role) {
      query += " AND role = $2";
      params.push(role);
    }

    query += " ORDER BY full_name, username LIMIT 10";

    const users = await db.query(query, params);
    // Ensure we always return an array
    res.json(Array.isArray(users) ? users : users ? [users] : []);
  } catch (error) {
    Logger.error("Get user suggestions error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get teacher assignments
router.get("/teacher-assignments", async (req, res) => {
  try {
    // Check table structure to determine which columns exist
    const tableInfo = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'teacher_assignments'
    `);
    const columns = tableInfo.map((col) => col.column_name);
    const hasNewSchema =
      columns.includes("teacher_name") && columns.includes("subject_code");
    const hasYear = columns.includes("year");

    let query;
    if (hasNewSchema) {
      query = `SELECT ta.id, ta.teacher_name, ta.subject_code, ta.user_id, ${
        hasYear ? "ta.year," : ""
      } 
               u.full_name, u.username 
               FROM teacher_assignments ta 
               LEFT JOIN users u ON ta.user_id = u.id 
               ORDER BY ta.teacher_name, ta.subject_code`;
    } else {
      query = `SELECT ta.id, ta.username as teacher_name, ta.subject as subject_code, ta.user_id, ${
        hasYear ? "ta.year," : ""
      } 
               u.full_name, u.username 
               FROM teacher_assignments ta 
               LEFT JOIN users u ON ta.user_id = u.id 
               ORDER BY ta.username, ta.subject`;
    }

    const assignments = await db.query(query);

    // Normalize the response - ensure consistent field names
    const normalized = Array.isArray(assignments)
      ? assignments
      : assignments
      ? [assignments]
      : [];
    const result = normalized.map((ta) => ({
      id: ta.id,
      teacher_name: ta.teacher_name || ta.username,
      subject_code: ta.subject_code || ta.subject,
      user_id: ta.user_id,
      full_name: ta.full_name || ta.teacher_name || ta.username,
      year: ta.year || null,
    }));

    // Always return an array
    res.json(result);
  } catch (error) {
    Logger.error("Get teacher assignments error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create teacher assignment
router.post("/teacher-assignments", async (req, res) => {
  try {
    const { teacher_name, subject_code, user_id, year } = req.body;

    if (!teacher_name || !subject_code) {
      return res
        .status(400)
        .json({ error: "Teacher name and subject code are required" });
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
    const hasYear = columns.includes("year");

    // Determine year value
    let yearValue = year;
    if (hasYear && !yearValue) {
      // Try to get year from subject
      const subjectResult = await db.query(
        "SELECT year_level FROM subjects WHERE subject_code = $1 LIMIT 1",
        [subject_code]
      );
      if (
        subjectResult &&
        subjectResult.length > 0 &&
        subjectResult[0].year_level
      ) {
        yearValue = subjectResult[0].year_level.toString();
      } else {
        yearValue = "1"; // Default to year 1
      }
    }

    // Check for duplicate assignment
    let duplicateCheckQuery;
    if (hasNewSchema) {
      duplicateCheckQuery = `SELECT id FROM teacher_assignments WHERE 
        (teacher_name = $1 OR user_id = $2) AND subject_code = $3`;
    } else {
      duplicateCheckQuery = `SELECT id FROM teacher_assignments WHERE 
        (username = $1 OR user_id = $2) AND subject = $3`;
    }

    const duplicateCheck = await db.query(duplicateCheckQuery, [
      teacher_name,
      user_id || null,
      subject_code,
    ]);

    if (duplicateCheck && duplicateCheck.length > 0) {
      return res.status(409).json({
        error:
          "This teacher is already assigned to this subject. Duplicate assignments are not allowed.",
      });
    }

    // Insert the assignment
    let insertQuery;
    let insertParams;

    if (hasNewSchema) {
      if (hasYear && user_id) {
        insertQuery = `INSERT INTO teacher_assignments (teacher_name, subject_code, user_id, year) 
                      VALUES ($1, $2, $3, $4) RETURNING id`;
        insertParams = [teacher_name, subject_code, user_id, yearValue];
      } else if (hasYear) {
        insertQuery = `INSERT INTO teacher_assignments (teacher_name, subject_code, year) 
                      VALUES ($1, $2, $3) RETURNING id`;
        insertParams = [teacher_name, subject_code, yearValue];
      } else if (user_id) {
        insertQuery = `INSERT INTO teacher_assignments (teacher_name, subject_code, user_id) 
                      VALUES ($1, $2, $3) RETURNING id`;
        insertParams = [teacher_name, subject_code, user_id];
      } else {
        insertQuery = `INSERT INTO teacher_assignments (teacher_name, subject_code) 
                      VALUES ($1, $2) RETURNING id`;
        insertParams = [teacher_name, subject_code];
      }
    } else {
      if (hasYear && user_id) {
        insertQuery = `INSERT INTO teacher_assignments (username, subject, user_id, year) 
                      VALUES ($1, $2, $3, $4) RETURNING id`;
        insertParams = [teacher_name, subject_code, user_id, yearValue];
      } else if (hasYear) {
        insertQuery = `INSERT INTO teacher_assignments (username, subject, year) 
                      VALUES ($1, $2, $3) RETURNING id`;
        insertParams = [teacher_name, subject_code, yearValue];
      } else if (user_id) {
        insertQuery = `INSERT INTO teacher_assignments (username, subject, user_id) 
                      VALUES ($1, $2, $3) RETURNING id`;
        insertParams = [teacher_name, subject_code, user_id];
      } else {
        insertQuery = `INSERT INTO teacher_assignments (username, subject) 
                      VALUES ($1, $2) RETURNING id`;
        insertParams = [teacher_name, subject_code];
      }
    }

    const result = await db.query(insertQuery, insertParams);
    const insertId =
      result.id || (Array.isArray(result) ? result[0]?.id : result?.id);

    res.status(201).json({ success: true, id: insertId });
  } catch (error) {
    Logger.error("Create teacher assignment error:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// Delete teacher assignment
router.delete("/teacher-assignments/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("DELETE FROM teacher_assignments WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (error) {
    Logger.error("Delete teacher assignment error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create schedule
router.post("/schedules", async (req, res) => {
  try {
    const {
      subject,
      year,
      section,
      day,
      class_type,
      time_start,
      time_end,
      building,
      room,
      instructor,
    } = req.body;

    if (!subject || !year || !day || !time_start || !time_end) {
      return res
        .status(400)
        .json({
          error: "Subject, year, day, time_start, and time_end are required",
        });
    }

    // Check if class_type column exists, if not create it
    try {
      const tableInfo = await db.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'schedules' AND column_name = 'class_type'
      `);
      const hasClassType = tableInfo && tableInfo.length > 0;

      if (!hasClassType) {
        // Add class_type column if it doesn't exist
        await db.query(`
          ALTER TABLE schedules 
          ADD COLUMN class_type VARCHAR(10) DEFAULT 'day' CHECK (class_type IN ('day', 'night'))
        `);
      }
    } catch (alterError) {
      // If column already exists or other error, continue
      console.log("Column check/creation:", alterError.message);
    }

    // Always include class_type in the insert
    const insertQuery = `INSERT INTO schedules (subject, year, section, day, class_type, time_start, time_end, building, room, instructor) 
                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`;
    const insertParams = [
      subject,
      year,
      section || null,
      day,
      class_type && (class_type === "day" || class_type === "night")
        ? class_type
        : "day",
      time_start,
      time_end,
      building || null,
      room || null,
      instructor || null,
    ];

    const result = await db.query(insertQuery, insertParams);
    const insertId =
      result.id || (Array.isArray(result) ? result[0]?.id : result?.id);

    res.status(201).json({ success: true, id: insertId });
  } catch (error) {
    Logger.error("Create schedule error:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// Delete schedule
router.delete("/schedules/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("DELETE FROM schedules WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (error) {
    Logger.error("Delete schedule error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create section
router.post("/sections", async (req, res) => {
  try {
    const { year, name } = req.body;
    if (!year || !name) {
      return res.status(400).json({ error: "Year and name are required" });
    }
    const result = await db.query(
      "INSERT INTO sections (year, name) VALUES ($1, $2) RETURNING id",
      [year, name]
    );
    const insertId =
      result.id || (Array.isArray(result) ? result[0]?.id : result?.id);
    res.status(201).json({ success: true, id: insertId });
  } catch (error) {
    Logger.error("Create section error:", error);
    if (error.code === "23505" || error.message.includes("unique")) {
      return res
        .status(409)
        .json({ error: "Section already exists for this year" });
    }
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// Update section
router.put("/sections/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { year, name } = req.body;
    if (!year || !name) {
      return res.status(400).json({ error: "Year and name are required" });
    }
    const result = await db.query(
      "UPDATE sections SET year = $1, name = $2 WHERE id = $3 RETURNING id",
      [year, name, id]
    );
    if (!result || (Array.isArray(result) && result.length === 0)) {
      return res.status(404).json({ error: "Section not found" });
    }
    res.json({ success: true, id: parseInt(id) });
  } catch (error) {
    Logger.error("Update section error:", error);
    if (error.code === "23505" || error.message.includes("unique")) {
      return res
        .status(409)
        .json({ error: "Section already exists for this year" });
    }
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// Delete section
router.delete("/sections/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("DELETE FROM sections WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (error) {
    Logger.error("Delete section error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create subject
router.post("/subjects", async (req, res) => {
  try {
    const { subject_code, title, units, course, major, year_level, semester } =
      req.body;
    if (!subject_code || !title || !course || !major || !year_level) {
      return res
        .status(400)
        .json({
          error:
            "Subject code, title, course, major, and year level are required",
        });
    }
    const result = await db.query(
      "INSERT INTO subjects (subject_code, title, units, course, major, year_level, semester) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id",
      [
        subject_code,
        title,
        units || 0,
        course,
        major,
        year_level,
        semester || "First Semester",
      ]
    );
    const insertId =
      result.id || (Array.isArray(result) ? result[0]?.id : result?.id);
    res.status(201).json({ success: true, id: insertId });
  } catch (error) {
    Logger.error("Create subject error:", error);
    if (error.code === "23505" || error.message.includes("unique")) {
      return res.status(409).json({ error: "Subject code already exists" });
    }
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// Update subject
router.put("/subjects/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { subject_code, title, units, course, major, year_level, semester } =
      req.body;
    if (!subject_code || !title || !course || !major || !year_level) {
      return res
        .status(400)
        .json({
          error:
            "Subject code, title, course, major, and year level are required",
        });
    }
    await db.query(
      "UPDATE subjects SET subject_code = $1, title = $2, units = $3, course = $4, major = $5, year_level = $6, semester = $7, updated_at = CURRENT_TIMESTAMP WHERE id = $8",
      [
        subject_code,
        title,
        units || 0,
        course,
        major,
        year_level,
        semester || "First Semester",
        id,
      ]
    );
    res.json({ success: true });
  } catch (error) {
    Logger.error("Update subject error:", error);
    if (error.code === "23505" || error.message.includes("unique")) {
      return res.status(409).json({ error: "Subject code already exists" });
    }
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// Delete subject
router.delete("/subjects/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("DELETE FROM subjects WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (error) {
    Logger.error("Delete subject error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create user assignment
router.post("/user-assignments", async (req, res) => {
  try {
    const {
      user_id,
      username,
      year,
      section,
      department,
      major,
      payment,
      sanctions,
      owing_amount,
    } = req.body;
    if (!username || !year || !section) {
      return res
        .status(400)
        .json({ error: "Username, year, and section are required" });
    }
    // user_id is optional - can be null
    const userIdForInsert =
      user_id && user_id !== "" ? parseInt(user_id) : null;
    const result = await db.query(
      "INSERT INTO user_assignments (user_id, username, year, section, department, major, payment, sanctions, owing_amount) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id",
      [
        userIdForInsert,
        username,
        year,
        section,
        department || null,
        major || null,
        payment || null,
        sanctions || null,
        owing_amount || null,
      ]
    );
    const insertId =
      result.id || (Array.isArray(result) ? result[0]?.id : result?.id);
    res.status(201).json({ success: true, id: insertId });
  } catch (error) {
    Logger.error("Create user assignment error:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// Update user assignment
router.put("/user-assignments/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      user_id,
      username,
      year,
      section,
      department,
      major,
      payment,
      sanctions,
      owing_amount,
    } = req.body;
    if (!username || !year || !section) {
      return res
        .status(400)
        .json({ error: "Username, year, and section are required" });
    }
    await db.query(
      "UPDATE user_assignments SET user_id = $1, username = $2, year = $3, section = $4, department = $5, major = $6, payment = $7, sanctions = $8, owing_amount = $9 WHERE id = $10",
      [
        user_id || null,
        username,
        year,
        section,
        department || null,
        major || null,
        payment || null,
        sanctions || null,
        owing_amount || null,
        id,
      ]
    );
    res.json({ success: true });
  } catch (error) {
    Logger.error("Update user assignment error:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// Delete user assignment
router.delete("/user-assignments/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("DELETE FROM user_assignments WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (error) {
    Logger.error("Delete user assignment error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update user role
router.put("/users/:id/role", async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    if (!role || !["admin", "teacher", "student"].includes(role)) {
      return res
        .status(400)
        .json({ error: "Valid role (admin, teacher, student) is required" });
    }
    await db.query("UPDATE users SET role = $1 WHERE id = $2", [role, id]);
    res.json({ success: true });
  } catch (error) {
    Logger.error("Update user role error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create section assignment
router.post("/section-assignments", async (req, res) => {
  try {
    const { year, section, building, floor, room } = req.body;
    if (!year || !section || !building || !floor || !room) {
      return res
        .status(400)
        .json({
          error: "Year, section, building, floor, and room are required",
        });
    }
    const result = await db.query(
      "INSERT INTO section_assignments (year, section, building, floor, room) VALUES ($1, $2, $3, $4, $5) RETURNING id",
      [year, section, building, floor, room]
    );
    const insertId =
      result.id || (Array.isArray(result) ? result[0]?.id : result?.id);
    res.status(201).json({ success: true, id: insertId });
  } catch (error) {
    Logger.error("Create section assignment error:", error);
    if (error.code === "23505" || error.message.includes("unique")) {
      return res
        .status(409)
        .json({
          error: "Section assignment already exists for this year and section",
        });
    }
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// Update section assignment
router.put("/section-assignments/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { year, section, building, floor, room } = req.body;
    if (!year || !section || !building || !floor || !room) {
      return res
        .status(400)
        .json({
          error: "Year, section, building, floor, and room are required",
        });
    }
    await db.query(
      "UPDATE section_assignments SET year = $1, section = $2, building = $3, floor = $4, room = $5 WHERE id = $6",
      [year, section, building, floor, room, id]
    );
    res.json({ success: true });
  } catch (error) {
    Logger.error("Update section assignment error:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// Delete section assignment
router.delete("/section-assignments/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("DELETE FROM section_assignments WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (error) {
    Logger.error("Delete section assignment error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get projects
router.get("/projects", async (req, res) => {
  try {
    const projects = await db.query(
      "SELECT * FROM projects ORDER BY started DESC, name"
    );
    res.json(Array.isArray(projects) ? projects : projects ? [projects] : []);
  } catch (error) {
    Logger.error("Get projects error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create project
router.post("/projects", async (req, res) => {
  try {
    const { name, budget, started, completed } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Project name is required" });
    }
    const result = await db.query(
      "INSERT INTO projects (name, budget, started, completed) VALUES ($1, $2, $3, $4) RETURNING id",
      [name, budget || null, started || null, completed || "no"]
    );
    const insertId =
      result.id || (Array.isArray(result) ? result[0]?.id : result?.id);
    res.status(201).json({ success: true, id: insertId });
  } catch (error) {
    Logger.error("Create project error:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// Update project
router.put("/projects/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, budget, started, completed } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Project name is required" });
    }
    await db.query(
      "UPDATE projects SET name = $1, budget = $2, started = $3, completed = $4 WHERE id = $5",
      [name, budget || null, started || null, completed || "no", id]
    );
    res.json({ success: true });
  } catch (error) {
    Logger.error("Update project error:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// Delete project
router.delete("/projects/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("DELETE FROM projects WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (error) {
    Logger.error("Delete project error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get study load
router.get("/study-load", async (req, res) => {
  try {
    const studyLoad = await db.query(
      "SELECT * FROM study_load ORDER BY course, major, year_level, section, semester, subject_code"
    );
    res.json(
      Array.isArray(studyLoad) ? studyLoad : studyLoad ? [studyLoad] : []
    );
  } catch (error) {
    Logger.error("Get study load error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create study load
router.post("/study-load", async (req, res) => {
  try {
    const {
      course,
      major,
      year_level,
      section,
      subject_code,
      subject_title,
      units,
      semester,
      teacher,
    } = req.body;
    if (
      !course ||
      !major ||
      !year_level ||
      !section ||
      !subject_code ||
      !subject_title
    ) {
      return res
        .status(400)
        .json({
          error:
            "Course, major, year level, section, subject code, and subject title are required",
        });
    }
    const result = await db.query(
      "INSERT INTO study_load (course, major, year_level, section, subject_code, subject_title, units, semester, teacher) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id",
      [
        course,
        major,
        year_level,
        section,
        subject_code,
        subject_title,
        units || 0,
        semester || "First Semester",
        teacher || null,
      ]
    );
    const insertId =
      result.id || (Array.isArray(result) ? result[0]?.id : result?.id);
    res.status(201).json({ success: true, id: insertId });
  } catch (error) {
    Logger.error("Create study load error:", error);
    if (error.code === "23505" || error.message.includes("unique")) {
      return res
        .status(409)
        .json({
          error: "Study load entry already exists for this combination",
        });
    }
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// Update study load
router.put("/study-load/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      course,
      major,
      year_level,
      section,
      subject_code,
      subject_title,
      units,
      semester,
      teacher,
    } = req.body;

    await db.query(
      "UPDATE study_load SET course = $1, major = $2, year_level = $3, section = $4, subject_code = $5, subject_title = $6, units = $7, semester = $8, teacher = $9 WHERE id = $10",
      [
        course,
        major,
        year_level,
        section,
        subject_code,
        subject_title || null,
        units || 0,
        semester,
        teacher || null,
        id,
      ]
    );

    res.json({ success: true });
  } catch (error) {
    Logger.error("Update study load error:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// Delete study load
router.delete("/study-load/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("DELETE FROM study_load WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (error) {
    Logger.error("Delete study load error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Create grade
router.post("/grades", async (req, res) => {
  try {
    const {
      user_id,
      username,
      year,
      semester,
      subject,
      instructor,
      prelim_grade,
      midterm_grade,
      finals_grade,
    } = req.body;
    if (!user_id || !username || !year || !semester || !subject) {
      return res
        .status(400)
        .json({
          error: "User ID, username, year, semester, and subject are required",
        });
    }
    const result = await db.query(
      "INSERT INTO student_grades (user_id, username, year, semester, subject, instructor, prelim_grade, midterm_grade, finals_grade) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id",
      [
        user_id,
        username,
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

// Update grade
router.put("/grades/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      user_id,
      username,
      year,
      semester,
      subject,
      instructor,
      prelim_grade,
      midterm_grade,
      finals_grade,
    } = req.body;
    if (!username || !year || !semester || !subject) {
      return res
        .status(400)
        .json({ error: "Username, year, semester, and subject are required" });
    }
    await db.query(
      "UPDATE student_grades SET user_id = $1, username = $2, year = $3, semester = $4, subject = $5, instructor = $6, prelim_grade = $7, midterm_grade = $8, finals_grade = $9, updated_at = CURRENT_TIMESTAMP WHERE id = $10",
      [
        user_id || null,
        username,
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

// Delete grade
router.delete("/grades/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("DELETE FROM student_grades WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (error) {
    Logger.error("Delete grade error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get evaluation settings
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
    // If table doesn't exist, default to enabled
    res.json({ enabled: true });
  }
});

// Update evaluation settings
router.post("/evaluation-settings", async (req, res) => {
  try {
    const { enabled } = req.body;

    // Ensure table exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS evaluation_settings (
        setting_key VARCHAR(100) PRIMARY KEY,
        setting_value VARCHAR(255) NOT NULL
      )
    `);

    // Insert or update
    await db.query(
      `INSERT INTO evaluation_settings (setting_key, setting_value) 
       VALUES ('evaluations_enabled', $1) 
       ON CONFLICT (setting_key) 
       DO UPDATE SET setting_value = $1`,
      [enabled ? "1" : "0"]
    );

    res.json({ success: true });
  } catch (error) {
    Logger.error("Update evaluation settings error:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// Get lowest rated teachers
router.get("/evaluation/lowest-rated", async (req, res) => {
  try {
    // Check if table exists
    const tableCheck = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'teacher_evaluations'
      )
    `);

    if (!tableCheck || !tableCheck[0] || !tableCheck[0].exists) {
      return res.json({ success: true, teachers: [] });
    }

    // Get lowest rated teachers
    const teachers = await db.query(`
      SELECT 
        te.teacher_id,
        te.teacher_name,
        COUNT(*) as total_evaluations,
        AVG((te.part1_q1 + te.part1_q2 + te.part1_q3 + te.part1_q4 + te.part1_q5 + 
             te.part1_q6 + te.part1_q7 + te.part1_q8 + te.part1_q9 + te.part1_q10 +
             te.part2_q1 + te.part2_q2 + te.part2_q3 + te.part2_q4 + te.part2_q5 +
             te.part2_q6 + te.part2_q7 + te.part2_q8) / 18.0) as average_rating,
        (AVG((te.part1_q1 + te.part1_q2 + te.part1_q3 + te.part1_q4 + te.part1_q5 + 
              te.part1_q6 + te.part1_q7 + te.part1_q8 + te.part1_q9 + te.part1_q10 +
              te.part2_q1 + te.part2_q2 + te.part2_q3 + te.part2_q4 + te.part2_q5 +
              te.part2_q6 + te.part2_q7 + te.part2_q8) / 18.0) / 4.0) * 100 as percentage,
        u.full_name,
        u.image_path
      FROM teacher_evaluations te
      LEFT JOIN users u ON te.teacher_id = u.id
      WHERE te.semester = 'First Semester' AND te.school_year = '2025-2026'
      GROUP BY te.teacher_id, te.teacher_name, u.full_name, u.image_path
      HAVING COUNT(*) > 0
      ORDER BY average_rating ASC, total_evaluations DESC
      LIMIT 10
    `);

    const teachersList = teachers.map((t) => ({
      teacher_id: t.teacher_id,
      teacher_name: t.teacher_name || t.full_name,
      full_name: t.full_name || t.teacher_name,
      total_evaluations: parseInt(t.total_evaluations) || 0,
      average_rating: parseFloat(t.average_rating) || 0,
      percentage: parseFloat(t.percentage) || 0,
      image_path: t.image_path || "images/sample.jpg",
    }));

    res.json({ success: true, teachers: teachersList });
  } catch (error) {
    Logger.error("Get lowest rated teachers error:", error);
    res.json({ success: true, teachers: [] });
  }
});

// Clean up codebase - remove empty folders and orphaned files
router.post("/cleanup-codebase", async (req, res) => {
  console.log("Cleanup codebase route hit");
  try {
    const projectRoot = path.join(__dirname, "../..");

    // Define allowed file extensions (whitelist approach)
    const allowedExtensions = new Set([
      // Code files
      ".js",
      ".ts",
      ".jsx",
      ".tsx",
      ".html",
      ".htm",
      ".php",
      ".css",
      ".scss",
      ".sass",
      ".json",
      ".xml",
      ".yaml",
      ".yml",
      // Database
      ".sql",
      // Images
      ".jpg",
      ".jpeg",
      ".png",
      ".gif",
      ".webp",
      ".svg",
      ".ico",
      ".bmp",
      // Documents
      ".md",
      ".txt",
      ".pdf",
      // Config
      ".env",
      ".gitignore",
      ".gitattributes",
      // Other
      ".lock",
      ".log",
    ]);

    // Define allowed filenames (without extension)
    const allowedFilenames = new Set([
      "package.json",
      "package-lock.json",
      "README",
      "LICENSE",
      ".gitignore",
      "server.js",
      ".env.example",
      "tsconfig.json",
      "webpack.config.js",
    ]);

    // Directories to skip (never clean these)
    const skipDirs = new Set([
      "node_modules",
      ".git",
      ".vscode",
      ".idea",
      "dist",
      "build",
      "coverage",
      ".next",
      "vendor",
    ]);

    // Directories to scan (only clean within these)
    const scanDirs = ["public", "BackEnd", "database"];

    const deletedFiles = [];
    const deletedFolders = [];
    const failed = [];
    let totalSize = 0;

    // Helper to check if file is allowed
    const isFileAllowed = (filePath, fileName) => {
      const ext = path.extname(fileName).toLowerCase();
      const baseName = path.basename(fileName);

      // Check if filename is in allowed list
      if (allowedFilenames.has(baseName) || allowedFilenames.has(fileName)) {
        return true;
      }

      // Check if extension is allowed
      if (ext && allowedExtensions.has(ext)) {
        return true;
      }

      // Allow files without extension if they're in allowed directories
      if (!ext) {
        const dirName = path.dirname(filePath).split(path.sep).pop();
        if (scanDirs.includes(dirName)) {
          return true;
        }
      }

      return false;
    };

    // Helper to recursively scan directory
    const scanDirectory = (dirPath, relativePath = "") => {
      if (!fs.existsSync(dirPath)) {
        return;
      }

      const dirName = path.basename(dirPath);

      // Skip excluded directories
      if (skipDirs.has(dirName)) {
        return;
      }

      try {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });

        // Process files first
        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);
          const relPath = relativePath
            ? path.join(relativePath, entry.name)
            : entry.name;

          if (entry.isFile()) {
            // Check if file is allowed
            if (!isFileAllowed(fullPath, entry.name)) {
              try {
                const stats = fs.statSync(fullPath);
                deletedFiles.push({
                  path: relPath,
                  size: stats.size,
                  type: "orphaned_file",
                });
                totalSize += stats.size;
              } catch (err) {
                console.error(`Error getting stats for ${fullPath}:`, err);
              }
            }
          } else if (entry.isDirectory()) {
            // Recursively scan subdirectories
            if (!skipDirs.has(entry.name)) {
              scanDirectory(fullPath, relPath);
            }
          }
        }
      } catch (err) {
        console.error(`Error scanning directory ${dirPath}:`, err);
        failed.push({
          path: relativePath || dirPath,
          error: err.message,
          type: "scan_error",
        });
      }
    };

    // Helper to find empty folders (after files are deleted)
    const findEmptyFolders = (dirPath, relativePath = "") => {
      if (!fs.existsSync(dirPath)) {
        return;
      }

      const dirName = path.basename(dirPath);

      // Skip excluded directories
      if (skipDirs.has(dirName)) {
        return;
      }

      try {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });

        // Recursively check subdirectories first
        for (const entry of entries) {
          if (entry.isDirectory() && !skipDirs.has(entry.name)) {
            const fullPath = path.join(dirPath, entry.name);
            const relPath = relativePath
              ? path.join(relativePath, entry.name)
              : entry.name;
            findEmptyFolders(fullPath, relPath);
          }
        }

        // Check if current directory is empty (after subdirectories are processed)
        const remainingEntries = fs.readdirSync(dirPath);
        if (remainingEntries.length === 0 && relativePath !== "") {
          // Directory is empty, mark for deletion
          deletedFolders.push({
            path: relativePath,
            type: "empty_folder",
          });
        }
      } catch (err) {
        // Directory might have been deleted or is inaccessible
      }
    };

    // Step 1: Scan each allowed directory for orphaned files
    for (const scanDir of scanDirs) {
      const fullPath = path.join(projectRoot, scanDir);
      if (fs.existsSync(fullPath)) {
        scanDirectory(fullPath, scanDir);
      }
    }

    // Step 2: Delete orphaned files
    const deletedFilePaths = [];
    for (const fileInfo of deletedFiles) {
      const filePath = path.join(projectRoot, fileInfo.path);
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          deletedFilePaths.push(fileInfo.path);
          console.log(`Deleted orphaned file: ${fileInfo.path}`);
        }
      } catch (err) {
        console.error(`Error deleting ${fileInfo.path}:`, err);
        failed.push({
          path: fileInfo.path,
          error: err.message,
          type: "delete_error",
        });
      }
    }

    // Step 3: Find empty folders (after files are deleted)
    for (const scanDir of scanDirs) {
      const fullPath = path.join(projectRoot, scanDir);
      if (fs.existsSync(fullPath)) {
        findEmptyFolders(fullPath, scanDir);
      }
    }

    // Step 4: Delete empty folders (from deepest to shallowest)
    deletedFolders.sort(
      (a, b) => b.path.split(path.sep).length - a.path.split(path.sep).length
    );
    const deletedFolderPaths = [];
    for (const folderInfo of deletedFolders) {
      const folderPath = path.join(projectRoot, folderInfo.path);
      try {
        if (fs.existsSync(folderPath)) {
          const entries = fs.readdirSync(folderPath);
          if (entries.length === 0) {
            fs.rmdirSync(folderPath);
            deletedFolderPaths.push(folderInfo.path);
            console.log(`Deleted empty folder: ${folderInfo.path}`);
          }
        }
      } catch (err) {
        console.error(`Error deleting folder ${folderInfo.path}:`, err);
        failed.push({
          path: folderInfo.path,
          error: err.message,
          type: "delete_error",
        });
      }
    }

    res.json({
      success: true,
      message: `Cleanup completed. Deleted ${deletedFilePaths.length} orphaned file(s) and ${deletedFolderPaths.length} empty folder(s).`,
      deletedFiles: deletedFilePaths,
      deletedFolders: deletedFolderPaths,
      totalFilesDeleted: deletedFilePaths.length,
      totalFoldersDeleted: deletedFolderPaths.length,
      totalSize: totalSize,
      failed: failed,
    });
  } catch (error) {
    Logger.error("Cleanup codebase error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: error.message,
    });
  }
});

// Clean up unused pictures from database/pictures folder
router.post("/cleanup-pictures", async (req, res) => {
  console.log("Cleanup pictures route hit");
  try {
    const picturesDir = path.join(__dirname, "../../database/pictures");

    // Check if directory exists
    if (!fs.existsSync(picturesDir)) {
      return res.json({
        success: true,
        message: "Pictures directory does not exist",
        deleted: [],
        totalDeleted: 0,
        totalSize: 0,
      });
    }

    // Get all image_path values from users table
    const users = await db.query(
      "SELECT image_path FROM users WHERE image_path IS NOT NULL AND image_path != ''"
    );
    const userImagePaths = new Set();

    if (Array.isArray(users)) {
      users.forEach((user) => {
        if (user.image_path) {
          // Normalize paths - extract just the filename
          let imagePath = user.image_path;
          // Handle both /TCC/database/pictures/filename and database/pictures/filename
          if (imagePath.includes("/")) {
            const parts = imagePath.split("/");
            const filename = parts[parts.length - 1];
            userImagePaths.add(filename);
          } else {
            userImagePaths.add(imagePath);
          }
        }
      });
    } else if (users && users.image_path) {
      let imagePath = users.image_path;
      if (imagePath.includes("/")) {
        const parts = imagePath.split("/");
        const filename = parts[parts.length - 1];
        userImagePaths.add(filename);
      } else {
        userImagePaths.add(imagePath);
      }
    }

    console.log(`Found ${userImagePaths.size} referenced images in database`);

    // Get all files in pictures directory
    const files = fs.readdirSync(picturesDir);
    const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
    const imageFiles = files.filter((file) => {
      const ext = path.extname(file).toLowerCase();
      return imageExtensions.includes(ext);
    });

    console.log(`Found ${imageFiles.length} image files in directory`);

    // Find unused files
    const unusedFiles = [];
    let totalSize = 0;

    for (const file of imageFiles) {
      if (!userImagePaths.has(file)) {
        const filePath = path.join(picturesDir, file);
        try {
          const stats = fs.statSync(filePath);
          unusedFiles.push({
            filename: file,
            size: stats.size,
          });
          totalSize += stats.size;
        } catch (err) {
          console.error(`Error getting stats for ${file}:`, err);
        }
      }
    }

    console.log(`Found ${unusedFiles.length} unused files`);

    // Delete unused files
    const deleted = [];
    const failed = [];

    for (const fileInfo of unusedFiles) {
      const filePath = path.join(picturesDir, fileInfo.filename);
      try {
        fs.unlinkSync(filePath);
        deleted.push(fileInfo.filename);
        console.log(`Deleted: ${fileInfo.filename}`);
      } catch (err) {
        console.error(`Error deleting ${fileInfo.filename}:`, err);
        failed.push({
          filename: fileInfo.filename,
          error: err.message,
        });
      }
    }

    res.json({
      success: true,
      message: `Cleanup completed. Deleted ${deleted.length} unused picture(s).`,
      deleted: deleted,
      failed: failed,
      totalDeleted: deleted.length,
      totalSize: totalSize,
      totalFound: unusedFiles.length,
    });
  } catch (error) {
    Logger.error("Cleanup pictures error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: error.message,
    });
  }
});

module.exports = router;
