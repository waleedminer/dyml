// Browser Supabase client. Settings come from Vercel env vars via /api/config;
// the public fallback keeps local static servers (no /api) working.
const FALLBACK = { supabaseUrl: 'https://jjhdzbzboyleeagdbdyx.supabase.co', supabaseKey: 'sb_publishable_zDeakpCB15td5U6__et3UQ_WPwxJIzw' };
let client;
export async function getSupabase() {
  if (client) return client;
  let cfg = FALLBACK;
  try {
    const r = await fetch('/api/config');
    if (r.ok) { const j = await r.json(); if (j.supabaseUrl && j.supabaseKey) cfg = j; }
  } catch { /* use fallback */ }
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm');
  client = createClient(cfg.supabaseUrl, cfg.supabaseKey);
  return client;
}
