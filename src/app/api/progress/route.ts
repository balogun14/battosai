import { NextResponse } from "next/server";
import { db, initDB } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  await initDB();
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const progressResult = await db.execute({
    sql: `SELECT p.*, q.slide_id, s.title as slide_title, s.order_num, s.course_id, c.title as course_title
          FROM progress p
          JOIN quizzes q ON q.id = p.quiz_id
          JOIN slides s ON s.id = q.slide_id
          JOIN courses c ON c.id = s.course_id
          WHERE p.user_id = ?
          ORDER BY p.completed_at DESC`,
    args: [session.userId],
  });
  const rawProgress = progressResult.rows;

  const totalQuizzesResult = await db.execute(
    "SELECT COUNT(*) as count FROM quizzes"
  );
  const totalQuizzes = Number(
    (totalQuizzesResult.rows[0] as unknown as { count: number }).count
  );

  const totalCoursesResult = await db.execute(
    "SELECT COUNT(*) as count FROM courses"
  );
  const totalCourses = Number(
    (totalCoursesResult.rows[0] as unknown as { count: number }).count
  );

  const progress = rawProgress.map(
    (p) =>
      ({
        id: p.id,
        quiz_id: p.quiz_id,
        slide_title: p.slide_title,
        course_title: p.course_title,
        course_id: p.course_id,
        slide_order: Number(p.order_num),
        score: Number(p.score),
        total: Number(p.total),
        time_spent_seconds: Number(p.time_spent_seconds),
        completed_at: p.completed_at,
      } as Record<string, unknown>)
  );

  return NextResponse.json({
    progress,
    stats: {
      quizzesCompleted: progress.length,
      totalQuizzes,
      totalCourses,
    },
  });
}
