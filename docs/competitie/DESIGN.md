# Competitie en deelbare elementen: ontwerp (fase 1 en 2)

Status 26 okt 2026: **compleet voor fase 1 en 2.** Deel 1 (de kaarten en de gym-ranglijst) is door Rick goedgekeurd op 26 okt. Deel 2 is daarna uitgewerkt: het kaartaanbod, de linkpagina, de challenge, de privacy-instelling en het gymscherm.

Teksten: `claude/competitie/COPY.md` is leidend. De sleutels staan per scherm hieronder genoemd. Waar de referentie-HTML afwijkt, wint COPY.md.

Bron: het plan "Competitie en deelbare elementen" (Claude Doc). Huisstijl: **A licht**, zie `claude/benchmrk-design/tokens-a-licht.css`.

> Let op: `claude/benchmrk-design/DESIGN.md` beschrijft nog de afgevallen whiteboard-richting (C). De geldende huisstijl is A licht. Gebruik de tokens en de A-licht-opdrachten, niet die DESIGN.md.

## Gedeelde regels

- **Kleur:**
  - Ondergrond `#EFEEEA`, papier `#FFFFFF`, inkt `#141413`, haarlijn `#D6D3CB`, gedempt `#6A675F` (minimum voor kleine tekst).
  - **Lime `#D4F046` alleen als vlak**, met inkttekst erop: het MRK-blok, de kans, het verschilgetal, de CTA, de eigen rij. Nooit als tekstkleur.
- **Type:**
  - Archivo voor tekst en koppen. Koppen in 800, `font-stretch: 72%`, uppercase.
  - IBM Plex Mono voor alle tijden, scores en percentages, met tabulaire cijfers.
- **Vorm:**
  - Kaarten en panelen zijn een witte "bon": radius 2px, 1px haarlijn, schaduw `0 1px 0 #D6D3CB, 0 18px 40px rgba(20,20,19,.12)`, gestippelde scheidingslijn `2px dashed #A8A498`.
  - Knoppen hebben radius 3px.
- **Geen** HYROX-logo's, geen nagemaakte officiële uitslagen en geen emoji.
- **Iconen:** pijlen en vinkjes zijn tekst ("→") of eenvoudige SVG.
- **Voorbeelddata:** overal het label "VOORBEELD" (mono, omlijnd) en alleen bijnamen. Ricks echte resultaat (1:19 → 1:14 Pro) mag alleen met het label "Echt resultaat · de oprichter".
- **Wat nooit zichtbaar is:** e-mail, hartslag, gewicht, blessures en notities.

---

## 1. Deelbare kaarten

Er zijn vier typen, elk in drie formaten: de drie uit fase 1 plus de challengekaart uit fase 2 (zie §5). De afbeeldingen worden op de server getekend (een Vercel-functie, bijvoorbeeld `@vercel/og`/Satori) uit de gegevens in `share_cards`. De referentie-HTML laat precies zien wat er getekend moet worden.

| Formaat | Maat | Gebruik |
|---|---|---|
| Story | 1080 × 1920 | Instagram/TikTok-story |
| Feed | 1080 × 1080 | Feedpost |
| Linkvoorbeeld | 1200 × 630 | Open Graph-afbeelding van `benchmrk.ai/k/<code>` |

### Opbouw (alle typen)

1. **Bovenrand:** het woordmerk BENCH+MRK, met MRK op een lime blok. Bij voorbeelddata staat rechts het label "VOORBEELD"; bij echte kaarten van gebruikers valt dat weg.
2. **De bon:** de titel (uppercase condensed), de bijnaam (Archivo 700) met rechts de divisie (mono), een gestippelde lijn, en daarna het **hoofdgetal** heel groot in mono.
3. **CTA-balk:** een lime vlak met "Reken je eigen race door" en een pijl. Daaronder in mono `benchmrk.ai` en `/k/<code>`. De code draagt de referral van de deler.

### Leesbaarheid in een story

- Het hoofdgetal is minstens 200px hoog op 1080 breed. Daardoor blijft het op een telefoon ongeveer 10% van de schermbreedte per teken, en is het in één oogopslag leesbaar.
- **Veilige zones voor de Instagram-interface:** boven 240px en onder 280px leeg. Het woordmerk staat net onder de bovenste zone, de CTA net boven de onderste.
- Hooguit drie regels secundaire info, minimaal 30px.

