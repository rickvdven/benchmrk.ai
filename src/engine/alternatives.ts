import { rulesOf } from './rules';
import { addDays, fmtMmss } from './time';
import { z2Cap } from './zones';
import { injuryProfile } from './injury';
import { weekOf } from './plan';
import type { Lang, Profile, Session, Week } from './types';

/**
 * "My session can't go ahead as planned" → two alternatives with the reasoning, and which one we recommend.
 * Theory: specificity (running on pre-fatigued legs) vs. aerobic volume (strongest predictor of HYROX time, Brandt et al. 2025).
 */
export interface AltOption {
  key: string;
  session: Session;
  why: string;
}
export interface Alternatives {
  options: AltOption[];
  recommended: string;
  advice: string;
  note?: string;
}

type D = Record<string, string>;
const T: Record<Lang, D> = {
  en: {
    bwTitle: 'Bodyweight compromised run · {r} rounds',
    bwDesc: 'Warm-up 10 min easy. Then {r} rounds: {dist} m at ~{pace}/km straight into one bodyweight station, rotating:\n• 10 burpee broad jumps (SkiErg/burpees)\n• 20 m bear crawl + 10 push-ups (sled push)\n• 20 walking lunges (lunges)\n• 25 air squats or jump squats (wall balls)\n• 30 mountain climbers (row/ski)\nNo rest between run and station. Cool-down 10 min.',
    bwSoft: '\nAchilles/foot: swap jumps for step-back burpees and air squats.',
    bwWhy: 'Keeps what makes a sim valuable: running on legs that are already tired from station-like work (specificity). Without weights the strength part is lighter, the running-under-fatigue part stays.',
    longTitle: 'Long aerobic run · {km} km',
    longDesc: '{km} km in Zone 2 (HR ≤ {cap}), about as long as the sim would have taken.{rp}',
    longRp: ' Last 2 km at race pace {pace}/km to practise running fast on tired legs.',
    longWhy: 'Aerobic capacity and running volume are the strongest predictors of HYROX time (Brandt et al. 2025). A sim is one of the longest sessions of your week, so a long easy run keeps that volume — but you skip the station-to-run transitions.',
    bikeTitle: 'Long low-impact cardio · 75 min',
    bikeDesc: '75 min bike or cross-trainer in Zone 2 (HR ≤ {cap}). Same aerobic volume without running impact.',
    bikeWhy: 'You marked a running injury as current, so the volume moves to low-impact cardio.',
    recSpecific: 'Recommended: the bodyweight compromised run. You are in the race-specific phase — practising running under fatigue matters most now.',
    recVolume: 'Recommended: the long run. You are still building the base; aerobic volume pays off more than station practice right now.',
    recAdjLong: 'Recommended: the bodyweight compromised run, because there is already a long run {when} — two long runs back to back adds impact without extra benefit.',
    recInjury: 'Recommended: low-impact cardio — a current running injury rules out extra running volume.',
    recRunner: 'Recommended: the bodyweight compromised run. As a runner, stations are your limiter; a long run trains what you are already good at.',
    recStrength: 'Recommended: the long run. With a strength background, the running engine is your limiter.',
    whenPrev: 'the day before', whenNext: 'the day after',
    bench: 'This was benchmark {n}. It moves to your next sim; the alternative does not count as a benchmark.',
    hsTitle: 'Home station strength (no gym)', hsDesc: '3–4 rounds, 60 s rest:\n• 12 Bulgarian split squats each leg (backpack if you have one)\n• 15 push-ups\n• 20 m bear crawl\n• 15 backpack rows\n• 20 walking lunges\n• 45 s plank + 10 Copenhagen each side',
    hsWhy: 'Keeps the strength stimulus for your stations with what you have at home. Fewer kilos, so go for more reps and slower tempo.',
    erTitle: 'Easy run + core', erDesc: '{km} km in Zone 2 (HR ≤ {cap}) + 10 min core (plank, dead bugs, side plank).',
    erWhy: 'If strength is not possible, extra aerobic volume is the next most useful thing for HYROX.',
    recHome: 'Recommended: home station strength — skipping strength repeatedly costs the most on sleds and lunges.',
    fkTitle: 'Fartlek by feel', fkDesc: 'Same structure as planned ({reps}) but by time and feel on any road: hard parts at RPE 7–8 / HR ≤ {cap}, easy jog in between.',
    fkWhy: 'No track or flat route? Threshold training works by effort as well as by pace — the stimulus is the time spent near threshold.',
    ergTitle: 'Erg / bike threshold intervals', ergDesc: '5 × 6 min on rower, SkiErg or bike at RPE 7–8 (HR ≤ {cap}), 2 min easy between.',
    ergWhy: 'Same threshold stimulus without running — useful with a running niggle or bad weather.',
    recFartlek: 'Recommended: fartlek — running stays the most specific threshold work for HYROX.',
    recErg: 'Recommended: the erg/bike version — a current running injury makes running intervals unwise.',
    splitTitle: 'Two shorter runs', splitDesc: '2 × {km} km in Zone 2 (HR ≤ {cap}), e.g. morning and evening.',
    splitWhy: 'Most of the aerobic benefit comes from total time in Zone 2, so splitting the distance keeps most of it.',
    lcTitle: 'Low-impact long session', lcDesc: '{min} min bike or cross-trainer in Zone 2 (HR ≤ {cap}).',
    lcWhy: 'Same aerobic time without running impact.',
    recSplit: 'Recommended: two shorter runs — you keep the running-specific volume.',
  },
  nl: {
    bwTitle: 'Bodyweight compromised run · {r} rondes',
    bwDesc: 'Warming-up 10 min rustig. Dan {r} rondes: {dist} m op ~{pace}/km direct gevolgd door één bodyweight-station, wisselend:\n• 10 burpee broad jumps (SkiErg/burpees)\n• 20 m bear crawl + 10 push-ups (sled push)\n• 20 walking lunges (lunges)\n• 25 air squats of jump squats (wall balls)\n• 30 mountain climbers (roeien/ski)\nGeen rust tussen run en station. Cooling-down 10 min.',
    bwSoft: '\nAchilles/voet: vervang sprongen door step-back burpees en air squats.',
    bwWhy: 'Behoudt wat een sim waardevol maakt: hardlopen op benen die al moe zijn van stationachtig werk (specificiteit). Zonder gewichten is het krachtdeel lichter, het lopen-onder-vermoeidheid blijft.',
    longTitle: 'Lange duurloop · {km} km',
    longDesc: '{km} km in zone 2 (HS ≤ {cap}), ongeveer zo lang als de sim had geduurd.{rp}',
    longRp: ' Laatste 2 km op racetempo {pace}/km om snel lopen op vermoeide benen te oefenen.',
    longWhy: 'Aerobe capaciteit en loopvolume voorspellen je HYROX-tijd het sterkst (Brandt et al. 2025). Een sim is een van je langste trainingen van de week; een lange rustige duurloop behoudt dat volume — maar je mist de overgangen van station naar run.',
    bikeTitle: 'Lange low-impact cardio · 75 min',
    bikeDesc: '75 min fietsen of crosstrainer in zone 2 (HS ≤ {cap}). Zelfde aerobe volume zonder loopbelasting.',
    bikeWhy: 'Je hebt een loopblessure als actueel aangegeven, dus het volume gaat naar low-impact cardio.',
    recSpecific: 'Advies: de bodyweight compromised run. Je zit in de racespecifieke fase — lopen onder vermoeidheid oefenen telt nu het meest.',
    recVolume: 'Advies: de lange duurloop. Je bouwt nog aan je basis; aeroob volume levert nu meer op dan stationtraining.',
    recAdjLong: 'Advies: de bodyweight compromised run, want er staat al een duurloop {when} — twee lange runs achter elkaar geeft extra belasting zonder extra winst.',
    recInjury: 'Advies: low-impact cardio — met een actuele loopblessure is extra loopvolume niet verstandig.',
    recRunner: 'Advies: de bodyweight compromised run. Als loper zijn stations je beperking; een lange duurloop traint wat je al goed kunt.',
    recStrength: 'Advies: de lange duurloop. Met een krachtachtergrond is je loopmotor de beperking.',
    whenPrev: 'de dag ervoor', whenNext: 'de dag erna',
    bench: 'Dit was benchmark {n}. Die schuift naar je volgende sim; het alternatief telt niet als benchmark.',
    hsTitle: 'Stationkracht thuis (geen gym)', hsDesc: '3–4 rondes, 60 s rust:\n• 12 Bulgarian split squats per been (met rugzak als je die hebt)\n• 15 push-ups\n• 20 m bear crawl\n• 15 rows met rugzak\n• 20 walking lunges\n• 45 s plank + 10 Copenhagen per kant',
    hsWhy: 'Behoudt de krachtprikkel voor je stations met wat je thuis hebt. Minder kilo’s, dus meer herhalingen en langzamer tempo.',
    erTitle: 'Rustige duurloop + core', erDesc: '{km} km in zone 2 (HS ≤ {cap}) + 10 min core (plank, dead bugs, side plank).',
    erWhy: 'Als kracht niet lukt, is extra aeroob volume het op één na nuttigste voor HYROX.',
    recHome: 'Advies: stationkracht thuis — kracht vaker overslaan kost het meest op sleds en lunges.',
    fkTitle: 'Fartlek op gevoel', fkDesc: 'Zelfde opbouw als gepland ({reps}) maar op tijd en gevoel op elke weg: harde stukken op RPE 7–8 / HS ≤ {cap}, rustig dribbelen ertussen.',
    fkWhy: 'Geen baan of vlak parcours? Drempeltraining werkt ook op inspanning — de prikkel is de tijd rond je drempel.',
    ergTitle: 'Drempelintervallen op erg of fiets', ergDesc: '5 × 6 min op roeier, SkiErg of fiets op RPE 7–8 (HS ≤ {cap}), 2 min rustig ertussen.',
    ergWhy: 'Zelfde drempelprikkel zonder hardlopen — handig bij een loopklacht of slecht weer.',
    recFartlek: 'Advies: fartlek — hardlopen blijft het meest specifieke drempelwerk voor HYROX.',
    recErg: 'Advies: de erg/fiets-versie — met een actuele loopblessure zijn loopintervallen niet verstandig.',
    splitTitle: 'Twee kortere runs', splitDesc: '2 × {km} km in zone 2 (HS ≤ {cap}), bijv. ochtend en avond.',
    splitWhy: 'Het grootste deel van de aerobe winst komt uit de totale tijd in zone 2, dus opsplitsen behoudt het meeste.',
    lcTitle: 'Lange low-impact sessie', lcDesc: '{min} min fietsen of crosstrainer in zone 2 (HS ≤ {cap}).',
    lcWhy: 'Zelfde aerobe tijd zonder loopbelasting.',
    recSplit: 'Advies: twee kortere runs — je behoudt het loopspecifieke volume.',
  },
  de: {
    bwTitle: 'Bodyweight Compromised Run · {r} Runden',
    bwDesc: '10 Min. locker einlaufen. Dann {r} Runden: {dist} m in ~{pace}/km direkt in eine Bodyweight-Station, abwechselnd:\n• 10 Burpee Broad Jumps (SkiErg/Burpees)\n• 20 m Bear Crawl + 10 Liegestütze (Sled Push)\n• 20 Walking Lunges (Lunges)\n• 25 Air Squats oder Jump Squats (Wall Balls)\n• 30 Mountain Climbers (Rudern/Ski)\nKeine Pause zwischen Lauf und Station. 10 Min. auslaufen.',
    bwSoft: '\nAchilles/Fuß: Sprünge durch Step-back-Burpees und Air Squats ersetzen.',
    bwWhy: 'Behält das Wertvolle einer Sim: Laufen mit Beinen, die von stationsähnlicher Arbeit schon müde sind (Spezifität). Ohne Gewichte ist der Kraftteil leichter, das Laufen unter Ermüdung bleibt.',
    longTitle: 'Langer Dauerlauf · {km} km',
    longDesc: '{km} km in Zone 2 (HF ≤ {cap}), etwa so lang wie die Sim gedauert hätte.{rp}',
    longRp: ' Letzte 2 km im Renntempo {pace}/km, um schnelles Laufen auf müden Beinen zu üben.',
    longWhy: 'Aerobe Kapazität und Laufumfang sagen die HYROX-Zeit am stärksten voraus (Brandt et al. 2025). Die Sim ist eine der längsten Einheiten; ein langer lockerer Lauf hält den Umfang — aber die Übergänge Station → Lauf fehlen.',
    bikeTitle: 'Langes gelenkschonendes Cardio · 75 Min.',
    bikeDesc: '75 Min. Rad oder Crosstrainer in Zone 2 (HF ≤ {cap}). Gleicher aerober Umfang ohne Laufbelastung.',
    bikeWhy: 'Du hast eine aktuelle Laufverletzung angegeben, daher geht der Umfang ins gelenkschonende Cardio.',
    recSpecific: 'Empfehlung: der Bodyweight Compromised Run. Du bist in der rennspezifischen Phase — Laufen unter Ermüdung zählt jetzt am meisten.',
    recVolume: 'Empfehlung: der lange Lauf. Du baust noch die Basis auf; aerober Umfang bringt jetzt mehr als Stationstraining.',
    recAdjLong: 'Empfehlung: der Bodyweight Compromised Run, denn {when} steht schon ein langer Lauf — zwei lange Läufe hintereinander bringen nur mehr Belastung.',
    recInjury: 'Empfehlung: gelenkschonendes Cardio — mit aktueller Laufverletzung kein zusätzlicher Laufumfang.',
    recRunner: 'Empfehlung: der Bodyweight Compromised Run. Als Läufer sind Stationen dein Engpass.',
    recStrength: 'Empfehlung: der lange Lauf. Mit Kraftsport-Hintergrund ist dein Laufmotor der Engpass.',
    whenPrev: 'am Tag davor', whenNext: 'am Tag danach',
    bench: 'Das war Benchmark {n}. Er rückt zur nächsten Sim; die Alternative zählt nicht als Benchmark.',
    hsTitle: 'Stationskraft zuhause (kein Gym)', hsDesc: '3–4 Runden, 60 s Pause:\n• 12 Bulgarian Split Squats pro Bein (mit Rucksack)\n• 15 Liegestütze\n• 20 m Bear Crawl\n• 15 Rucksack-Rudern\n• 20 Walking Lunges\n• 45 s Plank + 10 Copenhagen pro Seite',
    hsWhy: 'Hält den Kraftreiz für die Stationen mit dem, was du zuhause hast. Weniger Kilo, also mehr Wiederholungen und langsameres Tempo.',
    erTitle: 'Lockerer Lauf + Core', erDesc: '{km} km in Zone 2 (HF ≤ {cap}) + 10 Min. Core (Plank, Dead Bugs, Side Plank).',
    erWhy: 'Wenn Kraft nicht geht, ist zusätzlicher aerober Umfang das Zweitnützlichste für HYROX.',
    recHome: 'Empfehlung: Stationskraft zuhause — Kraft öfter auszulassen kostet am meisten bei Sleds und Lunges.',
    fkTitle: 'Fahrtspiel nach Gefühl', fkDesc: 'Gleicher Aufbau wie geplant ({reps}), aber nach Zeit und Gefühl: harte Abschnitte bei RPE 7–8 / HF ≤ {cap}, locker dazwischen.',
    fkWhy: 'Keine Bahn oder flache Strecke? Schwellentraining wirkt auch nach Anstrengung — der Reiz ist die Zeit nahe der Schwelle.',
    ergTitle: 'Schwellenintervalle auf Ergometer oder Rad', ergDesc: '5 × 6 Min. auf Ruderergometer, SkiErg oder Rad bei RPE 7–8 (HF ≤ {cap}), 2 Min. locker dazwischen.',
    ergWhy: 'Gleicher Schwellenreiz ohne Laufen — sinnvoll bei Laufbeschwerden oder schlechtem Wetter.',
    recFartlek: 'Empfehlung: Fahrtspiel — Laufen bleibt die spezifischste Schwellenarbeit für HYROX.',
    recErg: 'Empfehlung: die Ergometer-/Rad-Version — mit aktueller Laufverletzung keine Laufintervalle.',
    splitTitle: 'Zwei kürzere Läufe', splitDesc: '2 × {km} km in Zone 2 (HF ≤ {cap}), z. B. morgens und abends.',
    splitWhy: 'Der aerobe Nutzen kommt vor allem aus der Gesamtzeit in Zone 2, Aufteilen erhält das meiste.',
    lcTitle: 'Lange gelenkschonende Einheit', lcDesc: '{min} Min. Rad oder Crosstrainer in Zone 2 (HF ≤ {cap}).',
    lcWhy: 'Gleiche aerobe Zeit ohne Laufbelastung.',
    recSplit: 'Empfehlung: zwei kürzere Läufe — der laufspezifische Umfang bleibt.',
  },
  es: {
    bwTitle: 'Compromised run sin peso · {r} rondas',
    bwDesc: 'Calentamiento 10 min suave. Luego {r} rondas: {dist} m a ~{pace}/km y directo a una estación sin peso, alternando:\n• 10 burpee broad jumps (SkiErg/burpees)\n• 20 m bear crawl + 10 flexiones (sled push)\n• 20 zancadas (lunges)\n• 25 sentadillas o sentadillas con salto (wall balls)\n• 30 mountain climbers (remo/ski)\nSin descanso entre carrera y estación. Vuelta a la calma 10 min.',
    bwSoft: '\nAquiles/pie: cambia los saltos por burpees sin salto y sentadillas.',
    bwWhy: 'Mantiene lo valioso de un sim: correr con piernas ya cansadas por trabajo tipo estación (especificidad). Sin peso la parte de fuerza es menor; correr con fatiga se mantiene.',
    longTitle: 'Tirada larga aeróbica · {km} km',
    longDesc: '{km} km en zona 2 (FC ≤ {cap}), más o menos lo que habría durado el sim.{rp}',
    longRp: ' Últimos 2 km a ritmo de carrera {pace}/km para practicar correr rápido con piernas cansadas.',
    longWhy: 'La capacidad aeróbica y el volumen de carrera son los mejores predictores del tiempo HYROX (Brandt et al. 2025). El sim es de las sesiones más largas; una tirada larga suave mantiene ese volumen — pero sin transiciones estación → carrera.',
    bikeTitle: 'Cardio largo de bajo impacto · 75 min',
    bikeDesc: '75 min bici o elíptica en zona 2 (FC ≤ {cap}). Mismo volumen aeróbico sin impacto.',
    bikeWhy: 'Marcaste una lesión de carrera actual, así que el volumen pasa a cardio de bajo impacto.',
    recSpecific: 'Recomendado: el compromised run sin peso. Estás en la fase específica — practicar correr con fatiga es lo que más cuenta ahora.',
    recVolume: 'Recomendado: la tirada larga. Aún construyes la base; el volumen aeróbico rinde más que practicar estaciones.',
    recAdjLong: 'Recomendado: el compromised run sin peso, porque ya hay una tirada larga {when} — dos tiradas largas seguidas solo añaden impacto.',
    recInjury: 'Recomendado: cardio de bajo impacto — con una lesión de carrera actual no conviene más volumen corriendo.',
    recRunner: 'Recomendado: el compromised run sin peso. Como corredor, las estaciones son tu límite.',
    recStrength: 'Recomendado: la tirada larga. Con base de fuerza, tu motor de carrera es el límite.',
    whenPrev: 'el día anterior', whenNext: 'el día siguiente',
    bench: 'Esto era el benchmark {n}. Pasa a tu próximo sim; la alternativa no cuenta como benchmark.',
    hsTitle: 'Fuerza de estaciones en casa (sin gimnasio)', hsDesc: '3–4 rondas, 60 s de descanso:\n• 12 sentadillas búlgaras por pierna (con mochila)\n• 15 flexiones\n• 20 m bear crawl\n• 15 remos con mochila\n• 20 zancadas\n• 45 s plancha + 10 Copenhagen por lado',
    hsWhy: 'Mantiene el estímulo de fuerza para las estaciones con lo que tienes en casa. Menos kilos: más repeticiones y tempo lento.',
    erTitle: 'Rodaje suave + core', erDesc: '{km} km en zona 2 (FC ≤ {cap}) + 10 min de core (plancha, dead bugs, plancha lateral).',
    erWhy: 'Si no puedes hacer fuerza, más volumen aeróbico es lo siguiente más útil para HYROX.',
    recHome: 'Recomendado: fuerza en casa — saltarse la fuerza a menudo es lo que más cuesta en trineos y zancadas.',
    fkTitle: 'Fartlek por sensaciones', fkDesc: 'Misma estructura ({reps}) pero por tiempo y sensación: partes duras a RPE 7–8 / FC ≤ {cap}, trote suave entre medias.',
    fkWhy: '¿Sin pista ni recorrido llano? El umbral también funciona por esfuerzo — el estímulo es el tiempo cerca del umbral.',
    ergTitle: 'Intervalos umbral en ergómetro o bici', ergDesc: '5 × 6 min en remo, SkiErg o bici a RPE 7–8 (FC ≤ {cap}), 2 min suave entre medias.',
    ergWhy: 'Mismo estímulo umbral sin correr — útil con molestias o mal tiempo.',
    recFartlek: 'Recomendado: fartlek — correr sigue siendo el trabajo umbral más específico para HYROX.',
    recErg: 'Recomendado: la versión en ergómetro/bici — con una lesión actual no conviene hacer series corriendo.',
    splitTitle: 'Dos carreras más cortas', splitDesc: '2 × {km} km en zona 2 (FC ≤ {cap}), p. ej. mañana y tarde.',
    splitWhy: 'La mayor parte del beneficio aeróbico viene del tiempo total en zona 2; dividir conserva casi todo.',
    lcTitle: 'Sesión larga de bajo impacto', lcDesc: '{min} min bici o elíptica en zona 2 (FC ≤ {cap}).',
    lcWhy: 'Mismo tiempo aeróbico sin impacto.',
    recSplit: 'Recomendado: dos carreras más cortas — mantienes el volumen específico de carrera.',
  },
  ko: {
    bwTitle: '맨몸 컴프로마이즈드 런 · {r}라운드',
    bwDesc: '10분 가볍게 워밍업. 이어서 {r}라운드: {dist} m를 ~{pace}/km로 달리고 바로 맨몸 스테이션 하나, 순환:\n• 버피 브로드 점프 10회 (SkiErg/버피)\n• 베어 크롤 20 m + 푸시업 10회 (슬레드 푸시)\n• 워킹 런지 20회 (런지)\n• 에어 스쿼트 또는 점프 스쿼트 25회 (월볼)\n• 마운틴 클라이머 30회 (로잉/스키)\n러닝과 스테이션 사이 휴식 없음. 10분 쿨다운.',
    bwSoft: '\n아킬레스/발: 점프 대신 스텝백 버피와 에어 스쿼트.',
    bwWhy: '시뮬의 핵심을 유지합니다: 스테이션 같은 운동으로 이미 지친 다리로 달리기 (특이성). 무게가 없어 근력 부분은 가볍지만, 피로 상태의 러닝은 그대로입니다.',
    longTitle: '장거리 유산소 러닝 · {km} km',
    longDesc: '{km} km 2존 (심박수 ≤ {cap}), 시뮬과 비슷한 시간.{rp}',
    longRp: ' 마지막 2 km는 레이스 페이스 {pace}/km로 지친 다리로 빠르게 달리기를 연습.',
    longWhy: '유산소 능력과 러닝 볼륨이 HYROX 기록의 가장 강한 예측 인자입니다 (Brandt et al. 2025). 시뮬은 주간 가장 긴 세션 중 하나라 장거리 이지런으로 볼륨을 유지할 수 있지만, 스테이션→러닝 전환은 빠집니다.',
    bikeTitle: '장시간 저충격 유산소 · 75분',
    bikeDesc: '자전거 또는 크로스트레이너 75분 2존 (심박수 ≤ {cap}). 러닝 충격 없이 같은 유산소 볼륨.',
    bikeWhy: '현재 러닝 부상이 있어 볼륨을 저충격 유산소로 옮깁니다.',
    recSpecific: '추천: 맨몸 컴프로마이즈드 런. 레이스 특화 단계이므로 피로 상태의 러닝 연습이 가장 중요합니다.',
    recVolume: '추천: 장거리 러닝. 아직 베이스 단계라 스테이션 연습보다 유산소 볼륨이 더 효과적입니다.',
    recAdjLong: '추천: 맨몸 컴프로마이즈드 런. {when}에 이미 장거리 러닝이 있어 연속 장거리는 부담만 늘립니다.',
    recInjury: '추천: 저충격 유산소 — 현재 러닝 부상으로 러닝 볼륨 추가는 바람직하지 않습니다.',
    recRunner: '추천: 맨몸 컴프로마이즈드 런. 러너에게는 스테이션이 약점입니다.',
    recStrength: '추천: 장거리 러닝. 근력 배경이 있다면 러닝 엔진이 약점입니다.',
    whenPrev: '전날', whenNext: '다음 날',
    bench: '벤치마크 {n}이었습니다. 다음 시뮬로 옮겨지며, 대체 훈련은 벤치마크로 계산되지 않습니다.',
    hsTitle: '홈 스테이션 근력 (헬스장 없음)', hsDesc: '3–4라운드, 60초 휴식:\n• 불가리안 스플릿 스쿼트 다리당 12회 (배낭 사용)\n• 푸시업 15회\n• 베어 크롤 20 m\n• 배낭 로우 15회\n• 워킹 런지 20회\n• 플랭크 45초 + 코펜하겐 측당 10회',
    hsWhy: '집에 있는 것으로 스테이션 근력 자극을 유지합니다. 무게가 적으니 반복을 늘리고 템포를 느리게.',
    erTitle: '이지런 + 코어', erDesc: '{km} km 2존 (심박수 ≤ {cap}) + 코어 10분 (플랭크, 데드버그, 사이드 플랭크).',
    erWhy: '근력이 불가능하면 추가 유산소 볼륨이 HYROX에 그다음으로 유용합니다.',
    recHome: '추천: 홈 스테이션 근력 — 근력을 자주 거르면 슬레드와 런지에서 가장 손해를 봅니다.',
    fkTitle: '감각 파틀렉', fkDesc: '계획과 같은 구성({reps})을 시간과 감각으로: 강한 구간 RPE 7–8 / 심박수 ≤ {cap}, 사이는 가볍게 조깅.',
    fkWhy: '트랙이나 평지가 없나요? 역치 훈련은 노력도로도 효과가 있습니다 — 핵심은 역치 근처에서 보낸 시간.',
    ergTitle: '에르그/자전거 역치 인터벌', ergDesc: '로잉, SkiErg 또는 자전거 6분 × 5회 RPE 7–8 (심박수 ≤ {cap}), 사이 2분 가볍게.',
    ergWhy: '러닝 없이 같은 역치 자극 — 러닝 통증이나 악천후에 유용.',
    recFartlek: '추천: 파틀렉 — HYROX에는 러닝이 가장 특화된 역치 훈련입니다.',
    recErg: '추천: 에르그/자전거 버전 — 현재 러닝 부상으로 러닝 인터벌은 피하세요.',
    splitTitle: '짧은 러닝 두 번', splitDesc: '{km} km × 2회 2존 (심박수 ≤ {cap}), 예: 아침과 저녁.',
    splitWhy: '유산소 효과의 대부분은 2존 총 시간에서 오므로 나눠도 대부분 유지됩니다.',
    lcTitle: '장시간 저충격 세션', lcDesc: '자전거 또는 크로스트레이너 {min}분 2존 (심박수 ≤ {cap}).',
    lcWhy: '러닝 충격 없이 같은 유산소 시간.',
    recSplit: '추천: 짧은 러닝 두 번 — 러닝 특화 볼륨을 유지합니다.',
  },
};
const tr = (l: Lang, k: string, p: Record<string, string | number> = {}) => ((T[l] ?? T.en)[k] ?? T.en[k]).replace(/\{(\w+)\}/g, (_, x) => String(p[x] ?? ''));

