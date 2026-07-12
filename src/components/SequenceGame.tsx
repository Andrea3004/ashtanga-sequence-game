"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  asanaEnglishNames,
  FALLBACK_CHOICES,
  fullReverseLevels,
  intermediateFullSequence,
  intermediateLevels,
  primaryDuelSequence,
  primaryFullEnglishSequence,
  primaryLevels,
  reverseLevels,
  type EnglishQuizPose,
  type LevelConfig,
} from "@/data/primarySequence";
import {
  clearGameRecords,
  compareGameRecords,
  createRecordId,
  getBestRecord,
  getRecentRecords,
  getSavedNickname,
  saveGameRecord,
  saveNickname,
  type GameRecord,
  type GameRecordId,
} from "@/lib/gameRecords";
import { isPublicRankingConfigured, savePublicGameScore } from "@/lib/gameScores";

type LevelSelectMode = "level-select" | "reverse-level-select" | "intermediate-level-select" | "full-reverse-level-select" | "duel-select";
type SequenceMode = "primary" | "reverse" | "intermediate" | "full-reverse";
type DuelMode = "primary-duel" | "intermediate-duel";
type Mode = "home" | LevelSelectMode | SequenceMode | DuelMode | "english" | "result";
type GameMode = SequenceMode | DuelMode | "english";
type Feedback = "correct" | "wrong" | "timeout" | null;
type Locale = "ko" | "en";
type SeriesCategory = "primary" | "intermediate";
type SaveStep = "ask" | "form" | "saved" | "skipped";
type PublicSaveStatus = "idle" | "saving" | "saved" | "failed" | "unconfigured" | "invalid";

type EnglishRound = {
  prompt: string;
  answer: string;
  choices: string[];
};

const STARTING_LIVES = 3;
const ENGLISH_TIME_LIMIT = 12;
const LOCALE_STORAGE_KEY = "ashtanga-sequence-game-locale";
const EMPTY_SEQUENCE: string[] = [];

const translations = {
  ko: {
    appTitle: "아쉬탕가 시퀀스 게임",
    instantStart: "로그인 없이 바로 시작",
    description: "프라이머리 순서와 산스크리트 이름을 짧게 반복해요.",
    trustBadgeBrand: "ASHTANGA YOGA STUDIO",
    trustBadgeText: "공인 1호 티쳐가 개발한\n아쉬탕가 요가 시퀀스 학습 게임",
    noticeButton: "ⓘ Notice",
    noticeTitle: "업데이트 소식",
    latestUpdateLabel: "🚀 최신 업데이트",
    latestUpdateTitle: "✅ AI Vinyasa Duel 오픈",
    latestUpdateBody: "AI가 제시한 현재 아사나를 보고\n다음 아사나를 선택해 보세요.",
    comingNextLabel: "🔜 다음 업데이트",
    comingNextTitle: "🤖 AI Vinyasa Duel",
    comingNextBody: "AI가 현재 아사나를 제시하면\n다음 아사나를 선택하는\n새로운 대결형 게임입니다.",
    comingSoon: "Coming Soon",
    latestUpdateShortLabel: "LATEST UPDATE",
    comingNextShortLabel: "Coming Next",
    releaseHistory: "Release History",
    primaryGame: "프라이머리 시퀀스 게임",
    sanskritGame: "산스크리트 이름 게임",
    reverseGame: "리버스 시퀀스 게임",
    intermediateGame: "인터미디어트 시퀀스 게임",
    fullReverseGame: "풀 리버스 게임",
    aiDuelGame: "AI 시퀀스 듀얼",
    aiDuelDescription: "AI가 제시하는 현재 자세에 이어질 다음 자세를 고르세요.",
    primaryDuel: "프라이머리 듀얼",
    intermediateDuel: "인터미디어트 듀얼",
    publicRanking: "전체 랭킹",
    viewPublicRanking: "전체 랭킹 보기",
    intermediateDescription: "인터미디어트 시리즈의 순서를 반복하며 익혀보세요.",
    fullReverseDescription: "전체 시퀀스를 마지막 자세부터 역순으로 익혀보세요.",
    selectLevel: "레벨 선택",
    home: "홈",
    restart: "다시 시작",
    tryAgain: "다시 도전",
    gameOver: "GAME OVER",
    levelClear: "LEVEL CLEAR",
    perfectClear: "PERFECT CLEAR",
    completed: "COMPLETE",
    correct: "정답!",
    wrong: "오답!",
    timeout: "시간초과!",
    score: "점수",
    combo: "콤보",
    life: "라이프",
    time: "시간",
    remainingLives: "남은 라이프",
    categoryLabels: {
      primary: "프라이머리 전용",
      intermediate: "인터미디어트 전용",
    },
    sanskritInstruction: "한글 음역을 고르세요",
    savePrompt: "이 기록을 저장할까요?",
    saveResult: "기록 저장하기",
    notNow: "이번에는 저장하지 않기",
    nicknamePrompt: "기록에 표시할 별명을 입력하세요.",
    nickname: "별명",
    saveScore: "점수 저장하기",
    cancel: "취소",
    nicknameTooShort: "별명을 2자 이상 입력해 주세요.",
    nicknameTooLong: "별명은 12자 이하로 입력해 주세요.",
    nicknameUnsupported: "사용할 수 없는 문자가 포함되어 있습니다.",
    saveFailed: "기록을 저장하지 못했습니다. 다시 시도해 주세요.",
    resultSaved: "기록이 저장되었습니다.",
    publicSaveSaving: "공개 랭킹 저장 중",
    publicSaveSuccess: "개인 기록과 전체 랭킹에 저장되었습니다.",
    publicSaveFailed: "개인 기록은 저장됐지만 전체 랭킹 등록에 실패했습니다.",
    publicSaveUnconfigured: "공개 랭킹 기능이 설정되지 않았습니다.",
    personalBest: "개인 최고 기록",
    newPersonalBest: "새로운 최고 기록!",
    recentResults: "최근 기록",
    noRecords: "기록 없음",
    deleteRecordsConfirm: "이 게임의 기록을 모두 삭제할까요?",
    deleteRecords: "삭제",
    accuracy: "정답률",
    duration: "소요 시간",
    progress: "진행도",
    maxCombo: "최대 콤보",
    correctAnswers: "정답 수",
    perfect: "Perfect",
    aiCurrentAsana: "AI CURRENT ASANA",
    chooseNextAsana: "다음 자세를 선택하세요",
    completedAt: "완료 날짜",
    points: "점",
  },
  en: {
    appTitle: "Ashtanga Sequence Game",
    instantStart: "Start instantly. No login required.",
    description: "Practice the Primary Series sequence and Sanskrit names through quick repetition.",
    trustBadgeBrand: "ASHTANGA YOGA STUDIO",
    trustBadgeText: "Developed by\nKorea's First Authorized Ashtanga Teacher",
    noticeButton: "ⓘ Notice",
    noticeTitle: "What's New",
    latestUpdateLabel: "🚀 Latest Update",
    latestUpdateTitle: "✅ AI Vinyasa Duel is Live",
    latestUpdateBody: "Choose the next asana after the pose presented by the AI.",
    comingNextLabel: "🔜 Coming Next",
    comingNextTitle: "🤖 AI Vinyasa Duel",
    comingNextBody: "Choose the next asana after the pose presented by the AI.",
    comingSoon: "Coming Soon",
    latestUpdateShortLabel: "LATEST UPDATE",
    comingNextShortLabel: "Coming Next",
    releaseHistory: "Release History",
    primaryGame: "Primary Sequence Game",
    sanskritGame: "Sanskrit Name Game",
    reverseGame: "Reverse Sequence Game",
    intermediateGame: "Intermediate Sequence Game",
    fullReverseGame: "Full Reverse Game",
    aiDuelGame: "AI Vinyasa Duel",
    aiDuelDescription: "Choose the next posture after the current posture shown by AI.",
    primaryDuel: "Primary Duel",
    intermediateDuel: "Intermediate Duel",
    publicRanking: "Public Ranking",
    viewPublicRanking: "View ranking",
    intermediateDescription: "Practice and memorize the Intermediate Series sequence.",
    fullReverseDescription: "Practice the full sequence in reverse order, starting from the final posture.",
    selectLevel: "Select Level",
    home: "Home",
    restart: "Restart",
    tryAgain: "Try Again",
    gameOver: "GAME OVER",
    levelClear: "LEVEL CLEAR",
    perfectClear: "PERFECT CLEAR",
    completed: "COMPLETED",
    correct: "Correct!",
    wrong: "Wrong!",
    timeout: "Time's up!",
    score: "Score",
    combo: "Combo",
    life: "Life",
    time: "Time",
    remainingLives: "Lives remaining",
    categoryLabels: {
      primary: "Primary Only",
      intermediate: "Intermediate Only",
    },
    sanskritInstruction: "Choose the Korean transliteration.",
    savePrompt: "Would you like to save this result?",
    saveResult: "Save result",
    notNow: "Not now",
    nicknamePrompt: "Enter a nickname for this record.",
    nickname: "Nickname",
    saveScore: "Save score",
    cancel: "Cancel",
    nicknameTooShort: "Enter at least 2 characters.",
    nicknameTooLong: "Nickname must be 12 characters or fewer.",
    nicknameUnsupported: "The nickname contains unsupported characters.",
    saveFailed: "Could not save the result. Please try again.",
    resultSaved: "Your result has been saved.",
    publicSaveSaving: "Saving to public ranking",
    publicSaveSuccess: "Saved to personal records and public ranking.",
    publicSaveFailed: "Saved locally, but public ranking registration failed.",
    publicSaveUnconfigured: "Public ranking is not configured.",
    personalBest: "Personal best",
    newPersonalBest: "New personal best!",
    recentResults: "Recent results",
    noRecords: "No records",
    deleteRecordsConfirm: "Delete all records for this game?",
    deleteRecords: "Delete",
    accuracy: "Accuracy",
    duration: "Time",
    progress: "Progress",
    maxCombo: "Max Combo",
    correctAnswers: "Correct",
    perfect: "Perfect",
    aiCurrentAsana: "AI CURRENT ASANA",
    chooseNextAsana: "Choose the next posture",
    completedAt: "Completed",
    points: "pts",
  },
} as const;

