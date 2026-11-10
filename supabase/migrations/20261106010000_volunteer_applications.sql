-- Volunteer applications from the "skip the game" path in the 3D model.
-- Anyone can submit; only the service role (the team's dashboard) can read.
create table if not exists public.volunteer_applications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  email text not null check (char_length(email) between 3 and 120 and position('@' in email) > 1),
  location text check (location is null or char_length(location) <= 80),
  skills text[] not null default '{}',
  availability text check (availability is null or char_length(availability) <= 40),
  message text check (message is null or char_length(message) <= 600),
  role text check (role is null or role in ('volunteer', 'student', 'teacher'))
);

create index if not exists volunteer_applications_created_at_idx on public.volunteer_applications (created_at desc);

alter table public.volunteer_applications enable row level security;
drop policy if exists "Anyone can apply" on public.volunteer_applications;
create policy "Anyone can apply" on public.volunteer_applications for insert to anon, authenticated with check (true);
-- No select policy for anon/authenticated: applications are private to the team.
grant insert on public.volunteer_applications to anon, authenticated;
