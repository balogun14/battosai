"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Course {
  id: string;
  title: string;
  description: string;
  slide_count: number;
  created_at: string;
}

export default function HomePage() {
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    fetch("/api/courses")
      .then((r) => r.json())
      .then((data) => setCourses(data.courses || []));
  }, []);

  if (courses.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
        <h1 className="text-xl sm:text-2xl font-semibold text-zinc-900 mb-2">
          No courses yet
        </h1>
        <p className="text-zinc-500 mb-6">
          An admin needs to create a course before you can start learning.
        </p>
        <Link
          href="/admin"
          className="inline-block px-4 py-2 text-sm bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors"
        >
          Go to Admin
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <h1 className="text-xl sm:text-2xl font-semibold text-zinc-900 mb-6 sm:mb-8">Your Courses</h1>
      <div className="space-y-3">
        {courses.map((course) => (
          <Link
            key={course.id}
            href={`/courses/${course.id}`}
            className="block p-4 sm:p-5 bg-white border border-zinc-200 rounded-xl hover:border-zinc-400 transition-colors"
          >
            <h2 className="font-medium text-zinc-900 text-sm sm:text-base">{course.title}</h2>
            {course.description && (
              <p className="text-sm text-zinc-500 mt-1 line-clamp-2">
                {course.description}
              </p>
            )}
            <div className="flex items-center gap-4 mt-3">
              <span className="text-xs text-zinc-400">
                {course.slide_count} slide{course.slide_count !== 1 ? "s" : ""}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
