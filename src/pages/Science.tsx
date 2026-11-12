import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ExternalLink, Archive } from 'lucide-react';
import type { Lang } from '../engine';
import { useI18n } from '../lib/i18n';
import { usePlanUpdates } from '../data/hooks';
import { useSources, sourceAnchor, SourceLink, type SourceRow } from '../components/PlanUpdates';
import { fmtDay, loc, pt, ruleLabel } from '../lib/planupdates';
import { DISCLAIMER } from '../components/Disclaimer';

type Ref = { cite: string; url: string };
type Group = { id: string; refs: Ref[] };

/** Public literature the engine is built on. Citations verified against Crossref (Oct 2026). */
const GROUPS: Group[] = [
  {
    id: 'zones',
    refs: [
      { cite: 'Friel J (2012, updated 2026). Joe Friel’s Quick Guide to Setting Zones. TrainingPeaks.', url: 'https://www.trainingpeaks.com/learn/articles/joe-friel-s-quick-guide-to-setting-zones/' },
      { cite: 'Seiler S (2010). What is best practice for training intensity and duration distribution in endurance athletes? Int J Sports Physiol Perform 5(3):276–291.', url: 'https://doi.org/10.1123/ijspp.5.3.276' },
      { cite: 'Rosenblat MA et al. (2025). Which training intensity distribution intervention will produce the greatest improvements in maximal oxygen uptake and time-trial performance in endurance athletes? A systematic review and network meta-analysis of individual participant data. Sports Med 55(3):655–673.', url: 'https://doi.org/10.1007/s40279-024-02149-3' },
      { cite: 'Oliveira et al. (2024). Comparison of polarized versus other types of endurance training intensity distribution on athletes’ endurance performance: a systematic review with meta-analysis. Sports Med 54(8):2071–2095.', url: 'https://doi.org/10.1007/s40279-024-02034-z' },
      { cite: 'Daniels J (2022). Daniels’ Running Formula, 4th ed. Human Kinetics.', url: 'https://us.humankinetics.com/products/daniels-running-formula-4th-edition' },
    ],
  },
  {
    id: 'hyrox',
    refs: [
      { cite: 'Brandt T, Ebel C, Lebahn C, Schmidt A (2025). Acute physiological responses and performance determinants in Hyrox© – a new running-focused high intensity functional fitness trend. Front Physiol 16:1519240.', url: 'https://doi.org/10.3389/fphys.2025.1519240' },
      { cite: 'Rappelt L, Wiedenmann T, Held S, Heinke L, Micke F, Wicker P, Donath L (2026). Longitudinal performance development in PRO and ELITE HYROX competitions across the first seven competitive seasons. Front Physiol 17:1847569.', url: 'https://doi.org/10.3389/fphys.2026.1847569' },
      { cite: 'Gutiérrez-Hellín J et al. (2026). Performance trends and pacing evolution in elite HYROX©: a seven-season analysis of top 50 PRO men (2018–2024). Applied Sciences 16(13):6674.', url: 'https://doi.org/10.3390/app16136674' },
      { cite: 'Gutiérrez-Hellín J, Alonso-Domínguez S, Gil-Cabrera J, et al. (2026). Relative running intensity and pacing during an official HYROX PRO MEN competition: the HYScience study. Int J Sports Physiol Perform.', url: 'https://doi.org/10.1123/ijspp.2026-0098' },
      { cite: 'Yustres Amores I et al. (2026). Performance architecture and competitive phenotypes in HYROX: a large-scale analysis of official race performances. Applied Sciences 16(21):10832.', url: 'https://doi.org/10.3390/app162110832' },
      { cite: 'HYROX (2026). HYROX Rulebook Singles, season 26/27 (official rules: distances, weights per division, movement standards).', url: 'https://hyroxbenelux.com/wp-content/uploads/2026/06/26_27_HYROX_RulebookSingles_EN_FINAL.pdf' },
      { cite: 'WOD-Science (Gommaar D’Hulst) — HYROX-specific training principles (YouTube).', url: 'https://www.youtube.com/@wod-science' },
    ],
  },
  {
    id: 'load',
    refs: [
      { cite: 'Gabbett TJ (2016). The training–injury prevention paradox: should athletes be training smarter and harder? Br J Sports Med 50(5):273–280.', url: 'https://doi.org/10.1136/bjsports-2015-095788' },
      { cite: 'Nielsen RO et al. (2014). Excessive progression in weekly running distance and risk of running-related injuries. J Orthop Sports Phys Ther 44(10):739–747.', url: 'https://doi.org/10.2519/jospt.2014.5164' },
      { cite: 'Foster C (1998). Monitoring training in athletes with reference to overtraining syndrome. Med Sci Sports Exerc 30(7):1164–1168.', url: 'https://doi.org/10.1097/00005768-199807000-00023' },
      { cite: 'Sprague AL, Smith AH, Knox P, Pohlig RT, Grävare Silbernagel K (2018). Modifiable risk factors for patellar tendinopathy in athletes: a systematic review and meta-analysis. Br J Sports Med 52(24):1575–1585.', url: 'https://doi.org/10.1136/bjsports-2017-099000' },
      { cite: 'Magnusson SP, Langberg H, Kjaer M (2010). The pathogenesis of tendinopathy: balancing the response to loading. Nat Rev Rheumatol 6(5):262–268.', url: 'https://doi.org/10.1038/nrrheum.2010.43' },
      { cite: 'Chittenden E, Bell A, Forbes G, Tooth P, Porter R, Van Der Vliet R, Shouman K, Williams S (2026). Prevalence, burden and risk markers of health problems in HYROX athletes: a 12-week prospective cohort study. Front Sports Act Living 8:1937574.', url: 'https://doi.org/10.3389/fspor.2026.1937574' },
    ],
  },
  {
    id: 'frequency',
    refs: [
      { cite: 'Montero D, Lundby C (2017). Refuting the myth of non-response to exercise training: ‘non-responders’ do respond to higher dose of training. J Physiol 595(11):3377–3387.', url: 'https://doi.org/10.1113/JP273480' },
      { cite: 'Lenk M, Matzka M, Lauber L, Kunz P, Sperlich B (2025). HIIT once, twice or three times per week in recreational runners. Physiol Rep 13(18):e70573.', url: 'https://doi.org/10.14814/phy2.70573' },
      { cite: 'Wenger HA, Bell GJ (1986). The interactions of intensity, frequency and duration of exercise training in altering cardiorespiratory fitness. Sports Med 3(5):346–356.', url: 'https://doi.org/10.2165/00007256-198603050-00004' },
      { cite: 'Pollock ML et al. (1998). ACSM position stand: the recommended quantity and quality of exercise. Med Sci Sports Exerc 30(6):975–991.', url: 'https://doi.org/10.1097/00005768-199806000-00032' },
      { cite: 'Tripp TR et al. (2025). Low-frequency training is not inferior to high-frequency training matched for intensity and volume. Scand J Med Sci Sports 35(2):e70024.', url: 'https://doi.org/10.1111/sms.70024' },
      { cite: 'Grgic J et al. (2018). Effect of resistance training frequency on gains in muscular strength. Sports Med 48(5):1207–1220.', url: 'https://doi.org/10.1007/s40279-018-0872-x' },
      { cite: 'Hatle H et al. (2014). Effect of 24 sessions of HIIT compressed into 3 weeks vs spread over 8 weeks. PLoS One 9(2):e88375.', url: 'https://doi.org/10.1371/journal.pone.0088375' },
    ],
  },
  {
    id: 'taper',
    refs: [
      { cite: 'Bosquet L, Montpetit J, Arvisais D, Mujika I (2007). Effects of tapering on performance: a meta-analysis. Med Sci Sports Exerc 39(8):1358–1365.', url: 'https://doi.org/10.1249/mss.0b013e31806010e0' },
      { cite: 'Mujika I, Padilla S (2003). Scientific bases for precompetition tapering strategies. Med Sci Sports Exerc 35(7):1182–1187.', url: 'https://doi.org/10.1249/01.MSS.0000074448.73931.11' },
      { cite: 'Wang Z, Wang YT, Gao W, Zhong Y (2023). Effects of tapering on performance in endurance athletes: a systematic review and meta-analysis. PLoS One 18(5):e0282838.', url: 'https://doi.org/10.1371/journal.pone.0282838' },
      { cite: 'Vachon A et al. (2021). Effects of tapering on neuromuscular and metabolic fitness in team sports: a systematic review and meta-analysis. Eur J Sport Sci 21(3):300–311.', url: 'https://doi.org/10.1080/17461391.2020.1736183' },
      { cite: 'Travis SK, Mujika I, Gentles JA, Stone MH, Bazyler CD (2020). Tapering and peaking maximal strength for powerlifting performance: a review. Sports 8(9):125.', url: 'https://doi.org/10.3390/sports8090125' },
      { cite: 'Harrison PW et al. (2019). Resistance priming to enhance neuromuscular performance in sport. Sports Med 49(10):1499–1514.', url: 'https://doi.org/10.1007/s40279-019-01136-3' },
      { cite: 'Thomas DT, Erdman KA, Burke LM (2016). Nutrition and athletic performance (joint position statement). J Acad Nutr Diet 116(3):501–528.', url: 'https://doi.org/10.1016/j.jand.2015.12.006' },
    ],
  },
  {
    id: 'strength',
    refs: [
      { cite: 'Held S, Wolf L, Rappelt L, Bloch W, Donath L, Micke F, Geisler S, Isenmann E (2026). Maximizing adaptations in concurrent training: an umbrella review of meta-analyses. Sports Med.', url: 'https://doi.org/10.1007/s40279-026-02401-y' },
      { cite: 'Zanini M, Folland JP, Wu H, Blagrove RC (2025). Strength training improves running economy durability and fatigued high-intensity performance in well-trained male runners: a randomized control trial. Med Sci Sports Exerc 57(7):1546–1558.', url: 'https://doi.org/10.1249/MSS.0000000000003685' },
      { cite: 'Blagrove RC, Howatson G, Hayes PR (2018). Effects of strength training on the physiological determinants of middle- and long-distance running performance: a systematic review. Sports Med 48:1117–1149.', url: 'https://doi.org/10.1007/s40279-017-0835-7' },
      { cite: 'Denadai BS et al. (2017). Explosive training and heavy weight training are effective for improving running economy in endurance athletes: a systematic review and meta-analysis. Sports Med 47:545–554.', url: 'https://doi.org/10.1007/s40279-016-0604-z' },
      { cite: 'Schumann M et al. (2022). Compatibility of concurrent aerobic and strength training for skeletal muscle size and function: an updated systematic review and meta-analysis. Sports Med 52:601–612.', url: 'https://doi.org/10.1007/s40279-021-01587-7' },
      { cite: 'Spiering BA et al. (2021). Maintaining physical performance: the minimal dose of exercise needed to preserve endurance and strength over time. J Strength Cond Res 35:1449–1458.', url: 'https://doi.org/10.1519/JSC.0000000000003964' },
      { cite: 'Lauersen JB, Bertelsen DM, Andersen LB (2014). The effectiveness of exercise interventions to prevent sports injuries: a systematic review and meta-analysis of randomised controlled trials. Br J Sports Med 48:871–877.', url: 'https://doi.org/10.1136/bjsports-2013-092538' },
    ],
  },
  {
    id: 'injury',
    refs: [
      { cite: 'Alfredson H et al. (1998). Heavy-load eccentric calf muscle training for the treatment of chronic Achilles tendinosis. Am J Sports Med 26(3):360–366.', url: 'https://doi.org/10.1177/03635465980260030301' },
      { cite: 'Beyer R et al. (2015). Heavy slow resistance versus eccentric training as treatment for Achilles tendinopathy: a randomized controlled trial. Am J Sports Med 43(7):1704–1711.', url: 'https://doi.org/10.1177/0363546515584760' },
      { cite: 'Bohm S, Mersmann F, Arampatzis A (2015). Human tendon adaptation in response to mechanical loading: a systematic review and meta-analysis of exercise intervention studies on healthy adults. Sports Med Open 1(1).', url: 'https://doi.org/10.1186/s40798-015-0009-9' },
      { cite: 'Silbernagel KG et al. (2007). Continued sports activity, using a pain-monitoring model, during rehabilitation in patients with Achilles tendinopathy. Am J Sports Med 35(6):897–906.', url: 'https://doi.org/10.1177/0363546506298279' },
      { cite: 'van der Horst N et al. (2015). The preventive effect of the Nordic hamstring exercise on hamstring injuries in amateur soccer players. Am J Sports Med 43(6):1316–1323.', url: 'https://doi.org/10.1177/0363546515574057' },
      { cite: 'Harøy J et al. (2019). The Adductor Strengthening Programme prevents groin problems among male football players. Br J Sports Med 53(3):150–157.', url: 'https://doi.org/10.1136/bjsports-2017-098937' },
      { cite: 'Green B et al. (2020). Calf muscle strain injuries in elite Australian football players: a descriptive epidemiological evaluation. Am J Sports Med 48:3306–3315.', url: 'https://doi.org/10.1177/0363546520959327' },
      { cite: 'Hébert-Losier K et al. (2017). Updated reliability and normative values for the standing heel-rise test in healthy adults. Physiotherapy 103:446–452.', url: 'https://doi.org/10.1016/j.physio.2017.03.002' },
      { cite: 'Mujika I, Padilla S (2000). Detraining: loss of training-induced physiological and performance adaptations. Part II. Sports Med 30:145–154.', url: 'https://doi.org/10.2165/00007256-200030030-00001' },
      { cite: 'Eyestone ED et al. (1993). Effect of water running and cycling on maximum oxygen consumption and 2-mile run performance. Am J Sports Med 21:41–44.', url: 'https://doi.org/10.1177/036354659302100107' },
      { cite: 'Wilber RL et al. (1996). Influence of water run training on the maintenance of aerobic performance. Med Sci Sports Exerc 28:1056–1062.', url: 'https://doi.org/10.1097/00005768-199608000-00017' },
    ],
  },
  {
    id: 'recovery',
    refs: [
      { cite: 'Walsh NP et al. (2021). Sleep and the athlete: narrative review and 2021 expert consensus recommendations. Br J Sports Med.', url: 'https://doi.org/10.1136/bjsports-2020-102025' },
      { cite: 'Scoon GS et al. (2007). Effect of post-exercise sauna bathing on the endurance performance of competitive male runners. J Sci Med Sport 10(4):259–262.', url: 'https://doi.org/10.1016/j.jsams.2006.06.009' },
      { cite: 'Kirby NV et al. (2021). Sex differences in adaptation to intermittent post-exercise sauna bathing in trained middle-distance runners. Sports Med Open 7:51.', url: 'https://doi.org/10.1186/s40798-021-00342-6' },
      { cite: 'Ahokas EK et al. (2025). Post-exercise infrared sauna and strength-training adaptations. Front Sports Act Living 7:1462901.', url: 'https://doi.org/10.3389/fspor.2025.1462901' },
      { cite: 'Roberts LA et al. (2015). Post-exercise cold water immersion attenuates acute anabolic signalling and long-term adaptations in muscle to strength training. J Physiol 593(18):4285–4301.', url: 'https://doi.org/10.1113/JP270570' },
      { cite: 'Malta ES et al. (2021). The effects of regular cold-water immersion use on training-induced changes in strength and endurance performance: a systematic review with meta-analysis. Sports Med 51(1):161–174.', url: 'https://doi.org/10.1007/s40279-020-01362-0' },
      { cite: 'Machado AF et al. (2016). Can water temperature and immersion time influence the effect of cold water immersion on muscle soreness? A systematic review and meta-analysis. Sports Med 46(4):503–514.', url: 'https://doi.org/10.1007/s40279-015-0431-7' },
      { cite: 'Zurawlew MJ et al. (2016). Post-exercise hot water immersion induces heat acclimation and improves endurance exercise performance in the heat. Scand J Med Sci Sports 26(7):745–754.', url: 'https://doi.org/10.1111/sms.12638' },
      { cite: 'Wiewelhove T et al. (2019). A meta-analysis of the effects of foam rolling on performance and recovery. Front Physiol 10:376.', url: 'https://doi.org/10.3389/fphys.2019.00376' },
    ],
  },
];

