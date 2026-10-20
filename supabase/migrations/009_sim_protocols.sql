-- Gym-specific sim build-ups. Templates are managed by admins; an athlete copies one into profiles.sim_protocol and can tweak it.
alter table public.profiles add column if not exists sim_protocol jsonb;
grant update (sim_protocol) on public.profiles to authenticated;

create table if not exists public.sim_protocols (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  protocol jsonb not null,
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.sim_protocols enable row level security;
create policy "simp: read public" on public.sim_protocols for select using (is_public or public.is_admin());
create policy "simp: admin write" on public.sim_protocols for all using (public.is_admin()) with check (public.is_admin());

insert into public.sim_protocols (name, description, protocol) values
('Gym Groesbeek',
 'Buiten 12 weken voor een race: 8 rondes, 50 % lopen (500 m) en 50 % stations. Daarna opbouw: 75/50 → 75/75 → 100/75 → 100/100 → 125/100 (Roxzone), laatste week 50/50. Doubles: allebei het percentage van elk station.',
 '{"name":"Gym Groesbeek","rounds":8,"offSeason":{"run":50,"station":50},"blocks":[{"weeks":3,"run":50,"station":50},{"weeks":2,"run":75,"station":50},{"weeks":2,"run":75,"station":75},{"weeks":1,"run":100,"station":75},{"weeks":2,"run":100,"station":100},{"weeks":1,"run":125,"station":100},{"weeks":1,"run":50,"station":50}]}'::jsonb);
