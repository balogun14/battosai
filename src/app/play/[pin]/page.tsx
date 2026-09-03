"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useGameState, type GameState } from "@/lib/useGameState";
import { OptionTiles } from "@/components/Kahoot";

function TimerBar({ secondsLeft, timeLimit }: { secondsLeft: number | null; timeLimit: number }) {
  const pct = secondsLeft === null ? 0 : Math.max(0, Math.min(100, (secondsLeft / timeLimit) * 100));
  return (
    <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-[width] duration-100 ease-linear ${
          pct < 25 ? "bg-red-500" : "bg-[#8fbf8f]"
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
              className="flex items-center justify-between px-4 py-2 bg-stage-raised border border-white/10 rounded-lg text-sm text-paper"
            >
              <span className="text-stone-500 w-8 tabular-nums">{r.rank}</span>
              <span className="font-medium flex-1 truncate">{r.nickname}</span>
              <span className="tabular-nums text-stone-300">{r.score}</span>
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
      <span className="font-semibold text-paper truncate max-w-full text-sm sm:text-base">
        {nickname}
      </span>
      <span className="text-xs text-stone-400 tabular-nums">{score}</span>
      <div
        className={`w-full ${heights[place]} bg-paper rounded-t-xl flex items-start justify-center pt-2 shadow-[0_-4px_24px_rgba(0,0,0,0.3)]`}
      >
        <span className="text-ink font-bold tabular-nums">{place}</span>
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
        <p className="text-stone-400 mb-4">{error}</p>
        <Link href="/play" className="text-sm underline text-stone-300">
          Back to host page
        </Link>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="bg-stage min-h-[calc(100dvh-3.5rem)] -mt-px">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-6">
          <div className="h-8 w-48 mx-auto rounded-lg bg-white/5 animate-pulse" />
          <div className="h-40 w-full rounded-2xl bg-white/5 animate-pulse" />
        </div>
      </div>
    );
  }

  const { game } = state;

  return (
    <div className="bg-stage min-h-[calc(100dvh-3.5rem)] -mt-px">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 text-paper">
        {/* header */}
        <div className="flex items-center justify-between mb-8">
          <div className="text-sm text-stone-400">
            Game PIN{" "}
            <span className="font-mono text-lg font-bold text-paper tracking-wider">
              {game.pin}
            </span>
          </div>
          <div className="text-sm text-stone-400 tabular-nums">
            {game.status === "lobby"
              ? `${game.totalPlayers} player${game.totalPlayers === 1 ? "" : "s"}`
              : `Question ${game.index + 1} of ${game.questionCount}`}
          </div>
        </div>

        {game.status === "lobby" && (
          <div className="text-center">
            <p className="text-sm text-stone-400 mb-1.5">Join at</p>
            <p className="text-base sm:text-lg font-mono text-stone-200 mb-8 break-all">
              {joinUrl}
            </p>
            <div className="rounded-2xl border border-white/10 bg-stage-raised py-12 px-6 mb-10 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)]">
              <p className="text-xs uppercase tracking-[0.2em] text-stone-500 mb-3">
                Game PIN
              </p>
              <p className="text-6xl sm:text-8xl font-bold tracking-[0.15em] text-paper font-mono [text-shadow:0_0_40px_rgba(143,191,143,0.25)]">
                {game.pin}
              </p>
            </div>
            {state.players && state.players.length > 0 ? (
              <div className="flex flex-wrap justify-center gap-2 mb-10">
                {state.players.map((p) => (
                  <span
                    key={p.nickname}
                    className="px-3.5 py-1.5 bg-paper text-ink text-sm font-medium rounded-full animate-[pop_.25s_ease-out]"
                  >
                    {p.nickname}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-stone-500 mb-10">Waiting for players to join…</p>
            )}
          </div>
        )}

        {game.status === "question" && state.question && (
          <div className="space-y-6">
            <TimerBar secondsLeft={secondsLeft} timeLimit={game.timeLimit} />
            <div className="flex items-center justify-between gap-6">
              <h2 className="display text-2xl sm:text-3xl text-paper text-balance">
                {state.question.question_text}
              </h2>
              <span className="text-3xl font-bold tabular-nums text-paper w-12 text-right">
                {secondsLeft === null ? "" : Math.ceil(secondsLeft)}
              </span>
            </div>
            <OptionTiles options={state.question.options} />
            <p className="text-center text-sm text-stone-400 tabular-nums">
              {state.answeredCount ?? 0} / {game.totalPlayers} answered
            </p>
          </div>
        )}

        {game.status === "reveal" && state.question && (
          <div className="space-y-6">
            <h2 className="display text-2xl sm:text-3xl text-paper text-balance">
              {state.question.question_text}
            </h2>
            <div className="rounded-xl bg-[#8fbf8f]/15 border border-[#8fbf8f]/30 px-4 py-3 text-sm text-[#c2dcc2]">
              Correct answer:{" "}
              <span className="font-semibold text-paper">
                {state.question.correct_answer}
              </span>
            </div>
            {state.question.explanation && (
              <p className="text-sm text-stone-400 -mt-3">
                {state.question.explanation}
              </p>
            )}
            <OptionTiles options={state.question.options} distribution={state.distribution} />
            {state.leaderboard && state.leaderboard[0] && (
              <p className="text-center text-sm text-stone-400">
                Leader:{" "}
                <span className="font-semibold text-paper">
                  {state.leaderboard[0].nickname}
                </span>{" "}
                with {state.leaderboard[0].score} points
              </p>
            )}
          </div>
        )}

        {game.status === "leaderboard" && state.leaderboard && (
          <div className="max-w-lg mx-auto">
            <h2 className="display text-2xl sm:text-3xl text-paper mb-6 text-center">
              Scoreboard
            </h2>
            <div className="space-y-1.5">
              {state.leaderboard.slice(0, 5).map((r) => (
                <div
                  key={r.nickname}
                  className={`flex items-center justify-between px-4 py-3 rounded-lg text-sm ${
                    r.rank === 1
                      ? "bg-[#8fbf8f] text-ink font-semibold"
                      : "bg-stage-raised border border-white/10 text-paper"
                  }`}
                >
                  <span
                    className={`w-8 tabular-nums ${
                      r.rank === 1 ? "text-ink/60" : "text-stone-500"
                    }`}
                  >
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
            <h2 className="display text-2xl sm:text-4xl text-paper mb-10">
              🏆 Final podium
            </h2>
            {state.leaderboard.length === 0 ? (
              <p className="text-stone-500">No players joined this game.</p>
            ) : (
              <Podium leaderboard={state.leaderboard} />
            )}
            <div className="flex gap-3 mt-10">
              <Link
                href="/play"
                className="px-6 py-2.5 rounded-full bg-paper text-ink text-sm font-medium hover:bg-stone-200 transition-colors"
              >
                Host another game
              </Link>
              <Link
                href={`/admin/games/${game.id}`}
                className="px-6 py-2.5 rounded-full border border-white/20 text-stone-200 text-sm font-medium hover:bg-white/5 transition-colors"
              >
                View results
              </Link>
            </div>
          </div>
        )}

        {/* host control */}
        {nextLabel[game.status] && (
          <div className="fixed bottom-6 left-0 right-0 flex justify-center pointer-events-none z-40">
            <button
              onClick={next}
              disabled={acting}
              className="pointer-events-auto px-9 py-3.5 rounded-full bg-paper text-ink text-sm font-semibold shadow-[0_8px_30px_rgba(0,0,0,0.5)] hover:bg-stone-200 transition-all duration-200 active:scale-95 disabled:opacity-50"
            >
              {nextLabel[game.status]}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
