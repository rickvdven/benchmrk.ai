import { ShieldAlert, ExternalLink } from 'lucide-react';
import type { Lang } from '../engine';
import { useI18n } from '../lib/i18n';
import { DISCLAIMER } from '../components/Disclaimer';
import { updateTitle, usePlanUpdates, useSources, type SourceRow } from '../data/planUpdates';
import { pt } from '../lib/planupdate';

type Ref = { cite: string; url: string };
type Group = { id: string; refs: Ref[] };

/** Public literature the engine is built on. Citations verified against Crossref (Oct 2026). */
const GROUPS: Group[] = [
  {
    id: 'zones',
    refs: [
      { cite: 'Friel J (2012, updated 2026). Joe Friel’s Quick Guide to Setting Zones. TrainingPeaks.', url: 'https://www.trainingpeaks.com/learn/articles/joe-friel-s-quick-guide-to-setting-zones/' },
      { cite: 'Seiler S (2010). What is best practice for training intensity and duration distribution in endurance athletes? Int J Sports Physiol Perform 5(3):276–291.', url: 'https://doi.org/10.1123/ijspp.5.3.276' },
      { cite: 'Stöggl T, Sperlich B (2014). Polarized training has greater impact on key endurance variables than threshold, high intensity, or high volume training. Front Physiol 5:33.', url: 'https://doi.org/10.3389/fphys.2014.00033' },
      { cite: 'Daniels J (2022). Daniels’ Running Formula, 4th ed. Human Kinetics.', url: 'https://us.humankinetics.com/products/daniels-running-formula-3rd-edition' },
    ],
  },
  {
    id: 'hyrox',
    refs: [
      { cite: 'Brandt T, Ebel C, Lebahn C, Schmidt A (2025). Acute physiological responses and performance determinants in Hyrox© – a new running-focused high intensity functional fitness trend. Front Physiol 16:1519240.', url: 'https://doi.org/10.3389/fphys.2025.1519240' },
      { cite: 'HYROX station weights per division (overview, Red Bull).', url: 'https://www.redbull.com/us-en/hyrox-weights-overview' },
      { cite: 'WOD-Science (Gommaar D’Hulst) — HYROX-specific training principles (YouTube).', url: 'https://www.youtube.com/@wod-science' },
    ],
  },
  {
    id: 'load',
    refs: [
      { cite: 'Gabbett TJ (2016). The training–injury prevention paradox: should athletes be training smarter and harder? Br J Sports Med 50(5):273–280.', url: 'https://doi.org/10.1136/bjsports-2015-095788' },
      { cite: 'Nielsen RO et al. (2014). Excessive progression in weekly running distance and risk of running-related injuries. J Orthop Sports Phys Ther 44(10):739–747.', url: 'https://doi.org/10.2519/jospt.2014.5164' },
      { cite: 'Foster C (1998). Monitoring training in athletes with reference to overtraining syndrome. Med Sci Sports Exerc 30(7):1164–1168.', url: 'https://doi.org/10.1097/00005768-199807000-00023' },
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
      { cite: 'Wilson JM et al. (2012). Concurrent training: a meta-analysis examining interference of aerobic and resistance exercises. J Strength Cond Res 26(8):2293–2307.', url: 'https://doi.org/10.1519/JSC.0b013e31823a3e2d' },
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
      zones: ['Intensity, zones & paces', 'Heart-rate zones as % of your own threshold HR (Friel), mostly easy with a smaller share of hard work (80/20, Seiler; Stöggl & Sperlich), threshold pace estimated from a 5 km time (Daniels).'],
      hyrox: ['HYROX-specific', 'Finish time = runs + stations + Roxzone; aerobic capacity and running volume matter most; official station weights per division; HYROX-specific (not generic CrossFit) training. Sims / compromised runs apply the specificity principle: running straight after station work is what HYROX demands. Direct studies on sims are scarce — this part rests mainly on coaching practice (WOD-Science). Fewer weekly sessions lower the expected improvement in the forecast.'],
      load: ['Load, fatigue & injury risk', 'Gradual weekly volume increase, deload weeks, RPE-based fatigue checks and the 80/20 check in the session analysis.'],
      frequency: ['Training days per week', 'The forecast expects less improvement with fewer sessions (sessions keep their length): aerobic 4+ days 100 % · 3 days 85 % · 2 days 70 % (60 % if already fit) · 1 day 25 %; station strength 100 / 86 / 76 / 69 %. Derived from responder rates (Montero & Lundby), VO2max changes (Lenk; Wenger & Bell), the ACSM position stand and strength effect sizes (Grgic). The 1-day value is the least studied. With equal weekly volume, frequency matters much less (Tripp; Grgic).'],
      taper: ['Taper & race week', '2-week progressive taper: about 65 % and then 40 % of normal volume, same intensity and number of sessions (Bosquet; Mujika & Padilla; Wang). Last heavy strength 7–10 days out (Travis), last big sim 10–14 days out, short strides as priming the day before (Harrison, low certainty). Carbohydrate 7–10 g/kg in the last day(s), breakfast 1–4 g/kg 1–4 h before, 30–60 g/h if the race takes > 75 min (Thomas). There is no HYROX-specific taper study yet: these rules are extrapolated from endurance, strength and mixed-sport research.'],
      strength: ['Strength alongside endurance', 'Strength 2×/week improves running economy by 2–8 % (Blagrove; Denadai) and cuts sports injuries by about two thirds in trials (Lauersen); 1 heavy session/week maintains it (Spiering). Interference is small, mainly for explosive strength in the same session – keep ≥ 3 h apart (Schumann; Wilson). No strength day in your week? The plan tells you on your WOD day.'],
      injury: ['Injury, rehab & return to running', 'Prehab: heavy slow calf work for the Achilles (Beyer), Nordic curls for hamstrings, Copenhagen plank for groin. A current running injury switches the plan to injury mode: runs become bike/rower/SkiErg at the same heart-rate zones, which keeps fitness for weeks (Mujika & Padilla; Eyestone; Wilber), plus calf rehab (isometric → heavy slow → plyo) under a pain rule of ≤ 5/10, settled by next morning (Silbernagel). Return test: 20–25 single-leg calf raises and 10 hops pain-free (Hébert-Losier), then 3 weeks walk-run before threshold work. A running calf strain typically takes 3–5 weeks (Green). Return criteria and walk-run steps are expert consensus, not trial data.'],
      recovery: ['Recovery: sleep, sauna, cold & heat', 'Sleep comes first (Walsh). Sauna right after an easy session, up to 3×/week, may add ~2 % endurance (small studies: Scoon; Kirby) and does not hurt strength gains (Ahokas). A cold bath right after strength or station work blunts strength gains (Roberts; Malta) – RoxCoach only suggests it after runs, in race/taper weeks, at 11–15 °C for 11–15 min, with a small effect on soreness (Machado). A hot tub only helps as heat preparation for a race in the heat (Zurawlew). Foam rolling works best as a warm-up (Wiewelhove).'],
    },
    note: 'Rules are simplifications of these studies for recreational HYROX athletes. Findings from small or sport-specific groups (e.g. football players) are applied cautiously.',
  },
  nl: {
    title: 'De wetenschap achter Benchmrk',
    intro: 'Benchmrk vertaalt publieke sportwetenschappelijke literatuur naar concrete trainingsregels. Hieronder: wat we gebruiken en waar je het terugziet in je plan.',
    groups: {
      zones: ['Intensiteit, zones & tempo’s', 'Hartslagzones als % van je eigen drempelhartslag (Friel), vooral rustig met een kleiner deel zwaar werk (80/20, Seiler; Stöggl & Sperlich), drempeltempo geschat uit een 5 km-tijd (Daniels).'],
      hyrox: ['HYROX-specifiek', 'Eindtijd = runs + stations + Roxzone; aerobe capaciteit en loopvolume wegen het zwaarst; officiële stationgewichten per divisie; HYROX-specifiek trainen (geen generieke CrossFit). Sims / compromised runs volgen het specificiteitsprincipe: hardlopen direct na stationwerk is precies wat HYROX vraagt. Direct onderzoek naar sims is schaars — dit deel rust vooral op coachingpraktijk (WOD-Science). Minder trainingen per week verlagen de verwachte verbetering in de voorspelling.'],
      load: ['Belasting, vermoeidheid & blessurerisico', 'Geleidelijke opbouw van weekvolume, deloadweken, vermoeidheidscheck op RPE en de 80/20-check in de sessie-analyse.'],
      frequency: ['Trainingsdagen per week', 'De voorspelling rekent met minder verbetering bij minder trainingen (trainingen houden hun lengte): aeroob 4+ dagen 100 % · 3 dagen 85 % · 2 dagen 70 % (60 % als je al fit bent) · 1 dag 25 %; stationkracht 100 / 86 / 76 / 69 %. Afgeleid uit responder-percentages (Montero & Lundby), VO2max-veranderingen (Lenk; Wenger & Bell), het ACSM-standpunt en kracht-effectgroottes (Grgic). De waarde voor 1 dag is het minst onderzocht. Bij gelijk weekvolume maakt frequentie veel minder uit (Tripp; Grgic).'],
      taper: ['Taper & raceweek', 'Taper van 2 weken, aflopend: ongeveer 65 % en daarna 40 % van het normale volume, zelfde intensiteit en aantal trainingen (Bosquet; Mujika & Padilla; Wang). Laatste zware kracht 7–10 dagen voor de race (Travis), laatste grote sim 10–14 dagen voor, korte versnellingen als priming de dag ervoor (Harrison, beperkt bewijs). Koolhydraten 7–10 g/kg de laatste dag(en), ontbijt 1–4 g/kg 1–4 uur vooraf, 30–60 g/uur als de race > 75 min duurt (Thomas). Er is nog geen HYROX-specifieke taperstudie: deze regels zijn afgeleid uit duur-, kracht- en gemengd-sportonderzoek.'],
      strength: ['Kracht naast duur', 'Kracht 2×/week verbetert je loopeconomie met 2–8 % (Blagrove; Denadai) en verlaagt sportblessures in trials met ongeveer twee derde (Lauersen); 1 zware sessie/week houdt het op peil (Spiering). Interferentie is klein, vooral voor explosieve kracht in dezelfde sessie – houd ≥ 3 uur afstand (Schumann; Wilson). Geen krachtdag in je week? Het schema meldt het op je WOD-dag.'],
      injury: ['Blessure, revalidatie & terugkeer', 'Prehab: zware langzame kuitoefeningen voor de achilles (Beyer), Nordic curls voor hamstrings, Copenhagen plank voor de lies. Een huidige loopblessure zet het schema in blessuremodus: runs worden fiets/roeier/SkiErg in dezelfde hartslagzones, wat je conditie wekenlang vasthoudt (Mujika & Padilla; Eyestone; Wilber), plus kuitrevalidatie (isometrisch → zwaar en langzaam → plyo) met een pijnregel van ≤ 5/10 die de volgende ochtend weer gezakt is (Silbernagel). Terugkeertest: 20–25 keer kuitheffen op één been en 10 hops pijnvrij (Hébert-Losier), daarna 3 weken wandel-hardloop vóór drempelwerk. Een kuitblessure bij het hardlopen duurt meestal 3–5 weken (Green). Terugkeercriteria en wandel-hardloopstappen zijn expertconsensus, geen trialdata.'],
      recovery: ['Herstel: slaap, sauna, kou & warmte', 'Slaap gaat voor alles (Walsh). Sauna direct na een rustige training, tot 3×/week, levert mogelijk ~2 % duurwinst op (kleine studies: Scoon; Kirby) en remt je krachtwinst niet (Ahokas). Een koud bad direct na kracht- of stationwerk remt je krachtwinst wél (Roberts; Malta) – RoxCoach stelt het alleen voor na looptrainingen en in race-/taperweken, op 11–15 °C, 11–15 min, met een klein effect op spierpijn (Machado). Een jacuzzi helpt alleen als hittevoorbereiding voor een race in de warmte (Zurawlew). Foamrollen werkt het best als warming-up (Wiewelhove).'],
    },
    note: 'De regels zijn vereenvoudigingen van deze studies voor recreatieve HYROX-atleten. Uitkomsten uit kleine of sportspecifieke groepen (bijv. voetballers) passen we voorzichtig toe.',
  },
  de: {
    title: 'Die Wissenschaft hinter Benchmrk',
    intro: 'Benchmrk übersetzt öffentliche sportwissenschaftliche Literatur in konkrete Trainingsregeln. Hier: was wir nutzen und wo du es im Plan siehst.',
    groups: {
      zones: ['Intensität, Zonen & Tempi', 'HF-Zonen in % deiner Schwellen-HF (Friel), überwiegend locker mit kleinerem harten Anteil (80/20, Seiler; Stöggl & Sperlich), Schwellentempo aus der 5-km-Zeit (Daniels).'],
      hyrox: ['HYROX-spezifisch', 'Endzeit = Läufe + Stationen + Roxzone; aerobe Kapazität und Laufumfang zählen am meisten; offizielle Gewichte pro Division; HYROX-spezifisches Training statt generischem CrossFit. Sims / Compromised Runs folgen dem Spezifitätsprinzip: Laufen direkt nach Stationsarbeit ist genau die HYROX-Anforderung. Direkte Studien zu Sims sind rar — dieser Teil stützt sich vor allem auf Coaching-Praxis (WOD-Science). Weniger Einheiten pro Woche senken den erwarteten Fortschritt in der Prognose.'],
      load: ['Belastung, Ermüdung & Verletzungsrisiko', 'Schrittweise Umfangssteigerung, Entlastungswochen, RPE-basierter Ermüdungscheck und 80/20-Check in der Einheitsanalyse.'],
      frequency: ['Trainingstage pro Woche', 'Die Prognose erwartet mit weniger Einheiten weniger Fortschritt (Einheiten behalten ihre Länge): aerob 4+ Tage 100 % · 3 Tage 85 % · 2 Tage 70 % (60 % wenn schon fit) · 1 Tag 25 %; Stationskraft 100 / 86 / 76 / 69 %. Abgeleitet aus Responder-Raten (Montero & Lundby), VO2max-Änderungen (Lenk; Wenger & Bell), dem ACSM-Positionspapier und Kraft-Effektstärken (Grgic). Der 1-Tag-Wert ist am wenigsten untersucht. Bei gleichem Wochenumfang spielt die Frequenz kaum eine Rolle (Tripp; Grgic).'],
      taper: ['Tapering & Rennwoche', 'Progressiver 2-Wochen-Taper: etwa 65 % und dann 40 % des normalen Umfangs, gleiche Intensität und Anzahl Einheiten (Bosquet; Mujika & Padilla; Wang). Letzte schwere Kraft 7–10 Tage vorher (Travis), letzte große Sim 10–14 Tage vorher, kurze Steigerungen als Priming am Vortag (Harrison, geringe Evidenz). Kohlenhydrate 7–10 g/kg am letzten Tag/an den letzten Tagen, Frühstück 1–4 g/kg 1–4 h vorher, 30–60 g/h bei > 75 min (Thomas). Eine HYROX-spezifische Taper-Studie gibt es noch nicht: abgeleitet aus Ausdauer-, Kraft- und Mischsport-Forschung.'],
      strength: ['Kraft neben Ausdauer', 'Stationskraft in begrenzter Dosis, nicht direkt vor wichtigen Läufen, um Interferenz zu begrenzen.'],
      injury: ['Verletzungsprävention & Prehab', 'Schweres langsames Wadentraining für die Achillessehne, Schmerzregel (≤ 3/10), Nordic Curls, Copenhagen Plank.'],
      recovery: ['Erholung: Schlaf, Sauna, Kälte & Wärme', 'Schlaf zuerst (Walsh). Sauna direkt nach lockeren Einheiten, bis 3×/Woche, bringt evtl. ~2 % Ausdauer (kleine Studien: Scoon; Kirby) und bremst Kraftzuwachs nicht (Ahokas). Ein Eisbad direkt nach Kraft- oder Stationsarbeit bremst den Kraftzuwachs (Roberts; Malta) – nur nach Läufen und in Renn-/Taperwochen, 11–15 °C, 11–15 Min., kleiner Effekt auf Muskelkater (Machado). Whirlpool nur als Hitzevorbereitung (Zurawlew). Faszienrolle am besten zum Aufwärmen (Wiewelhove).'],
    },
    note: 'Die Regeln vereinfachen diese Studien für Freizeit-HYROX-Athleten. Ergebnisse aus kleinen oder sportartspezifischen Gruppen (z. B. Fußballer) wenden wir vorsichtig an.',
  },
  es: {
    title: 'La ciencia detrás de Benchmrk',
    intro: 'Benchmrk traduce literatura pública de ciencias del deporte en reglas de entrenamiento concretas. Aquí: qué usamos y dónde lo ves en tu plan.',
    groups: {
      zones: ['Intensidad, zonas y ritmos', 'Zonas de FC en % de tu FC umbral (Friel), sobre todo suave con una parte menor dura (80/20, Seiler; Stöggl y Sperlich), ritmo umbral estimado con un 5 km (Daniels).'],
      hyrox: ['Específico de HYROX', 'Tiempo final = carreras + estaciones + Roxzone; la capacidad aeróbica y el volumen de carrera pesan más; pesos oficiales por división; entrenamiento específico, no CrossFit genérico. Los sims / compromised runs aplican el principio de especificidad: correr justo después de una estación es lo que exige HYROX. Hay pocos estudios directos sobre sims; esta parte se basa sobre todo en la práctica de coaching (WOD-Science). Menos sesiones semanales reducen la mejora esperada en la previsión.'],
      load: ['Carga, fatiga y riesgo de lesión', 'Aumento gradual del volumen, semanas de descarga, control de fatiga por RPE y control 80/20 en el análisis.'],
      frequency: ['Días de entrenamiento por semana', 'La previsión espera menos mejora con menos sesiones (las sesiones mantienen su duración): aeróbico 4+ días 100 % · 3 días 85 % · 2 días 70 % (60 % si ya estás en forma) · 1 día 25 %; fuerza de estaciones 100 / 86 / 76 / 69 %. Derivado de tasas de respondedores (Montero y Lundby), cambios de VO2max (Lenk; Wenger y Bell), la postura del ACSM y tamaños de efecto de fuerza (Grgic). El valor de 1 día es el menos estudiado. Con igual volumen semanal la frecuencia importa mucho menos (Tripp; Grgic).'],
      taper: ['Taper y semana de carrera', 'Taper progresivo de 2 semanas: ~65 % y luego 40 % del volumen normal, misma intensidad y número de sesiones (Bosquet; Mujika y Padilla; Wang). Última fuerza pesada 7–10 días antes (Travis), último sim grande 10–14 días antes, progresiones cortas como priming el día anterior (Harrison, evidencia limitada). Carbohidratos 7–10 g/kg el último día, desayuno 1–4 g/kg 1–4 h antes, 30–60 g/h si la carrera dura > 75 min (Thomas). Aún no hay estudios de taper específicos de HYROX: reglas extrapoladas de investigación en resistencia, fuerza y deportes mixtos.'],
      strength: ['Fuerza junto a resistencia', 'Fuerza de estaciones en dosis limitadas, lejos de las sesiones clave de carrera para limitar interferencias.'],
      injury: ['Prevención de lesiones y prehab', 'Trabajo pesado y lento de gemelo para el Aquiles, regla del dolor (≤ 3/10), Nordic curls, plancha Copenhagen.'],
      recovery: ['Recuperación: sueño, sauna, frío y calor', 'Primero el sueño (Walsh). Sauna justo tras una sesión suave, hasta 3×/semana, puede aportar ~2 % de resistencia (estudios pequeños: Scoon; Kirby) y no frena la fuerza (Ahokas). El agua fría justo tras fuerza o estaciones frena las ganancias de fuerza (Roberts; Malta): solo tras carreras y en semanas de carrera/taper, 11–15 °C, 11–15 min, efecto pequeño en agujetas (Machado). El jacuzzi solo sirve como preparación al calor (Zurawlew). El foam roller funciona mejor como calentamiento (Wiewelhove).'],
    },
    note: 'Las reglas simplifican estos estudios para atletas recreativos de HYROX. Resultados de grupos pequeños o de otros deportes (p. ej. futbolistas) se aplican con cautela.',
  },
  ko: {
    title: 'Benchmrk의 과학적 근거',
    intro: 'Benchmrk는 공개된 스포츠 과학 문헌을 구체적인 훈련 규칙으로 바꿉니다. 아래는 사용하는 문헌과 플랜에서 적용되는 부분입니다.',
    groups: {
      zones: ['강도, 존 & 페이스', '본인 역치 심박수 대비 % 심박존 (Friel), 대부분 쉬운 훈련과 일부 고강도 (80/20, Seiler; Stöggl & Sperlich), 5km 기록으로 역치 페이스 추정 (Daniels).'],
      hyrox: ['HYROX 특화', '완주 시간 = 러닝 + 스테이션 + 록스존; 유산소 능력과 러닝 볼륨이 가장 중요; 디비전별 공식 무게; 일반 크로스핏이 아닌 HYROX 특화 훈련. 시뮬/컴프로마이즈드 런은 특이성 원칙을 따릅니다: 스테이션 직후 달리기가 바로 HYROX의 요구입니다. 시뮬에 대한 직접 연구는 드물어 이 부분은 주로 코칭 실무(WOD-Science)에 근거합니다. 주간 세션이 적으면 예측의 향상 폭이 줄어듭니다.'],
      load: ['부하, 피로 & 부상 위험', '점진적인 주간 볼륨 증가, 디로드 주, RPE 기반 피로 체크, 세션 분석의 80/20 체크.'],
      frequency: ['주간 훈련일', '세션이 적을수록 예측의 향상 폭을 줄입니다 (세션 길이는 동일): 유산소 4일+ 100 % · 3일 85 % · 2일 70 % (이미 체력이 좋으면 60 %) · 1일 25 %; 스테이션 근력 100 / 86 / 76 / 69 %. 반응자 비율(Montero & Lundby), VO2max 변화(Lenk; Wenger & Bell), ACSM 입장문, 근력 효과크기(Grgic)에서 도출. 1일 값은 연구가 가장 적습니다. 주간 볼륨이 같으면 빈도의 영향은 훨씬 작습니다(Tripp; Grgic).'],
      taper: ['테이퍼 & 레이스 주', '2주 점진적 테이퍼: 평소 볼륨의 약 65 %, 이후 40 %, 강도와 세션 수는 유지 (Bosquet; Mujika & Padilla; Wang). 마지막 고중량 근력 7–10일 전 (Travis), 마지막 큰 시뮬 10–14일 전, 전날 짧은 가속주로 프라이밍 (Harrison, 근거 제한적). 마지막 날 탄수화물 7–10 g/kg, 출발 1–4시간 전 1–4 g/kg 아침, 75분 넘으면 시간당 30–60 g (Thomas). HYROX 전용 테이퍼 연구는 아직 없어요: 지구력·근력·혼합 종목 연구에서 도출했어요.'],
      strength: ['지구력과 병행하는 근력', '간섭을 줄이기 위해 스테이션 근력은 제한된 양으로, 핵심 러닝 세션과 떨어뜨려 배치.'],
      injury: ['부상 예방 & 프리햅', '아킬레스를 위한 무겁고 느린 종아리 운동, 통증 규칙 (≤ 3/10), 노르딕 컬, 코펜하겐 플랭크.'],
      recovery: ['회복: 수면, 사우나, 냉·온', '수면이 먼저입니다 (Walsh). 가벼운 세션 직후 사우나, 주 3회까지, 지구력 ~2 % 향상 가능 (소규모 연구: Scoon; Kirby), 근력 향상은 저해하지 않음 (Ahokas). 근력·스테이션 운동 직후 냉수욕은 근력 향상을 저해 (Roberts; Malta) – 러닝 후와 레이스/테이퍼 주에만, 11–15 °C, 11–15분, 근육통에 작은 효과 (Machado). 온수 욕조는 더운 날씨 레이스 대비용으로만 (Zurawlew). 폼롤러는 워밍업으로 가장 효과적 (Wiewelhove).'],
    },
    note: '규칙은 일반 HYROX 선수를 위해 이 연구들을 단순화한 것입니다. 소규모 또는 다른 종목(예: 축구 선수) 연구 결과는 신중하게 적용합니다.',
  },
};

