-- AI reading of the athlete's session notes (pain, stopped, too fast, summary, advice)
alter table public.session_entries add column if not exists notes_ai jsonb;
