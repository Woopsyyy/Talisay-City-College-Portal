const express = require("express");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const db = require("../config/database");
const Logger = require("../config/logger");
const supabaseAdmin = require("../config/supabaseAdmin");
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "avatars";
const router = express.Router();

// Configure multer for form parsing; do NOT write files to disk anymore
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit; avatar uploads must use /api/avatar
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
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

// Signup endpoint with optional file upload
router.post("/signup", upload.single("profileImage"), async (req, res) => {
  try {
    // Get form data
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

    // Default avatar path
    let imagePath = "/TCC/public/images/sample.jpg";

    // Insert user first with RETURNING clause for PostgreSQL
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

    const userId =
      result.id || (Array.isArray(result) ? result[0]?.id : result?.id);

    Logger.dataSaved("users", userId);

    // If profile image provided, upload to Supabase Storage
    if (req.file) {
      try {
        const supabaseAdmin = require("../config/supabaseAdmin");
        const sharp = require("sharp");

        const AVATAR_MAX_DIM = 512;
        const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "avatars";

        const optimized = await sharp(req.file.buffer)
          .rotate()
          .resize({
            width: AVATAR_MAX_DIM,
            height: AVATAR_MAX_DIM,
            fit: "inside",
          })
          .webp({ quality: 72, effort: 6 })
          .toBuffer();

        const avatarPath = `${userId}.webp`;

        const { error: uploadErr } = await supabaseAdmin.storage
          .from(BUCKET)
          .upload(avatarPath, optimized, {
            contentType: "image/webp",
            upsert: true,
          });

        // If upload fails due to missing bucket, try to create bucket and retry
        if (uploadErr) {
          const msg = uploadErr.message || String(uploadErr);
          if (
            msg.includes("Bucket not found") ||
            msg.includes("No such bucket") ||
            uploadErr.status === 404
          ) {
            Logger.warning(
              "Signup avatar upload: bucket not found, attempting to create bucket"
            );
            const { error: createErr } = await supabaseAdmin.storage
              .createBucket(BUCKET, { public: false })
              .catch((e) => ({ error: e }));
            if (!createErr) {
              const { error: retryErr } = await supabaseAdmin.storage
                .from(BUCKET)
                .upload(avatarPath, optimized, {
                  contentType: "image/webp",
                  upsert: true,
                });
              if (!retryErr) {
                const updateSql = `
                  UPDATE public.users 
                  SET image_path = $1::text, avatar_path = $1::text, last_avatar_upload = now() 
                  WHERE id = $2::int
                `;
                await db.query(updateSql, [avatarPath, userId]);
                imagePath = avatarPath;
                Logger.dataSaved("avatar", userId);
              } else {
                Logger.error(
                  "Signup avatar upload failed after creating bucket",
                  retryErr
                );
              }
            } else {
              Logger.error(
                "Failed to create bucket during signup avatar upload",
                createErr
              );
            }
          } else {
            Logger.error("Avatar upload during signup failed", uploadErr);
          }
        } else {
          const updateSql = `
            UPDATE public.users 
            SET image_path = $1::text, avatar_path = $1::text, last_avatar_upload = now() 
            WHERE id = $2::int
          `;
          await db.query(updateSql, [avatarPath, userId]);
          imagePath = avatarPath;
          Logger.dataSaved("avatar", userId);
        }
      } catch (avatarErr) {
        Logger.error("Error processing avatar during signup", avatarErr);
        // Continue without avatar - don't fail signup
      }
    }

    res.status(201).json({
      success: true,
      message: "User created successfully",
      user_id: userId,
      avatar_path: imagePath,
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
    (async () => {
      const user = {
        id: req.session.user_id,
        username: req.session.username,
        role: req.session.role,
        full_name: req.session.full_name,
        image_path: req.session.image_path,
        school_id: req.session.school_id,
      };

      try {
        // If image_path looks like a storage object (not a public images/ path or http), add signed URL
        const ip = user.image_path || "";
        if (
          ip &&
          !ip.startsWith("http://") &&
          !ip.startsWith("https://") &&
          !ip.startsWith("images/") &&
          !ip.startsWith("/TCC/public/")
        ) {
          const { data: signed, error } = await supabaseAdmin.storage
            .from(BUCKET)
            .createSignedUrl(ip, 60 * 60);
          if (!error && signed && signed.signedUrl) {
            user.avatar_url = signed.signedUrl;
          }
        }
      } catch (e) {
        Logger.error("Failed to create signed URL in check session", e);
      }

      res.json({ authenticated: true, user });
    })();
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
    await db.query("UPDATE users SET password = $1 WHERE id = $2::int", [
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
        "SELECT id FROM users WHERE (username = $1 OR full_name = $2) AND id != $3::int",
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

      // If a profile image was submitted with the form, process and upload it
      if (req.file) {
        try {
          const supabaseAdmin = require("../config/supabaseAdmin");
          const sharp = require("sharp");
          const AVATAR_MAX_DIM = 512;
          const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "avatars";

          const optimized = await sharp(req.file.buffer)
            .rotate()
            .resize({
              width: AVATAR_MAX_DIM,
              height: AVATAR_MAX_DIM,
              fit: "inside",
            })
            .webp({ quality: 72, effort: 6 })
            .toBuffer();

          const avatarPath = `${userId}.webp`;

          const { error: uploadErr } = await supabaseAdmin.storage
            .from(BUCKET)
            .upload(avatarPath, optimized, {
              contentType: "image/webp",
              upsert: true,
            });

          if (uploadErr) {
            const msg = uploadErr.message || String(uploadErr);
            if (
              msg.includes("Bucket not found") ||
              msg.includes("No such bucket") ||
              uploadErr.status === 404
            ) {
              // Try to create the bucket and retry
              const { error: createErr } = await supabaseAdmin.storage
                .createBucket(BUCKET, { public: false })
                .catch((e) => ({ error: e }));
              if (!createErr) {
                const { error: retryErr } = await supabaseAdmin.storage
                  .from(BUCKET)
                  .upload(avatarPath, optimized, {
                    contentType: "image/webp",
                    upsert: true,
                  });
                if (retryErr) {
                  Logger.error(
                    "Profile avatar upload failed after bucket creation",
                    retryErr
                  );
                } else {
                  await db.query(
                    "UPDATE public.users SET image_path = $1::text, avatar_path = $1::text, last_avatar_upload = now() WHERE id = $2::int",
                    [avatarPath, userId]
                  );
                  req.session.image_path = avatarPath;
                }
              } else {
                Logger.error(
                  "Failed to create bucket for profile avatar",
                  createErr
                );
              }
            } else {
              Logger.error("Profile avatar upload failed", uploadErr);
            }
          } else {
            await db.query(
              "UPDATE public.users SET image_path = $1::text, avatar_path = $1::text, last_avatar_upload = now() WHERE id = $2::int",
              [avatarPath, userId]
            );
            req.session.image_path = avatarPath;
          }
        } catch (avatarErr) {
          Logger.error("Error processing profile image", avatarErr);
          // don't fail the profile update for avatar errors
        }
      }

      values.push(userId);
      const sql = `UPDATE users SET ${updates.join(
        ", "
      )} WHERE id = $${paramIndex}::int`;

      await db.query(sql, values);

      // Update session
      req.session.username = username;
      req.session.full_name = full_name;

      // Get updated user info
      const updatedUser = await db.query(
        "SELECT * FROM users WHERE id = $1::int",
        [userId]
      );
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
