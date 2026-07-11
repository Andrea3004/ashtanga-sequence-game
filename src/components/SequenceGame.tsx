"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  asanaEnglishNames,
  FALLBACK_CHOICES,
  fullReverseLevels,
  intermediateLevels,
  primaryFullEnglishSequence,
  primaryLevels,
  reverseLevels,
  type EnglishQuizPose,
  type LevelConfig,
} from "@/data/primarySequence";

type LevelSelectMode = "level-select" | "reverse-level-select" | "intermediate-level-select" | "full-reverse-level-select";
type SequenceMode = "primary" | "reverse" | "intermediate" | "full-reverse";
type Mode = "home" | LevelSelectMode | SequenceMode | "english" | "result";
type GameMode = SequenceMode | "english";
type Feedback = "correct" | "wrong" | "timeout" | null;
type Locale = "ko" | "en";
type SeriesCategory = "primary" | "intermediate";

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
    primaryGame: "프라이머리 시퀀스 게임",
    sanskritGame: "산스크리트 이름 게임",
    reverseGame: "리버스 시퀀스 게임",
    intermediateGame: "인터미디어트 시퀀스 게임",
    fullReverseGame: "풀 리버스 게임",
    intermediateDescription: "인터미디어트 시리즈의 순서를 반복하며 익혀보세요.",
    fullReverseDescription: "전체 시퀀스를 마지막 자세부터 역순으로 익혀보세요.",
    selectLevel: "레벨 선택",
    home: "홈",
    restart: "다시 시작",
    tryAgain: "다시 도전",
    gameOver: "GAME OVER",
    levelClear: "LEVEL CLEAR",
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
  },
  en: {
    appTitle: "Ashtanga Sequence Game",
    instantStart: "Start instantly. No login required.",
    description: "Practice the Primary Series sequence and Sanskrit names through quick repetition.",
    primaryGame: "Primary Sequence Game",
    sanskritGame: "Sanskrit Name Game",
    reverseGame: "Reverse Sequence Game",
    intermediateGame: "Intermediate Sequence Game",
    fullReverseGame: "Full Reverse Game",
    intermediateDescription: "Practice and memorize the Intermediate Series sequence.",
    fullReverseDescription: "Practice the full sequence in reverse order, starting from the final posture.",
    selectLevel: "Select Level",
    home: "Home",
    restart: "Restart",
    tryAgain: "Try Again",
    gameOver: "GAME OVER",
    levelClear: "LEVEL CLEAR",
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
  },
} as const;

