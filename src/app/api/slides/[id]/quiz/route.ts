import { NextRequest, NextResponse } from "next/server";
import { query, initDB } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { Quiz, QuizQuestion, Progress } from "@/lib/types";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await initDB();
  const { id: slideId } = await params;

  const quizRows = await query<Quiz>("SELECT * FROM quizzes WHERE slide_id = $1", [
    slideId,
  ]);
  const quiz = quizRows[0];

  if (!quiz) {
    return NextResponse.json(null);
  }

  const rawQuestions = await query<QuizQuestion>(
    "SELECT * FROM quiz_questions WHERE quiz_id = $1 ORDER BY order_num",
    [quiz.id]
  );
  const questions = rawQuestions.map((q) => ({
    ...q,
    options: JSON.parse(String(q.options)),
    order_num: Number(q.order_num),
  }));

  const session = await getSession();

  let userProgress = null;
  if (session) {
    const progressRows = await query<Progress>(
      "SELECT * FROM progress WHERE user_id = $1 AND quiz_id = $2",
      [session.userId, quiz.id]
    );
    const raw = progressRows[0];
    if (raw) {
      userProgress = {
        ...raw,
        score: Number(raw.score),
        total: Number(raw.total),
        time_spent_seconds: Number(raw.time_spent_seconds),
        answers: JSON.parse(String(raw.answers)),
      };
    }
  }

  return NextResponse.json({
    quiz: {
      ...quiz,
      time_limit_seconds: Number(quiz.time_limit_seconds),
      questions,
    },
    progress: userProgress,
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await initDB();
  const session = await getSession();
  if (session?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id: slideId } = await params;
  const { time_limit_seconds, questions } = await request.json();

  const quizRows = await query<Quiz>("SELECT * FROM quizzes WHERE slide_id = $1", [
    slideId,
  ]);
  const quiz = quizRows[0];

  if (!quiz) {
    return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  }

  const quizId = quiz.id;

  if (typeof time_limit_seconds === "number") {
    await query("UPDATE quizzes SET time_limit_seconds = $1 WHERE id = $2", [
      time_limit_seconds,
      quizId,
    ]);
  }

  if (Array.isArray(questions)) {
    await query("DELETE FROM quiz_questions WHERE quiz_id = $1", [quizId]);

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const qid = crypto.randomUUID();
      await query(
        "INSERT INTO quiz_questions (id, quiz_id, question_text, options, correct_answer, explanation, order_num) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        [
          qid,
          quizId,
          q.question_text,
          JSON.stringify(q.options),
          q.correct_answer,
          q.explanation || "",
          i,
        ]
      );
    }
  }

  const updatedRows = await query<Quiz>("SELECT * FROM quizzes WHERE id = $1", [quizId]);
  const updated = updatedRows[0];

  const updatedQuestions = await query<QuizQuestion>(
    "SELECT * FROM quiz_questions WHERE quiz_id = $1 ORDER BY order_num",
    [quizId]
  );

  return NextResponse.json({
    quiz: {
      ...updated,
      time_limit_seconds: Number(updated.time_limit_seconds),
      questions: updatedQuestions.map((q) => ({
        ...q,
        options: JSON.parse(String(q.options)),
        order_num: Number(q.order_num),
      })),
    },
  });
}
