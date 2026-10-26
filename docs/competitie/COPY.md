# Competitie en deelbare elementen: teksten fase 1 en 2

Versie 3 · 26 oktober 2026 · NL en EN. DE, ES en KO volgen later; houd voor die talen dezelfde sleutels aan.

**Bronnen:**

- Plan "Competitie en deelbare elementen": https://claude.ai/artifact/6RyDkW5xnNw2Z48ngtoeKY
- Het goedgekeurde design: `claude/competitie/DESIGN.md` en `claude/competitie/reference/` (in de repo onder `docs/competitie/`)
- `claude/competitie/PROMPTS.md`

**Versie 3:** gecontroleerd tegen de designbestanden zoals die in de repo staan; ontbrekende sleutels toegevoegd en placeholders aangescherpt.

**Versie 2:** alle teksten zijn langs de referentieschermen gelegd. Elke zichtbare tekst in het design heeft nu een sleutel. Waar het design en versie 1 verschilden, is gekozen wat het beste werkt. Die keuzes staan in de laatste sectie, onder "Afwijkingen van de referentie-HTML". Volgens DESIGN.md is dit bestand leidend.

## Afspraken

**Toon**

- Jij-vorm, direct en nuchter.
- Getallen boven bijvoeglijke naamwoorden.
- Geen uitroeptekens en geen emoji.
- Knoppen in de gebiedende wijs ("Kopieer link", "Foto toevoegen").
- Een melding begint met wat er aan de hand is en eindigt met wat je kunt doen.

**Placeholders** staan tussen accolades. Gebruik ze precies zo:

| Placeholder | Betekenis | Voorbeeld |
|---|---|---|
| `{name}` | bijnaam | lunge_lotte |
| `{division}` | divisie, kort (zie hieronder) | Open · Women |
| `{divisionFull}` | divisie, voluit | Open Women |
| `{time}` | voorspelde eindtijd | 1:18:41 |
| `{goal}` | streeftijd | 1:20:00 |
| `{chance}` | kans, getal zonder %-teken | 83 |
| `{chanceOld}`, `{chanceNew}` | kans voor en na een benchmark | 74, 83 |
| `{runs}`, `{stations}`, `{roxzone}` | splits | 42:24 |
| `{n}` | nummer of aantal | 2 |
| `{old}`, `{new}` | vorige en nieuwe tijd of resultaat | 14:32, 13:46 |
| `{delta}` | verschil, met minteken (U+2212) | −0:46 |
| `{start}` | voorspelde tijd in week 1 | 1:22:05 |
| `{week}` | weeknummer: van het plan op kaarten, kalenderweek bij een challenge | 9, 44 |
| `{weeks}` | aantal weken | 16 |
| `{total}` | totaal aantal weken van het plan | 16 |
| `{score}` | score 0–100 | 64 |
| `{a}`, `{b}` | deelscores progressie en op schema | 41, 23 |
| `{rank}` | plaats | 4 |
| `{gym}` | gymnaam | Voorbeeldgym Amsterdam |
| `{month}` | maandnaam | oktober |
| `{year}` | jaar | 2026 |
| `{date}` | datum en tijd, kort | 26 okt · 05:00 |
| `{race}` | race | Amsterdam 2027 |
| `{name_ch}` | naam van de challenge | 1 km tijdrit |
| `{short_ch}` | korte naam van de challenge, voor het linkvoorbeeld | 1 km |
| `{task}` | opdracht van de challenge | Loop 1 km zo snel mogelijk. |
| `{result}` | challengeresultaat, met eenheid waar nodig | 3:58 · 68 herhalingen |
| `{code}` | kaartcode | R4MW |
| `{link}` | volledige deellink | benchmrk.ai/k/R4MW |
| `{points}` | puntenverschil, met teken | +4, 0, −1 |
| `{dateShort}` | alleen datum | 22 okt |
| `{format}` | formaatnaam uit `share.format.*` | Story 9:16 |
| `{example}` | invoervoorbeeld uit `ch.def.{nr}.example` | 4:12 |
| `{division_1}`…`{division_3}`, `{name_1}`…, `{result_1}`… | winnaars per divisie in de social-uitslag | |
| `{first_name}` | voornaam van de gymbeheerder (mail) | Sanne |

**Divisies**

- **Kort** op chips, kaarten, het muurscherm en in tabellen: `Open · Women`, `Open · Men`, `Pro · Women`, `Pro · Men`, `Doubles`. Op een kaart van een Doubles-team: `Doubles · Open` of `Doubles · Pro`.
- **Voluit** in selectievelden en lopende tekst: Open Women, Open Men, Pro Women, Pro Men, Doubles Women, Doubles Men, Doubles Mixed.
- Divisienamen blijven in alle talen Engels.

| Sleutel | NL | EN |
|---|---|---|
| `div.open.women` | Open · Women | Open · Women |
| `div.open.men` | Open · Men | Open · Men |
| `div.pro.women` | Pro · Women | Pro · Women |
| `div.pro.men` | Pro · Men | Pro · Men |
| `div.doubles` | Doubles | Doubles |
| `div.doubles.open` | Doubles · Open | Doubles · Open |
| `div.doubles.pro` | Doubles · Pro | Doubles · Pro |
| `div.full.open.women` | Open Women | Open Women |
| `div.full.open.men` | Open Men | Open Men |
| `div.full.pro.women` | Pro Women | Pro Women |
| `div.full.pro.men` | Pro Men | Pro Men |
| `div.full.doubles.women` | Doubles Women | Doubles Women |
| `div.full.doubles.men` | Doubles Men | Doubles Men |
| `div.full.doubles.mixed` | Doubles Mixed | Doubles Mixed |

Chips (ranglijst, challenge, muurscherm) gebruiken `div.*`; selectievelden (linkpagina) en `{divisionFull}` gebruiken `div.full.*`.

**Schrijfwijze**

- **Tijden** als `h:mm:ss` of `m:ss`, in mono.
- **Procenten in mono-cijfers** (kaarten, kansvlakken, scores): zonder spatie, in alle talen (`83%`, `74% → 83%`).
- **Procenten in lopende tekst:** NL met spatie (`96 %`), EN zonder (`96%`).
- **Kleine letters op kaarten:** labels op de kaarten staan in kleine letters ("verwachte eindtijd", "doel 1:20:00"). Titels zet de CSS in hoofdletters; schrijf de sleutels zelf in gewone zinsvorm.
- **HYROX** alleen beschrijvend ("je HYROX-race", "your HYROX race"). Nooit als merk, titel of afzender.

**Niet in deze teksten:**

- prijzen of beloningen voor winnaars
- aantallen gebruikers
- testimonials

De referral-belofte "1 maand gratis" komt alleen op plekken waar de app die al toont; hier staat hij niet (zie open punten).

## 0. Navigatie

Twee nieuwe tabbladen in de app. De andere tabbladen bestaan al.

| Sleutel | NL | EN |
|---|---|---|
| `nav.gym` | Gym | Gym |
| `nav.challenge` | Challenge | Challenge |
| `st.privacy` | Privacy | Privacy |

---

## 1. Deelbare kaarten: tekst op de kaart

Deze tekst staat op de afbeelding zelf. De kaart volgt de taal van de deler. Waar de drie formaten verschillen, staat dat per sleutel aangegeven: story (S), feed (F) en linkvoorbeeld (L).

### 1.1 Algemeen (alle kaarten)

| Sleutel | NL | EN | Formaat |
|---|---|---|---|
| `card.brand` | BENCHMRK | BENCHMRK | S F L |
| `card.example` | Voorbeeld | Example | S F L, alleen bij voorbeelddata |
| `card.founderLabel` | Echt resultaat · de oprichter | Real result · the founder | alleen bij Ricks eigen resultaat |
| `card.cta` | Reken je eigen race door | Calculate your own race | S, met → |
| `card.ctaUrl` | benchmrk.ai | benchmrk.ai | S, onder de CTA, met `/k/{code}` |
| `card.ctaLine` | Reken je eigen race door · benchmrk.ai | Calculate your own race · benchmrk.ai | F met →, L zonder pijl |
| `card.doubles.name` | {name} | {name} | bij een team staat hier de teamnaam |

### 1.2 Racevoorspelling

| Sleutel | NL | EN | Formaat |
|---|---|---|---|
| `card.pred.title` | Mijn racevoorspelling | My race prediction | S F L |
| `card.pred.expected` | verwachte eindtijd | predicted finish | S |
| `card.pred.goal` | doel {goal} | goal {goal} | S L |
| `card.pred.chanceLabel` | kans op je doel | chance of your goal | S (in twee regels: "kans op" / "je doel") |
| `card.pred.chanceGoal` | kans op {goal} | chance of {goal} | F |
| `card.pred.chanceShort` | kans op | chance of | L, regel 1; regel 2 is `card.pred.goal` |
| `card.pred.runs` | Runs 8 km | Runs 8 km | S F, legenda |
| `card.pred.stations` | Stations | Stations | S F, legenda |
| `card.pred.roxzone` | Roxzone | Roxzone | S F, legenda |
| `card.pred.alt` | Racevoorspelling van {name}: {time}, doel {goal}, kans {chance}% | Race prediction for {name}: {time}, goal {goal}, chance {chance}% | alt-tekst |

### 1.3 Benchmark-PR

| Sleutel | NL | EN | Formaat |
|---|---|---|---|
| `card.pr.title` | Benchmark-PR | Benchmark PR | S F L |
| `card.pr.sub` | benchmark {n} van 5 · week {week} | benchmark {n} of 5 · week {week} | S |
| `card.pr.subShort` | benchmark {n} van 5 | benchmark {n} of 5 | F |
| `card.pr.newPred` | nieuwe voorspelling | new prediction | S |
| `card.pr.chanceGoal` | kans op {goal} | chance of {goal} | S, met daarnaast `{chanceOld}% → {chanceNew}%` |
| `card.pr.pred` | voorspelling {time} | prediction {time} | F L |
| `card.pr.chance` | kans {chanceOld}% → {chanceNew}% | chance {chanceOld}% → {chanceNew}% | F L |
| `card.pr.alt` | Benchmark-PR van {name}: {delta}, van {old} naar {new} | Benchmark PR for {name}: {delta}, from {old} to {new} | alt-tekst, ook iframe-titel op `/k/` |

### 1.4 Vooruitgang sinds de start

