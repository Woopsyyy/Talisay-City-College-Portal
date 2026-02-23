
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const key = process.env.VITE_SUPABASE_ANON_KEY || 'dummy';
const supabase = createClient(url, key);

async function test() {
  const { data, error } = await supabase.from('users').select('image_path').limit(3);
  console.log('data:', data, 'error:', error);
}
test();

