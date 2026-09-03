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
        <p className="text-zinc-500 mb-4">{error}</p>
        <Link href="/admin/games" className="text-sm underline text-zinc-700">
          Back to game history
        </Link>
      </div>
    );
  }

  if (!results) return null;

  const totalPlayers = results.players.length;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-xl sm:text-2xl font-semibold text-zinc-900">Game results</h1>
        <Link
          href="/admin/games"
          className="text-xs sm:text-sm text-zinc-500 hover:text-zinc-800"
        >
          ← History
        </Link>
      </div>
      <p className="text-sm text-zinc-500 mb-8">
        PIN {results.game.pin} · {totalPlayers} player{totalPlayers !== 1 ? "s" : ""} ·{" "}
        {new Date(results.game.created_at).toLocaleString()}
      </p>

      {totalPlayers === 0 ? (
        <p className="text-zinc-400 mb-8">Nobody joined this game.</p>
      ) : (
        <section className="mb-10">
          <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide mb-3">
            Leaderboard
          </h2>
          <div className="space-y-1">
            {results.players.map((p) => (
              <div
                key={p.nickname}
                className={`flex items-center justify-between px-4 py-2.5 rounded-lg text-sm ${
                  p.rank === 1 ? "bg-zinc-900 text-white" : "bg-white border border-zinc-200"
                }`}
              >
                <span className={`w-8 ${p.rank === 1 ? "text-zinc-300" : "text-zinc-400"}`}>
                  {p.rank}
                </span>
                <span className="font-medium flex-1 truncate">{p.nickname}</span>
                {p.streak > 1 && <span className="text-orange-400 text-xs mr-2">🔥{p.streak}</span>}
                <span className="tabular-nums">{p.score}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide mb-3">
          Question breakdown
        </h2>
        <div className="space-y-4">
          {results.questions.map((q, i) => (
            <div key={i} className="bg-white border border-zinc-200 rounded-xl p-4">
              <div className="flex items-start justify-between gap-4 mb-2">
                <h3 className="font-medium text-zinc-900 text-sm">
                  {i + 1}. {q.question_text}
                </h3>
                <span className="text-xs text-zinc-400 shrink-0">
                  {q.correctCount}/{q.answered || 0} correct
                </span>
              </div>
              <div className="space-y-1">
                {q.options.map((opt) => {
                  const n = q.distribution[opt] ?? 0;
                  const pct = q.answered ? Math.round((n / q.answered) * 100) : 0;
                  const isCorrect = opt === q.correct_answer;
                  return (
                    <div key={opt} className="flex items-center gap-2 text-xs">
                      <span
                        className={`w-40 sm:w-56 truncate ${
                          isCorrect ? "text-green-700 font-medium" : "text-zinc-600"
                        }`}
                      >
                        {isCorrect ? "✓ " : ""}
                        {opt}
                      </span>
                      <div className="flex-1 h-2 bg-zinc-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${isCorrect ? "bg-green-500" : "bg-zinc-300"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-8 text-right tabular-nums text-zinc-500">{n}</span>
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
