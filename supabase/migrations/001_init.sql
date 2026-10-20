-- RoxEngine 2.0 schema
create extension if not exists pgcrypto;

-- ---------- roles ----------
create table public.user_roles (
  user_id uuid not null references auth.users on delete cascade,
  role text not null check (role in ('admin','coach')),
  primary key (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_uid uuid, _role text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _uid and role = _role);
$$;
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(auth.uid(), 'admin');
$$;

create policy "roles: read own" on public.user_roles for select using (user_id = auth.uid() or public.is_admin());

-- ---------- teams ----------
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  race_name text,
  race_date date,
  goal_sec int,
  captain_id uuid references auth.users on delete set null,
  athlete_1 uuid references auth.users on delete set null,
  athlete_2 uuid references auth.users on delete set null,
  shared_sim_dow int check (shared_sim_dow between 0 and 6),
  created_at timestamptz not null default now()
);
alter table public.teams enable row level security;

-- ---------- profiles ----------
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text,
  display_name text,
  onboarded boolean not null default false,
  lang text not null default 'en',
  units text not null default 'metric' check (units in ('metric','imperial')),
  sex text check (sex in ('woman','man')),
  birth_year int,
  weight_kg numeric,
  category text,
  race_name text,
  race_date date,
  race_tz text,
  goal_sec int check (goal_sec is null or goal_sec between 1800 and 14400),
  plan_start date,
  archetype text default 'hybrid',
  lthr int,
  max_hr int,
  rest_hr int,
  threshold_pace_sec int,
  vo2max numeric,
  pr5k_sec int,
  weekly_km numeric,
  flags jsonb not null default '{"achilles":false,"quad":false,"back":false,"shin":false}',
  station_stars jsonb not null default '{"skierg":3,"sledPush":3,"sledPull":3,"burpees":3,"row":3,"farmers":3,"lunges":3,"wallballs":3}',
  station_times jsonb not null default '{}',
  compromised_ratio numeric,
  decay_sec int,
  week_schedule jsonb,
  pace_adjust_sec int not null default 0,
  baseline jsonb,
  team_id uuid references public.teams on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint hr_order check (lthr is null or max_hr is null or lthr < max_hr)
);
alter table public.profiles enable row level security;

create or replace function public.is_teammate(_other uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.teams t
    where (t.athlete_1 = auth.uid() and t.athlete_2 = _other) or (t.athlete_2 = auth.uid() and t.athlete_1 = _other)
  );
$$;

create policy "profiles: read own, teammate, admin" on public.profiles for select
  using (id = auth.uid() or public.is_teammate(id) or public.is_admin());
create policy "profiles: update own" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
-- team membership and identity columns can only change through RPCs
revoke update on public.profiles from authenticated, anon;
grant update (display_name, onboarded, lang, units, sex, birth_year, weight_kg, category, race_name, race_date, race_tz, goal_sec,
  plan_start, archetype, lthr, max_hr, rest_hr, threshold_pace_sec, vo2max, pr5k_sec, weekly_km, flags, station_stars,
  station_times, compromised_ratio, decay_sec, week_schedule, pace_adjust_sec, baseline, updated_at) on public.profiles to authenticated;

create policy "teams: members and admin read" on public.teams for select
  using (athlete_1 = auth.uid() or athlete_2 = auth.uid() or public.is_admin());

-- ---------- training data ----------
create table public.session_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  date date not null,
  completed boolean not null default false,
  planned jsonb,
  actual_pace_sec int,
  avg_hr int,
  max_hr int,
  rpe int check (rpe between 1 and 10),
  notes text,
  wod jsonb,
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);
alter table public.session_entries enable row level security;
create policy "sessions: own all" on public.session_entries for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "sessions: teammate/admin read" on public.session_entries for select using (public.is_teammate(user_id) or public.is_admin());

create table public.benchmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  number int not null check (number between 1 and 5),
  date date not null,
  pace_sec int not null,
  avg_hr int not null,
  rpe int,
  new_lt_pace_sec int,
  new_lthr int,
  new_vo2 numeric,
  station_splits jsonb,
  run_splits jsonb,
  effect jsonb,
  created_at timestamptz not null default now()
);
alter table public.benchmarks enable row level security;
create policy "benchmarks: own all" on public.benchmarks for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "benchmarks: teammate/admin read" on public.benchmarks for select using (public.is_teammate(user_id) or public.is_admin());

