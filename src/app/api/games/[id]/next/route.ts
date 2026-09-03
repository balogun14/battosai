import { NextRequest, NextResponse } from "next/server";
import { query, initDB } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { Game } from "@/lib/types";

/**
 * Host-only: drives the game forward (lobby -> question -> reveal ->
 * leaderboard -> next question / ended). No server timers — the game
 * advances when the host clicks, exactly like hosting a Kahoot.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await initDB();
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const games = await query<Game>("SELECT * FROM games WHERE pin = $1 OR id = $1", [id]);
  const game = games[0];
  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  if (game.created_by !== session.userId && session.role !== "admin") {
    return NextResponse.json({ error: "Only the host can control the game" }, { status: 403 });
  }

  const questionCount = JSON.parse(String(game.questions || "[]")).length as number;
  const isLast = game.current_index + 1 >= questionCount;

  let nextStatus = game.status;
  let nextIndex = game.current_index;
  let startedAt: Date | null = game.question_started_at
    ? new Date(game.question_started_at)
    : null;

  switch (game.status) {
    case "lobby":
      nextStatus = "question";
      nextIndex = 0;
      startedAt = new Date();
      break;
    case "question": // host can skip the timer and reveal early
      nextStatus = "reveal";
      break;
    case "reveal":
      nextStatus = "leaderboard";
      break;
    case "leaderboard":
      if (isLast) {
        nextStatus = "ended";
      } else {
        nextStatus = "question";
        nextIndex = game.current_index + 1;
        startedAt = new Date();
      }
      break;
    default:
      return NextResponse.json({ error: "Game has ended" }, { status: 409 });
  }

  await query("UPDATE games SET status = $1, current_index = $2, question_started_at = $3 WHERE id = $4", [
    nextStatus,
    nextIndex,
    startedAt,
    game.id,
  ]);

  return NextResponse.json({ status: nextStatus, index: nextIndex });
}
