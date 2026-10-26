-- Plan updates: a change in the source base never changes a member's plan silently.
-- Every member is pinned to a rule-set version (src/engine/rules). A published plan update offers a newer version; the
-- member sees a before/after of their own coming weeks and chooses "Apply" or "Not now". Every switch is stored as a
-- plan version and can always be rolled back. Sources are archived, never deleted.

-- 1. sources: level, status, archive and the rules they support -----------------------------------------------------
alter table public.knowledge_sources add column if not exists slug text;
alter table public.knowledge_sources add column if not exists level text;
alter table public.knowledge_sources add column if not exists status text not null default 'active';
alter table public.knowledge_sources add column if not exists archived_at timestamptz;
alter table public.knowledge_sources add column if not exists archived_reason text;
alter table public.knowledge_sources add column if not exists replaced_by uuid references public.knowledge_sources on delete set null;
alter table public.knowledge_sources add column if not exists checked_at date;
alter table public.knowledge_sources add column if not exists rule_keys text[] not null default '{}';
create unique index if not exists knowledge_sources_slug on public.knowledge_sources (slug) where slug is not null;
alter table public.knowledge_sources drop constraint if exists knowledge_sources_level_check;
alter table public.knowledge_sources add constraint knowledge_sources_level_check check (level is null or level in ('A','B','C','D'));
alter table public.knowledge_sources drop constraint if exists knowledge_sources_status_check;
alter table public.knowledge_sources add constraint knowledge_sources_status_check check (status in ('active','archived'));

-- archive, never delete
create or replace function public.knowledge_sources_no_delete() returns trigger language plpgsql as $$
begin
  raise exception 'archive_instead_of_delete' using hint = 'Set status = archived with archived_at and archived_reason.';
end $$;
drop trigger if exists knowledge_sources_no_delete on public.knowledge_sources;
create trigger knowledge_sources_no_delete before delete on public.knowledge_sources for each row execute function public.knowledge_sources_no_delete();

-- stable slugs (rule-set changes cite sources by slug) and the rule keys each source supports (src/engine/rules/v1.ts)
update public.knowledge_sources k set slug = v.slug, rule_keys = v.keys
from (values
  ('Joe Friel%', 'friel-zones', array['zones.table']),
  ('Bosquet et al. (2007)%', 'bosquet-2007', array['taper.volumeWeek1','taper.volumeRaceWeek','taper.raceWeekEasyShare']),
  ('Mujika & Padilla (2003)%', 'mujika-padilla-2003', array['taper.raceWeekEasyDays','taper.raceWeekEasyShare']),
  ('Wang et al. (2023)%', 'wang-2023', array['taper.volumeWeek1','taper.volumeRaceWeek']),
  ('Travis et al. (2020)%', 'travis-2020', array['strength.lastHeavyMinDaysOut']),
  ('Montero & Lundby (2017)%', 'montero-lundby-2017', array['prediction.freqAerobic']),
  ('Lenk et al. (2025)%', 'lenk-2025', array['prediction.freqAerobic']),
  ('Wenger & Bell (1986)%', 'wenger-bell-1986', array['prediction.freqAerobicFit2']),
  ('Grgic et al. (2018)%', 'grgic-2018', array['prediction.freqStation']),
  ('Silbernagel et al. (2007)%', 'silbernagel-2007', array['returnToRun.days']),
  ('Beyer et al. (2015)%', 'beyer-2015', array['returnToRun.days']),
  ('Mujika & Padilla (2000)%', 'mujika-padilla-2000', array['returnToRun.crossThresholdReps','returnToRun.crossMinMinutes','returnToRun.crossMaxMinutes']),
  ('Physiological determinants of HYROX performance%', 'brandt-2025', array['coaching.maxWeeklyVolumeIncrease'])
) as v(pat, slug, keys)
where k.title like v.pat and k.slug is null
  and not exists (select 1 from public.knowledge_sources x where x.slug = v.slug);

-- 2. pinned rule-set version per member -----------------------------------------------------------------------------
alter table public.profiles add column if not exists rule_set_version int not null default 1;
alter table public.profiles drop constraint if exists profiles_rule_set_version_check;
alter table public.profiles add constraint profiles_rule_set_version_check check (rule_set_version >= 1);
-- not in the member's column grants: it only changes through plan_apply_update() and plan_rollback()