export function alternativesFor(s: Session, p: Profile, weeks: Week[], lang: Lang): Alternatives | null {
  const a = p.athlete;
  const rs = rulesOf(p);
  const cap = z2Cap(a.lthr, a.maxHr, rs);
  const inj = injuryProfile(a.flags, rs);
  const injured = inj.runLoad === 'now';
  const week = weekOf(weeks, s.date);
  const phase = week?.phase ?? 'base';
  const specific = phase === 'compromised' || phase === 'peak';
  const all = weeks.flatMap((w) => w.sessions);
  const base = { id: s.date, date: s.date, dow: s.dow, alt: true, altOf: s.title } as Partial<Session>;
  const easyPace = Math.round(a.thresholdPaceSec * rs.pace.easyFactor);
  const mk = (o: Partial<Session>) => ({ ...base, ...o }) as Session;

  if (s.type === 'sim') {
    const rounds = phase === 'prep' || phase === 'base' || phase === 'taper' ? 4 : phase === 'threshold' ? 6 : 8;
    const dist = phase === 'threshold' ? 500 : phase === 'prep' || phase === 'base' ? 1000 : phase === 'taper' ? 500 : 800;
    const pace = s.targetPaceSec ?? a.thresholdPaceSec + 20;
    const soft = inj.inj.achilles === 'now' || inj.inj.plantar === 'now';
    const bw = mk({
      type: 'sim',
      title: tr(lang, 'bwTitle', { r: rounds }),
      description: tr(lang, 'bwDesc', { r: rounds, dist, pace: fmtMmss(pace) }) + (soft ? tr(lang, 'bwSoft') : ''),
      targetPaceSec: pace,
      rpe: s.rpe ?? '8/10',
      km: Math.round((rounds * dist) / 1000 + 3),
    });
    const km = Math.max(8, Math.min(18, Math.round((70 * 60) / easyPace)));
    const long = injured
      ? mk({ type: 'recovery', title: tr(lang, 'bikeTitle'), description: tr(lang, 'bikeDesc', { cap }), hrCap: cap })
      : mk({
          type: 'long',
          title: tr(lang, 'longTitle', { km }),
          description: tr(lang, 'longDesc', { km, cap, rp: specific ? tr(lang, 'longRp', { pace: fmtMmss(pace) }) : '' }),
          hrCap: cap,
          targetPaceSec: easyPace,
          km,
        });
    const prev = all.find((x) => x.date === addDays(s.date, -1));
    const next = all.find((x) => x.date === addDays(s.date, 1));
    let rec: 'bw' | 'long';
    let advice: string;
    if (injured) [rec, advice] = ['long', tr(lang, 'recInjury')];
    else if (prev?.type === 'long' || next?.type === 'long') [rec, advice] = ['bw', tr(lang, 'recAdjLong', { when: prev?.type === 'long' ? tr(lang, 'whenPrev') : tr(lang, 'whenNext') })];
    else if (specific) [rec, advice] = ['bw', tr(lang, 'recSpecific')];
    else if (a.archetype === 'fast_runner') [rec, advice] = ['bw', tr(lang, 'recRunner')];
    else if (a.archetype === 'strength') [rec, advice] = ['long', tr(lang, 'recStrength')];
    else [rec, advice] = ['long', tr(lang, 'recVolume')];
    return {
      options: [
        { key: 'bw', session: bw, why: tr(lang, 'bwWhy') },
        { key: 'long', session: long, why: injured ? tr(lang, 'bikeWhy') : tr(lang, 'longWhy') },
      ],
      recommended: rec,
      advice,
      note: s.benchmark ? tr(lang, 'bench', { n: s.benchmark }) : undefined,
    };
  }
  if (s.type === 'strength') {
    const km = 6;
    return {
      options: [
        { key: 'home', session: mk({ type: 'strength', title: tr(lang, 'hsTitle'), description: tr(lang, 'hsDesc'), rpe: '7/10', focusStations: s.focusStations }), why: tr(lang, 'hsWhy') },
        injured
          ? { key: 'run', session: mk({ type: 'recovery', title: tr(lang, 'lcTitle'), description: tr(lang, 'lcDesc', { min: 45, cap }), hrCap: cap }), why: tr(lang, 'lcWhy') }
          : { key: 'run', session: mk({ type: 'easy', title: tr(lang, 'erTitle'), description: tr(lang, 'erDesc', { km, cap }), hrCap: cap, km, targetPaceSec: easyPace }), why: tr(lang, 'erWhy') },
      ],
      recommended: 'home',
      advice: tr(lang, 'recHome'),
    };
  }
  if (s.type === 'threshold' || s.type === 'intervals') {
    const reps = s.title.split(':').slice(1).join(':').trim() || s.title;
    return {
      options: [
        { key: 'fartlek', session: mk({ type: s.type, title: tr(lang, 'fkTitle'), description: tr(lang, 'fkDesc', { reps, cap: s.hrCap ?? cap }), hrCap: s.hrCap, rpe: '7–8/10', km: s.km }), why: tr(lang, 'fkWhy') },
        { key: 'erg', session: mk({ type: s.type, title: tr(lang, 'ergTitle'), description: tr(lang, 'ergDesc', { cap: s.hrCap ?? cap }), hrCap: s.hrCap, rpe: '7–8/10' }), why: tr(lang, 'ergWhy') },
      ],
      recommended: injured ? 'erg' : 'fartlek',
      advice: injured ? tr(lang, 'recErg') : tr(lang, 'recFartlek'),
      note: s.benchmark ? tr(lang, 'bench', { n: s.benchmark }) : undefined,
    };
  }
  if (s.type === 'long' || s.type === 'easy') {
    const km = Math.max(3, Math.round((s.km ?? 8) / 2));
    const min = Math.round(((s.km ?? 8) * easyPace) / 60 * 1.2);
    return {
      options: [
        { key: 'split', session: mk({ type: s.type, title: tr(lang, 'splitTitle'), description: tr(lang, 'splitDesc', { km, cap }), hrCap: cap, km: km * 2, targetPaceSec: easyPace }), why: tr(lang, 'splitWhy') },
        { key: 'low', session: mk({ type: 'recovery', title: tr(lang, 'lcTitle'), description: tr(lang, 'lcDesc', { min, cap }), hrCap: cap }), why: tr(lang, 'lcWhy') },
      ],
      recommended: injured ? 'low' : 'split',
      advice: injured ? tr(lang, 'recInjury') : tr(lang, 'recSplit'),
    };
  }
  return null;
}
