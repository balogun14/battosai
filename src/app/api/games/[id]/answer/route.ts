import { NextRequest, NextResponse } from "next/server";
import { query, initDB } from "@/lib/db";
import { computePoints, parseGameQuestions } from "@/lib/game";
import { Game, GamePlayer } from "@/lib/types";

/**
 * Public: answers are identified by the playerId issued at join time.
 * Scoring follows Kahoot: speed-based points for correct answers plus a
 * streak bonus; wrong or late answers score zero.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await initDB();
  const { id } = await params;

  let body: { playerId?: string; answer?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { playerId, answer } = body;
  if (!playerId || typeof playerId !== "string" || playerId.length > 100) {
    return NextResponse.json({ error: "playerId is required" }, { status: 400 });
  }
  if (!answer || typeof answer !== "string" || answer.length > 500) {
    return NextResponse.json({ error: "answer is required" }, { status: 400 });
  }

  const games = await query<Game>("SELECT * FROM games WHERE pin = $1 OR id = $1", [id]);
  const game = games[0];
  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  if (game.status !== "question") {
    return NextResponse.json({ error: "Not accepting answers right now" }, { status: 409 });
  }

  const startedAt = game.question_started_at
    ? new Date(game.question_started_at).getTime()
    : 0;
  const elapsedMs = Date.now() - startedAt;
  // 1s of grace for network latency past the timer.
  if (elapsedMs > game.question_time_limit * 1000 + 1000) {
    return NextResponse.json({ error: "Time is up" }, { status: 409 });
  }

  const players = await query<GamePlayer>(
    "SELECT * FROM game_players WHERE id = $1 AND game_id = $2",
    [playerId, game.id]
  );
  const player = players[0];
  if (!player) {
    return NextResponse.json({ error: "You are not in this game" }, { status: 403 });
  }

  const questions = parseGameQuestions(game);
  const current = questions[game.current_index];
  if (!current) {
    return NextResponse.json({ error: "No active question" }, { status: 409 });
  }

  const isCorrect = answer === current.correct_answer;
  const points = isCorrect
    ? computePoints(Math.max(0, elapsedMs), game.question_time_limit, player.streak + 1)
    : 0;

  const inserted = await query<{ id: string }>(
    `INSERT INTO game_answers (id, game_id, player_id, question_id, answer, is_correct, points, time_ms)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (player_id, question_id) DO NOTHING
     RETURNING id`,
    [
      crypto.randomUUID(),
      game.id,
      player.id,
      current.id,
      answer,
      isCorrect,
      points,
      Math.max(0, Math.round(elapsedMs)),
    ]
  );

  if (inserted.length === 0) {
    return NextResponse.json({ error: "You already answered this question" }, { status: 409 });
  }

  const updated = await query<GamePlayer>(
    `UPDATE game_players
     SET score = score + $1, streak = $2
     WHERE id = $3 RETURNING *`,
    [points, isCorrect ? player.streak + 1 : 0, player.id]
  );

  return NextResponse.json({
    correct: isCorrect,
    points,
    score: updated[0]?.score ?? player.score + points,
  });
}