create table public.morning_checks (
  user_id uuid not null references auth.users on delete cascade,
  date date not null,
  score int not null check (score between 1 and 10),
  primary key (user_id, date)
);
alter table public.morning_checks enable row level security;
create policy "morning: own all" on public.morning_checks for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "morning: admin read" on public.morning_checks for select using (public.is_admin());

create table public.plan_changes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  kind text not null,
  message text not null,
  payload jsonb
);
alter table public.plan_changes enable row level security;
create policy "changes: own all" on public.plan_changes for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "changes: admin read" on public.plan_changes for select using (public.is_admin());

-- ---------- knowledge & rules (admin managed) ----------
create table public.knowledge_sources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null default 'science',
  author text,
  source_url text,
  summary text,
  takeaways text[] not null default '{}',
  created_at timestamptz not null default now()
);
create table public.coaching_rules (
  rule_key text primary key,
  value numeric not null,
  unit text,
  description text,
  source_id uuid references public.knowledge_sources on delete set null,
  updated_at timestamptz not null default now()
);
create table public.station_baselines (
  weight_class text not null check (weight_class in ('light','medium','heavy')),
  station text not null,
  seconds int not null check (seconds between 30 and 1800),
  primary key (weight_class, station)
);
create table public.app_settings (
  key text primary key,
  value jsonb not null
);
alter table public.knowledge_sources enable row level security;
alter table public.coaching_rules enable row level security;
alter table public.station_baselines enable row level security;
alter table public.app_settings enable row level security;
do $$ declare t text; begin
  foreach t in array array['knowledge_sources','coaching_rules','station_baselines','app_settings'] loop
    execute format('create policy "%1$s: read all" on public.%1$I for select using (true)', t);
    execute format('create policy "%1$s: admin write" on public.%1$I for all using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

-- ---------- subscriptions ----------
create table public.subscriptions (
  user_id uuid primary key references auth.users on delete cascade,
  status text not null default 'trial' check (status in ('trial','pending','active','exempt','inactive')),
  valid_until date,
  bank_reference text unique,
  referral_code text unique,
  referred_by uuid references auth.users on delete set null,
  payment_marked_at timestamptz,
  referral_months int not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.subscriptions enable row level security;
create policy "subs: own/admin read" on public.subscriptions for select using (user_id = auth.uid() or public.is_admin());

-- ---------- new user ----------
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
declare ref text; code text; admin_email text;
begin
  insert into public.profiles (id, email, display_name) values (new.id, new.email, split_part(new.email, '@', 1))
  on conflict (id) do nothing;
  loop
    ref := 'ROX-' || lpad((floor(random()*10000))::int::text, 4, '0');
    exit when not exists (select 1 from public.subscriptions where bank_reference = ref);
  end loop;
  loop
    code := upper(substr(md5(random()::text), 1, 6));
    exit when not exists (select 1 from public.subscriptions where referral_code = code);
  end loop;
  insert into public.subscriptions (user_id, status, valid_until, bank_reference, referral_code)
  values (new.id, 'trial', (now() + interval '14 days')::date, ref, code) on conflict do nothing;
  select value #>> '{}' into admin_email from public.app_settings where key = 'admin_email';
  if lower(new.email) = lower(coalesce(admin_email, 'rick.vandeven@gmail.com')) then
    insert into public.user_roles (user_id, role) values (new.id, 'admin') on conflict do nothing;
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ---------- team RPCs ----------
create or replace function public.create_team(_race_name text, _race_date date, _goal_sec int)
returns public.teams language plpgsql security definer set search_path = public as $$
declare t public.teams; c text;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if exists (select 1 from public.profiles where id = auth.uid() and team_id is not null) then raise exception 'already_in_team'; end if;
  loop
    c := 'ROX-' || (select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random()*32)::int, 1), '') from generate_series(1,3));
    exit when not exists (select 1 from public.teams where code = c);
  end loop;
  insert into public.teams (code, race_name, race_date, goal_sec, captain_id, athlete_1)
  values (c, _race_name, _race_date, _goal_sec, auth.uid(), auth.uid()) returning * into t;
  update public.profiles set team_id = t.id where id = auth.uid();
  return t;
end $$;

