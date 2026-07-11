"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchGameRanking, isPublicRankingConfigured, type GameRankingEntry } from "@/lib/gameScores";
import type { GameRecordId } from "@/lib/gameRecords";

type Locale = "ko" | "en";
type LoadState = "idle" | "loading" | "loaded" | "empty" | "error" | "unconfigured";

const LOCALE_STORAGE_KEY = "ashtanga-sequence-game-locale";
const GAME_IDS: GameRecordId[] = ["primary", "sanskrit", "reverse", "intermediate", "full-reverse"];

const rankingText = {
  ko: {
    title: "전체 랭킹",
    subtitle: "로그인 없이 저장된 공개 기록입니다.",
    home: "홈",
    refresh: "다시 시도",
    rank: "순위",
    nickname: "닉네임",
    score: "점수",
    accuracy: "정답률",
    duration: "소요 시간",
    completedAt: "완료 날짜",
    noRecords: "기록이 없습니다",
    loadFailed: "랭킹을 불러오지 못했습니다",
    unconfigured: "공개 랭킹 기능이 설정되지 않았습니다.",
    points: "점",
    games: {
      primary: "Primary",
      sanskrit: "Sanskrit",
      reverse: "Reverse",
      intermediate: "Intermediate",
      "full-reverse": "Full Reverse",
    },
  },
  en: {
    title: "Public Ranking",
    subtitle: "Public scores saved without login.",
    home: "Home",
    refresh: "Retry",
    rank: "Rank",
    nickname: "Nickname",
    score: "Score",
    accuracy: "Accuracy",
    duration: "Time",
    completedAt: "Completed",
    noRecords: "No records",
    loadFailed: "Could not load rankings",
    unconfigured: "Public ranking is not configured.",
    points: "pts",
    games: {
      primary: "Primary",
      sanskrit: "Sanskrit",
      reverse: "Reverse",
      intermediate: "Intermediate",
      "full-reverse": "Full Reverse",
    },
  },
} as const;

function isGameId(value: string | null): value is GameRecordId {
  return GAME_IDS.includes(value as GameRecordId);
}

function formatDuration(durationMs: number, locale: Locale) {
  const totalSeconds = Math.max(0, Math.round(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (locale === "ko") return minutes > 0 ? `${minutes}분 ${seconds}초` : `${seconds}초`;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

function formatDate(isoDate: string, locale: Locale) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", {
    year: locale === "ko" ? "numeric" : undefined,
    month: locale === "ko" ? "numeric" : "short",
    day: "numeric",
  }).format(date);
}

function formatScore(score: number, locale: Locale, pointsLabel: string) {
  return `${new Intl.NumberFormat(locale === "ko" ? "ko-KR" : "en-US").format(score)}${locale === "ko" ? pointsLabel : ` ${pointsLabel}`}`;
}

export default function PublicRanking() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [locale, setLocale] = useState<Locale>("ko");
  const [selectedGame, setSelectedGame] = useState<GameRecordId>("primary");
  const [entries, setEntries] = useState<GameRankingEntry[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const text = rankingText[locale];

  useEffect(() => {
    const savedLocale = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (savedLocale === "ko" || savedLocale === "en") setLocale(savedLocale);
  }, []);

  useEffect(() => {
    const gameParam = searchParams.get("game");
    setSelectedGame(isGameId(gameParam) ? gameParam : "primary");
  }, [searchParams]);

  const loadRanking = useCallback(async (gameId: GameRecordId) => {
    if (!isPublicRankingConfigured()) {
      setLoadState("unconfigured");
      setEntries([]);
      return;
    }

    setLoadState("loading");
    const result = await fetchGameRanking(gameId, 50);

    if (!result.ok) {
      setLoadState(result.reason === "unconfigured" ? "unconfigured" : "error");
      setEntries([]);
      return;
    }

    setEntries(result.entries);
    setLoadState(result.entries.length > 0 ? "loaded" : "empty");
  }, []);

  useEffect(() => {
    loadRanking(selectedGame);
  }, [loadRanking, selectedGame]);

  const heading = useMemo(() => text.games[selectedGame], [selectedGame, text.games]);

  function selectGame(gameId: GameRecordId) {
    setSelectedGame(gameId);
    router.replace(`/ranking?game=${gameId}`);
  }

  return (
    <main className="app-shell ranking-shell">
      <div className="top-bar">
        <div>
          <p className="eyebrow">{heading}</p>
          <h1 className="brand">{text.title}</h1>
        </div>
        <div className="top-actions">
          <div className="locale-switch" role="group" aria-label="Language">
            <button className={locale === "ko" ? "active" : ""} type="button" onClick={() => setLocale("ko")}>
              KR
            </button>
            <span aria-hidden="true">/</span>
            <button className={locale === "en" ? "active" : ""} type="button" onClick={() => setLocale("en")}>
              EN
            </button>
          </div>
          <button className="button ghost small-button" type="button" onClick={() => router.push("/")}>
            {text.home}
          </button>
        </div>
      </div>

      <section className="ranking-panel">
        <p className="small-copy">{text.subtitle}</p>
        <div className="ranking-tabs" role="tablist" aria-label={text.title}>
          {GAME_IDS.map((gameId) => (
            <button
              className={selectedGame === gameId ? "active" : ""}
              key={gameId}
              type="button"
              onClick={() => selectGame(gameId)}
            >
              {text.games[gameId]}
            </button>
          ))}
        </div>

        <button className="button ghost ranking-refresh" type="button" onClick={() => loadRanking(selectedGame)}>
          {text.refresh}
        </button>

        {loadState === "loading" ? <p className="ranking-state">{text.title}...</p> : null}
        {loadState === "unconfigured" ? <p className="ranking-state">{text.unconfigured}</p> : null}
        {loadState === "error" ? <p className="ranking-state">{text.loadFailed}</p> : null}
        {loadState === "empty" ? <p className="ranking-state">{text.noRecords}</p> : null}

        {entries.length > 0 ? (
          <div className="ranking-list">
            {entries.map((entry) => (
              <article className={`ranking-item rank-${entry.rank}`} key={entry.id}>
                <div className="ranking-rank">
                  <span>{text.rank}</span>
                  <strong>{entry.rank}</strong>
                </div>
                <div className="ranking-main">
                  <strong>{entry.nickname}</strong>
                  <span>
                    {formatScore(entry.score, locale, text.points)} · {entry.accuracy}% · {formatDuration(entry.durationMs, locale)}
                  </span>
                  <time dateTime={entry.completedAt}>{formatDate(entry.completedAt, locale)}</time>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </main>
  );
}
