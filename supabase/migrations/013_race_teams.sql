-- a doubles partner per race: teams can belong to a season race (profiles.season[].teamId)
alter table public.teams add column if not exists category text;
alter table public.teams add column if not exists race_id text;

-- set a key on one season race of the caller
create or replace function public._season_patch(_uid uuid, _race_id text, _patch jsonb) returns void
language sql security definer set search_path = public as $$
  update public.profiles set season = coalesce((
    select jsonb_agg(case when e->>'id' = _race_id then e || _patch else e end)
    from jsonb_array_elements(season) e), '[]'::jsonb)
  where id = _uid;
$$;
revoke all on function public._season_patch(uuid, text, jsonb) from public, anon, authenticated;

create or replace function public.create_race_team(_race_id text, _race_name text, _race_date date, _goal_sec int, _category text)
returns public.teams language plpgsql security definer set search_path = public as $$
declare t public.teams; c text;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if _category is null or _category not like 'doubles%' then raise exception 'not_doubles'; end if;
  if not exists (select 1 from public.profiles p, jsonb_array_elements(p.season) e where p.id = auth.uid() and e->>'id' = _race_id) then
    raise exception 'race_not_found';
  end if;
  loop
    c := 'ROX-' || (select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random()*32)::int, 1), '') from generate_series(1,3));
    exit when not exists (select 1 from public.teams where code = c);
  end loop;
  insert into public.teams (code, race_name, race_date, goal_sec, captain_id, athlete_1, category, race_id)
  values (c, _race_name, _race_date, _goal_sec, auth.uid(), auth.uid(), _category, _race_id) returning * into t;
  perform public._season_patch(auth.uid(), _race_id, jsonb_build_object('teamId', t.id, 'category', _category));
  return t;
end $$;

-- join a partner's race team; merges into the given season race, or one on the same date, or adds the race
create or replace function public.join_race_team(_code text, _race_id text default null)
returns public.teams language plpgsql security definer set search_path = public as $$
declare t public.teams; norm text; rid text; s jsonb;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  norm := upper(regexp_replace(_code, '[^A-Za-z0-9]', '', 'g'));
  if length(norm) = 6 then norm := substr(norm,1,3) || '-' || substr(norm,4,3); end if;
  select * into t from public.teams where code = norm for update;
  if not found then raise exception 'team_not_found'; end if;
  if t.athlete_1 = auth.uid() or t.athlete_2 = auth.uid() then raise exception 'already_in_team'; end if;
  if t.athlete_1 is not null and t.athlete_2 is not null then raise exception 'team_full'; end if;
  if t.athlete_1 is null then update public.teams set athlete_1 = auth.uid() where id = t.id returning * into t;
  else update public.teams set athlete_2 = auth.uid() where id = t.id returning * into t; end if;
  select season into s from public.profiles where id = auth.uid();
  rid := _race_id;
  if rid is null or not exists (select 1 from jsonb_array_elements(s) e where e->>'id' = rid) then
    select e->>'id' into rid from jsonb_array_elements(s) e where e->>'date' = t.race_date::text limit 1;
  end if;
  if rid is null then
    rid := gen_random_uuid()::text;
    update public.profiles set season = coalesce(season, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
      'id', rid, 'name', coalesce(t.race_name, 'HYROX'), 'date', t.race_date, 'goalSec', t.goal_sec, 'priority', 'B'))
    where id = auth.uid();
  end if;
  perform public._season_patch(auth.uid(), rid, jsonb_strip_nulls(jsonb_build_object(
    'teamId', t.id, 'category', coalesce(t.category, 'doubles_open'), 'date', t.race_date, 'name', t.race_name, 'goalSec', t.goal_sec)));
  return t;
end $$;

create or replace function public.leave_race_team(_team_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare t public.teams;
begin
  select * into t from public.teams where id = _team_id and (athlete_1 = auth.uid() or athlete_2 = auth.uid()) for update;
  if not found then return; end if;
  update public.profiles set season = coalesce((
    select jsonb_agg(case when e->>'teamId' = _team_id::text then e - 'teamId' else e end) from jsonb_array_elements(season) e), '[]'::jsonb)
  where id = auth.uid();
  if t.athlete_1 = auth.uid() then update public.teams set athlete_1 = null, captain_id = coalesce(athlete_2, captain_id) where id = t.id returning * into t;
  else update public.teams set athlete_2 = null, captain_id = coalesce(athlete_1, captain_id) where id = t.id returning * into t; end if;
  if t.athlete_1 is null and t.athlete_2 is null then delete from public.teams where id = t.id; end if;
end $$;

grant execute on function public.create_race_team(text, text, date, int, text), public.join_race_team(text, text), public.leave_race_team(uuid) to authenticated;
