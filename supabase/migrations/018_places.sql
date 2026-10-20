-- Places with equipment, default place per weekday, and a per-session place choice
alter table public.profiles add column if not exists places jsonb not null default '[]'::jsonb;
alter table public.profiles add column if not exists place_by_dow jsonb not null default '[]'::jsonb;
grant update (places, place_by_dow) on public.profiles to authenticated;
alter table public.session_entries add column if not exists place text;