### Per type

| Type | Hoofdgetal | Secundair | Data uit |
|---|---|---|---|
| **Racevoorspelling** | Verwachte eindtijd (`1:18:41`) | Doel, kans op lime vlak, een balk runs/stations/Roxzone in drie grijstinten met de tijden | Engine-voorspelling na de intake of na een benchmark |
| **Benchmark-PR** | Verschil met de vorige benchmark op een lime vlak (`−0:46`) | Oude tijd doorgestreept → nieuwe tijd, nieuwe voorspelling, kans oud → nieuw | `benchmarks`: vorige en nieuwe benchmark van hetzelfde type |
| **Vooruitgang sinds de start** | Winst in voorspelde tijd op een lime vlak (`−3:12`) | Starttijd doorgestreept → nu; een lijn van de voorspelde tijd per week met een gestippelde doellijn, het laatste punt als lime vierkant | Voorspelling per week sinds week 1 |

**Formaatverschillen:**

- **Story:** de bon is licht gedraaid (±0.5°) en vult de ruimte tussen woordmerk en CTA.
- **Feed:** de bon staat recht en het hoofdgetal staat naast de secundaire info.
- **Linkvoorbeeld:** twee kolommen, gescheiden door een gestippelde lijn.
  - Links staan de titel, de bijnaam en het hoofdgetal (≥104px).
  - Rechts staan de kans of de grafiek en de CTA.
  - Tekst is hier minimaal 20px, omdat de preview vaak op ~500px breed getoond wordt.

### Staten en randgevallen

- **Lange bijnaam:** maximaal 20 tekens. Het lettertype krimpt tot 36px in een story en loopt daarna door met een ellips.
- **Doubles:** de bijnaam wordt "teamnaam" en de divisie "Doubles · Open". De verdeling per station komt in fase 3.
- **Geen kans beschikbaar** (bijvoorbeeld bij een te kort plan): het kansvlak vervalt en de balk blijft.
- **Vooruitgang met minder dan 2 meetpunten:** de kaart wordt niet aangeboden.
- **Taal:** de kaart volgt de taal van de deler. Laat in de DE-versie ruimte voor langere titels: de titel mag op twee regels.

### Referentiebestanden

`reference/kaarten/<type>-<story|feed|link>.html`, met `racevoorspelling`, `benchmark-pr`, `vooruitgang` en `challenge`. Elk bestand is precies op maat.

---

## 2. Gym-ranglijst (desktop en mobiel)

