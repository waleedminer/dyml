-- Tree sponsorship (waqf): pledges for the long-term trees in the orchard model.
-- Anyone can read and pledge (no accounts); constraints keep rows well-formed.
-- A tree can be sponsored in shares; the browser sums shares per tree.
create table if not exists public.tree_sponsors (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  tree_id text not null check (char_length(tree_id) between 1 and 40),
  kind text not null check (kind in ('mango', 'cashew', 'citrus')),
  sponsor text not null check (char_length(btrim(sponsor)) between 1 and 40),
  dedication text check (dedication is null or char_length(dedication) <= 80),
  message text check (message is null or char_length(message) <= 280),
  amount numeric(10, 2) not null check (amount > 0 and amount <= 100000),
  share numeric(6, 4) not null check (share > 0 and share <= 1),
  show_name boolean not null default true
);

create index if not exists tree_sponsors_tree_id_idx on public.tree_sponsors (tree_id);
create index if not exists tree_sponsors_created_at_idx on public.tree_sponsors (created_at desc);

alter table public.tree_sponsors enable row level security;
drop policy if exists "Anyone can read tree sponsors" on public.tree_sponsors;
create policy "Anyone can read tree sponsors" on public.tree_sponsors for select to anon, authenticated using (true);
drop policy if exists "Anyone can pledge" on public.tree_sponsors;
create policy "Anyone can pledge" on public.tree_sponsors for insert to anon, authenticated with check (true);
grant select, insert on public.tree_sponsors to anon, authenticated;

-- Live updates for open browsers (plaques appear as pledges come in)
do $$ begin
  alter publication supabase_realtime add table public.tree_sponsors;
exception when duplicate_object then null; end $$;
