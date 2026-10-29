-- Comments pinned to points in the 3D model, with one level of replies.
-- Anyone can read and post (no accounts); constraints keep rows well-formed.
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  parent_id uuid references public.comments (id) on delete cascade,
  author text not null check (char_length(btrim(author)) between 1 and 40),
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  x double precision,
  y double precision,
  z double precision,
  mode text check (mode in ('explore', 'walk')),
  -- Top-level comments need a position; replies inherit their parent's.
  constraint comments_root_has_position check (parent_id is not null or (x is not null and y is not null and z is not null)),
  constraint comments_position_bounds check (x is null or (abs(x) < 1000 and abs(z) < 1000 and y between -50 and 500))
);

create index if not exists comments_parent_id_idx on public.comments (parent_id);
create index if not exists comments_created_at_idx on public.comments (created_at desc);

-- Replies may only target top-level comments (keeps threads one level deep).
create or replace function public.comments_reply_depth() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.parent_id is not null and exists (select 1 from public.comments c where c.id = new.parent_id and c.parent_id is not null) then
    raise exception 'Replies can only be added to top-level comments';
  end if;
  return new;
end $$;
drop trigger if exists comments_reply_depth on public.comments;
create trigger comments_reply_depth before insert on public.comments for each row execute function public.comments_reply_depth();

alter table public.comments enable row level security;
drop policy if exists "Anyone can read comments" on public.comments;
create policy "Anyone can read comments" on public.comments for select to anon, authenticated using (true);
drop policy if exists "Anyone can post comments" on public.comments;
create policy "Anyone can post comments" on public.comments for insert to anon, authenticated with check (true);
grant select, insert on public.comments to anon, authenticated;

-- Live updates for open browsers
do $$ begin
  alter publication supabase_realtime add table public.comments;
exception when duplicate_object then null; end $$;
