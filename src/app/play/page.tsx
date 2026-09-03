"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Course {
  id: string;
  title: string;
  slide_count: number;
  question_count: number;
}

const TIME_OPTIONS = [10, 20, 30, 60, 120];

export default function PlayPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [timeLimit, setTimeLimit] = useState(20);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/courses")
      .then((r) => r.json())
      .then((data) => {
        const list: Course[] = data.courses || [];
        setCourses(list);
        const firstPlayable = list.find((c) => c.question_count > 0);
        if (firstPlayable) setSelected(firstPlayable.id);
      });
  }, []);

  const createGame = async () => {
    if (!selected) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ course_id: selected, time_limit_seconds: timeLimit }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not create the game");
        return;
      }
      router.push(`/play/${data.pin}`);
    } finally {
      setCreating(false);
    }
  };

  const selectedCourse = courses.find((c) => c.id === selected);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      <p className="eyebrow mb-2">Live game</p>
      <div className="flex items-end justify-between gap-4 flex-wrap mb-8 sm:mb-10">
        <h1 className="display text-3xl sm:text-4xl text-ink">Host a game</h1>
        <Link href="/admin/games" className="btn-ghost">
          Game history
        </Link>
      </div>

      <div className="card p-6 sm:p-7 space-y-6">
        <div>
          <label htmlFor="course" className="eyebrow block mb-2.5">
            Course
          </label>
          {courses.length === 0 ? (
            <p className="text-sm text-ink-soft">
              No courses yet — create one with quiz questions first.
            </p>
          ) : (
            <select
              id="course"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="field"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id} disabled={c.question_count === 0}>
                  {c.title} ({c.question_count} question
                  {c.question_count !== 1 ? "s" : ""})
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <span className="eyebrow block mb-2.5">Time limit per question</span>
          <div className="flex flex-wrap gap-2">
            {TIME_OPTIONS.map((t) => (
              <button
                key={t}
                onClick={() => setTimeLimit(t)}
                className={`px-4 py-2 text-sm rounded-lg border transition-all duration-200 active:scale-95 ${
                  timeLimit === t
                    ? "bg-accent text-white border-accent shadow-[0_2px_8px_rgba(45,90,58,0.3)]"
                    : "bg-card text-ink-soft border-line-strong hover:border-accent/60 hover:text-ink"
                }`}
              >
                {t}s
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
            {error}
          </p>
        )}

        <button
          onClick={createGame}
          disabled={!selected || creating || (selectedCourse?.question_count ?? 0) === 0}
          className="btn-primary w-full py-3"
        >
          {creating ? "Creating…" : "Create game"}
        </button>
      </div>

      <p className="text-xs text-ink-faint mt-5">
        Players join at <span className="font-mono">/join</span> with the game
        PIN — no account needed.
      </p>
    </div>
  );
}
