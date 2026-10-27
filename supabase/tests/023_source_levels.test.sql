-- Every source added through the migrations has an evidence level after 023.
do $$ begin
  assert (select count(*) from public.knowledge_sources where level is null) = 0,
    (select 'no level: ' || string_agg(title, ', ') from public.knowledge_sources where level is null);
  assert (select count(*) from public.knowledge_sources where level = 'A') = 16, 'A count';
end $$;
