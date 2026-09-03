import { NextRequest, NextResponse } from "next/server";
import { query, initDB } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { cleanNickname } from "@/lib/game";
import { Game } from "@/lib/types";

/**
 * Public: players join with just the game PIN and a nickname, like Kahoot.
 * If the visitor happens to be logged in, their account is attached for
 * stats purposes but is not required.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await initDB();
  const { id } = await params;

  let body: { nickname?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const nickname = cleanNickname(body.nickname);
  if (!nickname) {
    return NextResponse.json(
      { error: "Nickname is required (max 15 characters)" },
      { status: 400 }
    );
  }

  const games = await query<Game>("SELECT * FROM games WHERE pin = $1 OR id = $1", [id]);
  const game = games[0];
  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  if (game.status === "ended") {
    return NextResponse.json({ error: "This game has already ended" }, { status: 409 });
  }

  const session = await getSession();
  const playerId = crypto.randomUUID();

  const inserted = await query<{ id: string }>(
    `INSERT INTO game_players (id, game_id, user_id, nickname)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (game_id, nickname) DO NOTHING
     RETURNING id`,
    [playerId, game.id, session?.userId ?? null, nickname]
  );

  if (inserted.length === 0) {
    return NextResponse.json(
      { error: "That nickname is taken — pick another" },
      { status: 409 }
    );
  }

  return NextResponse.json({ playerId, nickname }, { status: 201 });
}
