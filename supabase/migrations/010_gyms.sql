-- Gyms with a join code: members follow the gym's sim template (unless they save their own) and get the gym's equipment.
create table if not exists public.gyms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  city text not null default '',
  equipment text not null default 'hyrox' check (equipment in ('hyrox','gym','home')),
  sim_protocol_id uuid references public.sim_protocols on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.gyms enable row level security;
create policy "gyms: admin all" on public.gyms for all using (public.is_admin()) with check (public.is_admin());

alter table public.profiles add column if not exists gym_id uuid references public.gyms on delete set null;

create or replace function public.gym_preview(_code text) returns json language sql stable security definer set search_path = public as $$
  select json_build_object('name', g.name, 'city', g.city) from public.gyms g where g.code = upper(trim(_code)) and g.active;
$$;

create or replace function public.join_gym(_code text) returns json language plpgsql security definer set search_path = public as $$
declare g public.gyms;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select * into g from public.gyms where code = upper(trim(_code)) and active;
  if not found then raise exception 'gym_not_found'; end if;
  -- follow the gym template: clear a personal copy
  update public.profiles set gym_id = g.id, equipment = g.equipment, sim_protocol = null where id = auth.uid();
  return json_build_object('id', g.id, 'name', g.name);
end $$;

create or replace function public.leave_gym() returns void language sql security definer set search_path = public as $$
  update public.profiles set gym_id = null where id = auth.uid();
$$;

-- gym + its template for the current user (or a teammate/partner, used for doubles)
create or replace function public.my_gym() returns json language sql stable security definer set search_path = public as $$
  select json_build_object('id', g.id, 'name', g.name, 'city', g.city, 'code', g.code, 'equipment', g.equipment,
    'protocol', (select sp.protocol from public.sim_protocols sp where sp.id = g.sim_protocol_id))
  from public.profiles p join public.gyms g on g.id = p.gym_id where p.id = auth.uid();
$$;

create or replace function public.admin_list_gyms() returns setof json language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query select json_build_object('id', g.id, 'name', g.name, 'code', g.code, 'city', g.city, 'equipment', g.equipment,
    'sim_protocol_id', g.sim_protocol_id, 'active', g.active,
    'members', (select count(*) from public.profiles p where p.gym_id = g.id)) from public.gyms g order by g.name;
end $$;

-- doubles: joining a team copies the partner's gym if you have none
create or replace function public.copy_partner_gym() returns void language plpgsql security definer set search_path = public as $$
declare t uuid; other uuid; og uuid;
begin
  select team_id into t from public.profiles where id = auth.uid();
  if t is null then return; end if;
  select case when athlete_1 = auth.uid() then athlete_2 else athlete_1 end into other from public.teams where id = t;
  select gym_id into og from public.profiles where id = other;
  if og is not null then
    update public.profiles set gym_id = og, equipment = (select equipment from public.gyms where id = og)
     where id = auth.uid() and gym_id is null and sim_protocol is null;
  end if;
end $$;

grant execute on function public.gym_preview(text), public.join_gym(text), public.leave_gym(), public.my_gym(), public.admin_list_gyms(), public.copy_partner_gym() to authenticated;
grant execute on function public.gym_preview(text) to anon;

insert into public.gyms (name, code, city, equipment, sim_protocol_id)
select 'Gym Groesbeek', 'GROESBEEK', 'Groesbeek', 'hyrox', id from public.sim_protocols where name = 'Gym Groesbeek'
on conflict (code) do nothing;
