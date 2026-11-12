-- Research round 2026-11-12 (claude/research → research/VERWERK_2026-11-12.md): 13 sources added, 3 archived,
-- the source behind maxWeeklyVolumeIncrease corrected. No training rule changes (no rule set v2): see the PR.
-- Run once in the Supabase SQL Editor. Safe to run again: inserts are skipped by slug, updates only touch the named rows.

-- 1. summaries and labels per language for /science (nl, en, de; es and ko fall back to en)
alter table public.knowledge_sources add column if not exists summary_i18n jsonb;
alter table public.knowledge_sources add column if not exists label_i18n jsonb;

-- 2. new sources (levels on the /science scale: A meta-analysis/systematic review · B controlled · C small/uncontrolled/observational · D consensus/practice/rules)
insert into public.knowledge_sources (slug, title, category, author, source_url, summary, level, status, checked_at, rule_keys, summary_i18n, label_i18n)
values
 ('gutierrez-hellin-2026-apps',
  'Gutiérrez-Hellín et al. (2026): performance trends and pacing in elite HYROX – top 50 PRO men over seven seasons', 'hyrox',
  'Gutiérrez-Hellín J, Alonso-Domínguez S, Martín-Gómez FJ, Muñoz A, Franco-Andrés A, Yustres-Amores I, Santos del Cerro J, Del Coso J. Applied Sciences 16(13):6674',
  'https://doi.org/10.3390/app16136674',
  'Analysis of official results of the top 50 PRO men across seven seasons. In 2024 running was about half of race time, stations ~43 % and Roxzone ~6 %. Runs 2–8 were on average 27–55 s slower than run 1. Men only; physiology and training were not measured.',
  'C', 'active', '2026-10-27', array['pace.compromisedRatioSolo'],
  jsonb_build_object(
   'nl', 'Analyse van officiële uitslagen van de top 50 PRO-mannen over zeven seizoenen. In 2024 was lopen ongeveer de helft van de racetijd, stations ~43 % en Roxzone ~6 %. Runs 2–8 waren gemiddeld 27–55 s trager dan run 1. Alleen mannen; fysiologie en training niet gemeten.',
   'en', 'Analysis of official results of the top 50 PRO men across seven seasons. In 2024 running was about half of race time, stations ~43 % and Roxzone ~6 %. Runs 2–8 were on average 27–55 s slower than run 1. Men only; physiology and training were not measured.',
   'de', 'Analyse offizieller Ergebnisse der Top 50 PRO-Männer über sieben Saisons. 2024 machte Laufen etwa die Hälfte der Rennzeit aus, Stationen ~43 % und Roxzone ~6 %. Läufe 2–8 waren im Schnitt 27–55 s langsamer als Lauf 1. Nur Männer; Physiologie und Training wurden nicht gemessen.'),
  jsonb_build_object('nl', 'elite-mannen; 27–55 s is afgeleid uit gemiddelde splits', 'en', 'elite men; 27–55 s is derived from average splits', 'de', 'Elite-Männer; 27–55 s aus durchschnittlichen Splits abgeleitet')),

 ('rappelt-2026',
  'Rappelt et al. (2026): longitudinal performance development in PRO and ELITE HYROX across seven seasons', 'hyrox',
  'Rappelt L, Wiedenmann T, Held S, Heinke L, Micke F, Wicker P, Donath L. Front Physiol 17:1847569',
  'https://doi.org/10.3389/fphys.2026.1847569',
  '39,696 PRO and ELITE results from seven seasons. Among the top 100, running time in season 7 was 48.5 % (men) and 47.9 % (women) of finish time; running had the most stable ranking. Slower athletes lost more time per station minute, especially on strength stations. Per-run pace and physiology were not measured.',
  'C', 'active', '2026-10-27', array['pace.compromisedRatioSolo'],
  jsonb_build_object(
   'nl', '39.696 PRO- en ELITE-uitslagen uit zeven seizoenen. Bij de top 100 was de looptijd in seizoen 7 48,5 % (mannen) en 47,9 % (vrouwen) van de eindtijd; lopen had de stabielste rangorde. Tragere atleten verloren per stationminuut meer tijd, vooral op krachtstations. Tempo per run en fysiologie niet gemeten.',
   'en', '39,696 PRO and ELITE results from seven seasons. Among the top 100, running time in season 7 was 48.5 % (men) and 47.9 % (women) of finish time; running had the most stable ranking. Slower athletes lost more time per station minute, especially on strength stations. Per-run pace and physiology were not measured.',
   'de', '39.696 PRO- und ELITE-Ergebnisse aus sieben Saisons. In den Top 100 lag die Laufzeit in Saison 7 bei 48,5 % (Männer) und 47,9 % (Frauen) der Endzeit; Laufen hatte die stabilste Rangfolge. Langsamere Athleten verloren pro Stationsminute mehr Zeit, vor allem an Kraftstationen. Tempo pro Lauf und Physiologie wurden nicht gemessen.'),
  null),

 ('rosenblat-2025',
  'Rosenblat et al. (2025): training intensity distribution and VO2max / time trial – network meta-analysis of individual participant data', 'intensity',
  'Rosenblat MA, Watt JA, Arnold JI, Treff G, Sandbakk ØB, Esteve-Lanao J, Festa L, Filipas L, Galloway SD, Muñoz I, Ramos-Campo DJ, Schneeweiss P, Sellés-Pérez S, Stöggl T, Talsnes RK, Zinner C, Seiler S. Sports Med 55(3):655–673',
  'https://doi.org/10.1007/s40279-024-02149-3',
  'Network meta-analysis of 13 studies (348 participants, 150 recreational). No difference between polarized and pyramidal intensity distribution for VO2max or time-trial performance. Recreational athletes may benefit more from pyramidal (more threshold work), competitive athletes from polarized.',
  'A', 'active', '2026-10-27', array['zones.table'],
  jsonb_build_object(
   'nl', 'Netwerk-meta-analyse van 13 studies (348 deelnemers, 150 recreatief). Geen verschil tussen gepolariseerde en piramidale intensiteitsverdeling voor VO₂max of tijdrit. Recreatieve atleten hadden mogelijk meer baat bij piramidaal (meer drempelwerk), competitieve bij gepolariseerd.',
   'en', 'Network meta-analysis of 13 studies (348 participants, 150 recreational). No difference between polarized and pyramidal intensity distribution for VO₂max or time-trial performance. Recreational athletes may benefit more from pyramidal (more threshold work), competitive athletes from polarized.',
   'de', 'Netzwerk-Metaanalyse von 13 Studien (348 Teilnehmende, 150 Freizeitsportler). Kein Unterschied zwischen polarisierter und pyramidaler Intensitätsverteilung für VO₂max oder Zeitfahrleistung. Freizeitsportler profitieren möglicherweise mehr von pyramidal (mehr Schwellentraining), Wettkampfathleten von polarisiert.'),
  null),

 ('oliveira-2024',
  'Oliveira et al. (2024): polarized versus other training intensity distributions on endurance performance – systematic review and meta-analysis', 'intensity',
  'Oliveira et al. Sports Med 54(8):2071–2095',
  'https://doi.org/10.1007/s40279-024-02034-z',
  '17 studies (437 participants), 14 in the meta-analysis. Polarized training gave slightly larger VO2peak gains (SMD 0.24), mainly in interventions under 12 weeks and in highly trained athletes. No difference in time-trial performance or speed at the second threshold.',
  'A', 'active', '2026-10-27', array['zones.table'],
  jsonb_build_object(
   'nl', '17 studies (437 deelnemers), 14 in de meta-analyse. Gepolariseerd gaf iets meer VO₂peak-winst (SMD 0,24), vooral bij interventies korter dan 12 weken en bij hoog getrainde atleten. Geen verschil in tijdrit of snelheid op de tweede drempel.',
   'en', '17 studies (437 participants), 14 in the meta-analysis. Polarized training gave slightly larger VO₂peak gains (SMD 0.24), mainly in interventions under 12 weeks and in highly trained athletes. No difference in time-trial performance or speed at the second threshold.',
   'de', '17 Studien (437 Teilnehmende), 14 in der Metaanalyse. Polarisiertes Training brachte etwas mehr VO₂peak-Zuwachs (SMD 0,24), vor allem bei Interventionen unter 12 Wochen und bei hoch trainierten Athleten. Kein Unterschied bei Zeitfahrleistung oder Geschwindigkeit an der zweiten Schwelle.'),
  null),

 ('zanini-2025',
  'Zanini et al. (2025): strength training improves running economy durability and fatigued performance – randomized controlled trial', 'strength',
  'Zanini M, Folland JP, Wu H, Blagrove RC. Med Sci Sports Exerc 57(7):1546–1558',
  'https://doi.org/10.1249/MSS.0000000000003685',
  'RCT in 28 well-trained male runners: 10 weeks of maximal strength and plyometrics twice a week. Running economy after 90 minutes of running +2.1 % vs −0.6 % in controls; fatigued time to exhaustion +35 % vs −8 %. No women, no HYROX.',
  'B', 'active', '2026-10-27', array[]::text[],
  jsonb_build_object(
   'nl', 'RCT bij 28 goed getrainde mannelijke lopers: 10 weken 2× per week maximale kracht en plyometrie. Loopeconomie na 90 minuten lopen +2,1 % tegenover −0,6 % in de controlegroep; tijd tot uitputting na vermoeidheid +35 % tegenover −8 %. Geen vrouwen, geen HYROX.',
   'en', 'RCT in 28 well-trained male runners: 10 weeks of maximal strength and plyometrics twice a week. Running economy after 90 minutes of running +2.1 % vs −0.6 % in controls; fatigued time to exhaustion +35 % vs −8 %. No women, no HYROX.',
   'de', 'RCT mit 28 gut trainierten männlichen Läufern: 10 Wochen zweimal pro Woche Maximalkraft und Plyometrie. Laufökonomie nach 90 Minuten Laufen +2,1 % gegenüber −0,6 % in der Kontrollgruppe; Zeit bis zur Erschöpfung im ermüdeten Zustand +35 % gegenüber −8 %. Keine Frauen, kein HYROX.'),
  null),

 ('chittenden-2026',
  'Chittenden et al. (2026): health problems in HYROX athletes – 12-week prospective cohort', 'injury',
  'Chittenden E, Bell A, Forbes G, Tooth P, Porter R, Van Der Vliet R, Shouman K, Williams S. Front Sports Act Living 8:1937574',
  'https://doi.org/10.3389/fspor.2026.1937574',
  '89 HYROX athletes (63 % female, 62 % with under 1 year of experience) completed a weekly health questionnaire for 12 weeks. Injuries: 14.4 per 1,000 training hours, 73 % overuse, knee 22 %. A previous time-loss injury was associated with more new problems (rate ratio 2.60; 95 % CI 1.00–6.75), but this is uncertain. Training load was not measured objectively.',
  'C', 'active', '2026-10-27', array[]::text[],
  jsonb_build_object(
   'nl', '89 HYROX-atleten (63 % vrouw, 62 % minder dan 1 jaar ervaring) vulden 12 weken lang wekelijks een gezondheidsvragenlijst in. Blessures: 14,4 per 1000 trainingsuren, 73 % door overbelasting, knie 22 %. Een eerdere blessure met uitval hing samen met meer nieuwe klachten (rate ratio 2,60; 95%-BI 1,00–6,75), maar dat verband is onzeker. Belasting niet objectief gemeten.',
   'en', '89 HYROX athletes (63 % female, 62 % with under 1 year of experience) completed a weekly health questionnaire for 12 weeks. Injuries: 14.4 per 1,000 training hours, 73 % overuse, knee 22 %. A previous time-loss injury was associated with more new problems (rate ratio 2.60; 95 % CI 1.00–6.75), but this is uncertain. Training load was not measured objectively.',
   'de', '89 HYROX-Athleten (63 % Frauen, 62 % mit weniger als 1 Jahr Erfahrung) füllten 12 Wochen lang wöchentlich einen Gesundheitsfragebogen aus. Verletzungen: 14,4 pro 1.000 Trainingsstunden, 73 % Überlastung, Knie 22 %. Eine frühere Verletzung mit Ausfall hing mit mehr neuen Beschwerden zusammen (Rate Ratio 2,60; 95 %-KI 1,00–6,75), was aber unsicher ist. Die Belastung wurde nicht objektiv gemessen.'),
  null),

 ('hyscience-2026',
  'Gutiérrez-Hellín et al. (2026): relative running intensity and pacing during an official HYROX PRO MEN competition (HYScience)', 'hyrox',
  'Gutiérrez-Hellín J, Alonso-Domínguez S, Gil-Cabrera J, et al. Int J Sports Physiol Perform (online 2026)',
  'https://doi.org/10.1123/ijspp.2026-0098',
  '24 PRO men (finish time 69:58 ± 5:05) completed a lab test within 10 days before an official HYROX race. They ran run 1 at 16.13 km/h and run 8 at 13.58 km/h (about 42 s/km slower). Across all runs and the Roxzone they averaged 84 % of their speed at the second ventilatory threshold (VT2). Men only, one race.',
  'C', 'active', '2026-11-03', array['pace.compromisedRatioSolo'],
  jsonb_build_object(
   'nl', '24 PRO-mannen (eindtijd 69:58 ± 5:05) deden een labtest binnen 10 dagen voor een officiële HYROX-race. Ze liepen run 1 op 16,13 km/u en run 8 op 13,58 km/u (ongeveer 42 s/km trager). Over alle runs en de Roxzone samen liepen ze gemiddeld op 84 % van hun snelheid op de tweede ventilatoire drempel (VT2). Alleen mannen, één race.',
   'en', '24 PRO men (finish time 69:58 ± 5:05) completed a lab test within 10 days before an official HYROX race. They ran run 1 at 16.13 km/h and run 8 at 13.58 km/h (about 42 s/km slower). Across all runs and the Roxzone they averaged 84 % of their speed at the second ventilatory threshold (VT2). Men only, one race.',
   'de', '24 PRO-Männer (Endzeit 69:58 ± 5:05) absolvierten innerhalb von 10 Tagen vor einem offiziellen HYROX-Rennen einen Labortest. Lauf 1 liefen sie mit 16,13 km/h, Lauf 8 mit 13,58 km/h (etwa 42 s/km langsamer). Über alle Läufe und die Roxzone liefen sie im Schnitt mit 84 % ihrer Geschwindigkeit an der zweiten ventilatorischen Schwelle (VT2). Nur Männer, ein Rennen.'),
  jsonb_build_object('nl', 'PRO-mannen; VT2 uit een labtest is verwant aan, maar niet gelijk aan de drempel uit de 30-minutentest', 'en', 'PRO men; VT2 from a lab test is related to, but not the same as, the threshold from the 30-minute test', 'de', 'PRO-Männer; VT2 aus einem Labortest ist verwandt mit, aber nicht gleich der Schwelle aus dem 30-Minuten-Test')),

 ('yustres-amores-2026',
  'Yustres Amores et al. (2026): performance architecture and competitive phenotypes in HYROX – large-scale analysis of official results', 'hyrox',
  'Yustres Amores I, Gutiérrez-Hellín J, Alonso-Domínguez S, et al. Applied Sciences 16(21):10832',
  'https://doi.org/10.3390/app162110832',
  'Analysis of 11,592 PRO men (one race per athlete, 143 events, 2018–2025). Stations explained 50.3 % of the differences in finish time between athletes, running and Roxzone together 49.7 %. The largest single parts: wall balls 11.9 %, sled pull 11.3 % and Roxzone 10.5 %; SkiErg (1.3 %) and rowing (2.0 %) explained little. Descriptive; physiology and training were not measured.',
  'C', 'active', '2026-11-06', array['prediction.starFactor'],
  jsonb_build_object(
   'nl', 'Analyse van 11.592 PRO-mannen (één race per atleet, 143 events, 2018–2025). Stations verklaarden 50,3 % van de verschillen in eindtijd tussen atleten, lopen en Roxzone samen 49,7 %. De grootste losse onderdelen: wall balls 11,9 %, sled pull 11,3 % en Roxzone 10,5 %; SkiErg (1,3 %) en roeien (2,0 %) verklaarden weinig. Beschrijvend; geen fysiologie of training gemeten.',
   'en', 'Analysis of 11,592 PRO men (one race per athlete, 143 events, 2018–2025). Stations explained 50.3 % of the differences in finish time between athletes, running and Roxzone together 49.7 %. The largest single parts: wall balls 11.9 %, sled pull 11.3 % and Roxzone 10.5 %; SkiErg (1.3 %) and rowing (2.0 %) explained little. Descriptive; physiology and training were not measured.',
   'de', 'Analyse von 11.592 PRO-Männern (ein Rennen pro Athlet, 143 Events, 2018–2025). Die Stationen erklärten 50,3 % der Unterschiede in der Endzeit zwischen Athleten, Laufen und Roxzone zusammen 49,7 %. Die größten Einzelteile: Wall Balls 11,9 %, Sled Pull 11,3 % und Roxzone 10,5 %; SkiErg (1,3 %) und Rudern (2,0 %) erklärten wenig. Beschreibend; Physiologie und Training wurden nicht gemessen.'),
  jsonb_build_object('nl', 'PRO-mannen, beschrijvend, geen trainingsadvies', 'en', 'PRO men, descriptive, no training advice', 'de', 'PRO-Männer, beschreibend, keine Trainingsempfehlung')),

 ('held-2026',
  'Held et al. (2026): maximizing adaptations in concurrent training – umbrella review of meta-analyses', 'strength',
  'Held S, Wolf L, Rappelt L, Bloch W, Donath L, Micke F, Geisler S, Isenmann E. Sports Med (2026)',
  'https://doi.org/10.1007/s40279-026-02401-y',
  'Umbrella review of 17 meta-analyses (144 studies, 1,492 healthy participants). Adding endurance training to strength training barely reduced maximal strength, power or muscle growth (trivial effects). Adding strength to endurance training clearly increased strength without losing aerobic gains. Strength before endurance in the same session showed a trend towards more strength; same or separate days made little difference on average. Little data in highly trained athletes.',
  'A', 'active', '2026-11-10', array[]::text[],
  jsonb_build_object(
   'nl', 'Umbrella review van 17 meta-analyses (144 studies, 1.492 gezonde deelnemers). Duurtraining naast krachttraining remde maximale kracht, power en spiergroei nauwelijks (triviale effecten). Kracht naast duur gaf duidelijk meer kracht, zonder verlies van aerobe winst. Kracht vóór duur in dezelfde sessie gaf een trend naar meer kracht; zelfde of andere dag maakte gemiddeld weinig uit. Weinig data bij hoog getrainde atleten.',
   'en', 'Umbrella review of 17 meta-analyses (144 studies, 1,492 healthy participants). Adding endurance training to strength training barely reduced maximal strength, power or muscle growth (trivial effects). Adding strength to endurance training clearly increased strength without losing aerobic gains. Strength before endurance in the same session showed a trend towards more strength; same or separate days made little difference on average. Little data in highly trained athletes.',
   'de', 'Umbrella-Review von 17 Metaanalysen (144 Studien, 1.492 gesunde Teilnehmende). Ausdauertraining zusätzlich zum Krafttraining minderte Maximalkraft, Power und Muskelwachstum kaum (triviale Effekte). Krafttraining zusätzlich zum Ausdauertraining brachte deutlich mehr Kraft ohne Verlust des aeroben Zuwachses. Kraft vor Ausdauer in derselben Einheit zeigte einen Trend zu mehr Kraft; gleicher oder anderer Tag machte im Schnitt wenig Unterschied. Wenig Daten bei hoch trainierten Athleten.'),
  null),

 ('sprague-2018',
  'Sprague et al. (2018): modifiable risk factors for patellar tendinopathy in athletes – systematic review and meta-analysis', 'injury',
  'Sprague AL, Smith AH, Knox P, Pohlig RT, Grävare Silbernagel K. Br J Sports Med 52(24):1575–1585',
  'https://doi.org/10.1136/bjsports-2017-099000',
  'Systematic review of 31 studies (6 prospective) on modifiable risk factors for patellar tendinopathy in athletes. No strong evidence for any single factor. Higher activity volume (d = 0.22) and higher body weight (d = 0.36) were associated with symptoms; evidence for jump volume was limited or conflicting.',
  'A', 'active', '2026-11-03', array['coaching.achillesStiffnessCeiling'],
  jsonb_build_object(
   'nl', 'Systematische review van 31 studies (6 prospectief) naar beïnvloedbare risicofactoren voor patellapeesklachten bij sporters. Geen sterk bewijs voor één factor. Meer activiteitsvolume (d = 0,22) en een hoger lichaamsgewicht (d = 0,36) hingen samen met klachten; voor springvolume was het bewijs beperkt of tegenstrijdig.',
   'en', 'Systematic review of 31 studies (6 prospective) on modifiable risk factors for patellar tendinopathy in athletes. No strong evidence for any single factor. Higher activity volume (d = 0.22) and higher body weight (d = 0.36) were associated with symptoms; evidence for jump volume was limited or conflicting.',
   'de', 'Systematische Übersicht von 31 Studien (6 prospektiv) zu beeinflussbaren Risikofaktoren für Patellasehnenbeschwerden bei Sportlern. Kein starker Beleg für einen einzelnen Faktor. Höheres Aktivitätsvolumen (d = 0,22) und höheres Körpergewicht (d = 0,36) hingen mit Beschwerden zusammen; für das Sprungvolumen war die Evidenz begrenzt oder widersprüchlich.'),
  jsonb_build_object('nl', 'zwak bewijs', 'en', 'weak evidence', 'de', 'schwache Evidenz')),

 ('magnusson-2010',
  'Magnusson et al. (2010): the pathogenesis of tendinopathy – balancing the response to loading', 'injury',
  'Magnusson SP, Langberg H, Kjaer M. Nat Rev Rheumatol 6(5):262–268',
  'https://doi.org/10.1038/nrrheum.2010.43',
  'Review of how tendons respond to loading. After exercise, collagen synthesis in the tendon rises, peaks around 24 hours and stays elevated for about 3 days. Breakdown also rises but peaks earlier. This describes the mechanism, not how many days are needed between heavy impact sessions.',
  'D', 'active', '2026-11-10', array['coaching.achillesStiffnessCeiling'],
  jsonb_build_object(
   'nl', 'Review over hoe pezen reageren op belasting. Na een training stijgt de aanmaak van collageen in de pees; die piekt rond 24 uur en blijft ongeveer 3 dagen verhoogd. De afbraak stijgt ook, maar piekt eerder. Dit beschrijft het mechanisme, niet hoeveel rustdagen tussen zware impactsessies nodig zijn.',
   'en', 'Review of how tendons respond to loading. After exercise, collagen synthesis in the tendon rises, peaks around 24 hours and stays elevated for about 3 days. Breakdown also rises but peaks earlier. This describes the mechanism, not how many days are needed between heavy impact sessions.',
   'de', 'Übersicht, wie Sehnen auf Belastung reagieren. Nach dem Training steigt die Kollagensynthese in der Sehne, erreicht nach etwa 24 Stunden ihren Höhepunkt und bleibt etwa 3 Tage erhöht. Der Abbau steigt ebenfalls, erreicht seinen Höhepunkt aber früher. Das beschreibt den Mechanismus, nicht wie viele Tage zwischen harten Impact-Einheiten nötig sind.'),
  jsonb_build_object('nl', 'mechanistisch', 'en', 'mechanistic', 'de', 'mechanistisch')),

 ('bohm-2015',
  'Bohm et al. (2015): human tendon adaptation in response to mechanical loading – systematic review and meta-analysis', 'injury',
  'Bohm S, Mersmann F, Arampatzis A. Sports Med Open 1(1)',
  'https://doi.org/10.1186/s40798-015-0009-9',
  'Meta-analysis of 27 studies (37 training programmes of at least 8 weeks, 264 healthy adults) on the Achilles or patellar tendon. Training made the tendon stiffer (SMD 0.70) and slightly thicker (SMD 0.24). Loading intensity determined the gain; contraction type did not.',
  'A', 'active', '2026-11-10', array['coaching.achillesStiffnessCeiling'],
  jsonb_build_object(
   'nl', 'Meta-analyse van 27 studies (37 trainingsprogramma''s van minstens 8 weken, 264 gezonde volwassenen) op de achilles- of patellapees. Training maakte de pees stijver (SMD 0,70) en iets dikker (SMD 0,24). Hoe zwaar de belasting was, bepaalde de winst; het type spiercontractie niet.',
   'en', 'Meta-analysis of 27 studies (37 training programmes of at least 8 weeks, 264 healthy adults) on the Achilles or patellar tendon. Training made the tendon stiffer (SMD 0.70) and slightly thicker (SMD 0.24). Loading intensity determined the gain; contraction type did not.',
   'de', 'Metaanalyse von 27 Studien (37 Trainingsprogramme von mindestens 8 Wochen, 264 gesunde Erwachsene) an der Achilles- oder Patellasehne. Training machte die Sehne steifer (SMD 0,70) und etwas dicker (SMD 0,24). Die Belastungsintensität bestimmte den Zuwachs, die Art der Muskelkontraktion nicht.'),
  null),

 ('hyrox-rulebook-2627',
  'HYROX (2026): Rulebook Singles, season 26/27', 'rules',
  'HYROX. Rulebook Singles 26/27 (EN, final)',
  'https://hyroxbenelux.com/wp-content/uploads/2026/06/26_27_HYROX_RulebookSingles_EN_FINAL.pdf',
  'Official HYROX rulebook for season 26/27: distances, weights per division and movement standards.',
  'D', 'active', '2026-10-27', array['coaching.sledShiftM'],
  jsonb_build_object(
   'nl', 'Officieel reglement van HYROX voor seizoen 26/27: afstanden, gewichten per divisie en bewegingsstandaarden.',
   'en', 'Official HYROX rulebook for season 26/27: distances, weights per division and movement standards.',
   'de', 'Offizielles HYROX-Regelwerk für die Saison 26/27: Distanzen, Gewichte pro Division und Bewegungsstandards.'),
  jsonb_build_object('nl', 'reglement, geen studie', 'en', 'rulebook, not a study', 'de', 'Regelwerk, keine Studie')),

 -- already cited on /science but not yet in this table: needed for the maxWeeklyVolumeIncrease link (2.4)
 ('nielsen-2014',
  'Nielsen et al. (2014): excessive progression in weekly running distance and risk of running-related injuries', 'load',
  'Nielsen RO et al. J Orthop Sports Phys Ther 44(10):739–747',
  'https://doi.org/10.2519/jospt.2014.5164',
  null,
  'C', 'active', '2026-11-12', array['coaching.maxWeeklyVolumeIncrease', 'volume.rampShare'], null, null),
 ('gabbett-2016',
  'Gabbett (2016): the training–injury prevention paradox', 'load',
  'Gabbett TJ. Br J Sports Med 50(5):273–280',
  'https://doi.org/10.1136/bjsports-2015-095788',
  null,
  'D', 'active', '2026-11-12', array['coaching.maxWeeklyVolumeIncrease', 'volume.rampShare'], null, null)
