create table if not exists public.ai_scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  ok boolean not null default true
);
alter table public.ai_scans enable row level security;
create policy "ai_scans: admin read" on public.ai_scans for select using (public.is_admin());
insert into public.app_settings (key, value) values
  ('google_login', 'false'),
  ('ai_scan_daily_limit', '20')
on conflict (key) do nothing;
