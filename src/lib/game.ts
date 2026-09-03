import type { Game, GamePlayer, GameQuestion } from "./types";

export const KAHOOT_COLORS = ["#e21b3c", "#1368ce", "#d89e00", "#26890c"] as const;
export const KAHOOT_SHAPES = ["triangle", "diamond", "circle", "square"] as const;

export function parseGameQuestions(game: Game): GameQuestion[] {
  try {
    const parsed = JSON.parse(String(game.questions || "[]"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function generatePin(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * Kahoot-style speed scoring: correct answers earn between 500 (answered
 * just before the deadline) and 1000 (answered instantly), plus a streak
 * bonus of 100 per consecutive correct answer capped at 500.
 */
export function computePoints(elapsedMs: number, limitSeconds: number, streak: number): number {
  const limitMs = Math.max(1, limitSeconds * 1000);
  const ratio = Math.min(1, Math.max(0, elapsedMs / limitMs));
  const speedPoints = Math.round(500 + 500 * (1 - ratio));
  const streakBonus = Math.min(500, Math.max(0, streak - 1) * 100);
  return speedPoints + streakBonus;
}

export function questionExpired(game: Game, now = Date.now()): boolean {
  if (game.status !== "question" || !game.question_started_at) return false;
  const started = new Date(game.question_started_at).getTime();
  return now >= started + game.question_time_limit * 1000;
}

export interface LeaderRow {
  nickname: string;
  score: number;
  rank: number;
  streak?: number;
}

export function buildLeaderboard(players: GamePlayer[]): LeaderRow[] {
  const sorted = [...players].sort(
    (a, b) => b.score - a.score || a.nickname.localeCompare(b.nickname)
  );
  return sorted.map((p, i) => ({
    nickname: p.nickname,
    score: p.score,
    streak: p.streak,
    rank: i + 1,
  }));
}

/** Normalize a nickname the same way on join and on display. */
export function cleanNickname(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const cleaned = raw.replace(/\s+/g, " ").trim().slice(0, 15);
  return cleaned.length >= 1 ? cleaned : null;
}
