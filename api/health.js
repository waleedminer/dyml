// GET /api/health: confirms this Vercel deployment can reach the Supabase project.
module.exports = async (req, res) => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    res.status(500).json({ ok: false, supabaseUrl: !!url, publishableKey: !!key, error: 'Supabase environment variables are not set on Vercel.' });
    return;
  }
  try {
    const r = await fetch(`${url}/auth/v1/health`, { headers: { apikey: key } });
    res.status(r.ok ? 200 : 502).json({ ok: r.ok, status: r.status, project: new URL(url).hostname.split('.')[0] });
  } catch (e) {
    res.status(502).json({ ok: false, error: String(e) });
  }
};