function SourceItem({ s, all, lang }: { s: SourceRow; all: SourceRow[]; lang: string }) {
  const date = (d: string) => new Date(d).toLocaleDateString(lang === 'nl' ? 'nl-NL' : lang, { day: 'numeric', month: 'long', year: 'numeric' });
  const repl = s.replaced_by ? all.find((r) => r.id === s.replaced_by) : null;
  return (
    <li id={`source-${s.id}`} className="scroll-mt-20 text-sm">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {s.level && <span className="chip">{pt(lang, 'pu.sci.level', { l: s.level })}</span>}
        {s.source_url ? (
          <a href={s.source_url} target="_blank" rel="noreferrer" className="group inline-flex gap-1.5 font-medium hover:text-volt">
            <span>{s.title}</span>
            <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted group-hover:text-volt" aria-hidden />
          </a>
        ) : (
          <span className="font-medium">{s.title}</span>
        )}
      </div>
      <div className="mt-0.5 text-xs text-muted">
        {[s.author, s.checked_at ? pt(lang, 'pu.sci.checked', { date: date(s.checked_at) }) : null].filter(Boolean).join(' · ')}
      </div>
      {s.rule_keys.length > 0 && (
        <div className="mt-0.5 text-xs text-muted">
          {pt(lang, 'pu.sci.rules')}: <span className="stat">{s.rule_keys.join(', ')}</span>
        </div>
      )}
      {s.status === 'archived' && (
        <div className="mt-0.5 text-xs text-muted">
          {[s.archived_at ? pt(lang, 'pu.sci.archivedOn', { date: date(s.archived_at) }) : pt(lang, 'pu.sci.archived'), s.archived_reason ? `${pt(lang, 'pu.sci.reason')}: ${s.archived_reason}` : null].filter(Boolean).join(' · ')}
          {repl && (
            <>
              {' · '}
              {pt(lang, 'pu.sci.replacedBy')}:{' '}
              <a href={`#source-${repl.id}`} className="text-fg underline">
                {repl.title}
              </a>
            </>
          )}
        </div>
      )}
    </li>
  );
}

