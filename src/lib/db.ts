import { Pool, type PoolClient, type QueryResultRow } from "pg";

const connectionString =
  process.env.DATABASE_URL || "postgres://localhost:5432/studypack";

export const pool = new Pool({ connectionString, max: 10 });

export async function query<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const result = await pool.query<T>(sql, params);
  return result.rows;
}

export async function transaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const out = await fn(client);
    await client.query("COMMIT");
    return out;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

let initPromise: Promise<void> | null = null;

export async function initDB() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('admin', 'user')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS courses (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        created_by TEXT REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS slides (
        id TEXT PRIMARY KEY,
        course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        content TEXT NOT NULL DEFAULT '',
        order_num INTEGER NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS quizzes (
        id TEXT PRIMARY KEY,
        slide_id TEXT UNIQUE NOT NULL REFERENCES slides(id) ON DELETE CASCADE,
        time_limit_seconds INTEGER DEFAULT 300,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS quiz_questions (
        id TEXT PRIMARY KEY,
        quiz_id TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
        question_text TEXT NOT NULL,
        options TEXT NOT NULL,
        correct_answer TEXT NOT NULL,
        explanation TEXT NOT NULL DEFAULT '',
        order_num INTEGER NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS progress (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id),
        quiz_id TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
        score INTEGER DEFAULT 0,
        total INTEGER DEFAULT 0,
        time_spent_seconds INTEGER DEFAULT 0,
        answers TEXT NOT NULL DEFAULT '[]',
        completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE(user_id, quiz_id)
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS games (
        id TEXT PRIMARY KEY,
        pin TEXT UNIQUE NOT NULL,
        course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        status TEXT NOT NULL DEFAULT 'lobby'
          CHECK(status IN ('lobby', 'question', 'reveal', 'leaderboard', 'ended')),
        current_index INTEGER NOT NULL DEFAULT 0,
        question_started_at TIMESTAMPTZ,
        question_time_limit INTEGER NOT NULL DEFAULT 20,
        questions TEXT NOT NULL DEFAULT '[]',
        created_by TEXT REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS game_players (
        id TEXT PRIMARY KEY,
        game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
        user_id TEXT REFERENCES users(id),
        nickname TEXT NOT NULL,
        score INTEGER NOT NULL DEFAULT 0,
        streak INTEGER NOT NULL DEFAULT 0,
        joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE(game_id, nickname)
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS game_answers (
        id TEXT PRIMARY KEY,
        game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
        player_id TEXT NOT NULL REFERENCES game_players(id) ON DELETE CASCADE,
        question_id TEXT NOT NULL,
        answer TEXT NOT NULL,
        is_correct BOOLEAN NOT NULL,
        points INTEGER NOT NULL DEFAULT 0,
        time_ms INTEGER,
        answered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE(player_id, question_id)
      )
    `);
  })();

  return initPromise;
}
