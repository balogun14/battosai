import { NextRequest, NextResponse } from "next/server";
import { query, initDB } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { Course, Slide } from "@/lib/types";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await initDB();
  const { id } = await params;

  const courseRows = await query<Course>("SELECT * FROM courses WHERE id = $1", [id]);
  const course = courseRows[0];

  if (!course) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const slides = await query<Slide>(
    "SELECT * FROM slides WHERE course_id = $1 ORDER BY order_num",
    [id]
  );

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

  await query(
    "UPDATE courses SET title = $1, description = $2, updated_at = now() WHERE id = $3",
    [title?.trim() || "", (description || "").trim(), id]
  );

  const courseRows = await query<Course>("SELECT * FROM courses WHERE id = $1", [id]);
  const course = courseRows[0];

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
    // FK cascades remove slides -> quizzes -> questions -> progress.
    await query("DELETE FROM courses WHERE id = $1", [id]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete course failed:", err);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
