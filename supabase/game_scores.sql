create extension if not exists pgcrypto;

create table if not exists public.game_scores (
  id uuid primary key default gen_random_uuid(),
  nickname text not null,
  game_id text not null,
  level text,
  score integer not null,
  correct_answers integer not null,
  total_questions integer not null,
  accuracy numeric not null,
  duration_ms integer not null,
  language text,
  mistakes jsonb,
  completed_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint game_scores_nickname_length_check check (char_length(btrim(nickname)) between 2 and 12),
  constraint game_scores_game_id_check check (game_id in ('primary', 'sanskrit', 'reverse', 'intermediate', 'full-reverse')),
  constraint game_scores_score_check check (score >= 0),
  constraint game_scores_correct_answers_check check (correct_answers >= 0),
  constraint game_scores_total_questions_check check (total_questions > 0),
  constraint game_scores_answer_range_check check (correct_answers <= total_questions),
  constraint game_scores_accuracy_check check (accuracy >= 0 and accuracy <= 100),
  constraint game_scores_duration_check check (duration_ms > 0),
  constraint game_scores_language_check check (language is null or language in ('ko', 'en'))
);

alter table public.game_scores enable row level security;

drop policy if exists "game_scores_select_public" on public.game_scores;
create policy "game_scores_select_public"
on public.game_scores
for select
to anon, authenticated
using (true);

drop policy if exists "game_scores_insert_public" on public.game_scores;
create policy "game_scores_insert_public"
on public.game_scores
for insert
to anon, authenticated
with check (
  char_length(btrim(nickname)) between 2 and 12
  and game_id in ('primary', 'sanskrit', 'reverse', 'intermediate', 'full-reverse')
  and score >= 0
  and correct_answers >= 0
  and total_questions > 0
  and correct_answers <= total_questions
  and accuracy >= 0
  and accuracy <= 100
  and duration_ms > 0
  and (language is null or language in ('ko', 'en'))
);

create index if not exists game_scores_ranking_idx
on public.game_scores (
  game_id,
  score desc,
  accuracy desc,
  duration_ms asc,
  completed_at desc
);

grant select, insert on public.game_scores to anon, authenticated;
