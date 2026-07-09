import { NextRequest, NextResponse } from "next/server";
import { db, initDB } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { Course, Slide } from "@/lib/types";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await initDB();
  const { id } = await params;

  const courseResult = await db.execute({
    sql: "SELECT * FROM courses WHERE id = ?",
    args: [id],
  });
  const course = courseResult.rows[0] as unknown as Course | undefined;

  if (!course) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const slidesResult = await db.execute({
    sql: "SELECT * FROM slides WHERE course_id = ? ORDER BY order_num",
    args: [id],
  });
  const slides = slidesResult.rows as unknown as Slide[];

  const session = await getSession();

  return NextResponse.json({
    ...course,
    slides,
    isAdmin: session?.role === "admin",
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

  const { id } = await params;
  const { title, description } = await request.json();

  await db.execute({
    sql: "UPDATE courses SET title = ?, description = ?, updated_at = datetime('now') WHERE id = ?",
    args: [title?.trim() || "", (description || "").trim(), id],
  });

  const result = await db.execute({
    sql: "SELECT * FROM courses WHERE id = ?",
    args: [id],
  });
  const course = result.rows[0] as unknown as Course;

  return NextResponse.json(course);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await initDB();
  const session = await getSession();
  if (session?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const slides = await db
      .execute({ sql: "SELECT id FROM slides WHERE course_id = ?", args: [id] })
      .then((r) => r.rows);

    for (const slide of slides) {
      const quiz = await db
        .execute({ sql: "SELECT id FROM quizzes WHERE slide_id = ?", args: [slide.id] })
        .then((r) => r.rows[0]);

      if (quiz) {
        await db.execute({
          sql: "DELETE FROM progress WHERE quiz_id = ?",
          args: [quiz.id],
        });
        await db.execute({
          sql: "DELETE FROM quiz_questions WHERE quiz_id = ?",
          args: [quiz.id],
        });
        await db.execute({
          sql: "DELETE FROM quizzes WHERE id = ?",
          args: [quiz.id],
        });
      }
      await db.execute({
        sql: "DELETE FROM slides WHERE id = ?",
        args: [slide.id],
      });
    }

    await db.execute({ sql: "DELETE FROM courses WHERE id = ?", args: [id] });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete course failed:", err);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
