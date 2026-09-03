import { NextRequest, NextResponse } from "next/server";
import { query, initDB } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { parseGameQuestions } from "@/lib/game";
import { Game } from "@/lib/types";

/** Host/admin view of a finished (or running) game: leaderboard + per-question stats. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await initDB();
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const games = await query<Game>("SELECT * FROM games WHERE id = $1", [id]);
  const game = games[0];
  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  if (game.created_by !== session.userId && session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const questions = parseGameQuestions(game);
  const players = await query<{ nickname: string; score: number; streak: number }>(
    "SELECT nickname, score, streak FROM game_players WHERE game_id = $1 ORDER BY score DESC",
    [game.id]
  );

  const perQuestion = await query<{
    question_id: string;
    answers: number;
    correct: number;
  }>(
    `SELECT question_id, COUNT(*)::int AS answers, COUNT(*) FILTER (WHERE is_correct)::int AS correct
     FROM game_answers WHERE game_id = $1 GROUP BY question_id`,
    [game.id]
  );
  const statsById = Object.fromEntries(
    perQuestion.map((r) => [r.question_id, { answers: r.answers, correct: r.correct }])
  );

  const distribution = await query<{ question_id: string; answer: string; n: number }>(
    "SELECT question_id, answer, COUNT(*)::int AS n FROM game_answers WHERE game_id = $1 GROUP BY question_id, answer",
    [game.id]
  );

  return NextResponse.json({
    game: {
      id: game.id,
      pin: game.pin,
      status: game.status,
      created_at: game.created_at,
      timeLimit: game.question_time_limit,
    },
    players: players.map((p, i) => ({ ...p, rank: i + 1 })),
    questions: questions.map((q) => ({
      question_text: q.question_text,
      options: q.options,
      correct_answer: q.correct_answer,
      answered: statsById[q.id]?.answers ?? 0,
      correctCount: statsById[q.id]?.correct ?? 0,
      distribution: Object.fromEntries(
        distribution.filter((d) => d.question_id === q.id).map((d) => [d.answer, d.n])
      ),
    })),
  });
}
