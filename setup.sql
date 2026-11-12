-- Daya admin: one-time setup for Supabase. Safe to run more than once.
-- Supabase dashboard > SQL Editor > New query > paste this > Run.

-- Where the admin saves your text, looks and articles.
create table if not exists public.site_content (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Only the site's server can read or write it (the public never touches it directly).
alter table public.site_content enable row level security;

-- Where uploaded photos live (public, so photos can show on the site).
insert into storage.buckets (id, name, public)
values ('site-images', 'site-images', true)
on conflict (id) do nothing;