const GAME_SERIES: Record<GameMode, SeriesCategory> = {
  primary: "primary",
  reverse: "primary",
  english: "primary",
  intermediate: "intermediate",
  "full-reverse": "intermediate",
  "primary-duel": "primary",
  "intermediate-duel": "intermediate",
};

const GAME_RECORD_IDS: Record<GameMode, GameRecordId> = {
  primary: "primary",
  reverse: "reverse",
  english: "sanskrit",
  intermediate: "intermediate",
  "full-reverse": "full-reverse",
  "primary-duel": "primary-duel",
  "intermediate-duel": "intermediate-duel",
};

const englishPrimaryLevelTitles = [
  "LEVEL 1 · Surya A",
  "LEVEL 2 · Surya B",
  "LEVEL 3 · Six Fundamentals",
  "LEVEL 4 · Standing Sequence",
  "LEVEL 5 · Seated Half",
  "LEVEL 6 · Full Primary",
  "LEVEL 7 · Finishing Sequence",
] as const;

const englishReverseLevelTitles = [
  "LEVEL 1 · Finishing Sequence",
  "LEVEL 2 · Seated Sequence",
  "LEVEL 3 · Standing Sequence",
] as const;

const englishIntermediateLevelTitles = [
  "LEVEL 1 · Opening Purification",
  "LEVEL 2 · Backbends",
  "LEVEL 3 · Hip Opening",
  "LEVEL 4 · Balance Focus",
  "LEVEL 5 · Headstands",
] as const;

const englishFullReverseLevelTitles = ["LEVEL 1 · Full Reverse Sequence"] as const;

function shuffleArray<T>(array: T[]) {
  return [...array].sort(() => Math.random() - 0.5);
}

function makeSequentialChoices(answer: string, pool: string[], index: number) {
  const wrongChoices: string[] = [];
  let cursor = index + 1;

  while (wrongChoices.length < 3 && wrongChoices.length < pool.length - 1) {
    const candidate = pool[cursor % pool.length];

    if (candidate !== answer && !wrongChoices.includes(candidate)) {
      wrongChoices.push(candidate);
    }

    cursor += 1;
  }

  const choices = [...wrongChoices];
  choices.splice(index % (wrongChoices.length + 1), 0, answer);
  return choices;
}

function makeEnglishRounds() {
  const pool = primaryFullEnglishSequence.map((pose) => pose.transliteration);

  return primaryFullEnglishSequence.map((pose: EnglishQuizPose, index): EnglishRound => ({
      prompt: pose.sanskrit,
      answer: pose.transliteration,
      choices: makeSequentialChoices(pose.transliteration, pool, index),
    }));
}

