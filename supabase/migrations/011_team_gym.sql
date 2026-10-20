-- joining a doubles team: take over the partner's gym (and thus sim template) if you have none yet
create or replace function public.join_team(_code text)
returns public.teams language plpgsql security definer set search_path = public as $$
declare t public.teams; norm text; other uuid; og uuid;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  norm := upper(regexp_replace(_code, '[^A-Za-z0-9]', '', 'g'));
  if length(norm) = 6 then norm := substr(norm,1,3) || '-' || substr(norm,4,3); end if;
  select * into t from public.teams where code = norm for update;
  if not found then raise exception 'team_not_found'; end if;
  if t.athlete_1 = auth.uid() or t.athlete_2 = auth.uid() then return t; end if;
  if t.athlete_2 is not null and t.athlete_1 is not null then raise exception 'team_full'; end if;
  if exists (select 1 from public.profiles where id = auth.uid() and team_id is not null) then raise exception 'already_in_team'; end if;
  other := coalesce(t.athlete_1, t.athlete_2);
  if t.athlete_1 is null then update public.teams set athlete_1 = auth.uid() where id = t.id returning * into t;
  else update public.teams set athlete_2 = auth.uid() where id = t.id returning * into t; end if;
  update public.profiles set team_id = t.id, race_name = t.race_name, race_date = t.race_date, goal_sec = t.goal_sec,
    category = case when category like 'doubles%' then category else 'doubles_open' end
  where id = auth.uid();
  if other is not null then
    update public.subscriptions set referred_by = other
     where user_id = auth.uid() and referred_by is null and status in ('trial','pending','inactive');
    select gym_id into og from public.profiles where id = other;
    if og is not null then
      update public.profiles set gym_id = og, equipment = (select equipment from public.gyms where id = og)
       where id = auth.uid() and gym_id is null and sim_protocol is null;
    end if;
  end if;
  return t;
end $$;
