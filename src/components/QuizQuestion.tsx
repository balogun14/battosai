"use client";

import { useState } from "react";

interface QuizQuestionProps {
  index: number;
  question: {
    id: string;
    question_text: string;
    options: string[];
    correct_answer: string;
    explanation: string;
  };
  selectedAnswer: string | null;
  onSelect: (questionId: string, answer: string) => void;
  showResult?: boolean;
  userAnswer?: string;
}

export default function QuizQuestion({
  index,
  question,
  selectedAnswer,
  onSelect,
  showResult,
  userAnswer,
}: QuizQuestionProps) {
  const labels = ["A", "B", "C", "D", "E", "F"];
  const displayAnswer = showResult ? userAnswer : selectedAnswer;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-zinc-900">
        <span className="text-zinc-400 font-mono text-sm mr-2">
          {index + 1}.
        </span>
        {question.question_text}
      </h3>

      <div className="space-y-2">
        {question.options.map((option, i) => {
          const isSelected = displayAnswer === option;
          const isCorrect = option === question.correct_answer;
          let classes =
            "w-full text-left px-4 py-3 rounded-lg border text-sm transition-all ";

          if (showResult) {
            if (isCorrect) {
              classes += "border-emerald-300 bg-emerald-50 text-emerald-800 ";
            } else if (isSelected && !isCorrect) {
              classes += "border-red-300 bg-red-50 text-red-800 ";
            } else {
              classes += "border-zinc-200 text-zinc-500 ";
            }
          } else {
            classes += isSelected
              ? "border-zinc-800 bg-zinc-900 text-white "
              : "border-zinc-200 hover:border-zinc-400 text-zinc-700 ";
          }

          return (
            <button
              key={option}
              onClick={() => !showResult && onSelect(question.id, option)}
              disabled={showResult}
              className={classes}
            >
              <span className="font-mono text-xs mr-2 opacity-60">
                {labels[i]}.
              </span>
              {option}
              {showResult && isCorrect && (
                <span className="ml-2 text-emerald-600 text-xs">Correct</span>
              )}
            </button>
          );
        })}
      </div>

      {showResult && question.explanation && (
        <div className="text-sm text-zinc-500 bg-zinc-50 rounded-lg p-3 mt-2">
          {question.explanation}
        </div>
      )}
    </div>
  );
}
