-- Social posts: only admins see and change them, every admin action is audited, status rules hold, claims are leased.
\set ON_ERROR_STOP 1
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'member@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'admin2@example.com');
insert into public.user_roles (user_id, role) values ('00000000-0000-0000-0000-0000000000a2', 'admin') on conflict do nothing;
create or replace function pg_temp.as_user(_id text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', _id, false), set_config('request.jwt.claim.role', 'authenticated', false);
$$;

-- the agent API writes with the service role: a draft
insert into public.social_posts (id, format, platforms, caption, media, source, created_by)
values ('00000000-0000-0000-0000-00000000c001', 'image', '{instagram}', 'Test', '[{"path":"posts/t/1.jpg","kind":"image"}]', 't', 'social-agent');

-- a member sees nothing and cannot approve
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
set role authenticated;
do $$ begin
  assert (select count(*) from public.social_posts) = 0, 'member sees posts';
  assert (select count(*) from public.admin_audit_log) = 0, 'member sees audit';
  begin
    perform public.social_approve('00000000-0000-0000-0000-00000000c001', now() + interval '1 hour');
    raise exception 'member approved';
  exception when others then assert sqlerrm = 'forbidden', sqlerrm;
  end;
  begin
    perform public.social_claim(5, 240);
    raise exception 'member claimed';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- the admin edits, approves, sends back to draft, approves again; every step is audited
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a2');
set role authenticated;
do $$ declare p public.social_posts; begin
  assert (select count(*) from public.social_posts) = 1, 'admin sees post';
  begin
    perform public.social_approve('00000000-0000-0000-0000-00000000c001', null);
    raise exception 'approved without time';
  exception when others then assert sqlerrm = 'time_required', sqlerrm;
  end;
  p := public.social_update('00000000-0000-0000-0000-00000000c001', 'Nieuwe tekst', now() + interval '1 hour', '{instagram,facebook}');
  assert p.caption = 'Nieuwe tekst' and p.platforms = '{instagram,facebook}', 'update';
  p := public.social_approve('00000000-0000-0000-0000-00000000c001', now() - interval '1 minute');
  assert p.status = 'approved' and p.approved_by = auth.uid() and p.approved_at is not null, 'approve';
  p := public.social_set_status('00000000-0000-0000-0000-00000000c001', 'to_draft');
  assert p.status = 'draft' and p.approved_by is null, 'to draft';
  p := public.social_approve('00000000-0000-0000-0000-00000000c001', now() - interval '1 minute');
  assert (select count(*) from public.admin_audit_log where target_id = '00000000-0000-0000-0000-00000000c001') = 4, 'audit rows';
  assert (select actor from public.admin_audit_log order by created_at desc limit 1) = auth.uid(), 'audit actor';
  begin
    perform public.social_set_status('00000000-0000-0000-0000-00000000c001', 'reject');
    raise exception 'rejected an approved post';
  exception when others then assert sqlerrm = 'not_allowed_in_this_status', sqlerrm;
  end;
end $$;
reset role;

-- the publisher claims it once; a second claim during the lease gets nothing; after the lease it is claimable again
do $$ declare n int; begin
  select count(*) into n from public.social_claim(5, 240);
  assert n = 1, 'first claim';
  select count(*) into n from public.social_claim(5, 240);
  assert n = 0, 'second claim during lease';
  update public.social_posts set locked_until = now() - interval '1 second' where id = '00000000-0000-0000-0000-00000000c001';
  select count(*) into n from public.social_claim(5, 240);
  assert n = 1, 'claim after lease';
  -- once something is published it cannot go back to draft
  update public.social_posts set status = 'failed', ig_media_id = '123' where id = '00000000-0000-0000-0000-00000000c001';
end $$;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a2');
set role authenticated;
do $$ begin
  begin
    perform public.social_set_status('00000000-0000-0000-0000-00000000c001', 'to_draft');
    raise exception 'published post went back to draft';
  exception when others then assert sqlerrm = 'not_allowed_in_this_status', sqlerrm;
  end;
  assert (public.social_set_status('00000000-0000-0000-0000-00000000c001', 'retry')).status = 'approved', 'retry';
end $$;
reset role;

-- rate limit: 3 per window
do $$ begin
  assert public.rate_hit('t', 3, 60) and public.rate_hit('t', 3, 60) and public.rate_hit('t', 3, 60), 'within limit';
  assert not public.rate_hit('t', 3, 60), 'over limit';
end $$;

-- one open draft per source
do $$ begin
  insert into public.social_posts (format, source) values ('image', 'dup');
  begin
    insert into public.social_posts (format, source) values ('image', 'dup');
    raise exception 'two drafts for one source';
  exception when unique_violation then null;
  end;
end $$;
delete from public.social_posts;