type G = 'zones' | 'hyrox' | 'load' | 'frequency' | 'taper' | 'strength' | 'injury' | 'recovery';
const TXT: Record<Lang, { title: string; intro: string; groups: Record<G, [string, string]>; note: string }> = {
  en: {
    title: 'The science behind Benchmrk',
    intro: 'Benchmrk translates public sports-science literature into concrete training rules. Below: what we use, and where it shows up in your plan.',
    groups: {
      zones: ['Intensity, zones & paces', 'Heart-rate zones as % of your own threshold HR (Friel), mostly easy with a smaller share of hard work (80/20, Seiler); whether that hard part is polarized or pyramidal makes little difference to performance (Rosenblat; Oliveira). Threshold pace estimated from a 5 km time (Daniels).'],
      hyrox: ['HYROX-specific', 'Finish time = runs + stations + Roxzone; aerobic capacity and running volume matter most. In recreational athletes running is about 60 % of race time (Brandt), at the PRO top about 50 % (Rappelt; Gutiérrez-Hellín). After the stations athletes run slower: at the PRO top, run 8 was about 42 s/km slower than run 1 (HYScience), and runs 2–8 were 27–55 s slower than run 1 (Gutiérrez-Hellín). Official station weights per division (HYROX rulebook 26/27); HYROX-specific (not generic CrossFit) training. Sims / compromised runs apply the specificity principle: running straight after station work is what HYROX demands. Direct studies on sims are scarce — this part rests mainly on coaching practice (WOD-Science). Fewer weekly sessions lower the expected improvement in the forecast.'],
      load: ['Load, fatigue & injury risk', 'Gradual weekly volume increase, deload weeks, RPE-based fatigue checks and the 80/20 check in the session analysis. Tendon protection turns impact days into low-impact days. That is a choice Benchmrk makes: the evidence is partial (more activity volume is associated with tendon complaints, Sprague; the tendon is still adapting in the days after loading, Magnusson).'],
      frequency: ['Training days per week', 'The forecast expects less improvement with fewer sessions (sessions keep their length): aerobic 4+ days 100 % · 3 days 85 % · 2 days 70 % (60 % if already fit) · 1 day 25 %; station strength 100 / 86 / 76 / 69 %. Derived from responder rates (Montero & Lundby), VO2max changes (Lenk; Wenger & Bell), the ACSM position stand and strength effect sizes (Grgic). The 1-day value is the least studied. With equal weekly volume, frequency matters much less (Tripp; Grgic).'],
      taper: ['Taper & race week', '2-week progressive taper: about 65 % and then 40 % of normal volume, same intensity and number of sessions (Bosquet; Mujika & Padilla; Wang). Last heavy strength 7–10 days out (Travis), last big sim 10–14 days out, short strides as priming the day before (Harrison, low certainty). Carbohydrate 7–10 g/kg in the last day(s), breakfast 1–4 g/kg 1–4 h before, 30–60 g/h if the race takes > 75 min (Thomas). There is no HYROX-specific taper study yet: these rules are extrapolated from endurance, strength and mixed-sport research.'],
      strength: ['Strength alongside endurance', 'Strength 2×/week improves running economy by 2–8 % (Blagrove; Denadai), keeps it better when you are tired (Zanini) and cuts sports injuries by about two thirds in trials (Lauersen); 1 heavy session/week maintains it (Spiering). Interference is small (Held; Schumann), mainly for explosive strength in the same session – keep ≥ 3 h apart (Schumann). No strength day in your week? The plan tells you on your WOD day.'],
      injury: ['Injury, rehab & return to running', 'Prehab: heavy slow calf work for the Achilles (Beyer); heavy loading also makes healthy tendons stronger (Bohm). Nordic curls for hamstrings, Copenhagen plank for groin. A current running injury switches the plan to injury mode: runs become bike/rower/SkiErg at the same heart-rate zones, which keeps fitness for weeks (Mujika & Padilla; Eyestone; Wilber), plus calf rehab (isometric → heavy slow → plyo) under a pain rule of ≤ 5/10, settled by next morning (Silbernagel). Return test: 20–25 single-leg calf raises and 10 hops pain-free (Hébert-Losier), then 3 weeks walk-run before threshold work. A running calf strain typically takes 3–5 weeks (Green). Return criteria and walk-run steps are expert consensus, not trial data.'],
      recovery: ['Recovery: sleep, sauna, cold & heat', 'Sleep comes first (Walsh). Sauna right after an easy session, up to 3×/week, may add ~2 % endurance (small studies: Scoon; Kirby) and does not hurt strength gains (Ahokas). A cold bath right after strength or station work blunts strength gains (Roberts; Malta) – Benchmrk only suggests it after runs, in race/taper weeks, at 11–15 °C for 11–15 min, with a small effect on soreness (Machado). A hot tub only helps as heat preparation for a race in the heat (Zurawlew). Foam rolling works best as a warm-up (Wiewelhove).'],
    },
    note: 'Rules are simplifications of these studies for recreational HYROX athletes. Findings from small or sport-specific groups (e.g. football players) are applied cautiously.',
  },
  nl: {
    title: 'De wetenschap achter Benchmrk',
    intro: 'Benchmrk vertaalt publieke sportwetenschappelijke literatuur naar concrete trainingsregels. Hieronder: wat we gebruiken en waar je het terugziet in je plan.',
    groups: {
      zones: ['Intensiteit, zones & tempo’s', 'Hartslagzones als % van je eigen drempelhartslag (Friel), vooral rustig met een kleiner deel zwaar werk (80/20, Seiler); of dat zware deel gepolariseerd of piramidaal is, maakt voor de prestatie weinig uit (Rosenblat; Oliveira). Drempeltempo geschat uit een 5 km-tijd (Daniels).'],
      hyrox: ['HYROX-specifiek', 'Eindtijd = runs + stations + Roxzone; aerobe capaciteit en loopvolume wegen het zwaarst. Bij recreatieve atleten is lopen ongeveer 60 % van de racetijd (Brandt), bij de PRO-top ongeveer 50 % (Rappelt; Gutiérrez-Hellín). Na de stations lopen atleten trager: bij de PRO-top was run 8 ongeveer 42 s/km trager dan run 1 (HYScience), en runs 2–8 waren 27–55 s trager dan run 1 (Gutiérrez-Hellín). Officiële stationgewichten per divisie (HYROX-rulebook 26/27); HYROX-specifiek trainen (geen generieke CrossFit). Sims / compromised runs volgen het specificiteitsprincipe: hardlopen direct na stationwerk is precies wat HYROX vraagt. Direct onderzoek naar sims is schaars — dit deel rust vooral op coachingpraktijk (WOD-Science). Minder trainingen per week verlagen de verwachte verbetering in de voorspelling.'],
      load: ['Belasting, vermoeidheid & blessurerisico', 'Geleidelijke opbouw van weekvolume, deloadweken, vermoeidheidscheck op RPE en de 80/20-check in de sessie-analyse. Peesbescherming maakt impactdagen low-impact. Dat is een keuze van Benchmrk: het bewijs is gedeeltelijk (meer activiteitsvolume hangt samen met peesklachten, Sprague; de pees past zich in de dagen na belasting nog aan, Magnusson).'],
      frequency: ['Trainingsdagen per week', 'De voorspelling rekent met minder verbetering bij minder trainingen (trainingen houden hun lengte): aeroob 4+ dagen 100 % · 3 dagen 85 % · 2 dagen 70 % (60 % als je al fit bent) · 1 dag 25 %; stationkracht 100 / 86 / 76 / 69 %. Afgeleid uit responder-percentages (Montero & Lundby), VO2max-veranderingen (Lenk; Wenger & Bell), het ACSM-standpunt en kracht-effectgroottes (Grgic). De waarde voor 1 dag is het minst onderzocht. Bij gelijk weekvolume maakt frequentie veel minder uit (Tripp; Grgic).'],
      taper: ['Taper & raceweek', 'Taper van 2 weken, aflopend: ongeveer 65 % en daarna 40 % van het normale volume, zelfde intensiteit en aantal trainingen (Bosquet; Mujika & Padilla; Wang). Laatste zware kracht 7–10 dagen voor de race (Travis), laatste grote sim 10–14 dagen voor, korte versnellingen als priming de dag ervoor (Harrison, beperkt bewijs). Koolhydraten 7–10 g/kg de laatste dag(en), ontbijt 1–4 g/kg 1–4 uur vooraf, 30–60 g/uur als de race > 75 min duurt (Thomas). Er is nog geen HYROX-specifieke taperstudie: deze regels zijn afgeleid uit duur-, kracht- en gemengd-sportonderzoek.'],
      strength: ['Kracht naast duur', 'Kracht 2×/week verbetert je loopeconomie met 2–8 % (Blagrove; Denadai), houdt je loopeconomie beter op peil als je moe bent (Zanini) en verlaagt sportblessures in trials met ongeveer twee derde (Lauersen); 1 zware sessie/week houdt het op peil (Spiering). Interferentie is klein (Held; Schumann), vooral voor explosieve kracht in dezelfde sessie – houd ≥ 3 uur afstand (Schumann). Geen krachtdag in je week? Het schema meldt het op je WOD-dag.'],
      injury: ['Blessure, revalidatie & terugkeer', 'Prehab: zware langzame kuitoefeningen voor de achilles (Beyer); zware belasting maakt ook gezonde pezen sterker (Bohm). Nordic curls voor hamstrings, Copenhagen plank voor de lies. Een huidige loopblessure zet het schema in blessuremodus: runs worden fiets/roeier/SkiErg in dezelfde hartslagzones, wat je conditie wekenlang vasthoudt (Mujika & Padilla; Eyestone; Wilber), plus kuitrevalidatie (isometrisch → zwaar en langzaam → plyo) met een pijnregel van ≤ 5/10 die de volgende ochtend weer gezakt is (Silbernagel). Terugkeertest: 20–25 keer kuitheffen op één been en 10 hops pijnvrij (Hébert-Losier), daarna 3 weken wandel-hardloop vóór drempelwerk. Een kuitblessure bij het hardlopen duurt meestal 3–5 weken (Green). Terugkeercriteria en wandel-hardloopstappen zijn expertconsensus, geen trialdata.'],
      recovery: ['Herstel: slaap, sauna, kou & warmte', 'Slaap gaat voor alles (Walsh). Sauna direct na een rustige training, tot 3×/week, levert mogelijk ~2 % duurwinst op (kleine studies: Scoon; Kirby) en remt je krachtwinst niet (Ahokas). Een koud bad direct na kracht- of stationwerk remt je krachtwinst wél (Roberts; Malta) – Benchmrk stelt het alleen voor na looptrainingen en in race-/taperweken, op 11–15 °C, 11–15 min, met een klein effect op spierpijn (Machado). Een jacuzzi helpt alleen als hittevoorbereiding voor een race in de warmte (Zurawlew). Foamrollen werkt het best als warming-up (Wiewelhove).'],
    },
    note: 'De regels zijn vereenvoudigingen van deze studies voor recreatieve HYROX-atleten. Uitkomsten uit kleine of sportspecifieke groepen (bijv. voetballers) passen we voorzichtig toe.',
  },
  de: {
    title: 'Die Wissenschaft hinter Benchmrk',
    intro: 'Benchmrk übersetzt öffentliche sportwissenschaftliche Literatur in konkrete Trainingsregeln. Hier: was wir nutzen und wo du es im Plan siehst.',
    groups: {
      zones: ['Intensität, Zonen & Tempi', 'HF-Zonen in % deiner Schwellen-HF (Friel), überwiegend locker mit kleinerem harten Anteil (80/20, Seiler); ob dieser harte Anteil polarisiert oder pyramidal ist, macht für die Leistung wenig Unterschied (Rosenblat; Oliveira). Schwellentempo aus der 5-km-Zeit (Daniels).'],
      hyrox: ['HYROX-spezifisch', 'Endzeit = Läufe + Stationen + Roxzone; aerobe Kapazität und Laufumfang zählen am meisten. Bei Freizeitathleten macht Laufen etwa 60 % der Rennzeit aus (Brandt), in der PRO-Spitze etwa 50 % (Rappelt; Gutiérrez-Hellín). Nach den Stationen laufen Athleten langsamer: In der PRO-Spitze war Lauf 8 etwa 42 s/km langsamer als Lauf 1 (HYScience), und die Läufe 2–8 waren 27–55 s langsamer als Lauf 1 (Gutiérrez-Hellín). Offizielle Gewichte pro Division (HYROX-Regelwerk 26/27); HYROX-spezifisches Training statt generischem CrossFit. Sims / Compromised Runs folgen dem Spezifitätsprinzip: Laufen direkt nach Stationsarbeit ist genau die HYROX-Anforderung. Direkte Studien zu Sims sind rar — dieser Teil stützt sich vor allem auf Coaching-Praxis (WOD-Science). Weniger Einheiten pro Woche senken den erwarteten Fortschritt in der Prognose.'],
      load: ['Belastung, Ermüdung & Verletzungsrisiko', 'Schrittweise Umfangssteigerung, Entlastungswochen, RPE-basierter Ermüdungscheck und 80/20-Check in der Einheitsanalyse. Der Sehnenschutz macht Impact-Tage zu Low-Impact-Tagen. Das ist eine Entscheidung von Benchmrk: Die Evidenz ist teilweise (mehr Aktivitätsumfang hängt mit Sehnenbeschwerden zusammen, Sprague; die Sehne passt sich in den Tagen nach der Belastung noch an, Magnusson).'],
      frequency: ['Trainingstage pro Woche', 'Die Prognose erwartet mit weniger Einheiten weniger Fortschritt (Einheiten behalten ihre Länge): aerob 4+ Tage 100 % · 3 Tage 85 % · 2 Tage 70 % (60 % wenn schon fit) · 1 Tag 25 %; Stationskraft 100 / 86 / 76 / 69 %. Abgeleitet aus Responder-Raten (Montero & Lundby), VO2max-Änderungen (Lenk; Wenger & Bell), dem ACSM-Positionspapier und Kraft-Effektstärken (Grgic). Der 1-Tag-Wert ist am wenigsten untersucht. Bei gleichem Wochenumfang spielt die Frequenz kaum eine Rolle (Tripp; Grgic).'],
      taper: ['Tapering & Rennwoche', 'Progressiver 2-Wochen-Taper: etwa 65 % und dann 40 % des normalen Umfangs, gleiche Intensität und Anzahl Einheiten (Bosquet; Mujika & Padilla; Wang). Letzte schwere Kraft 7–10 Tage vorher (Travis), letzte große Sim 10–14 Tage vorher, kurze Steigerungen als Priming am Vortag (Harrison, geringe Evidenz). Kohlenhydrate 7–10 g/kg am letzten Tag/an den letzten Tagen, Frühstück 1–4 g/kg 1–4 h vorher, 30–60 g/h bei > 75 min (Thomas). Eine HYROX-spezifische Taper-Studie gibt es noch nicht: abgeleitet aus Ausdauer-, Kraft- und Mischsport-Forschung.'],
      strength: ['Kraft neben Ausdauer', 'Krafttraining 2×/Woche verbessert die Laufökonomie um 2–8 % (Blagrove; Denadai), hält sie im ermüdeten Zustand besser (Zanini) und senkt Sportverletzungen in Studien um etwa zwei Drittel (Lauersen); 1 schwere Einheit/Woche erhält sie (Spiering). Die Interferenz ist klein (Held; Schumann), vor allem bei Explosivkraft in derselben Einheit – halte ≥ 3 h Abstand (Schumann). Kein Krafttag in deiner Woche? Der Plan sagt es dir an deinem WOD-Tag.'],
      injury: ['Verletzung, Reha & Rückkehr', 'Prehab: schweres, langsames Wadentraining für die Achillessehne (Beyer); schwere Belastung macht auch gesunde Sehnen stärker (Bohm). Nordic Curls für die Hamstrings, Copenhagen Plank für die Leiste. Eine aktuelle Laufverletzung schaltet den Plan in den Verletzungsmodus: Läufe werden zu Rad/Rudern/SkiErg in denselben HF-Zonen, was die Fitness wochenlang erhält (Mujika & Padilla; Eyestone; Wilber), plus Wadenreha (isometrisch → schwer und langsam → Plyo) mit einer Schmerzregel von ≤ 5/10, am nächsten Morgen abgeklungen (Silbernagel). Rückkehrtest: 20–25 einbeinige Wadenheber und 10 Hops schmerzfrei (Hébert-Losier), dann 3 Wochen Geh-Lauf vor Schwellentraining. Eine Wadenzerrung beim Laufen dauert meist 3–5 Wochen (Green). Rückkehrkriterien und Geh-Lauf-Stufen sind Expertenkonsens, keine Studiendaten.'],
      recovery: ['Erholung: Schlaf, Sauna, Kälte & Wärme', 'Schlaf zuerst (Walsh). Sauna direkt nach lockeren Einheiten, bis 3×/Woche, bringt evtl. ~2 % Ausdauer (kleine Studien: Scoon; Kirby) und bremst Kraftzuwachs nicht (Ahokas). Ein Eisbad direkt nach Kraft- oder Stationsarbeit bremst den Kraftzuwachs (Roberts; Malta) – nur nach Läufen und in Renn-/Taperwochen, 11–15 °C, 11–15 Min., kleiner Effekt auf Muskelkater (Machado). Whirlpool nur als Hitzevorbereitung (Zurawlew). Faszienrolle am besten zum Aufwärmen (Wiewelhove).'],
    },
    note: 'Die Regeln vereinfachen diese Studien für Freizeit-HYROX-Athleten. Ergebnisse aus kleinen oder sportartspezifischen Gruppen (z. B. Fußballer) wenden wir vorsichtig an.',
  },
  es: {
    title: 'La ciencia detrás de Benchmrk',
    intro: 'Benchmrk traduce literatura pública de ciencias del deporte en reglas de entrenamiento concretas. Aquí: qué usamos y dónde lo ves en tu plan.',
    groups: {
      zones: ['Intensidad, zonas y ritmos', 'Zonas de FC en % de tu FC umbral (Friel), sobre todo suave con una parte menor dura (80/20, Seiler); que esa parte dura sea polarizada o piramidal influye poco en el rendimiento (Rosenblat; Oliveira). Ritmo umbral estimado con un 5 km (Daniels).'],
      hyrox: ['Específico de HYROX', 'Tiempo final = carreras + estaciones + Roxzone; la capacidad aeróbica y el volumen de carrera pesan más. En atletas recreativos correr es alrededor del 60 % del tiempo de carrera (Brandt); en la élite PRO, alrededor del 50 % (Rappelt; Gutiérrez-Hellín). Después de las estaciones se corre más lento: en la élite PRO la carrera 8 fue unos 42 s/km más lenta que la carrera 1 (HYScience), y las carreras 2–8 fueron 27–55 s más lentas que la carrera 1 (Gutiérrez-Hellín). Pesos oficiales por división (reglamento HYROX 26/27); entrenamiento específico, no CrossFit genérico. Los sims / compromised runs aplican el principio de especificidad: correr justo después de una estación es lo que exige HYROX. Hay pocos estudios directos sobre sims; esta parte se basa sobre todo en la práctica de coaching (WOD-Science). Menos sesiones semanales reducen la mejora esperada en la previsión.'],
      load: ['Carga, fatiga y riesgo de lesión', 'Aumento gradual del volumen, semanas de descarga, control de fatiga por RPE y control 80/20 en el análisis. La protección de tendones convierte los días de impacto en días de bajo impacto. Es una decisión de Benchmrk: la evidencia es parcial (más volumen de actividad se asocia con molestias en los tendones, Sprague; el tendón sigue adaptándose en los días posteriores a la carga, Magnusson).'],
      frequency: ['Días de entrenamiento por semana', 'La previsión espera menos mejora con menos sesiones (las sesiones mantienen su duración): aeróbico 4+ días 100 % · 3 días 85 % · 2 días 70 % (60 % si ya estás en forma) · 1 día 25 %; fuerza de estaciones 100 / 86 / 76 / 69 %. Derivado de tasas de respondedores (Montero y Lundby), cambios de VO2max (Lenk; Wenger y Bell), la postura del ACSM y tamaños de efecto de fuerza (Grgic). El valor de 1 día es el menos estudiado. Con igual volumen semanal la frecuencia importa mucho menos (Tripp; Grgic).'],
      taper: ['Taper y semana de carrera', 'Taper progresivo de 2 semanas: ~65 % y luego 40 % del volumen normal, misma intensidad y número de sesiones (Bosquet; Mujika y Padilla; Wang). Última fuerza pesada 7–10 días antes (Travis), último sim grande 10–14 días antes, progresiones cortas como priming el día anterior (Harrison, evidencia limitada). Carbohidratos 7–10 g/kg el último día, desayuno 1–4 g/kg 1–4 h antes, 30–60 g/h si la carrera dura > 75 min (Thomas). Aún no hay estudios de taper específicos de HYROX: reglas extrapoladas de investigación en resistencia, fuerza y deportes mixtos.'],
      strength: ['Fuerza junto a resistencia', 'La fuerza 2×/semana mejora la economía de carrera un 2–8 % (Blagrove; Denadai), la mantiene mejor cuando estás cansado (Zanini) y reduce las lesiones deportivas en torno a dos tercios en ensayos (Lauersen); 1 sesión pesada/semana la mantiene (Spiering). La interferencia es pequeña (Held; Schumann), sobre todo para la fuerza explosiva en la misma sesión: deja ≥ 3 h entre ambas (Schumann). ¿No hay día de fuerza en tu semana? El plan te lo indica en tu día de WOD.'],
      injury: ['Lesión, rehabilitación y vuelta a correr', 'Prehab: trabajo pesado y lento de gemelo para el Aquiles (Beyer); la carga pesada también fortalece los tendones sanos (Bohm). Nordic curls para isquiotibiales, plancha Copenhagen para la ingle. Una lesión de carrera actual pone el plan en modo lesión: las carreras pasan a bici/remo/SkiErg en las mismas zonas de FC, lo que mantiene la forma durante semanas (Mujika y Padilla; Eyestone; Wilber), más rehabilitación de gemelo (isométrico → pesado y lento → pliometría) con una regla de dolor ≤ 5/10 que haya bajado a la mañana siguiente (Silbernagel). Test de vuelta: 20–25 elevaciones de gemelo a una pierna y 10 saltos sin dolor (Hébert-Losier), luego 3 semanas de caminar-correr antes del trabajo de umbral. Una rotura de gemelo al correr suele tardar 3–5 semanas (Green). Los criterios de vuelta y los pasos de caminar-correr son consenso de expertos, no datos de ensayos.'],
      recovery: ['Recuperación: sueño, sauna, frío y calor', 'Primero el sueño (Walsh). Sauna justo tras una sesión suave, hasta 3×/semana, puede aportar ~2 % de resistencia (estudios pequeños: Scoon; Kirby) y no frena la fuerza (Ahokas). El agua fría justo tras fuerza o estaciones frena las ganancias de fuerza (Roberts; Malta): solo tras carreras y en semanas de carrera/taper, 11–15 °C, 11–15 min, efecto pequeño en agujetas (Machado). El jacuzzi solo sirve como preparación al calor (Zurawlew). El foam roller funciona mejor como calentamiento (Wiewelhove).'],
    },
    note: 'Las reglas simplifican estos estudios para atletas recreativos de HYROX. Resultados de grupos pequeños o de otros deportes (p. ej. futbolistas) se aplican con cautela.',
  },
  ko: {
    title: 'Benchmrk의 과학적 근거',
    intro: 'Benchmrk는 공개된 스포츠 과학 문헌을 구체적인 훈련 규칙으로 바꿉니다. 아래는 사용하는 문헌과 플랜에서 적용되는 부분입니다.',
    groups: {
      zones: ['강도, 존 & 페이스', '본인 역치 심박수 대비 % 심박존 (Friel), 대부분 쉬운 훈련과 일부 고강도 (80/20, Seiler); 고강도 부분이 양극화형이든 피라미드형이든 경기력 차이는 거의 없습니다 (Rosenblat; Oliveira). 5km 기록으로 역치 페이스 추정 (Daniels).'],
      hyrox: ['HYROX 특화', '완주 시간 = 러닝 + 스테이션 + 록스존; 유산소 능력과 러닝 볼륨이 가장 중요합니다. 일반 선수는 러닝이 레이스 시간의 약 60 % (Brandt), PRO 상위권은 약 50 %입니다 (Rappelt; Gutiérrez-Hellín). 스테이션 이후에는 달리기가 느려집니다: PRO 상위권에서 8번째 러닝은 1번째보다 km당 약 42초 느렸고 (HYScience), 2–8번째 러닝은 1번째보다 27–55초 느렸습니다 (Gutiérrez-Hellín). 디비전별 공식 무게 (HYROX 룰북 26/27); 일반 크로스핏이 아닌 HYROX 특화 훈련. 시뮬/컴프로마이즈드 런은 특이성 원칙을 따릅니다: 스테이션 직후 달리기가 바로 HYROX의 요구입니다. 시뮬에 대한 직접 연구는 드물어 이 부분은 주로 코칭 실무(WOD-Science)에 근거합니다. 주간 세션이 적으면 예측의 향상 폭이 줄어듭니다.'],
      load: ['부하, 피로 & 부상 위험', '점진적인 주간 볼륨 증가, 디로드 주, RPE 기반 피로 체크, 세션 분석의 80/20 체크. 힘줄 보호는 충격이 큰 날을 저충격 훈련으로 바꿉니다. 이는 Benchmrk의 선택입니다: 근거는 부분적입니다 (활동량이 많을수록 힘줄 통증과 연관, Sprague; 힘줄은 부하 후 며칠 동안 계속 적응, Magnusson).'],
      frequency: ['주간 훈련일', '세션이 적을수록 예측의 향상 폭을 줄입니다 (세션 길이는 동일): 유산소 4일+ 100 % · 3일 85 % · 2일 70 % (이미 체력이 좋으면 60 %) · 1일 25 %; 스테이션 근력 100 / 86 / 76 / 69 %. 반응자 비율(Montero & Lundby), VO2max 변화(Lenk; Wenger & Bell), ACSM 입장문, 근력 효과크기(Grgic)에서 도출. 1일 값은 연구가 가장 적습니다. 주간 볼륨이 같으면 빈도의 영향은 훨씬 작습니다(Tripp; Grgic).'],
      taper: ['테이퍼 & 레이스 주', '2주 점진적 테이퍼: 평소 볼륨의 약 65 %, 이후 40 %, 강도와 세션 수는 유지 (Bosquet; Mujika & Padilla; Wang). 마지막 고중량 근력 7–10일 전 (Travis), 마지막 큰 시뮬 10–14일 전, 전날 짧은 가속주로 프라이밍 (Harrison, 근거 제한적). 마지막 날 탄수화물 7–10 g/kg, 출발 1–4시간 전 1–4 g/kg 아침, 75분 넘으면 시간당 30–60 g (Thomas). HYROX 전용 테이퍼 연구는 아직 없어요: 지구력·근력·혼합 종목 연구에서 도출했어요.'],
      strength: ['지구력과 병행하는 근력', '주 2회 근력 훈련은 러닝 이코노미를 2–8 % 높이고 (Blagrove; Denadai), 피로한 상태에서도 더 잘 유지하며 (Zanini), 연구에서 스포츠 부상을 약 3분의 2 줄였습니다 (Lauersen); 주 1회 고중량 세션으로 유지됩니다 (Spiering). 간섭은 작습니다 (Held; Schumann). 주로 같은 세션의 폭발적 근력에서 나타나므로 3시간 이상 간격을 두세요 (Schumann). 주간 일정에 근력일이 없나요? WOD 날에 플랜이 알려줍니다.'],
      injury: ['부상, 재활 & 러닝 복귀', '프리햅: 아킬레스를 위한 무겁고 느린 종아리 운동 (Beyer); 고부하는 건강한 힘줄도 더 강하게 만듭니다 (Bohm). 햄스트링을 위한 노르딕 컬, 사타구니를 위한 코펜하겐 플랭크. 현재 러닝 부상이 있으면 플랜이 부상 모드로 바뀝니다: 러닝은 같은 심박존의 자전거/로잉/스키에르그로 대체되어 몇 주간 체력을 유지하고 (Mujika & Padilla; Eyestone; Wilber), 종아리 재활 (등척성 → 고중량 저속 → 플라이오)을 통증 규칙 ≤ 5/10, 다음 날 아침이면 가라앉는 수준으로 진행합니다 (Silbernagel). 복귀 테스트: 한 발 종아리 들기 20–25회와 한 발 홉 10회를 통증 없이 (Hébert-Losier), 이후 역치 훈련 전 3주간 걷기-달리기. 러닝 중 종아리 부상은 보통 3–5주 걸립니다 (Green). 복귀 기준과 걷기-달리기 단계는 임상시험 데이터가 아닌 전문가 합의입니다.'],
      recovery: ['회복: 수면, 사우나, 냉·온', '수면이 먼저입니다 (Walsh). 가벼운 세션 직후 사우나, 주 3회까지, 지구력 ~2 % 향상 가능 (소규모 연구: Scoon; Kirby), 근력 향상은 저해하지 않음 (Ahokas). 근력·스테이션 운동 직후 냉수욕은 근력 향상을 저해 (Roberts; Malta) – 러닝 후와 레이스/테이퍼 주에만, 11–15 °C, 11–15분, 근육통에 작은 효과 (Machado). 온수 욕조는 더운 날씨 레이스 대비용으로만 (Zurawlew). 폼롤러는 워밍업으로 가장 효과적 (Wiewelhove).'],
    },
    note: '규칙은 일반 HYROX 선수를 위해 이 연구들을 단순화한 것입니다. 소규모 또는 다른 종목(예: 축구 선수) 연구 결과는 신중하게 적용합니다.',
  },
};

