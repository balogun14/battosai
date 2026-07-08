"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Course {
  id: string;
  title: string;
  description: string;
  slide_count: number;
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    fetch("/api/courses")
      .then((r) => r.json())
      .then((data) => setCourses(data.courses || []));
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <h1 className="text-xl sm:text-2xl font-semibold text-zinc-900 mb-6 sm:mb-8">Courses</h1>

      {courses.length === 0 ? (
        <p className="text-zinc-500">No courses available yet.</p>
      ) : (
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
              <span className="text-xs text-zinc-400 mt-2 block">
                {course.slide_count} slide
                {course.slide_count !== 1 ? "s" : ""}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
