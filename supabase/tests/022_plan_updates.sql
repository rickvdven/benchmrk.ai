-- RLS and RPC scenario for migration 022 (plan updates). Run against a scratch Postgres:
--   psql -d scratch -f supabase/tests/stub_supabase.sql && psql -d scratch -f supabase/migrations/022_plan_updates.sql && psql -d scratch -f supabase/tests/022_plan_updates.sql
-- Expected: member A sees only own versions, member B sees none of A's and cannot roll them back, apply/rollback only through the RPCs,
-- a source cannot be deleted, a new profile starts on the newest published version with a start row.
\set A '00000000-0000-0000-0000-00000000000a'
\set B '00000000-0000-0000-0000-00000000000b'
\set ON_ERROR_STOP 0
-- admin creates + publishes update (as admin B)
set role authenticated; select set_config('app.uid', :'B', false);
insert into plan_updates (rule_set_version, title, changes) values (2, 'Test', '[]') returning status, published_at;
update plan_updates set status='published' returning status, published_at is not null as stamped;
-- member A cannot write plan_updates, cannot insert versions directly
select set_config('app.uid', :'A', false);
insert into plan_updates (rule_set_version, title) values (3,'x');
insert into user_plan_versions (user_id, version_no, rule_set_version, reason, effective_from) values (:'A', 9, 1, 'start', now());
select count(*) as a_versions from user_plan_versions;
select count(*) as visible_updates from plan_updates;
-- A applies
select apply_plan_update((select id from plan_updates limit 1), date '2026-11-02', '[{"date":"2026-11-02"}]', '[{"date":"2026-11-02","t":"new"}]');
select apply_plan_update((select id from plan_updates limit 1), date '2026-11-02', '[]', '[]');
select version_no, rule_set_version, reason, effective_from from user_plan_versions order by version_no;
-- rollback to version 1
select rollback_plan_version((select id from user_plan_versions where version_no=1), date '2026-11-03', '[]', '[]');
select rollback_plan_version((select id from user_plan_versions where version_no=1), date '2026-11-03', '[]', '[]');
select version_no, rule_set_version, reason from user_plan_versions order by version_no;
select choice from user_plan_update_choices;
-- B (another member) sees no versions of A except as admin; make B non-admin check via a third user
reset role; delete from user_roles; set role authenticated; select set_config('app.uid', :'B', false);
select count(*) as b_sees from user_plan_versions where user_id = :'A';
select count(*) as b_sees_choices from user_plan_update_choices;
-- B cannot roll back A's version
select rollback_plan_version((select id from user_plan_versions where user_id=:'A' limit 1), date '2026-11-03', '[]', '[]');
-- no delete of sources
reset role; insert into knowledge_sources (title) values ('s1'); delete from knowledge_sources where title='s1';
update knowledge_sources set status='archived', archived_reason='old' where title='s1' returning status, archived_at is not null as stamped;
-- new profile gets latest version and a start row
insert into auth.users values ('00000000-0000-0000-0000-00000000000c'); insert into profiles (id,email) values ('00000000-0000-0000-0000-00000000000c','c@x') returning rule_set_version;
select user_id, version_no, rule_set_version from user_plan_versions where user_id='00000000-0000-0000-0000-00000000000c';
