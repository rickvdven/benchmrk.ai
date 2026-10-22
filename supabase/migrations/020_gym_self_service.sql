-- Gym accounts manage their own gym and sim programs; admins see and manage everything too.
-- A gym account = role 'gym' in user_roles + a row in gym_managers. Programs (sim_protocols with a gym_id) are only
-- visible to the gym's managers and members; the gym picks which program its members follow (gyms.sim_protocol_id).

-- 1. role 'gym'
alter table public.user_roles drop constraint if exists user_roles_role_check;
alter table public.user_roles add constraint user_roles_role_check check (role in ('admin','coach','gym'));

-- 2. who manages which gym
create table if not exists public.gym_managers (
  gym_id uuid not null references public.gyms on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  primary key (gym_id, user_id)
);
alter table public.gym_managers enable row level security;
create policy "gym_managers: own/admin read" on public.gym_managers for select using (user_id = auth.uid() or public.is_admin());
create index if not exists gym_managers_user on public.gym_managers (user_id);

create or replace function public.is_gym_manager(_gym uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.gym_managers where gym_id = _gym and user_id = auth.uid());
$$;
create or replace function public.can_manage_gym(_gym uuid) returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin() or public.is_gym_manager(_gym);
$$;

-- 3. programs belong to a gym (null = Benchmrk-wide template, managed by admins)
alter table public.sim_protocols add column if not exists gym_id uuid references public.gyms on delete cascade;
create index if not exists sim_protocols_gym on public.sim_protocols (gym_id);

drop policy if exists "simp: read public" on public.sim_protocols;
create policy "simp: read" on public.sim_protocols for select using (
  is_public or public.is_admin()
  or (gym_id is not null and (
    public.is_gym_manager(gym_id)
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.gym_id = sim_protocols.gym_id)
  ))
);

-- 4. validation of a program: rounds 1-8, percentages 10-200, at most 20 blocks of 1-12 weeks
create or replace function public.valid_sim_protocol(_p jsonb) returns boolean language plpgsql immutable as $$
declare b jsonb;
begin
  if _p is null or coalesce(jsonb_typeof(_p), '') <> 'object' or pg_column_size(_p) > 20000 then return false; end if;
  if coalesce(jsonb_typeof(_p->'rounds'), '') <> 'number' or (_p->>'rounds')::numeric not between 1 and 8 then return false; end if;
  if coalesce(jsonb_typeof(_p->'offSeason'), '') <> 'object' then return false; end if;
  if coalesce(jsonb_typeof(_p->'offSeason'->'run'), '') <> 'number' or (_p->'offSeason'->>'run')::numeric not between 10 and 200 then return false; end if;
  if coalesce(jsonb_typeof(_p->'offSeason'->'station'), '') <> 'number' or (_p->'offSeason'->>'station')::numeric not between 10 and 200 then return false; end if;
  if coalesce(jsonb_typeof(_p->'blocks'), '') <> 'array' or jsonb_array_length(_p->'blocks') > 20 then return false; end if;
  for b in select * from jsonb_array_elements(_p->'blocks') loop
    if coalesce(jsonb_typeof(b), '') <> 'object' then return false; end if;
    if coalesce(jsonb_typeof(b->'weeks'), '') <> 'number' or (b->>'weeks')::numeric not between 1 and 12 then return false; end if;
    if coalesce(jsonb_typeof(b->'run'), '') <> 'number' or (b->>'run')::numeric not between 10 and 200 then return false; end if;
    if coalesce(jsonb_typeof(b->'station'), '') <> 'number' or (b->>'station')::numeric not between 10 and 200 then return false; end if;
  end loop;
  return true;
end $$;

-- 5. gym accounts: list, read, update, programs
create or replace function public.my_managed_gyms() returns json language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(json_build_object('id', g.id, 'name', g.name, 'city', g.city, 'code', g.code) order by g.name), '[]'::json)
  from public.gyms g join public.gym_managers m on m.gym_id = g.id where m.user_id = auth.uid();
$$;

create or replace function public.gym_get(_gym uuid) returns json language plpgsql stable security definer set search_path = public as $$
declare g public.gyms;
begin
  if not public.can_manage_gym(_gym) then raise exception 'forbidden'; end if;
  select * into g from public.gyms where id = _gym;
  if not found then raise exception 'gym_not_found'; end if;
  return json_build_object(
    'id', g.id, 'name', g.name, 'code', g.code, 'city', g.city, 'equipment', g.equipment,
    'sim_protocol_id', g.sim_protocol_id, 'active', g.active,
    'members', (select count(*) from public.profiles p where p.gym_id = g.id),
    'programs', (select coalesce(json_agg(json_build_object('id', s.id, 'name', s.name, 'description', s.description, 'protocol', s.protocol) order by s.name), '[]'::json)
                   from public.sim_protocols s where s.gym_id = g.id),
    'templates', (select coalesce(json_agg(json_build_object('id', s.id, 'name', s.name) order by s.name), '[]'::json)
                   from public.sim_protocols s where s.gym_id is null and s.is_public),
    'managers', case when public.is_admin()
      then (select coalesce(json_agg(json_build_object('user_id', m.user_id, 'email', p.email) order by p.email), '[]'::json)
              from public.gym_managers m left join public.profiles p on p.id = m.user_id where m.gym_id = g.id)
      else null end
  );
end $$;