on conflict (slug) where slug is not null do nothing;

-- 3. archive (never delete). Stöggl & Sperlich and Wilson were only cited on the page; they enter the table archived.
insert into public.knowledge_sources (slug, title, category, author, source_url, summary, level, status, archived_at, archived_reason, replaced_by, rule_keys)
values
 ('stoggl-sperlich-2014',
  'Stöggl & Sperlich (2014): polarized training has greater impact on key endurance variables', 'intensity',
  'Stöggl T, Sperlich B. Front Physiol 5:33', 'https://doi.org/10.3389/fphys.2014.00033',
  null,
  'B', 'archived', '2026-11-12',
  'Eén trial; overlapt door twee recentere meta-analyses (Rosenblat 2025, Oliveira 2024) die geen tijdritvoordeel van gepolariseerd trainen vinden.',
  (select id from public.knowledge_sources where slug = 'rosenblat-2025'), array[]::text[]),
 ('wilson-2012',
  'Wilson et al. (2012): concurrent training – meta-analysis of interference of aerobic and resistance exercise', 'strength',
  'Wilson JM et al. J Strength Cond Res 26(8):2293–2307', 'https://doi.org/10.1519/JSC.0b013e31823a3e2d',
  null,
  'A', 'archived', '2026-11-12',
  'Overlapt door recentere en grotere analyses (Held 2026, Schumann 2022); de samenvatting noemt geen hersteluren.',
  (select id from public.knowledge_sources where slug = 'held-2026'), array[]::text[])
on conflict (slug) where slug is not null do nothing;

update public.knowledge_sources
set status = 'archived', archived_at = '2026-11-12', rule_keys = '{}',
    archived_reason = 'Secundaire bron zonder seizoen; vervangen door het officiële HYROX-rulebook 26/27.',
    replaced_by = (select id from public.knowledge_sources where slug = 'hyrox-rulebook-2627')
where title like 'HYROX weights per division%' and status = 'active';

-- 4. Brandt et al. (2025) did not study weekly volume increase: link it to the sim / compromised rules instead
update public.knowledge_sources set rule_keys = array['sim.kmPeakFull', 'compromised.addonPhases']
where slug = 'brandt-2025' and 'coaching.maxWeeklyVolumeIncrease' = any(rule_keys);
