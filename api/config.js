// GET /api/config: public Supabase settings for the browser client.
// The publishable key is safe to expose; table access is governed by row-level security.
module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.status(200).json({ supabaseUrl: process.env.SUPABASE_URL || null, supabaseKey: process.env.SUPABASE_PUBLISHABLE_KEY || null });
};
