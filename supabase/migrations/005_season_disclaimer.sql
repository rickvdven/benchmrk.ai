-- extra races in the season (main race stays in race_name / race_date / goal_sec)
alter table public.profiles add column if not exists season jsonb not null default '[]'::jsonb;
alter table public.profiles add column if not exists disclaimer_accepted_at timestamptz;
grant update (season, disclaimer_accepted_at) on public.profiles to authenticated;
-- correct title of the HYROX study (verified against Crossref)
update public.knowledge_sources
   set title = 'Brandt et al. (2025): Acute physiological responses and performance determinants in Hyrox©',
       source_url = 'https://doi.org/10.3389/fphys.2025.1519240'
 where source_url like '%fphys.2025.1519240%';
