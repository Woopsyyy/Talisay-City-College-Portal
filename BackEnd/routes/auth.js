const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const multer = require("multer");
const axios = require("axios");
const nodemailer = require("nodemailer");
const path = require("path");
const fs = require("fs");
const db = require("../config/database");
const Logger = require("../config/logger");
const supabaseAdmin = require("../config/supabaseAdmin");
const { getMailer, getMailFrom } = require("../config/mailer");
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "avatars";
const router = express.Router();
let resetSchemaEnsured = false;

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
        // Best-effort: include Google-link info for Settings UI
        try {
          await ensurePasswordResetSchema();
          const rows = await db.query(
            "SELECT google_email, google_linked FROM users WHERE id = $1::int LIMIT 1",
            [user.id]
          );
          if (Array.isArray(rows) && rows.length > 0) {
            user.google_email = rows[0].google_email || null;
            user.google_linked = rows[0].google_linked === true;
          }
        } catch (_e) {
          // Ignore if schema isn't present or DB permissions prevent ALTER/SELECT
        }

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

async function ensurePasswordResetSchema() {
  if (resetSchemaEnsured) return;
  // Best-effort schema alignment. Uses Postgres "IF NOT EXISTS" to avoid failures
  // when columns already exist.
  await db.query(
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS google_email TEXT"
  );
  await db.query(
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS google_linked BOOLEAN DEFAULT false"
  );
  await db.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_code TEXT");
  await db.query(
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_code_expires TIMESTAMP"
  );
  resetSchemaEnsured = true;
}

function normalizeUsername(v) {
  return String(v || "").trim();
}

function normalizeEmail(v) {
  return String(v || "")
    .trim()
    .toLowerCase();
}

function isGmail(email) {
  const e = normalizeEmail(email);
  return e.endsWith("@gmail.com") || e.endsWith("@googlemail.com");
}

function sha256Hex(input) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function generate6DigitCode() {
  const n = crypto.randomInt(0, 1000000);
  return String(n).padStart(6, "0");
}

