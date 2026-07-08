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

export default function ProgressPage() {
  const [progress, setProgress] = useState<ProgressItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/progress")
      .then((r) => r.json())
      .then((data) => {
        setProgress(data.progress || []);
        setStats(data.stats || null);
      });
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <h1 className="text-xl sm:text-2xl font-semibold text-zinc-900 mb-6 sm:mb-8">
        Your Progress
      </h1>

      {stats && (
        <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-8 sm:mb-10">
          <div className="p-3 sm:p-4 bg-white border border-zinc-200 rounded-xl">
            <p className="text-lg sm:text-2xl font-semibold text-zinc-900">
              {stats.quizzesCompleted}
            </p>
            <p className="text-xs text-zinc-500 mt-1">Quizzes Done</p>
          </div>
          <div className="p-3 sm:p-4 bg-white border border-zinc-200 rounded-xl">
            <p className="text-lg sm:text-2xl font-semibold text-zinc-900">
              {stats.totalQuizzes}
            </p>
            <p className="text-xs text-zinc-500 mt-1">Total Quizzes</p>
          </div>
          <div className="p-3 sm:p-4 bg-white border border-zinc-200 rounded-xl">
            <p className="text-lg sm:text-2xl font-semibold text-zinc-900">
              {stats.totalCourses}
            </p>
            <p className="text-xs text-zinc-500 mt-1">Total Courses</p>
          </div>
        </div>
      )}

      {progress.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-zinc-300 rounded-xl">
          <p className="text-zinc-500 mb-3">No quiz attempts yet</p>
          <Link
            href="/courses"
            className="inline-block px-4 py-2 text-sm bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            Browse Courses
          </Link>
        </div>
      ) : (
        <div className="space-y-2 sm:space-y-3">
          {progress.map((item) => (
            <Link
              key={item.id}
              href={`/courses/${item.course_id}?review=true&slide=${item.slide_order}`}
              className="flex items-center justify-between gap-3 p-4 sm:p-5 bg-white border border-zinc-200 rounded-xl hover:border-zinc-400 transition-colors"
            >
              <div className="min-w-0">
                <h3 className="font-medium text-zinc-900 text-sm">
                  {item.slide_title}
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5 truncate">
                  {item.course_title}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-medium text-zinc-900">
                  {item.score}/{item.total}
                  {item.total > 0 && (
                    <span className="text-zinc-400 font-normal ml-1">
                      ({Math.round((item.score / item.total) * 100)}%)
                    </span>
                  )}
                </p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {item.time_spent_seconds}s
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
