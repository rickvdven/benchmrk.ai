-- e-mail preferences + log (idempotent sends)
alter table public.profiles add column if not exists email_prefs jsonb not null
  default '{"weekly":true,"reminders":true,"team":true,"account":true}';
grant update (email_prefs) on public.profiles to authenticated;

create table if not exists public.mail_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  kind text not null,
  ref text not null default '',
  status text not null default 'sent',
  error text,
  created_at timestamptz not null default now(),
  unique (user_id, kind, ref)
);
alter table public.mail_log enable row level security;
create policy "mail_log: own/admin read" on public.mail_log for select using (user_id = auth.uid() or public.is_admin());

insert into public.app_settings (key, value) values
  ('mail_from', '"RoxEngine <onboarding@resend.dev>"'),
  ('mail_enabled', 'true')
on conflict (key) do nothing;
