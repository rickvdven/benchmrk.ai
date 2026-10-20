alter table public.profiles add column if not exists equipment text not null default 'gym' check (equipment in ('hyrox','gym','home'));
grant update (equipment) on public.profiles to authenticated;