// Step 1: Send verification code to the user's linked Gmail
router.post("/send-reset-code", async (req, res) => {
  try {
    const username = normalizeUsername(req.body?.username);
    if (!username) {
      return res.status(400).json({ error: "Username is required" });
    }

    await ensurePasswordResetSchema();

    const users = await db.query(
      "SELECT id, username, google_email, google_linked FROM users WHERE username = $1 LIMIT 1",
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

    const googleEmail = normalizeEmail(user.google_email);
    const isLinked = user.google_linked === true || !!googleEmail;

    if (!isLinked || !googleEmail || !isGmail(googleEmail)) {
      return res.status(403).json({
        error:
          "This account is not linked to Google. Password reset is unavailable.",
      });
    }

    const transporter = await getMailer();
    if (!transporter) {
      return res.status(500).json({
        error:
          "Email service is not configured on the server. Please contact an administrator.",
      });
    }

    const code = generate6DigitCode();
    const pepper = process.env.RESET_CODE_PEPPER || "";
    const codeHash = sha256Hex(code + pepper);

    const ttlMinutes = Math.min(
      15,
      Math.max(
        10,
        parseInt(process.env.RESET_CODE_TTL_MINUTES || "10", 10) || 10
      )
    );
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

    await db.query(
      "UPDATE users SET reset_code = $1, reset_code_expires = $2 WHERE id = $3::int",
      [codeHash, expiresAt, user.id]
    );

    const from = getMailFrom();
    const subject = "TCC Portal - Password Reset Verification Code";
    const text = `Your TCC Portal password reset verification code is: ${code}\n\nThis code will expire in ${ttlMinutes} minutes.\nIf you did not request this, you can ignore this email.`;

    // Log code to console for development (especially when using JSON transporter)
    if (transporter?.__devMock) {
      console.log(
        `\n========== PASSWORD RESET CODE FOR ${user.username} ==========`
      );
      console.log(`CODE: ${code}`);
      console.log(`Expires in ${ttlMinutes} minutes`);
      console.log(`=====================================\n`);
    }

    try {
      const info = await transporter.sendMail({
        from,
        to: googleEmail,
        subject,
        text,
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.4;">
            <h2 style="margin: 0 0 12px 0;">TCC Portal Password Reset</h2>
            <p style="margin: 0 0 12px 0;">Use this 6-digit verification code to reset your password:</p>
            <div style="font-size: 28px; font-weight: 700; letter-spacing: 6px; margin: 12px 0 16px 0;">${code}</div>
            <p style="margin: 0 0 8px 0;">This code expires in <b>${ttlMinutes} minutes</b>.</p>
            <p style="margin: 0; color: #666;">If you did not request this, you can ignore this email.</p>
          </div>
        `,
      });

      // Log Ethereal preview URL if using Ethereal
      if (transporter?.__etherealUser) {
        if (info.response && info.response.includes("250")) {
          const previewUrl = nodemailer.getTestMessageUrl(info);
          console.log(`\n✉️  Ethereal email preview: ${previewUrl}\n`);
        }
      }
    } catch (mailErr) {
      // If email sending fails, clear the code so a user isn't stuck with an unseen token.
      try {
        await db.query(
          "UPDATE users SET reset_code = NULL, reset_code_expires = NULL WHERE id = $1::int",
          [user.id]
        );
      } catch (cleanupErr) {
        Logger.error(
          "Failed to cleanup reset code after mail failure",
          cleanupErr
        );
      }
      Logger.error("Failed to send reset code email", mailErr);
      return res.status(500).json({
        error:
          "Failed to send verification code email. Please try again later.",
      });
    }

    res.json({
      success: true,
      message: "Verification code sent. Check your email.",
    });
  } catch (error) {
    Logger.error("Send reset code error", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Step 2: Validate code + set new password
router.post("/reset-password", async (req, res) => {
  try {
    const username = normalizeUsername(req.body?.username);
    const code = String(req.body?.code || "").trim();
    const newPassword = String(req.body?.new_password || "");
    const confirmNewPassword = String(req.body?.confirm_new_password || "");

    if (!username || !code || !newPassword || !confirmNewPassword) {
      return res.status(400).json({
        error:
          "Username, verification code, new password, and confirm new password are required",
      });
    }

    if (!/^\d{6}$/.test(code)) {
      return res
        .status(400)
        .json({ error: "Verification code must be 6 digits" });
    }

    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({ error: "Passwords do not match" });
    }

    await ensurePasswordResetSchema();

    const users = await db.query(
      "SELECT id, reset_code, reset_code_expires FROM users WHERE username = $1 LIMIT 1",
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

    if (!user.reset_code || !user.reset_code_expires) {
      return res.status(400).json({
        error: "No active reset request. Please click Send Code first.",
      });
    }

    const now = new Date();
    const expires = new Date(user.reset_code_expires);
    if (isNaN(expires.getTime()) || expires.getTime() < now.getTime()) {
      // Expired - clear stored code
      await db.query(
        "UPDATE users SET reset_code = NULL, reset_code_expires = NULL WHERE id = $1::int",
        [user.id]
      );
      return res.status(400).json({
        error: "Verification code expired. Please request a new code.",
      });
    }

    const pepper = process.env.RESET_CODE_PEPPER || "";
    const codeHash = sha256Hex(code + pepper);
    if (codeHash !== user.reset_code) {
      return res.status(400).json({ error: "Invalid verification code" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db.query(
      "UPDATE users SET password = $1, reset_code = NULL, reset_code_expires = NULL WHERE id = $2::int",
      [hashedPassword, user.id]
    );

    res.json({ success: true, message: "Password reset successfully" });
  } catch (error) {
    Logger.error("Reset password with code error", error);
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
      const googleEmailRaw = Array.isArray(req.body?.google_email)
        ? req.body.google_email[0]
        : req.body?.google_email;
      const googleEmail =
        googleEmailRaw === undefined
          ? undefined
          : String(googleEmailRaw).trim();

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

      // Google-linked Gmail address (used for forgot-password verification codes)
      // If the field is present, allow clearing by submitting empty.
      if (googleEmail !== undefined) {
        await ensurePasswordResetSchema();
        const normalized = String(googleEmail || "")
          .trim()
          .toLowerCase();
        if (
          normalized &&
          !(
            normalized.endsWith("@gmail.com") ||
            normalized.endsWith("@googlemail.com")
          )
        ) {
          return res.status(400).json({
            error: "Please use a valid Gmail address (ends with @gmail.com)",
          });
        }
        const finalEmail = normalized === "" ? null : normalized;
        const linked = !!finalEmail;
        updates.push(`google_email = $${paramIndex++}`);
        values.push(finalEmail);
        updates.push(`google_linked = $${paramIndex++}`);
        values.push(linked);
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
          google_email: user.google_email || null,
          google_linked: user.google_linked === true,
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

// Google OAuth routes for linking Gmail accounts
router.get("/google", (req, res) => {
  const userId = req.session.user_id;
  if (!userId) {
    // Require login before linking
    return res.redirect("/index.html?login_required=1");
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri =
    process.env.GOOGLE_OAUTH_REDIRECT ||
    `${req.protocol}://${req.get("host")}/api/auth/google/callback`;

  if (!clientId) {
    return res.status(500).send("Google OAuth not configured on server");
  }

  // Save where to return after linking (best-effort)
  req.session.oauth_redirect = req.get("Referer") || "/";
  const state = crypto.randomBytes(12).toString("hex");
  req.session.google_oauth_state = state;

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
    clientId
  )}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&response_type=code&scope=${encodeURIComponent(
    "openid email profile"
  )}&access_type=offline&prompt=consent&state=${state}`;

  res.redirect(authUrl);
});

router.get("/google/callback", async (req, res) => {
  const { code, state } = req.query;
  if (!code || state !== req.session.google_oauth_state) {
    return res.status(400).send("Invalid OAuth response");
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri =
    process.env.GOOGLE_OAUTH_REDIRECT ||
    `${req.protocol}://${req.get("host")}/api/auth/google/callback`;

  try {
    const tokenResp = await axios.post(
      "https://oauth2.googleapis.com/token",
      new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }).toString(),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const accessToken = tokenResp.data.access_token;
    if (!accessToken) throw new Error("No access token received from Google");

    const userinfo = await axios.get(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const email = (userinfo.data?.email || "").toLowerCase();
    if (!email) {
      throw new Error("Could not determine email from Google profile");
    }

    if (!email.endsWith("@gmail.com") && !email.endsWith("@googlemail.com")) {
      return res.status(400).send("Please link a Gmail account");
    }

    if (!req.session.user_id) {
      // Not logged in - require login to finish linking
      return res.redirect(
        (req.session.oauth_redirect || "/") + "?google_linked=need_login"
      );
    }

    await db.query(
      "UPDATE users SET google_email = $1, google_linked = true WHERE id = $2::int",
      [email, req.session.user_id]
    );

    const redirectTarget = req.session.oauth_redirect || "/";
    delete req.session.google_oauth_state;
    delete req.session.oauth_redirect;

    res.redirect(redirectTarget + "?google_linked=1");
  } catch (err) {
    Logger.error("Google OAuth error", err);
    res.status(500).send("Google OAuth failed");
  }
});

module.exports = router;
