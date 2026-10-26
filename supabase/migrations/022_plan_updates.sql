-- Plan updates: when research changes, the plan of a member never changes silently.
-- The engine's rules live in versioned rule sets (src/engine/rules). Every member has a pinned version (profiles.rule_set_version),
-- sees what an update changes with a before/after of their own coming weeks, applies it or not, and can always go back.
-- The plan itself is not stored (it is generated from the profile, the log and the pinned rule set); user_plan_versions
-- keeps which version was pinned from which date and a snapshot of the coming plan at that moment.

-- 1. sources: level, archiving (never deleted), the rules they support
alter table public.knowledge_sources add column if not exists level text check (level in ('A','B','C','D'));
alter table public.knowledge_sources add column if not exists status text not null default 'active' check (status in ('active','archived'));
alter table public.knowledge_sources add column if not exists archived_at timestamptz;
alter table public.knowledge_sources add column if not exists archived_reason text;
alter table public.knowledge_sources add column if not exists replaced_by uuid references public.knowledge_sources on delete set null;
alter table public.knowledge_sources add column if not exists checked_at date;
alter table public.knowledge_sources add column if not exists rule_keys text[] not null default '{}';

create or replace function public.knowledge_sources_no_delete() returns trigger language plpgsql as $$
begin
  raise exception 'sources_are_archived_not_deleted';
end $$;
drop trigger if exists knowledge_sources_no_delete on public.knowledge_sources;
create trigger knowledge_sources_no_delete before delete on public.knowledge_sources for each row execute function public.knowledge_sources_no_delete();

-- archived_at / archived_reason follow the status
create or replace function public.knowledge_sources_archive_stamp() returns trigger language plpgsql as $$
begin
  if new.status = 'archived' and old.status <> 'archived' then new.archived_at := coalesce(new.archived_at, now()); end if;
  if new.status = 'active' and old.status = 'archived' then new.archived_at := null; new.archived_reason := null; new.replaced_by := null; end if;
  return new;
end $$;
drop trigger if exists knowledge_sources_archive_stamp on public.knowledge_sources;
create trigger knowledge_sources_archive_stamp before update on public.knowledge_sources for each row execute function public.knowledge_sources_archive_stamp();

-- 2. plan updates (one per rule set version); members only see published ones
create table if not exists public.plan_updates (
  id uuid primary key default gen_random_uuid(),
  rule_set_version int not null unique check (rule_set_version >= 2),
  title text not null,
  summary jsonb not null default '{}'::jsonb,
  changes jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft','published')),
  published_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.plan_updates enable row level security;
create policy "plan_updates: read published" on public.plan_updates for select using (status = 'published' or public.is_admin());
create policy "plan_updates: admin write" on public.plan_updates for all using (public.is_admin()) with check (public.is_admin());

-- publishing stamps the date
create or replace function public.plan_updates_publish_stamp() returns trigger language plpgsql as $$
begin
  if new.status = 'published' and (tg_op = 'INSERT' or old.status <> 'published') then new.published_at := coalesce(new.published_at, now()); end if;
  if new.status = 'draft' then new.published_at := null; end if;
  return new;
end $$;
drop trigger if exists plan_updates_publish_stamp on public.plan_updates;
create trigger plan_updates_publish_stamp before insert or update on public.plan_updates for each row execute function public.plan_updates_publish_stamp();

create or replace function public.latest_rule_set_version() returns int language sql stable security definer set search_path = public as $$
  select coalesce(max(rule_set_version), 1) from public.plan_updates where status = 'published';
$$;

-- 3. the pinned version of a member: written only by the RPCs below (no column grant for update)
alter table public.profiles add column if not exists rule_set_version int not null default 1;
-- new members start on the newest published version
alter table public.profiles alter column rule_set_version set default public.latest_rule_set_version();

-- 4. history of versions per member
create table if not exists public.user_plan_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  version_no int not null,
  rule_set_version int not null,
  plan_snapshot jsonb not null default '[]'::jsonb,
  reason text not null check (reason in ('start','update','rollback')),
  plan_update_id uuid references public.plan_updates on delete set null,
  -- the plan follows this version from this date on (the first version covers everything before)
  effective_from date not null,
  created_at timestamptz not null default now(),
  unique (user_id, version_no)
);
create index if not exists user_plan_versions_user on public.user_plan_versions (user_id, version_no desc);
alter table public.user_plan_versions enable row level security;
create policy "plan_versions: own read" on public.user_plan_versions for select using (user_id = auth.uid() or public.is_admin());
-- no insert/update/delete policy: versions are written through apply_plan_update() and rollback_plan_version()

create table if not exists public.user_plan_update_choices (
  user_id uuid not null references auth.users on delete cascade,
  plan_update_id uuid not null references public.plan_updates on delete cascade,
  choice text not null check (choice in ('applied','dismissed','rolled_back')),
  at timestamptz not null default now(),
  primary key (user_id, plan_update_id)
);
alter table public.user_plan_update_choices enable row level security;
create policy "plan_choices: own read" on public.user_plan_update_choices for select using (user_id = auth.uid() or public.is_admin());

