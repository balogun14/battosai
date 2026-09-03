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
      <div className="max-w-sm mx-auto px-4 py-16 sm:py-24">
        <h1 className="text-2xl font-bold text-center text-zinc-900 mb-8">Join a game</h1>
        <form onSubmit={join} className="space-y-3">
          <input
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="Game PIN"
            inputMode="numeric"
            className="w-full text-center text-2xl tracking-[0.3em] font-mono border border-zinc-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-zinc-900"
          />
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value.slice(0, 15))}
            placeholder="Nickname"
            className="w-full text-center text-lg border border-zinc-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-zinc-900"
          />
          {joinError && <p className="text-sm text-red-600 text-center">{joinError}</p>}
          <button
            type="submit"
            disabled={joining || !pinInput || !nickname.trim()}
            className="w-full py-3.5 rounded-xl bg-zinc-900 text-white text-base font-semibold hover:bg-zinc-700 transition-colors disabled:opacity-40"
          >
            {joining ? "Joining…" : "Enter"}
          </button>
        </form>
      </div>
    );
  }

  if (error && !state) {
    return (
      <div className="max-w-sm mx-auto px-4 py-16 text-center">
        <p className="text-zinc-500 mb-4">{error}</p>
        <button onClick={leave} className="text-sm underline text-zinc-700">
          Back to join screen
        </button>
      </div>
    );
  }

  if (!state) return null;

  const { game, me } = state;
  const feedback =
    game.status === "reveal" && me?.answered ? (me.isCorrect ? "correct" : "wrong") : null;

  // --- In-game screens ---
  return (
    <div className="max-w-md mx-auto px-4 py-8 min-h-[80vh] flex flex-col">
      <div className="flex items-center justify-between text-xs text-zinc-400 mb-4">
        <span className="font-mono">PIN {game.pin}</span>
        <button onClick={leave} className="underline hover:text-zinc-600">
          Leave
        </button>
      </div>

      {game.status === "lobby" && (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 rounded-full bg-zinc-900 text-white flex items-center justify-center text-xl font-bold mb-4">
            {me?.nickname.charAt(0).toUpperCase()}
          </div>
          <p className="font-semibold text-zinc-900 text-lg">{me?.nickname}</p>
          <p className="text-zinc-500 mt-1">
            {state.game.totalPlayers > 1
              ? `${state.game.totalPlayers} players are in. `
              : ""}
            Waiting for the host to start…
          </p>
        </div>
      )}

      {game.status === "question" && (
        <div className="flex-1 flex flex-col">
          <div className="w-full h-2 bg-zinc-200 rounded-full overflow-hidden mb-6">
            <div
              className="h-full bg-zinc-900 rounded-full transition-[width] duration-100 ease-linear"
              style={{
                width: `${secondsLeft === null ? 0 : Math.max(0, Math.min(100, (secondsLeft / game.timeLimit) * 100))}%`,
              }}
            />
          </div>
          {me?.answered ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-3xl mb-4">
                ✓
              </div>
              <p className="font-semibold text-zinc-900">Answer locked in!</p>
              <p className="text-zinc-500 text-sm mt-1">Wait for the results…</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center">
              <ShapeButtons options={state.question?.options ?? []} onSelect={answer} />
            </div>
          )}
        </div>
      )}

      {game.status === "reveal" && (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
          {me?.answered ? (
            <>
              <div
                className={`w-20 h-20 rounded-full flex items-center justify-center text-4xl ${
                  feedback === "correct" ? "bg-green-100" : "bg-red-100"
                }`}
              >
                {feedback === "correct" ? "✓" : "✗"}
              </div>
              <p
                className={`text-xl font-bold ${
                  feedback === "correct" ? "text-green-700" : "text-red-600"
                }`}
              >
                {feedback === "correct" ? `Correct! +${me?.points ?? 0}` : "Wrong!"}
              </p>
            </>
          ) : (
            <p className="text-zinc-500">You didn&apos;t answer this one.</p>
          )}
          <p className="text-sm text-zinc-500">
            Score: <span className="font-semibold text-zinc-900 tabular-nums">{me?.score ?? 0}</span>
            {me?.rank != null && (
              <>
                {" · "}Rank <span className="font-semibold text-zinc-900">#{me.rank}</span>
              </>
            )}
          </p>
        </div>
      )}

      {game.status === "leaderboard" && (
        <div className="flex-1 flex flex-col items-center justify-center">
          <p className="text-sm text-zinc-400 mb-1">Your rank</p>
          <p className="text-6xl font-bold text-zinc-900 mb-2">#{me?.rank ?? "—"}</p>
          <p className="text-zinc-500 mb-8">
            <span className="font-semibold text-zinc-900 tabular-nums">{me?.score ?? 0}</span> points
          </p>
          <div className="w-full space-y-1">
            {(state.leaderboard ?? []).slice(0, 5).map((r) => (
              <div
                key={r.nickname}
                className={`flex items-center justify-between px-4 py-2 rounded-lg text-sm ${
                  r.nickname === me?.nickname
                    ? "bg-zinc-900 text-white"
                    : "bg-white border border-zinc-200"
                }`}
              >
                <span className={`w-6 ${r.nickname === me?.nickname ? "text-zinc-300" : "text-zinc-400"}`}>
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
          <p className="text-4xl mb-3">
            {(me?.rank ?? 99) === 1 ? "🏆" : (me?.rank ?? 99) <= 3 ? "🎉" : "👏"}
          </p>
          <p className="text-5xl font-bold text-zinc-900 mb-1">#{me?.rank ?? "—"}</p>
          <p className="text-zinc-500 mb-1">out of {game.totalPlayers} players</p>
          <p className="text-zinc-500 mb-8">
            <span className="font-semibold text-zinc-900 tabular-nums">{me?.score ?? 0}</span> points
          </p>
          <button
            onClick={leave}
            className="px-6 py-2.5 rounded-full bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 transition-colors"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}
