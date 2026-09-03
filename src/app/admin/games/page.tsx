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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      <p className="eyebrow mb-2">Live game</p>
      <div className="flex items-end justify-between gap-4 flex-wrap mb-8 sm:mb-10">
        <h1 className="display text-3xl sm:text-4xl text-ink">Game history</h1>
        <Link href="/play" className="btn-primary">
          Host a game
        </Link>
      </div>

      {!loaded ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="card p-5 space-y-3">
              <div className="skeleton h-5 w-1/3" />
              <div className="skeleton h-3.5 w-1/2" />
            </div>
          ))}
        </div>
      ) : games.length === 0 ? (
        <div className="card p-10 text-center">
          <h2 className="display text-xl text-ink mb-2">No games hosted yet</h2>
          <p className="text-sm text-ink-soft mb-6 max-w-sm mx-auto">
            Start a live game from any course and its results will collect here.
          </p>
          <Link href="/play" className="btn-primary">
            Host your first game
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {games.map((g) => (
            <Link
              key={g.id}
              href={`/admin/games/${g.id}`}
              className="card card-hover block p-4 sm:p-5 group"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-medium text-ink text-sm sm:text-base truncate group-hover:text-accent-deep transition-colors">
                    {g.course_title}
                  </h2>
                  <span className="text-xs text-ink-faint mt-1 block tabular-nums">
                    PIN {g.pin} · {g.player_count} player
                    {g.player_count !== 1 ? "s" : ""} · {g.question_count} question
                    {g.question_count !== 1 ? "s" : ""} ·{" "}
                    {new Date(g.created_at).toLocaleString()}
                  </span>
                </div>
                <span
                  className={`shrink-0 text-xs px-2.5 py-1 rounded-full ${
                    g.status === "ended"
                      ? "bg-line/60 text-ink-faint"
                      : "bg-accent-soft text-accent-deep"
                  }`}
                >
                  {STATUS_LABELS[g.status] ?? g.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
