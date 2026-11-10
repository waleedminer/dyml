-- Pledges toward fundable systems in the orchard model (the water tank first).
-- Anyone can read totals and pledge; the bar in the model sums amounts per project.
create table if not exists public.project_pledges (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  project_id text not null check (char_length(project_id) between 1 and 40),
  donor text not null check (char_length(btrim(donor)) between 1 and 40),
  amount numeric(10, 2) not null check (amount > 0 and amount <= 100000),
  message text check (message is null or char_length(message) <= 280),
  show_name boolean not null default true
);

create index if not exists project_pledges_project_idx on public.project_pledges (project_id, created_at);

alter table public.project_pledges enable row level security;
drop policy if exists "Anyone can read project pledges" on public.project_pledges;
create policy "Anyone can read project pledges" on public.project_pledges for select to anon, authenticated using (true);
drop policy if exists "Anyone can pledge to a project" on public.project_pledges;
create policy "Anyone can pledge to a project" on public.project_pledges for insert to anon, authenticated with check (true);
grant select, insert on public.project_pledges to anon, authenticated;

do $$ begin
  alter publication supabase_realtime add table public.project_pledges;
exception when duplicate_object then null; end $$;
