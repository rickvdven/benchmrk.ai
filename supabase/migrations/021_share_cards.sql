-- Competition and sharing, part 1: shareable cards, nickname and privacy setting.
-- Cards are snapshots: the numbers and the nickname are stored when the card is made, so nothing else about the
-- owner can leak. The owner can read and delete their cards; everyone else can only read one card by its code through
-- share_card_get(), which returns the card data and the owner's referral code, never a user id, name or email.

-- 1. nickname and visibility on the profile (written only through the RPCs below)
alter table public.profiles add column if not exists nickname text;
alter table public.profiles add column if not exists visibility text not null default 'private';
alter table public.profiles add column if not exists visibility_consent_at timestamptz;
alter table public.profiles drop constraint if exists profiles_visibility_check;
alter table public.profiles add constraint profiles_visibility_check check (visibility in ('private','gym','public'));
create unique index if not exists profiles_nickname_lower on public.profiles (lower(nickname)) where nickname is not null;

-- words that may not be part of a nickname; admins extend the list in app_settings
insert into public.app_settings (key, value) values ('nickname_blocklist', '["benchmrk","hyrox","roxengine","admin","moderator","support","official","staff"]')
on conflict (key) do nothing;

create or replace function public.set_nickname(_nick text) returns text language plpgsql security definer set search_path = public as $$
declare n text := trim(coalesce(_nick, '')); w text; list jsonb;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if n !~ '^[A-Za-z0-9._-]{3,20}$' then raise exception 'nickname_invalid'; end if;
  select value into list from public.app_settings where key = 'nickname_blocklist';
  for w in select jsonb_array_elements_text(coalesce(list, '[]'::jsonb)) loop
    if position(lower(w) in lower(n)) > 0 then raise exception 'nickname_blocked'; end if;
  end loop;
  if exists (select 1 from public.profiles where lower(nickname) = lower(n) and id <> auth.uid()) then raise exception 'nickname_taken'; end if;
  begin
    update public.profiles set nickname = n, updated_at = now() where id = auth.uid();
  exception when unique_violation then
    raise exception 'nickname_taken';
  end;
  return n;
end $$;

-- 'private' is the default. 'gym' needs explicit consent and a nickname. 'public' is not available yet.
create or replace function public.set_visibility(_level text, _consent boolean default false) returns text language plpgsql security definer set search_path = public as $$
declare cur text; nick text;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if _level not in ('private','gym') then raise exception 'visibility_unavailable'; end if;
  select visibility, nickname into cur, nick from public.profiles where id = auth.uid();
  if _level = 'gym' then
    if nick is null then raise exception 'nickname_required'; end if;
    if cur = 'private' and not coalesce(_consent, false) then raise exception 'consent_required'; end if;
    update public.profiles set visibility = 'gym', visibility_consent_at = case when cur = 'private' then now() else visibility_consent_at end, updated_at = now() where id = auth.uid();
  else
    update public.profiles set visibility = 'private', updated_at = now() where id = auth.uid();
  end if;
  return _level;
end $$;

-- 2. cards
create table if not exists public.share_cards (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-HJ-NP-Z2-9]{6}$'),
  type text not null check (type in ('prediction','benchmark_pr','progress','challenge')),
  data jsonb not null,
  owner uuid not null references auth.users on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists share_cards_owner on public.share_cards (owner, created_at desc);
alter table public.share_cards enable row level security;
create policy "share_cards: owner read" on public.share_cards for select using (owner = auth.uid());
create policy "share_cards: owner delete" on public.share_cards for delete using (owner = auth.uid());
-- no insert/update policy: cards are made through create_share_card(), which validates what goes on a card

-- the keys a card may carry, per type; anything else is rejected
create or replace function public.share_card_keys(_type text) returns text[] language sql immutable as $$
  select case _type
    when 'prediction'   then array['v','lang','nickname','division','time','goal','chance','runs','stations','roxzone','race','weeks']
    when 'benchmark_pr' then array['v','lang','nickname','division','n','week','old','new','time','goal','chance_old','chance_new']
    when 'progress'     then array['v','lang','nickname','division','week','total','start','time','goal','series']
    when 'challenge'    then array['v','lang','nickname','division','week','name_ch','short_ch','result','previous','pr','rank']
  end;
