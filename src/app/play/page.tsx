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
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <div className="flex items-center justify-between mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-semibold text-zinc-900">Host a live game</h1>
        <Link
          href="/admin/games"
          className="px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors text-zinc-600"
        >
          Game history
        </Link>
      </div>

      <div className="bg-white border border-zinc-200 rounded-xl p-5 space-y-5">
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-2">Course</label>
          {courses.length === 0 ? (
            <p className="text-sm text-zinc-500">
              No courses yet — create one with quiz questions first.
            </p>
          ) : (
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id} disabled={c.question_count === 0}>
                  {c.title} ({c.question_count} question{c.question_count !== 1 ? "s" : ""})
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-2">
            Time limit per question
          </label>
          <div className="flex flex-wrap gap-2">
            {TIME_OPTIONS.map((t) => (
              <button
                key={t}
                onClick={() => setTimeLimit(t)}
                className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
                  timeLimit === t
                    ? "bg-zinc-900 text-white border-zinc-900"
                    : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400"
                }`}
              >
                {t}s
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          onClick={createGame}
          disabled={!selected || creating || (selectedCourse?.question_count ?? 0) === 0}
          className="w-full py-3 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 transition-colors disabled:opacity-40"
        >
          {creating ? "Creating…" : "Create game"}
        </button>
      </div>

      <p className="text-xs text-zinc-400 mt-4">
        Players join at <span className="font-mono">/join</span> with the game PIN — no account
        needed.
      </p>
    </div>
  );
}
