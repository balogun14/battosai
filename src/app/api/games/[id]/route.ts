import { NextRequest, NextResponse } from "next/server";
import { query, initDB } from "@/lib/db";
import { buildLeaderboard, parseGameQuestions, questionExpired } from "@/lib/game";
import { Game, GamePlayer } from "@/lib/types";

/**
 * Public game-state endpoint polled by both the host console and players.
 * The host's `next` action and the lazy reveal below are the only things
 * that change state — there are no server timers.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await initDB();
  const { id } = await params;
  const playerId = request.nextUrl.searchParams.get("player");

  const games = await query<Game>("SELECT * FROM games WHERE pin = $1 OR id = $1", [id]);
  const game = games[0];
  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  const questions = parseGameQuestions(game);
  const players = await query<GamePlayer>(
    "SELECT * FROM game_players WHERE game_id = $1 ORDER BY joined_at",
    [game.id]
  );

  let me: GamePlayer | undefined;
  if (playerId) {
    me = players.find((p) => p.id === playerId);
  }

  // Lazy auto-reveal: the first poll after the timer runs out flips the
  // game into reveal, so hosts don't need a server-side scheduler.
  if (questionExpired(game)) {
    await query("UPDATE games SET status = 'reveal' WHERE id = $1 AND status = 'question'", [
      game.id,
    ]);
    game.status = "reveal";
  }

  const payload: Record<string, unknown> = {
    serverNow: new Date().toISOString(),
    game: {
      id: game.id,
      pin: game.pin,
      status: game.status,
      index: game.current_index,
      questionCount: questions.length,
      timeLimit: game.question_time_limit,
      startedAt: game.question_started_at,
      totalPlayers: players.length,
    },
  };

  const current = questions[game.current_index];

  if (game.status === "lobby") {
    payload.players = players.map((p) => ({ nickname: p.nickname, score: p.score }));
  } else if (game.status === "question" && current) {
    payload.question = {
      id: current.id,
      question_text: current.question_text,
      options: current.options,
    };
    const counts = await query<{ n: number }>(
      "SELECT COUNT(*)::int AS n FROM game_answers WHERE game_id = $1 AND question_id = $2",
      [game.id, current.id]
    );
    payload.answeredCount = counts[0]?.n ?? 0;
    if (me) {
      const mine = await query<{ answer: string }>(
        "SELECT answer FROM game_answers WHERE player_id = $1 AND question_id = $2",
        [me.id, current.id]
      );
      payload.me = {
        nickname: me.nickname,
        score: me.score,
        answered: mine.length > 0,
        answer: mine[0]?.answer ?? null,
      };
    }
  } else if (game.status === "reveal" && current) {
    payload.question = {
      id: current.id,
      question_text: current.question_text,
      options: current.options,
      correct_answer: current.correct_answer,
      explanation: current.explanation,
    };
    const dist = await query<{ answer: string; n: number }>(
      "SELECT answer, COUNT(*)::int AS n FROM game_answers WHERE game_id = $1 AND question_id = $2 GROUP BY answer",
      [game.id, current.id]
    );
    payload.distribution = Object.fromEntries(dist.map((d) => [d.answer, d.n]));
    payload.leaderboard = buildLeaderboard(players);
    if (me) {
      const mine = await query<{
        answer: string;
        is_correct: boolean;
        points: number;
      }>(
        "SELECT answer, is_correct, points FROM game_answers WHERE player_id = $1 AND question_id = $2",
        [me.id, current.id]
      );
      payload.me = {
        nickname: me.nickname,
        score: me.score,
        rank: buildLeaderboard(players).find((r) => r.nickname === me!.nickname)?.rank ?? null,
        answered: mine.length > 0,
        answer: mine[0]?.answer ?? null,
        isCorrect: mine[0]?.is_correct ?? null,
        points: mine[0]?.points ?? 0,
      };
    }
  } else if (game.status === "leaderboard") {
    payload.leaderboard = buildLeaderboard(players);
    if (me) {
      payload.me = {
        nickname: me.nickname,
        score: me.score,
        rank: buildLeaderboard(players).find((r) => r.nickname === me.nickname)?.rank ?? null,
      };
    }
  } else if (game.status === "ended") {
    payload.leaderboard = buildLeaderboard(players);
    if (me) {
      payload.me = {
        nickname: me.nickname,
        score: me.score,
        rank: buildLeaderboard(players).find((r) => r.nickname === me.nickname)?.rank ?? null,
      };
    }
  }

  return NextResponse.json(payload);
}