| Sleutel | NL | EN | Formaat |
|---|---|---|---|
| `card.prog.title` | Vooruitgang sinds de start | Progress since the start | S F L |
| `card.prog.sub` | week {week} van {total} | week {week} of {total} | S |
| `card.prog.subShort` | week {week}/{total} | week {week}/{total} | F |
| `card.prog.goal` | doel {goal} | goal {goal} | grafiek, bij de gestippelde lijn |
| `card.prog.wk` | wk {week} | wk {week} | grafiek, x-as (wk 1 en de huidige week) |
| `card.prog.alt` | Voorspelde eindtijd per week: van {start} in week 1 naar {time} in week {week} | Predicted finish per week: from {start} in week 1 to {time} in week {week} | aria-label van de grafiek |

### 1.5 Challenge (fase 2)

| Sleutel | NL | EN | Formaat |
|---|---|---|---|
| `card.ch.title` | Challenge week {week} | Challenge week {week} | S F |
| `card.ch.titleLink` | Challenge week {week} · {short_ch} | Challenge week {week} · {short_ch} | L |
| `card.ch.name` | {name_ch} | {name_ch} | S (ondertitel), F (rechtsboven) |
| `card.ch.pr` | Persoonlijk record | Personal record | S F L, lime chip |
| `card.ch.top10` | Top 10 · plaats {rank} | Top 10 · place {rank} | S F L, lime chip |
| `card.ch.previous` | vorige | previous | S F, bij de doorgestreepte vorige tijd |
| `card.ch.cta` | Doe deze week mee | Join this week | S, met → |
| `card.ch.ctaLine` | Doe deze week mee · benchmrk.ai | Join this week · benchmrk.ai | F met →, L zonder pijl |
| `card.ch.sub` | Reken je eigen race door · benchmrk.ai | Calculate your own race · benchmrk.ai | S, onder de CTA (met `/k/{code}`) |
| `card.ch.subShort` | Reken je eigen race door | Calculate your own race | F, onderste regel naast `card.ch.previous` |
| `card.ch.alt.pr` | Kaart challenge week {week}: {result}, persoonlijk record | Card challenge week {week}: {result}, personal record | alt-tekst |
| `card.ch.alt.top10` | Kaart challenge week {week}: {result}, top 10, plaats {rank} | Card challenge week {week}: {result}, top 10, place {rank} | alt-tekst |
| `card.ch.alt.both` | Kaart challenge week {week}: {result}, persoonlijk record, top 10, plaats {rank} | Card challenge week {week}: {result}, personal record, top 10, place {rank} | alt-tekst |

---

## 2. Kaart aanbieden in de app

Na de intake, na een benchmark-PR, elke 4 weken (vooruitgang) en na een challenge-PR of top 10 toont de app een kaart. Op desktop gebeurt dat in een modaal venster, op mobiel in een bottom sheet.

| Sleutel | NL | EN |
|---|---|---|
| `share.offer.pred.title` | Je eerste voorspelling: {time} | Your first prediction: {time} |
| `share.offer.pred.body` | Deel hem met je trainingsmaatje of je gym. Na elke benchmark kun je een nieuwe kaart maken. | Share it with your training partner or your gym. You can make a new card after every benchmark. |
| `share.offer.pr.title` | Benchmark {n}: {delta} | Benchmark {n}: {delta} |
| `share.offer.pr.body` | Sneller dan je vorige benchmark. Je voorspelde eindtijd is nu {time}. | Faster than your previous benchmark. Your predicted finish is now {time}. |
| `share.offer.prog.title` | {weeks} weken: {delta} | {weeks} weeks: {delta} |
| `share.offer.prog.body` | Zo is je voorspelde eindtijd veranderd sinds week 1. | This is how your predicted finish has changed since week 1. |
| `share.offer.ch.title` | Challenge week {week}: {result} | Challenge week {week}: {result} |
| `share.offer.ch.body.pr` | Een nieuw persoonlijk record. Daag iemand uit om het te verbeteren. | A new personal record. Challenge someone to beat it. |
| `share.offer.ch.body.top10` | Plaats {rank} in {divisionFull}. | Place {rank} in {divisionFull}. |
| `share.format.label` | Formaat | Format |
| `share.format.story` | Story 9:16 | Story 9:16 |
| `share.format.square` | Feed 1:1 | Feed 1:1 |
| `share.format.link` | Link | Link |
| `share.preview.title` | Voorbeeld van de kaart, {format} | Card preview, {format} |
| `share.nicknameHint` | Op de kaart staat je bijnaam: {name}. | Your card shows your nickname: {name}. |
| `share.nicknameChange` | Wijzigen | Change |
| `share.nicknameMissing` | Kies eerst een bijnaam. Die staat op je kaart in plaats van je naam. | Choose a nickname first. It appears on your card instead of your name. |
| `share.nicknameBtn` | Bijnaam kiezen | Choose nickname |
| `share.btn.share` | Delen | Share |
| `share.btn.save` | Opslaan | Save |
| `share.btn.copyLink` | Kopieer link | Copy link |
| `share.btn.copyCaption` | Kopieer bijschrift | Copy caption |
| `share.btn.later` | Niet nu | Not now |
| `share.btn.makeCard` | Maak een kaart | Make a card |
| `share.btn.close` | Sluiten | Close |
| `share.private` | Op de kaart staan alleen je bijnaam, divisie en deze cijfers. Geen hartslag, gewicht of e-mail. | The card only shows your nickname, division and these numbers. No heart rate, weight or email. |
| `share.loading` | Kaart maken… | Making card… |
| `share.error.title` | Geen kaart | No card |
| `share.error.render` | De kaart kon niet worden gemaakt. Probeer het over een minuut opnieuw. | The card could not be created. Try again in a minute. |
| `share.error.retry` | Opnieuw proberen | Try again |
| `share.error.noShare` | Delen werkt niet in deze browser. De kaart is opgeslagen; je kunt hem zelf toevoegen aan je post. | Sharing isn't supported in this browser. The card has been saved; you can add it to your post yourself. |
| `share.toast.saved` | Kaart opgeslagen | Card saved |
| `share.toast.linkCopied` | Link gekopieerd | Link copied |
| `share.toast.captionCopied` | Bijschrift gekopieerd | Caption copied |

---

## 3. Openbare linkpagina `benchmrk.ai/k/<code>`

Open Graph-titel en -beschrijving: zie sectie 9.1.

| Sleutel | NL | EN |
|---|---|---|
| `kpage.login` | Inloggen | Log in |
| `kpage.cardRegion` | Gedeelde kaart | Shared card |
| `kpage.sharedBy` | Gedeeld door {name} · {divisionFull} | Shared by {name} · {divisionFull} |
| `kpage.check.title` | Reken je eigen race door | Calculate your own race |
| `kpage.check.sub` | Vul je drempeltempo en doeltijd in. Je ziet je verwachte eindtijd per run, station en Roxzone, en je kans op je doel. | Enter your threshold pace and goal time. You'll see your predicted finish per run, station and Roxzone, and your chance of hitting your goal. |
| `kpage.field.division` | Divisie | Division |
| `kpage.field.prefilledBadge` | Ingevuld | Filled in |
| `kpage.check.prefilled` | Divisie ingevuld: {divisionFull}. Pas aan als je in een andere divisie racet. | Division filled in: {divisionFull}. Change it if you race in a different division. |
| `kpage.check.chooseDivision` | Kies je divisie. | Choose your division. |
| `kpage.field.pace` | Drempeltempo /km | Threshold pace /km |
| `kpage.field.goal` | Doeltijd | Goal time |
| `kpage.field.weeks` | Weken tot je race | Weeks to your race |
| `kpage.check.btn` | Reken door | Calculate |
| `kpage.res.expected` | Verwacht | Predicted |
| `kpage.res.chance` | Kans op {goal} | Chance of {goal} |
| `kpage.res.runs` | Runs {runs} | Runs {runs} |
| `kpage.res.stations` | Stations {stations} | Stations {stations} |
| `kpage.res.roxzone` | Roxzone {roxzone} | Roxzone {roxzone} |
| `kpage.res.barLabel` | Runs {runs}, stations {stations}, Roxzone {roxzone} | Runs {runs}, stations {stations}, Roxzone {roxzone} |
| `kpage.res.note` | Voorbeeldberekening. Gerekend met middenmoot-stations. | Example calculation. Based on mid-pack stations. |
| `kpage.cta.plan` | Bouw mijn volledige plan | Build my full plan |
| `kpage.cta.sub` | Start gratis. Tijdens de bèta €30 per jaar. | Start free. €30 per year during the beta. |
| `kpage.about` | Benchmrk maakt een trainingsplan op je eigen drempel en voorspelt je HYROX-race per onderdeel. | Benchmrk builds a training plan on your own threshold and predicts your HYROX race per segment. |
| `kpage.notFound.title` | Deze kaart bestaat niet meer | This card no longer exists |
| `kpage.notFound.body` | De eigenaar heeft hem verwijderd, of de link is niet compleet. Je kunt wel je eigen race doorrekenen. | The owner has removed it, or the link is incomplete. You can still calculate your own race. |
| `kpage.disclaimer` | Benchmrk is niet verbonden aan HYROX. | Benchmrk is not affiliated with HYROX. |

`kpage.res.note` neemt de bestaande tekst van de snelle check op de homepage over. Heeft die daar een andere sleutel, gebruik dan die.

---

## 4. Bijnaam en privacy (Instellingen)

### 4.1 Bijnaam

| Sleutel | NL | EN |
|---|---|---|
| `priv.nick.label` | Bijnaam | Nickname |
| `priv.nick.help` | Je bijnaam staat op je kaarten en ranglijsten. Je echte naam en e-mail zie je alleen zelf. | Your nickname appears on your cards and leaderboards. Only you see your real name and email. |
| `priv.nick.placeholder` | bijv. Sledhond | e.g. Sledhound |
| `priv.nick.rules` | 3 tot 20 tekens: letters, cijfers, punt, liggend streepje of underscore. | 3 to 20 characters: letters, numbers, dot, hyphen or underscore. |
| `priv.nick.taken` | Deze bijnaam is al bezet. Kies een andere. | This nickname is taken. Choose another one. |
| `priv.nick.invalid` | Gebruik 3 tot 20 tekens: letters, cijfers, punt, liggend streepje of underscore. | Use 3 to 20 characters: letters, numbers, dot, hyphen or underscore. |
| `priv.nick.blocked` | Deze bijnaam kan niet. Kies een andere. | This nickname isn't allowed. Choose another one. |
| `priv.nick.save` | Opslaan | Save |
| `priv.nick.saved` | Bijnaam opgeslagen | Nickname saved |

### 4.2 Zichtbaarheid