export default function SequenceGame({ initialMode = "home" }: { initialMode?: Extract<Mode, "home" | LevelSelectMode> }) {
  const router = useRouter();
  const [locale, setLocale] = useState<Locale>("ko");
  const [mode, setMode] = useState<Mode>(initialMode);
  const [gameMode, setGameMode] = useState<GameMode>("primary");
  const [selectedLevel, setSelectedLevel] = useState<LevelConfig | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [englishRounds, setEnglishRounds] = useState<EnglishRound[]>([]);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [lives, setLives] = useState(STARTING_LIVES);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [choices, setChoices] = useState<string[]>([]);
  const [duelChoices, setDuelChoices] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [runStartedAt, setRunStartedAt] = useState<number | null>(null);
  const [resultCompletedAt, setResultCompletedAt] = useState<number | null>(null);
  const [saveStep, setSaveStep] = useState<SaveStep>("ask");
  const [nicknameValue, setNicknameValue] = useState("");
  const [nicknameError, setNicknameError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [savedRecord, setSavedRecord] = useState<GameRecord | null>(null);
  const [savedRecordIsBest, setSavedRecordIsBest] = useState(false);
  const [publicSaveStatus, setPublicSaveStatus] = useState<PublicSaveStatus>("idle");
  const [hasSubmittedPublicScore, setHasSubmittedPublicScore] = useState(false);
  const [, setRecordsVersion] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isNoticeOpen, setIsNoticeOpen] = useState(false);
  const [isReleaseHistoryOpen, setIsReleaseHistoryOpen] = useState(false);

  const correctSoundRef = useRef<HTMLAudioElement | null>(null);
  const wrongSoundRef = useRef<HTMLAudioElement | null>(null);

  const sequence = selectedLevel?.sequence ?? EMPTY_SEQUENCE;
  const currentAsana = sequence[currentIndex];
  const nextAsana = sequence[currentIndex + 1];
  const englishRound = englishRounds[currentIndex];
  const isDuelMode = mode === "primary-duel" || mode === "intermediate-duel";
  const duelSequence = mode === "primary-duel" ? primaryDuelSequence : mode === "intermediate-duel" ? intermediateFullSequence : EMPTY_SEQUENCE;
  const duelCurrentAsana = duelSequence[currentIndex];
  const duelNextAsana = duelSequence[currentIndex + 1];
  const totalDuelQuestions = Math.floor(duelSequence.length / 2);
  const currentDuelQuestion = Math.min(Math.floor(currentIndex / 2) + 1, totalDuelQuestions);
  const isSequenceMode = mode === "primary" || mode === "reverse" || mode === "intermediate" || mode === "full-reverse";
  const isPlaying = isSequenceMode || mode === "english" || isDuelMode;
  const hasNextPrompt = isDuelMode ? Boolean(duelNextAsana) : isSequenceMode ? Boolean(nextAsana) : Boolean(englishRound);
  const text = translations[locale];
  const totalQuestions = isDuelMode ? totalDuelQuestions : isSequenceMode ? Math.max(sequence.length - 1, 0) : englishRounds.length;
  const isGameOverResult = lives <= 0 && isPlaying;
  const isSequenceCompleteResult = isSequenceMode && Boolean(selectedLevel) && !nextAsana;
  const isDuelCompleteResult = isDuelMode && duelSequence.length > 1 && currentIndex + 1 >= duelSequence.length;
  const isEnglishCompleteResult = mode === "english" && englishRounds.length > 0 && currentIndex >= englishRounds.length;

  function getLevelTitle(level: LevelConfig, levelMode: SequenceMode) {
    if (locale === "ko") return level.title;

    const titles =
      levelMode === "reverse"
        ? englishReverseLevelTitles
        : levelMode === "intermediate"
          ? englishIntermediateLevelTitles
          : levelMode === "full-reverse"
            ? englishFullReverseLevelTitles
            : englishPrimaryLevelTitles;
    return titles[level.id - 1] ?? level.title;
  }

  function getDuelTitle(duelMode: DuelMode) {
    return duelMode === "primary-duel" ? text.primaryDuel : text.intermediateDuel;
  }

  function getGameModeForView(viewMode: Mode): GameMode | null {
    if (viewMode === "home" || viewMode === "result") return null;
    if (viewMode === "level-select") return "primary";
    if (viewMode === "reverse-level-select") return "reverse";
    if (viewMode === "intermediate-level-select") return "intermediate";
    if (viewMode === "full-reverse-level-select") return "full-reverse";
    if (viewMode === "duel-select") return null;
    return viewMode;
  }

  function getCategoryLabel(viewMode: Mode) {
    const currentGameMode = getGameModeForView(viewMode);
    if (!currentGameMode) return null;

    return text.categoryLabels[GAME_SERIES[currentGameMode]];
  }

  function getLevelSelectMode(levelMode: SequenceMode): LevelSelectMode {
    if (levelMode === "reverse") return "reverse-level-select";
    if (levelMode === "intermediate") return "intermediate-level-select";
    if (levelMode === "full-reverse") return "full-reverse-level-select";
    return "level-select";
  }

  function goToRoute(path: string, nextMode: Extract<Mode, "home" | LevelSelectMode>) {
    setMode(nextMode);
    router.push(path);
  }

  function changeLocale(nextLocale: Locale) {
    setLocale(nextLocale);
    window.localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale);

    if (nextLocale === "en" && (mode === "english" || gameMode === "english")) {
      goHome();
    }
  }

  function getAsanaDisplayName(asana: string) {
    return locale === "en" ? asanaEnglishNames[asana] ?? asana : asana;
  }

  const clearFeedbackSoon = useCallback(() => {
    window.setTimeout(() => setFeedback(null), 700);
  }, []);

  const handleTimeout = useCallback(() => {
    setFeedback("timeout");
    setLives((prev) => prev - 1);
    setMistakes((prev) => prev + 1);
    setCombo(0);
    if (mode === "english") {
      setCurrentIndex((prev) => prev + 1);
    }
    setTimeLeft(isSequenceMode ? selectedLevel?.timeLimit ?? 0 : ENGLISH_TIME_LIMIT);
    clearFeedbackSoon();
  }, [clearFeedbackSoon, isSequenceMode, mode, selectedLevel?.timeLimit]);

  useEffect(() => {
    const savedLocale = window.localStorage.getItem(LOCALE_STORAGE_KEY);

    if (savedLocale === "ko" || savedLocale === "en") {
      setLocale(savedLocale);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    const correct = new Audio("/sounds/correct.mp3");
    const wrong = new Audio("/sounds/wrong.mp3");
    correct.load();
    wrong.load();
    correctSoundRef.current = correct;
    wrongSoundRef.current = wrong;
  }, []);

  useEffect(() => {
    if (!isSequenceMode || !selectedLevel || !nextAsana) return;

    const wrongChoices = Array.from(new Set([...sequence, ...FALLBACK_CHOICES]))
      .filter((asana) => asana !== nextAsana && asana !== currentAsana)
      .slice(0, 3);

    setChoices(shuffleArray([nextAsana, ...wrongChoices].filter(Boolean)));
  }, [currentAsana, isSequenceMode, nextAsana, selectedLevel, sequence]);

  useEffect(() => {
    if (mode === "english" && englishRound) {
      setChoices(englishRound.choices);
    }
  }, [englishRound, mode]);

  useEffect(() => {
    if (!isDuelMode || !duelNextAsana) return;

    const wrongChoices = shuffleArray(
      Array.from(new Set(duelSequence)).filter((asana) => asana !== duelNextAsana && asana !== duelCurrentAsana)
    ).slice(0, 3);

    setDuelChoices(shuffleArray([duelNextAsana, ...wrongChoices]));
  }, [duelCurrentAsana, duelNextAsana, duelSequence, isDuelMode]);

  useEffect(() => {
    if (isDuelMode) return;
    if (!isPlaying || feedback || !hasNextPrompt) return;

    if (timeLeft <= 0) {
      handleTimeout();
      return;
    }

    const timer = window.setTimeout(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [feedback, handleTimeout, hasNextPrompt, isDuelMode, isPlaying, timeLeft]);

  useEffect(() => {
    if ((isGameOverResult || isSequenceCompleteResult || isDuelCompleteResult || isEnglishCompleteResult) && resultCompletedAt === null) {
      setResultCompletedAt(Date.now());
    }
  }, [isDuelCompleteResult, isEnglishCompleteResult, isGameOverResult, isSequenceCompleteResult, resultCompletedAt]);

  useEffect(() => {
    if (!isNoticeOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsNoticeOpen(false);
        setIsReleaseHistoryOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isNoticeOpen]);

  const topCategoryLabel = getCategoryLabel(mode);

  function playSound(soundRef: React.RefObject<HTMLAudioElement | null>) {
    const sound = soundRef.current;
    if (!sound) return;

    sound.pause();
    sound.currentTime = 0;
    sound.volume = 1;
    sound.play().catch(() => {});
  }

  function resetRecordState() {
    setResultCompletedAt(null);
    setSaveStep("ask");
    setNicknameError("");
    setSaveError("");
    setSavedRecord(null);
    setSavedRecordIsBest(false);
    setPublicSaveStatus("idle");
    setHasSubmittedPublicScore(false);
    setShowDeleteConfirm(false);
  }

  function resetRunState(timeLimit: number, startTimer = false) {
    setCurrentIndex(0);
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setLives(STARTING_LIVES);
    setCorrectAnswers(0);
    setMistakes(0);
    setFeedback(null);
    setChoices([]);
    setDuelChoices([]);
    setTimeLeft(timeLimit);
    setRunStartedAt(startTimer ? Date.now() : null);
    resetRecordState();
  }

  function goHome() {
    setMode("home");
    setGameMode("primary");
    setSelectedLevel(null);
    setEnglishRounds([]);
    resetRunState(0);
    router.push("/");
  }

  function startPrimary(level: LevelConfig) {
    setGameMode("primary");
    setSelectedLevel(level);
    setEnglishRounds([]);
    resetRunState(level.timeLimit, true);
    setMode("primary");
  }

  function startReverse(level: LevelConfig) {
    setGameMode("reverse");
    setSelectedLevel(level);
    setEnglishRounds([]);
    resetRunState(level.timeLimit, true);
    setMode("reverse");
  }

  function startIntermediate(level: LevelConfig) {
    setGameMode("intermediate");
    setSelectedLevel(level);
    setEnglishRounds([]);
    resetRunState(level.timeLimit, true);
    setMode("intermediate");
  }

  function startFullReverse(level: LevelConfig) {
    setGameMode("full-reverse");
    setSelectedLevel(level);
    setEnglishRounds([]);
    resetRunState(level.timeLimit, true);
    setMode("full-reverse");
  }

  function startEnglish() {
    setGameMode("english");
    setSelectedLevel(null);
    setEnglishRounds(makeEnglishRounds());
    resetRunState(ENGLISH_TIME_LIMIT, true);
    setMode("english");
  }

  function startDuel(nextMode: DuelMode) {
    setGameMode(nextMode);
    setSelectedLevel(null);
    setEnglishRounds([]);
    resetRunState(0, true);
    setMode(nextMode);
  }

  function handleSequenceChoice(choice: string) {
    if (!nextAsana || feedback) return;

    if (choice === nextAsana) {
      playSound(correctSoundRef);
      setFeedback("correct");
      setScore((prev) => prev + 100);
      setCorrectAnswers((prev) => prev + 1);
      setCombo((prev) => {
        const nextCombo = prev + 1;
        setMaxCombo((currentMax) => Math.max(currentMax, nextCombo));
        return nextCombo;
      });
      setCurrentIndex((prev) => prev + 1);
      setTimeLeft(selectedLevel?.timeLimit ?? 0);
      clearFeedbackSoon();
      return;
    }

    playSound(wrongSoundRef);
    setFeedback("wrong");
    setCombo(0);
    setMistakes((prev) => prev + 1);
    setLives((prev) => prev - 1);
    setTimeLeft(selectedLevel?.timeLimit ?? 0);
    clearFeedbackSoon();
  }

  function handleEnglishChoice(choice: string) {
    if (!englishRound || feedback) return;

    if (choice === englishRound.answer) {
      playSound(correctSoundRef);
      setFeedback("correct");
      setScore((prev) => prev + 100);
      setCorrectAnswers((prev) => prev + 1);
      setCombo((prev) => {
        const nextCombo = prev + 1;
        setMaxCombo((currentMax) => Math.max(currentMax, nextCombo));
        return nextCombo;
      });
      setCurrentIndex((prev) => prev + 1);
      setTimeLeft(ENGLISH_TIME_LIMIT);
      clearFeedbackSoon();
      return;
    }

    playSound(wrongSoundRef);
    setFeedback("wrong");
    setCombo(0);
    setMistakes((prev) => prev + 1);
    setLives((prev) => prev - 1);
    setCurrentIndex((prev) => prev + 1);
    setTimeLeft(ENGLISH_TIME_LIMIT);
    clearFeedbackSoon();
  }

  function handleDuelChoice(choice: string) {
    if (!duelNextAsana || feedback) return;

    if (choice === duelNextAsana) {
      playSound(correctSoundRef);
      setFeedback("correct");
      setScore((prev) => prev + 100);
      setCorrectAnswers((prev) => prev + 1);
      setCombo((prev) => {
        const nextCombo = prev + 1;
        setMaxCombo((currentMax) => Math.max(currentMax, nextCombo));
        return nextCombo;
      });
      window.setTimeout(() => {
        setCurrentIndex((previousIndex) => previousIndex + 2);
        setFeedback(null);
      }, 450);
      return;
    }

    playSound(wrongSoundRef);
    setFeedback("wrong");
    setMistakes((prev) => prev + 1);
    window.setTimeout(() => {
      setLives(0);
    }, 700);
  }

  function restart() {
    if (gameMode === "english") {
      startEnglish();
      return;
    }

    if (gameMode === "primary-duel" || gameMode === "intermediate-duel") {
      startDuel(gameMode);
      return;
    }

    if (selectedLevel) {
      if (gameMode === "reverse") {
        startReverse(selectedLevel);
      } else if (gameMode === "intermediate") {
        startIntermediate(selectedLevel);
      } else if (gameMode === "full-reverse") {
        startFullReverse(selectedLevel);
      } else {
        startPrimary(selectedLevel);
      }
      return;
    }

    setMode(getLevelSelectMode(gameMode));
  }

  function buildCurrentRecord(nickname: string): GameRecord {
    const completedAtMs = resultCompletedAt ?? Date.now();
    const durationMs = Math.max(completedAtMs - (runStartedAt ?? completedAtMs), runStartedAt ? 1 : 0);
    const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
    const levelTitle =
      gameMode === "english"
        ? text.sanskritGame
        : gameMode === "primary-duel" || gameMode === "intermediate-duel"
          ? getDuelTitle(gameMode)
        : selectedLevel
          ? getLevelTitle(selectedLevel, gameMode)
          : text.appTitle;

    return {
      id: createRecordId(),
      gameId: GAME_RECORD_IDS[gameMode],
      nickname,
      score,
      correctAnswers,
      totalQuestions,
      accuracy,
      durationMs,
      completedAt: new Date(completedAtMs).toISOString(),
      level: levelTitle,
      language: locale,
      mistakes,
    };
  }

  function cleanNickname(value: string) {
    return value.replace(/[\u0000-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim();
  }

  function validateNickname(value: string) {
    const cleaned = cleanNickname(value);
    if (cleaned.length < 2) return text.nicknameTooShort;
    if (cleaned.length > 12) return text.nicknameTooLong;
    if (!/^[\p{L}\p{N} ._-]+$/u.test(cleaned)) return text.nicknameUnsupported;
    return "";
  }

  function showNicknameForm() {
    setNicknameValue(getSavedNickname());
    setNicknameError("");
    setSaveError("");
    setSaveStep("form");
  }

  async function handleSaveRecord() {
    if (savedRecord || publicSaveStatus === "saving") return;

    const cleanedNickname = cleanNickname(nicknameValue);
    const validationError = validateNickname(cleanedNickname);
    if (validationError) {
      setNicknameError(validationError);
      return;
    }

    const previousBest = getBestRecord(GAME_RECORD_IDS[gameMode]);
    const record = buildCurrentRecord(cleanedNickname);
    const didSave = saveGameRecord(record);

    if (!didSave) {
      setSaveError(text.saveFailed);
      return;
    }

    saveNickname(cleanedNickname);
    setSavedRecord(record);
    setSavedRecordIsBest(!previousBest || compareGameRecords(record, previousBest) < 0);
    setSaveStep("saved");
    setRecordsVersion((prev) => prev + 1);
    setNicknameError("");
    setSaveError("");

    if (hasSubmittedPublicScore) return;

    if (!isPublicRankingConfigured()) {
      setPublicSaveStatus("unconfigured");
      return;
    }

    setPublicSaveStatus("saving");
    setHasSubmittedPublicScore(true);
    const publicResult = await savePublicGameScore(record);

    if (publicResult.ok) {
      setPublicSaveStatus("saved");
      return;
    }

    setPublicSaveStatus(publicResult.reason === "unconfigured" ? "unconfigured" : publicResult.reason === "invalid" ? "invalid" : "failed");
  }

  function handleClearCurrentGameRecords() {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }

    if (clearGameRecords(GAME_RECORD_IDS[gameMode])) {
      setRecordsVersion((prev) => prev + 1);
      setShowDeleteConfirm(false);
    }
  }

  function getResultRecordSummary(): GameRecord {
    return savedRecord ?? buildCurrentRecord("");
  }

  if (lives <= 0 && isPlaying) {
    return (
      <main className="app-shell feedback-wrong">
        <section className="screen">
          <div className="panel center-panel">
            <p className="eyebrow">{text.gameOver}</p>
            <h1 className="brand">{text.tryAgain}</h1>
            <p className="result-score">{score}</p>
            <p className="small-copy">FLOW x{combo}</p>
            <ResultDetails isPerfect={false} maxCombo={maxCombo} record={getResultRecordSummary()} text={text} />
          </div>
          <RecordPanel
            bestRecord={getBestRecord(GAME_RECORD_IDS[gameMode])}
            locale={locale}
            onCancelDelete={() => setShowDeleteConfirm(false)}
            onCancelForm={() => setSaveStep("ask")}
            onClearRecords={handleClearCurrentGameRecords}
            onNicknameChange={setNicknameValue}
            onSave={handleSaveRecord}
            onShowForm={showNicknameForm}
            onSkip={() => setSaveStep("skipped")}
            onViewRanking={() => router.push(`/ranking?game=${GAME_RECORD_IDS[gameMode]}`)}
            publicSaveStatus={publicSaveStatus}
            record={getResultRecordSummary()}
            recentRecords={getRecentRecords(GAME_RECORD_IDS[gameMode], 5)}
            saveError={saveError}
            savedRecord={savedRecord}
            savedRecordIsBest={savedRecordIsBest}
            saveStep={saveStep}
            showDeleteConfirm={showDeleteConfirm}
            text={text}
            nicknameError={nicknameError}
            nicknameValue={nicknameValue}
          />
          <div className="stack">
            <button className="button primary" type="button" onClick={restart}>
              {text.restart}
            </button>
            <button className="button ghost" type="button" onClick={goHome}>
              {text.home}
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (isSequenceMode && selectedLevel && !nextAsana) {
    return (
      <main className="app-shell">
        <section className="screen">
          <div className="panel center-panel">
            <p className="eyebrow">{text.levelClear}</p>
            <h1 className="brand">{getLevelTitle(selectedLevel, mode as SequenceMode)}</h1>
            <p className="result-score">{score}</p>
            <p className="small-copy">FLOW x{combo}</p>
            <ResultDetails isPerfect={false} maxCombo={maxCombo} record={getResultRecordSummary()} text={text} />
          </div>
          <RecordPanel
            bestRecord={getBestRecord(GAME_RECORD_IDS[gameMode])}
            locale={locale}
            onCancelDelete={() => setShowDeleteConfirm(false)}
            onCancelForm={() => setSaveStep("ask")}
            onClearRecords={handleClearCurrentGameRecords}
            onNicknameChange={setNicknameValue}
            onSave={handleSaveRecord}
            onShowForm={showNicknameForm}
            onSkip={() => setSaveStep("skipped")}
            onViewRanking={() => router.push(`/ranking?game=${GAME_RECORD_IDS[gameMode]}`)}
            publicSaveStatus={publicSaveStatus}
            record={getResultRecordSummary()}
            recentRecords={getRecentRecords(GAME_RECORD_IDS[gameMode], 5)}
            saveError={saveError}
            savedRecord={savedRecord}
            savedRecordIsBest={savedRecordIsBest}
            saveStep={saveStep}
            showDeleteConfirm={showDeleteConfirm}
            text={text}
            nicknameError={nicknameError}
            nicknameValue={nicknameValue}
          />
          <div className="stack">
            <button
              className="button primary"
              type="button"
              onClick={() => setMode(getLevelSelectMode(mode as SequenceMode))}
            >
              {text.selectLevel}
            </button>
            <button className="button ghost" type="button" onClick={goHome}>
              {text.home}
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (isDuelCompleteResult) {
    return (
      <main className="app-shell">
        <section className="screen">
          <div className="panel center-panel">
            <p className="eyebrow">{text.perfectClear}</p>
            <h1 className="brand">{getDuelTitle(mode as DuelMode)}</h1>
            <p className="result-score">{score}</p>
            <p className="small-copy">FLOW x{combo}</p>
            <ResultDetails isPerfect maxCombo={maxCombo} record={getResultRecordSummary()} text={text} />
          </div>
          <RecordPanel
            bestRecord={getBestRecord(GAME_RECORD_IDS[gameMode])}
            locale={locale}
            onCancelDelete={() => setShowDeleteConfirm(false)}
            onCancelForm={() => setSaveStep("ask")}
            onClearRecords={handleClearCurrentGameRecords}
            onNicknameChange={setNicknameValue}
            onSave={handleSaveRecord}
            onShowForm={showNicknameForm}
            onSkip={() => setSaveStep("skipped")}
            onViewRanking={() => router.push(`/ranking?game=${GAME_RECORD_IDS[gameMode]}`)}
            publicSaveStatus={publicSaveStatus}
            record={getResultRecordSummary()}
            recentRecords={getRecentRecords(GAME_RECORD_IDS[gameMode], 5)}
            saveError={saveError}
            savedRecord={savedRecord}
            savedRecordIsBest={savedRecordIsBest}
            saveStep={saveStep}
            showDeleteConfirm={showDeleteConfirm}
            text={text}
            nicknameError={nicknameError}
            nicknameValue={nicknameValue}
          />
          <div className="stack">
            <button className="button primary" type="button" onClick={() => setMode("duel-select")}>
              {text.selectLevel}
            </button>
            <button className="button ghost" type="button" onClick={goHome}>
              {text.home}
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (mode === "english" && currentIndex >= englishRounds.length) {
    return (
      <main className="app-shell">
        <section className="screen">
          <div className="panel center-panel">
            <p className="eyebrow">{text.completed}</p>
            <h1 className="brand">{text.sanskritGame}</h1>
            <p className="result-score">{score}</p>
            <p className="small-copy">FLOW x{combo}</p>
            <ResultDetails isPerfect={false} maxCombo={maxCombo} record={getResultRecordSummary()} text={text} />
          </div>
          <RecordPanel
            bestRecord={getBestRecord(GAME_RECORD_IDS[gameMode])}
            locale={locale}
            onCancelDelete={() => setShowDeleteConfirm(false)}
            onCancelForm={() => setSaveStep("ask")}
            onClearRecords={handleClearCurrentGameRecords}
            onNicknameChange={setNicknameValue}
            onSave={handleSaveRecord}
            onShowForm={showNicknameForm}
            onSkip={() => setSaveStep("skipped")}
            onViewRanking={() => router.push(`/ranking?game=${GAME_RECORD_IDS[gameMode]}`)}
            publicSaveStatus={publicSaveStatus}
            record={getResultRecordSummary()}
            recentRecords={getRecentRecords(GAME_RECORD_IDS[gameMode], 5)}
            saveError={saveError}
            savedRecord={savedRecord}
            savedRecordIsBest={savedRecordIsBest}
            saveStep={saveStep}
            showDeleteConfirm={showDeleteConfirm}
            text={text}
            nicknameError={nicknameError}
            nicknameValue={nicknameValue}
          />
          <div className="stack">
            <button className="button primary" type="button" onClick={restart}>
              {text.restart}
            </button>
            <button className="button ghost" type="button" onClick={goHome}>
              {text.home}
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className={`app-shell ${feedback ? `feedback-${feedback}` : ""}`}>
      {feedback ? (
        <div className="feedback-toast">
          {feedback === "correct" ? text.correct : feedback === "wrong" ? text.wrong : text.timeout}
        </div>
      ) : null}

      <div className="top-bar">
        <div>
          {topCategoryLabel ? <p className="eyebrow">{topCategoryLabel}</p> : null}
          <h1 className="brand">
            {mode === "level-select" ||
            mode === "reverse-level-select" ||
            mode === "intermediate-level-select" ||
            mode === "full-reverse-level-select" ||
            mode === "duel-select"
              ? text.selectLevel
              : mode === "primary"
                ? selectedLevel && getLevelTitle(selectedLevel, "primary")
                : mode === "reverse"
                  ? selectedLevel && getLevelTitle(selectedLevel, "reverse")
                  : mode === "intermediate"
                    ? selectedLevel && getLevelTitle(selectedLevel, "intermediate")
                    : mode === "full-reverse"
                      ? selectedLevel && getLevelTitle(selectedLevel, "full-reverse")
                      : mode === "primary-duel" || mode === "intermediate-duel"
                        ? getDuelTitle(mode)
                      : mode === "english"
                        ? text.sanskritGame
                        : text.appTitle}
          </h1>
        </div>
        <div className="top-actions">
          <div className="locale-notice-stack">
            <LocaleSwitch locale={locale} onChange={changeLocale} />
            {mode === "home" ? (
              <button
                aria-controls="home-notice-panel"
                aria-expanded={isNoticeOpen}
                className="notice-toggle"
                type="button"
                onClick={() => setIsNoticeOpen((prev) => !prev)}
              >
                {text.noticeButton}
              </button>
            ) : null}
          </div>
          {mode !== "home" ? (
            <button className="button ghost small-button" type="button" onClick={goHome}>
              {text.home}
            </button>
          ) : null}
        </div>
      </div>

      {mode === "home" ? (
        <section className="screen">
          <div>
            <p className="eyebrow">{text.instantStart}</p>
            <p className="small-copy">{text.description}</p>
            <div className="trust-badge" aria-label={text.trustBadgeText.replace("\n", " ")}>
              <p>{text.trustBadgeBrand}</p>
              <span>
                {text.trustBadgeText.split("\n").map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </span>
            </div>
          </div>
          {isNoticeOpen ? (
            <NoticePanel
              isReleaseHistoryOpen={isReleaseHistoryOpen}
              onToggleReleaseHistory={() => setIsReleaseHistoryOpen((prev) => !prev)}
              text={text}
            />
          ) : null}
          <div className="stack">
            <button className="button primary" type="button" onClick={() => setMode("level-select")}>
              {text.primaryGame}
            </button>
            {locale === "ko" ? (
              <button className="button secondary" type="button" onClick={startEnglish}>
                {text.sanskritGame}
              </button>
            ) : null}
            <button className="button reverse" type="button" onClick={() => setMode("reverse-level-select")}>
              {text.reverseGame}
            </button>
            <button
              className="button intermediate"
              type="button"
              onClick={() => goToRoute("/intermediate", "intermediate-level-select")}
            >
              {text.intermediateGame}
            </button>
            <button
              className="button full-reverse"
              type="button"
              onClick={() => goToRoute("/full-reverse", "full-reverse-level-select")}
            >
              {text.fullReverseGame}
            </button>
            <button className="button duel" type="button" onClick={() => setMode("duel-select")}>
              {text.aiDuelGame}
            </button>
            <button className="button ghost" type="button" onClick={() => router.push("/ranking")}>
              {text.publicRanking}
            </button>
          </div>
          <div className="notice-card compact-notice-card">
            <div className="notice-title">{text.latestUpdateShortLabel}</div>
            <div className="notice-list">
              <span>🤖 AI Vinyasa Duel</span>
              <span>Primary Duel</span>
              <span>Intermediate Duel</span>
            </div>
          </div>
          <div className="social-row">
  <a href="https://cafe.naver.com/ashtangayoga" target="_blank" rel="noopener noreferrer" aria-label="Naver Cafe">
    <Image src="/icons/naver-cafe.png" alt="Naver Cafe" width={32} height={32} />
      <span>Community</span>
  </a>

  <a href="https://www.instagram.com/ashtangayoga_korea" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
    <Image src="/icons/Instagram.png" alt="Instagram" width={32} height={32} />
     <span>Instagram</span>
  </a>
</div>

          <p className="home-studio-mark">- ASHTANGA YOGA STUDIO -</p>
        </section>
      ) : null}

      {mode === "level-select" ? (
        <section className="stack level-list">
          {primaryLevels.map((level) => (
            <button className="button level-button" key={level.id} type="button" onClick={() => startPrimary(level)}>
              <span className="level-title">{getLevelTitle(level, "primary")}</span>
            </button>
          ))}
        </section>
      ) : null}

      {mode === "reverse-level-select" ? (
        <section className="stack level-list">
          {reverseLevels.map((level) => (
            <button className="button level-button" key={level.id} type="button" onClick={() => startReverse(level)}>
              <span className="level-title">{getLevelTitle(level, "reverse")}</span>
            </button>
          ))}
        </section>
      ) : null}

      {mode === "intermediate-level-select" ? (
        <section className="stack level-list">
          <p className="small-copy">{text.intermediateDescription}</p>
          {intermediateLevels.map((level) => (
            <button className="button level-button" key={level.id} type="button" onClick={() => startIntermediate(level)}>
              <span className="level-title">{getLevelTitle(level, "intermediate")}</span>
            </button>
          ))}
        </section>
      ) : null}

      {mode === "full-reverse-level-select" ? (
        <section className="stack level-list">
          <p className="small-copy">{text.fullReverseDescription}</p>
          {fullReverseLevels.map((level) => (
            <button className="button level-button" key={level.id} type="button" onClick={() => startFullReverse(level)}>
              <span className="level-title">{getLevelTitle(level, "full-reverse")}</span>
            </button>
          ))}
        </section>
      ) : null}

      {mode === "duel-select" ? (
        <section className="stack level-list">
          <p className="small-copy">{text.aiDuelDescription}</p>
          <button className="button level-button" type="button" onClick={() => startDuel("primary-duel")}>
            <span className="level-title">{text.primaryDuel}</span>
          </button>
          <button className="button level-button" type="button" onClick={() => startDuel("intermediate-duel")}>
            <span className="level-title">{text.intermediateDuel}</span>
          </button>
        </section>
      ) : null}

      {isSequenceMode && selectedLevel && nextAsana ? (
        <GameBoard
          choices={choices}
          displayChoice={getAsanaDisplayName}
          combo={combo}
          currentLabel="CURRENT ASANA"
          currentPrompt={getAsanaDisplayName(currentAsana)}
          lives={lives}
          nextLabel={mode === "reverse" || mode === "full-reverse" ? "PREVIOUS ASANA?" : "NEXT ASANA?"}
          onChoice={handleSequenceChoice}
          score={score}
          seriesLabel={getCategoryLabel(mode) ?? ""}
          statLabels={text}
          timeLeft={timeLeft}
          title={getLevelTitle(selectedLevel, mode as SequenceMode)}
        />
      ) : null}

      {mode === "english" && englishRound ? (
        <GameBoard
          choices={choices}
          displayChoice={(choice) => choice}
          combo={combo}
          currentLabel="SANSKRIT"
          currentPrompt={englishRound.prompt}
          lives={lives}
          nextLabel="NEXT ASANA?"
          onChoice={handleEnglishChoice}
          score={score}
          seriesLabel={getCategoryLabel(mode) ?? ""}
          statLabels={text}
          timeLeft={timeLeft}
          title={text.sanskritInstruction}
        />
      ) : null}

      {isDuelMode && duelCurrentAsana && duelNextAsana ? (
        <DuelBoard
          choices={duelChoices}
          combo={combo}
          correctAnswer={duelNextAsana}
          currentPrompt={getAsanaDisplayName(duelCurrentAsana)}
          displayChoice={getAsanaDisplayName}
          feedback={feedback}
          locale={locale}
          maxCombo={maxCombo}
          onChoice={handleDuelChoice}
          progressCurrent={currentDuelQuestion}
          progressTotal={totalDuelQuestions}
          score={score}
          statLabels={text}
          title={getDuelTitle(mode)}
          startedAt={runStartedAt}
        />
      ) : null}
    </main>
  );
}

function formatDuration(durationMs: number, locale: Locale) {
  const totalSeconds = Math.max(0, Math.round(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (locale === "ko") {
    return minutes > 0 ? `${minutes}분 ${seconds}초` : `${seconds}초`;
  }

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

function RecordPanel({
  bestRecord,
  locale,
  nicknameError,
  nicknameValue,
  onCancelForm,
  onClearRecords,
  onCancelDelete,
  onNicknameChange,
  onSave,
  onShowForm,
  onSkip,
  onViewRanking,
  publicSaveStatus,
  recentRecords,
  record,
  saveError,
  savedRecord,
  savedRecordIsBest,
  saveStep,
  showDeleteConfirm,
  text,
}: {
  bestRecord: GameRecord | null;
  locale: Locale;
  nicknameError: string;
  nicknameValue: string;
  onCancelForm: () => void;
  onClearRecords: () => void;
  onCancelDelete: () => void;
  onNicknameChange: (value: string) => void;
  onSave: () => void;
  onShowForm: () => void;
  onSkip: () => void;
  onViewRanking: () => void;
  publicSaveStatus: PublicSaveStatus;
  recentRecords: GameRecord[];
  record: GameRecord;
  saveError: string;
  savedRecord: GameRecord | null;
  savedRecordIsBest: boolean;
  saveStep: SaveStep;
  showDeleteConfirm: boolean;
  text: (typeof translations)[Locale];
}) {
  const displayedBest = bestRecord;
  const hasRecords = recentRecords.length > 0;

  return (
    <section className="record-panel" aria-label={text.recentResults}>
      <div className="record-summary">
        <div>
          <span>{text.score}</span>
          <strong>{formatScore(record.score, locale, text.points)}</strong>
        </div>
        <div>
          <span>{text.accuracy}</span>
          <strong>{record.accuracy}%</strong>
        </div>
        <div>
          <span>{text.duration}</span>
          <strong>{formatDuration(record.durationMs, locale)}</strong>
        </div>
      </div>

      {saveStep === "ask" ? (
        <div className="record-save-box">
          <p>{text.savePrompt}</p>
          <div className="record-actions">
            <button className="button primary record-button" type="button" onClick={onShowForm}>
              {text.saveResult}
            </button>
            <button className="button ghost record-button" type="button" onClick={onSkip}>
              {text.notNow}
            </button>
          </div>
        </div>
      ) : null}

      {saveStep === "form" ? (
        <div className="record-save-box">
          <p>{text.nicknamePrompt}</p>
          <label className="record-label" htmlFor="record-nickname">
            {text.nickname}
          </label>
          <input
            aria-describedby={nicknameError ? "record-nickname-error" : undefined}
            className="record-input"
            id="record-nickname"
            maxLength={16}
            onChange={(event) => onNicknameChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") onSave();
              if (event.key === "Escape") onCancelForm();
            }}
            type="text"
            value={nicknameValue}
          />
          {nicknameError ? (
            <p className="record-error" id="record-nickname-error">
              {nicknameError}
            </p>
          ) : null}
          {saveError ? <p className="record-error">{saveError}</p> : null}
          <div className="record-actions">
            <button className="button primary record-button" type="button" onClick={onSave} disabled={Boolean(savedRecord) || publicSaveStatus === "saving"}>
              {text.saveScore}
            </button>
            <button className="button ghost record-button" type="button" onClick={onCancelForm}>
              {text.cancel}
            </button>
          </div>
        </div>
      ) : null}

      {saveStep === "saved" ? (
        <div className="record-save-box">
          <p>{text.resultSaved}</p>
          {savedRecordIsBest ? <strong className="record-best-badge">{text.newPersonalBest}</strong> : null}
          <PublicSaveMessage status={publicSaveStatus} text={text} />
          <button className="button ghost record-button" type="button" onClick={onViewRanking}>
            {text.viewPublicRanking}
          </button>
        </div>
      ) : null}

      <div className="record-history">
        <div className="record-history-header">
          <h3>{text.personalBest}</h3>
        </div>
        {displayedBest ? <RecordListItem locale={locale} record={displayedBest} text={text} /> : <p className="record-empty">{text.noRecords}</p>}
      </div>

      <div className="record-history">
        <div className="record-history-header">
          <h3>{text.recentResults}</h3>
          {hasRecords && !showDeleteConfirm ? (
            <button className="record-delete-button" type="button" onClick={onClearRecords}>
              {text.deleteRecords}
            </button>
          ) : null}
        </div>
        {showDeleteConfirm ? (
          <div className="record-delete-confirm">
            <p>{text.deleteRecordsConfirm}</p>
            <div className="record-actions">
              <button className="button primary record-button" type="button" onClick={onClearRecords}>
                {text.deleteRecords}
              </button>
              <button className="button ghost record-button" type="button" onClick={onCancelDelete}>
                {text.cancel}
              </button>
            </div>
          </div>
        ) : null}
        {hasRecords ? (
          <div className="record-list">
            {recentRecords.map((recentRecord) => (
              <RecordListItem key={recentRecord.id} locale={locale} record={recentRecord} text={text} />
            ))}
          </div>
        ) : (
          <p className="record-empty">{text.noRecords}</p>
        )}
      </div>
    </section>
  );
}

function RecordListItem({
  locale,
  record,
  text,
}: {
  locale: Locale;
  record: GameRecord;
  text: (typeof translations)[Locale];
}) {
  return (
    <article className="record-list-item">
      <strong>{record.nickname}</strong>
      <span>
        {formatScore(record.score, locale, text.points)} · {record.accuracy}% · {formatDuration(record.durationMs, locale)}
      </span>
      <time dateTime={record.completedAt}>{formatDate(record.completedAt, locale)}</time>
    </article>
  );
}

function NoticePanel({
  isReleaseHistoryOpen,
  onToggleReleaseHistory,
  text,
}: {
  isReleaseHistoryOpen: boolean;
  onToggleReleaseHistory: () => void;
  text: (typeof translations)[Locale];
}) {
  const releaseHistory = [
    ["v1.5", "AI Vinyasa Duel"],
    ["v1.4", "Public Ranking"],
    ["v1.3", "Intermediate Game"],
    ["v1.2", "Reverse Game"],
    ["v1.1", "Sanskrit Game"],
    ["v1.0", "Primary Sequence"],
  ] as const;

  return (
    <section className="notice-panel" id="home-notice-panel" aria-label={text.noticeTitle}>
      <div className="notice-panel-header">
        <h2>{text.noticeTitle}</h2>
      </div>

      <div className="notice-section">
        <p className="notice-kicker">{text.latestUpdateLabel}</p>
        <h3>{text.latestUpdateTitle}</h3>
        <p>
          {text.latestUpdateBody.split("\n").map((line) => (
            <span key={line}>{line}</span>
          ))}
        </p>
      </div>

      <div className="release-history">
        <button aria-expanded={isReleaseHistoryOpen} type="button" onClick={onToggleReleaseHistory}>
          {text.releaseHistory}
        </button>
        {isReleaseHistoryOpen ? (
          <div className="release-history-list">
            {releaseHistory.map(([version, label]) => (
              <div key={version}>
                <span>{version}</span>
                <p>{label}</p>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function ResultDetails({
  isPerfect,
  maxCombo,
  record,
  text,
}: {
  isPerfect: boolean;
  maxCombo: number;
  record: GameRecord;
  text: (typeof translations)[Locale];
}) {
  return (
    <div className="result-detail-grid">
      <span>
        {text.correctAnswers} {record.correctAnswers}/{record.totalQuestions}
      </span>
      <span>
        {text.maxCombo} {maxCombo}
      </span>
      <span>
        {text.perfect} {isPerfect ? "YES" : "NO"}
      </span>
    </div>
  );
}

function PublicSaveMessage({
  status,
  text,
}: {
  status: PublicSaveStatus;
  text: (typeof translations)[Locale];
}) {
  if (status === "idle") return null;

  const message =
    status === "saving"
      ? text.publicSaveSaving
      : status === "saved"
        ? text.publicSaveSuccess
        : status === "unconfigured"
          ? text.publicSaveUnconfigured
          : text.publicSaveFailed;

  return <p className={status === "saved" ? "record-public-success" : "record-public-note"}>{message}</p>;
}

function DuelBoard({
  choices,
  combo,
  correctAnswer,
  currentPrompt,
  displayChoice,
  feedback,
  locale,
  maxCombo,
  onChoice,
  progressCurrent,
  progressTotal,
  score,
  startedAt,
  statLabels,
  title,
}: {
  choices: string[];
  combo: number;
  correctAnswer: string;
  currentPrompt: string;
  displayChoice: (choice: string) => string;
  feedback: Feedback;
  locale: Locale;
  maxCombo: number;
  onChoice: (choice: string) => void;
  progressCurrent: number;
  progressTotal: number;
  score: number;
  startedAt: number | null;
  statLabels: (typeof translations)[Locale];
  title: string;
}) {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (!startedAt) return;

    const updateElapsed = () => setElapsedMs(Date.now() - startedAt);
    updateElapsed();
    const timer = window.setInterval(updateElapsed, 1000);

    return () => window.clearInterval(timer);
  }, [startedAt]);

  return (
    <section className="game-card duel-card">
      <div className="game-header">
        <div>
          <p className="eyebrow">{statLabels.aiDuelGame}</p>
          <h2>{title}</h2>
        </div>
      </div>

      <div className="duel-stats">
        <div className="stat">
          <span>{statLabels.score}</span>
          <strong>{score}</strong>
        </div>
        <div className="stat">
          <span>{statLabels.combo}</span>
          <strong>{combo}</strong>
        </div>
        <div className="stat">
          <span>{statLabels.maxCombo}</span>
          <strong>{maxCombo}</strong>
        </div>
      </div>

      <div className="current-panel duel-current">
        <p>{statLabels.aiCurrentAsana}</p>
        <h3>{currentPrompt}</h3>
      </div>

      <div className="duel-meta">
        <span>
          {statLabels.progress} {progressCurrent} / {progressTotal}
        </span>
        <span>
          {statLabels.duration} {formatDuration(elapsedMs, locale)}
        </span>
      </div>

      <div className="next-row">
        <p>{statLabels.chooseNextAsana}</p>
      </div>

      <div className="choice-grid">
        {choices.map((choice) => (
          <button
            className={`button option ${feedback === "correct" ? "duel-correct-pulse" : ""} ${
              feedback === "wrong" && choice === correctAnswer ? "correct" : ""
            }`}
            key={choice}
            type="button"
            onClick={() => onChoice(choice)}
            disabled={Boolean(feedback)}
          >
            {displayChoice(choice)}
          </button>
        ))}
      </div>
    </section>
  );
}

function GameBoard({
  choices,
  combo,
  currentLabel,
  currentPrompt,
  displayChoice,
  lives,
  nextLabel,
  onChoice,
  score,
  seriesLabel,
  statLabels,
  timeLeft,
  title,
}: {
  choices: string[];
  combo: number;
  currentLabel: string;
  currentPrompt: string;
  displayChoice: (choice: string) => string;
  lives: number;
  nextLabel: string;
  onChoice: (choice: string) => void;
  score: number;
  seriesLabel: string;
  statLabels: (typeof translations)[Locale];
  timeLeft: number;
  title: string;
}) {
  return (
    <section className="game-card">
      <div className="game-header">
        <div>
          <p className="eyebrow">{seriesLabel}</p>
          <h2>{title}</h2>
        </div>
      </div>

      <div className="stats">
        <div className="stat">
          <span>{statLabels.score}</span>
          <strong>{score}</strong>
        </div>
        <div className="stat">
          <span>{statLabels.combo}</span>
          <strong>{combo}</strong>
        </div>
        <div className="stat">
          <span>{statLabels.life}</span>
          <strong>{lives}</strong>
        </div>
        <div className="stat">
          <span>{statLabels.time}</span>
          <strong>{timeLeft}</strong>
        </div>
      </div>

      <div className="current-panel">
        <p>{currentLabel}</p>
        <h3>{currentPrompt}</h3>
        <div className="life-dots" aria-label={`${statLabels.remainingLives} ${lives}`}>
          {Array.from({ length: lives }).map((_, index) => (
            <span key={index} />
          ))}
        </div>
      </div>

      <div className="next-row">
        <p>{nextLabel}</p>
      </div>

      <div className="choice-grid">
        {choices.map((choice) => (
          <button className="button option" key={choice} type="button" onClick={() => onChoice(choice)}>
            {displayChoice(choice)}
          </button>
        ))}
      </div>
    </section>
  );
}

function LocaleSwitch({
  locale,
  onChange,
}: {
  locale: Locale;
  onChange: (locale: Locale) => void;
}) {
  return (
    <div className="locale-switch" role="group" aria-label="Language">
      <button
        className={locale === "ko" ? "active" : ""}
        type="button"
        aria-pressed={locale === "ko"}
        onClick={() => onChange("ko")}
      >
        KR
      </button>
      <span aria-hidden="true">/</span>
      <button
        className={locale === "en" ? "active" : ""}
        type="button"
        aria-pressed={locale === "en"}
        onClick={() => onChange("en")}
      >
        EN
      </button>
    </div>
  );
}
