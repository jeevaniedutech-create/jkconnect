import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL || "https://xjlpmjqjivtiqsayydit.supabase.co";
const anon =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqbHBtanFqaXZ0aXFzYXl5ZGl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5MTk4NTEsImV4cCI6MjA5ODQ5NTg1MX0.L3cQIoqkid7YUknSRq9B9jA9z4RiSQiePlqQpy_M_ak";

export const supabase = createClient(url, anon, {
  auth: { persistSession: false, autoRefreshToken: false },
});