create or replace function public.join_team(_code text)
returns public.teams language plpgsql security definer set search_path = public as $$
declare t public.teams; norm text;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  norm := upper(regexp_replace(_code, '[^A-Za-z0-9]', '', 'g'));
  if length(norm) = 6 then norm := substr(norm,1,3) || '-' || substr(norm,4,3); end if;
  select * into t from public.teams where code = norm for update;
  if not found then raise exception 'team_not_found'; end if;
  if t.athlete_1 = auth.uid() or t.athlete_2 = auth.uid() then return t; end if;
  if t.athlete_2 is not null and t.athlete_1 is not null then raise exception 'team_full'; end if;
  if exists (select 1 from public.profiles where id = auth.uid() and team_id is not null) then raise exception 'already_in_team'; end if;
  if t.athlete_1 is null then update public.teams set athlete_1 = auth.uid() where id = t.id returning * into t;
  else update public.teams set athlete_2 = auth.uid() where id = t.id returning * into t; end if;
  update public.profiles set team_id = t.id, race_name = t.race_name, race_date = t.race_date, goal_sec = t.goal_sec,
    category = case when category like 'doubles%' then category else 'doubles_open' end
  where id = auth.uid();
  return t;
end $$;

create or replace function public.leave_team() returns void language plpgsql security definer set search_path = public as $$
declare t public.teams;
begin
  select tm.* into t from public.teams tm join public.profiles p on p.team_id = tm.id where p.id = auth.uid();
  if not found then return; end if;
  update public.profiles set team_id = null where id in (t.athlete_1, t.athlete_2);
  delete from public.teams where id = t.id;
end $$;

create or replace function public.update_team(_race_name text, _race_date date, _goal_sec int, _shared_sim_dow int, _captain uuid)
returns public.teams language plpgsql security definer set search_path = public as $$
declare t public.teams;
begin
  select * into t from public.teams where captain_id = auth.uid() and (athlete_1 = auth.uid() or athlete_2 = auth.uid());
  if not found then raise exception 'not_captain'; end if;
  if _goal_sec is not null and (_goal_sec < 1800 or _goal_sec > 14400) then raise exception 'invalid_goal'; end if;
  if _captain is not null and _captain not in (coalesce(t.athlete_1, auth.uid()), coalesce(t.athlete_2, auth.uid())) then raise exception 'invalid_captain'; end if;
  update public.teams set race_name = coalesce(_race_name, race_name), race_date = coalesce(_race_date, race_date),
    goal_sec = coalesce(_goal_sec, goal_sec), shared_sim_dow = _shared_sim_dow, captain_id = coalesce(_captain, captain_id)
  where id = t.id returning * into t;
  update public.profiles set race_name = t.race_name, race_date = t.race_date, goal_sec = t.goal_sec
  where id in (t.athlete_1, t.athlete_2);
  return t;
end $$;

-- ---------- subscription RPCs ----------
create or replace function public.my_subscription() returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'status', s.status, 'valid_until', s.valid_until, 'bank_reference', s.bank_reference,
    'referral_code', s.referral_code, 'payment_marked_at', s.payment_marked_at, 'referral_months', s.referral_months,
    'referrals', (select count(*) from public.subscriptions r where r.referred_by = s.user_id),
    'paywall_enabled', coalesce((select (value)::text::boolean from public.app_settings where key = 'paywall_enabled'), false)
  ) from public.subscriptions s where s.user_id = auth.uid();
$$;
create or replace function public.mark_payment_sent() returns void language sql security definer set search_path = public as $$
  update public.subscriptions set payment_marked_at = now(), status = case when status in ('trial','inactive') then 'pending' else status end, updated_at = now()
  where user_id = auth.uid();
$$;
create or replace function public.apply_referral(_code text) returns boolean language plpgsql security definer set search_path = public as $$
declare ref uuid;
begin
  select user_id into ref from public.subscriptions where referral_code = upper(_code) and user_id <> auth.uid();
  if ref is null then return false; end if;
  update public.subscriptions set referred_by = ref where user_id = auth.uid() and referred_by is null;
  return found;
end $$;

