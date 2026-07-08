"use client";

import Link from "next/link";
import { useState } from "react";

const API_URL = process.env.NODE_ENV === "production"
  ? "https://YOUR_VERCEL_DOMAIN.vercel.app"
  : "http://localhost:3000";

const AGENT_PROMPT = `You are a course creation agent. You create courses, slides, and quizzes by calling the Study Pack API.

API endpoint: POST ${API_URL}/api/agent/create
Header: x-api-key: YOUR_API_KEY

For the following topic, output the JSON body for the API call. Output ONLY valid JSON, no other text.

Topic: [TOPIC]
Number of slides: [COUNT]
Questions per quiz: [N]

JSON structure:
{
  "course": {
    "title": "Course title",
    "description": "Course description (optional)"
  },
  "slides": [
    {
      "title": "Slide title",
      "content": "Learning content for this slide",
      "quiz": {
        "time_limit_seconds": 300,
        "questions": [
          {
            "question_text": "Question?",
            "options": ["A", "B", "C", "D"],
            "correct_answer": "B",
            "explanation": "Why B is correct"
          }
        ]
      }
    }
  ]
}`;

const QUIZ_PROMPT = `Create quiz questions for the following slide content. Output ONLY valid JSON array, no other text.

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

const CURL_EXAMPLE = `curl -X POST ${API_URL}/api/agent/create \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{
    "course": {
      "title": "Introduction to Python"
    },
    "slides": [
      {
        "title": "Variables",
        "content": "Variables store data in memory...",
        "quiz": {
          "time_limit_seconds": 300,
          "questions": [
            {
              "question_text": "What keyword creates a variable?",
              "options": ["var", "let", "def", "None, you just assign"],
              "correct_answer": "None, you just assign",
              "explanation": "Python uses dynamic typing - just assign a value."
            }
          ]
        }
      }
    ]
  }'`;

export default function PromptGuidePage() {
  const [copiedAgent, setCopiedAgent] = useState(false);
  const [copiedQuiz, setCopiedQuiz] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);

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

      <div className="space-y-12">
        {/* Agent API - full course creation */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="px-2 py-0.5 text-xs rounded bg-zinc-900 text-white font-medium">
              Recommended
            </span>
            <h2 className="text-base sm:text-lg font-medium text-zinc-900">
              One-shot: AI creates the entire course
            </h2>
          </div>
          <p className="text-sm text-zinc-500 mb-4">
            Give this prompt to your AI. It creates the course, slides, and quizzes all at once by
            calling the API directly. No copy-pasting between tools.
          </p>

          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-zinc-700">Agent prompt</h3>
            <button
              onClick={() => {
                navigator.clipboard.writeText(AGENT_PROMPT);
                setCopiedAgent(true);
                setTimeout(() => setCopiedAgent(false), 2000);
              }}
              className="text-xs text-zinc-500 hover:text-zinc-900 transition-colors"
            >
              {copiedAgent ? "Copied!" : "Copy prompt"}
            </button>
          </div>
          <pre className="p-5 bg-zinc-900 text-zinc-100 rounded-xl text-sm font-mono whitespace-pre-wrap leading-relaxed overflow-x-auto">
            {AGENT_PROMPT}
          </pre>

          <h3 className="text-sm font-medium text-zinc-700 mt-6 mb-2">
            cURL example
          </h3>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-zinc-400">Test it yourself:</span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(CURL_EXAMPLE);
                setCopiedCurl(true);
                setTimeout(() => setCopiedCurl(false), 2000);
              }}
              className="text-xs text-zinc-500 hover:text-zinc-900 transition-colors"
            >
              {copiedCurl ? "Copied!" : "Copy"}
            </button>
          </div>
          <pre className="p-5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-mono whitespace-pre-wrap leading-relaxed overflow-x-auto text-zinc-700">
            {CURL_EXAMPLE}
          </pre>
        </div>

        {/* Setup instructions */}
        <div className="p-5 border border-zinc-200 rounded-xl bg-zinc-50">
          <h2 className="text-base font-medium text-zinc-900 mb-3">
            Setup for your AI agent
          </h2>
          <ol className="space-y-2 text-sm text-zinc-600 list-decimal list-inside">
            <li>
              Set the env var <code className="bg-zinc-100 px-1 py-0.5 rounded text-xs font-mono">AGENT_API_KEY</code> in Vercel
              <br />
              <span className="text-zinc-400 text-xs ml-5">
                Generate one: <code className="bg-zinc-100 px-1 rounded">openssl rand -hex 24</code>
              </span>
            </li>
            <li>
              In your AI tool (Claude, ChatGPT, etc.), create a custom instruction or system
              prompt telling it:
              <br />
              <span className="text-zinc-400 text-xs ml-5">
                &quot;When I ask you to create a course, call POST [YOUR_URL]/api/agent/create with
                header x-api-key: [YOUR_KEY].&quot;
              </span>
            </li>
            <li>
              Then just say: &quot;Create a 5-slide course about React hooks with 4 quiz questions each&quot;
            </li>
          </ol>
        </div>

        {/* Manual paste - existing flow */}
        <div>
          <h2 className="text-base sm:text-lg font-medium text-zinc-900 mb-3">
            Manual: Paste quiz JSON into the editor
          </h2>
          <p className="text-sm text-zinc-500 mb-4">
            If you prefer copy-pasting, use this prompt to generate just quiz questions,
            then paste the JSON into the quiz editor on any slide.
          </p>

          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-zinc-700">Quiz prompt</h3>
            <button
              onClick={() => {
                navigator.clipboard.writeText(QUIZ_PROMPT);
                setCopiedQuiz(true);
                setTimeout(() => setCopiedQuiz(false), 2000);
              }}
              className="text-xs text-zinc-500 hover:text-zinc-900 transition-colors"
            >
              {copiedQuiz ? "Copied!" : "Copy prompt"}
            </button>
          </div>
          <pre className="p-5 bg-zinc-900 text-zinc-100 rounded-xl text-sm font-mono whitespace-pre-wrap leading-relaxed overflow-x-auto">
            {QUIZ_PROMPT}
          </pre>
        </div>

        {/* Expected JSON format */}
        <div>
          <h2 className="text-lg font-medium text-zinc-900 mb-3">
            Questions JSON format
          </h2>
          <pre className="p-5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-mono whitespace-pre-wrap leading-relaxed overflow-x-auto text-zinc-700">
{`[
  {
    "question_text": "What is the capital of France?",
    "options": ["London", "Paris", "Berlin", "Madrid"],
    "correct_answer": "Paris",
    "explanation": "Paris has been France's capital since the 10th century."
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
