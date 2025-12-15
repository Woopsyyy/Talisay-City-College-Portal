const express = require("express");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const db = require("../config/database");
const Logger = require("../config/logger");
const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, "../../database/pictures");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const userId = req.session.user_id || "user";
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const sanitizedName = file.originalname
      .replace(/[^a-z0-9.-]/gi, "-")
      .toLowerCase();
    cb(null, `${userId}_${timestamp}_${sanitizedName}`);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

// Login endpoint
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res
        .status(400)
        .json({ error: "Username and password are required" });
    }

    const sql = "SELECT * FROM users WHERE username = $1";
    const users = await db.query(sql, [username]);

    // Handle both array and single object results
    const user = Array.isArray(users)
      ? users.length > 0
        ? users[0]
        : null
      : users;

    if (!user || (Array.isArray(users) && users.length === 0)) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Set session
    req.session.user_id = user.id;
    req.session.username = user.username;
    req.session.role = user.role;
    req.session.full_name = user.full_name || user.username;
    req.session.image_path = user.image_path || "/TCC/public/images/sample.jpg";
    if (user.school_id) {
      req.session.school_id = user.school_id;
    }

    Logger.success(`User logged in: ${user.username}`);

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
        school_id: user.school_id,
        image_path: user.image_path,
      },
    });
  } catch (error) {
    Logger.error("Login error", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Signup endpoint with file upload support
router.post("/signup", upload.single("profileImage"), async (req, res) => {
  try {
    // Get form data - handle both JSON and FormData
    const username = req.body.username?.trim();
    const password = req.body.password;
    const full_name = req.body.full_name?.trim() || req.body.name?.trim();
    const school_id = req.body.school_id;
    const role = req.body.role || "student";

    if (!username || !password || !full_name) {
      return res
        .status(400)
        .json({ error: "Username, password, and full name are required" });
    }

    // Check if username already exists
    const checkUser = await db.query(
      "SELECT id FROM users WHERE username = $1",
      [username]
    );
    if (Array.isArray(checkUser) ? checkUser.length > 0 : checkUser) {
      return res.status(400).json({ error: "Username already exists" });
    }

    // Check if school_id already exists (if provided)
    if (school_id) {
      const checkSchoolId = await db.query(
        "SELECT id FROM users WHERE school_id = $1",
        [school_id]
      );
      if (
        Array.isArray(checkSchoolId) ? checkSchoolId.length > 0 : checkSchoolId
      ) {
        return res.status(400).json({ error: "School ID already exists" });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Auto-generate student school_id when creating student accounts (if not provided)
    // New format: YYYY-XXXX (current year - unique 4 digits)
    let finalSchoolId = school_id || null;
    if (!finalSchoolId && role === "student") {
      const year = new Date().getFullYear();
      let attempts = 0;
      while (!finalSchoolId && attempts < 20) {
        const rand = Math.floor(Math.random() * 10000);
        const padded = ("0000" + rand).slice(-4);
        const candidate = `${year}-${padded}`;
        const existing = await db.query(
          "SELECT id FROM users WHERE school_id = $1",
          [candidate]
        );
        const exists = Array.isArray(existing)
          ? existing.length > 0
          : !!existing;
        if (!exists) finalSchoolId = candidate;
        attempts++;
      }
      // Fallback to deterministic suffix if unlucky
      if (!finalSchoolId) {
        finalSchoolId = `${year}-${Date.now().toString().slice(-4)}`;
      }
    }

    // Handle file upload if present
    let imagePath = "/TCC/public/images/sample.jpg";
    if (req.file) {
      imagePath = `/TCC/database/pictures/${req.file.filename}`;
    }

    // Insert user with RETURNING clause for PostgreSQL
    const sql = `INSERT INTO users (username, password, full_name, school_id, role, image_path) 
                     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`;
    const result = await db.query(sql, [
      username,
      hashedPassword,
      full_name,
      finalSchoolId,
      role,
      imagePath,
    ]);

    Logger.dataSaved(
      "users",
      result.id || (Array.isArray(result) ? result[0]?.id : result?.id)
    );

    res.status(201).json({
      success: true,
      message: "User created successfully",
      user_id:
        result.id || (Array.isArray(result) ? result[0]?.id : result?.id),
    });
  } catch (error) {
    Logger.error("Signup error", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Logout endpoint
router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: "Failed to logout" });
    }
    res.clearCookie("connect.sid");
    res.json({ success: true, message: "Logged out successfully" });
  });
});

// Check authentication status
router.get("/check", (req, res) => {
  if (req.session.user_id) {
    res.json({
      authenticated: true,
      user: {
        id: req.session.user_id,
        username: req.session.username,
        role: req.session.role,
        full_name: req.session.full_name,
        image_path: req.session.image_path,
        school_id: req.session.school_id,
      },
    });
  } else {
    res.json({ authenticated: false });
  }
});

// Check username or full_name availability
router.get("/check-availability", async (req, res) => {
  try {
    const { username, full_name, type } = req.query;

    // Support both old format (type + value) and new format (username/full_name)
    let checkValue = username || (type === "username" ? req.query.value : null);
    let checkFullName =
      full_name || (type === "full_name" ? req.query.value : null);

    if (!checkValue && !checkFullName) {
      return res
        .status(400)
        .json({ error: "Username or full name is required" });
    }

    let query;
    let params;

    if (checkValue && checkFullName) {
      // Check both
      query = "SELECT id FROM users WHERE username = $1 OR full_name = $2";
      params = [checkValue, checkFullName];
    } else if (checkValue) {
      // Check username only
      query = "SELECT id FROM users WHERE username = $1";
      params = [checkValue];
    } else {
      // Check full_name only
      query = "SELECT id FROM users WHERE full_name = $1";
      params = [checkFullName];
    }

    const users = await db.query(query, params);
    const isAvailable = Array.isArray(users) ? users.length === 0 : !users;
    res.json({ available: isAvailable });
  } catch (error) {
    Logger.error("Check availability error", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Reset password endpoint
router.post("/reset-password", async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ error: "Username is required" });
    }

    // Find user (no email column in users table)
    const users = await db.query("SELECT id FROM users WHERE username = $1", [
      username,
    ]);
    const user = Array.isArray(users)
      ? users.length > 0
        ? users[0]
        : null
      : users;

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Generate temporary password (8 chars: mix of uppercase, lowercase, numbers)
    const tempPassword = Math.random().toString(36).slice(2, 10).toUpperCase();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Update user password
    await db.query("UPDATE users SET password = $1 WHERE id = $2", [
      hashedPassword,
      user.id,
    ]);

    res.json({
      success: true,
      message: "Password reset successfully",
      temporary_password: tempPassword,
      username: username,
    });
  } catch (error) {
    Logger.error("Reset password error", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Update profile endpoint
router.post(
  "/update-profile",
  upload.single("profile_image"),
  async (req, res) => {
    try {
      if (!req.session.user_id) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      // Get form data - multer parses both files and fields
      // Handle both string and array values (multer sometimes returns arrays)
      const username = Array.isArray(req.body?.username)
        ? req.body.username[0]?.trim()
        : req.body?.username?.trim();
      const full_name = Array.isArray(req.body?.full_name)
        ? req.body.full_name[0]?.trim()
        : req.body?.full_name?.trim();
      const password = Array.isArray(req.body?.password)
        ? req.body.password[0]?.trim()
        : req.body?.password?.trim();

      if (!username || username === "") {
        return res.status(400).json({
          error: "Username is required",
          received: req.body,
        });
      }

      if (!full_name || full_name === "") {
        return res.status(400).json({
          error: "Full name is required",
          received: req.body,
        });
      }

      const userId = req.session.user_id;

      // Check for duplicates (excluding current user)
      const checkUser = await db.query(
        "SELECT id FROM users WHERE (username = $1 OR full_name = $2) AND id != $3",
        [username, full_name, userId]
      );
      if (Array.isArray(checkUser) ? checkUser.length > 0 : checkUser) {
        return res
          .status(400)
          .json({ error: "Username or full name already exists" });
      }

      // Build update query
      const updates = [];
      const values = [];
      let paramIndex = 1;

      updates.push(`username = $${paramIndex++}`);
      values.push(username);
      updates.push(`full_name = $${paramIndex++}`);
      values.push(full_name);

      if (password && password.trim() !== "") {
        const hashedPassword = await bcrypt.hash(password, 10);
        updates.push(`password = $${paramIndex++}`);
        values.push(hashedPassword);
      }

      // Handle file upload if present
      if (req.file) {
        const imagePath = `/TCC/database/pictures/${req.file.filename}`;
        updates.push(`image_path = $${paramIndex++}`);
        values.push(imagePath);
      }

      values.push(userId);
      const sql = `UPDATE users SET ${updates.join(
        ", "
      )} WHERE id = $${paramIndex}`;

      await db.query(sql, values);

      // Update session
      req.session.username = username;
      req.session.full_name = full_name;

      // Get updated user info
      const updatedUser = await db.query("SELECT * FROM users WHERE id = $1", [
        userId,
      ]);
      const user = Array.isArray(updatedUser) ? updatedUser[0] : updatedUser;
      if (user && user.image_path) {
        req.session.image_path = user.image_path;
      }

      res.json({
        success: true,
        message: "Profile updated successfully",
        user: {
          id: user.id,
          username: user.username,
          full_name: user.full_name,
          image_path: user.image_path,
        },
      });
    } catch (error) {
      Logger.error("Update profile error", error);
      res
        .status(500)
        .json({ error: "Internal server error", message: error.message });
    }
  }
);

module.exports = router;