-- every member starts with a first version
create or replace function public.plan_version_start() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.user_plan_versions (user_id, version_no, rule_set_version, reason, effective_from)
  values (new.id, 1, new.rule_set_version, 'start', date '0001-01-01') on conflict do nothing;
  return new;
end $$;
drop trigger if exists plan_version_start on public.profiles;
create trigger plan_version_start after insert on public.profiles for each row execute function public.plan_version_start();

-- members that exist now start on version 1
insert into public.user_plan_versions (user_id, version_no, rule_set_version, reason, effective_from)
select id, 1, 1, 'start', date '0001-01-01' from public.profiles p
where not exists (select 1 from public.user_plan_versions v where v.user_id = p.id);

-- 5. RPCs. The client generates the plan (the engine runs in the app) and sends compact snapshots of the coming plan.
create or replace function public.valid_plan_snapshot(_s jsonb) returns boolean language sql immutable as $$
  select _s is not null and jsonb_typeof(_s) = 'array' and jsonb_array_length(_s) <= 800 and pg_column_size(_s) <= 300000;
$$;

-- the member chooses "apply": snapshot of the current version, pin the new one, store the new version
create or replace function public.apply_plan_update(_update_id uuid, _from date, _prev_snapshot jsonb, _new_snapshot jsonb) returns json language plpgsql security definer set search_path = public as $$
declare u public.plan_updates; cur public.user_plan_versions; n int;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if not public.valid_plan_snapshot(_prev_snapshot) or not public.valid_plan_snapshot(_new_snapshot) then raise exception 'invalid_snapshot'; end if;
  select * into u from public.plan_updates where id = _update_id and status = 'published';
  if not found then raise exception 'update_not_found'; end if;
  perform 1 from public.profiles where id = auth.uid() for update;
  select * into cur from public.user_plan_versions where user_id = auth.uid() order by version_no desc limit 1;
  if not found then raise exception 'no_start_version'; end if;
  if cur.rule_set_version = u.rule_set_version then raise exception 'already_applied'; end if;
  update public.user_plan_versions set plan_snapshot = _prev_snapshot where id = cur.id;
  n := cur.version_no + 1;
  insert into public.user_plan_versions (user_id, version_no, rule_set_version, plan_snapshot, reason, plan_update_id, effective_from)
  values (auth.uid(), n, u.rule_set_version, _new_snapshot, 'update', u.id, _from);
  update public.profiles set rule_set_version = u.rule_set_version where id = auth.uid();
  insert into public.user_plan_update_choices (user_id, plan_update_id, choice) values (auth.uid(), u.id, 'applied')
  on conflict (user_id, plan_update_id) do update set choice = 'applied', at = now();
  return json_build_object('version_no', n, 'rule_set_version', u.rule_set_version);
end $$;

-- the member chooses "not now": the plan stays, the update stays findable
create or replace function public.dismiss_plan_update(_update_id uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if not exists (select 1 from public.plan_updates where id = _update_id and status = 'published') then raise exception 'update_not_found'; end if;
  insert into public.user_plan_update_choices (user_id, plan_update_id, choice) values (auth.uid(), _update_id, 'dismissed')
  on conflict (user_id, plan_update_id) do nothing;
end $$;

-- the member goes back to the rule set of an earlier version (a new version with reason 'rollback')
create or replace function public.rollback_plan_version(_version_id uuid, _from date, _prev_snapshot jsonb, _new_snapshot jsonb) returns json language plpgsql security definer set search_path = public as $$
declare tgt public.user_plan_versions; cur public.user_plan_versions; n int;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if not public.valid_plan_snapshot(_prev_snapshot) or not public.valid_plan_snapshot(_new_snapshot) then raise exception 'invalid_snapshot'; end if;
  select * into tgt from public.user_plan_versions where id = _version_id and user_id = auth.uid();
  if not found then raise exception 'version_not_found'; end if;
  perform 1 from public.profiles where id = auth.uid() for update;
  select * into cur from public.user_plan_versions where user_id = auth.uid() order by version_no desc limit 1;
  if cur.rule_set_version = tgt.rule_set_version then raise exception 'already_on_version'; end if;
  update public.user_plan_versions set plan_snapshot = _prev_snapshot where id = cur.id;
  n := cur.version_no + 1;
  insert into public.user_plan_versions (user_id, version_no, rule_set_version, plan_snapshot, reason, plan_update_id, effective_from)
  values (auth.uid(), n, tgt.rule_set_version, _new_snapshot, 'rollback', cur.plan_update_id, _from);
  update public.profiles set rule_set_version = tgt.rule_set_version where id = auth.uid();
  -- the update the member leaves is marked as rolled back
  if cur.plan_update_id is not null then
    insert into public.user_plan_update_choices (user_id, plan_update_id, choice) values (auth.uid(), cur.plan_update_id, 'rolled_back')
    on conflict (user_id, plan_update_id) do update set choice = 'rolled_back', at = now();
  end if;
  return json_build_object('version_no', n, 'rule_set_version', tgt.rule_set_version);
end $$;

grant execute on function public.apply_plan_update(uuid, date, jsonb, jsonb), public.dismiss_plan_update(uuid), public.rollback_plan_version(uuid, date, jsonb, jsonb) to authenticated;
grant execute on function public.latest_rule_set_version() to anon, authenticated;