export default function Science() {
  const { lang } = useI18n();
  const x = TXT[lang] ?? TXT.en;
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">{x.title}</h1>
        <p className="mt-2 text-muted">{x.intro}</p>
      </div>
      <div className="panel flex gap-3 border-warn/50 bg-warn/10 p-4 text-sm">
        <ShieldAlert className="h-5 w-5 shrink-0 text-warn" aria-hidden />
        <p>{(DISCLAIMER[lang] ?? DISCLAIMER.en).long}</p>
      </div>
      {GROUPS.map((g) => {
        const [h, d] = x.groups[g.id as G];
        return (
          <section key={g.id} id={g.id} className="panel scroll-mt-20 p-5">
            <h2 className="text-lg font-bold">{h}</h2>
            <p className="mt-1 text-sm text-muted">{d}</p>
            <ul className="mt-3 space-y-2 text-sm">
              {g.refs.map((r) => (
                <li key={r.url}>
                  <a href={r.url} target="_blank" rel="noreferrer" className="group inline-flex gap-1.5 hover:text-volt">
                    <span>{r.cite}</span>
                    <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted group-hover:text-volt" aria-hidden />
                  </a>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      <PlanUpdateLog />
      <SourceBase />
      <p className="text-xs text-muted">{x.note}</p>
    </div>
  );
}

/** Source updates that changed /science but no training rule (so no plan update for members). Newest first. */
const SOURCE_LOG: { date: string; text: Record<Lang, string> }[] = [
  {
    date: '2026-11-12',
    text: {
      nl: 'Bronnen 12 nov: dertien bronnen toegevoegd en drie gearchiveerd. De 80/20-check telde drempelwerk en intervallen al hetzelfde, wat nu ook onderbouwd is (Rosenblat 2025, Oliveira 2024). Je schema verandert hierdoor niet.',
      en: 'Sources 12 Nov: thirteen sources added and three archived. The 80/20 check already counted threshold work and intervals the same, which is now also backed by evidence (Rosenblat 2025, Oliveira 2024). Your plan does not change.',
      de: 'Quellen 12. Nov.: dreizehn Quellen hinzugefügt und drei archiviert. Der 80/20-Check zählte Schwellentraining und Intervalle bereits gleich, was jetzt auch belegt ist (Rosenblat 2025, Oliveira 2024). Dein Plan ändert sich dadurch nicht.',
      es: 'Fuentes 12 nov: trece fuentes añadidas y tres archivadas. El control 80/20 ya contaba igual el trabajo de umbral y los intervalos, algo que ahora también está respaldado (Rosenblat 2025, Oliveira 2024). Tu plan no cambia.',
      ko: '출처 11월 12일: 13개 출처 추가, 3개 보관. 80/20 체크는 이미 역치 훈련과 인터벌을 똑같이 계산했으며, 이제 근거도 갖췄습니다 (Rosenblat 2025, Oliveira 2024). 플랜은 바뀌지 않습니다.',
    },
  },
];

/** One line per published plan update: "Plan update 12 Nov: taper adjusted based on …". */
function PlanUpdateLog() {
  const { lang } = useI18n();
  const ups = usePlanUpdates();
  // published plan updates and source-only updates, newest first
  const lines = [
    ...(ups.data ?? [])
      .filter((u) => u.status === 'published')
      .map((u) => ({ key: u.id, date: (u.published_at ?? u.created_at).slice(0, 10), text: pt(lang, 'page.change', { date: fmtDay(lang, u.published_at ?? u.created_at, true), title: loc(u.title, lang) }) })),
    ...SOURCE_LOG.map((x) => ({ key: x.date, date: x.date, text: x.text[lang] ?? x.text.en })),
  ].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <section id="changelog" className="panel scroll-mt-20 p-5">
      <h2 className="text-lg font-bold">{pt(lang, 'sci.changelog')}</h2>
      <p className="mt-1 text-sm text-muted">{pt(lang, 'sci.changelogIntro')}</p>
      {lines.length ? (
        <ul className="mt-3 space-y-1.5 text-sm">
          {lines.map((l) => (
            <li key={l.key}>{l.text}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted">{pt(lang, 'sci.noUpdates')}</p>
      )}
    </section>
  );
}

function SourceItem({ s, byId }: { s: SourceRow; byId: Map<string, SourceRow> }) {
  const { lang } = useI18n();
  const rep = s.replaced_by ? byId.get(s.replaced_by) : null;
  const summary = s.summary_i18n?.[lang] ?? s.summary_i18n?.en ?? null;
  const label = s.label_i18n?.[lang] ?? s.label_i18n?.en ?? null;
  return (
    <li id={sourceAnchor(s)} className="scroll-mt-20 rounded-lg px-2 py-2 text-sm target:bg-volt/15">
      <SourceLink s={s} />
      <div className="mt-1 flex flex-wrap gap-1.5 text-xs text-muted">
        {s.level ? <span className="chip">{pt(lang, 'sci.level', { l: s.level })}</span> : <span className="chip">{pt(lang, 'sci.noLevel')}</span>}
        {label && <span className="chip bg-warn/15 text-ink">{label}</span>}
        {s.checked_at && <span>{pt(lang, 'sci.checked', { date: fmtDay(lang, s.checked_at, true) })}</span>}
      </div>
      {summary && <p className="mt-1 text-xs text-muted">{summary}</p>}
      {!!s.rule_keys?.length && (
        <p className="mt-1 text-xs">
          <span className="label mr-1">{pt(lang, 'sci.rules')}:</span>
          {s.rule_keys.map((k) => ruleLabel(lang, k)).join(' · ')}
        </p>
      )}
      {s.status === 'archived' && (
        <div className="mt-1 space-y-0.5 text-xs text-muted">
          <p>{pt(lang, 'sci.archivedOn', { date: s.archived_at ? fmtDay(lang, s.archived_at, true) : '–' })}</p>
          {s.archived_reason && <p>{pt(lang, 'sci.reason', { r: s.archived_reason })}</p>}
          {rep && (
            <p>
              {pt(lang, 'sci.replacedBy', { t: '' })}
              <Link to={`#${sourceAnchor(rep)}`} className="underline hover:text-fg">
                {rep.title}
              </Link>
            </p>
          )}
        </div>
      )}
    </li>
  );
}

/** Every source in the database with its level and the rules it supports; archived sources at the bottom. */
function SourceBase() {
  const { lang } = useI18n();
  const q = useSources();
  const all = q.data ?? [];
  useEffect(() => {
    const h = decodeURIComponent(window.location.hash.slice(1));
    if (h.startsWith('src-') && all.length) document.getElementById(h)?.scrollIntoView({ block: 'center' });
  }, [all.length]);
  if (!all.length || all[0].status === undefined) return null; // before migration 022 there are no levels or rule keys
  const byId = new Map(all.map((s) => [s.id, s]));
  const active = all.filter((s) => s.status !== 'archived').sort((a, b) => Number(!a.rule_keys?.length) - Number(!b.rule_keys?.length) || a.title.localeCompare(b.title));
  const archived = all.filter((s) => s.status === 'archived').sort((a, b) => (b.archived_at ?? '').localeCompare(a.archived_at ?? ''));
  return (
    <>
      <section id="sources" className="panel scroll-mt-20 p-5">
        <h2 className="text-lg font-bold">{pt(lang, 'sci.sources')}</h2>
        <p className="mt-1 text-sm text-muted">{pt(lang, 'sci.sourcesIntro')}</p>
        <p className="mt-2 text-xs text-muted">{pt(lang, 'sci.levels')}</p>
        <ul className="mt-3 divide-y divide-line">
          {active.map((s) => (
            <SourceItem key={s.id} s={s} byId={byId} />
          ))}
        </ul>
      </section>
      {archived.length > 0 && (
        <section id="archived" className="panel scroll-mt-20 p-5">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Archive className="h-4 w-4 text-muted" aria-hidden />
            {pt(lang, 'sci.archived')}
          </h2>
          <ul className="mt-3 divide-y divide-line">
            {archived.map((s) => (
              <SourceItem key={s.id} s={s} byId={byId} />
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