Route in de app: `/ranglijst` (`/gym` is de openbare marketingpagina voor gyms en PT's). Zichtbaar voor leden en beheerders van die gym. Wie in de stand "Privé" staat, ziet de lijst wel maar staat er niet op.

### Opbouw

1. **Kop:** "RANGLIJST" (`lb.title`, condensed), daaronder de gymnaam en "23 leden doen mee" in mono. Rechts de tekstknop **"Hoe werkt de score?"**.
2. **Bedieningsbalk**, afgesloten met een inktlijn van 1.5px:
   - **Tabs** "Op schema" en "Snelste": een gesegmenteerde knop met inktrand. De actieve tab is inkt-gevuld.
   - **Divisiefilter:** chips voor Open · Women, Open · Men, Pro · Women, Pro · Men en Doubles. Precies één is actief, met lime vlak en inktrand. Standaard is dat de eigen divisie.
   - **Periode:** een select per maand, "oktober 2026" in mono. Standaard de lopende maand. Vorige maanden zijn alleen-lezen eindstanden.
3. **Uitleg (één klik):** de knop klapt een wit paneel open onder de bedieningsbalk, met:
   - de twee onderdelen groot: **70** progressie naar je doel en **30** op schema, elk met één zin uitleg;
   - een rekenvoorbeeld rechts, achter een inktlijn: start 1:24:00 · doel 1:20:00 · nu 1:22:00 → 35 van 70;
   - de regels: per divisie, minimaal 2 benchmarks of 4 weken, en elke maand een nieuwe stand.

   Het paneel gebruikt `aria-expanded` en klapt dicht met nog een klik of Esc.
4. **Tabel "Op schema":**

   | Kolom | Inhoud |
   |---|---|
   | # | Rang in mono 22px |
   | Atleet | Bijnaam (700), met daaronder "start 1:24:10" in mono |
   | Score | Het getal 0–100 in mono 26px, met een balk van 160px. Het progressiedeel (max 70) is inkt, het schemadeel (max 30) grijs `#8A877F`, de rest `#E4E2DC`, met een `aria-label` dat beide delen noemt |
   | Voorspelling | Start → nu, met "nu" vet |
   | Op schema | Bijvoorbeeld "26/30" |
   | Week | Verandering in score sinds vorige week (+4 / 0 / −1) |

5. **Tabel "Snelste":** rang, atleet, voorspelde eindtijd (mono 24px, 600), datum van de laatste benchmark, en winst sinds de start.
6. **Onder de tabel:**
   - "4 leden nog niet op de lijst: minder dan 2 benchmarks of 4 weken training", met rechts "stand per 25 okt · 05:00" (de cron).
   - **Voettekst:** waarom je op de lijst staat (je privacystand), met een link "Wijzigen" en een link "Resultaat melden".

### Eigen regel

- De rij krijgt een lime tint als achtergrond (`#F6FADF`), een lime balk van 6px aan de binnenkant van de rangcel, en een "JIJ"-label (mono, lime vlak) achter de bijnaam.
- Op mobiel verschijnt een vaste balk onderaan ("Jij · #6 · Open · Men" met de score op een lime vlak) zolang de eigen regel buiten beeld is. Gebruik een IntersectionObserver; zodra de eigen regel zichtbaar is, verdwijnt de balk. Een tik op de balk scrolt naar de eigen regel.

### Gemarkeerde resultaten

Een benchmark met een plausibiliteitsvlag krijgt het label "Wordt bekeken" (`lb.flagged`) (mono, omlijnd) achter de bijnaam. De score telt pas mee na bevestiging. Tot die tijd rekent de lijst met de laatste bevestigde benchmark.

### Staten

| Staat | Weergave |
|---|---|
| **Laden** | De bedieningsbalk staat er al. De tabel toont 6 skeletregels: grijze balken op `#E4E2DC`, zonder animatie of hooguit een rustige fade. |
| **Leeg (divisie)** | "Nog niemand in Open · Women deze maand." met een knop "Nodig iemand uit" (de referral-link). |
| **Leeg (geen gym)** | "Je bent nog niet aan een gym gekoppeld." met de knoppen "Gym kiezen" en "Gym aanmelden". |
| **Zelf nog niet op de lijst** | Bovenaan een smalle balk: "Nog 1 benchmark tot je op de lijst staat", met de knop "Benchmark plannen". |
| **Privé-stand** | Bovenaan: "Je staat niet op de lijst (stand: Privé)." met de knop "Meedoen". Die opent de privacy-instelling. |
| **Geen toegang** (geen lid van deze gym) | "Deze ranglijst is alleen voor leden van [gym]." Er wordt geen data getoond. |
| **Afgelopen maand** | Het label "Eindstand oktober" naast de titel. De weekkolom vervalt. |

### Mobiel (< 760px)

- De app-navigatie wordt de bestaande onderbalk; de kop stapelt.
- De tabs worden twee knoppen over de volle breedte.
- De divisiechips staan op één rij die horizontaal scrollt, tot aan de schermrand.
- De periode-select staat eronder.
- De tabel houdt alleen #, Atleet en Score. Bij de score staan het getal en de balk (84px) onder elkaar, rechts uitgelijnd. De voorspelling en "op schema" verschijnen bij een tik op de rij, in een uitklapregel.
- Doelen zijn minimaal 44px hoog.

### Referentiebestand

`reference/gym-ranglijst.html`, één responsieve pagina met werkende tabs, chips en uitleg. Bovenaan staat een zwarte referentiebalk waarmee je elke staat opent; die balk hoort niet in productie. De staten zijn ook direct te openen met `?state=laden`, `nietoplijst`, `prive`, `leegdivisie`, `geengym`, `geentoegang` of `afgesloten`.

- `?tab=snelste` opent de tweede tab.
- `?uitleg=1` opent de uitleg.

---


## 3. Kaart aanbieden in de app

**Wanneer:** na de intake (racevoorspelling), na een sneller benchmarkresultaat (benchmark-PR), elke 4 weken (vooruitgang) en na een challenge-PR of een top 10 (challenge). Teksten: `share.offer.*`, `share.*`.

### Opbouw

- **Desktop:** een modaal venster van 920px breed, met de achtergrond gedimd (inkt op 45 %).
  - Links staat de kaart op een grijs vlak (`#E4E2DC`).
  - Rechts staan:
    - de titel, bijvoorbeeld "BENCHMARK 2: −0:46" met het verschil in mono, en één zin uitleg;
    - de formaatkeuze (segment met Story 9:16, Feed 1:1 en Link);
    - de regel "Op de kaart staat je bijnaam: lunge_lotte. Wijzigen";
    - de knoppen **Delen** (lime) en **Opslaan** (omlijnd), naast elkaar;
    - de tekstknoppen Kopieer link, Kopieer bijschrift en Niet nu;
    - de privacyregel "Op de kaart staan alleen je bijnaam, divisie en deze cijfers…".
- **Mobiel:** een bottom sheet over de volle breedte, met radius 10px boven, een greep en maximaal 92 % schermhoogte.
  - De kaart staat bovenaan, met een hoogte van maximaal 34 % van het scherm, zodat de knoppen in beeld blijven.
  - Delen en Opslaan staan in een **vaste actiebalk onderin de sheet**, sticky en 52px hoog.

**Knopgedrag:**

- **Delen** opent het deelmenu van de telefoon (Web Share API, met het afbeeldingsbestand en de link).
- **Opslaan** downloadt de PNG van het gekozen formaat.
- **Kopieer link** kopieert `benchmrk.ai/k/<code>`.
- **Kopieer bijschrift** kopieert een `cap.*`-tekst, in de taal van de app.

### Staten

| Staat | Weergave |
|---|---|
| Laden | Op de plek van de kaart staat een skelet in de kaartverhouding met "Kaart maken…" (`share.loading`). Delen, Opslaan en de kopieerknoppen zijn uitgeschakeld. |
| Geen bijnaam | De bijnaamregel vervalt. Er verschijnt een melding (`share.nicknameMissing`) en Delen/Opslaan worden één knop **Bijnaam kiezen**, die naar de privacy-instelling gaat en daarna terugkomt. |
| Fout | Op de plek van de kaart staat "De kaart kon niet worden gemaakt…" (`share.error.render`) met **Opnieuw proberen**. De acties zijn uitgeschakeld. |
| Opgeslagen / gekopieerd | Een toast onderin (`share.toast.*`). Op mobiel staat die boven de tabbalk. |
| Delen niet ondersteund | De app slaat het bestand op en toont de toast `share.error.noShare`. |

**Referentie:** `reference/kaart-aanbieden.html`, met de staten `?state=laden`, `bijnaam`, `fout` en `opgeslagen`.

---

## 4. Openbare linkpagina `benchmrk.ai/k/<code>`

Een openbare pagina zonder account. Teksten: `kpage.*`. De Open Graph-tags komen uit `og.*`, met de linkvoorbeeld-afbeelding van de kaart.

### Opbouw

1. **Kop:** het woordmerk en de knop "Inloggen".
2. **Desktop:** twee kolommen, links ~45 % en rechts ~55 %.
   - **Links:**
     - de regel "Gedeeld door **lunge_lotte** · Open Women" (`kpage.sharedBy`);
     - daaronder de kaart in feed-formaat (1:1, maximaal 520px).
   - **Rechts:** een witte bon met:
     - de titel "Reken je eigen race door" en de uitlegzin;
     - de velden **Divisie**, vooraf ingevuld met de divisie van de deler en voorzien van een lime label "INGEVULD" en de hulpregel `kpage.check.prefilled`;
     - de velden Drempeltempo, Doeltijd en Weken;
     - de knop **Reken door** (inkt).
3. **Na het doorrekenen:** onder het formulier verschijnt het resultaat, in dezelfde vorm als de snelle check op de homepage. Daarin staan de verwachte tijd in groot mono, de kans op een lime vlak, de balk runs/stations/Roxzone, en de regel "Voorbeeldberekening…". Het resultaat gebruikt `aria-live`.
4. **CTA:** **Bouw mijn volledige plan** (lime, volle breedte) met `kpage.cta.sub`. De link draagt de referral-code van de deler (`?ref=<code>`), en die code wordt bewaard tot de registratie.
5. Een korte regel over Benchmrk (`kpage.about`) en een footer met `kpage.disclaimer`.

**Mobiel (< 860px):** één kolom, met de kaart op volle breedte en de check eronder. Velden in twee kolommen, onder 380px één kolom.

### Staten

| Staat | Weergave |
|---|---|
| Normaal | Kaart + lege check (alleen de divisie is ingevuld). |
| Berekend | Resultaat zichtbaar, velden gevuld. |
| Kaart bestaat niet | Op de plek van de kaart staat `kpage.notFound.*`. De check werkt gewoon, zonder ingevulde divisie. De pagina geeft een 404-status, maar toont geen standaard-404-pagina. |
| Kaart van een account dat nu Privé is | Gedeelde kaarten blijven zichtbaar tot de eigenaar ze verwijdert. Dat is opt-in, gebeurd bij het delen. |

**Referentie:** `reference/kaart-linkpagina.html`, met de staten `?state=berekend` en `weg`.

---

## 5. Wekelijkse challenge

Route in de app: de tab **Challenge**. Teksten: `ch.*`. De challengelijst en de volgorde staan in COPY.md §10.

### Opbouw

1. **Kop:**
   - links "CHALLENGE WEEK 44" (condensed) met de naam van de challenge ("1 km tijdrit");
   - rechts een mono label met de status: "Invullen kan tot zondag 18:00" of "Gesloten".
2. **Desktop:** twee kolommen.
   - **Links:**
     - **Opdracht:** een bon met de opdracht groot (22px). Na een gestippelde lijn volgen "Zo meet je", "Vooraf" en "Uitslag", met de normen uit COPY.md §10.
     - **Je resultaat:** een groot invoerveld in mono (m:ss of een aantal) met **Opslaan**, en daaronder je persoonlijk record op deze challenge.
   - **Rechts:** **Tussenstand / Uitslag**, met divisiechips (standaard je eigen divisie) en een tabel met rang, bijnaam en resultaat.
     - De eigen regel is gemarkeerd zoals op de ranglijst, met de labels JIJ en PR.
     - Top 3 met bewijs krijgen "foto ok".
     - Onder de tabel staan "Top 3 telt alleen met een foto als bewijs" en **Meld resultaat**.
3. **Na opslaan:**
   - Het resultaat staat groot met **Aanpassen**, plus de regel "Nieuw persoonlijk record. Je vorige: 4:09" (`ch.newPR`).
   - Daaronder een lime-getint blok met een miniatuur van de challengekaart, de tekst "Persoonlijk record. Maak er een kaart van." (`ch.card.offer.pr`) en **Maak een kaart**. Die knop opent het kaartaanbod (§3).
   - Daaronder de omlijnde knop **Daag een vriend uit** (`invite.ch.text`).
4. **Top 3:** tussen het resultaat en het kaartblok staat een omlijnd blok "Bewijs voor de top 3" (`ch.proof.*`) met **Foto toevoegen**.

**Mobiel:** één kolom, met eerst de opdracht, dan je resultaat, dan de tussenstand. Bij een gesloten challenge staat de **uitslag bovenaan**. De chips scrollen horizontaal. De knoppen zijn minimaal 48–52px.

### Challengekaart (fase 2)

Deze kaart volgt de opbouw van de andere kaarten:

- **Titel:** "CHALLENGE WEEK 44" met de naam van de challenge.
- **Midden:** bijnaam en divisie, met het resultaat heel groot in mono.
- **Labels op lime vlakken:** "PERSOONLIJK RECORD" en/of "TOP 10 · PLAATS 4".
- **Vorige resultaat:** doorgestreept.
- **CTA:** "Doe deze week mee" (`card.ch.footer`), met daaronder "Reken je eigen race door · benchmrk.ai" in mono.
- **Formaten:** story, feed en linkvoorbeeld, zoals de andere kaarten.

### Staten

| Staat | Weergave |
|---|---|
| Open, nog niets ingevuld | Invoerveld leeg, met je record eronder. |
| Opgeslagen + PR | Zie "Na opslaan". |
| Top 3 | Bewijsblok zichtbaar. Eigen regel op plaats 1–3, nog zonder "foto ok". |
| Ongeldige invoer | Het veld krijgt een arcering en de melding `ch.error.format`, of `ch.error.range` bij een onwaarschijnlijk resultaat. Alleen opslaan valideert, niet elk teken. |
| Gesloten | Status "Gesloten", titel "Uitslag" met het aantal resultaten (alleen bij ≥ 5), en het kaartaanbod voor de top 10. |
| Privé | De melding `ch.private` met de link "Zichtbaarheid aanpassen". De eigen regel staat niet in de tussenstand. |
| Lege divisie | `ch.empty`. |
| Geen challenge | `ch.none`, zonder statuslabel. |

**Referentie:** `reference/challenge.html`, met de staten `?state=opgeslagen`, `top3`, `fout`, `gesloten`, `prive`, `leeg` en `geen`.

---

## 6. Privacy-instelling en bijnaam

Route: Instellingen → Privacy. Teksten: `priv.*` en `consent.*`.

### Opbouw

1. **Bijnaam:** een bon met de uitleg (`priv.nick.help`), een invoerveld in mono (maximaal 20 tekens), de regel `priv.nick.rules` en **Opslaan**.
   - Fouten (`priv.nick.taken`, `invalid`, `blocked`) staan direct onder het veld, met `role="alert"` en `aria-invalid`.
   - Na opslaan verschijnt de toast `priv.nick.saved`.
2. **Wie ziet wat:** drie keuzekaarten als radiogroep.
   - Elke kaart heeft een radioknop van 22px, een naam en een beschrijving.
   - De gekozen kaart krijgt een inktrand van 1.5px plus 1px inset.
   - **Privé** heeft het label "STANDAARD", **Gym en vrienden** heeft geen label, en **Openbaar** is uitgeschakeld (55 % dekking) met het label "BINNENKORT".
   - Onder de keuzes staat een grijs vlak met "Nooit zichtbaar voor anderen" (`priv.never.*`).
3. **Toestemming** (van Privé naar Gym en vrienden):
   - Een dialoog met `consent.title` en `consent.body`, met de gymnaam vet (`consent.bodyNoGym` als er geen gym is).
   - Een verplicht vinkje `consent.check`; **Zet aan** (lime) blijft uitgeschakeld tot het vinkje staat.
   - Verder **Blijf Privé** en de link naar de privacyverklaring.
   - Pas na akkoord verandert de keuze. Annuleren laat Privé staan.
4. **Terug naar Privé:** een bevestigingsdialoog (`priv.toPrivate.*`) met **Annuleren** en **Zet op Privé** (inkt).

**Mobiel:**

- Het zijmenu van Instellingen vervalt; de app-tabbalk blijft.
- De bijnaam staat met het veld en de knop onder elkaar.
- Dialogen worden een bottom sheet. De knoppen staan onder elkaar over de volle breedte, met de primaire knop bovenaan.

### Staten

| Staat | Weergave |
|---|---|
| Privé (standaard) | Eerste kaart gekozen. |
| Toestemming | De dialoog staat open en "Zet aan" is uitgeschakeld. |
| Gym en vrienden aan | Tweede kaart gekozen, met de toast `priv.saved`. |
| Terug naar Privé | De bevestigingsdialoog staat open. |
| Bijnaam bezet | Het veld is gearceerd, met de melding eronder. |

**Referentie:** `reference/privacy-bijnaam.html`, met de staten `?state=toestemming`, `gym`, `naarprive`, `bezet` en `opgeslagen`.

---

## 7. Gymscherm voor aan de muur `/gym-board/<code>`

Een tv in de gym, 1920×1080 (werkt ook op 1280×720). Leesbaar op 3 meter: namen ≥ 2.2vw (~42px op 1080p), scores ~2.8vw (~54px), en geen tekst onder 1.2vw (~23px). Teksten: `wall.*`.

### Opbouw

1. **Bovenbalk:**
   - het woordmerk;
   - "VOORBEELDGYM AMSTERDAM · OKTOBER" (condensed, op één regel, met een ellips als hij te lang is);
   - rechts de indicator **Op schema / Snelste**, met de actieve in inkt.
2. **Links (2/3):**
   - de divisie groot ("OPEN · MEN") met vijf vierkantjes als pagina-indicator, de actieve lime;
   - de scoreuitleg (`wall.scoreLegend`) en een dunne voortgangsbalk die in 15 s volloopt;
   - daaronder de **top 7–8**, elk met rang (mono, #1 op een lime vlak), bijnaam, scorebalk (inkt = progressie, grijs = op schema) en score.
   - Op het tabblad Snelste staat de voorspelde eindtijd op de plek van de balk en de score.
3. **Rechts (1/3):**
   - een bon "CHALLENGE WEEK 44" met de opdracht, de deadline en de top 4 van de getoonde divisie;
   - daaronder een lime vlak "Doe mee via de app · benchmrk.ai" (`wall.join`) met "Gymcode bij de balie".
4. **Voet:** links "Bijgewerkt …" (`wall.updated`), rechts "Alleen bijnamen en divisies · Benchmrk is niet verbonden aan HYROX".

### Gedrag

- De pagina wisselt elke **15 s** van divisie. Na een volledige ronde wisselt hij van tabblad.
- Hij haalt elke 5 minuten nieuwe data op, zonder herladen of flikkering.
- Bij `prefers-reduced-motion` loopt de voortgangsbalk niet, maar het wisselen gaat door.
- Er is geen interactie, cursor of scroll. Toegang gaat via een geheime code in de URL, die de beheerder in "Mijn gym" opnieuw kan aanmaken.
- Op het scherm staan alleen leden met de stand "Gym en vrienden". De gymbeheerder moet het scherm aanzetten; dat is een open vraag in het plan.

### Staten

| Staat | Weergave |
|---|---|
| Leeg | `wall.empty` groot, met het lime "Doe mee"-vlak. |
| Geen verbinding | Een zwarte balk bovenaan met `wall.offline`. De laatste stand blijft staan. |
| Link ongeldig | Alleen het woordmerk en `wall.noAccess`. |

**Smal scherm (< 900px):** alles stapelt (ranglijst, challenge, CTA) en de pagina scrollt. Dit is alleen een vangnet; het scherm is bedoeld voor een tv.

**Referentie:** `reference/gymscherm-tv.html`. Zonder `?state` draait de rotatie echt; de staten zijn `snelste`, `leeg`, `offline` en `geentoegang`.

---

## Mobiel: regels voor alle schermen

- **Breekpunt:** 760px (app) en 860px (linkpagina en challenge). Onder het breekpunt is alles één kolom, met 16px rand.
- **Raakvlakken:** knoppen, chips en tabs zijn minimaal 44px hoog, primaire acties op mobiel 48–52px. Inline tekstlinks hebben 10–12px verticale padding.
- **Geen horizontale scroll** op paginaniveau. Alleen chiprijen en brede tabellen scrollen binnen hun eigen kader. Grids gebruiken `minmax(0,1fr)`, zodat inhoud ze niet breder duwt.
- **Dialogen en sheets:** op mobiel een bottom sheet met de primaire actie in beeld (sticky actiebalk) en `env(safe-area-inset-bottom)`.
- **App-tabbalk:** onderaan vast. Toasts en de "Jij"-balk staan erboven.
- **Getest:** alle referentiepagina's op 390×844 en 1440×900, in alle staten, zonder horizontale overloop. Het gymscherm is getest op 1920×1080, 1280×720 en 390×844.

## Overzicht referentiebestanden

| Bestand | Scherm |
|---|---|
| `reference/kaarten/*.html` | 12 kaarten: racevoorspelling, benchmark-PR, vooruitgang en challenge, elk in story, feed en linkvoorbeeld |
| `reference/kaart-aanbieden.html` | Kaartaanbod na een benchmark |
| `reference/kaart-linkpagina.html` | `benchmrk.ai/k/<code>` |
| `reference/gym-ranglijst.html` | Gym-ranglijst |
| `reference/challenge.html` | Wekelijkse challenge |
| `reference/privacy-bijnaam.html` | Privacy en bijnaam |
| `reference/gymscherm-tv.html` | Gymscherm |

Alle pagina's laden Archivo en IBM Plex Mono van Google Fonts. De pagina's in `reference/` laden de kaarten met een relatief pad (`kaarten/…`); houd die mappenstructuur aan.
