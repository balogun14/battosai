import { NextRequest, NextResponse } from "next/server";
import { query, initDB } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { User } from "@/lib/types";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    await initDB();
  } catch (err) {
    console.error("DB init failed:", err);
    return NextResponse.json(
      { error: "Database connection failed. Is DATABASE_URL set?" },
      { status: 500 }
    );
  }

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

  try {
    const users = await query<User>(
      "SELECT * FROM users WHERE username = $1",
      [cleanUsername]
    );
    let user = users[0];

    if (!user) {
      const id = crypto.randomUUID();
      const role =
        cleanUsername === process.env.ADMIN_USERNAME?.toLowerCase()
          ? "admin"
          : "user";

      await query("INSERT INTO users (id, username, role) VALUES ($1, $2, $3)", [
        id,
        cleanUsername,
        role,
      ]);

      user = { id, username: cleanUsername, role, created_at: "" };
    }

    try {
      await createSession({
        userId: user.id,
        username: user.username,
        role: user.role,
      });
    } catch (err) {
      console.error("Session creation failed:", err);
      return NextResponse.json(
        { error: "Authentication error. Is JWT_SECRET set?" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      id: user.id,
      username: user.username,
      role: user.role,
    });
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Try again." },
      { status: 500 }
    );
  }
}
