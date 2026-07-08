import { NextRequest, NextResponse } from "next/server";
import { db, initDB } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { Course } from "@/lib/types";

export async function GET() {
  await initDB();
  const session = await getSession();
  const role = session?.role;

  const result = await db.execute(
    "SELECT c.*, COUNT(s.id) as slide_count FROM courses c LEFT JOIN slides s ON s.course_id = c.id GROUP BY c.id ORDER BY c.created_at DESC"
  );
  const courses = result.rows as unknown as Course[];

  return NextResponse.json({ courses, isAdmin: role === "admin" });
}

export async function POST(request: NextRequest) {
  await initDB();
  const session = await getSession();
  if (session?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { title, description } = await request.json();
  if (!title?.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const id = crypto.randomUUID();
  await db.execute({
    sql: "INSERT INTO courses (id, title, description, created_by) VALUES (?, ?, ?, ?)",
    args: [id, title.trim(), (description || "").trim(), session.userId],
  });

  const result = await db.execute({
    sql: "SELECT * FROM courses WHERE id = ?",
    args: [id],
  });
  const course = result.rows[0] as unknown as Course;

  return NextResponse.json(course, { status: 201 });
}
