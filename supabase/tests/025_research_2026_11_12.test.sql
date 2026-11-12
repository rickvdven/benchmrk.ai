-- Research round 2026-11-12: sources added with level and rule keys, three archived with a replacement, nothing deleted.
do $$ begin
  assert (select count(*) from public.knowledge_sources where slug in ('gutierrez-hellin-2026-apps','rappelt-2026','rosenblat-2025','oliveira-2024','zanini-2025','chittenden-2026','hyscience-2026','yustres-amores-2026','held-2026','sprague-2018','magnusson-2010','bohm-2015','hyrox-rulebook-2627') and status = 'active' and level is not null and checked_at is not null) = 13, 'thirteen new sources';
  assert (select count(*) from public.knowledge_sources where slug in ('gutierrez-hellin-2026-apps','rosenblat-2025','hyscience-2026') and summary_i18n ? 'nl' and summary_i18n ? 'de') = 3, 'summaries per language';
  assert (select count(*) from public.knowledge_sources where status = 'archived' and archived_at is not null and archived_reason is not null and replaced_by is not null) = 3, 'three archived with replacement';
  assert (select replaced_by = (select id from public.knowledge_sources where slug = 'hyrox-rulebook-2627') from public.knowledge_sources where title like 'HYROX weights per division%'), 'Red Bull replaced by rulebook';
  assert (select not ('coaching.maxWeeklyVolumeIncrease' = any(rule_keys)) from public.knowledge_sources where slug = 'brandt-2025'), 'Brandt no longer linked to weekly volume';
  assert (select count(*) from public.knowledge_sources where 'coaching.maxWeeklyVolumeIncrease' = any(rule_keys) and slug in ('nielsen-2014','gabbett-2016')) = 2, 'Nielsen and Gabbett linked';
end $$;
