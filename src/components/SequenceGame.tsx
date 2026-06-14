"use client";

import { useEffect, useRef, useState } from "react";
import {
  FALLBACK_CHOICES,
  primaryFullEnglishSequence,
  primaryLevels,
  type EnglishQuizPose,
  type LevelConfig,
} from "@/data/primarySequence";

type Mode = "home" | "level-select" | "primary" | "english" | "result";
type GameMode = "primary" | "english";
type Feedback = "correct" | "wrong" | "timeout" | null;

type EnglishRound = {
  prompt: string;
  answer: string;
  choices: string[];
};

const STARTING_LIVES = 3;
const ENGLISH_TIME_LIMIT = 12;

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

export default function SequenceGame() {
  const [mode, setMode] = useState<Mode>("home");
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

  const sequence = selectedLevel?.sequence ?? [];
  const currentAsana = sequence[currentIndex];
  const nextAsana = sequence[currentIndex + 1];
  const englishRound = englishRounds[currentIndex];
  const isPlaying = mode === "primary" || mode === "english";
  const hasNextPrompt = mode === "primary" ? Boolean(nextAsana) : Boolean(englishRound);

  useEffect(() => {
    const correct = new Audio("/sounds/correct.mp3");
    const wrong = new Audio("/sounds/wrong.mp3");
    correct.load();
    wrong.load();
    correctSoundRef.current = correct;
    wrongSoundRef.current = wrong;
  }, []);

  useEffect(() => {
    if (mode !== "primary" || !selectedLevel || !nextAsana) return;

    const wrongChoices = Array.from(new Set([...sequence, ...FALLBACK_CHOICES]))
      .filter((asana) => asana !== nextAsana && asana !== currentAsana)
      .slice(0, 3);

    setChoices(shuffleArray([nextAsana, ...wrongChoices].filter(Boolean)));
  }, [currentAsana, mode, nextAsana, selectedLevel, sequence]);

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
  }, [feedback, hasNextPrompt, isPlaying, timeLeft]);

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
  }

  function startPrimary(level: LevelConfig) {
    setGameMode("primary");
    setSelectedLevel(level);
    setEnglishRounds([]);
    resetRunState(level.timeLimit);
    setMode("primary");
  }

  function startEnglish() {
    setGameMode("english");
    setSelectedLevel(null);
    setEnglishRounds(makeEnglishRounds());
    resetRunState(ENGLISH_TIME_LIMIT);
    setMode("english");
  }

  function clearFeedbackSoon() {
    window.setTimeout(() => setFeedback(null), 700);
  }

  function handleTimeout() {
    setFeedback("timeout");
    setLives((prev) => prev - 1);
    setCombo(0);
    if (mode === "english") {
      setCurrentIndex((prev) => prev + 1);
    }
    setTimeLeft(mode === "primary" ? selectedLevel?.timeLimit ?? 0 : ENGLISH_TIME_LIMIT);
    clearFeedbackSoon();
  }

  function handlePrimaryChoice(choice: string) {
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
      startPrimary(selectedLevel);
      return;
    }

    setMode("level-select");
  }

  if (lives <= 0 && isPlaying) {
    return (
      <main className="app-shell feedback-wrong">
        <section className="screen">
          <div className="panel center-panel">
            <p className="eyebrow">GAME OVER</p>
            <h1 className="brand">다시 도전</h1>
            <p className="result-score">{score}</p>
            <p className="small-copy">FLOW x{combo}</p>
          </div>
          <div className="stack">
            <button className="button primary" type="button" onClick={restart}>
              다시 시작
            </button>
            <button className="button ghost" type="button" onClick={goHome}>
              메인으로
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (mode === "primary" && selectedLevel && !nextAsana) {
    return (
      <main className="app-shell">
        <section className="screen">
          <div className="panel center-panel">
            <p className="eyebrow">LEVEL CLEAR</p>
            <h1 className="brand">{selectedLevel.title}</h1>
            <p className="result-score">{score}</p>
            <p className="small-copy">FLOW x{combo}</p>
          </div>
          <div className="stack">
            <button className="button primary" type="button" onClick={() => setMode("level-select")}>
              레벨 선택
            </button>
            <button className="button ghost" type="button" onClick={goHome}>
              메인으로
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
            <p className="eyebrow">COMPLETE</p>
            <h1 className="brand">영어 시퀀스 게임</h1>
            <p className="result-score">{score}</p>
            <p className="small-copy">FLOW x{combo}</p>
          </div>
          <div className="stack">
            <button className="button primary" type="button" onClick={restart}>
              다시 시작
            </button>
            <button className="button ghost" type="button" onClick={goHome}>
              메인으로
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
          {feedback === "correct" ? "정답!" : feedback === "wrong" ? "오답!" : "시간초과!"}
        </div>
      ) : null}

      <div className="top-bar">
        <div>
          <p className="eyebrow">Primary only</p>
          <h1 className="brand">
            {mode === "level-select"
              ? "레벨 선택"
              : mode === "primary"
                ? selectedLevel?.title
                : mode === "english"
                  ? "영어 시퀀스 게임"
                  : "아쉬탕가 시퀀스 게임"}
          </h1>
        </div>
        {mode !== "home" ? (
          <button className="button ghost small-button" type="button" onClick={goHome}>
            홈
          </button>
        ) : null}
      </div>

      {mode === "home" ? (
        <section className="screen">
          <div>
            <p className="eyebrow">로그인 없이 바로 시작</p>
            <h2 className="brand">아쉬탕가 시퀀스 게임</h2>
            <p className="small-copy">프라이머리 순서와 산스크리트 이름을 짧게 반복해요.</p>
          </div>
          <div className="stack">
            <button className="button primary" type="button" onClick={() => setMode("level-select")}>
              프라이머리 시퀀스 게임
            </button>
            <button className="button secondary" type="button" onClick={startEnglish}>
              영어 시퀀스 게임
            </button>
          </div>
          <div className="home-logo-wrap">
            <img className="home-logo" src="/logo.png" alt="Ashtanga sequence game logo" />
          </div>
        </section>
      ) : null}

      {mode === "level-select" ? (
        <section className="stack level-list">
          {primaryLevels.map((level) => (
            <button className="button level-button" key={level.id} type="button" onClick={() => startPrimary(level)}>
              <span className="level-title">{level.title}</span>
            </button>
          ))}
        </section>
      ) : null}

      {mode === "primary" && selectedLevel && nextAsana ? (
        <GameBoard
          choices={choices}
          combo={combo}
          currentLabel="CURRENT ASANA"
          currentPrompt={currentAsana}
          lives={lives}
          onChoice={handlePrimaryChoice}
          score={score}
          timeLeft={timeLeft}
          title={selectedLevel.title}
        />
      ) : null}

      {mode === "english" && englishRound ? (
        <GameBoard
          choices={choices}
          combo={combo}
          currentLabel="SANSKRIT"
          currentPrompt={englishRound.prompt}
          lives={lives}
          onChoice={handleEnglishChoice}
          score={score}
          timeLeft={timeLeft}
          title="한글 음역을 고르세요"
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
  lives,
  onChoice,
  score,
  timeLeft,
  title,
}: {
  choices: string[];
  combo: number;
  currentLabel: string;
  currentPrompt: string;
  lives: number;
  onChoice: (choice: string) => void;
  score: number;
  timeLeft: number;
  title: string;
}) {
  return (
    <section className="game-card">
      <div className="game-header">
        <div>
          <p className="eyebrow">Primary Series</p>
          <h2>{title}</h2>
        </div>
      </div>

      <div className="stats">
        <div className="stat">
          <span>점수</span>
          <strong>{score}</strong>
        </div>
        <div className="stat">
          <span>콤보</span>
          <strong>{combo}</strong>
        </div>
        <div className="stat">
          <span>라이프</span>
          <strong>{lives}</strong>
        </div>
        <div className="stat">
          <span>시간</span>
          <strong>{timeLeft}</strong>
        </div>
      </div>

      <div className="current-panel">
        <p>{currentLabel}</p>
        <h3>{currentPrompt}</h3>
        <div className="life-dots" aria-label={`남은 라이프 ${lives}`}>
          {Array.from({ length: lives }).map((_, index) => (
            <span key={index} />
          ))}
        </div>
      </div>

      <div className="next-row">
        <p>NEXT ASANA?</p>
      </div>

      <div className="choice-grid">
        {choices.map((choice) => (
          <button className="button option" key={choice} type="button" onClick={() => onChoice(choice)}>
            {choice}
          </button>
        ))}
      </div>
    </section>
  );
}
