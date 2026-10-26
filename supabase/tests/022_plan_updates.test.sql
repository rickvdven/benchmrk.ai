-- Plan updates: RLS and RPCs (run with scripts/test-db.sh). Every check raises on failure.
\set ON_ERROR_STOP 1
set client_min_messages = warning;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'b@example.com'),
  ('00000000-0000-0000-0000-0000000000ad', 'admin@example.com');
insert into public.user_roles (user_id, role) values ('00000000-0000-0000-0000-0000000000ad', 'admin') on conflict do nothing;

create or replace function pg_temp.as_user(_id text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', _id, false), set_config('request.jwt.claim.role', 'authenticated', false);
$$;

-- every member starts with a start version on rule set 1
do $$ begin
  assert (select count(*) from public.user_plan_versions where reason = 'start' and rule_set_version = 1) = 3, 'start versions';
  assert (select rule_set_version from public.profiles where id = '00000000-0000-0000-0000-00000000000a') = 1, 'pin 1';
end $$;

-- admin makes a draft update for rule set 2
select pg_temp.as_user('00000000-0000-0000-0000-0000000000ad');
set role authenticated;
insert into public.plan_updates (id, rule_set_version, title, changes)
values ('00000000-0000-0000-0000-000000000002', 2, '{"nl":"Planupdate test","en":"Plan update test"}', '[]');
reset role;

-- a member does not see drafts and cannot apply them
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
set role authenticated;
do $$ begin
  assert (select count(*) from public.plan_updates) = 0, 'draft hidden';
  begin
    perform public.plan_apply_update('00000000-0000-0000-0000-000000000002', current_date, '[]', '[]');
    raise exception 'draft applied';
  exception when others then
    assert sqlerrm = 'plan_update_not_published', sqlerrm;
  end;
  -- members cannot touch their pin or write versions directly
  begin
    update public.profiles set rule_set_version = 2 where id = auth.uid();
    raise exception 'pin updated directly';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.user_plan_versions (user_id, version_no, rule_set_version, reason) values (auth.uid(), 9, 2, 'update');
    raise exception 'version inserted directly';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- admin publishes
select pg_temp.as_user('00000000-0000-0000-0000-0000000000ad');
set role authenticated;
update public.plan_updates set status = 'published' where rule_set_version = 2;
reset role;
do $$ begin
  assert (select published_at is not null from public.plan_updates where rule_set_version = 2), 'published_at';
end $$;

-- member A applies
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
set role authenticated;
do $$ declare n int; begin
  assert (select count(*) from public.plan_updates) = 1, 'published visible';
  perform public.plan_record_snapshot('[{"date":"2026-11-16","type":"easy"}]');
  n := public.plan_apply_update('00000000-0000-0000-0000-000000000002', current_date, '[{"before":1}]', '[{"after":1}]');
  assert n = 2, 'version 2';
  assert (select rule_set_version from public.profiles where id = auth.uid()) = 2, 'pin moved';
  assert (select plan_snapshot from public.user_plan_versions where user_id = auth.uid() and version_no = 1) = '[{"date":"2026-11-16","type":"easy"}]', 'start snapshot kept';
  assert (select effective_from from public.user_plan_versions where user_id = auth.uid() and version_no = 2) = current_date, 'effective from';
  assert (select choice from public.user_plan_update_choices where user_id = auth.uid()) = 'applied', 'choice applied';
  begin
    perform public.plan_apply_update('00000000-0000-0000-0000-000000000002', current_date, '[]', '[]');
    raise exception 'applied twice';
  exception when others then assert sqlerrm = 'plan_update_already_applied', sqlerrm;
  end;
  begin
    perform public.plan_apply_update('00000000-0000-0000-0000-000000000002', current_date - 10, '[]', '[]');
    raise exception 'past date accepted';
  exception when others then assert sqlerrm in ('invalid_from_date', 'plan_update_already_applied'), sqlerrm;
  end;
end $$;
reset role;

-- member B sees none of A's versions or choices, and is still on rule set 1
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
set role authenticated;
do $$ declare a uuid; begin
  assert (select count(*) from public.user_plan_versions) = 1, 'B sees only own version';
  assert (select count(*) from public.user_plan_versions where user_id = '00000000-0000-0000-0000-00000000000a') = 0, 'B cannot read A';
  assert (select count(*) from public.user_plan_update_choices where user_id = '00000000-0000-0000-0000-00000000000a') = 0, 'B cannot read A choices';
  assert (select rule_set_version from public.profiles where id = auth.uid()) = 1, 'B untouched';
  -- B cannot roll back to A's version
  select id into a from public.user_plan_versions where user_id = '00000000-0000-0000-0000-00000000000a' limit 1;
  begin
    perform public.plan_rollback(coalesce(a, gen_random_uuid()), current_date, '[]', '[]');
    raise exception 'rolled back to a foreign version';
  exception when others then assert sqlerrm = 'plan_version_not_found', sqlerrm;
  end;
  perform public.plan_dismiss_update('00000000-0000-0000-0000-000000000002');
  assert (select choice from public.user_plan_update_choices where user_id = auth.uid()) = 'dismissed', 'dismissed';
  assert (select rule_set_version from public.profiles where id = auth.uid()) = 1, 'dismiss keeps plan';
end $$;
reset role;

-- A rolls back to the start version
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
set role authenticated;
do $$ declare v uuid; n int; begin
  select id into v from public.user_plan_versions where user_id = auth.uid() and version_no = 1;
  n := public.plan_rollback(v, current_date, '[]', '[]');
  assert n = 3, 'rollback is a new version';
  assert (select reason || ':' || rule_set_version || ':' || restored_version_no from public.user_plan_versions where user_id = auth.uid() and version_no = 3) = 'rollback:1:1', 'rollback row';
  assert (select rule_set_version from public.profiles where id = auth.uid()) = 1, 'pin back';
  assert (select choice from public.user_plan_update_choices where user_id = auth.uid()) = 'rolled_back', 'choice rolled back';
  -- and forward again
  n := public.plan_apply_update('00000000-0000-0000-0000-000000000002', current_date, '[]', '[]');
  assert n = 4 and (select rule_set_version from public.profiles where id = auth.uid()) = 2, 'apply again';
end $$;
reset role;

-- new members start on the newest published version; sources are archived, never deleted
insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000c', 'c@example.com');
do $$ begin
  assert (select rule_set_version from public.profiles where id = '00000000-0000-0000-0000-00000000000c') = 2, 'new member pinned to latest';
  assert (select rule_set_version from public.user_plan_versions where user_id = '00000000-0000-0000-0000-00000000000c' and version_no = 1) = 2, 'start version 2';
  begin
    delete from public.knowledge_sources where slug = 'bosquet-2007';
    raise exception 'source deleted';
  exception when others then assert sqlerrm = 'archive_instead_of_delete', sqlerrm;
  end;
  assert (select rule_keys from public.knowledge_sources where slug = 'bosquet-2007') @> array['taper.volumeRaceWeek'], 'rule keys backfilled';
end $$;

-- anonymous visitors (the /science page) read published updates and sources, nothing else
select set_config('request.jwt.claim.sub', '', false);
set role anon;
do $$ begin
  assert (select count(*) from public.plan_updates) = 1, 'anon sees published update';
  assert (select count(*) from public.knowledge_sources) > 0, 'anon reads sources';
  assert (select count(*) from public.user_plan_versions) = 0, 'anon sees no versions';
end $$;
reset role;
