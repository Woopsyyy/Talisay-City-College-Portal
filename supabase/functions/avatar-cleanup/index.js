import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

export async function handler(req) {
  const { data: items, error } = await supabaseAdmin
    .from("avatar_cleanup")
    .select("id,user_id,avatar_path")
    .eq("processed", false)
    .limit(50);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }

  for (const it of items) {
    try {
      if (it.avatar_path) {
        const { error: delErr } = await supabaseAdmin.storage
          .from("avatars")
          .remove([it.avatar_path]);
        if (delErr) {
          console.error("Failed to delete avatar", it.avatar_path, delErr);
          continue;
        }
      }
      await supabaseAdmin
        .from("avatar_cleanup")
        .update({ processed: true })
        .eq("id", it.id);
    } catch (e) {
      console.error("Cleanup error", e);
    }
  }

  return new Response(JSON.stringify({ processed: items.length }), {
    status: 200,
  });
}
