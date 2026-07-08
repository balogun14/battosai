"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import QuizPasteArea from "@/components/QuizPasteArea";

interface Slide {
  id: string;
  title: string;
  content: string;
  order_num: number;
}

interface QuizData {
  id: string;
  time_limit_seconds: number;
  questions: {
    id: string;
    question_text: string;
    options: string[];
    correct_answer: string;
    explanation: string;
    order_num: number;
  }[];
}

export default function EditCoursePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [course, setCourse] = useState<{
    title: string;
    description: string;
    slides: Slide[];
  } | null>(null);
  const [editingSlide, setEditingSlide] = useState<Slide | null>(null);
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [quizTimeLimit, setQuizTimeLimit] = useState(300);

  useEffect(() => {
    fetch(`/api/courses/${id}`)
      .then((r) => r.json())
      .then((data) => setCourse(data));
  }, [id]);

  const addSlide = async () => {
    const res = await fetch(`/api/courses/${id}/slides`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "New Slide" }),
    });
    if (res.ok) {
      const slide = await res.json();
      setCourse((prev) =>
        prev ? { ...prev, slides: [...prev.slides, slide] } : prev
      );
    }
  };

  const updateSlide = async (slideId: string, data: Partial<Slide>) => {
    await fetch(`/api/slides/${slideId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setCourse((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        slides: prev.slides.map((s) =>
          s.id === slideId ? { ...s, ...data } : s
        ),
      };
    });
  };

  const deleteSlide = async (slideId: string) => {
    if (!confirm("Delete this slide?")) return;
    await fetch(`/api/slides/${slideId}`, { method: "DELETE" });
    setCourse((prev) =>
      prev
        ? { ...prev, slides: prev.slides.filter((s) => s.id !== slideId) }
        : prev
    );
    if (editingSlide?.id === slideId) {
      setEditingSlide(null);
      setQuizData(null);
    }
  };

  const loadQuiz = async (slideId: string) => {
    const res = await fetch(`/api/slides/${slideId}/quiz`);
    const data = await res.json();
    setQuizData(data.quiz);
    setQuizTimeLimit(data.quiz?.time_limit_seconds || 300);
  };

  const saveQuiz = async () => {
    if (!editingSlide) return;
    await fetch(`/api/slides/${editingSlide.id}/quiz`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        time_limit_seconds: quizTimeLimit,
        questions: quizData?.questions || [],
      }),
    });
  };

  const handleQuizImport = (
    questions: {
      question_text: string;
      options: string[];
      correct_answer: string;
      explanation: string;
    }[]
  ) => {
    const newQuestions = questions.map((q, i) => ({
      id: crypto.randomUUID(),
      ...q,
      order_num: i,
    }));
    setQuizData((prev) =>
      prev ? { ...prev, questions: newQuestions } : prev
    );
  };

  const removeQuestion = (qId: string) => {
    setQuizData((prev) =>
      prev
        ? { ...prev, questions: prev.questions.filter((q) => q.id !== qId) }
        : prev
    );
  };

  if (!course) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12">
        <p className="text-zinc-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <div className="flex items-center gap-4 mb-6 sm:mb-8">
        <Link
          href="/admin"
          className="text-sm text-zinc-400 hover:text-zinc-600 transition-colors shrink-0"
        >
          &larr; Admin
        </Link>
        <h1 className="text-xl sm:text-2xl font-semibold text-zinc-900 truncate">{course.title}</h1>
      </div>

      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2 lg:hidden">
        <span className="text-xs text-zinc-400 shrink-0 mr-1">Slides:</span>
        {course.slides.map((slide) => (
          <button
            key={slide.id}
            onClick={() => {
              setEditingSlide(slide);
              loadQuiz(slide.id);
            }}
            className={`shrink-0 px-2.5 py-1 rounded-md text-xs transition-colors ${
              editingSlide?.id === slide.id
                ? "bg-zinc-900 text-white"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            {slide.order_num + 1}. {slide.title}
          </button>
        ))}
        <button
          onClick={addSlide}
          className="shrink-0 px-2.5 py-1 rounded-md text-xs border border-dashed border-zinc-300 text-zinc-400 hover:text-zinc-600 hover:border-zinc-400 transition-colors"
        >
          + Add
        </button>
      </div>

      <div className="lg:grid lg:grid-cols-[240px_1fr] lg:gap-8">
        <div className="hidden lg:block space-y-1">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-zinc-700">Slides</h2>
            <button
              onClick={addSlide}
              className="text-xs text-zinc-500 hover:text-zinc-900 transition-colors"
            >
              + Add
            </button>
          </div>
          {course.slides.map((slide) => (
            <button
              key={slide.id}
              onClick={() => {
                setEditingSlide(slide);
                loadQuiz(slide.id);
              }}
              className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                editingSlide?.id === slide.id
                  ? "bg-zinc-100 text-zinc-900"
                  : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
              }`}
            >
              <span className="text-xs text-zinc-400 mr-1 font-mono">
                {slide.order_num + 1}.
              </span>
              {slide.title}
            </button>
          ))}
          {course.slides.length === 0 && (
            <p className="text-sm text-zinc-400 px-3 py-4">No slides yet. Click + Add to create one.</p>
          )}
        </div>

        <div>
          {editingSlide ? (
            <div className="space-y-8">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-zinc-900">
                    Slide Content
                  </h3>
                  <button
                    onClick={() => deleteSlide(editingSlide.id)}
                    className="text-xs text-red-500 hover:text-red-700 transition-colors"
                  >
                    Delete Slide
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={editingSlide.title}
                    onChange={(e) =>
                      updateSlide(editingSlide.id, { title: e.target.value })
                    }
                    className="w-full px-4 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">
                    Content
                  </label>
                  <textarea
                    value={editingSlide.content}
                    onChange={(e) =>
                      updateSlide(editingSlide.id, { content: e.target.value })
                    }
                    rows={6}
                    className="w-full px-4 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent bg-white resize-y"
                  />
                </div>
              </div>

              <div className="border-t border-zinc-200 pt-8 space-y-4">
                <h3 className="text-lg font-medium text-zinc-900">
                  Quiz Questions
                </h3>

                <div className="flex items-center gap-4">
                  <div>
                    <label className="block text-xs text-zinc-500 mb-1">
                      Time Limit (seconds)
                    </label>
                    <input
                      type="number"
                      value={quizTimeLimit}
                      onChange={(e) =>
                        setQuizTimeLimit(Number(e.target.value))
                      }
                      className="w-24 px-3 py-1.5 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent bg-white"
                    />
                  </div>
                  <button
                    onClick={saveQuiz}
                    className="px-4 py-1.5 text-sm bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors mt-auto"
                  >
                    Save Quiz
                  </button>
                </div>

                <QuizPasteArea onImport={handleQuizImport} />

                {quizData && quizData.questions.length > 0 && (
                  <div className="space-y-4 mt-4">
                    <p className="text-sm text-zinc-500">
                      {quizData.questions.length} question
                      {quizData.questions.length !== 1 ? "s" : ""}
                    </p>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {quizData.questions.map((q, i) => (
                        <div
                          key={q.id}
                          className="p-4 border border-zinc-200 rounded-lg bg-white"
                        >
                          <div className="flex items-start justify-between">
                            <p className="text-sm font-medium text-zinc-900">
                              <span className="text-zinc-400 mr-1">
                                {i + 1}.
                              </span>
                              {q.question_text}
                            </p>
                            <button
                              onClick={() => removeQuestion(q.id)}
                              className="text-xs text-red-400 hover:text-red-600 ml-2 shrink-0"
                            >
                              Remove
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {q.options.map((opt, j) => (
                              <span
                                key={j}
                                className={`px-2 py-0.5 text-xs rounded font-mono ${
                                  opt === q.correct_answer
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-zinc-100 text-zinc-500"
                                }`}
                              >
                                {opt}
                              </span>
                            ))}
                          </div>
                          {q.explanation && (
                            <p className="text-xs text-zinc-400 mt-2 italic">
                              {q.explanation}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-zinc-400">
              <p>Select a slide to edit</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
