"use client";

import Link from "next/link";
import { useState } from "react";

const PROMPT_TEMPLATE = `Create quiz questions for the following slide content. Output ONLY valid JSON array, no other text.

Format:
[
  {
    "question_text": "...",
    "options": ["A", "B", "C", "D"],
    "correct_answer": "B",
    "explanation": "Why B is correct"
  }
]

Slide Content:
[TITLE]
[CONTENT]

Requirements:
- 4 multiple choice questions
- Each with exactly 4 options
- Include brief explanations
- One clearly correct answer per question`;

export default function PromptGuidePage() {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(PROMPT_TEMPLATE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <div className="flex items-center gap-4 mb-6 sm:mb-8">
        <Link
          href="/admin"
          className="text-sm text-zinc-400 hover:text-zinc-600 transition-colors"
        >
          &larr; Admin
        </Link>
        <h1 className="text-xl sm:text-2xl font-semibold text-zinc-900">Prompt Guide</h1>
      </div>

      <div className="space-y-8 sm:space-y-10">
        <div>
          <h2 className="text-base sm:text-lg font-medium text-zinc-900 mb-2 sm:mb-3">
            How to generate quiz questions
          </h2>
          <ol className="space-y-3 text-sm text-zinc-600 list-decimal list-inside">
            <li>
              Copy the template below and paste it into Claude, ChatGPT, or
              your AI of choice
            </li>
            <li>
              Replace <code className="bg-zinc-100 px-1.5 py-0.5 rounded text-xs font-mono">
                [TITLE]
              </code>{" "}
              and{" "}
              <code className="bg-zinc-100 px-1.5 py-0.5 rounded text-xs font-mono">
                [CONTENT]
              </code>{" "}
              with your slide&apos;s title and content
            </li>
            <li>
              Copy the JSON output from the AI
            </li>
            <li>
              Go to the slide editor, paste the JSON into the import box, and
              click &quot;Import Questions&quot;
            </li>
          </ol>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-medium text-zinc-900">
              Prompt template
            </h2>
            <button
              onClick={copy}
              className="text-xs text-zinc-500 hover:text-zinc-900 transition-colors"
            >
              {copied ? "Copied!" : "Copy template"}
            </button>
          </div>
          <pre className="p-5 bg-zinc-900 text-zinc-100 rounded-xl text-sm font-mono whitespace-pre-wrap leading-relaxed overflow-x-auto">
            {PROMPT_TEMPLATE}
          </pre>
        </div>

        <div>
          <h2 className="text-lg font-medium text-zinc-900 mb-3">
            Expected JSON format
          </h2>
          <pre className="p-5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-mono whitespace-pre-wrap leading-relaxed overflow-x-auto text-zinc-700">
{`[
  {
    "question_text": "What is the capital of France?",
    "options": ["London", "Paris", "Berlin", "Madrid"],
    "correct_answer": "Paris",
    "explanation": "Paris has been France's capital since the 10th century."
  },
  {
    "question_text": "Which river runs through Paris?",
    "options": ["Thames", "Danube", "Seine", "Rhine"],
    "correct_answer": "Seine",
    "explanation": "The Seine flows through the heart of Paris."
  }
]`}
          </pre>
          <ul className="mt-4 space-y-2 text-sm text-zinc-500">
            <li>
              <code className="bg-zinc-100 px-1 py-0.5 rounded text-xs font-mono">
                question_text
              </code>
              {" "}— The question (required)
            </li>
            <li>
              <code className="bg-zinc-100 px-1 py-0.5 rounded text-xs font-mono">
                options
              </code>
              {" "}— Array of 2-6 possible answers (required)
            </li>
            <li>
              <code className="bg-zinc-100 px-1 py-0.5 rounded text-xs font-mono">
                correct_answer
              </code>
              {" "}— Must match one option exactly (required)
            </li>
            <li>
              <code className="bg-zinc-100 px-1 py-0.5 rounded text-xs font-mono">
                explanation
              </code>
              {" "}— Shown after answering (optional)
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
