"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface ProgressItem {
  id: string;
  quiz_id: string;
  slide_title: string;
  course_title: string;
  course_id: string;
  slide_order: number;
  score: number;
  total: number;
  time_spent_seconds: number;
  completed_at: string;
}

interface Stats {
  quizzesCompleted: number;
  totalQuizzes: number;
  totalCourses: number;
}

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <div>
      <p className="display text-3xl sm:text-4xl text-ink tabular-nums">{value}</p>
      <p className="eyebrow mt-1.5">{label}</p>
    </div>
  );
}

export default function ProgressPage() {
  const [progress, setProgress] = useState<ProgressItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/progress")
      .then((r) => r.json())
      .then((data) => {
        setProgress(data.progress || []);
        setStats(data.stats || null);
        setLoaded(true);
      });
  }, []);

  const completion =
    stats && stats.totalQuizzes > 0
      ? Math.round((stats.quizzesCompleted / stats.totalQuizzes) * 100)
      : 0;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      <p className="eyebrow mb-2">Your learning</p>
      <h1 className="display text-3xl sm:text-4xl text-ink mb-8 sm:mb-10">
        Progress
      </h1>

      {!loaded ? (
        <div className="space-y-3">
          <div className="skeleton h-20 w-full" />
          <div className="skeleton h-16 w-full" />
          <div className="skeleton h-16 w-full" />
        </div>
      ) : (
        <>
          {stats && (
            <div className="card p-6 sm:p-7 mb-8 sm:mb-10">
              <div className="flex items-start justify-between gap-6 flex-wrap">
                <div className="flex gap-8 sm:gap-12">
                  <Stat value={stats.quizzesCompleted} label="Quizzes done" />
                  <Stat value={stats.totalQuizzes} label="Quizzes total" />
                  <Stat value={stats.totalCourses} label="Courses" />
                </div>
                <div className="text-right">
                  <p className="display text-3xl sm:text-4xl text-accent tabular-nums">
                    {completion}%
                  </p>
                  <p className="eyebrow mt-1.5">Catalog done</p>
                </div>
              </div>
              <div className="h-1.5 bg-line/70 rounded-full overflow-hidden mt-6">
                <div
                  className="h-full bg-accent rounded-full transition-all duration-700"
                  style={{ width: `${completion}%` }}
                />
              </div>
            </div>
          )}

          {progress.length === 0 ? (
            <div className="card p-10 text-center">
              <h2 className="display text-xl text-ink mb-2">No attempts yet</h2>
              <p className="text-sm text-ink-soft mb-6 max-w-sm mx-auto">
                Finish a quiz and your scores, timing, and completion will show
                up here.
              </p>
              <Link href="/courses" className="btn-primary">
                Browse courses
              </Link>
            </div>
          ) : (
            <div className="space-y-2.5">
              {progress.map((item) => {
                const pct =
                  item.total > 0
                    ? Math.round((item.score / item.total) * 100)
                    : 0;
                return (
                  <Link
                    key={item.id}
                    href={`/courses/${item.course_id}?review=true&slide=${item.slide_order}`}
                    className="card card-hover block p-4 sm:p-5"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="font-medium text-ink text-sm truncate">
                          {item.slide_title}
                        </h3>
                        <p className="text-xs text-ink-faint mt-0.5 truncate">
                          {item.course_title} · {item.time_spent_seconds}s
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-medium text-ink tabular-nums">
                          {item.score}/{item.total}
                          <span
                            className={`ml-2 font-normal ${
                              pct >= 70
                                ? "text-accent"
                                : pct >= 50
                                ? "text-ink-soft"
                                : "text-red-700"
                            }`}
                          >
                            {pct}%
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="h-1 bg-line/60 rounded-full overflow-hidden mt-3">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          pct >= 70
                            ? "bg-accent"
                            : pct >= 50
                            ? "bg-line-strong"
                            : "bg-red-400"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
