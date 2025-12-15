require("dotenv").config();
const express = require("express");
const session = require("express-session");
const cors = require("cors");
const path = require("path");
const Logger = require("./BackEnd/config/logger");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);

// Body parser middleware - conditionally apply based on content type
// CRITICAL: Skip parsing for multipart/form-data to let multer handle it
app.use((req, res, next) => {
  const contentType = req.headers["content-type"] || "";

  // Skip ALL body parsing for multipart/form-data - multer will handle it
  if (contentType && contentType.indexOf("multipart/form-data") !== -1) {
    return next();
  }

  // For JSON requests
  if (contentType && contentType.indexOf("application/json") !== -1) {
    return express.json({ limit: "10mb" })(req, res, next);
  }

  // For URL-encoded requests
  if (
    contentType &&
    contentType.indexOf("application/x-www-form-urlencoded") !== -1
  ) {
    return express.urlencoded({ extended: true, limit: "10mb" })(
      req,
      res,
      next
    );
  }

  // For other requests (GET, etc.) or requests without content-type, skip parsing
  next();
});

// Session configuration
app.use(
  session({
    secret:
      process.env.SESSION_SECRET || "your-secret-key-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Serve static files from public directory
app.use(express.static(path.join(__dirname, "public")));

// Serve static files from database/pictures directory
app.use(
  "/database/pictures",
  express.static(path.join(__dirname, "database/pictures"))
);

// Initialize database connection
const db = require("./BackEnd/config/database");
db.connect().catch((err) => {
  console.error("Failed to initialize database:", err);
  process.exit(1);
});

// Import routes
const authRoutes = require("./BackEnd/routes/auth");
const adminRoutes = require("./BackEnd/routes/admin");
const teacherRoutes = require("./BackEnd/routes/teacher");
const studentRoutes = require("./BackEnd/routes/student");

// Use routes with /api prefix to match frontend expectations
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/teacher", teacherRoutes);
app.use("/api/student", studentRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Server is running" });
});

// Catch 404 and forward to error handler
app.use((req, res) => {
  res
    .status(404)
    .json({ error: "Route not found", path: req.path, method: req.method });
});

// Error handler
app.use((err, req, res, next) => {
  Logger.error("Server error", err);
  res
    .status(500)
    .json({ error: "Internal server error", message: err.message });
});

// Start server
app.listen(PORT, () => {
  Logger.serverStarted(PORT, process.env.NODE_ENV || "development");
});
