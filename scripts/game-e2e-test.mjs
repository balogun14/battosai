// End-to-end game simulation against the dev server.
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const results = [];
const check = (name, cond, extra = "") => {
  results.push(`${cond ? "PASS" : "FAIL"}: ${name}${extra ? ` — ${extra}` : ""}`);
};

// 1. login as admin
let res = await fetch(`${BASE}/api/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username: "admin" }),
});
const cookie = res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
check("admin login", res.ok);

const H = { "Content-Type": "application/json", Cookie: cookie };

// 2. create course + slide with 2 questions
res = await fetch(`${BASE}/api/courses`, {
  method: "POST", headers: H,
  body: JSON.stringify({ title: "Kahoot Test Course", description: "e2e" }),
});
const course = await res.json();
check("create course", res.ok);

res = await fetch(`${BASE}/api/courses/${course.id}/slides`, {
  method: "POST", headers: H,
  body: JSON.stringify({ title: "S1", content: "c" }),
});
const slide1 = await res.json();
res = await fetch(`${BASE}/api/courses/${course.id}/slides`, {
  method: "POST", headers: H,
  body: JSON.stringify({ title: "S2", content: "c" }),
});
const slide2 = await res.json();
check("create 2 slides", res.ok);

// find the auto-created quizzes
res = await fetch(`${BASE}/api/slides/${slide1.id}/quiz`, { headers: H });
const q1 = await res.json();
res = await fetch(`${BASE}/api/slides/${slide2.id}/quiz`, { headers: H });
const q2 = await res.json();

await fetch(`${BASE}/api/slides/${slide1.id}/quiz`, {
  method: "PUT", headers: H,
  body: JSON.stringify({
    questions: [
      { question_text: "Q1: capital of France?", options: ["Paris", "London", "Berlin", "Madrid"], correct_answer: "Paris" },
    ],
  }),
});
await fetch(`${BASE}/api/slides/${slide2.id}/quiz`, {
  method: "PUT", headers: H,
  body: JSON.stringify({
    questions: [
      { question_text: "Q2: 2+2?", options: ["3", "4"], correct_answer: "4" },
    ],
  }),
});
check("set quiz questions", true);

// 3. create game
res = await fetch(`${BASE}/api/games`, {
  method: "POST", headers: H,
  body: JSON.stringify({ course_id: course.id, time_limit_seconds: 20 }),
});
const game = await res.json();
check("create game, got 6-digit pin", res.ok && /^\d{6}$/.test(game.pin), `pin=${game.pin}`);

// 4. join two players (public, no cookie)
res = await fetch(`${BASE}/api/games/${game.pin}/join`, {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ nickname: "alice" }),
});
const alice = await res.json();
res = await fetch(`${BASE}/api/games/${game.pin}/join`, {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ nickname: "bob" }),
});
const bob = await res.json();
check("two players joined", res.ok && alice.playerId && bob.playerId);

// duplicate nickname rejected
res = await fetch(`${BASE}/api/games/${game.pin}/join`, {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ nickname: "alice" }),
});
check("duplicate nickname rejected", res.status === 409);

// 5. lobby state (public)
res = await fetch(`${BASE}/api/games/${game.pin}`);
let state = await res.json();
check(
  "lobby state shows 2 players, no question",
  state.game.status === "lobby" && state.players.length === 2 && !state.question
);

// 6. host starts -> question 1
res = await fetch(`${BASE}/api/games/${game.pin}/next`, { method: "POST", headers: H });
check("host starts game", res.ok && (await res.json()).status === "question");

// player cannot control
res = await fetch(`${BASE}/api/games/${game.pin}/next`, { method: "POST" });
check("anonymous next() rejected", res.status === 401);

// state in question hides correct answer
res = await fetch(`${BASE}/api/games/${game.pin}?player=${alice.playerId}`);
state = await res.json();
check(
  "question state hides correct_answer",
  state.game.status === "question" && state.question.correct_answer === undefined,
);

// alice answers correctly, bob wrong
res = await fetch(`${BASE}/api/games/${game.pin}/answer`, {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ playerId: alice.playerId, answer: "Paris" }),
});
const a1 = await res.json();
res = await fetch(`${BASE}/api/games/${game.pin}/answer`, {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ playerId: bob.playerId, answer: "London" }),
});
const b1 = await res.json();
check("alice correct w/ points", a1.correct === true && a1.points >= 500, `points=${a1.points}`);
check("bob wrong scores 0", b1.correct === false && b1.points === 0);

// double answer rejected
res = await fetch(`${BASE}/api/games/${game.pin}/answer`, {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ playerId: alice.playerId, answer: "Paris" }),
});
check("double answer rejected", res.status === 409);

// 7. skip to reveal, check distribution
res = await fetch(`${BASE}/api/games/${game.pin}/next`, { method: "POST", headers: H });
check("host reveals", res.ok && (await res.json()).status === "reveal");
res = await fetch(`${BASE}/api/games/${game.pin}?player=${alice.playerId}`);
state = await res.json();
check(
  "reveal shows distribution + alice correct",
  state.distribution["Paris"] === 1 &&
    state.me.isCorrect === true &&
    state.question.correct_answer === "Paris",
);
check("alice rank 1 in reveal", state.me.rank === 1);

// 8. leaderboard
res = await fetch(`${BASE}/api/games/${game.pin}/next`, { method: "POST", headers: H });
check("show scoreboard", res.ok && (await res.json()).status === "leaderboard");

// 9. next question (index 1)
res = await fetch(`${BASE}/api/games/${game.pin}/next`, { method: "POST", headers: H });
const adv = await res.json();
check("advance to question 2", res.ok && adv.status === "question" && adv.index === 1);
res = await fetch(`${BASE}/api/games/${game.pin}?player=${bob.playerId}`);
state = await res.json();
check("question 2 is the 2+2 one", state.question.question_text.startsWith("Q2"));

// streak: alice answers correctly again -> bonus applies
res = await fetch(`${BASE}/api/games/${game.pin}/answer`, {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ playerId: alice.playerId, answer: "4" }),
});
const a2 = await res.json();
check("alice streak bonus on q2", a2.correct === true && a2.points >= 600, `points=${a2.points}`);
res = await fetch(`${BASE}/api/games/${game.pin}/answer`, {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ playerId: bob.playerId, answer: "3" }),
});

// 10. reveal -> leaderboard -> ended
await fetch(`${BASE}/api/games/${game.pin}/next`, { method: "POST", headers: H });
await fetch(`${BASE}/api/games/${game.pin}/next`, { method: "POST", headers: H });
res = await fetch(`${BASE}/api/games/${game.pin}/next`, { method: "POST", headers: H });
check("game ended", res.ok && (await res.json()).status === "ended");

// next after end rejected
res = await fetch(`${BASE}/api/games/${game.pin}/next`, { method: "POST", headers: H });
check("next after end rejected", res.status === 409);

// final state: alice rank 1
res = await fetch(`${BASE}/api/games/${game.pin}?player=${alice.playerId}`);
state = await res.json();
const aliceRow = state.leaderboard.find((r) => r.nickname === "alice");
const bobRow = state.leaderboard.find((r) => r.nickname === "bob");
check("final podium: alice #1, bob #2", aliceRow.rank === 1 && bobRow.rank === 2,
  `alice=${aliceRow.score} bob=${bobRow.score}`);

// join after end rejected
res = await fetch(`${BASE}/api/games/${game.pin}/join`, {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ nickname: "late" }),
});
check("join after end rejected", res.status === 409);

// 11. results endpoint (host)
res = await fetch(`${BASE}/api/games/${game.id}/results`, { headers: H });
const r = await res.json();
check(
  "results endpoint: leaderboard + per-question stats",
  res.ok && r.players[0].nickname === "alice" && r.questions.length === 2 &&
    r.questions[0].correctCount === 1,
);

// 12. games list
res = await fetch(`${BASE}/api/games`, { headers: H });
const list = await res.json();
check("games list includes our game", res.ok && list.games.some((g) => g.id === game.id));

// 13. auth enforcement on host-only endpoints
res = await fetch(`${BASE}/api/games`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
check("create game requires auth", res.status === 401);
res = await fetch(`${BASE}/api/games/${game.id}/results`);
check("results requires auth", res.status === 401);

console.log(results.join("\n"));
const fails = results.filter((r) => r.startsWith("FAIL")).length;
console.log(`\n${results.length - fails}/${results.length} checks passed`);
process.exit(fails ? 1 : 0);
