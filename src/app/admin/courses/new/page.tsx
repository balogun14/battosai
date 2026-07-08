"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewCoursePage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);

    const res = await fetch("/api/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), description }),
    });

    if (res.ok) {
      const course = await res.json();
      router.push(`/admin/courses/${course.id}`);
    }
    setSaving(false);
  };

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <h1 className="text-xl sm:text-2xl font-semibold text-zinc-900 mb-6 sm:mb-8">
        New Course
      </h1>
      <form onSubmit={create} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1.5">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Introduction to Python"
            autoFocus
            className="w-full px-4 py-2.5 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent bg-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1.5">
            Description (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of the course..."
            rows={3}
            className="w-full px-4 py-2.5 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent bg-white resize-y"
          />
        </div>
        <button
          type="submit"
          disabled={saving || !title.trim()}
          className="w-full py-2.5 text-sm bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors disabled:opacity-50"
        >
          {saving ? "Creating..." : "Create Course"}
        </button>
      </form>
    </div>
  );
}
