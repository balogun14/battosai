"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Course {
  id: string;
  title: string;
  description: string;
  slide_count: number;
  created_at: string;
}

export default function AdminPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [user, setUser] = useState<{ role: string } | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        setUser(data);
        if (data && data.role !== "admin") router.push("/");
      });

    fetch("/api/courses")
      .then((r) => r.json())
      .then((data) => setCourses(data.courses || []));
  }, [router]);

  if (!user) return null;
  if (user.role !== "admin") return null;

  const deleteCourse = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"?`)) return;
    await fetch(`/api/courses/${id}`, { method: "DELETE" });
    setCourses((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <div className="flex items-center justify-between mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-semibold text-zinc-900">Admin</h1>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/admin/prompts"
            className="px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors text-zinc-600"
          >
            Prompts
          </Link>
          <Link
            href="/admin/courses/new"
            className="px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            New Course
          </Link>
        </div>
      </div>

      {courses.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-zinc-300 rounded-xl">
          <p className="text-zinc-500 mb-4">No courses created yet</p>
          <Link
            href="/admin/courses/new"
            className="inline-block px-4 py-2 text-sm bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            Create Your First Course
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {courses.map((course) => (
            <div
              key={course.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 bg-white border border-zinc-200 rounded-xl group"
            >
              <div className="min-w-0">
                <h2 className="font-medium text-zinc-900 text-sm sm:text-base">{course.title}</h2>
                {course.description && (
                  <p className="text-sm text-zinc-500 mt-0.5 line-clamp-1">
                    {course.description}
                  </p>
                )}
                <span className="text-xs text-zinc-400 mt-1 block">
                  {course.slide_count} slide
                  {course.slide_count !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href={`/admin/courses/${course.id}`}
                  className="px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-md transition-colors"
                >
                  Edit
                </Link>
                <button
                  onClick={() => deleteCourse(course.id, course.title)}
                  className="px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
