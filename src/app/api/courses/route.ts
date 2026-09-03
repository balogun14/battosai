import { NextRequest, NextResponse } from "next/server";
import { query, initDB } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { Course } from "@/lib/types";

export async function GET() {
  await initDB();
  const session = await getSession();
  const role = session?.role;

  const courses = await query<Course>(
    "SELECT c.*, COUNT(s.id)::int AS slide_count FROM courses c LEFT JOIN slides s ON s.course_id = c.id GROUP BY c.id ORDER BY c.created_at DESC"
  );

  return NextResponse.json({ courses, isAdmin: role === "admin" });
}

export async function POST(request: NextRequest) {
  await initDB();
  const session = await getSession();
  if (session?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  let body: { title?: string; description?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { title, description } = body;

  if (!title || typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  if (title.length > 200) {
    return NextResponse.json(
      { error: "Title must be 200 characters or fewer" },
      { status: 400 }
    );
  }

  const cleanDesc = typeof description === "string" ? description.trim().slice(0, 5000) : "";

  const id = crypto.randomUUID();
  await query(
    "INSERT INTO courses (id, title, description, created_by) VALUES ($1, $2, $3, $4)",
    [id, title.trim(), cleanDesc, session.userId]
  );

  const courses = await query<Course>("SELECT * FROM courses WHERE id = $1", [id]);
  const course = courses[0];

  return NextResponse.json(course, { status: 201 });
}
