-- Referral rewards: 1 month for referrer AND friend when the friend pays (cap 12 months for the referrer).
-- Ambassadors (coaches, gyms, creators): 20 % commission on every paid membership of people they referred.

insert into public.app_settings (key, value) values
  ('referral_reward_months', '1'),
  ('referral_cap_months', '12'),
  ('ambassador_commission_pct', '20'),
  ('price_year_cents', '3000'),
  ('ambassador_min_payout_cents', '2500')
on conflict (key) do nothing;

alter table public.subscriptions add column if not exists activated_at timestamptz;
alter table public.subscriptions add column if not exists friend_bonus_given boolean not null default false;

create table if not exists public.ambassadors (
  user_id uuid primary key references auth.users on delete cascade,
  status text not null default 'applied' check (status in ('applied','approved','rejected','paused')),
  kind text not null default 'coach' check (kind in ('coach','gym','creator','other')),
  org text not null default '',
  link text not null default '',
  audience text not null default '',
  motivation text not null default '',
  commission_pct int not null default 20 check (commission_pct between 0 and 50),
  created_at timestamptz not null default now(),
  approved_at timestamptz
);
alter table public.ambassadors enable row level security;
create policy "amb: own/admin read" on public.ambassadors for select using (user_id = auth.uid() or public.is_admin());