create or replace function public.gym_update(_gym uuid, _name text, _city text, _equipment text, _sim_protocol_id uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.can_manage_gym(_gym) then raise exception 'forbidden'; end if;
  if length(trim(coalesce(_name, ''))) not between 1 and 80 then raise exception 'invalid_name'; end if;
  if length(coalesce(_city, '')) > 80 then raise exception 'invalid_city'; end if;
  if _equipment not in ('hyrox','gym','home') then raise exception 'invalid_equipment'; end if;
  if _sim_protocol_id is not null and not exists (
    select 1 from public.sim_protocols s where s.id = _sim_protocol_id and (s.gym_id = _gym or (s.gym_id is null and s.is_public))
  ) then raise exception 'invalid_program'; end if;
  update public.gyms set name = trim(_name), city = trim(coalesce(_city, '')), equipment = _equipment, sim_protocol_id = _sim_protocol_id where id = _gym;
end $$;

create or replace function public.gym_program_save(_gym uuid, _id uuid, _name text, _description text, _protocol jsonb) returns uuid language plpgsql security definer set search_path = public as $$
declare pid uuid;
begin
  if not public.can_manage_gym(_gym) then raise exception 'forbidden'; end if;
  if length(trim(coalesce(_name, ''))) not between 1 and 60 then raise exception 'invalid_name'; end if;
  if length(coalesce(_description, '')) > 500 then raise exception 'invalid_description'; end if;
  if not public.valid_sim_protocol(_protocol) then raise exception 'invalid_protocol'; end if;
  if _id is null then
    if (select count(*) from public.sim_protocols where gym_id = _gym) >= 20 then raise exception 'too_many_programs'; end if;
    insert into public.sim_protocols (name, description, protocol, is_public, gym_id)
    values (trim(_name), coalesce(_description, ''), jsonb_set(_protocol, '{name}', to_jsonb(trim(_name))), false, _gym) returning id into pid;
  else
    update public.sim_protocols set name = trim(_name), description = coalesce(_description, ''), protocol = jsonb_set(_protocol, '{name}', to_jsonb(trim(_name)))
     where id = _id and gym_id = _gym returning id into pid;
    if pid is null then raise exception 'program_not_found'; end if;
  end if;
  return pid;
end $$;

create or replace function public.gym_program_delete(_gym uuid, _id uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.can_manage_gym(_gym) then raise exception 'forbidden'; end if;
  delete from public.sim_protocols where id = _id and gym_id = _gym;  -- gyms.sim_protocol_id is set to null by its foreign key
end $$;

-- a gym-labelled account without a gym can set one up itself (one gym per account; admins add more)
create or replace function public.gym_create(_name text, _city text) returns uuid language plpgsql security definer set search_path = public as $$
declare gid uuid; c text; alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; i int;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if not (public.has_role(auth.uid(), 'gym') or public.is_admin()) then raise exception 'forbidden'; end if;
  if exists (select 1 from public.gym_managers where user_id = auth.uid()) then raise exception 'already_has_gym'; end if;
  if length(trim(coalesce(_name, ''))) not between 1 and 80 then raise exception 'invalid_name'; end if;
  loop
    c := '';
    for i in 1..6 loop c := c || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1); end loop;
    exit when not exists (select 1 from public.gyms where code = c);
  end loop;
  insert into public.gyms (name, code, city) values (trim(_name), c, trim(coalesce(_city, ''))) returning id into gid;
  insert into public.gym_managers (gym_id, user_id) values (gid, auth.uid());
  return gid;
end $$;

-- 6. admin: assign accounts to a gym (also sets the 'gym' label); the list shows who manages what
create or replace function public.admin_set_gym_manager(_gym uuid, _email text, _on boolean) returns void language plpgsql security definer set search_path = public as $$
declare uid uuid;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  select id into uid from public.profiles where lower(email) = lower(trim(_email));
  if uid is null then raise exception 'user_not_found'; end if;
  if _on then
    insert into public.gym_managers (gym_id, user_id) values (_gym, uid) on conflict do nothing;
    insert into public.user_roles (user_id, role) values (uid, 'gym') on conflict do nothing;
  else
    delete from public.gym_managers where gym_id = _gym and user_id = uid;
    if not exists (select 1 from public.gym_managers where user_id = uid) then
      delete from public.user_roles where user_id = uid and role = 'gym';
    end if;
  end if;
end $$;

create or replace function public.admin_list_gyms() returns setof json language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query select json_build_object('id', g.id, 'name', g.name, 'code', g.code, 'city', g.city, 'equipment', g.equipment,
    'sim_protocol_id', g.sim_protocol_id, 'active', g.active,
    'members', (select count(*) from public.profiles p where p.gym_id = g.id),
    'programs', (select count(*) from public.sim_protocols s where s.gym_id = g.id),
    'managers', (select coalesce(json_agg(p.email order by p.email), '[]'::json) from public.gym_managers m left join public.profiles p on p.id = m.user_id where m.gym_id = g.id))
    from public.gyms g order by g.name;
end $$;

grant execute on function public.is_gym_manager(uuid), public.can_manage_gym(uuid), public.my_managed_gyms(), public.gym_get(uuid),
  public.gym_update(uuid, text, text, text, uuid), public.gym_program_save(uuid, uuid, text, text, jsonb), public.gym_program_delete(uuid, uuid),
  public.gym_create(text, text), public.admin_set_gym_manager(uuid, text, boolean), public.admin_list_gyms() to authenticated;
