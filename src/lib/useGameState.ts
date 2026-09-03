"use client";

import { useEffect, useRef, useState } from "react";

export interface GameState {
  serverNow: string;
  game: {
    id: string;
    pin: string;
    status: "lobby" | "question" | "reveal" | "leaderboard" | "ended";
    index: number;
    questionCount: number;
    timeLimit: number;
    startedAt: string | null;
    totalPlayers: number;
  };
  players?: { nickname: string; score: number }[];
  question?: {
    id: string;
    question_text: string;
    options: string[];
    correct_answer?: string;
    explanation?: string;
  };
  answeredCount?: number;
  distribution?: Record<string, number>;
  leaderboard?: { nickname: string; score: number; rank: number; streak?: number }[];
  me?: {
    nickname: string;
    score: number;
    rank?: number | null;
    answered: boolean;
    answer?: string | null;
    isCorrect?: boolean | null;
    points?: number;
  };
}

/**
 * Polls the public game-state endpoint. `playerId` personalizes the
 * payload for the joining player. Returns a smoothly ticking countdown
 * for the active question, synced to server time via the clock offset
 * measured on every poll.
 */
export function useGameState(id: string | null, playerId?: string | null, intervalMs = 1500) {
  const [state, setState] = useState<GameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const offsetRef = useRef(0);

  const { startedAt, status, timeLimit } = state?.game ?? {};

  // Poll state; inside the poll callback also (re)compute the deadline so
  // countdowns stay in sync with the server clock.
  useEffect(() => {
    if (!id) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      try {
        const qs = playerId ? `?player=${encodeURIComponent(playerId)}` : "";
        const res = await fetch(`/api/games/${id}${qs}`, { cache: "no-store" });
        const data = await res.json();
        if (!active) return;
        if (!res.ok) {
          setError(data.error || "Failed to load game");
        } else {
          setError(null);
          offsetRef.current = Date.parse(data.serverNow) - Date.now();
          setState(data);
          if (data.game.status === "question" && data.game.startedAt) {
            const deadline =
              Date.parse(data.game.startedAt) + data.game.timeLimit * 1000 - offsetRef.current;
            setSecondsLeft(Math.max(0, (deadline - Date.now()) / 1000));
          }
        }
      } catch {
        if (active) setError("Connection lost — retrying…");
      }
      if (active) timer = setTimeout(poll, intervalMs);
    };

    poll();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [id, playerId, intervalMs]);

  // Local 200ms ticker between polls so the countdown moves smoothly.
  useEffect(() => {
    if (status !== "question" || !startedAt || !timeLimit) return;
    const deadline = Date.parse(startedAt) + timeLimit * 1000 - offsetRef.current;
    const timer = setInterval(() => {
      setSecondsLeft(Math.max(0, (deadline - Date.now()) / 1000));
    }, 200);
    return () => clearInterval(timer);
  }, [startedAt, status, timeLimit]);

  return { state, error, secondsLeft: status === "question" ? secondsLeft : null };
}
