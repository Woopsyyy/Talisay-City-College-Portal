require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

// Supabase admin client using service role key (for server-side operations)
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

module.exports = supabaseAdmin;
