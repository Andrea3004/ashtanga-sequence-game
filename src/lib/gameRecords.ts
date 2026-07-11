export type GameRecordId = "primary" | "sanskrit" | "reverse" | "intermediate" | "full-reverse";

export type GameRecord = {
  id: string;
  gameId: GameRecordId;
  nickname: string;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  accuracy: number;
  durationMs: number;
  completedAt: string;
  level?: string;
  language?: "ko" | "en";
  mistakes?: number;
  metadata?: Record<string, string | number | boolean>;
};

const RECORDS_KEY = "ashtanga-sequence-game:records";
const NICKNAME_KEY = "ashtanga-sequence-game:nickname";
const MAX_RECORDS_PER_GAME = 20;
const MAX_RECORDS_TOTAL = 100;

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function isGameRecordId(value: unknown): value is GameRecordId {
  return value === "primary" || value === "sanskrit" || value === "reverse" || value === "intermediate" || value === "full-reverse";
}

function isRecord(value: unknown): value is GameRecord {
  if (!value || typeof value !== "object") return false;

  const record = value as Partial<GameRecord>;

  return (
    typeof record.id === "string" &&
    isGameRecordId(record.gameId) &&
    typeof record.nickname === "string" &&
    typeof record.score === "number" &&
    typeof record.correctAnswers === "number" &&
    typeof record.totalQuestions === "number" &&
    typeof record.accuracy === "number" &&
    typeof record.durationMs === "number" &&
    typeof record.completedAt === "string"
  );
}

function readRecords(): GameRecord[] {
  if (!canUseStorage()) return [];

  try {
    const raw = window.localStorage.getItem(RECORDS_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(isRecord);
  } catch {
    return [];
  }
}

function writeRecords(records: GameRecord[]) {
  if (!canUseStorage()) return false;

  try {
    window.localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
    return true;
  } catch {
    return false;
  }
}

export function getGameRecords() {
  return readRecords();
}

export function getRecordsByGame(gameId: GameRecordId) {
  return readRecords()
    .filter((record) => record.gameId === gameId)
    .sort((a, b) => Date.parse(b.completedAt) - Date.parse(a.completedAt));
}

export function compareGameRecords(a: GameRecord, b: GameRecord) {
  if (a.score !== b.score) return b.score - a.score;
  if (a.accuracy !== b.accuracy) return b.accuracy - a.accuracy;
  if (a.durationMs !== b.durationMs) return a.durationMs - b.durationMs;
  return Date.parse(b.completedAt) - Date.parse(a.completedAt);
}

export function saveGameRecord(record: GameRecord) {
  const existing = readRecords().filter((saved) => saved.id !== record.id);
  const sameGameRecords = [record, ...existing.filter((saved) => saved.gameId === record.gameId)]
    .sort((a, b) => Date.parse(b.completedAt) - Date.parse(a.completedAt))
    .slice(0, MAX_RECORDS_PER_GAME);
  const otherRecords = existing.filter((saved) => saved.gameId !== record.gameId);
  const nextRecords = [...sameGameRecords, ...otherRecords]
    .sort((a, b) => Date.parse(b.completedAt) - Date.parse(a.completedAt))
    .slice(0, MAX_RECORDS_TOTAL);

  return writeRecords(nextRecords);
}

export function getBestRecord(gameId: GameRecordId) {
  return [...getRecordsByGame(gameId)].sort(compareGameRecords)[0] ?? null;
}

export function getRecentRecords(gameId: GameRecordId, limit = 5) {
  return getRecordsByGame(gameId).slice(0, limit);
}

export function deleteGameRecord(id: string) {
  return writeRecords(readRecords().filter((record) => record.id !== id));
}

export function clearGameRecords(gameId?: GameRecordId) {
  if (!gameId) return writeRecords([]);
  return writeRecords(readRecords().filter((record) => record.gameId !== gameId));
}

export function getSavedNickname() {
  if (!canUseStorage()) return "";

  try {
    return window.localStorage.getItem(NICKNAME_KEY) ?? "";
  } catch {
    return "";
  }
}

export function saveNickname(nickname: string) {
  if (!canUseStorage()) return false;

  try {
    window.localStorage.setItem(NICKNAME_KEY, nickname);
    return true;
  } catch {
    return false;
  }
}

export function createRecordId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