create table if not exists public.referral_events (
  id uuid primary key default gen_random_uuid(),
  referrer uuid not null references auth.users on delete cascade,
  friend uuid references auth.users on delete set null,
  kind text not null check (kind in ('months','commission')),
  months int not null default 0,
  amount_cents int not null default 0,
  status text not null default 'pending' check (status in ('pending','approved','paid','void')),
  period_until date,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
alter table public.referral_events enable row level security;
create policy "refev: own/admin read" on public.referral_events for select using (referrer = auth.uid() or public.is_admin());
create index if not exists referral_events_referrer on public.referral_events (referrer);

-- apply a code: only in the first 14 days after signup, never yourself, never twice
create or replace function public.apply_referral(_code text) returns boolean language plpgsql security definer set search_path = public as $$
declare ref uuid;
begin
  select user_id into ref from public.subscriptions where referral_code = upper(trim(_code)) and user_id <> auth.uid();
  if ref is null then return false; end if;
  update public.subscriptions s set referred_by = ref
   where s.user_id = auth.uid() and s.referred_by is null
     and exists (select 1 from auth.users u where u.id = auth.uid() and u.created_at > now() - interval '14 days');
  return found;
end $$;

-- joining a doubles team counts as being invited by the captain (if nobody invited you yet)
create or replace function public.join_team(_code text)
returns public.teams language plpgsql security definer set search_path = public as $$
declare t public.teams; norm text; other uuid;
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
  end if;
  return t;
end $$;

create or replace function public.setting_int(_key text, _default int) returns int language sql stable security definer set search_path = public as $$
  select coalesce((select (value #>> '{}')::int from public.app_settings where key = _key), _default);
$$;

-- payment approval: rewards for the referrer (months or commission) and a month for the friend
create or replace function public.admin_set_subscription(_uid uuid, _status text, _valid_until date) returns void language plpgsql security definer set search_path = public as $$
declare prev text; prev_until date; ref uuid; first_time boolean; amb public.ambassadors; got int; cap int; reward int; bonus boolean;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  select status, valid_until, referred_by, activated_at is null, friend_bonus_given into prev, prev_until, ref, first_time, bonus
    from public.subscriptions where user_id = _uid;
  update public.subscriptions set status = _status, valid_until = _valid_until, updated_at = now(),
    activated_at = case when _status = 'active' then coalesce(activated_at, now()) else activated_at end
   where user_id = _uid;
  if _status <> 'active' or ref is null then return; end if;
  -- a paid period = first activation, or an extension of the end date
  if not (prev <> 'active' or _valid_until > coalesce(prev_until, '1900-01-01'::date)) then return; end if;

  select * into amb from public.ambassadors where user_id = ref and status = 'approved';
  if found then
    insert into public.referral_events (referrer, friend, kind, amount_cents, status, period_until)
    values (ref, _uid, 'commission', round(public.setting_int('price_year_cents', 3000) * amb.commission_pct / 100.0), 'pending', _valid_until);
  elsif first_time then
    reward := public.setting_int('referral_reward_months', 1);
    cap := public.setting_int('referral_cap_months', 12);
    select referral_months into got from public.subscriptions where user_id = ref;
    reward := least(reward, greatest(0, cap - coalesce(got, 0)));
    if reward > 0 then
      update public.subscriptions
         set valid_until = greatest(coalesce(valid_until, now()::date), now()::date) + make_interval(months => reward),
             referral_months = referral_months + reward
       where user_id = ref;
      insert into public.referral_events (referrer, friend, kind, months, status) values (ref, _uid, 'months', reward, 'approved');
    end if;
  end if;
  -- the friend also gets a month once
  if first_time and not coalesce(bonus, false) then
    update public.subscriptions set valid_until = valid_until + make_interval(months => public.setting_int('referral_reward_months', 1)), friend_bonus_given = true
     where user_id = _uid;
  end if;
end $$;

create or replace function public.my_subscription() returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'status', s.status, 'valid_until', s.valid_until, 'bank_reference', s.bank_reference,
    'referral_code', s.referral_code, 'payment_marked_at', s.payment_marked_at, 'referral_months', s.referral_months,
    'referrals', (select count(*) from public.subscriptions r where r.referred_by = s.user_id),
    'referrals_paid', (select count(*) from public.subscriptions r where r.referred_by = s.user_id and r.activated_at is not null),
    'referred_by_name', (select p.display_name from public.profiles p where p.id = s.referred_by),
    'friend_bonus_given', s.friend_bonus_given,
    'reward_months', public.setting_int('referral_reward_months', 1),
    'cap_months', public.setting_int('referral_cap_months', 12),
    'ambassador', (select json_build_object('status', a.status, 'kind', a.kind, 'org', a.org, 'commission_pct', a.commission_pct) from public.ambassadors a where a.user_id = s.user_id),
    'commission', (select json_build_object(
        'pending', coalesce(sum(amount_cents) filter (where status = 'pending'), 0),
        'approved', coalesce(sum(amount_cents) filter (where status = 'approved'), 0),
        'paid', coalesce(sum(amount_cents) filter (where status = 'paid'), 0))
      from public.referral_events e where e.referrer = s.user_id and e.kind = 'commission'),
    'min_payout_cents', public.setting_int('ambassador_min_payout_cents', 2500),
    'paywall_enabled', coalesce((select (value)::text::boolean from public.app_settings where key = 'paywall_enabled'), false)
  ) from public.subscriptions s where s.user_id = auth.uid();
$$;

create or replace function public.ambassador_apply(_kind text, _org text, _link text, _audience text, _motivation text) returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  insert into public.ambassadors (user_id, kind, org, link, audience, motivation, commission_pct)
  values (auth.uid(), _kind, left(_org, 120), left(_link, 300), left(_audience, 120), left(_motivation, 1000), public.setting_int('ambassador_commission_pct', 20))
  on conflict (user_id) do update set kind = excluded.kind, org = excluded.org, link = excluded.link, audience = excluded.audience,
    motivation = excluded.motivation, status = case when ambassadors.status = 'rejected' then 'applied' else ambassadors.status end;
end $$;

create or replace function public.admin_list_ambassadors() returns setof json language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return query select json_build_object(
    'user_id', a.user_id, 'name', p.display_name, 'email', p.email, 'status', a.status, 'kind', a.kind, 'org', a.org, 'link', a.link,
    'audience', a.audience, 'motivation', a.motivation, 'commission_pct', a.commission_pct, 'created_at', a.created_at,
    'referrals', (select count(*) from public.subscriptions r where r.referred_by = a.user_id),
    'paid', (select count(*) from public.subscriptions r where r.referred_by = a.user_id and r.activated_at is not null),
    'pending_cents', (select coalesce(sum(amount_cents), 0) from public.referral_events e where e.referrer = a.user_id and e.kind = 'commission' and e.status = 'pending'),
    'approved_cents', (select coalesce(sum(amount_cents), 0) from public.referral_events e where e.referrer = a.user_id and e.kind = 'commission' and e.status = 'approved'),
    'paid_cents', (select coalesce(sum(amount_cents), 0) from public.referral_events e where e.referrer = a.user_id and e.kind = 'commission' and e.status = 'paid')
  ) from public.ambassadors a join public.profiles p on p.id = a.user_id order by a.created_at desc;
end $$;

create or replace function public.admin_set_ambassador(_uid uuid, _status text, _pct int) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  update public.ambassadors set status = _status, commission_pct = coalesce(_pct, commission_pct),
    approved_at = case when _status = 'approved' then coalesce(approved_at, now()) else approved_at end
   where user_id = _uid;
end $$;

-- move all commissions of an ambassador one step: pending → approved, or approved → paid
create or replace function public.admin_settle_commissions(_uid uuid, _to text) returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  update public.referral_events set status = _to, paid_at = case when _to = 'paid' then now() else paid_at end
   where referrer = _uid and kind = 'commission' and status = case when _to = 'approved' then 'pending' else 'approved' end;
  get diagnostics n = row_count;
  return n;
end $$;

grant execute on function public.ambassador_apply(text, text, text, text, text) to authenticated;
grant execute on function public.admin_list_ambassadors() to authenticated;
grant execute on function public.admin_set_ambassador(uuid, text, int) to authenticated;
grant execute on function public.admin_settle_commissions(uuid, text) to authenticated;
