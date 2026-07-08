import { NextRequest, NextResponse } from "next/server";
import { db, initDB } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { User } from "@/lib/types";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  await initDB();

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Too many attempts. Try again soon." },
      { status: 429 }
    );
  }

  let body: { username?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { username } = body;

  if (!username || typeof username !== "string" || username.trim().length < 2) {
    return NextResponse.json(
      { error: "Username must be at least 2 characters" },
      { status: 400 }
    );
  }

  if (username.length > 50) {
    return NextResponse.json(
      { error: "Username must be 50 characters or fewer" },
      { status: 400 }
    );
  }

  const cleanUsername = username.trim().toLowerCase();

  const result = await db.execute({
    sql: "SELECT * FROM users WHERE username = ?",
    args: [cleanUsername],
  });
  let user = result.rows[0] as unknown as User | undefined;

  if (!user) {
    const id = crypto.randomUUID();
    const role =
      cleanUsername === process.env.ADMIN_USERNAME?.toLowerCase()
        ? "admin"
        : "user";

    await db.execute({
      sql: "INSERT INTO users (id, username, role) VALUES (?, ?, ?)",
      args: [id, cleanUsername, role],
    });

    user = { id, username: cleanUsername, role, created_at: "" };
  }

  await createSession({
    userId: user.id,
    username: user.username,
    role: user.role,
  });

  return NextResponse.json({
    id: user.id,
    username: user.username,
    role: user.role,
  });
}
