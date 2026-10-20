insert into public.app_settings (key, value) values
  ('paywall_enabled', 'false'),
  ('admin_email', '"rick.vandeven@gmail.com"'),
  ('price_text', '"€2,50 / month · €30 / year"'),
  ('iban', '"NL00 BANK 0000 0000 00"')
on conflict (key) do nothing;

with src as (
  insert into public.knowledge_sources (title, category, author, source_url, summary, takeaways) values
  ('Physiological determinants of HYROX performance (2025)', 'science', 'Frontiers in Physiology',
   'https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2025.1519240/pdf',
   'Simulated HYROX in 11 recreational athletes: VO2max, endurance training volume and body fat % correlated with finish time; runs ≈ 59% of total time.',
   array['VO2max and aerobic volume are the strongest predictors','Wall balls produced the highest HR, lactate and RPE','Station times did not correlate with grip strength or muscle mass']),
  ('WOD-Science: HYROX is not CrossFit', 'science', 'WOD-Science (Gommaar D''Hulst)',
   'https://morningchalkup.com/2025/04/15/can-you-be-elite-at-both-crossfit-and-hyrox/',
   'HYROX is dominated by horizontal work (running, sleds, carries) and needs specific training and in-race fuelling.',
   array['Train specifically for running, sleds and carries','Fixed race format = plannable training order','Fuel during the race']),
  ('Joe Friel: setting training zones (%LTHR)', 'zones', 'TrainingPeaks / Joe Friel',
   'https://www.trainingpeaks.com/learn/articles/joe-friel-s-quick-guide-to-setting-zones/',
   'Run zones as % of lactate threshold heart rate: Z1 <85, Z2 85–89, Z3 90–94, Z4 95–99, Z5a 100–102, Z5b 103–106, Z5c >106.',
   array['Zones anchored on the athlete''s own LTHR']),
  ('HYROX weights per division', 'rules', 'Red Bull',
   'https://www.redbull.com/us-en/hyrox-weights-overview',
   'Sled push 102/152/202 kg, sled pull 78/103/153 kg, farmers 2×16/24/32 kg, lunges 10/20/30 kg, wall balls 4/6/9 kg by division.',
   array['Mixed doubles uses Pro Women weights','Relay uses Open weights'])
  returning id, title
)
insert into public.coaching_rules (rule_key, value, unit, description, source_id)
select k, v, u, d, (select id from src where title like t || '%' limit 1) from (values
  ('threshold_cap_pct_lthr', 1.00, '× LTHR', 'Heart-rate ceiling on clean threshold reps, relative to the athlete''s own LTHR', 'Joe Friel'),
  ('achilles_stiffness_ceiling', 4, 'score 1–10', 'Morning stiffness at/above this replaces impact sessions with low-impact work', 'WOD-Science'),
  ('max_weekly_volume_increase', 0.10, 'fraction', 'Maximum weekly running volume increase', 'Physiological determinants'),
  ('ski_shift_m', 125, 'm', 'Doubles SkiErg shift length', 'WOD-Science'),
  ('sled_shift_m', 12.5, 'm', 'Doubles sled shift (one lane)', 'WOD-Science'),
  ('wall_ball_set', 10, 'reps', 'Doubles wall-ball set size', 'WOD-Science'),
  ('elite_max_decay_sec', 12, 's/km', 'Target max run decay run 1 → run 8', 'WOD-Science')
) as r(k, v, u, d, t)
on conflict (rule_key) do nothing;

insert into public.station_baselines (weight_class, station, seconds) values
  ('light','skierg',300),('light','sledPush',200),('light','sledPull',280),('light','burpees',340),('light','row',300),('light','farmers',115),('light','lunges',280),('light','wallballs',390),
  ('medium','skierg',270),('medium','sledPush',180),('medium','sledPull',255),('medium','burpees',300),('medium','row',280),('medium','farmers',100),('medium','lunges',255),('medium','wallballs',330),
  ('heavy','skierg',270),('heavy','sledPush',235),('heavy','sledPull',310),('heavy','burpees',300),('heavy','row',280),('heavy','farmers',110),('heavy','lunges',300),('heavy','wallballs',380)
on conflict do nothing;
