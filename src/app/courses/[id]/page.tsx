"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import QuizTimer from "@/components/QuizTimer";
import QuizQuestion from "@/components/QuizQuestion";

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

export default function CourseViewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [course, setCourse] = useState<{
    title: string;
    description: string;
    slides: Slide[];
  } | null>(null);
  const [currentSlideIdx, setCurrentSlideIdx] = useState(
    () => parseInt(searchParams.get("slide") || "0", 10)
  );
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [quizStarted, setQuizStarted] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<string, string>
  >({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [score, setScore] = useState<{
    score: number;
    total: number;
  } | null>(null);
  const [previousAttempt, setPreviousAttempt] = useState<{
    score: number;
    total: number;
    time_spent_seconds: number;
    answers: Record<string, string>;
  } | null>(null);
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [viewingAttempt, setViewingAttempt] = useState(
    searchParams.get("review") === "true"
  );
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    fetch(`/api/courses/${id}`)
      .then((r) => r.json())
      .then((data) => setCourse(data));
  }, [id]);

  const loadQuiz = useCallback(
    async (slideId: string) => {
      setLoadingQuiz(true);
      const res = await fetch(`/api/slides/${slideId}/quiz`);
      const data = await res.json();
      setQuiz(data.quiz);
      setPreviousAttempt(data.progress || null);
      setLoadingQuiz(false);
    },
    []
  );

  useEffect(() => {
    if (course?.slides[currentSlideIdx]) {
      loadQuiz(course.slides[currentSlideIdx].id);
      setQuizStarted(false);
      setSelectedAnswers({});
      setQuizSubmitted(false);
      setScore(null);
      setViewingAttempt(false);
    }
  }, [currentSlideIdx, course, loadQuiz]);

  const startQuiz = () => {
    setQuizStarted(true);
    setSelectedAnswers({});
    setQuizSubmitted(false);
    setViewingAttempt(false);
    startTimeRef.current = Date.now();
  };

  const handleSelect = (questionId: string, answer: string) => {
    if (quizSubmitted) return;
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const submitQuiz = async () => {
    if (!quiz) return;
    const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);

    const res = await fetch("/api/quizzes/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quiz_id: quiz.id,
        answers: selectedAnswers,
        time_spent_seconds: timeSpent,
      }),
    });

    const result = await res.json();
    setScore({ score: result.score, total: result.total });
    setQuizSubmitted(true);
    setPreviousAttempt({
      score: result.score,
      total: result.total,
      time_spent_seconds: timeSpent,
      answers: selectedAnswers,
    });
  };

  const handleTimeUp = () => {
    if (!quizSubmitted) {
      submitQuiz();
    }
  };

  const canSubmit =
    quizStarted && quiz && selectedAnswers && Object.keys(selectedAnswers).length === quiz.questions.length;

  if (!course) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-12">
        <p className="text-zinc-500">Loading...</p>
      </div>
    );
  }

  const currentSlide = course.slides[currentSlideIdx];
  const isLastSlide = currentSlideIdx === course.slides.length - 1;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <h1 className="text-xl sm:text-2xl font-semibold text-zinc-900 mb-6">
        {course.title}
      </h1>

      <div className="flex items-center gap-2 mb-6 sm:mb-8 overflow-x-auto pb-2">
        {course.slides.map((slide, i) => (
          <button
            key={slide.id}
            onClick={() => setCurrentSlideIdx(i)}
            className={`shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full text-xs font-mono flex items-center justify-center transition-colors ${
              i === currentSlideIdx
                ? "bg-zinc-900 text-white"
                : i < currentSlideIdx
                ? "bg-zinc-200 text-zinc-500"
                : "bg-zinc-100 text-zinc-400"
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>

          {currentSlide && (
        <div className="space-y-8 sm:space-y-10">
          <div>
            <h2 className="text-base sm:text-lg font-medium text-zinc-900 mb-3 sm:mb-4">
              {currentSlide.title}
            </h2>
            {currentSlide.content && (
              <div className="prose prose-sm text-zinc-600 max-w-none whitespace-pre-wrap">
                {currentSlide.content}
              </div>
            )}
          </div>

          {loadingQuiz ? (
            <p className="text-sm text-zinc-400">Loading quiz...</p>
          ) : quiz && quiz.questions.length > 0 ? (
            <div className="border-t border-zinc-200 pt-6 sm:pt-8 space-y-4 sm:space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-base sm:text-lg font-medium text-zinc-900">Quiz</h3>
                {quizStarted && !quizSubmitted && (
                  <QuizTimer
                    timeLimitSeconds={quiz.time_limit_seconds}
                    onTimeUp={handleTimeUp}
                    running={quizStarted && !quizSubmitted}
                  />
                )}
              </div>

              {previousAttempt && !quizStarted && (
                <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-lg space-y-2">
                  <p className="text-sm text-zinc-600">
                    Previous attempt:{" "}
                    <span className="font-medium">
                      {previousAttempt.score}/{previousAttempt.total}
                    </span>
                    {previousAttempt.total > 0 && (
                      <span className="text-zinc-400 ml-1">
                        ({Math.round((previousAttempt.score / previousAttempt.total) * 100)}%)
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-zinc-400">
                    Time: {previousAttempt.time_spent_seconds}s
                  </p>
                  <button
                    onClick={() => setViewingAttempt(!viewingAttempt)}
                    className="text-xs text-zinc-600 hover:text-zinc-900 underline underline-offset-2"
                  >
                    {viewingAttempt ? "Hide answers" : "View your answers"}
                  </button>
                </div>
              )}

              {viewingAttempt && previousAttempt && quiz && (
                <div className="space-y-4 sm:space-y-6">
                  {quiz.questions.map((q, i) => (
                    <QuizQuestion
                      key={q.id}
                      index={i}
                      question={q}
                      selectedAnswer={null}
                      onSelect={() => {}}
                      showResult={true}
                      userAnswer={previousAttempt.answers?.[q.id]}
                    />
                  ))}
                  <button
                    onClick={() => setViewingAttempt(false)}
                    className="text-sm text-zinc-600 hover:text-zinc-900 underline underline-offset-2"
                  >
                    Hide answers
                  </button>
                  <button
                    onClick={startQuiz}
                    className="px-6 py-2.5 text-sm bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors ml-4"
                  >
                    Retake Quiz
                  </button>
                </div>
              )}

              {!quizStarted && !quizSubmitted && !viewingAttempt && (
                <button
                  onClick={startQuiz}
                  className="px-6 py-2.5 text-sm bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors"
                >
                  {previousAttempt ? "Retake Quiz" : "Start Quiz"}
                </button>
              )}

              {quizStarted &&
                !viewingAttempt &&
                quiz.questions.map((q, i) => (
                  <QuizQuestion
                    key={q.id}
                    index={i}
                    question={q}
                    selectedAnswer={selectedAnswers[q.id] || null}
                    onSelect={handleSelect}
                    showResult={quizSubmitted}
                    userAnswer={
                      previousAttempt?.answers?.[q.id]
                    }
                  />
                ))}

              {quizStarted && !quizSubmitted && (
                <button
                  onClick={submitQuiz}
                  disabled={!canSubmit}
                  className="px-6 py-2.5 text-sm bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors disabled:opacity-40"
                >
                  Submit Answers
                </button>
              )}

              {quizSubmitted && score && (
                <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-lg">
                  <p className="text-sm text-zinc-900 font-medium">
                    Score: {score.score}/{score.total}
                    {score.total > 0 &&
                      ` (${Math.round(
                        (score.score / score.total) * 100
                      )}%)`}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-zinc-400">No quiz for this slide.</p>
          )}

          <div className="flex items-center justify-between pt-8 border-t border-zinc-200">
            <button
              onClick={() => setCurrentSlideIdx((i) => Math.max(0, i - 1))}
              disabled={currentSlideIdx === 0}
              className="px-4 py-2 text-sm text-zinc-600 hover:text-zinc-900 disabled:opacity-30 transition-colors"
            >
              &larr; Previous
            </button>
            <span className="text-xs text-zinc-400">
              {currentSlideIdx + 1} / {course.slides.length}
            </span>
            {isLastSlide ? (
              <button
                onClick={() => router.push("/progress")}
                className="px-4 py-2 text-sm bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors"
              >
                Finish Course
              </button>
            ) : (
              <button
                onClick={() => setCurrentSlideIdx((i) => i + 1)}
                className="px-4 py-2 text-sm text-zinc-600 hover:text-zinc-900 transition-colors"
              >
                Next &rarr;
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