-- ---------- admin RPCs ----------
create or replace function public.admin_list_athletes() returns setof json language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query
  select json_build_object(
    'id', p.id, 'email', p.email, 'name', p.display_name, 'category', p.category, 'sex', p.sex,
    'race_name', p.race_name, 'race_date', p.race_date, 'goal_sec', p.goal_sec, 'threshold_pace_sec', p.threshold_pace_sec,
    'onboarded', p.onboarded, 'created_at', p.created_at, 'team_id', p.team_id,
    'status', s.status, 'valid_until', s.valid_until, 'bank_reference', s.bank_reference, 'payment_marked_at', s.payment_marked_at,
    'referral_code', s.referral_code,
    'is_admin', public.has_role(p.id, 'admin'),
    'sessions_done', (select count(*) from public.session_entries e where e.user_id = p.id and e.completed),
    'benchmarks', (select count(*) from public.benchmarks b where b.user_id = p.id),
    'last_activity', greatest(p.updated_at, (select max(updated_at) from public.session_entries e where e.user_id = p.id))
  ) from public.profiles p left join public.subscriptions s on s.user_id = p.id
  order by p.created_at desc;
end $$;

create or replace function public.admin_get_athlete(_uid uuid) returns json language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return json_build_object(
    'profile', (select row_to_json(p) from public.profiles p where p.id = _uid),
    'subscription', (select row_to_json(s) from public.subscriptions s where s.user_id = _uid),
    'sessions', (select coalesce(json_agg(e order by e.date desc), '[]') from public.session_entries e where e.user_id = _uid),
    'benchmarks', (select coalesce(json_agg(b order by b.date desc), '[]') from public.benchmarks b where b.user_id = _uid),
    'morning', (select coalesce(json_agg(m order by m.date desc), '[]') from public.morning_checks m where m.user_id = _uid),
    'changes', (select coalesce(json_agg(c order by c.created_at desc), '[]') from public.plan_changes c where c.user_id = _uid),
    'team', (select row_to_json(t) from public.teams t join public.profiles p on p.team_id = t.id where p.id = _uid)
  );
end $$;

create or replace function public.admin_set_subscription(_uid uuid, _status text, _valid_until date) returns void language plpgsql security definer set search_path = public as $$
declare prev text; ref uuid;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  select status, referred_by into prev, ref from public.subscriptions where user_id = _uid;
  update public.subscriptions set status = _status, valid_until = _valid_until, updated_at = now() where user_id = _uid;
  -- first activation of a referred user extends the referrer by 3 months
  if _status = 'active' and prev <> 'active' and ref is not null then
    update public.subscriptions set valid_until = greatest(coalesce(valid_until, now()::date), now()::date) + interval '3 months',
      referral_months = referral_months + 3 where user_id = ref;
  end if;
end $$;

create or replace function public.admin_set_role(_uid uuid, _role text, _on boolean) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  if _on then insert into public.user_roles values (_uid, _role) on conflict do nothing;
  else
    if _uid = auth.uid() and _role = 'admin' then raise exception 'cannot_remove_self'; end if;
    delete from public.user_roles where user_id = _uid and role = _role;
  end if;
end $$;

create or replace function public.admin_stats() returns json language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return json_build_object(
    'athletes', (select count(*) from public.profiles),
    'onboarded', (select count(*) from public.profiles where onboarded),
    'active_7d', (select count(distinct user_id) from public.session_entries where updated_at > now() - interval '7 days'),
    'sessions_done', (select count(*) from public.session_entries where completed),
    'benchmarks', (select count(*) from public.benchmarks),
    'teams', (select count(*) from public.teams where athlete_2 is not null),
    'pending_payments', (select count(*) from public.subscriptions where status = 'pending'),
    'by_category', (select coalesce(json_object_agg(coalesce(category,'none'), n), '{}') from (select category, count(*) n from public.profiles group by category) x),
    'signups_by_week', (select coalesce(json_agg(json_build_object('week', w, 'n', n) order by w), '[]') from (
      select date_trunc('week', created_at)::date w, count(*) n from public.profiles group by 1) y)
  );
end $$;

-- ---------- grants for RPCs ----------
revoke execute on all functions in schema public from anon;
grant execute on function public.has_role(uuid, text), public.is_admin(), public.is_teammate(uuid) to authenticated;

-- ---------- storage ----------
insert into storage.buckets (id, name, public) values ('wod-photos', 'wod-photos', false) on conflict do nothing;
create policy "wod photos: own" on storage.objects for all to authenticated
  using (bucket_id = 'wod-photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'wod-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "wod photos: admin read" on storage.objects for select to authenticated
  using (bucket_id = 'wod-photos' and public.is_admin());

-- ---------- realtime ----------
alter publication supabase_realtime add table public.session_entries, public.morning_checks, public.benchmarks, public.profiles, public.teams, public.plan_changes;
