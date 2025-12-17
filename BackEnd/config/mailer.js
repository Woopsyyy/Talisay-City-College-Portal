const nodemailer = require("nodemailer");

let cachedTransporter = null;

async function buildTransporterFromEnv() {
  // Preferred: generic SMTP configuration
  // MAIL_HOST, MAIL_PORT, MAIL_SECURE, MAIL_USER, MAIL_PASS
  const host = process.env.MAIL_HOST;
  const port = parseInt(process.env.MAIL_PORT || "587", 10);
  const secure =
    String(process.env.MAIL_SECURE || "false").toLowerCase() === "true";
  const user = process.env.MAIL_USER;
  const pass = process.env.MAIL_PASS;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });
  }

  // Fallback: Gmail via app password
  // GMAIL_USER + GMAIL_APP_PASSWORD (or GMAIL_PASS)
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD || process.env.GMAIL_PASS;
  if (gmailUser && gmailPass) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: { user: gmailUser, pass: gmailPass },
    });
  }

  // Fallback: Ethereal Email (free, no setup required, sends real test emails)
  // This works out-of-the-box without any .env configuration
  try {
    const testAccount = await nodemailer.createTestAccount();
    const t = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    t.__etherealUser = testAccount.user;
    console.log(
      `Mailer: using Ethereal Email (no .env needed). Test inbox: ${testAccount.web}`
    );
    return t;
  } catch (err) {
    console.error("Failed to create Ethereal test account:", err.message);
    return null;
  }
}

async function getMailer() {
  if (cachedTransporter) return cachedTransporter;
  cachedTransporter = await buildTransporterFromEnv();
  return cachedTransporter;
}

function getMailFrom() {
  return (
    process.env.MAIL_FROM ||
    process.env.MAIL_USER ||
    process.env.GMAIL_USER ||
    "noreply@tcc-portal.local"
  );
}

module.exports = { getMailer, getMailFrom };