const GAME_SERIES: Record<GameMode, SeriesCategory> = {
  primary: "primary",
  reverse: "primary",
  english: "primary",
  intermediate: "intermediate",
  "full-reverse": "intermediate",
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
  const [lives, setLives] = useState(STARTING_LIVES);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [choices, setChoices] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);

  const correctSoundRef = useRef<HTMLAudioElement | null>(null);
  const wrongSoundRef = useRef<HTMLAudioElement | null>(null);

  const sequence = selectedLevel?.sequence ?? EMPTY_SEQUENCE;
  const currentAsana = sequence[currentIndex];
  const nextAsana = sequence[currentIndex + 1];
  const englishRound = englishRounds[currentIndex];
  const isSequenceMode = mode === "primary" || mode === "reverse" || mode === "intermediate" || mode === "full-reverse";
  const isPlaying = isSequenceMode || mode === "english";
  const hasNextPrompt = isSequenceMode ? Boolean(nextAsana) : Boolean(englishRound);
  const text = translations[locale];

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

  function getGameModeForView(viewMode: Mode): GameMode | null {
    if (viewMode === "home" || viewMode === "result") return null;
    if (viewMode === "level-select") return "primary";
    if (viewMode === "reverse-level-select") return "reverse";
    if (viewMode === "intermediate-level-select") return "intermediate";
    if (viewMode === "full-reverse-level-select") return "full-reverse";
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
    if (!isPlaying || feedback || !hasNextPrompt) return;

    if (timeLeft <= 0) {
      handleTimeout();
      return;
    }

    const timer = window.setTimeout(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [feedback, handleTimeout, hasNextPrompt, isPlaying, timeLeft]);

  const topCategoryLabel = getCategoryLabel(mode);

  function playSound(soundRef: React.RefObject<HTMLAudioElement | null>) {
    const sound = soundRef.current;
    if (!sound) return;

    sound.pause();
    sound.currentTime = 0;
    sound.volume = 1;
    sound.play().catch(() => {});
  }

  function resetRunState(timeLimit: number) {
    setCurrentIndex(0);
    setScore(0);
    setCombo(0);
    setLives(STARTING_LIVES);
    setFeedback(null);
    setChoices([]);
    setTimeLeft(timeLimit);
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
    resetRunState(level.timeLimit);
    setMode("primary");
  }

  function startReverse(level: LevelConfig) {
    setGameMode("reverse");
    setSelectedLevel(level);
    setEnglishRounds([]);
    resetRunState(level.timeLimit);
    setMode("reverse");
  }

  function startIntermediate(level: LevelConfig) {
    setGameMode("intermediate");
    setSelectedLevel(level);
    setEnglishRounds([]);
    resetRunState(level.timeLimit);
    setMode("intermediate");
  }

  function startFullReverse(level: LevelConfig) {
    setGameMode("full-reverse");
    setSelectedLevel(level);
    setEnglishRounds([]);
    resetRunState(level.timeLimit);
    setMode("full-reverse");
  }

  function startEnglish() {
    setGameMode("english");
    setSelectedLevel(null);
    setEnglishRounds(makeEnglishRounds());
    resetRunState(ENGLISH_TIME_LIMIT);
    setMode("english");
  }

  function handleSequenceChoice(choice: string) {
    if (!nextAsana || feedback) return;

    if (choice === nextAsana) {
      playSound(correctSoundRef);
      setFeedback("correct");
      setScore((prev) => prev + 100);
      setCombo((prev) => prev + 1);
      setCurrentIndex((prev) => prev + 1);
      setTimeLeft(selectedLevel?.timeLimit ?? 0);
      clearFeedbackSoon();
      return;
    }

    playSound(wrongSoundRef);
    setFeedback("wrong");
    setCombo(0);
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
      setCombo((prev) => prev + 1);
      setCurrentIndex((prev) => prev + 1);
      setTimeLeft(ENGLISH_TIME_LIMIT);
      clearFeedbackSoon();
      return;
    }

    playSound(wrongSoundRef);
    setFeedback("wrong");
    setCombo(0);
    setLives((prev) => prev - 1);
    setCurrentIndex((prev) => prev + 1);
    setTimeLeft(ENGLISH_TIME_LIMIT);
    clearFeedbackSoon();
  }

  function restart() {
    if (gameMode === "english") {
      startEnglish();
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

  if (lives <= 0 && isPlaying) {
    return (
      <main className="app-shell feedback-wrong">
        <section className="screen">
          <div className="panel center-panel">
            <p className="eyebrow">{text.gameOver}</p>
            <h1 className="brand">{text.tryAgain}</h1>
            <p className="result-score">{score}</p>
            <p className="small-copy">FLOW x{combo}</p>
          </div>
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
          </div>
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

  if (mode === "english" && currentIndex >= englishRounds.length) {
    return (
      <main className="app-shell">
        <section className="screen">
          <div className="panel center-panel">
            <p className="eyebrow">{text.completed}</p>
            <h1 className="brand">{text.sanskritGame}</h1>
            <p className="result-score">{score}</p>
            <p className="small-copy">FLOW x{combo}</p>
          </div>
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
            mode === "full-reverse-level-select"
              ? text.selectLevel
              : mode === "primary"
                ? selectedLevel && getLevelTitle(selectedLevel, "primary")
                : mode === "reverse"
                  ? selectedLevel && getLevelTitle(selectedLevel, "reverse")
                  : mode === "intermediate"
                    ? selectedLevel && getLevelTitle(selectedLevel, "intermediate")
                    : mode === "full-reverse"
                      ? selectedLevel && getLevelTitle(selectedLevel, "full-reverse")
                      : mode === "english"
                        ? text.sanskritGame
                        : text.appTitle}
          </h1>
        </div>
        <div className="top-actions">
          <LocaleSwitch locale={locale} onChange={changeLocale} />
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
          </div>
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
    </main>
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
