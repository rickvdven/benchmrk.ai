// Onderwerpen (topic clusters) voor het gidsenoverzicht en de hubpagina's /<taal>/<gidsmap>/<onderwerp>.
// Een NL-pagina krijgt `topic: <sleutel>` in de frontmatter; vertalingen nemen het onderwerp over via translationOf.
// Intro's bevatten bewust geen getallen: alle feiten staan in de gidsen zelf, met bron.

export const TOPICS = {
  lopen: {
    nl: { slug: 'lopen-en-pacing', label: 'Lopen en pacing', intro: 'Lopen is het grootste deel van je racetijd. Hier lees je hoe je het tempo voor je doeltijd uitrekent, hoe je je drempel bepaalt, hoeveel tempo je tussen de eerste en de laatste run verliest en hoe je je hartslag gebruikt als controle.' },
    en: { slug: 'running-and-pacing', label: 'Running and pacing', intro: 'Running is the biggest part of your race time. Here you learn how to work out the pace for your goal time, how to find your threshold, how much pace you lose between the first and the last run, and how to use your heart rate as a check.' },
    de: { slug: 'laufen-und-pacing', label: 'Laufen und Pacing', intro: 'Laufen ist der größte Teil deiner Rennzeit. Hier liest du, wie du das Tempo für deine Zielzeit ausrechnest, wie du deine Schwelle bestimmst, wie viel Tempo du zwischen dem ersten und dem letzten Lauf verlierst und wie du deine Herzfrequenz zur Kontrolle nutzt.' },
    es: { slug: 'carrera-y-ritmo', label: 'Carrera y ritmo', intro: 'Correr es la mayor parte de tu tiempo de carrera. Aquí aprendes a calcular el ritmo para tu objetivo, a determinar tu umbral, cuánto ritmo pierdes entre la primera y la última carrera y cómo usar tu frecuencia cardiaca como control.' },
    ko: { slug: 'running-and-pacing', label: '달리기와 페이스', intro: '달리기는 레이스 기록에서 가장 큰 부분입니다. 목표 기록에 맞는 페이스 계산, 역치 측정, 첫 번째와 마지막 달리기 사이의 페이스 저하, 심박수를 점검 도구로 쓰는 방법을 다룹니다.' },
  },
  stations: {
    nl: { slug: 'stations', label: 'Stations', intro: 'Per station de techniek, de pacing en de fouten die tijd kosten. Van SkiErg en sleds tot de wall balls aan het eind, plus de Roxzone en de straftijden.' },
    en: { slug: 'stations', label: 'Stations', intro: 'Technique, pacing and the mistakes that cost time, station by station. From the SkiErg and sleds to the wall balls at the end, plus the Roxzone and penalties.' },
    de: { slug: 'stationen', label: 'Stationen', intro: 'Technik, Pacing und die Fehler, die Zeit kosten, Station für Station. Vom SkiErg und den Sleds bis zu den Wall Balls am Ende, dazu die Roxzone und die Strafzeiten.' },
    es: { slug: 'estaciones', label: 'Estaciones', intro: 'Técnica, ritmo y los errores que cuestan tiempo, estación por estación. Del SkiErg y los trineos a los wall balls del final, además de la Roxzone y las penalizaciones.' },
    ko: { slug: 'stations', label: '스테이션', intro: '스테이션별 기술, 페이스, 시간을 잃게 하는 실수를 다룹니다. 스키에르그와 썰매부터 마지막 월볼까지, Roxzone과 페널티도 포함합니다.' },
  },
  opbouw: {
    nl: { slug: 'opbouw-en-schema', label: 'Opbouw en schema', intro: 'Hoe je je weken indeelt naar je doeltijd: hoe lang en hoe vaak je traint, wat voorrang krijgt bij een vast aantal sessies, hoe je sims opbouwt en hoe je na een blessure weer instapt.' },
    en: { slug: 'training-plan-and-build-up', label: 'Plan and build-up', intro: 'How to structure your weeks towards your goal time: how long and how often to train, what gets priority with a fixed number of sessions, how to build sims and how to return after an injury.' },
    de: { slug: 'aufbau-und-trainingsplan', label: 'Aufbau und Plan', intro: 'Wie du deine Wochen auf deine Zielzeit ausrichtest: wie lange und wie oft du trainierst, was bei einer festen Zahl an Einheiten Vorrang hat, wie du Sims aufbaust und wie du nach einer Verletzung wieder einsteigst.' },
    es: { slug: 'plan-y-progresion', label: 'Plan y progresión', intro: 'Cómo organizar tus semanas hacia tu objetivo: cuánto tiempo y cuántas veces entrenar, qué va primero con un número fijo de sesiones, cómo construir simulacros y cómo volver tras una lesión.' },
    ko: { slug: 'training-plan', label: '훈련 계획과 구성', intro: '목표 기록을 향해 주간 훈련을 짜는 방법: 얼마나 오래, 얼마나 자주 훈련할지, 정해진 세션 수에서 무엇을 우선할지, 시뮬레이션 구성과 부상 후 복귀를 다룹니다.' },
  },
  racedag: {
    nl: { slug: 'racedag-en-taper', label: 'Racedag en taper', intro: 'De laatste twee weken en de dag zelf: hoe je tapert, wat je eet en neemt, en hoe je na de race in je splits ziet waar je tijd liet liggen.' },
    en: { slug: 'race-day-and-taper', label: 'Race day and taper', intro: 'The last two weeks and the day itself: how to taper, what to eat and take, and how to read your splits after the race to see where you lost time.' },
    de: { slug: 'wettkampftag-und-tapering', label: 'Wettkampftag und Tapering', intro: 'Die letzten zwei Wochen und der Tag selbst: wie du taperst, was du isst und nimmst und wie du nach dem Rennen in deinen Splits siehst, wo du Zeit verloren hast.' },
    es: { slug: 'dia-de-carrera-y-taper', label: 'Día de carrera y taper', intro: 'Las dos últimas semanas y el día de la carrera: cómo hacer el taper, qué comer y tomar, y cómo leer tus parciales después para ver dónde perdiste tiempo.' },
    ko: { slug: 'race-day-and-taper', label: '레이스 당일과 테이퍼', intro: '마지막 2주와 레이스 당일: 테이퍼 방법, 먹고 섭취할 것, 레이스 후 스플릿에서 시간을 잃은 곳을 찾는 방법을 다룹니다.' },
  },
  races: {
    nl: { slug: 'races', label: 'Races', intro: 'Voorbereiding per race in Nederland en België, met de data uit de officiële kalender en een opbouw die past bij het aantal weken dat je nog hebt.' },
    en: { slug: 'races', label: 'Races', intro: 'Preparation for each race in the Netherlands and Belgium, with dates from the official calendar and a build-up that fits the weeks you have left.' },
    de: { slug: 'rennen', label: 'Rennen', intro: 'Vorbereitung auf die Rennen in den Niederlanden und Belgien, mit den Terminen aus dem offiziellen Kalender und einem Aufbau, der zu den verbleibenden Wochen passt.' },
    es: { slug: 'carreras', label: 'Carreras', intro: 'Preparación para cada carrera en Países Bajos y Bélgica, con las fechas del calendario oficial y una progresión que encaja con las semanas que te quedan.' },
    ko: { slug: 'races', label: '레이스', intro: '네덜란드와 벨기에 대회별 준비 가이드. 공식 일정의 날짜와 남은 주 수에 맞춘 훈련 구성을 담았습니다.' },
  },
};

/** "Start hier": vaste leesvolgorde voor de doelgroep (NL-sleutels). Ontbrekende vertalingen worden overgeslagen. */
export const START_HERE = ['hyrox-tijd-voorspellen', 'gids/hyrox-splits-analyseren', 'gids/runs-pacen', 'gids/vier-trainingen-per-week-doeltijd', 'gids/hyrox-taper', 'gids/voeding-en-cafeine-op-racedag'];
