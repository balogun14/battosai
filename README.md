This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Live game (Kahoot-style)

Host a live quiz game from any course's existing quiz questions:

- **Host**: log in, open `/play`, pick a course and a time limit, create the game, and share the PIN shown on the console.
- **Players**: open `/join`, enter the PIN and a nickname — no account needed. Answers use Kahoot's colored shape buttons.
- Games are host-paced: question → reveal (auto-flips when the timer runs out) → scoreboard → next question → final podium.
- Scoring is speed-based (500–1000 points per correct answer) plus a streak bonus, like Kahoot.
- Game history and per-question results live under `/admin/games`.

Run the end-to-end game smoke test against a running dev server:

```bash
node scripts/game-e2e-test.mjs
```

## Database

The app uses PostgreSQL via `pg`. Set `DATABASE_URL` in `.env.local`, e.g.:

```
DATABASE_URL=postgres://user:password@localhost:5432/studypack
```

Tables are created automatically on first request (`CREATE TABLE IF NOT EXISTS` in `src/lib/db.ts`).

To migrate existing data from the old SQLite/Turso database:

```bash
# optionally point at a Turso DB instead of a local sqlite file
SQLITE_URL=file:local.db DATABASE_URL=postgres://user:password@localhost:5432/studypack npm run db:migrate
```

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
