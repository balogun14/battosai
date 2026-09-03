import { NextRequest, NextResponse } from "next/server";
import { query, initDB } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { generatePin, parseGameQuestions } from "@/lib/game";
import { Game, GameQuestion, QuizQuestion } from "@/lib/types";

interface CreateGameBody {
  course_id?: string;
  time_limit_seconds?: number;
}

const TIME_LIMITS = [10, 20, 30, 60, 120];

export async function POST(request: NextRequest) {
  await initDB();
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: CreateGameBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { course_id } = body;
  if (!course_id || typeof course_id !== "string" || course_id.length > 100) {
    return NextResponse.json({ error: "course_id is required" }, { status: 400 });
  }

  const timeLimit = TIME_LIMITS.includes(body.time_limit_seconds as number)
    ? (body.time_limit_seconds as number)
    : 20;

  const courses = await query("SELECT id FROM courses WHERE id = $1", [course_id]);
  if (courses.length === 0) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  const rawQuestions = await query<QuizQuestion>(
    `SELECT qq.* FROM quiz_questions qq
     JOIN quizzes q ON q.id = qq.quiz_id
     JOIN slides s ON s.id = q.slide_id
     WHERE s.course_id = $1
     ORDER BY s.order_num, qq.order_num`,
    [course_id]
  );

  if (rawQuestions.length === 0) {
    return NextResponse.json(
      { error: "This course has no quiz questions to play with" },
      { status: 400 }
    );
  }

  // Snapshot the questions so content edits or deletions mid-game
  // (or after it) can't corrupt a running or historic game.
  const snapshot: GameQuestion[] = rawQuestions.map((q) => ({
    id: q.id,
    question_text: q.question_text,
    options: JSON.parse(String(q.options)),
    correct_answer: q.correct_answer,
    explanation: q.explanation || "",
  }));

  const id = crypto.randomUUID();
  // Pins are 6 digits with ~900k combinations; retry on the rare collision.
  for (let attempt = 0; attempt < 10; attempt++) {
    const pin = generatePin();
    try {
      await query(
        "INSERT INTO games (id, pin, course_id, question_time_limit, questions, created_by) VALUES ($1, $2, $3, $4, $5, $6)",
        [id, pin, course_id, timeLimit, JSON.stringify(snapshot), session.userId]
      );
      return NextResponse.json({ id, pin, questionCount: snapshot.length }, { status: 201 });
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code !== "23505") throw err;
    }
  }

  return NextResponse.json(
    { error: "Could not allocate a game PIN, try again" },
    { status: 500 }
  );
}

interface GameRow extends Game {
  course_title: string;
  player_count: number;
}

export async function GET() {
  await initDB();
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = session.role === "admin";
  const games = await query<GameRow>(
    `SELECT g.*, c.title AS course_title,
       (SELECT COUNT(*)::int FROM game_players gp WHERE gp.game_id = g.id) AS player_count
     FROM games g JOIN courses c ON c.id = g.course_id
     ${isAdmin ? "" : "WHERE g.created_by = $1"}
     ORDER BY g.created_at DESC LIMIT 100`,
    isAdmin ? [] : [session.userId]
  );

  return NextResponse.json({
    games: games.map((g) => ({
      id: g.id,
      pin: g.pin,
      status: g.status,
      course_title: g.course_title,
      player_count: g.player_count,
      question_count: parseGameQuestions(g as unknown as Game).length,
      created_at: g.created_at,
    })),
  });
}