$$;

create or replace function public.valid_share_data(_type text, _d jsonb) returns boolean language plpgsql immutable as $$
declare k text; v jsonb; el jsonb;
begin
  if _d is null or jsonb_typeof(_d) <> 'object' or pg_column_size(_d) > 4000 then return false; end if;
  if public.share_card_keys(_type) is null then return false; end if;
  for k, v in select * from jsonb_each(_d) loop
    if not (k = any (public.share_card_keys(_type))) then return false; end if;
    if k in ('v','week','total','n','weeks','rank','chance','chance_old','chance_new') then
      if jsonb_typeof(v) <> 'number' or (v #>> '{}')::numeric not between 0 and 1000 then return false; end if;
    elsif k in ('time','goal','runs','stations','roxzone','start','old','new') then
      -- seconds (race times) or seconds per km (benchmark-pr old/new)
      if jsonb_typeof(v) <> 'number' or (v #>> '{}')::numeric not between 60 and 60000 then return false; end if;
    elsif k = 'pr' then
      if jsonb_typeof(v) <> 'boolean' then return false; end if;
    elsif k = 'series' then
      if jsonb_typeof(v) <> 'array' or jsonb_array_length(v) not between 2 and 60 then return false; end if;
      for el in select * from jsonb_array_elements(v) loop
        if jsonb_typeof(el) <> 'number' or (el #>> '{}')::numeric not between 600 and 60000 then return false; end if;
      end loop;
    else
      if jsonb_typeof(v) <> 'string' or length(v #>> '{}') > 40 then return false; end if;
    end if;
  end loop;
  return true;
end $$;

create or replace function public.create_share_card(_type text, _data jsonb) returns json language plpgsql security definer set search_path = public as $$
declare p public.profiles; div text; c text; alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; i int; d jsonb;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select * into p from public.profiles where id = auth.uid();
  if not found or p.nickname is null then raise exception 'nickname_required'; end if;
  if (select count(*) from public.share_cards where owner = auth.uid() and created_at > now() - interval '1 day') >= 40 then raise exception 'rate_limited'; end if;
  -- nickname and division always come from the profile, whatever the client sends
  div := case p.category
    when 'solo_open' then case p.sex when 'woman' then 'open_women' else 'open_men' end
    when 'solo_pro' then case p.sex when 'woman' then 'pro_women' else 'pro_men' end
    when 'doubles_open' then 'doubles_open'
    when 'doubles_pro' then 'doubles_pro'
    else case p.sex when 'woman' then 'open_women' else 'open_men' end end;
  d := (coalesce(_data, '{}'::jsonb) - 'nickname' - 'division') || jsonb_build_object('nickname', p.nickname, 'division', div);
  if not public.valid_share_data(_type, d) then raise exception 'invalid_card'; end if;
  loop
    c := '';
    for i in 1..6 loop c := c || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1); end loop;
    exit when not exists (select 1 from public.share_cards where code = c);
  end loop;
  insert into public.share_cards (code, type, data, owner) values (c, _type, d, auth.uid());
  return json_build_object('code', c);
end $$;

-- public read by code: card data plus the owner's referral code (so a signup through the link is credited)
create or replace function public.share_card_get(_code text) returns json language sql stable security definer set search_path = public as $$
  select json_build_object('type', c.type, 'data', c.data, 'ref', (select s.referral_code from public.subscriptions s where s.user_id = c.owner))
  from public.share_cards c where c.code = upper(trim(_code));
$$;

grant execute on function public.set_nickname(text), public.set_visibility(text, boolean), public.create_share_card(text, jsonb) to authenticated;
grant execute on function public.share_card_get(text) to anon, authenticated;
