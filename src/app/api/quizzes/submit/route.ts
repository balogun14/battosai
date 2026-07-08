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

  const { quiz_id, answers, time_spent_seconds } = await request.json();

  const questionsResult = await db.execute({
    sql: "SELECT * FROM quiz_questions WHERE quiz_id = ? ORDER BY order_num",
    args: [quiz_id],
  });
  const questions = questionsResult.rows as unknown as QuizQuestion[];

  let score = 0;
  for (const q of questions) {
    const userAnswer = answers?.[q.id];
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
      time_spent_seconds || 0,
      JSON.stringify(answers || {}),
    ],
  });

  return NextResponse.json({
    score,
    total: questions.length,
    time_spent_seconds: time_spent_seconds || 0,
  });
}
