import { NextRequest, NextResponse } from "next/server";
import { query, initDB } from "@/lib/db";
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

  await query("UPDATE slides SET title = $1, content = $2 WHERE id = $3", [
    title?.trim() || "",
    (content || "").trim(),
    id,
  ]);

  const slideRows = await query<Slide>("SELECT * FROM slides WHERE id = $1", [id]);
  const slide = slideRows[0];

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

  try {
    // FK cascades remove the quiz, its questions and progress rows.
    await query("DELETE FROM slides WHERE id = $1", [id]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete slide failed:", err);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