| Sleutel | NL | EN |
|---|---|---|
| `priv.title` | Wie ziet wat | Who sees what |
| `priv.intro` | Je kiest zelf hoe zichtbaar je bent. Je kunt dit altijd wijzigen. | You choose how visible you are. You can change this at any time. |
| `priv.private.name` | Privé | Private |
| `priv.private.badge` | Standaard | Default |
| `priv.private.sees` | Anderen zien niets van je, behalve de kaarten die je zelf deelt. | Others see nothing of you, except the cards you share yourself. |
| `priv.private.notOn` | Je staat niet op ranglijsten. | You're not on any leaderboard. |
| `priv.gym.name` | Gym en vrienden | Gym and friends |
| `priv.gym.sees` | Leden van je gym en je vrienden zien je bijnaam, divisie, score, voorspelde tijd en benchmarktijden. | Members of your gym and your friends see your nickname, division, score, predicted time and benchmark times. |
| `priv.gym.on` | Je staat op de ranglijst van je gym en doet mee aan de wekelijkse challenge. | You appear on your gym's leaderboard and take part in the weekly challenge. |
| `priv.public.name` | Openbaar | Public |
| `priv.public.badge` | Binnenkort | Coming soon |
| `priv.public.sees` | Ook zichtbaar op de race- en landelijke ranglijsten en op een eigen profielpagina. | Also visible on race and national leaderboards and on your own profile page. |
| `priv.never.title` | Nooit zichtbaar voor anderen | Never visible to others |
| `priv.never.body` | E-mail, hartslag, gewicht, blessures en notities. Hartslag gebruikt de app alleen om je trainingen te beoordelen. | Email, heart rate, weight, injuries and notes. The app only uses heart rate to assess your training. |
| `priv.saved` | Zichtbaarheid opgeslagen | Visibility saved |
| `priv.toPrivate.title` | Terug naar Privé? | Back to Private? |
| `priv.toPrivate.confirm` | Je verdwijnt meteen van de ranglijst van je gym en uit lopende challenges. Je gegevens blijven bewaard. | You'll be removed from your gym's leaderboard and current challenges right away. Your data is kept. |
| `priv.toPrivate.btn` | Zet op Privé | Set to Private |
| `priv.toPrivate.cancel` | Annuleren | Cancel |

### 4.3 Toestemming "Gym en vrienden"

Deze tekst toont de app als de atleet overstapt van Privé naar Gym en vrienden. Hij moet expliciet akkoord geven.

| Sleutel | NL | EN |
|---|---|---|
| `consent.title` | Meedoen met je gym en vrienden | Join with your gym and friends |
| `consent.body` | Als je dit aanzet, zien de leden en beheerders van {gym} en de mensen in je vriendengroep je bijnaam, divisie, score "op schema", voorspelde eindtijd en benchmarktijden. Je resultaten van de wekelijkse challenge komen in de uitslag. Je e-mail, hartslag, gewicht, blessures en notities zien zij nooit. Je kunt dit op elk moment terugzetten naar Privé in Instellingen; je verdwijnt dan meteen van de ranglijsten. | If you turn this on, members and admins of {gym} and the people in your friends group will see your nickname, division, "on track" score, predicted finish and benchmark times. Your weekly challenge results appear in the standings. They never see your email, heart rate, weight, injuries or notes. You can switch back to Private in Settings at any time; you'll be removed from the leaderboards right away. |
| `consent.bodyNoGym` | Als je dit aanzet, zien de mensen in je vriendengroep je bijnaam, divisie, score "op schema", voorspelde eindtijd en benchmarktijden. Koppel je later een gym, dan zien de leden en beheerders van die gym dit ook. Je e-mail, hartslag, gewicht, blessures en notities zien zij nooit. Je kunt dit op elk moment terugzetten naar Privé. | If you turn this on, the people in your friends group will see your nickname, division, "on track" score, predicted finish and benchmark times. If you link a gym later, its members and admins will see this too. They never see your email, heart rate, weight, injuries or notes. You can switch back to Private at any time. |
| `consent.check` | Ik begrijp wat anderen van mij zien en ga akkoord. | I understand what others will see and I agree. |
| `consent.btn.agree` | Zet aan | Turn on |
| `consent.btn.cancel` | Blijf Privé | Stay Private |
| `consent.privacyLink` | Lees de privacyverklaring | Read the privacy statement |

---

## 5. Gym-ranglijst (`/gym`)

### 5.1 Kop, tabs en filters

| Sleutel | NL | EN |
|---|---|---|
| `lb.title` | Ranglijst | Leaderboard |
| `lb.members` | {n} leden doen mee | {n} members taking part |
| `lb.final` | Eindstand {month} | Final standings {month} |
| `lb.scoreInfo` | Hoe werkt de score? | How does the score work? |
| `lb.tabs.label` | Ranglijst | Leaderboard |
| `lb.tab.onTrack` | Op schema | On track |
| `lb.tab.fastest` | Snelste | Fastest |
| `lb.filter.division` | Divisie | Division |
| `lb.filter.period` | Periode | Period |
| `lb.period.option` | {month} {year} | {month} {year} |
| `lb.onTrack.sub` | Gerangschikt op hoeveel van de afstand naar je streeftijd je hebt overbrugd. | Ranked by how much of the gap to your goal time you've closed. |
| `lb.fastest.sub` | Gerangschikt op voorspelde eindtijd uit de laatste benchmark. | Ranked by predicted finish from the latest benchmark. |

De divisiechips gebruiken `div.*` (sectie Afspraken).

### 5.2 Uitleg van de score (paneel "Hoe werkt de score?")

Het paneel heeft twee delen, een rekenvoorbeeld en een regelregel. `score.explain.body` is de korte uitleg van maximaal 60 woorden. Die staat in het paneel bovenaan als inleiding op mobiel, als `aria-description` van de knop, en in de toestemming en de gymteksten.

| Sleutel | NL | EN |
|---|---|---|
| `score.explain.region` | Uitleg score | Score explained |
| `score.explain.body` | Je score (0–100) laat zien hoeveel van de afstand naar je streeftijd je hebt overbrugd. 70 punten komen uit je benchmarks: hoeveel sneller je voorspelde tijd is dan bij je start. 30 punten komen uit sleuteltrainingen met tempo en hartslag die bij je plan passen. Een vinkje zonder gegevens telt niet. | Your score (0–100) shows how much of the gap to your goal time you've closed. 70 points come from your benchmarks: how much faster your predicted time is than at the start. 30 points come from key sessions with pace and heart rate that match your plan. A tick without data doesn't count. |
| `score.part.progress.title` | Progressie naar je doel | Progress to your goal |
| `score.part.progress.body` | Hoeveel van het gat tussen je voorspelde starttijd en je streeftijd je hebt gedicht. Alleen gemeten benchmarks tellen. | How much of the gap between your predicted starting time and your goal time you've closed. Only measured benchmarks count. |
| `score.part.onTrack.title` | Op schema | On track |
| `score.part.onTrack.body` | Sleuteltrainingen gelogd met tempo en hartslag die passen bij het plan. Een vinkje zonder gegevens telt niet. Maximaal 30 punten. | Key sessions logged with pace and heart rate that match the plan. A tick without data doesn't count. Maximum 30 points. |
| `score.example.label` | Voorbeeld | Example |
| `score.example.line1` | start {start} · doel {goal} | start {start} · goal {goal} |
| `score.example.line2` | nu voorspeld {time} | now predicted {time} |
| `score.example.line3` | = helft van het gat → 35 van 70 | = half the gap → 35 of 70 |
| `score.explain.rules` | Altijd per divisie. Op de lijst na minstens 2 benchmarks of 4 weken trainen. Elke maand een nieuwe stand. | Always per division. On the list after at least 2 benchmarks or 4 weeks of training. New standings every month. |
| `score.explain.notCounted` | Telt niet: een training zonder gegevens, tempo en hartslag die niet bij elkaar passen, of veel trainingen tegelijk achteraf ingevuld. Na 48 uur ingevuld telt een training half. | Doesn't count: a session without data, pace and heart rate that don't match, or many sessions logged at once afterwards. Logged after 48 hours, a session counts for half. |

Woordentelling `score.explain.body`: NL 51, EN 53. Het rekenvoorbeeld is `{start}` 1:24:00, `{goal}` 1:20:00, `{time}` 1:22:00; dat zijn vaste waarden, geen gebruikersdata.

### 5.3 Tabel "Op schema"

| Sleutel | NL | EN |
|---|---|---|
| `lb.col.rank` | # | # |
| `lb.col.athlete` | Atleet | Athlete |
| `lb.col.score` | Score | Score |
| `lb.col.prediction` | Voorspelling | Prediction |
| `lb.col.onTrack` | Op schema | On track |
| `lb.col.week` | Week | Week |
| `lb.row.start` | start {start} | start {start} |
| `lb.row.prediction` | {start} → {time} | {start} → {time} |
| `lb.row.onTrack` | {b}/30 | {b}/30 |
| `lb.row.scoreLabel` | Score {score}: progressie {a} van 70, op schema {b} van 30 | Score {score}: progress {a} of 70, on track {b} of 30 |
| `lb.row.weekChange` | {points} | {points} |
| `lb.row.weekChangeLabel` | {points} punten sinds vorige week | {points} points since last week |

### 5.4 Tabel "Snelste"

| Sleutel | NL | EN |
|---|---|---|
| `lb.col.predictedFinish` | Voorspelde eindtijd | Predicted finish |
| `lb.col.lastBenchmark` | Laatste benchmark | Latest benchmark |
| `lb.col.sinceStart` | Sinds start | Since start |
| `lb.row.lastBenchmark` | {dateShort} | {dateShort} |
| `lb.row.sinceStart` | {delta} | {delta} |

### 5.5 Eigen regel, markering en voet

| Sleutel | NL | EN |
|---|---|---|
| `lb.you` | Jij | You |
| `lb.youBar` | Jij · #{rank} · {division} | You · #{rank} · {division} |
| `lb.youBar.label` | Naar je eigen regel | Go to your row |
| `lb.flagged` | Wordt bekeken | Under review |
| `lb.flagged.tip` | Benchmark wacht op bevestiging | Benchmark awaiting confirmation |
| `lb.notListed` | {n} leden nog niet op de lijst: minder dan 2 benchmarks of 4 weken training. | {n} members not on the list yet: fewer than 2 benchmarks or 4 weeks of training. |
| `lb.updated` | Stand per {date} | Standings as of {date} |
| `lb.why` | Je staat op deze lijst omdat je privacystand "Gym en vrienden" is. | You're on this list because your privacy setting is "Gym and friends". |
| `lb.why.change` | Wijzigen | Change |
| `lb.report` | Resultaat melden | Report a result |

`lb.notListed` alleen tonen als `{n}` 1 of meer is. Bij `{n}` = 1: "1 lid nog niet op de lijst…" / "1 member not on the list yet…" (meervoudsvorm via i18n).

