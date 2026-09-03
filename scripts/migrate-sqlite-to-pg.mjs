// One-off data migration: SQLite (local.db or Turso) -> PostgreSQL.
//
// Usage:
//   node scripts/migrate-sqlite-to-pg.mjs
//
// Env:
//   SQLITE_URL      optional, defaults to "file:local.db"
//                   (or set TURSO_DATABASE_URL/TURSO_AUTH_TOKEN to read from Turso)
//   DATABASE_URL    required, the target Postgres connection string
//
// Safe to re-run: rows are copied with ON CONFLICT DO NOTHING (existing rows win).

import { createClient } from "@libsql/client";
import { Pool } from "pg";

const sqliteUrl =
  process.env.SQLITE_URL ||
  process.env.TURSO_DATABASE_URL ||
  "file:local.db";

const pgUrl = process.env.DATABASE_URL;
if (!pgUrl) {
  console.error("DATABASE_URL is required (target Postgres connection string).");
  process.exit(1);
}

const sqlite = createClient({
  url: sqliteUrl,
  authToken: process.env.TURSO_AUTH_TOKEN || undefined,
});
const pg = new Pool({ connectionString: pgUrl });

const DDL = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('admin', 'user')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE TABLE IF NOT EXISTS courses (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_by TEXT REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE TABLE IF NOT EXISTS slides (
    id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    order_num INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE TABLE IF NOT EXISTS quizzes (
    id TEXT PRIMARY KEY,
    slide_id TEXT UNIQUE NOT NULL REFERENCES slides(id) ON DELETE CASCADE,
    time_limit_seconds INTEGER DEFAULT 300,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE TABLE IF NOT EXISTS quiz_questions (
    id TEXT PRIMARY KEY,
    quiz_id TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    options TEXT NOT NULL,
    correct_answer TEXT NOT NULL,
    explanation TEXT NOT NULL DEFAULT '',
    order_num INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
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
  );
`;

async function copyTable(name, columns, transform = (r) => columns.map((c) => r[c])) {
  const rows = await sqlite.execute(`SELECT * FROM ${name}`);
  if (rows.rows.length === 0) {
    console.log(`${name}: 0 rows`);
    return 0;
  }
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
  const sql = `INSERT INTO ${name} (${columns.join(", ")}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;
  let copied = 0;
  for (const row of rows.rows) {
    const res = await pg.query(sql, transform(row));
    copied += res.rowCount ?? 0;
  }
  console.log(`${name}: ${copied} copied (${rows.rows.length} in source)`);
  return copied;
}

try {
  await pg.query("BEGIN");
  await pg.query(DDL);

  const total =
    (await copyTable("users", ["id", "username", "role", "created_at"])) +
    (await copyTable("courses", ["id", "title", "description", "created_by", "created_at", "updated_at"])) +
    (await copyTable("slides", ["id", "course_id", "title", "content", "order_num", "created_at"])) +
    (await copyTable("quizzes", ["id", "slide_id", "time_limit_seconds", "created_at"])) +
    (await copyTable("quiz_questions", [
      "id",
      "quiz_id",
      "question_text",
      "options",
      "correct_answer",
      "explanation",
      "order_num",
      "created_at",
    ])) +
    (await copyTable("progress", [
      "id",
      "user_id",
      "quiz_id",
      "score",
      "total",
      "time_spent_seconds",
      "answers",
      "completed_at",
    ]));

  console.log(`Done. ${total} rows migrated to Postgres.`);
  await pg.query("COMMIT");
} catch (err) {
  console.error("Migration failed:", err);
  await pg.query("ROLLBACK").catch(() => {});
  process.exitCode = 1;
} finally {
  sqlite.close();
  await pg.end();
}
