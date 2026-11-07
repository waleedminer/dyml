-- Class leaderboard for the quick checks in the 3D model.
-- Anyone can read the board and post a score (no accounts).
create table if not exists public.quiz_scores (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (char_length(btrim(name)) between 1 and 40),
  score integer not null check (score between 0 and 1000),
  answered integer not null check (answered between 0 and 100),
  email text check (email is null or (char_length(email) between 3 and 120 and position('@' in email) > 1))
);

create index if not exists quiz_scores_score_idx on public.quiz_scores (score desc, created_at asc);

alter table public.quiz_scores enable row level security;
drop policy if exists "Anyone can read scores" on public.quiz_scores;
create policy "Anyone can read scores" on public.quiz_scores for select to anon, authenticated using (true);
drop policy if exists "Anyone can post a score" on public.quiz_scores;
create policy "Anyone can post a score" on public.quiz_scores for insert to anon, authenticated with check (true);
-- Column-level read: the public board shows names and scores, never emails.
grant insert on public.quiz_scores to anon, authenticated;
grant select (id, created_at, name, score, answered) on public.quiz_scores to anon, authenticated;
