import type { GameRecord, GameRecordId } from "@/lib/gameRecords";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

export type PublicGameScoreInsert = {
  nickname: string;
  game_id: GameRecordId;
  level?: string | null;
  score: number;
  correct_answers: number;
  total_questions: number;
  accuracy: number;
  duration_ms: number;
  language?: "ko" | "en" | null;
  mistakes?: Record<string, unknown> | null;
  completed_at: string;
};

export type PublicGameScore = PublicGameScoreInsert & {
  id: string;
  created_at: string;
};

export type GameRankingEntry = GameRecord & {
  rank: number;
  createdAt?: string;
};

const ALLOWED_GAME_IDS: GameRecordId[] = [
  "primary",
  "sanskrit",
  "reverse",
  "intermediate",
  "full-reverse",
  "primary-duel",
  "intermediate-duel",
];

export function isPublicRankingConfigured() {
  return isSupabaseConfigured();
}

export function sanitizePublicNickname(value: string) {
  return value.replace(/[\u0000-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim();
}

export function isSupportedPublicNickname(value: string) {
  return /^[\p{L}\p{N} ._-]+$/u.test(value);
}

function isValidGameId(gameId: string): gameId is GameRecordId {
  return ALLOWED_GAME_IDS.includes(gameId as GameRecordId);
}

function isSerializableMistakes(value: unknown): value is Record<string, unknown> | null {
  if (value === null || value === undefined) return true;

  try {
    JSON.stringify(value);
    return typeof value === "object" && !Array.isArray(value);
  } catch {
    return false;
  }
}

export function validatePublicGameRecord(record: GameRecord) {
  const nickname = sanitizePublicNickname(record.nickname);

  return (
    nickname.length >= 2 &&
    nickname.length <= 12 &&
    isSupportedPublicNickname(nickname) &&
    isValidGameId(record.gameId) &&
    Number.isFinite(record.score) &&
    record.score >= 0 &&
    Number.isFinite(record.correctAnswers) &&
    record.correctAnswers >= 0 &&
    Number.isFinite(record.totalQuestions) &&
    record.totalQuestions > 0 &&
    record.correctAnswers <= record.totalQuestions &&
    Number.isFinite(record.accuracy) &&
    record.accuracy >= 0 &&
    record.accuracy <= 100 &&
    Number.isFinite(record.durationMs) &&
    record.durationMs > 0 &&
    !Number.isNaN(Date.parse(record.completedAt)) &&
    (record.language === undefined || record.language === "ko" || record.language === "en") &&
    isSerializableMistakes(record.metadata)
  );
}

export function toPublicGameScoreInsert(record: GameRecord): PublicGameScoreInsert {
  return {
    nickname: sanitizePublicNickname(record.nickname),
    game_id: record.gameId,
    level: record.level ?? null,
    score: Math.max(0, Math.round(record.score)),
    correct_answers: Math.max(0, Math.round(record.correctAnswers)),
    total_questions: Math.max(1, Math.round(record.totalQuestions)),
    accuracy: Math.min(100, Math.max(0, record.accuracy)),
    duration_ms: Math.max(1, Math.round(record.durationMs)),
    language: record.language ?? null,
    mistakes: {
      count: record.mistakes ?? 0,
    },
    completed_at: record.completedAt,
  };
}

export function fromPublicGameScore(row: PublicGameScore, rank: number): GameRankingEntry {
  return {
    id: row.id,
    rank,
    gameId: row.game_id,
    nickname: row.nickname,
    score: row.score,
    correctAnswers: row.correct_answers,
    totalQuestions: row.total_questions,
    accuracy: Number(row.accuracy),
    durationMs: row.duration_ms,
    completedAt: row.completed_at,
    level: row.level ?? undefined,
    language: row.language ?? undefined,
    mistakes: typeof row.mistakes?.count === "number" ? row.mistakes.count : undefined,
    createdAt: row.created_at,
  };
}

export async function savePublicGameScore(record: GameRecord) {
  if (!isPublicRankingConfigured()) {
    return { ok: false as const, reason: "unconfigured" as const };
  }

  if (!validatePublicGameRecord(record)) {
    return { ok: false as const, reason: "invalid" as const };
  }

  const client = getSupabaseClient();
  if (!client) {
    return { ok: false as const, reason: "unconfigured" as const };
  }

  const { error } = await client.from("game_scores").insert(toPublicGameScoreInsert(record));

  if (error) {
    return { ok: false as const, reason: "error" as const };
  }

  return { ok: true as const };
}

export async function fetchGameRanking(gameId: GameRecordId, limit = 50) {
  if (!isPublicRankingConfigured()) {
    return { ok: false as const, reason: "unconfigured" as const, entries: [] };
  }

  const client = getSupabaseClient();
  if (!client) {
    return { ok: false as const, reason: "unconfigured" as const, entries: [] };
  }

  const { data, error } = await client
    .from("game_scores")
    .select("id,nickname,game_id,level,score,correct_answers,total_questions,accuracy,duration_ms,language,mistakes,completed_at,created_at")
    .eq("game_id", gameId)
    .order("score", { ascending: false })
    .order("accuracy", { ascending: false })
    .order("duration_ms", { ascending: true })
    .order("completed_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { ok: false as const, reason: "error" as const, entries: [] };
  }

  return {
    ok: true as const,
    entries: ((data ?? []) as PublicGameScore[]).map((row, index) => fromPublicGameScore(row, index + 1)),
  };
}
