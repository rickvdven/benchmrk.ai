-- Roadmap / kanban for the admin (also updated by Claude via SQL)
create table if not exists public.admin_todos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  detail text,
  status text not null default 'backlog' check (status in ('backlog','todo','doing','done')),
  area text,
  owner text,
  sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.admin_todos enable row level security;
create policy "todos: admin all" on public.admin_todos for all using (public.is_admin()) with check (public.is_admin());

insert into public.admin_todos (title, detail, status, area, owner, sort) values
 ('Domein roxcoach.com kopen', null, 'todo', 'Lancering', 'Rick', 10),
 ('Domein koppelen', 'www = marketing-site, app.roxcoach.com = app, mail via Resend op eigen domein; daarna e-mailbevestiging aanzetten (mailer_autoconfirm uit).', 'todo', 'Lancering', 'Claude', 20),
 ('Marketing-site voor terugkerende racers', 'Doelgroep: meerdere HYROX-races gedaan, wil een volgende PR. Plus /gyms-pagina met de bestaande demovideo.', 'todo', 'Marketing', 'Claude', 30),
 ('Eindgebruikersvideo (~60 s): je volgende PR', 'Zelfde stijl en stem (Kore) als de gym-demo.', 'todo', 'Marketing', 'Claude', 40),
 ('Bèta-prijs als aanbieding', '€30/jaar tijdens de bèta, straks hoger (bijv. €79/jaar of €9,99/mnd), prijs blijft vast zolang je lid blijft. "Gratis tijdens de bèta" uit de hero halen.', 'todo', 'Marketing', 'Claude', 50),
 ('Uitslag-import als onboarding', 'Plak je laatste HYROX-uitslag → direct zien waar je minuten zitten.', 'todo', 'Product', 'Claude', 60),
 ('Rotterdam-race checken: solo of doubles?', 'Staat nu als Solo Open met doel 1:01:00 (kans 2%).', 'todo', 'Product', 'Rick', 70),
 ('iPhone-app in de App Store', 'Capacitor op dezelfde code. Apple Developer ($99/jr), Sign in with Apple, account verwijderen in app, privacylabels, abonnement via Apple (RevenueCat → Supabase). Meerwaarde: Apple Health/Watch (ook Garmin via Health), push, widget.', 'backlog', 'App', 'Claude', 10),
 ('Engine als sportpakketten', 'Stations, bronnen en racemodel per sport los, zodat een nieuwe sport weken kost in plaats van maanden.', 'backlog', 'Techniek', 'Claude', 20),
 ('Verwante races: Gymrace, DEKA, ATHX', null, 'backlog', 'Product', 'Claude', 30),
 ('Seizoensplanner met combinaties', 'Bijv. HYROX + (halve) marathon in één seizoen.', 'backlog', 'Product', 'Claude', 40),
 ('Doubles-pagina per race/partner wisselbaar', null, 'backlog', 'Product', 'Claude', 50),
 ('RPE-uitleg bij de schuifregelaar', 'Tabel 1–10 met gevoel en voorbeeld.', 'backlog', 'Product', 'Claude', 60),
 ('Beschikbare tijd per training (bijv. max 45 min)', null, 'backlog', 'Product', 'Claude', 70),
 ('AI-coach die de week toelicht en vragen beantwoordt', null, 'backlog', 'Product', 'Claude', 80),
 ('Gym-dashboard voor coaches', 'Leden, compliance, wie loopt achter.', 'backlog', 'Product', 'Claude', 90),
 ('YouTube-kanaal + demovideo uploaden', 'Titel, beschrijving, thumbnail en ondertitels zijn aangeleverd.', 'backlog', 'Marketing', 'Rick', 100),
 ('GitHub-koppeling', 'Lege privé-repo + token → push, daarna koppelen in Vercel.', 'backlog', 'Techniek', 'Rick', 110),
 ('Blokweken Gym Groesbeek bevestigen', null, 'backlog', 'Product', 'Rick', 120),
 ('Juridische check vóór publieke lancering', 'Disclaimer, ambassadeursvoorwaarden, commissie (fiscaal), naam/merk t.o.v. HYROX.', 'backlog', 'Juridisch', 'Rick', 130),
 ('Google OAuth consent screen naar productie', null, 'backlog', 'Lancering', 'Rick', 140),
 ('Sleutels roteren na de bèta', 'Supabase, Vercel, Resend, Google secret, Anthropic, Gemini.', 'backlog', 'Techniek', 'Rick', 150),
 ('Notities lezen + blessure registreren', 'Regels in 5 talen + Claude; knop blessure registreren; overgeslagen trainingen zichtbaar.', 'done', 'Product', 'Claude', 10),
 ('Wetenschappelijke taper + racedag-voeding', null, 'done', 'Product', 'Claude', 20),
 ('Kansmodel op haalbaarheid + log', null, 'done', 'Product', 'Claude', 30),
 ('Divisie en partner per race', null, 'done', 'Product', 'Claude', 40),
 ('Taal op basis van land (IP)', null, 'done', 'Product', 'Claude', 50),
 ('Gym-demovideo online (/demo)', null, 'done', 'Marketing', 'Claude', 60);
