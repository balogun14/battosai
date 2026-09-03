"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useGameState, type GameState } from "@/lib/useGameState";
import { OptionTiles } from "@/components/Kahoot";

function TimerBar({ secondsLeft, timeLimit }: { secondsLeft: number | null; timeLimit: number }) {
  const pct = secondsLeft === null ? 0 : Math.max(0, Math.min(100, (secondsLeft / timeLimit) * 100));
  return (
    <div className="w-full h-3 bg-zinc-200 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-[width] duration-100 ease-linear ${
          pct < 25 ? "bg-red-500" : "bg-zinc-900"
        }`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function Podium({ leaderboard }: { leaderboard: NonNullable<GameState["leaderboard"]> }) {
  const top = leaderboard.slice(0, 3);
  const second = top[1];
  const first = top[0];
  const third = top[2];
  return (
    <div className="w-full max-w-lg">
      <div className="flex items-end justify-center gap-3 sm:gap-4 mb-8">
        {second && (
          <PodiumColumn nickname={second.nickname} score={second.score} place={2} />
        )}
        {first && (
          <PodiumColumn nickname={first.nickname} score={first.score} place={1} />
        )}
        {third && (
          <PodiumColumn nickname={third.nickname} score={third.score} place={3} />
        )}
      </div>
      {leaderboard.length > 3 && (
        <div className="space-y-1">
          {leaderboard.slice(3).map((r) => (
            <div
              key={r.nickname}
              className="flex items-center justify-between px-4 py-2 bg-white border border-zinc-200 rounded-lg text-sm"
            >
              <span className="text-zinc-500 w-8">{r.rank}</span>
              <span className="font-medium text-zinc-900 flex-1 truncate">{r.nickname}</span>
              <span className="tabular-nums text-zinc-600">{r.score}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PodiumColumn({
  nickname,
  score,
  place,
}: {
  nickname: string;
  score: number;
  place: number;
}) {
  const heights = { 1: "h-32", 2: "h-24", 3: "h-16" } as Record<number, string>;
  const medal = { 1: "🥇", 2: "🥈", 3: "🥉" } as Record<number, string>;
  return (
    <div className="flex flex-col items-center gap-2 w-24 sm:w-32">
      <span className="text-2xl">{medal[place]}</span>
      <span className="font-semibold text-zinc-900 truncate max-w-full text-sm sm:text-base">
        {nickname}
      </span>
      <span className="text-xs text-zinc-500 tabular-nums">{score}</span>
      <div
        className={`w-full ${heights[place]} bg-zinc-900 rounded-t-xl flex items-start justify-center pt-2`}
      >
        <span className="text-white font-bold">{place}</span>
      </div>
    </div>
  );
}

export default function HostConsolePage() {
  const { pin } = useParams<{ pin: string }>();
  const { state, error, secondsLeft } = useGameState(pin, null, 1000);
  const [acting, setActing] = useState(false);
  const [joinUrl, setJoinUrl] = useState("");

  useEffect(() => {
    // origin isn't available at SSR; sync it in after mount
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setJoinUrl(`${window.location.origin}/join`);
  }, []);

  const next = async () => {
    if (acting) return;
    setActing(true);
    try {
      await fetch(`/api/games/${pin}/next`, { method: "POST" });
    } finally {
      setActing(false);
    }
  };

  const nextLabel: Record<string, string | null> = {
    lobby: "Start game",
    question: "Skip to results",
    reveal: "Show scoreboard",
    leaderboard: state?.game && state.game.index + 1 < state.game.questionCount
      ? "Next question"
      : "Final podium",
    ended: null,
  };

  if (error && !state) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-zinc-500 mb-4">{error}</p>
        <Link href="/play" className="text-sm underline text-zinc-700">
          Back to host page
        </Link>
      </div>
    );
  }

  if (!state) return null;

  const { game } = state;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* header */}
      <div className="flex items-center justify-between mb-6">
        <div className="text-sm text-zinc-500">
          Game PIN <span className="font-mono text-lg font-bold text-zinc-900">{game.pin}</span>
        </div>
        <div className="text-sm text-zinc-500">
          {game.status === "lobby"
            ? `${game.totalPlayers} player${game.totalPlayers === 1 ? "" : "s"}`
            : `Question ${game.index + 1} of ${game.questionCount}`}
        </div>
      </div>

      {game.status === "lobby" && (
        <div className="text-center">
          <p className="text-sm text-zinc-500 mb-1">Join at</p>
          <p className="text-lg sm:text-xl font-mono text-zinc-800 mb-6 break-all">{joinUrl}</p>
          <div className="bg-white border border-zinc-200 rounded-2xl py-10 px-6 mb-8">
            <p className="text-xs uppercase tracking-widest text-zinc-400 mb-2">Game PIN</p>
            <p className="text-5xl sm:text-7xl font-bold tracking-[0.2em] text-zinc-900 font-mono">
              {game.pin}
            </p>
          </div>
          {state.players && state.players.length > 0 ? (
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              {state.players.map((p) => (
                <span
                  key={p.nickname}
                  className="px-3 py-1.5 bg-zinc-900 text-white text-sm rounded-full animate-[pop_.2s_ease-out]"
                >
                  {p.nickname}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-zinc-400 mb-8">Waiting for players to join…</p>
          )}
        </div>
      )}

      {game.status === "question" && state.question && (
        <div className="space-y-6">
          <TimerBar secondsLeft={secondsLeft} timeLimit={game.timeLimit} />
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-2xl font-semibold text-zinc-900">
              {state.question.question_text}
            </h2>
            <span className="text-2xl font-bold tabular-nums text-zinc-900 w-10 text-right">
              {secondsLeft === null ? "" : Math.ceil(secondsLeft)}
            </span>
          </div>
          <OptionTiles options={state.question.options} />
          <p className="text-center text-sm text-zinc-500">
            {state.answeredCount ?? 0} / {game.totalPlayers} answered
          </p>
        </div>
      )}

      {game.status === "reveal" && state.question && (
        <div className="space-y-6">
          <h2 className="text-lg sm:text-2xl font-semibold text-zinc-900">
            {state.question.question_text}
          </h2>
          <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
            Correct answer:{" "}
            <span className="font-semibold">{state.question.correct_answer}</span>
          </div>
          {state.question.explanation && (
            <p className="text-sm text-zinc-500 -mt-3">{state.question.explanation}</p>
          )}
          <OptionTiles options={state.question.options} distribution={state.distribution} />
          {state.leaderboard && state.leaderboard[0] && (
            <p className="text-center text-sm text-zinc-500">
              Leader: <span className="font-semibold text-zinc-800">{state.leaderboard[0].nickname}</span>{" "}
              with {state.leaderboard[0].score} points
            </p>
          )}
        </div>
      )}

      {game.status === "leaderboard" && state.leaderboard && (
        <div className="max-w-lg mx-auto">
          <h2 className="text-lg sm:text-xl font-semibold text-zinc-900 mb-4 text-center">
            Scoreboard
          </h2>
          <div className="space-y-1">
            {state.leaderboard.slice(0, 5).map((r) => (
              <div
                key={r.nickname}
                className={`flex items-center justify-between px-4 py-2.5 rounded-lg text-sm ${
                  r.rank === 1 ? "bg-zinc-900 text-white" : "bg-white border border-zinc-200"
                }`}
              >
                <span className={`w-8 ${r.rank === 1 ? "text-zinc-300" : "text-zinc-400"}`}>
                  {r.rank}
                </span>
                <span className="font-medium flex-1 truncate">{r.nickname}</span>
                {r.streak && r.streak > 1 && (
                  <span className="text-orange-400 text-xs mr-2">🔥{r.streak}</span>
                )}
                <span className="tabular-nums">{r.score}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {game.status === "ended" && state.leaderboard && (
        <div className="flex flex-col items-center">
          <h2 className="text-xl sm:text-2xl font-semibold text-zinc-900 mb-8">🏆 Final podium</h2>
          {state.leaderboard.length === 0 ? (
            <p className="text-zinc-400">No players joined this game.</p>
          ) : (
            <Podium leaderboard={state.leaderboard} />
          )}
          <div className="flex gap-3 mt-8">
            <Link
              href={`/play`}
              className="px-6 py-2.5 rounded-full bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 transition-colors"
            >
              Host another game
            </Link>
            <Link
              href={`/admin/games/${game.id}`}
              className="px-6 py-2.5 rounded-full border border-zinc-300 text-zinc-700 text-sm font-medium hover:bg-zinc-50 transition-colors"
            >
              View results
            </Link>
          </div>
        </div>
      )}

      {/* host control */}
      {nextLabel[game.status] && (
        <div className="fixed bottom-6 left-0 right-0 flex justify-center pointer-events-none">
          <button
            onClick={next}
            disabled={acting}
            className="pointer-events-auto px-8 py-3 rounded-full bg-zinc-900 text-white text-sm font-medium shadow-lg hover:bg-zinc-700 transition-colors disabled:opacity-50"
          >
            {nextLabel[game.status]}
          </button>
        </div>
      )}
    </div>
  );
}
