import { NextRequest, NextResponse } from "next/server";
import { db, initDB } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { Slide } from "@/lib/types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await initDB();
  const session = await getSession();
  if (session?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id: courseId } = await params;
  const { title, content } = await request.json();

  if (!title?.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const orderResult = await db.execute({
    sql: "SELECT COALESCE(MAX(order_num), -1) + 1 as next FROM slides WHERE course_id = ?",
    args: [courseId],
  });
  const nextOrder = Number(
    (orderResult.rows[0] as unknown as { next: number }).next
  );

  const slideId = crypto.randomUUID();
  await db.execute({
    sql: "INSERT INTO slides (id, course_id, title, content, order_num) VALUES (?, ?, ?, ?, ?)",
    args: [slideId, courseId, title.trim(), (content || "").trim(), nextOrder],
  });

  const quizId = crypto.randomUUID();
  await db.execute({
    sql: "INSERT OR IGNORE INTO quizzes (id, slide_id) VALUES (?, ?)",
    args: [quizId, slideId],
  });

  const result = await db.execute({
    sql: "SELECT * FROM slides WHERE id = ?",
    args: [slideId],
  });
  const slide = result.rows[0] as unknown as Slide;

  return NextResponse.json(slide, { status: 201 });
}
