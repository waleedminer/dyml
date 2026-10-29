// Browser Supabase client, configured from Vercel env vars via /api/config.
// Not loaded by any page yet; import it when a feature needs the database:
//   const supabase = await getSupabase();
let client;
export async function getSupabase() {
  if (client) return client;
  const cfg = await fetch('/api/config').then((r) => r.json());
  if (!cfg.supabaseUrl || !cfg.supabaseKey) throw new Error('Supabase is not configured on this deployment.');
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm');
  client = createClient(cfg.supabaseUrl, cfg.supabaseKey);
  return client;
}
