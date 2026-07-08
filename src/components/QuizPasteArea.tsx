"use client";

import { useState } from "react";

interface QuizPasteAreaProps {
  onImport: (questions: {
    question_text: string;
    options: string[];
    correct_answer: string;
    explanation: string;
  }[]) => void;
}

export default function QuizPasteArea({ onImport }: QuizPasteAreaProps) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  const parseQuestions = () => {
    try {
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) throw new Error("Expected an array");

      for (const q of parsed) {
        if (!q.question_text) throw new Error("Each question needs question_text");
        if (!Array.isArray(q.options) || q.options.length < 2)
          throw new Error("Each question needs at least 2 options");
        if (!q.correct_answer)
          throw new Error("Each question needs correct_answer");
      }

      onImport(parsed);
      setText("");
      setError("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Invalid format");
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setError("");
          }}
          placeholder={`Paste JSON questions here...\n\n[\n  {\n    "question_text": "What is...",\n    "options": ["A", "B", "C", "D"],\n    "correct_answer": "B",\n    "explanation": "Because..."\n  }\n]`}
          className="w-full h-48 p-4 text-sm font-mono border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent resize-y"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
      <button
        onClick={parseQuestions}
        className="px-4 py-2 text-sm bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors"
      >
        Import Questions
      </button>
    </div>
  );
}
