"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Course {
  id: string;
  title: string;
  description: string;
  slide_count: number;
  question_count: number;
  created_at: string;
}

function CourseCardSkeleton() {
  return (
    <div className="card p-5 space-y-3">
      <div className="skeleton h-5 w-2/5" />
      <div className="skeleton h-3.5 w-4/5" />
      <div className="skeleton h-3 w-1/4" />
    </div>
  );
}

export default function HomePage() {
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
      <p className="eyebrow mb-2">Your library</p>
      <h1 className="display text-3xl sm:text-4xl text-ink mb-8 sm:mb-10">
        Pick up where you left off
      </h1>

      {!loaded ? (
        <div className="space-y-3">
          <CourseCardSkeleton />
          <CourseCardSkeleton />
          <CourseCardSkeleton />
        </div>
      ) : courses.length === 0 ? (
        <div className="card p-10 text-center">
          <span className="display text-5xl text-line-strong" aria-hidden>
            ∅
          </span>
          <h2 className="display text-xl text-ink mt-4 mb-2">Nothing here yet</h2>
          <p className="text-sm text-ink-soft mb-6 max-w-sm mx-auto">
            Courses appear here once an admin creates them. Admins can build
            courses by hand or generate them with the agent API.
          </p>
          <Link href="/admin" className="btn-primary">
            Go to admin
          </Link>
        </div>
      ) : (
        <div className="space-y-3.5">
          {courses.map((course, i) => (
            <Link
              key={course.id}
              href={`/courses/${course.id}`}
              className="card card-hover block p-5 sm:p-6 group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <span className="font-mono text-xs text-ink-faint">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h2 className="display text-lg sm:text-xl text-ink mt-1 group-hover:text-accent-deep transition-colors duration-200">
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
