"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface GameRow {
  id: string;
  pin: string;
  status: string;
  course_title: string;
  player_count: number;
  question_count: number;
  created_at: string;
}

const STATUS_LABELS: Record<string, string> = {
  lobby: "Lobby",
  question: "Live",
  reveal: "Live",
  leaderboard: "Live",
  ended: "Finished",
};

export default function AdminGamesPage() {
  const [games, setGames] = useState<GameRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/games")
      .then((r) => r.json())
      .then((data) => {
        setGames(data.games || []);
        setLoaded(true);
      });
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <div className="flex items-center justify-between mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-semibold text-zinc-900">Game history</h1>
        <Link
          href="/play"
          className="px-3 py-1.5 sm:py-2 text-xs sm:text-sm bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors"
        >
          Host a game
        </Link>
      </div>

      {loaded && games.length === 0 && (
        <div className="text-center py-16 border border-dashed border-zinc-300 rounded-xl">
          <p className="text-zinc-500 mb-4">No games hosted yet</p>
          <Link
            href="/play"
            className="inline-block px-4 py-2 text-sm bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            Host your first game
          </Link>
        </div>
      )}

      <div className="space-y-3">
        {games.map((g) => (
          <Link
            key={g.id}
            href={`/admin/games/${g.id}`}
            className="block p-4 sm:p-5 bg-white border border-zinc-200 rounded-xl hover:border-zinc-400 transition-colors"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-medium text-zinc-900 text-sm sm:text-base truncate">
                  {g.course_title}
                </h2>
                <span className="text-xs text-zinc-400 mt-1 block">
                  PIN {g.pin} · {g.player_count} player{g.player_count !== 1 ? "s" : ""} ·{" "}
                  {g.question_count} question{g.question_count !== 1 ? "s" : ""} ·{" "}
                  {new Date(g.created_at).toLocaleString()}
                </span>
              </div>
              <span
                className={`shrink-0 text-xs px-2 py-1 rounded-full ${
                  g.status === "ended"
                    ? "bg-zinc-100 text-zinc-500"
                    : "bg-green-100 text-green-700"
                }`}
              >
                {STATUS_LABELS[g.status] ?? g.status}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
