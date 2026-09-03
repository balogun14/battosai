import { NextRequest, NextResponse } from "next/server";
import { query, initDB } from "@/lib/db";
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

  const orderRows = await query<{ next: number }>(
    "SELECT COALESCE(MAX(order_num), -1) + 1 AS next FROM slides WHERE course_id = $1",
    [courseId]
  );
  const nextOrder = Number(orderRows[0]?.next ?? 0);

  const slideId = crypto.randomUUID();
  await query(
    "INSERT INTO slides (id, course_id, title, content, order_num) VALUES ($1, $2, $3, $4, $5)",
    [slideId, courseId, title.trim(), (content || "").trim(), nextOrder]
  );

  const quizId = crypto.randomUUID();
  await query(
    "INSERT INTO quizzes (id, slide_id) VALUES ($1, $2) ON CONFLICT (slide_id) DO NOTHING",
    [quizId, slideId]
  );

  const slideRows = await query<Slide>("SELECT * FROM slides WHERE id = $1", [slideId]);
  const slide = slideRows[0];

  return NextResponse.json(slide, { status: 201 });
}
