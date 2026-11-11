-- Social posts: the social agent creates drafts, an admin approves them in Admin → Social, and Benchmrk publishes them
-- on Instagram and the Facebook page at the scheduled time (server/social/publish.ts, called every 5 minutes by pg_cron,
-- see supabase/manual/social_cron.sql). Nothing is published without an admin's approval.

-- 1. posts
create table if not exists public.social_posts (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'draft'
    check (status in ('draft','approved','processing','published','failed','rejected','cancelled')),
  platforms text[] not null default '{instagram}',          -- 'instagram', 'facebook'
  format text not null check (format in ('image','carousel','reel','story')),
  caption text not null default '' check (char_length(caption) <= 2200),
  media jsonb not null default '[]',                         -- [{ "path": "posts/<key>/1.jpg", "kind": "image"|"video" }], in order
  cover_path text,                                           -- optional cover for a reel
  scheduled_at timestamptz,
  source text,                                               -- id from the social agent, e.g. 'w5b-2-rekensom'
  created_by text not null default 'admin',                  -- 'social-agent' or 'admin'
  approved_by uuid references auth.users,
  approved_at timestamptz,
  ig_container_id text,
  ig_media_id text,
  fb_post_id text,
  permalink text,
  attempts int not null default 0,
  last_error text,
  -- added to the briefing: intermediate publishing state (carousel child containers, Facebook reel upload) and a lease,
  -- so a post that is being published is never picked up twice and a crashed run is retried after the lease ends
  publish_state jsonb not null default '{}',
  locked_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint social_posts_platforms_check check (platforms <@ array['instagram','facebook']::text[] and cardinality(platforms) >= 1)
);
alter table public.social_posts enable row level security;
drop policy if exists "social_posts: admin" on public.social_posts;
create policy "social_posts: admin" on public.social_posts
  for all using (public.is_admin()) with check (public.is_admin());
create index if not exists social_posts_status_scheduled on public.social_posts (status, scheduled_at);
-- one open draft per agent source: the agent updates it instead of creating a second one
create unique index if not exists social_posts_source_draft on public.social_posts (source) where status = 'draft' and source is not null;

create or replace function public.social_posts_touch() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists social_posts_touch on public.social_posts;
create trigger social_posts_touch before update on public.social_posts for each row execute function public.social_posts_touch();

-- 2. admin audit log (update 8 is not in the repo yet: created here if missing, same shape for both)
create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor uuid references auth.users on delete set null,      -- null = the system (publisher, cron)
  action text not null,
  target_type text,
  target_id text,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);
alter table public.admin_audit_log enable row level security;
drop policy if exists "audit: admin read" on public.admin_audit_log;
create policy "audit: admin read" on public.admin_audit_log for select using (public.is_admin());
-- written only through the functions below and the service role

