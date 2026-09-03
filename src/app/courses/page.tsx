"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Course {
  id: string;
  title: string;
  description: string;
  slide_count: number;
  question_count: number;
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/courses")
      .then((r) => r.json())
      .then((data) => {
        setCourses(data.courses || []);
        setLoaded(true);
      });
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      <p className="eyebrow mb-2">Browse</p>
      <h1 className="display text-3xl sm:text-4xl text-ink mb-8 sm:mb-10">
        All courses
      </h1>

      {!loaded ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card p-5 space-y-3">
              <div className="skeleton h-5 w-2/5" />
              <div className="skeleton h-3.5 w-4/5" />
            </div>
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="card p-10 text-center">
          <h2 className="display text-xl text-ink mb-2">No courses yet</h2>
          <p className="text-sm text-ink-soft mb-6">
            Once courses are published they will show up here.
          </p>
          <Link href="/play" className="btn-ghost">
            Host a live game instead
          </Link>
        </div>
      ) : (
        <div className="space-y-3.5">
          {courses.map((course) => (
            <Link
              key={course.id}
              href={`/courses/${course.id}`}
              className="card card-hover block p-5 sm:p-6 group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="display text-lg sm:text-xl text-ink group-hover:text-accent-deep transition-colors duration-200">
                    {course.title}
                  </h2>
                  {course.description && (
                    <p className="text-sm text-ink-soft mt-1.5 line-clamp-2 leading-relaxed">
                      {course.description}
                    </p>
                  )}
                </div>
                <span
                  className="text-ink-faint group-hover:text-accent group-hover:translate-x-0.5 transition-all duration-200 shrink-0 mt-1"
                  aria-hidden
                >
                  →
                </span>
              </div>
              <div className="flex items-center gap-4 mt-4 pt-3.5 border-t border-line/70">
                <span className="text-xs text-ink-faint">
                  {course.slide_count} slide{course.slide_count !== 1 ? "s" : ""}
                </span>
                {!!course.question_count && (
                  <>
                    <span className="w-1 h-1 rounded-full bg-line-strong" aria-hidden />
                    <span className="text-xs text-ink-faint">
                      {course.question_count} quiz question
                      {course.question_count !== 1 ? "s" : ""}
                    </span>
                  </>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
