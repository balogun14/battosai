"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Course {
  id: string;
  title: string;
  description: string;
  slide_count: number;
  question_count: number;
  created_at: string;
}

export default function AdminPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loaded, setLoaded] = useState(false);
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
      .then((data) => {
        setCourses(data.courses || []);
        setLoaded(true);
      });
  }, [router]);

  if (!user) return null;
  if (user.role !== "admin") return null;

  const deleteCourse = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"?`)) return;
    await fetch(`/api/courses/${id}`, { method: "DELETE" });
    setCourses((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      <p className="eyebrow mb-2">Manage</p>
      <div className="flex items-end justify-between mb-8 sm:mb-10 gap-4 flex-wrap">
        <h1 className="display text-3xl sm:text-4xl text-ink">Admin</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/admin/games" className="btn-ghost">
            Games
          </Link>
          <Link href="/play" className="btn-ghost">
            Host game
          </Link>
          <Link href="/admin/prompts" className="btn-ghost">
            Prompts
          </Link>
          <Link href="/admin/courses/new" className="btn-primary">
            New course
          </Link>
        </div>
      </div>

      {!loaded ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="card p-5 space-y-3">
              <div className="skeleton h-5 w-1/3" />
              <div className="skeleton h-3.5 w-1/2" />
            </div>
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="card p-10 text-center">
          <h2 className="display text-xl text-ink mb-2">No courses created yet</h2>
          <p className="text-sm text-ink-soft mb-6 max-w-sm mx-auto">
            Build your first course by hand, or generate one with the agent API
            from the Prompts page.
          </p>
          <Link href="/admin/courses/new" className="btn-primary">
            Create your first course
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {courses.map((course) => (
            <div
              key={course.id}
              className="card card-hover flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5"
            >
              <div className="min-w-0">
                <h2 className="font-medium text-ink text-sm sm:text-base">
                  {course.title}
                </h2>
                {course.description && (
                  <p className="text-sm text-ink-soft mt-0.5 line-clamp-1">
                    {course.description}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-xs text-ink-faint">
                    {course.slide_count} slide
                    {course.slide_count !== 1 ? "s" : ""}
                  </span>
                  {!!course.question_count && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-line-strong" aria-hidden />
                      <span className="text-xs text-ink-faint">
                        {course.question_count} question
                        {course.question_count !== 1 ? "s" : ""}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Link
                  href={`/admin/courses/${course.id}`}
                  className="px-3 py-1.5 text-sm text-ink-soft hover:text-ink hover:bg-black/[0.04] rounded-md transition-colors"
                >
                  Edit
                </Link>
                <button
                  onClick={() => deleteCourse(course.id, course.title)}
                  className="px-3 py-1.5 text-sm text-red-700 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
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