-- 3. storage: private bucket, JPEG and MP4 only, 50 MB (free plan limit; 8 MB for images is checked by the API)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('social-media', 'social-media', false, 52428800, array['image/jpeg','video/mp4'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists "social media: admin" on storage.objects;
create policy "social media: admin" on storage.objects for all to authenticated
  using (bucket_id = 'social-media' and public.is_admin())
  with check (bucket_id = 'social-media' and public.is_admin());

-- 4. admin actions (each one lands in the audit log)
create or replace function public._social_audit(_action text, _id uuid, _details jsonb default '{}') returns void
language sql security definer set search_path = public as $$
  insert into public.admin_audit_log (actor, action, target_type, target_id, details) values (auth.uid(), _action, 'social_post', _id::text, coalesce(_details, '{}'));
$$;
revoke execute on function public._social_audit(text, uuid, jsonb) from public, anon, authenticated;

create or replace function public._social_require_admin() returns void language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
end $$;

-- edit caption, time and platforms; only before publishing starts
create or replace function public.social_update(_id uuid, _caption text, _scheduled_at timestamptz, _platforms text[]) returns public.social_posts
language plpgsql security definer set search_path = public as $$
declare p public.social_posts;
begin
  perform public._social_require_admin();
  update public.social_posts set caption = _caption, scheduled_at = _scheduled_at, platforms = _platforms
  where id = _id and status in ('draft','approved','failed') returning * into p;
  if p.id is null then raise exception 'not_editable'; end if;
  perform public._social_audit('social.update', _id, jsonb_build_object('scheduled_at', _scheduled_at, 'platforms', _platforms));
  return p;
end $$;

-- approve: needs a time; "post now" approves with now()
create or replace function public.social_approve(_id uuid, _scheduled_at timestamptz) returns public.social_posts
language plpgsql security definer set search_path = public as $$
declare p public.social_posts;
begin
  perform public._social_require_admin();
  if _scheduled_at is null then raise exception 'time_required'; end if;
  update public.social_posts set status = 'approved', scheduled_at = _scheduled_at, approved_by = auth.uid(), approved_at = now(), last_error = null
  where id = _id and status in ('draft','rejected') returning * into p;
  if p.id is null then raise exception 'not_approvable'; end if;
  perform public._social_audit('social.approve', _id, jsonb_build_object('scheduled_at', _scheduled_at));
  return p;
end $$;

-- reject, cancel, back to draft, retry
create or replace function public.social_set_status(_id uuid, _action text) returns public.social_posts
language plpgsql security definer set search_path = public as $$
declare p public.social_posts;
begin
  perform public._social_require_admin();
  if _action = 'reject' then
    update public.social_posts set status = 'rejected' where id = _id and status = 'draft' returning * into p;
  elsif _action = 'cancel' then
    update public.social_posts set status = 'cancelled' where id = _id and status in ('draft','approved','failed','rejected') returning * into p;
  elsif _action = 'to_draft' then
    update public.social_posts set status = 'draft', approved_by = null, approved_at = null where id = _id and status in ('approved','failed','rejected') and ig_media_id is null and fb_post_id is null returning * into p;
  elsif _action = 'retry' then
    update public.social_posts set status = 'approved', attempts = 0, last_error = null, scheduled_at = greatest(coalesce(scheduled_at, now()), now()), locked_until = null
    where id = _id and status = 'failed' returning * into p;
  else
    raise exception 'unknown_action';
  end if;
  if p.id is null then raise exception 'not_allowed_in_this_status'; end if;
  perform public._social_audit('social.' || _action, _id);
  return p;
end $$;

-- 5. publisher: claim due posts atomically (service role only). Approved and due, or processing with an expired lease
-- (a container still IN_PROGRESS, or a run that crashed). The lease keeps a second, simultaneous run away.
create or replace function public.social_claim(_limit int default 5, _lease_seconds int default 240) returns setof public.social_posts
language sql security definer set search_path = public as $$
  update public.social_posts p set status = 'processing', locked_until = now() + make_interval(secs => _lease_seconds)
  where p.id in (
    select id from public.social_posts
    where ((status = 'approved' and scheduled_at <= now()) or (status = 'processing' and (locked_until is null or locked_until < now())))
    order by scheduled_at nulls last
    limit greatest(1, least(_limit, 5))
    for update skip locked
  )
  returning p.*;
$$;
revoke execute on function public.social_claim(int, int) from public, anon, authenticated;

-- 6. rate limit for the agent API (60 per minute), service role only
create table if not exists public.api_rate_limits (
  key text not null,
  window_start timestamptz not null,
  hits int not null default 0,
  primary key (key, window_start)
);
alter table public.api_rate_limits enable row level security;
create or replace function public.rate_hit(_key text, _limit int, _window_seconds int) returns boolean
language plpgsql security definer set search_path = public as $$
declare w timestamptz := to_timestamp(floor(extract(epoch from now()) / _window_seconds) * _window_seconds); n int;
begin
  insert into public.api_rate_limits (key, window_start, hits) values (_key, w, 1)
  on conflict (key, window_start) do update set hits = public.api_rate_limits.hits + 1
  returning hits into n;
  delete from public.api_rate_limits where window_start < now() - interval '1 hour';
  return n <= _limit;
end $$;
revoke execute on function public.rate_hit(text, int, int) from public, anon, authenticated;
