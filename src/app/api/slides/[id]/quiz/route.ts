import { NextRequest, NextResponse } from "next/server";
import { db, initDB } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { Quiz, QuizQuestion, Progress } from "@/lib/types";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await initDB();
  const { id: slideId } = await params;

  const quizResult = await db.execute({
    sql: "SELECT * FROM quizzes WHERE slide_id = ?",
    args: [slideId],
  });
  const quiz = quizResult.rows[0] as unknown as Quiz | undefined;

  if (!quiz) {
    return NextResponse.json(null);
  }

  const questionsResult = await db.execute({
    sql: "SELECT * FROM quiz_questions WHERE quiz_id = ? ORDER BY order_num",
    args: [quiz.id],
  });
  const rawQuestions = questionsResult.rows as unknown as QuizQuestion[];
  const questions = rawQuestions.map((q) => ({
    ...q,
    options: JSON.parse(String(q.options)),
    order_num: Number(q.order_num),
  }));

  const session = await getSession();

  let userProgress = null;
  if (session) {
    const progressResult = await db.execute({
      sql: "SELECT * FROM progress WHERE user_id = ? AND quiz_id = ?",
      args: [session.userId, quiz.id],
    });
    const raw = progressResult.rows[0] as unknown as Progress | undefined;
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

  const quizResult = await db.execute({
    sql: "SELECT * FROM quizzes WHERE slide_id = ?",
    args: [slideId],
  });
  const quiz = quizResult.rows[0] as unknown as Quiz | undefined;

  if (!quiz) {
    return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  }

  const quizId = quiz.id;

  if (typeof time_limit_seconds === "number") {
    await db.execute({
      sql: "UPDATE quizzes SET time_limit_seconds = ? WHERE id = ?",
      args: [time_limit_seconds, quizId],
    });
  }

  if (Array.isArray(questions)) {
    await db.execute({
      sql: "DELETE FROM quiz_questions WHERE quiz_id = ?",
      args: [quizId],
    });

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const qid = crypto.randomUUID();
      await db.execute({
        sql: "INSERT INTO quiz_questions (id, quiz_id, question_text, options, correct_answer, explanation, order_num) VALUES (?, ?, ?, ?, ?, ?, ?)",
        args: [
          qid,
          quizId,
          q.question_text,
          JSON.stringify(q.options),
          q.correct_answer,
          q.explanation || "",
          i,
        ],
      });
    }
  }

  const updatedResult = await db.execute({
    sql: "SELECT * FROM quizzes WHERE id = ?",
    args: [quizId],
  });
  const updated = updatedResult.rows[0] as unknown as Quiz;

  const updatedQResult = await db.execute({
    sql: "SELECT * FROM quiz_questions WHERE quiz_id = ? ORDER BY order_num",
    args: [quizId],
  });
  const updatedQuestions = updatedQResult.rows as unknown as QuizQuestion[];

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
