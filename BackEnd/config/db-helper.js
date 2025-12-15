/**
 * Supabase Database Helper
 *
 * This module provides a simple interface to switch between:
 * 1. Local PostgreSQL (via pg driver)
 * 2. Supabase (via @supabase/supabase-js)
 *
 * To use Supabase, set SUPABASE_URL and SUPABASE_ANON_KEY in .env
 */

require("dotenv").config();

const useSupabase = !!process.env.SUPABASE_URL;

let db;

if (useSupabase) {
  // Using Supabase
  const { supabase } = require("./supabase");
  db = supabase;
  console.log("🌐 Using Supabase as database");
} else {
  // Using local PostgreSQL
  const { Pool } = require("pg");

  const pool = new Pool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "accountmanager",
    port: parseInt(process.env.DB_PORT || "5432"),
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
  });

  db = pool;
  console.log("🔌 Using local PostgreSQL as database");
}

module.exports = db;
