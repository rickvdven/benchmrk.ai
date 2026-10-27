-- Evidence level (A–D) per source in the knowledge base, shown on /science next to every source.
--   A = meta-analysis or systematic review
--   B = controlled study (randomised, crossover or with a control group)
--   C = small or uncontrolled study, observational data or a survey
--   D = consensus, position stand, narrative review, coaching practice or rules
-- Proposal by Claude from the type of study; Rick checks it. A level that is already set is never overwritten,
-- so running this again (or after changing a level in Admin → Kennisbank) changes nothing.

update public.knowledge_sources k set level = v.level, checked_at = coalesce(k.checked_at, date '2026-10-27')
from (values
  -- A: meta-analyses and systematic reviews
  ('Bosquet et al. (2007)%', 'A'),            -- meta-analysis, 27 studies
  ('Wang et al. (2023)%', 'A'),               -- systematic review and meta-analysis, 14 studies
  ('Vachon et al. (2021)%', 'A'),             -- meta-analysis, team sports
  ('Grgic et al. (2018)%', 'A'),              -- meta-analysis, training frequency
  ('Wenger & Bell (1986)%', 'A'),             -- pooled analysis of studies (old)
  ('Blagrove et al. (2018)%', 'A'),           -- systematic review, 24 studies
  ('Balsalobre-Fernández et al. (2016)%', 'A'), -- meta-analysis
  ('Denadai et al. (2017)%', 'A'),            -- meta-analysis, 16 studies
  ('Spiering et al. (2021)%', 'A'),           -- systematic review
  ('Schumann et al. (2022)%', 'A'),           -- meta-analysis, 43 studies
  ('Lauersen, Bertelsen & Andersen (2014)%', 'A'), -- meta-analysis, 25 RCTs
  ('Malta et al. (2021)%', 'A'),              -- meta-analysis
  ('Piñero et al. (2024)%', 'A'),             -- Bayesian meta-analysis
  ('Machado et al. (2016)%', 'A'),            -- meta-analysis, 9 RCTs
  ('Wiewelhove et al. (2019)%', 'A'),         -- meta-analysis, 21 studies
  ('Afonso et al. (2021)%', 'A'),             -- meta-analysis, 11 RCTs
  -- B: controlled studies
  ('Montero & Lundby (2017)%', 'B'),          -- n = 78, 5 groups
  ('Lenk et al. (2025)%', 'B'),               -- 3 frequency groups
  ('Tripp et al. (2025)%', 'B'),              -- 2 vs 4 sessions/week, volume matched
  ('Hatle et al. (2014)%', 'B'),              -- 2 groups
  ('Silbernagel et al. (2007)%', 'B'),        -- RCT
  ('Beyer et al. (2015)%', 'B'),              -- RCT
  ('O''Neill et al. (2019)%', 'B'),           -- controlled crossover
  ('Eyestone et al. (1993)%', 'B'),           -- RCT
  ('Roberts et al. (2015)%', 'B'),            -- controlled, 12 weeks
  ('Ahokas et al. (2023)%', 'B'),             -- crossover, n = 16
  ('Ahokas et al. (2025)%', 'B'),             -- controlled, n = 40
  ('Zurawlew et al. (2016)%', 'B'),           -- controlled
  -- C: small, uncontrolled or observational
  ('Brandt et al. (2025)%', 'C'),            -- n = 11, correlations (renamed from "Physiological determinants…" in 005)
  ('Travis et al. (2021)%', 'C'),             -- survey of practice
  ('Green et al. (2020)%', 'C'),              -- cohort, 149 injuries
  ('Hébert-Losier et al. (2017)%', 'C'),      -- reference values
  ('Wilber et al. (1996)%', 'C'),             -- small group
  ('Scoon et al. (2007)%', 'C'),              -- n = 6
  ('Kirby et al. (2021)%', 'C'),              -- no control group
  -- D: consensus, position stands, narrative reviews, practice and rules
  ('Pollock et al. (1998)%', 'D'),            -- ACSM position stand
  ('Mujika & Padilla (2003)%', 'D'),          -- narrative review
  ('Mujika & Padilla (2000)%', 'D'),          -- narrative review
  ('Travis et al. (2020)%', 'D'),             -- narrative review
  ('Thomas, Erdman & Burke (2016)%', 'D'),    -- joint position stand
  ('Burke et al. (2011)%', 'D'),              -- review / guideline
  ('Harrison et al. (2019)%', 'D'),           -- narrative review
  ('Tanaka (1994)%', 'D'),                    -- review
  ('Walsh et al. (2021)%', 'D'),              -- expert consensus
  ('WOD-Science%', 'D'),                      -- coaching practice
  ('Joe Friel%', 'D'),                        -- coaching practice
  ('HYROX weights per division%', 'D')        -- rules (not evidence)
) as v(pat, level)
where k.title like v.pat and k.level is null;

-- 022 looked for the old title of Brandt et al. (2025), renamed in 005: give it its slug and rule keys here
update public.knowledge_sources set slug = 'brandt-2025', rule_keys = array['coaching.maxWeeklyVolumeIncrease']
where title like 'Brandt et al. (2025)%' and slug is null
  and not exists (select 1 from public.knowledge_sources x where x.slug = 'brandt-2025');

-- sources that still have no level (added later via Admin → Kennisbank): set them there
select title, category from public.knowledge_sources where level is null order by title;
