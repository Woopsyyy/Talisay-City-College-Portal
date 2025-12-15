const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../config/database");
const router = express.Router();

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
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Signup endpoint
router.post("/signup", async (req, res) => {
  try {
    const {
      username,
      password,
      full_name,
      school_id,
      role = "student",
    } = req.body;

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

    // Insert user with RETURNING clause for PostgreSQL
    const sql = `INSERT INTO users (username, password, full_name, school_id, role, image_path) 
                     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`;
    const result = await db.query(sql, [
      username,
      hashedPassword,
      full_name,
      school_id || null,
      role,
      "/TCC/public/images/sample.jpg",
    ]);

    res.status(201).json({
      success: true,
      message: "User created successfully",
      user_id: result.insertId || result.id,
    });
  } catch (error) {
    console.error("Signup error:", error);
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

// Check username availability
router.get("/check-availability", async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) {
      return res.status(400).json({ error: "Username is required" });
    }

    const users = await db.query("SELECT id FROM users WHERE username = $1", [
      username,
    ]);
    const isAvailable = Array.isArray(users) ? users.length === 0 : !users;
    res.json({ available: isAvailable });
  } catch (error) {
    console.error("Check availability error:", error);
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

    // Find user
    const users = await db.query(
      "SELECT id, email FROM users WHERE username = $1",
      [username]
    );
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
    console.error("Reset password error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
