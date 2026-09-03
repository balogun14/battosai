"use client";

import { useEffect, useRef, useState } from "react";
import { useGameState } from "@/lib/useGameState";
import { ShapeButtons } from "@/components/Kahoot";

const STORAGE_KEY = "study-pack-player";

interface StoredPlayer {
  playerId: string;
  nickname: string;
  pin: string;
}

export default function JoinPage() {
  const [stored, setStored] = useState<StoredPlayer | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [nickname, setNickname] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const answeredRef = useRef<string | null>(null);

  // Restore an in-progress game from this tab (per-tab so several tabs can
  // join as different players). sessionStorage isn't available at SSR, so
  // this has to happen after mount.
  useEffect(() => {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.playerId && parsed?.pin) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setStored(parsed);
      } else {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const gameId = stored?.pin ?? null;
  const { state, error, secondsLeft } = useGameState(gameId, stored?.playerId ?? null, 1500);

  const join = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError(null);
    const pin = pinInput.replace(/\D/g, "");
    if (pin.length !== 6) {
      setJoinError("Game PIN is 6 digits");
      return;
    }
    setJoining(true);
    try {
      const res = await fetch(`/api/games/${pin}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname }),
      });
      const data = await res.json();
      if (!res.ok) {
        setJoinError(data.error || "Could not join");
        return;
      }
      const player: StoredPlayer = { playerId: data.playerId, nickname: data.nickname, pin };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(player));
      setStored(player);
    } finally {
      setJoining(false);
    }
  };

  const answer = async (option: string) => {
    const questionId = state?.question?.id;
    if (!stored || !questionId || answeredRef.current === questionId) return;
    answeredRef.current = questionId; // instant lockout; new question id re-arms
    try {
      const res = await fetch(`/api/games/${stored.pin}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: stored.playerId, answer: option }),
      });
      if (!res.ok) {
        answeredRef.current = null; // allow retry on transient failure
      }
    } catch {
      answeredRef.current = null;
    }
  };

  const leave = () => {
    sessionStorage.removeItem(STORAGE_KEY);
    setStored(null);
    setPinInput("");
  };

  // --- Join form ---
  if (!stored) {
    return (
      <div className="bg-stage min-h-[100dvh] -mt-px">
        <div className="max-w-sm mx-auto px-4 py-20 sm:py-28">
          <div className="text-center mb-10">
            <span className="display text-2xl text-paper">Study Pack</span>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#8fbf8f] ml-1.5 mb-1" aria-hidden />
            <h1 className="text-sm text-stone-400 mt-2">Live game</h1>
          </div>
          <form onSubmit={join} className="space-y-3.5">
            <input
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="Game PIN"
              inputMode="numeric"
              autoFocus
              className="w-full text-center text-2xl tracking-[0.3em] font-mono border border-white/15 rounded-xl px-4 py-4 bg-stage-raised text-paper placeholder:text-stone-600 focus:outline-none focus:border-[#8fbf8f]/60 focus:shadow-[0_0_0_3px_rgba(143,191,143,0.15)] transition-shadow"
            />
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value.slice(0, 15))}
              placeholder="Nickname"
              className="w-full text-center text-lg border border-white/15 rounded-xl px-4 py-3.5 bg-stage-raised text-paper placeholder:text-stone-600 focus:outline-none focus:border-[#8fbf8f]/60 focus:shadow-[0_0_0_3px_rgba(143,191,143,0.15)] transition-shadow"
            />
            {joinError && (
              <p className="text-sm text-red-400 bg-red-950/50 border border-red-900 rounded-lg px-3 py-2.5 text-center">
                {joinError}
              </p>
            )}
            <button
              type="submit"
              disabled={joining || !pinInput || !nickname.trim()}
              className="w-full py-4 rounded-xl bg-paper text-ink text-base font-semibold hover:bg-stone-200 transition-all duration-200 active:scale-[0.98] disabled:opacity-40"
            >
              {joining ? "Joining…" : "Enter"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (error && !state) {
    return (
      <div className="bg-stage min-h-[100dvh] -mt-px flex items-center justify-center px-4 text-center">
        <div>
          <p className="text-stone-400 mb-4">{error}</p>
          <button onClick={leave} className="text-sm underline text-stone-300">
            Back to join screen
          </button>
        </div>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="bg-stage min-h-[100dvh] -mt-px flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-[#8fbf8f] animate-spin" aria-label="Loading" />
      </div>
    );
  }

  const { game, me } = state;
  const feedback =
    game.status === "reveal" && me?.answered ? (me.isCorrect ? "correct" : "wrong") : null;

  // --- In-game screens ---
  return (
    <div className="bg-stage min-h-dvh -mt-px">
      <div className="max-w-md mx-auto px-4 py-8 min-h-dvh flex flex-col text-paper">
        <div className="flex items-center justify-between text-xs text-stone-500 mb-4">
          <span className="font-mono">PIN {game.pin}</span>
          <button onClick={leave} className="underline hover:text-stone-300 transition-colors">
            Leave
          </button>
        </div>

        {game.status === "lobby" && (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-paper text-ink flex items-center justify-center text-2xl font-bold mb-4">
              {me?.nickname.charAt(0).toUpperCase()}
            </div>
            <p className="font-semibold text-paper text-lg">{me?.nickname}</p>
            <p className="text-stone-400 mt-2 max-w-[240px]">
              {state.game.totalPlayers > 1
                ? `${state.game.totalPlayers} players are in. `
                : ""}
              Waiting for the host to start…
            </p>
          </div>
        )}

        {game.status === "question" && (
          <div className="flex-1 flex flex-col">
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mb-8">
              <div
                className="h-full bg-[#8fbf8f] rounded-full transition-[width] duration-100 ease-linear"
                style={{
                  width: `${secondsLeft === null ? 0 : Math.max(0, Math.min(100, (secondsLeft / game.timeLimit) * 100))}%`,
                }}
              />
            </div>
            {me?.answered ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 rounded-full bg-[#8fbf8f]/15 border border-[#8fbf8f]/40 flex items-center justify-center text-3xl text-[#c2dcc2] mb-5">
                  ✓
                </div>
                <p className="font-semibold text-paper text-lg">Answer locked in</p>
                <p className="text-stone-400 text-sm mt-1.5">Wait for the results…</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center">
                <ShapeButtons options={state.question?.options ?? []} onSelect={answer} />
              </div>
            )}
          </div>
        )}

        {game.status === "reveal" && (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-5">
            {me?.answered ? (
              <>
                <div
                  className={`w-24 h-24 rounded-full flex items-center justify-center text-5xl animate-[pop_.3s_ease-out] ${
                    feedback === "correct"
                      ? "bg-[#8fbf8f]/15 border border-[#8fbf8f]/40"
                      : "bg-red-500/10 border border-red-500/30"
                  }`}
                >
                  {feedback === "correct" ? "✓" : "✗"}
                </div>
                <p
                  className={`text-2xl font-bold ${
                    feedback === "correct" ? "text-[#c2dcc2]" : "text-red-400"
                  }`}
                >
                  {feedback === "correct" ? `Correct +${me?.points ?? 0}` : "Wrong"}
                </p>
              </>
            ) : (
              <p className="text-stone-400">You didn&apos;t answer this one.</p>
            )}
            <p className="text-sm text-stone-400">
              Score:{" "}
              <span className="font-semibold text-paper tabular-nums">
                {me?.score ?? 0}
              </span>
              {me?.rank != null && (
                <>
                  {" · "}Rank{" "}
                  <span className="font-semibold text-paper">#{me.rank}</span>
                </>
              )}
            </p>
          </div>
        )}

        {game.status === "leaderboard" && (
          <div className="flex-1 flex flex-col items-center justify-center">
            <p className="eyebrow !text-stone-500 mb-1">Your rank</p>
            <p className="display text-6xl text-paper mb-2 tabular-nums">
              #{me?.rank ?? "—"}
            </p>
            <p className="text-stone-400 mb-10">
              <span className="font-semibold text-paper tabular-nums">
                {me?.score ?? 0}
              </span>{" "}
              points
            </p>
            <div className="w-full space-y-1.5">
              {(state.leaderboard ?? []).slice(0, 5).map((r) => (
                <div
                  key={r.nickname}
                  className={`flex items-center justify-between px-4 py-2.5 rounded-lg text-sm ${
                    r.nickname === me?.nickname
                      ? "bg-paper text-ink font-medium"
                      : "bg-stage-raised border border-white/10 text-paper"
                  }`}
                >
                  <span
                    className={`w-6 tabular-nums ${
                      r.nickname === me?.nickname ? "text-ink/60" : "text-stone-500"
                    }`}
                  >
                    {r.rank}
                  </span>
                  <span className="font-medium flex-1 truncate">{r.nickname}</span>
                  <span className="tabular-nums">{r.score}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {game.status === "ended" && (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <p className="text-5xl mb-4">
              {(me?.rank ?? 99) === 1 ? "🏆" : (me?.rank ?? 99) <= 3 ? "🎉" : "👏"}
            </p>
            <p className="display text-6xl text-paper mb-1 tabular-nums">
              #{me?.rank ?? "—"}
            </p>
            <p className="text-stone-400 mb-1">out of {game.totalPlayers} players</p>
            <p className="text-stone-400 mb-10">
              <span className="font-semibold text-paper tabular-nums">
                {me?.score ?? 0}
              </span>{" "}
              points
            </p>
            <button
              onClick={leave}
              className="px-7 py-3 rounded-full bg-paper text-ink text-sm font-semibold hover:bg-stone-200 transition-all duration-200 active:scale-95"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
