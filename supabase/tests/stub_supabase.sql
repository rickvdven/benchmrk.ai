-- Minimal stand-in for Supabase (auth schema, roles, the few tables migration 022 touches) for local scenario tests.
alter default privileges in schema public grant all on tables to authenticated, anon;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$; do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('app.uid', true), '')::uuid $$;
create table public.user_roles (user_id uuid, role text);
create function public.has_role(_u uuid, _r text) returns boolean language sql stable security definer as $$ select exists (select 1 from public.user_roles where user_id=_u and role=_r) $$;
create function public.is_admin() returns boolean language sql stable security definer as $$ select public.has_role(auth.uid(),'admin') $$;
create table public.profiles (id uuid primary key references auth.users, email text);
create table public.knowledge_sources (id uuid primary key default gen_random_uuid(), title text not null, category text not null default 'science', author text, source_url text, summary text, takeaways text[] not null default '{}', created_at timestamptz default now());
alter table public.knowledge_sources enable row level security;
create policy r on public.knowledge_sources for select using (true);
grant usage on schema public, auth to authenticated, anon;
grant select on all tables in schema public to authenticated, anon;
grant execute on all functions in schema public to authenticated, anon;
insert into auth.users values ('00000000-0000-0000-0000-00000000000a'),('00000000-0000-0000-0000-00000000000b');
insert into public.profiles values ('00000000-0000-0000-0000-00000000000a','a@x'),('00000000-0000-0000-0000-00000000000b','b@x');
insert into public.user_roles values ('00000000-0000-0000-0000-00000000000b','admin');
