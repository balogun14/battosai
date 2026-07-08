import { NextRequest, NextResponse } from "next/server";
import { db, initDB } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { Slide } from "@/lib/types";

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
  const { title, content } = await request.json();

  await db.execute({
    sql: "UPDATE slides SET title = ?, content = ? WHERE id = ?",
    args: [title?.trim() || "", (content || "").trim(), id],
  });

  const result = await db.execute({
    sql: "SELECT * FROM slides WHERE id = ?",
    args: [id],
  });
  const slide = result.rows[0] as unknown as Slide;

  return NextResponse.json(slide);
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
  await db.execute({ sql: "DELETE FROM slides WHERE id = ?", args: [id] });

  return NextResponse.json({ success: true });
}
