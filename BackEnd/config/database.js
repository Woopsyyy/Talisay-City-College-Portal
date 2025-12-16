// BackEnd/config/database.js
// BackEnd/config/database.js
const { Pool } = require("pg");
require("dotenv").config();
const Logger = require("./logger");
const dns = require("dns");
const dnsPromises = require("dns").promises;


try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
  console.log("DNS servers configured: 8.8.8.8, 1.1.1.1, 8.8.4.4");
} catch (e) {
  console.warn(`Failed to set DNS servers: ${e.message}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class Database {
  constructor() {
    this.pool = null;
    this.ipv4Address = null;
    this.ipv4FallbackTried = false;
  }

  async connect() {
    if (this.pool) return this.pool;

    const maxRetries = parseInt(process.env.DB_CONNECT_RETRIES || "3", 10);
    const initialDelay = parseInt(
      process.env.DB_CONNECT_INITIAL_DELAY_MS || "1000",
      10
    );

    const host =
      process.env.SUPABASE_DB_HOST ||
      "aws-0-ap-southeast-1.pooler.supabase.com";
    const user = process.env.SUPABASE_DB_USER || "postgres.YOUR_PROJECT_REF";
    const password = process.env.SUPABASE_DB_PASSWORD || "YOUR_DB_PASSWORD";
    const database = process.env.SUPABASE_DB_DATABASE || "postgres";
    const port = parseInt(process.env.SUPABASE_DB_PORT || "5432", 10);

    // Pre-resolve hostname to IP address to avoid DNS issues
    // CRITICAL: pg library uses dns.lookup() internally which ignores dns.setServers()
    // So we MUST resolve to IP first, then use IP address in connection
    if (!this.ipv4Address) {
      Logger.database(`Pre-resolving hostname: ${host}`);
      let resolved = false;
      
      // Strategy 1: Try dns.resolve4() with custom DNS servers
      try {
        const addresses = await dnsPromises.resolve4(host);
        if (addresses && addresses.length > 0) {
          this.ipv4Address = addresses[0];
          Logger.database(`✓ Resolved ${host} to IPv4: ${this.ipv4Address}`);
          resolved = true;
        }
      } catch (e4) {
        Logger.warning(`resolve4 failed: ${e4.message}`);
      }
      
      // Strategy 2: Try dns.resolve6() if IPv4 failed
      if (!resolved) {
        try {
          const addresses = await dnsPromises.resolve6(host);
          if (addresses && addresses.length > 0) {
            this.ipv4Address = addresses[0];
            Logger.database(`✓ Resolved ${host} to IPv6: ${this.ipv4Address}`);
            resolved = true;
          }
        } catch (e6) {
          Logger.warning(`resolve6 failed: ${e6.message}`);
        }
      }
      
      // Strategy 3: Last resort - use dns.lookup() (system DNS)
      if (!resolved) {
        try {
          const res = await dnsPromises.lookup(host, { family: 0 });
          if (res && res.address) {
            this.ipv4Address = res.address;
            Logger.database(`✓ Resolved ${host} via system DNS to: ${this.ipv4Address}`);
            resolved = true;
          }
        } catch (e7) {
          Logger.warning(`lookup failed: ${e7.message}`);
        }
      }
      
      if (!resolved) {
        Logger.warning(`⚠ Could not pre-resolve ${host} - will try during connection (may fail)`);
      }
    } else {
      Logger.database(`Using cached IP address: ${this.ipv4Address} for ${host}`);
    }

    const sslEnabled =
      String(process.env.SUPABASE_DB_SSL || "true").toLowerCase() === "true";
    const rejectUnauthorized =
      String(
        process.env.DB_SSL_REJECT_UNAUTHORIZED || "false"
      ).toLowerCase() === "true";

    const baseConfig = {
      max: parseInt(process.env.DB_POOL_MAX || "10", 10),
      idleTimeoutMillis: parseInt(
        process.env.DB_IDLE_TIMEOUT_MS || "30000",
        10
      ),
      connectionTimeoutMillis: parseInt(
        process.env.DB_CONNECTION_TIMEOUT_MS || "10000",
        10
      ),
      host,
      user,
      password,
      database,
      port,
      ssl: sslEnabled ? { rejectUnauthorized } : false,
    };

    let lastError = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const dbConfig = { ...baseConfig };
        
        // ALWAYS use IP address if we have it (pg library's DNS doesn't respect dns.setServers)
        if (this.ipv4Address) {
          dbConfig.host = this.ipv4Address;
          Logger.database(`Using resolved IP: ${this.ipv4Address} instead of hostname`);
        } else {
          Logger.warning(`No resolved IP available, using hostname (may fail): ${host}`);
        }

        Logger.database(
          `Attempting DB connect to ${dbConfig.user}@${
            dbConfig.host
          } (attempt ${attempt + 1}/${maxRetries + 1})`
        );

        this.pool = new Pool(dbConfig);

        this.pool.on("error", (err) => {
          Logger.error("Unexpected idle client error", err.message || err);
        });

        const client = await this.pool.connect();
        Logger.database("Connected successfully");
        client.release();
        return this.pool;
      } catch (error) {
        lastError = error;

        if (error.code === "ENOTFOUND" && !this.ipv4FallbackTried) {
          Logger.warning("DNS resolution failed, trying resolve fallback");
          this.ipv4FallbackTried = true;
          try {
            // Try dns.resolve4() which respects dns.setServers()
            try {
              const addresses = await dnsPromises.resolve4(host);
              if (addresses && addresses.length > 0) {
                this.ipv4Address = addresses[0];
                Logger.database(
                  `Resolved IPv4 ${this.ipv4Address} for ${host}, retrying`
                );
              }
            } catch (e4) {
              // Try IPv6
              try {
                const addresses = await dnsPromises.resolve6(host);
                if (addresses && addresses.length > 0) {
                  this.ipv4Address = addresses[0];
                  Logger.database(
                    `Resolved IPv6 ${this.ipv4Address} for ${host}, retrying`
                  );
                }
              } catch (e6) {
                // Last resort: system DNS lookup
                const res = await dnsPromises.lookup(host, { family: 0 });
                if (res && res.address) {
                  this.ipv4Address = res.address;
                  Logger.database(
                    `Resolved via system DNS ${this.ipv4Address} for ${host}, retrying`
                  );
                }
              }
            }
          } catch (dnsErr) {
            Logger.warning(
              `DNS lookup fallback failed: ${dnsErr.message || dnsErr}`
            );
          }
        } else if (
          error.message &&
          error.message.toLowerCase().includes("tenant or user not found")
        ) {
          Logger.warning(
            "Tenant or user not found - check SUPABASE_DB_USER matches project ref and password"
          );
        } else if (
          error.code === "28P01" ||
          (error.message && error.message.toLowerCase().includes("password"))
        ) {
          Logger.warning(
            "Authentication failed - check DB user/password in environment"
          );
        } else if (error.code === "ECONNREFUSED") {
          Logger.warning(
            "PostgreSQL server refused connection - check host/port and firewall"
          );
        } else if (error.code === "ETIMEDOUT") {
          Logger.warning(
            "Connection attempt timed out - network or firewall may be blocking port 5432"
          );
        }

        if (this.pool) await this.pool.end();
        this.pool = null;

        if (attempt < maxRetries) {
          const delay = initialDelay * Math.pow(2, attempt);
          Logger.database(`Retrying DB connection in ${delay}ms`);
          await sleep(delay);
          continue;
        }

        Logger.error(
          "Database connection failed after retries",
          error.message || error
        );
        throw lastError;
      }
    }
  }

  async getConnection() {
    if (!this.pool) await this.connect();
    return this.pool;
  }

  async query(sql, params) {
    if (!this.pool) await this.connect();

    let queryText = sql;
    if (params && params.length > 0) {
      let paramIndex = 1;
      queryText = sql.replace(/\?/g, () => `$${paramIndex++}`);
    }

    const result = await this.pool.query(queryText, params);

    if (result.rows.length === 1 && result.rows[0].id) {
      result.rows[0].insertId = result.rows[0].id;
    }

    // For UPDATE/DELETE queries without RETURNING
    if (result.rows.length === 0) return result;

    return result.rows;
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
      console.log("Database connection closed");
    }
  }
}

// Export singleton
module.exports = new Database();