-- 3. plan updates (one per rule-set version) --------------------------------------------------------------------------
create table if not exists public.plan_updates (
  id uuid primary key default gen_random_uuid(),
  rule_set_version int not null unique check (rule_set_version >= 2),
  title jsonb not null,           -- per language: {"nl": "...", "en": "...", ...}
  summary jsonb not null default '{}'::jsonb, -- per language
  changes jsonb not null default '[]'::jsonb, -- [{ key, before, after, sourceIds, why: {nl,en,de,es,ko} }] from the rule set
  status text not null default 'draft' check (status in ('draft','published')),
  published_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.plan_updates enable row level security;
drop policy if exists "plan_updates: read published" on public.plan_updates;
create policy "plan_updates: read published" on public.plan_updates for select using (status = 'published' or public.is_admin());
drop policy if exists "plan_updates: admin write" on public.plan_updates;
create policy "plan_updates: admin write" on public.plan_updates for all using (public.is_admin()) with check (public.is_admin());

-- new members start on the newest published version
create or replace function public.latest_rule_set_version() returns int language sql stable security definer set search_path = public as $$
  select coalesce(max(rule_set_version), 1) from public.plan_updates where status = 'published';
$$;
grant execute on function public.latest_rule_set_version() to anon, authenticated;

-- 4. plan versions per member ---------------------------------------------------------------------------------------
create table if not exists public.user_plan_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  version_no int not null,
  rule_set_version int not null,
  plan_snapshot jsonb,            -- the future part of the plan at that moment (compact: date, type, title, km, pace, HR)
  reason text not null check (reason in ('start','update','rollback')),
  plan_update_id uuid references public.plan_updates on delete set null,
  effective_from date,            -- first day this version governs (null = from the start of the plan)
  restored_version_no int,        -- rollback: the version that was restored
  created_at timestamptz not null default now(),
  unique (user_id, version_no)
);
alter table public.user_plan_versions enable row level security;
drop policy if exists "plan_versions: own/admin read" on public.user_plan_versions;
create policy "plan_versions: own/admin read" on public.user_plan_versions for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "plan_versions: admin write" on public.user_plan_versions;
create policy "plan_versions: admin write" on public.user_plan_versions for all using (public.is_admin()) with check (public.is_admin());
-- members write their own rows only through the RPCs below, so the pin and the history always agree

create table if not exists public.user_plan_update_choices (
  user_id uuid not null references auth.users on delete cascade,
  plan_update_id uuid not null references public.plan_updates on delete cascade,
  choice text not null check (choice in ('applied','dismissed','rolled_back')),
  at timestamptz not null default now(),
  primary key (user_id, plan_update_id)
);
alter table public.user_plan_update_choices enable row level security;
drop policy if exists "plan_choices: own all" on public.user_plan_update_choices;
create policy "plan_choices: own all" on public.user_plan_update_choices for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "plan_choices: admin read" on public.user_plan_update_choices;
create policy "plan_choices: admin read" on public.user_plan_update_choices for select using (public.is_admin());

-- every member gets a start version: existing members on version 1, new members on the newest published version
insert into public.user_plan_versions (user_id, version_no, rule_set_version, reason, effective_from, created_at)
select p.id, 1, p.rule_set_version, 'start', null, p.created_at
from public.profiles p
where not exists (select 1 from public.user_plan_versions v where v.user_id = p.id);

create or replace function public.profiles_pin_new_member() returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.rule_set_version := public.latest_rule_set_version();
  return new;
end $$;
drop trigger if exists profiles_pin_new_member on public.profiles;
create trigger profiles_pin_new_member before insert on public.profiles for each row execute function public.profiles_pin_new_member();

create or replace function public.profiles_start_version() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.user_plan_versions (user_id, version_no, rule_set_version, reason)
  values (new.id, 1, new.rule_set_version, 'start') on conflict (user_id, version_no) do nothing;
  return new;
end $$;
drop trigger if exists profiles_start_version on public.profiles;
create trigger profiles_start_version after insert on public.profiles for each row execute function public.profiles_start_version();

-- 5. RPCs -----------------------------------------------------------------------------------------------------------
-- the day a switch takes effect is the member's own "today"; allow one day either side for time zones
create or replace function public._plan_check_from(_from date) returns void language plpgsql as $$
begin
  if _from is null or _from < current_date - 1 or _from > current_date + 1 then raise exception 'invalid_from_date'; end if;
end $$;

-- fills the snapshot of the newest version when it has none yet (never overwrites); creates the start version if missing
create or replace function public.plan_record_snapshot(_snapshot jsonb) returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); pin int;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  select rule_set_version into pin from public.profiles where id = uid;
  insert into public.user_plan_versions (user_id, version_no, rule_set_version, reason, plan_snapshot)
  values (uid, 1, coalesce(pin, 1), 'start', _snapshot) on conflict (user_id, version_no) do nothing;
  update public.user_plan_versions set plan_snapshot = _snapshot
  where user_id = uid and plan_snapshot is null
    and version_no = (select max(version_no) from public.user_plan_versions where user_id = uid);
