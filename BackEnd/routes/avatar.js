const express = require("express");
const router = express.Router();
const multer = require("multer");
const sharp = require("sharp");
const supabaseAdmin = require("../config/supabaseAdmin");
const db = require("../config/database");
const Logger = require("../config/logger");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
});

const AVATAR_MAX_DIM = 512;
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "avatars";
const RATE_LIMIT_SECONDS = 10 * 60; // 10 minutes

function avatarPathForUser(userId) {
  return `${userId}.webp`;
}

function requireAuth(req, res, next) {
  // Support both session-based auth and passport-style req.user
  const userId =
    (req.user && req.user.id) || (req.session && req.session.user_id);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  req.userId = userId;
  next();
}

router.post(
  "/upload",
  requireAuth,
  upload.single("avatar"),
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });

      const userId = req.userId;

      // Rate limit check
      const row = await db.query(
        "SELECT last_avatar_upload FROM public.users WHERE id = $1::int",
        [userId]
      );
      const last =
        row &&
        (Array.isArray(row)
          ? row[0] && row[0].last_avatar_upload
          : row.last_avatar_upload);
      if (last) {
        const diff = (Date.now() - new Date(last).getTime()) / 1000;
        if (diff < RATE_LIMIT_SECONDS) {
          const wait = Math.ceil((RATE_LIMIT_SECONDS - diff) / 60);
          return res
            .status(429)
            .json({ error: `Rate limited. Try again in ${wait} minute(s).` });
        }
      }

      const allowed = ["image/jpeg", "image/png", "image/webp"];
      if (!allowed.includes(req.file.mimetype))
        return res.status(415).json({ error: "Unsupported media type" });

      const optimized = await sharp(req.file.buffer)
        .rotate()
        .resize({
          width: AVATAR_MAX_DIM,
          height: AVATAR_MAX_DIM,
          fit: "inside",
        })
        .webp({ quality: 72, effort: 6 })
        .toBuffer();

      if (optimized.length > 2 * 1024 * 1024)
        return res.status(413).json({ error: "Processed file too large" });

      const path = avatarPathForUser(userId);

      const { data, error: uploadErr } = await supabaseAdmin.storage
        .from(BUCKET)
        .upload(path, optimized, { contentType: "image/webp", upsert: true });

      // If the bucket doesn't exist, attempt to create it and retry the upload
      if (uploadErr) {
        const msg = uploadErr.message || String(uploadErr);
        if (
          msg.includes("Bucket not found") ||
          msg.includes("No such bucket") ||
          uploadErr.status === 404
        ) {
          Logger.warning(
            "Bucket not found — attempting to create bucket and retry upload"
          );
          const { error: createErr } = await supabaseAdmin.storage
            .createBucket(BUCKET, { public: false })
            .catch((e) => ({ error: e }));
          if (createErr) {
            Logger.error("Failed to create storage bucket", createErr);
            return res
              .status(500)
              .json({ error: "Storage bucket unavailable" });
          }

          const { error: retryErr } = await supabaseAdmin.storage
            .from(BUCKET)
            .upload(path, optimized, {
              contentType: "image/webp",
              upsert: true,
            });
          if (retryErr) {
            Logger.error(
              "Storage upload failed after bucket creation",
              retryErr
            );
            return res.status(500).json({ error: "Failed to upload avatar" });
          }
        } else {
          Logger.error("Storage upload failed", uploadErr);
          return res.status(500).json({ error: "Failed to upload avatar" });
        }
      }

      // Update user's image_path and avatar_path so frontend (`image_path`) reflects changes
      const updateSql = `
        UPDATE public.users
        SET image_path = $2::text, avatar_path = $2::text, last_avatar_upload = now()
        WHERE id = $1::int
        RETURNING image_path as avatar_path;
      `;
      await db.query(updateSql, [userId, path]);

      const { data: signed, error: signedErr } = await supabaseAdmin.storage
        .from(BUCKET)
        .createSignedUrl(path, 60 * 60);
      if (signedErr) {
        Logger.error("Signed URL generation failed", signedErr);
        return res.status(500).json({ error: "Failed to generate avatar URL" });
      }

      Logger.dataSaved("avatars", userId);
      return res.json({ avatar_path: path, url: signed.signedUrl });
    } catch (err) {
      Logger.error("Avatar upload error", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

router.get("/signed-url/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    if (!userId) return res.status(400).json({ error: "Missing userId" });

    const row = await db.query(
      "SELECT COALESCE(image_path, avatar_path) as avatar_path FROM public.users WHERE id = $1::int",
      [userId]
    );
    const avatarPath = Array.isArray(row)
      ? row[0] && row[0].avatar_path
      : row && row.avatar_path;
    if (!avatarPath) return res.status(404).json({ error: "No avatar" });

    const { data: signed, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUrl(avatarPath, 60 * 60);
    if (error) {
      Logger.error("Signed URL error", error);
      return res.status(500).json({ error: "Could not create signed URL" });
    }
    return res.json({ url: signed.signedUrl });
  } catch (err) {
    Logger.error("Signed URL exception", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
