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
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
      <p className="eyebrow mb-2">New</p>
      <h1 className="display text-3xl sm:text-4xl text-ink mb-8 sm:mb-10">
        Create a course
      </h1>

      <form onSubmit={create} className="card p-6 sm:p-7 space-y-5">
        <div>
          <label htmlFor="title" className="eyebrow block mb-2">
            Title
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Introduction to Python"
            autoFocus
            className="field"
          />
        </div>
        <div>
          <label htmlFor="desc" className="eyebrow block mb-2">
            Description <span className="normal-case tracking-normal">(optional)</span>
          </label>
          <textarea
            id="desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A short summary learners will see on the course card."
            rows={3}
            className="field resize-y"
          />
        </div>
        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={saving || !title.trim()}
            className="btn-primary"
          >
            {saving ? "Creating…" : "Create course"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="btn-ghost"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
