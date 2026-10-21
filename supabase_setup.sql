-- Jalankan sekali di Supabase → SQL Editor
create table if not exists public.app_sync (
  id text primary key,
  data jsonb,
  updated_at timestamptz default now()
);

alter table public.app_sync enable row level security;

-- Aplikasi ini tanpa login, jadi akses memakai publishable (anon) key.
drop policy if exists "app_sync anon all" on public.app_sync;
create policy "app_sync anon all" on public.app_sync
  for all to anon using (true) with check (true);

-- Aktifkan realtime agar device lain update otomatis
alter publication supabase_realtime add table public.app_sync;
