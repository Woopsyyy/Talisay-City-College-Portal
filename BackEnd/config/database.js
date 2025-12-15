const { Pool } = require("pg");
require("dotenv").config();
const Logger = require("./logger");

class Database {
  constructor() {
    this.pool = null;
  }

  async connect() {
    // Don't reconnect if already connected
    if (this.pool) {
      return this.pool;
    }

    try {
      // Check if using Supabase or local PostgreSQL
      const isSupabase = !!process.env.SUPABASE_DB_HOST;

      const dbConfig = {
        host: isSupabase
          ? process.env.SUPABASE_DB_HOST
          : process.env.DB_HOST || "localhost",
        user: isSupabase
          ? process.env.SUPABASE_DB_USER
          : process.env.DB_USER || "postgres",
        password: isSupabase
          ? process.env.SUPABASE_DB_PASSWORD
          : process.env.DB_PASSWORD || "",
        database: isSupabase
          ? process.env.SUPABASE_DB_DATABASE
          : process.env.DB_NAME || "accountmanager",
        port: parseInt(
          isSupabase
            ? process.env.SUPABASE_DB_PORT || "5432"
            : process.env.DB_PORT || "5432"
        ),
        max: 10, // Maximum number of clients in the pool
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
        // Supabase requires SSL, local dev can be disabled
        ssl: isSupabase
          ? { rejectUnauthorized: false }
          : process.env.DB_SSL === "true"
          ? { rejectUnauthorized: false }
          : false,
      };

      // Log connection attempt (without password)
      const dbType = isSupabase ? "Supabase PostgreSQL" : "Local PostgreSQL";
      Logger.database(`Connecting to ${dbType}...`);

      this.pool = new Pool(dbConfig);

      // Test connection
      const client = await this.pool.connect();
      Logger.database("Connected successfully");
      client.release();

      return this.pool;
    } catch (error) {
      Logger.error("Database connection failed", error);

      // Provide helpful error messages
      if (error.code === "ECONNREFUSED") {
        Logger.warning("PostgreSQL server is not running or not accessible");
      } else if (error.code === "28P01" || error.message.includes("password")) {
        Logger.warning("Authentication failed - check credentials in .env");
      } else if (
        error.code === "3D000" ||
        error.message.includes("does not exist")
      ) {
        Logger.warning("Database does not exist - check configuration");
      } else if (error.message.includes("invalid response")) {
        Logger.warning(
          "Connection protocol error - check port and database type"
        );
      }

      // Don't throw - allow server to continue
      // Connection will be retried on next query
      this.pool = null;
      throw error;
    }
  }

  async getConnection() {
    if (!this.pool) {
      await this.connect();
    }
    return this.pool;
  }

  async query(sql, params) {
    try {
      // Connect if not already connected
      if (!this.pool) {
        await this.connect();
      }

      // PostgreSQL uses $1, $2, etc. for parameters
      // If params are provided, we need to convert ? to $1, $2, etc.
      let queryText = sql;
      if (params && params.length > 0) {
        let paramIndex = 1;
        queryText = sql.replace(/\?/g, () => `$${paramIndex++}`);
      }

      const result = await this.pool.query(queryText, params);

      // PostgreSQL returns { rows: [], rowCount: number }
      // For compatibility with MySQL-style code:
      // - If it's an INSERT with RETURNING, return the row with insertId
      // - If it's a SELECT returning multiple rows, return array
      // - If it's a SELECT returning one row, return the row object
      // - If it's an UPDATE/DELETE, return result object with rowCount

      if (result.rows.length === 0) {
        // For UPDATE/DELETE queries that don't have RETURNING clause
        // Return the result object so rowCount is available
        if (
          sql.trim().toUpperCase().startsWith("UPDATE") ||
          sql.trim().toUpperCase().startsWith("DELETE")
        ) {
          return result; // { rowCount: number }
        }
        return [];
      }

      // Check if this looks like an INSERT with RETURNING (has id in first row)
      if (result.rows.length === 1 && result.rows[0].id) {
        const row = result.rows[0];
        row.insertId = row.id; // Add insertId for compatibility
        return row;
      }

      // For SELECT queries, return array of rows
      return result.rows;
    } catch (error) {
      Logger.error("Query error", error);
      throw error;
    }
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
      console.log("Database connection closed");
    }
  }
}

// Singleton instance
const db = new Database();

module.exports = db;