/** Sources of the databank with level and the rules they support, archived ones at the bottom, and the plan-update changelog. */
function Databank({ lang }: { lang: string }) {
  const sources = useSources();
  const updates = usePlanUpdates();
  const list = sources.data ?? [];
  const active = list.filter((s) => s.status !== 'archived');
  const archived = list.filter((s) => s.status === 'archived');
  const log = updates.data ?? [];
  if (!list.length && !log.length) return null;
  const date = (d: string) => new Date(d).toLocaleDateString(lang === 'nl' ? 'nl-NL' : lang, { day: 'numeric', month: 'long' });
  return (
    <>
      {log.length > 0 && (
        <section id="planupdates" className="panel scroll-mt-20 p-5">
          <h2 className="text-lg font-bold">{pt(lang, 'pu.sci.changelog')}</h2>
          <ul className="mt-3 space-y-1.5 text-sm">
            {log.map((u) => (
              <li key={u.id}>{pt(lang, 'pu.sci.changelogLine', { date: date(u.published_at ?? u.created_at), title: updateTitle(u, lang) })}</li>
            ))}
          </ul>
        </section>
      )}
      {active.length > 0 && (
        <details id="databank" className="panel scroll-mt-20 p-5" open={window.location.hash.startsWith('#source-')}>
          <summary className="cursor-pointer text-lg font-bold">
            {pt(lang, 'pu.sci.databank')} <span className="stat text-sm font-normal text-muted">({active.length})</span>
          </summary>
          {active.some((s) => s.level) && <p className="mt-2 text-sm text-muted">{pt(lang, 'pu.sci.levelNote')}</p>}
          <ul className="mt-3 space-y-3">
            {active.map((s) => (
              <SourceItem key={s.id} s={s} all={list} lang={lang} />
            ))}
          </ul>
        </details>
      )}
      {archived.length > 0 && (
        <section id="archived" className="panel scroll-mt-20 p-5">
          <h2 className="text-lg font-bold">{pt(lang, 'pu.sci.archived')}</h2>
          <ul className="mt-3 space-y-3">
            {archived.map((s) => (
              <SourceItem key={s.id} s={s} all={list} lang={lang} />
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

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
      <Databank lang={lang} />
      <p className="text-xs text-muted">{x.note}</p>
    </div>
  );
}