### 5.6 Staten

| Sleutel | NL | EN |
|---|---|---|
| `lb.loading` | Ranglijst laden… | Loading leaderboard… |
| `lb.error` | De ranglijst kon niet worden geladen. Probeer het opnieuw. | The leaderboard could not be loaded. Try again. |
| `lb.error.retry` | Opnieuw proberen | Try again |
| `lb.notYet.title` | Nog even | Almost there |
| `lb.notYet.body` | Je komt op de ranglijst na 2 gelogde benchmarks of 4 weken trainen. Nu: {n, plural, one {# benchmark} other {# benchmarks}}, {weeks, plural, one {# week} other {# weken}}. | You'll appear after 2 logged benchmarks or 4 weeks of training. Now: {n, plural, one {# benchmark} other {# benchmarks}}, {weeks, plural, one {# week} other {# weeks}}. |
| `lb.notYet.short` | Nog {n} benchmark tot je op de lijst staat | {n} more benchmark until you're on the list |
| `lb.notYet.btn` | Benchmark plannen | Plan a benchmark |
| `lb.private.title` | Je staat op Privé | You're set to Private |
| `lb.private.body` | Je ziet de ranglijst, maar je staat er zelf niet op. Zet je zichtbaarheid op "Gym en vrienden" om mee te doen. | You can see the leaderboard, but you're not on it. Set your visibility to "Gym and friends" to take part. |
| `lb.private.btn` | Zichtbaarheid aanpassen | Change visibility |
| `lb.emptyDivision.title` | Nog niemand hier | Nobody here yet |
| `lb.emptyDivision.body` | Nog niemand in {divisionFull} bij {gym}. Kies een andere divisie of nodig iemand uit. | Nobody in {divisionFull} at {gym} yet. Choose another division or invite someone. |
| `lb.emptyDivision.btn` | Nodig iemand uit | Invite someone |
| `lb.emptyGym.title` | Nog niemand in je gym doet mee | Nobody at your gym has joined yet |
| `lb.emptyGym.body` | Zet je zichtbaarheid op "Gym en vrienden" en nodig een trainingsmaatje uit. Je staat erop zodra je 2 benchmarks hebt gelogd of 4 weken traint. | Set your visibility to "Gym and friends" and invite a training partner. You'll appear once you've logged 2 benchmarks or trained for 4 weeks. |
| `lb.noGym.title` | Je bent nog niet gekoppeld aan een gym | You're not linked to a gym yet |
| `lb.noGym.body` | Vul de gymcode in die je van je gym hebt gekregen. Heeft je gym nog geen code, stuur ze dan naar benchmrk.ai/gym. | Enter the gym code your gym gave you. If your gym doesn't have a code yet, send them to benchmrk.ai/gym. |
| `lb.noGym.btn` | Gymcode invullen | Enter gym code |
| `lb.noGym.btn2` | Gym aanmelden | Sign up your gym |
| `lb.noAccess.title` | Geen toegang | No access |
| `lb.noAccess.body` | Deze ranglijst is alleen zichtbaar voor leden van {gym}. | This leaderboard is only visible to members of {gym}. |
| `lb.closed` | De ranglijst van {month} is afgesloten. Op de 1e begint iedereen opnieuw. | The {month} leaderboard is closed. Everyone starts again on the 1st. |

---

## 6. Meldingen bij gemarkeerde trainingen en benchmarks

Uitgangspunt: de atleet heeft waarschijnlijk niets fout gedaan. Benoem wat er gebeurt en wat hij kan doen, zonder te beschuldigen.

| Sleutel | Wanneer | NL | EN |
|---|---|---|---|
| `flag.noData` | Training opgeslagen zonder tempo of hartslag | Opgeslagen. Voor je score telt een training alleen mee met tempo of hartslag. Voeg ze toe als je ze nog hebt. | Saved. For your score, a session only counts with pace or heart rate. Add them if you still have them. |
| `flag.noData.btn` | | Gegevens toevoegen | Add data |
| `flag.mismatch` | Tempo en hartslag passen niet bij de drempel | Je tempo en hartslag passen niet goed bij je drempel. Dat gebeurt vaak als een polshorloge de hartslag mist, of als het tempo verkeerd is ingevuld. Deze training telt daarom niet mee voor je score. Klopt er iets niet, pas het dan aan. | Your pace and heart rate don't quite match your threshold. This often happens when a wrist watch misses your heart rate, or the pace was entered incorrectly. That's why this session doesn't count towards your score. If something's off, edit it. |
| `flag.mismatch.btn` | | Training aanpassen | Edit session |
| `flag.mismatch.threshold` | | Is je drempel veranderd? Doe een benchmark, dan rekent de app opnieuw. | Has your threshold changed? Do a benchmark and the app recalculates. |
| `flag.late` | Ingevuld meer dan 48 uur na de datum | Ingevuld na meer dan 48 uur. Deze training telt voor de helft mee voor je score. Tip: log binnen 2 dagen. | Logged more than 48 hours later. This session counts for half towards your score. Tip: log within 2 days. |
| `flag.bulk` | Meer dan 5 trainingen binnen 10 minuten ingevuld | Je hebt veel trainingen kort na elkaar ingevuld. Ze staan in je logboek, maar voor de ranglijst tellen ze niet mee. Log voortaan na elke training. | You've logged many sessions in a short time. They're in your log, but they don't count for the leaderboard. From now on, log after each session. |
| `flag.bench.title` | Benchmark meer dan 10 % sneller dan de vorige | Grote stap: {delta} | Big step: {delta} |
| `flag.bench.body` | | Deze benchmark is meer dan 10 % sneller dan je vorige. Hij staat in je plan, maar telt pas mee voor de ranglijst als je hem bevestigt. | This benchmark is more than 10% faster than your previous one. It's in your plan, but it only counts for the leaderboard once you confirm it. |
| `flag.bench.how` | | Bevestigen kan met een foto van je horloge of het scherm van het apparaat, of met je volgende benchmark. | You can confirm it with a photo of your watch or the machine's screen, or with your next benchmark. |
| `flag.bench.btn` | | Foto toevoegen | Add photo |
| `flag.bench.confirmed` | Na bevestiging | Bevestigd. Deze benchmark telt mee voor de ranglijst. | Confirmed. This benchmark counts for the leaderboard. |
| `flag.bench.rejected` | Na afwijzing door de gymbeheerder | Deze benchmark telt niet mee voor de ranglijst van {gym}. In je eigen plan blijft hij staan. Vragen? Neem contact op met je gym. | This benchmark doesn't count for the {gym} leaderboard. It stays in your own plan. Questions? Contact your gym. |
| `flag.reported.owner` | Resultaat van de atleet is gemeld | Een van je resultaten is gemeld en wordt bekeken door de beheerder van {gym}. Je kunt een foto toevoegen om het te bevestigen. | One of your results has been reported and is being reviewed by the {gym} admin. You can add a photo to confirm it. |
| `flag.reported.btn` | | Bekijk resultaat | View result |
| `report.title` | Melden-scherm | Resultaat melden | Report result |
| `report.body` | | Lijkt een resultaat niet te kloppen? De beheerder van {gym} bekijkt het. De atleet ziet niet wie het heeft gemeld. | Does a result look wrong? The {gym} admin will review it. The athlete won't see who reported it. |
| `report.reason` | | Reden (optioneel) | Reason (optional) |
| `report.btn` | | Meld | Report |
| `report.done` | | Bedankt. De beheerder bekijkt het. | Thanks. The admin will review it. |
| `report.admin.title` | In "Mijn gym" | Gemelde resultaten | Reported results |
| `report.admin.approve` | | Klopt, laten staan | Valid, keep |
| `report.admin.reject` | | Niet meetellen | Don't count |
| `report.admin.empty` | | Geen meldingen. | No reports. |

---

## 7. Wekelijkse challenge in de app

### 7.1 Kop en opdracht

| Sleutel | NL | EN |
|---|---|---|
| `ch.tab` | Challenge | Challenge |
| `ch.title` | Challenge week {week} | Challenge week {week} |
| `ch.name` | {name_ch} | {name_ch} |
| `ch.status.open` | Invullen kan tot zondag 18:00 | Submit by Sunday 18:00 |
| `ch.status.closed` | Gesloten | Closed |
| `ch.task` | Opdracht | Task |
| `ch.how` | Zo meet je | How to measure |
| `ch.before` | Vooraf | Before you start |
| `ch.before.text` | 10 minuten rustig inlopen. Niet op een dag met een benchmark of sim. | Warm up easy for 10 minutes. Not on a day with a benchmark or sim. |
| `ch.result` | Uitslag | Standings |
| `ch.result.text.low` | Per divisie, op zondag. Laagste tijd wint. Je mag tot zondag 18:00 verbeteren. | Per division, on Sunday. Lowest time wins. You can improve until Sunday 18:00. |
| `ch.result.text.high` | Per divisie, op zondag. Hoogste aantal wint. Je mag tot zondag 18:00 verbeteren. | Per division, on Sunday. Highest number wins. You can improve until Sunday 18:00. |
| `ch.result.text.hold` | Per divisie, op zondag. Langste tijd wint. Je mag tot zondag 18:00 verbeteren. | Per division, on Sunday. Longest time wins. You can improve until Sunday 18:00. |

De opdracht (`{task}`) en de tekst bij "Zo meet je" staan per challenge in sectie 10.

### 7.2 Je resultaat

| Sleutel | NL | EN |
|---|---|---|
| `ch.enter` | Je resultaat | Your result |
| `ch.input.time` | Tijd in m:ss | Time in m:ss |
| `ch.input.time.ph` | m:ss | m:ss |
| `ch.input.reps` | Aantal herhalingen | Number of reps |
| `ch.input.reps.ph` | aantal | reps |
| `ch.save` | Opslaan | Save |
| `ch.edit` | Aanpassen | Edit |
| `ch.yourPR` | Je persoonlijk record op deze challenge: {result} (week {week}) | Your personal record on this challenge: {result} (week {week}) |
| `ch.firstTime` | Je eerste keer op deze challenge. | Your first time on this challenge. |
| `ch.saved` | Opgeslagen: {result} | Saved: {result} |
| `ch.newPR.badge` | PR | PR |
| `ch.newPR` | Nieuw persoonlijk record. Je vorige: {old} | New personal record. Your previous: {old} |
| `ch.card.offer.pr` | Persoonlijk record. Maak er een kaart van. | Personal record. Make it a card. |
| `ch.card.offer.top10` | Top 10 in {divisionFull}. Maak er een kaart van. | Top 10 in {divisionFull}. Make it a card. |
| `ch.card.btn` | Maak een kaart | Make a card |
| `ch.invite` | Daag een vriend uit | Challenge a friend |
| `ch.error.format.time` | Vul je resultaat in als m:ss, bijvoorbeeld {example}. | Enter your result as m:ss, for example {example}. |
| `ch.error.format.reps` | Vul je resultaat in als een heel getal, bijvoorbeeld {example}. | Enter your result as a whole number, for example {example}. |
| `ch.error.range` | Dit resultaat lijkt niet te kloppen. Controleer het en probeer opnieuw. | This result doesn't look right. Check it and try again. |

### 7.3 Bewijs voor de top 3

| Sleutel | NL | EN |
|---|---|---|
| `ch.proof.title` | Bewijs voor de top 3 | Proof for the top 3 |
| `ch.proof.body` | Je staat in de top 3. Voeg voor zondag 18:00 een foto toe van je horloge, het scherm van het apparaat of je app. Zonder foto telt je resultaat niet mee voor de top 3. | You're in the top 3. Add a photo of your watch, the machine's screen or your app before Sunday 18:00. Without a photo, your result doesn't count for the top 3. |
| `ch.proof.btn` | Foto toevoegen | Add photo |
| `ch.proof.added` | Foto toegevoegd | Photo added |

### 7.4 Tussenstand en uitslag

| Sleutel | NL | EN |
|---|---|---|
| `ch.standings.live` | Tussenstand | Current standings |
| `ch.filter.division` | Divisie | Division |
| `ch.standings.final` | Uitslag | Standings |
| `ch.standings.updated` | bijgewerkt {date} | updated {date} |
| `ch.standings.count` | {n} resultaten · {divisionFull} | {n} results · {divisionFull} |
| `ch.col.rank` | # | # |
| `ch.col.athlete` | Atleet | Athlete |
| `ch.col.time` | Tijd | Time |
| `ch.col.reps` | Aantal | Reps |
| `ch.badge.you` | Jij | You |
| `ch.badge.pr` | PR | PR |
| `ch.badge.proof` | foto ok | photo ok |
| `ch.place` | plaats {rank} | place {rank} |
| `ch.top3Rule` | Top 3 telt alleen met een foto als bewijs. | Top 3 only counts with a photo as proof. |
| `ch.report` | Resultaat melden | Report a result |
| `ch.closed` | Deze challenge is gesloten. De uitslag staat hieronder. | This challenge is closed. The standings are below. |
| `ch.next` | Maandag staat de volgende challenge klaar. | The next challenge starts Monday. |

`ch.standings.count` alleen tonen bij 5 of meer resultaten.

### 7.5 Staten

| Sleutel | NL | EN |
|---|---|---|
| `ch.private` | Je staat op Privé. Je kunt meedoen en je eigen record bijhouden, maar je staat niet in de uitslag. | You're set to Private. You can take part and track your own record, but you won't appear in the standings. |
| `ch.private.link` | Zichtbaarheid aanpassen | Change visibility |
| `ch.empty` | Nog geen resultaten in {divisionFull}. Ben jij de eerste? | No results in {divisionFull} yet. Will you be first? |
| `ch.none.title` | Geen challenge deze week | No challenge this week |
| `ch.none` | Deze week is er geen challenge. Maandag staat de volgende klaar. | There's no challenge this week. The next one is ready on Monday. |
| `ch.loading` | Challenge laden… | Loading challenge… |
| `ch.error` | De challenge kon niet worden geladen. Probeer het opnieuw. | The challenge could not be loaded. Try again. |

---

## 8. Gymscherm voor aan de muur (`/gym-board/<code>`)

Leesbaar op 3 meter: zo min mogelijk woorden.

| Sleutel | NL | EN |
|---|---|---|
| `wall.title` | {gym} · {month} | {gym} · {month} |
| `wall.tabs.label` | Ranglijst | Leaderboard |
| `wall.tab.onTrack` | Op schema | On track |
| `wall.tab.fastest` | Snelste | Fastest |
| `wall.scoreLegend` | Score = progressie naar je streeftijd (70) + op schema (30) | Score = progress to your goal time (70) + on track (30) |
| `wall.fastestLegend` | Gerangschikt op voorspelde eindtijd uit de laatste benchmark | Ranked by predicted finish from the latest benchmark |
| `wall.challenge` | Challenge week {week} | Challenge week {week} |
| `wall.challenge.line` | {name_ch} · tussenstand {division} | {name_ch} · standings {division} |
| `wall.challenge.deadline` | Invullen kan tot zondag 18:00 | Submit by Sunday 18:00 |
| `wall.join` | Doe mee via de app · benchmrk.ai | Join via the app · benchmrk.ai |
| `wall.joinSub` | Gymcode bij de balie | Gym code at the front desk |
| `wall.updated` | Bijgewerkt {date} | Updated {date} |
| `wall.footer` | Alleen bijnamen en divisies · Benchmrk is niet verbonden aan HYROX | Nicknames and divisions only · Benchmrk is not affiliated with HYROX |
| `wall.empty` | Nog geen atleten op de ranglijst | No athletes on the leaderboard yet |
| `wall.offline` | Geen verbinding. Laatste stand van {date}. | No connection. Last standings from {date}. |
| `wall.noAccess` | Deze link is niet meer geldig. Vraag een nieuwe aan in "Mijn gym". | This link is no longer valid. Request a new one in "My gym". |

De divisiekop op het muurscherm gebruikt `div.*`.

---

## 9. Teksten om te delen

### 9.1 Linkvoorbeeld (Open Graph) per kaart

Dit is de titel en beschrijving die WhatsApp, Instagram en andere apps tonen bij `benchmrk.ai/k/<code>`. Hierin staan alleen gegevens die ook op de kaart staan.

| Sleutel | NL | EN |
|---|---|---|
| `og.pred.title` | {name}: verwacht {time} · {division} | {name}: predicted {time} · {division} |
| `og.pred.desc` | Voorspelling per run, station en Roxzone. Kans op {goal}: {chance} %. Reken je eigen race door. | Prediction per run, station and Roxzone. Chance of {goal}: {chance}%. Calculate your own race. |
| `og.pr.title` | {name}: {delta} op benchmark {n} | {name}: {delta} on benchmark {n} |
| `og.pr.desc` | Van {old} naar {new}. Voorspelde eindtijd nu {time}. Reken je eigen race door. | From {old} to {new}. Predicted finish now {time}. Calculate your own race. |
| `og.prog.title` | {name}: {delta} in {weeks} weken | {name}: {delta} in {weeks} weeks |
| `og.prog.desc` | Voorspelde eindtijd van {start} naar {time}. Reken je eigen race door. | Predicted finish from {start} to {time}. Calculate your own race. |
| `og.ch.title` | {name}: {result} · challenge week {week} | {name}: {result} · challenge week {week} |
| `og.ch.desc` | Deze week kun je meedoen, in de gym of thuis. Reken ook je eigen race door. | You can join this week, at the gym or at home. Calculate your own race too. |
| `og.fallback.title` | Benchmrk · reken je HYROX-race door | Benchmrk · calculate your HYROX race |
| `og.fallback.desc` | Voorspelling per run, station en Roxzone, en een plan op je eigen drempel. | Prediction per run, station and Roxzone, and a plan on your own threshold. |

### 9.2 Standaard deeltekst voor WhatsApp

De link komt er altijd achter. Deze tekst is in de app aan te passen voordat hij verstuurd wordt.

| Sleutel | NL | EN |
|---|---|---|
| `wa.pred` | Mijn voorspelling voor {race}: {time}, kans op {goal} is {chance} %. Reken die van jou door: {link} | My prediction for {race}: {time}, chance of {goal} is {chance}%. Calculate yours: {link} |
| `wa.pred.noRace` | Mijn voorspelde HYROX-tijd: {time}, kans op {goal} is {chance} %. Reken die van jou door: {link} | My predicted HYROX time: {time}, chance of {goal} is {chance}%. Calculate yours: {link} |
| `wa.pr` | Benchmark {n}: {delta} sneller dan de vorige. Voorspeld nu {time}. {link} | Benchmark {n}: {delta} faster than the last one. Predicted now {time}. {link} |
| `wa.prog` | {weeks} weken trainen: mijn voorspelde tijd ging van {start} naar {time}. {link} | {weeks} weeks of training: my predicted time went from {start} to {time}. {link} |
| `wa.ch` | Challenge week {week}: {result}. Doe je mee? Je kunt hem ook thuis doen. {link} | Challenge week {week}: {result}. Are you in? You can do it at home too. {link} |

### 9.3 Voorbeeldbijschriften om te kopiëren

Drie per kaarttype. De app toont ze onder "Kopieer bijschrift"; de atleet past aan wat hij wil. Er staat geen @-vermelding of hashtag van HYROX in, zodat het niet als officieel bericht oogt.

**Racevoorspelling**

| # | NL | EN |
|---|---|---|
| `cap.pred.1` | Voorspelling voor {race}: {time}. Runs {runs}, stations {stations}, Roxzone {roxzone}. Nu de training nog. | Prediction for {race}: {time}. Runs {runs}, stations {stations}, Roxzone {roxzone}. Now for the training. |
| `cap.pred.2` | Doel {goal}. Kans volgens mijn plan: {chance} %. Ik hou jullie op de hoogte. | Goal {goal}. Chance according to my plan: {chance}%. I'll keep you posted. |
| `cap.pred.3` | Nog {weeks} weken tot {race}. Dit is het startpunt: {time}. Wat is die van jou? Link in bio. | {weeks} weeks to {race}. This is the starting point: {time}. What's yours? Link in bio. |

**Benchmark-PR**

| # | NL | EN |
|---|---|---|
| `cap.pr.1` | Benchmark {n}: {delta}. Van {old} naar {new}. | Benchmark {n}: {delta}. From {old} to {new}. |
| `cap.pr.2` | {delta} sneller dan vier weken geleden. Voorspelde eindtijd nu {time}. | {delta} faster than four weeks ago. Predicted finish now {time}. |
| `cap.pr.3` | Nieuwe benchmark, nieuwe kans op {goal}: {chance} %. Het plan werkt als je het doet. | New benchmark, new chance of {goal}: {chance}%. The plan works if you do it. |

`cap.pr.2` alleen tonen als de vorige benchmark 4 weken eerder was; anders `cap.pr.1` of `cap.pr.3`.

**Vooruitgang sinds de start**

| # | NL | EN |
|---|---|---|
| `cap.prog.1` | Week 1: {start}. Nu: {time}. {weeks} weken trainen. | Week 1: {start}. Now: {time}. {weeks} weeks of training. |
| `cap.prog.2` | {delta} op mijn voorspelde tijd sinds de start. Doel blijft {goal}. | {delta} on my predicted time since the start. Goal is still {goal}. |
| `cap.prog.3` | Geen gok, gewoon meten. {weeks} weken, {delta}. Benieuwd waar jij staat? Link in bio. | Not a guess, just measuring. {weeks} weeks, {delta}. Curious where you stand? Link in bio. |

**Challenge (fase 2)**

| # | NL | EN |
|---|---|---|
| `cap.ch.1` | Challenge week {week}: {result}. Wie doet hem beter? | Challenge week {week}: {result}. Who can beat it? |
| `cap.ch.2` | Nieuw persoonlijk record op de challenge van deze week: {result}. | New personal record on this week's challenge: {result}. |
| `cap.ch.3` | Plaats {rank} in {divisionFull} deze week. Doe zondag ook mee, het kan ook thuis. | Place {rank} in {divisionFull} this week. Join by Sunday, you can do it at home too. |

### 9.4 Daag een vriend uit

| Sleutel | NL | EN |
|---|---|---|
| `invite.ch.text` | Ik deed de challenge van deze week: {result}. Doe je mee? Het kan in de gym of thuis, invullen tot zondag 18:00. {link} | I did this week's challenge: {result}. Are you in? Gym or home, submit by Sunday 18:00. {link} |
| `invite.lb.text` | Ik train voor {race} met Benchmrk. Doe mee op de ranglijst van {gym}: {link} | I'm training for {race} with Benchmrk. Join the {gym} leaderboard: {link} |

---

## 10. Wekelijkse challenges: de eerste 12

**Regels voor alle challenges:**

- **Overal te doen.** Elke challenge kan in de gym én thuis of buiten, zonder materiaal. Hardlopen mag buiten met een gps-horloge of telefoon, of op een loopband op 1 % helling.
- **Gelijke opdracht.** De opdracht is voor alle divisies hetzelfde, maar de uitslag is per divisie. Doubles doen de opdracht ieder voor zich; het teamresultaat is het gemiddelde.
- **Eén geldig resultaat.** Iedereen vult één resultaat in en mag het tot zondag 18:00 verbeteren. Alleen het laatste ingevulde resultaat telt.
- **Bewijs voor de top 3.** Voor de top 3 is een foto verplicht van het horloge, het scherm van het apparaat of een app.
- **Opbouw.** Neem eerst 10 minuten rustig inlopen of een warming-up. Doe de challenge niet op een dag met een benchmark of sim.

**Herhalingsnormen (voor de beschrijving in de app)**

| Oefening | NL | EN |
|---|---|---|
| Burpee | Borst en heupen raken de grond, daarna sta je volledig rechtop en spring je met je handen boven je hoofd. | Chest and hips touch the floor, then stand fully upright and jump with your hands overhead. |
| Air squat | Heupplooi onder de knie, daarna volledig gestrekt. | Hip crease below the knee, then fully extended. |
| Lunge | Achterste knie raakt de grond licht, wissel per herhaling van been. Lichaamsgewicht. | Back knee lightly touches the floor, alternate legs each rep. Bodyweight. |
| Push-up | Borst raakt de grond, armen volledig gestrekt bovenaan, lichaam in één lijn. | Chest touches the floor, arms fully locked out at the top, body in one line. |
| Wall sit | Rug tegen de muur, bovenbenen horizontaal, handen niet op de benen. | Back against the wall, thighs horizontal, hands off the legs. |
| Plank | Op onderarmen en tenen, lichaam in één lijn. De tijd stopt als de knieën of heupen de grond raken. | On forearms and toes, body in one line. Time stops when knees or hips touch the floor. |

**De 12 challenges**

| # | Naam NL / EN | Opdracht NL | Task EN | Invullen | Meting | Beste |
|---|---|---|---|---|---|---|
| 1 | 1 km tijdrit / 1 km time trial | Loop 1 km zo snel mogelijk. | Run 1 km as fast as you can. | tijd m:ss | gps of loopband 1 % | laagste |
| 2 | Compromised km / Compromised km | 30 burpees, direct gevolgd door 1 km hardlopen. Klok loopt door. | 30 burpees, straight into a 1 km run. Clock keeps running. | tijd m:ss | totale tijd | laagste |
| 3 | 100 squats / 100 squats | 100 air squats zo snel mogelijk. | 100 air squats as fast as you can. | tijd m:ss | tijd tot de 100e herhaling | laagste |
| 4 | 50 burpees / 50 burpees | 50 burpees zo snel mogelijk. | 50 burpees as fast as you can. | tijd m:ss | tijd tot de 50e herhaling | laagste |
| 5 | 100 lunges / 100 lunges | 100 lunges (50 per been, afwisselend) zo snel mogelijk. | 100 lunges (50 per leg, alternating) as fast as you can. | tijd m:ss | tijd tot de 100e herhaling | laagste |
| 6 | 5 minuten burpees / 5-minute burpees | Zoveel mogelijk burpees in 5 minuten. | As many burpees as possible in 5 minutes. | aantal | herhalingen in 5:00 | hoogste |
| 7 | Wall sit / Wall sit | Houd een wall sit zo lang mogelijk vol. | Hold a wall sit as long as you can. | tijd m:ss | tot je loslaat of opstaat | hoogste |
| 8 | Plank / Plank | Houd een plank op je onderarmen zo lang mogelijk vol. | Hold a forearm plank as long as you can. | tijd m:ss | tot knieën of heupen de grond raken | hoogste |
| 9 | 2 km tijdrit / 2 km time trial | Loop 2 km zo snel mogelijk. | Run 2 km as fast as you can. | tijd m:ss | gps of loopband 1 % | laagste |
| 10 | Burpeeladder / Burpee ladder | 10 burpees + 10 squats, 9 burpees + 10 squats, enzovoort tot 1 burpee + 10 squats. | 10 burpees + 10 squats, 9 burpees + 10 squats, and so on down to 1 burpee + 10 squats. | tijd m:ss | totale tijd (55 burpees, 100 squats) | laagste |
| 11 | Dubbele compromised / Double compromised | 50 lunges, 500 m hardlopen, 50 squats, 500 m hardlopen. | 50 lunges, 500 m run, 50 squats, 500 m run. | tijd m:ss | totale tijd | laagste |
| 12 | 2 minuten push-ups / 2-minute push-ups | Zoveel mogelijk push-ups in 2 minuten. Rusten mag, de klok loopt door. | As many push-ups as possible in 2 minutes. Resting is allowed, the clock keeps running. | aantal | herhalingen in 2:00 | hoogste |

**Volgorde:** gebruik deze lijst in de volgorde 1, 3, 2, 7, 4, 9, 5, 8, 11, 6, 10, 12. Dan wisselen lopen, kracht en uithouding elkaar af en komen er nooit twee loopchallenges na elkaar. Herhaal ze na 12 weken, zodat atleten hun eigen record kunnen verbeteren.

**Wat de app nodig heeft per challenge:**

- de eenheid, `time` of `reps`
- de richting, `asc` of `desc`
- een voorbeeldinvoer voor `ch.error.format.*` (zie hieronder)
- een plausibele ondergrens en bovengrens voor `ch.error.range`

Leg die grenzen vast voordat de challenge live gaat. Ze staan hier bewust niet in, omdat er geen gemeten data voor is.

**Per challenge: sleutels voor de app**

`ch.def.{nr}.*`: naam (`name`), korte naam voor het linkvoorbeeld (`short`), de opdracht (`task`, zie de tabel hierboven), "Zo meet je" (`how`), het type uitslag (`type`) en een invoervoorbeeld (`example`).

- Het type uitslag bepaalt welke `ch.result.text.*` en welk invoerveld de app toont: `low` = laagste tijd wint, `high` = hoogste aantal wint, `hold` = langste tijd wint.
- Het invoervoorbeeld laat alleen het formaat zien in `ch.error.format.*`. Het is geen norm en geen gemiddelde.

| Nr | `short` NL / EN | `how` NL | `how` EN | `type` | `example` |
|---|---|---|---|---|---|
| 1 | 1 km / 1 km | Buiten met een gps-horloge of telefoon, of op een loopband op 1 % helling. | Outside with a GPS watch or phone, or on a treadmill at 1% incline. | low | 4:12 |
| 2 | Comp. km / Comp. km | Start de klok bij de eerste burpee en stop na 1 km. Lopen buiten met gps of op een loopband op 1 % helling. | Start the clock on the first burpee and stop after 1 km. Run outside with GPS or on a treadmill at 1% incline. | low | 6:30 |
| 3 | 100 squats / 100 squats | Start de klok en stop bij de 100e squat die aan de norm voldoet. Tel hardop, of laat iemand tellen. | Start the clock and stop at the 100th squat that meets the standard. Count out loud, or have someone count. | low | 3:10 |
| 4 | 50 burpees / 50 burpees | Start de klok en stop bij de 50e burpee die aan de norm voldoet. | Start the clock and stop at the 50th burpee that meets the standard. | low | 4:00 |
| 5 | 100 lunges / 100 lunges | Start de klok en stop bij de 100e lunge. Wissel elke herhaling van been. | Start the clock and stop at the 100th lunge. Alternate legs every rep. | low | 5:30 |
| 6 | 5 min burpees / 5 min burpees | Zet een timer op 5:00. Tel alleen burpees die aan de norm voldoen. | Set a timer for 5:00. Only count burpees that meet the standard. | high | 62 |
| 7 | Wall sit / Wall sit | Start de klok als je bovenbenen horizontaal zijn. Stop als je loslaat of opstaat. | Start the clock when your thighs are horizontal. Stop when you let go or stand up. | hold | 2:15 |
| 8 | Plank / Plank | Start de klok als je in positie bent. Stop als je knieën of heupen de grond raken. | Start the clock once you're in position. Stop when your knees or hips touch the floor. | hold | 2:30 |
| 9 | 2 km / 2 km | Buiten met een gps-horloge of telefoon, of op een loopband op 1 % helling. | Outside with a GPS watch or phone, or on a treadmill at 1% incline. | low | 8:45 |
| 10 | Ladder / Ladder | De klok loopt door, ook als je rust. Stop na de laatste 10 squats. | The clock keeps running, also when you rest. Stop after the last 10 squats. | low | 9:30 |
| 11 | Dubbel comp. / Double comp. | De klok loopt van de eerste lunge tot het einde van de laatste 500 m. Lopen buiten met gps of op een loopband op 1 % helling. | The clock runs from the first lunge to the end of the last 500 m. Run outside with GPS or on a treadmill at 1% incline. | low | 9:00 |
| 12 | Push-ups / Push-ups | Zet een timer op 2:00. Tel alleen push-ups die aan de norm voldoen. | Set a timer for 2:00. Only count push-ups that meet the standard. | high | 55 |


**Uitgeschreven per sleutel** (voor de import):

| Sleutel | NL | EN |
|---|---|---|
| `ch.def.1.name` | 1 km tijdrit | 1 km time trial |
| `ch.def.1.short` | 1 km | 1 km |
| `ch.def.1.task` | Loop 1 km zo snel mogelijk. | Run 1 km as fast as you can. |
| `ch.def.1.how` | Buiten met een gps-horloge of telefoon, of op een loopband op 1 % helling. | Outside with a GPS watch or phone, or on a treadmill at 1% incline. |
| `ch.def.1.type` | low | low |
| `ch.def.1.example` | 4:12 | 4:12 |
| `ch.def.2.name` | Compromised km | Compromised km |
| `ch.def.2.short` | Comp. km | Comp. km |
| `ch.def.2.task` | 30 burpees, direct gevolgd door 1 km hardlopen. Klok loopt door. | 30 burpees, straight into a 1 km run. Clock keeps running. |
| `ch.def.2.how` | Start de klok bij de eerste burpee en stop na 1 km. Lopen buiten met gps of op een loopband op 1 % helling. | Start the clock on the first burpee and stop after 1 km. Run outside with GPS or on a treadmill at 1% incline. |
| `ch.def.2.type` | low | low |
| `ch.def.2.example` | 6:30 | 6:30 |
| `ch.def.3.name` | 100 squats | 100 squats |
| `ch.def.3.short` | 100 squats | 100 squats |
| `ch.def.3.task` | 100 air squats zo snel mogelijk. | 100 air squats as fast as you can. |
| `ch.def.3.how` | Start de klok en stop bij de 100e squat die aan de norm voldoet. Tel hardop, of laat iemand tellen. | Start the clock and stop at the 100th squat that meets the standard. Count out loud, or have someone count. |
| `ch.def.3.type` | low | low |
| `ch.def.3.example` | 3:10 | 3:10 |
| `ch.def.4.name` | 50 burpees | 50 burpees |
| `ch.def.4.short` | 50 burpees | 50 burpees |
| `ch.def.4.task` | 50 burpees zo snel mogelijk. | 50 burpees as fast as you can. |
| `ch.def.4.how` | Start de klok en stop bij de 50e burpee die aan de norm voldoet. | Start the clock and stop at the 50th burpee that meets the standard. |
| `ch.def.4.type` | low | low |
| `ch.def.4.example` | 4:00 | 4:00 |
| `ch.def.5.name` | 100 lunges | 100 lunges |
| `ch.def.5.short` | 100 lunges | 100 lunges |
| `ch.def.5.task` | 100 lunges (50 per been, afwisselend) zo snel mogelijk. | 100 lunges (50 per leg, alternating) as fast as you can. |
| `ch.def.5.how` | Start de klok en stop bij de 100e lunge. Wissel elke herhaling van been. | Start the clock and stop at the 100th lunge. Alternate legs every rep. |
| `ch.def.5.type` | low | low |
| `ch.def.5.example` | 5:30 | 5:30 |
| `ch.def.6.name` | 5 minuten burpees | 5-minute burpees |
| `ch.def.6.short` | 5 min burpees | 5 min burpees |
| `ch.def.6.task` | Zoveel mogelijk burpees in 5 minuten. | As many burpees as possible in 5 minutes. |
| `ch.def.6.how` | Zet een timer op 5:00. Tel alleen burpees die aan de norm voldoen. | Set a timer for 5:00. Only count burpees that meet the standard. |
| `ch.def.6.type` | high | high |
| `ch.def.6.example` | 62 | 62 |
| `ch.def.7.name` | Wall sit | Wall sit |
| `ch.def.7.short` | Wall sit | Wall sit |
| `ch.def.7.task` | Houd een wall sit zo lang mogelijk vol. | Hold a wall sit as long as you can. |
| `ch.def.7.how` | Start de klok als je bovenbenen horizontaal zijn. Stop als je loslaat of opstaat. | Start the clock when your thighs are horizontal. Stop when you let go or stand up. |
| `ch.def.7.type` | hold | hold |
| `ch.def.7.example` | 2:15 | 2:15 |
| `ch.def.8.name` | Plank | Plank |
| `ch.def.8.short` | Plank | Plank |
| `ch.def.8.task` | Houd een plank op je onderarmen zo lang mogelijk vol. | Hold a forearm plank as long as you can. |
| `ch.def.8.how` | Start de klok als je in positie bent. Stop als je knieën of heupen de grond raken. | Start the clock once you're in position. Stop when your knees or hips touch the floor. |
| `ch.def.8.type` | hold | hold |
| `ch.def.8.example` | 2:30 | 2:30 |
| `ch.def.9.name` | 2 km tijdrit | 2 km time trial |
| `ch.def.9.short` | 2 km | 2 km |
| `ch.def.9.task` | Loop 2 km zo snel mogelijk. | Run 2 km as fast as you can. |
| `ch.def.9.how` | Buiten met een gps-horloge of telefoon, of op een loopband op 1 % helling. | Outside with a GPS watch or phone, or on a treadmill at 1% incline. |
| `ch.def.9.type` | low | low |
| `ch.def.9.example` | 8:45 | 8:45 |
| `ch.def.10.name` | Burpeeladder | Burpee ladder |
| `ch.def.10.short` | Ladder | Ladder |
| `ch.def.10.task` | 10 burpees + 10 squats, 9 burpees + 10 squats, enzovoort tot 1 burpee + 10 squats. | 10 burpees + 10 squats, 9 burpees + 10 squats, and so on down to 1 burpee + 10 squats. |
| `ch.def.10.how` | De klok loopt door, ook als je rust. Stop na de laatste 10 squats. | The clock keeps running, also when you rest. Stop after the last 10 squats. |
| `ch.def.10.type` | low | low |
| `ch.def.10.example` | 9:30 | 9:30 |
| `ch.def.11.name` | Dubbele compromised | Double compromised |
| `ch.def.11.short` | Dubbel comp. | Double comp. |
| `ch.def.11.task` | 50 lunges, 500 m hardlopen, 50 squats, 500 m hardlopen. | 50 lunges, 500 m run, 50 squats, 500 m run. |
| `ch.def.11.how` | De klok loopt van de eerste lunge tot het einde van de laatste 500 m. Lopen buiten met gps of op een loopband op 1 % helling. | The clock runs from the first lunge to the end of the last 500 m. Run outside with GPS or on a treadmill at 1% incline. |
| `ch.def.11.type` | low | low |
| `ch.def.11.example` | 9:00 | 9:00 |
| `ch.def.12.name` | 2 minuten push-ups | 2-minute push-ups |
| `ch.def.12.short` | Push-ups | Push-ups |
| `ch.def.12.task` | Zoveel mogelijk push-ups in 2 minuten. Rusten mag, de klok loopt door. | As many push-ups as possible in 2 minutes. Resting is allowed, the clock keeps running. |
| `ch.def.12.how` | Zet een timer op 2:00. Tel alleen push-ups die aan de norm voldoen. | Set a timer for 2:00. Only count push-ups that meet the standard. |
| `ch.def.12.type` | high | high |
| `ch.def.12.example` | 55 | 55 |

Bij elke challenge met herhalingen toont de app onder "Zo meet je" ook de herhalingsnorm uit de tabel hierboven.


### 10.1 Aankondiging (maandag)

Voor in de app (bovenaan de challenge-tab en als melding) en voor social.

| Sleutel | NL | EN |
|---|---|---|
| `ch.ann.push` | Challenge week {week}: {name_ch}. Invullen kan tot zondag 18:00. | Challenge week {week}: {name_ch}. Submit by Sunday 18:00. |
| `ch.ann.title` | Challenge week {week}: {name_ch} | Challenge week {week}: {name_ch} |
| `ch.ann.body` | {task} Je kunt hem doen in de gym, thuis of buiten. Vul je resultaat in voor zondag 18:00. De uitslag is per divisie. Vorige keer deed je {old}; dit is je kans om dat te verbeteren. | {task} You can do it at the gym, at home or outside. Submit your result by Sunday 18:00. Standings are per division. Last time you did {old}; this is your chance to beat it. |
| `ch.ann.body.first` | {task} Je kunt hem doen in de gym, thuis of buiten. Vul je resultaat in voor zondag 18:00. De uitslag is per divisie. | {task} You can do it at the gym, at home or outside. Submit your result by Sunday 18:00. Standings are per division. |

**Social, maandag (NL):**

```
Challenge week {week}: {name_ch}.

{task}

Overal te doen: in de gym, thuis of buiten. Vul je resultaat in de app in voor zondag 18:00. Uitslag per divisie.

Doe je mee? Link in bio.
```

**Social, Monday (EN):**

```
Challenge week {week}: {name_ch}.

{task}

Do it anywhere: at the gym, at home or outside. Submit your result in the app by Sunday 18:00. Standings per division.

Are you in? Link in bio.
```

### 10.2 Uitslag (zondag)

| Sleutel | NL | EN |
|---|---|---|
| `ch.res.push` | Uitslag challenge week {week}: jij werd {rank} in {divisionFull} met {result}. | Challenge week {week} standings: you finished {rank} in {divisionFull} with {result}. |
| `ch.res.push.pr` | Uitslag challenge week {week}: {result}, een nieuw persoonlijk record. | Challenge week {week} standings: {result}, a new personal record. |
| `ch.res.push.none` | De uitslag van challenge week {week} staat klaar. Maandag komt de volgende. | The challenge week {week} standings are in. The next one starts Monday. |
| `ch.res.title` | Uitslag week {week}: {name_ch} | Week {week} standings: {name_ch} |
| `ch.res.body` | {n} resultaten in {divisionFull}. Jij: plaats {rank} met {result}. | {n} results in {divisionFull}. You: place {rank} with {result}. |
| `ch.res.next` | Maandag staat de volgende challenge klaar. | The next challenge starts Monday. |

`{n}` is het echte aantal ingevulde resultaten in die divisie. Toon het alleen als het 5 of meer is; laat de zin anders weg.

**Social, zondag (NL):**

```
Uitslag challenge week {week}: {name_ch}.

Snelste per divisie:
{division_1}: {name_1} · {result_1}
{division_2}: {name_2} · {result_2}
{division_3}: {name_3} · {result_3}

Maandag staat de volgende klaar. Link in bio.
```

**Social, Sunday (EN):**

```
Challenge week {week} standings: {name_ch}.

Best per division:
{division_1}: {name_1} · {result_1}
{division_2}: {name_2} · {result_2}
{division_3}: {name_3} · {result_3}

The next one starts Monday. Link in bio.
```

In de social-uitslag komen alleen bijnamen van atleten met de stand "Gym en vrienden" of hoger die daarvoor toestemming hebben gegeven (zie open punten), en alleen resultaten met bewijsfoto.

---

## 11. Gyms: tekst voor gymbeheerders

### 11.1 Op `/gym`

**NL**

> **Een ranglijst voor je gym, op basis van wat je leden echt meten**
>
> Met Benchmrk traint elk lid op een plan op de eigen drempel, naar de eigen streeftijd. De ranglijst van je gym laat per divisie zien wie het meeste van de afstand naar zijn streeftijd heeft overbrugd. Zo kan een lid dat aan zijn eerste race begint net zo goed bovenaan staan als je snelste atleet.
>
> **Hoe de score werkt.** 70 van de 100 punten komen uit benchmarks: hoeveel sneller de voorspelde eindtijd is dan bij de start. 30 punten komen uit sleuteltrainingen met tempo en hartslag die bij het plan passen. Afvinken zonder gegevens telt niet.
>
> **Voor aan de muur.** Zet de ranglijst op een tv in je gym. Het scherm ververst zichzelf en is leesbaar op 3 meter. Er staan alleen bijnamen en divisies op.
>
> **Privacy.** Leden staan alleen op de ranglijst als ze daar zelf voor kiezen. Hartslag, gewicht, blessures en e-mail zijn nooit zichtbaar.
>
> **Wat je als beheerder doet.** Je deelt de gymcode met je leden, zet eventueel je eigen sim-opbouw in de app, en beoordeelt gemelde resultaten in "Mijn gym".
>
> [Gymcode aanvragen]

**EN**

> **A leaderboard for your gym, based on what your members actually measure**
>
> With Benchmrk, every member trains on a plan built on their own threshold, towards their own goal time. Your gym's leaderboard shows, per division, who has closed the most of the gap to their goal time. A member preparing for a first race can top it just as well as your fastest athlete.
>
> **How the score works.** 70 of the 100 points come from benchmarks: how much faster the predicted finish is than at the start. 30 points come from key sessions with pace and heart rate that match the plan. Ticking boxes without data doesn't count.
>
> **For the wall.** Show the leaderboard on a TV in your gym. The screen refreshes itself and is readable from 3 metres. It only shows nicknames and divisions.
>
> **Privacy.** Members only appear on the leaderboard if they choose to. Heart rate, weight, injuries and email are never visible.
>
> **What you do as an admin.** Share the gym code with your members, optionally set your own sim structure in the app, and review reported results in "My gym".
>
> [Request a gym code]

| Sleutel | NL | EN |
|---|---|---|
| `gym.cta` | Gymcode aanvragen | Request a gym code |
| `gym.disclaimer` | Benchmrk is niet verbonden aan HYROX. | Benchmrk is not affiliated with HYROX. |

### 11.2 Mail aan gymbeheerders

**NL**

```
Onderwerp: Een ranglijst voor {gym}, op basis van gemeten vooruitgang

Hoi {voornaam},

Ik ben Rick, oprichter van Benchmrk. Benchmrk maakt voor elke atleet een HYROX-trainingsplan op de eigen drempel en voorspelt de eindtijd per run, station en Roxzone.

Voor gyms is er nu een ranglijst. Die laat per divisie zien wie het meeste van de afstand naar zijn streeftijd heeft overbrugd. De score komt vooral uit benchmarks, niet uit afgevinkte trainingen. Zo kan iemand die aan zijn eerste race begint net zo goed bovenaan staan als je snelste lid.

Wat je ervoor terugkrijgt:
- Een ranglijst per divisie, per maand
- Een scherm voor aan de muur, leesbaar op 3 meter
- Een wekelijkse challenge die je leden in de gym of thuis kunnen doen
- Je eigen sim-opbouw in de app, zodat de plannen van je leden aansluiten op je lessen

Leden doen alleen mee als ze daar zelf voor kiezen. Hartslag, gewicht, blessures en e-mail zijn nooit zichtbaar voor anderen.

Zal ik een gymcode voor {gym} aanmaken? Dan stuur ik je de link voor het muurscherm erbij.

Groet,
Rick van de Ven
Benchmrk · benchmrk.ai/gym
```

**EN**

```
Subject: A leaderboard for {gym}, based on measured progress

Hi {first_name},

I'm Rick, founder of Benchmrk. Benchmrk builds a HYROX training plan for every athlete on their own threshold and predicts the finish time per run, station and Roxzone.

There's now a leaderboard for gyms. It shows, per division, who has closed the most of the gap to their goal time. The score mainly comes from benchmarks, not ticked-off sessions. Someone preparing for a first race can top it just as well as your fastest member.

What you get:
- A leaderboard per division, per month
- A wall screen, readable from 3 metres
- A weekly challenge your members can do at the gym or at home
- Your own sim structure in the app, so your members' plans match your classes

Members only take part if they choose to. Heart rate, weight, injuries and email are never visible to others.

Shall I create a gym code for {gym}? I'll send you the wall screen link along with it.

Best,
Rick van de Ven
Benchmrk · benchmrk.ai/gym
```

---

## Afwijkingen van de referentie-HTML

Volgens DESIGN.md wint COPY.md als de referentie-HTML afwijkt. Bouw dus met de sleutels hierboven. 

**Oude sleutelnamen in DESIGN.md:**

- `card.ch.footer` heet nu `card.ch.cta` (story) en `card.ch.ctaLine` (feed, link).
- `ch.error.format` heet nu `ch.error.format.time` en `ch.error.format.reps`.

**Verschillen in tekst:**


| Plek | In de referentie | In COPY.md | Waarom |
|---|---|---|---|
| Challenge, onder de tabel | "Meld resultaat" | "Resultaat melden" (`ch.report`) | Gelijk aan de ranglijst |
| Kaartaanbod, racevoorspelling | geen referentie | "Je eerste voorspelling: {time}" | Het getal in de titel, zoals bij de benchmark-PR |
| Gymscherm, deadline | "invullen kan tot zondag 18:00" | "Invullen kan tot zondag 18:00" | Gelijk aan de challenge-tab |
| Ranglijst, geen gym (DESIGN.md) | knoppen "Gym kiezen" en "Gym aanmelden" | "Gymcode invullen" en "Gym aanmelden" | Koppelen gaat in de app via de gymcode; een gymlijst om uit te kiezen bestaat nog niet |
| Ranglijst, Privé (DESIGN.md) | "Je staat niet op de lijst (stand: Privé)." + "Meedoen" | `lb.private.*` met "Zichtbaarheid aanpassen" | Gelijk aan de referentie-HTML; legt uit wat je ziet en wat je moet doen |
| Ranglijst, nog niet op de lijst (DESIGN.md) | "Nog 1 benchmark tot je op de lijst staat" | `lb.notYet.short` als korte balk, `lb.notYet.*` als blok | Beide staan erin; de bouwer kiest per breedte |
| Procenten op kaarten | "74% → 83%" | idem, zonder spatie | Mono-cijfers zonder spatie, in alle talen |
| Linkpagina, kans | "83 %" | "83%" | Mono-cijfers zonder spatie, zoals op de kaarten |
| Challenge, divisiechips | "Open Women" … | korte vorm `div.*` ("Open · Women") | Gelijk aan de ranglijst en het muurscherm |
| Ranglijst, scorebalk (aria-label) | "progressie 40 van 70, op schema 24 van 30" | `lb.row.scoreLabel` begint met "Score {score}:" | Een schermlezer hoort eerst het totaal |
| Ranglijst, standdatum | "stand per 25 okt · 05:00" | "Stand per {date}" | Hoofdletter aan het begin van een zin |
| Privacy, nooit zichtbaar | één regel met vet begin | `priv.never.title` + `priv.never.body` | De bouwer mag ze op één regel zetten, titel vet met dubbele punt |
| Kaartaanbod, laden (aria-label) | "Kaart maken" | "Kaart maken…" | Zelfde tekst als zichtbaar |
| Linkpagina, iframe-titel | "Kaart van lunge_lotte: benchmark-PR −0:46, van 14:32 naar 13:46" | `card.pr.alt` (en de andere `card.*.alt`) | Eén alt-tekst per kaart, ook als iframe-titel |
| Ranglijst, lege divisie (DESIGN.md) | "Nog niemand in Open · Women deze maand." | `lb.emptyDivision.*` | Zegt ook wat je kunt doen |
| Ranglijst, geen toegang (DESIGN.md) | "…alleen voor leden van [gym]." | "…alleen zichtbaar voor leden van {gym}." | Kleine formulering |
| Toestemming | twee alinea's | één sleutel `consent.body` | De bouwer mag splitsen na "…komen in de uitslag." |

## Open punten

1. **Bijnamen in de social-uitslag op zondag.**
   - "Gym en vrienden" geeft toestemming voor zichtbaarheid binnen de gym en de vriendengroep, niet op het openbare Instagram-account.
   - Kies een van beide:
     - een extra vinkje "Mijn bijnaam mag in de wekelijkse uitslag op social"
     - alleen de top 3 die er per keer toestemming voor geeft
   - Tot je beslist: de social-uitslag zonder namen, alleen het resultaat per divisie.
2. **"1 maand gratis" via referral.** Deze claim is nog niet bevestigd, dus hij staat niet in de deelteksten. Na bevestiging kan hij in `kpage.cta.sub`.
3. **Prijzen voor winnaars.** Dit is nog een open vraag in het plan, dus er staat nergens een beloning in.
4. **Muurscherm.** Of gyms dit mogen aanzetten, staat nog als open vraag in het plan. De teksten zijn klaar.
5. **Grenzen per challenge.** Voor `ch.error.range` zijn een plausibele ondergrens en bovengrens per challenge nodig. Leg die vast voordat een challenge live gaat. Ze staan hier niet in, omdat er nog geen gemeten data is.
6. **Meervoud.** `lb.members`, `lb.notListed`, `lb.notYet.*`, `lb.notYet.short` en `ch.standings.count` hebben een enkelvoudsvorm nodig bij `{n}` = 1. Gebruik de meervoudsregels van de i18n-bibliotheek.
7. **Bestaande app-teksten.** Deze teksten zitten al in de app en krijgen hier geen nieuwe sleutel:
   - het zijmenu-item "Gym" in Instellingen (`st.gym`)
   - de achtergrondregel "Benchmark 2 van 5 opgeslagen" achter het kaartaanbod
   Ontbreekt een van beide toch, voeg hem dan toe in dezelfde toon.
