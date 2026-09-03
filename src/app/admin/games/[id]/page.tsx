"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Results {
  game: { id: string; pin: string; status: string; created_at: string; timeLimit: number };
  players: { nickname: string; score: number; streak: number; rank: number }[];
  questions: {
    question_text: string;
    options: string[];
    correct_answer: string;
    answered: number;
    correctCount: number;
    distribution: Record<string, number>;
  }[];
}

export default function GameResultsPage() {
  const { id } = useParams<{ id: string }>();
  const [results, setResults] = useState<Results | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/games/${id}/results`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) setError(data.error || "Failed to load results");
        else setResults(data);
      })
      .catch(() => setError("Failed to load results"));
  }, [id]);

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-ink-soft mb-4">{error}</p>
        <Link href="/admin/games" className="text-sm underline text-accent">
          Back to game history
        </Link>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-4">
        <div className="skeleton h-8 w-1/3" />
        <div className="skeleton h-16 w-full" />
        <div className="skeleton h-24 w-full" />
      </div>
    );
  }

  const totalPlayers = results.players.length;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      <div className="flex items-center justify-between mb-2">
        <p className="eyebrow">Results</p>
        <Link href="/admin/games" className="text-xs sm:text-sm text-ink-faint hover:text-ink transition-colors">
          ← History
        </Link>
      </div>
      <h1 className="display text-3xl sm:text-4xl text-ink mb-2">Game results</h1>
      <p className="text-sm text-ink-faint mb-9 tabular-nums">
        PIN {results.game.pin} · {totalPlayers} player{totalPlayers !== 1 ? "s" : ""} ·{" "}
        {new Date(results.game.created_at).toLocaleString()}
      </p>

      {totalPlayers === 0 ? (
        <p className="text-ink-faint mb-8">Nobody joined this game.</p>
      ) : (
        <section className="mb-12">
          <h2 className="eyebrow mb-4">Leaderboard</h2>
          <div className="space-y-1.5">
            {results.players.map((p) => (
              <div
                key={p.nickname}
                className={`card flex items-center justify-between px-4 py-3 text-sm ${
                  p.rank === 1 ? "!border-accent/40 bg-accent-soft/50" : ""
                }`}
              >
                <span className="w-8 text-ink-faint tabular-nums">{p.rank}</span>
                <span className="font-medium flex-1 truncate text-ink">{p.nickname}</span>
                {p.streak > 1 && (
                  <span className="text-orange-500 text-xs mr-3">🔥{p.streak}</span>
                )}
                <span className="tabular-nums text-ink">{p.score}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="eyebrow mb-4">Question breakdown</h2>
        <div className="space-y-4">
          {results.questions.map((q, i) => (
            <div key={i} className="card p-5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <h3 className="font-medium text-ink text-sm text-balance">
                  {i + 1}. {q.question_text}
                </h3>
                <span className="text-xs text-ink-faint shrink-0 tabular-nums">
                  {q.correctCount}/{q.answered || 0} correct
                </span>
              </div>
              <div className="space-y-1.5">
                {q.options.map((opt) => {
                  const n = q.distribution[opt] ?? 0;
                  const pct = q.answered ? Math.round((n / q.answered) * 100) : 0;
                  const isCorrect = opt === q.correct_answer;
                  return (
                    <div key={opt} className="flex items-center gap-3 text-xs">
                      <span
                        className={`w-40 sm:w-56 truncate ${
                          isCorrect ? "text-accent-deep font-medium" : "text-ink-soft"
                        }`}
                      >
                        {isCorrect ? "✓ " : ""}
                        {opt}
                      </span>
                      <div className="flex-1 h-2 bg-line/50 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isCorrect ? "bg-accent" : "bg-line-strong"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-8 text-right tabular-nums text-ink-faint">{n}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