end $$;

-- Apply: store the current plan first, pin the new version from _from, store the new plan, register the choice.
create or replace function public.plan_apply_update(_update uuid, _from date, _before jsonb, _after jsonb) returns int language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); upd public.plan_updates; pin int; n int;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  perform public._plan_check_from(_from);
  select * into upd from public.plan_updates where id = _update and status = 'published';
  if upd.id is null then raise exception 'plan_update_not_published'; end if;
  select rule_set_version into pin from public.profiles where id = uid for update;
  if pin = upd.rule_set_version then raise exception 'plan_update_already_applied'; end if;
  perform public.plan_record_snapshot(_before);
  select coalesce(max(version_no), 0) + 1 into n from public.user_plan_versions where user_id = uid;
  insert into public.user_plan_versions (user_id, version_no, rule_set_version, plan_snapshot, reason, plan_update_id, effective_from)
  values (uid, n, upd.rule_set_version, _after, 'update', upd.id, _from);
  update public.profiles set rule_set_version = upd.rule_set_version, updated_at = now() where id = uid;
  insert into public.user_plan_update_choices (user_id, plan_update_id, choice, at) values (uid, upd.id, 'applied', now())
  on conflict (user_id, plan_update_id) do update set choice = 'applied', at = now();
  return n;
end $$;

-- Roll back to any earlier version: a new version with reason 'rollback' and that version's rule set.
create or replace function public.plan_rollback(_version uuid, _from date, _before jsonb, _after jsonb) returns int language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); target public.user_plan_versions; n int;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  perform public._plan_check_from(_from);
  select * into target from public.user_plan_versions where id = _version and user_id = uid;
  if target.id is null then raise exception 'plan_version_not_found'; end if;
  perform public.plan_record_snapshot(_before);
  select coalesce(max(version_no), 0) + 1 into n from public.user_plan_versions where user_id = uid;
  insert into public.user_plan_versions (user_id, version_no, rule_set_version, plan_snapshot, reason, effective_from, restored_version_no)
  values (uid, n, target.rule_set_version, _after, 'rollback', _from, target.version_no);
  update public.profiles set rule_set_version = target.rule_set_version, updated_at = now() where id = uid;
  -- updates newer than the restored rule set are no longer applied; they stay available on their page
  update public.user_plan_update_choices c set choice = 'rolled_back', at = now()
  from public.plan_updates u
  where c.user_id = uid and c.plan_update_id = u.id and c.choice = 'applied' and u.rule_set_version > target.rule_set_version;
  return n;
end $$;

-- "Not now": the plan stays as it is, the update stays available
create or replace function public.plan_dismiss_update(_update uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if not exists (select 1 from public.plan_updates where id = _update and status = 'published') then raise exception 'plan_update_not_published'; end if;
  insert into public.user_plan_update_choices (user_id, plan_update_id, choice, at) values (auth.uid(), _update, 'dismissed', now())
  on conflict (user_id, plan_update_id) do nothing;
end $$;

revoke execute on function public._plan_check_from(date) from public, anon, authenticated;
revoke execute on function public.plan_record_snapshot(jsonb) from public, anon;
revoke execute on function public.plan_apply_update(uuid, date, jsonb, jsonb) from public, anon;
revoke execute on function public.plan_rollback(uuid, date, jsonb, jsonb) from public, anon;
revoke execute on function public.plan_dismiss_update(uuid) from public, anon;
grant execute on function public.plan_record_snapshot(jsonb) to authenticated;
grant execute on function public.plan_apply_update(uuid, date, jsonb, jsonb) to authenticated;
grant execute on function public.plan_rollback(uuid, date, jsonb, jsonb) to authenticated;
grant execute on function public.plan_dismiss_update(uuid) to authenticated;

-- publishing sets published_at (admins publish through the admin screen; no mail goes out)
create or replace function public.plan_updates_published_at() returns trigger language plpgsql as $$
begin
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then new.published_at := coalesce(new.published_at, now()); end if;
  if new.status = 'draft' then new.published_at := null; end if;
  return new;
end $$;
drop trigger if exists plan_updates_published_at on public.plan_updates;
create trigger plan_updates_published_at before insert or update on public.plan_updates for each row execute function public.plan_updates_published_at();

-- realtime: the cockpit notice appears as soon as an update is published
do $$ begin
  begin
    alter publication supabase_realtime add table public.plan_updates;
  exception when duplicate_object or undefined_object then null;
  end;
end $$;
