import { NextRequest, NextResponse } from "next/server";
import { db, initDB } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { QuizQuestion } from "@/lib/types";

export async function POST(request: NextRequest) {
  await initDB();
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    quiz_id?: string;
    answers?: Record<string, string>;
    time_spent_seconds?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { quiz_id, answers, time_spent_seconds } = body;

  if (!quiz_id || typeof quiz_id !== "string" || quiz_id.length > 100) {
    return NextResponse.json({ error: "Invalid quiz_id" }, { status: 400 });
  }

  if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
    return NextResponse.json({ error: "Invalid answers" }, { status: 400 });
  }

  for (const [key, val] of Object.entries(answers)) {
    if (
      typeof key !== "string" ||
      typeof val !== "string" ||
      key.length > 100 ||
      val.length > 1000
    ) {
      return NextResponse.json({ error: "Invalid answer format" }, { status: 400 });
    }
  }

  const timeSpent =
    typeof time_spent_seconds === "number" &&
    time_spent_seconds >= 0 &&
    time_spent_seconds <= 7200
      ? time_spent_seconds
      : 0;

  const questionsResult = await db.execute({
    sql: "SELECT * FROM quiz_questions WHERE quiz_id = ? ORDER BY order_num",
    args: [quiz_id],
  });
  const questions = questionsResult.rows as unknown as QuizQuestion[];

  if (questions.length === 0) {
    return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  }

  let score = 0;
  for (const q of questions) {
    const userAnswer = answers[q.id] ?? "";
    if (userAnswer === q.correct_answer) {
      score++;
    }
  }

  const id = crypto.randomUUID();
  await db.execute({
    sql: `INSERT OR REPLACE INTO progress (id, user_id, quiz_id, score, total, time_spent_seconds, answers)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      session.userId,
      quiz_id,
      score,
      questions.length,
      timeSpent,
      JSON.stringify(answers),
    ],
  });

  return NextResponse.json({
    score,
    total: questions.length,
    time_spent_seconds: timeSpent,
  });
}
