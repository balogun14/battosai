"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import QuizTimer from "@/components/QuizTimer";

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
  const [quizStep, setQuizStep] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState(false);
  const [quizDone, setQuizDone] = useState(false);
  const [score, setScore] = useState(0);
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

  const loadQuiz = useCallback(async (slideId: string) => {
    setLoadingQuiz(true);
    const res = await fetch(`/api/slides/${slideId}/quiz`);
    const data = await res.json();
    setQuiz(data.quiz);
    setPreviousAttempt(data.progress || null);
    setLoadingQuiz(false);
  }, []);

  useEffect(() => {
    if (course?.slides[currentSlideIdx]) {
      loadQuiz(course.slides[currentSlideIdx].id);
      setQuizStarted(false);
      setQuizStep(0);
      setSelectedAnswer(null);
      setAnswers({});
      setRevealed(false);
      setQuizDone(false);
      setScore(0);
      setViewingAttempt(false);
    }
  }, [currentSlideIdx, course, loadQuiz]);

  const startQuiz = () => {
    setQuizStarted(true);
    setQuizStep(0);
    setSelectedAnswer(null);
    setAnswers({});
    setRevealed(false);
    setQuizDone(false);
    setScore(0);
    setViewingAttempt(false);
    startTimeRef.current = Date.now();
  };

  const checkAnswer = () => {
    if (!quiz || !selectedAnswer) return;
    const currentQ = quiz.questions[quizStep];
    const isCorrect = selectedAnswer === currentQ.correct_answer;
    const newAnswers = { ...answers, [currentQ.id]: selectedAnswer };
    const newScore = score + (isCorrect ? 1 : 0);

    setAnswers(newAnswers);
    setScore(newScore);
    setRevealed(true);

    const isLast = quizStep === quiz.questions.length - 1;
    if (isLast) {
      submitAnswers(newAnswers, newScore);
    }
  };

  const submitAnswers = async (
    finalAnswers: Record<string, string>,
    finalScore: number
  ) => {
    if (!quiz) return;
    const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);

    const res = await fetch("/api/quizzes/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quiz_id: quiz.id,
        answers: finalAnswers,
        time_spent_seconds: timeSpent,
      }),
    });

    const result = await res.json();
    setScore(result.score);
    setQuizDone(true);
    setPreviousAttempt({
      score: result.score,
      total: result.total,
      time_spent_seconds: timeSpent,
      answers: finalAnswers,
    });
  };

  const nextQuestion = () => {
    setQuizStep((s) => s + 1);
    setSelectedAnswer(null);
    setRevealed(false);
  };

  const handleTimeUp = () => {
    if (!quizDone && !revealed) {
      if (quiz) {
        const finalAnswers = { ...answers };
        submitAnswers(finalAnswers, score);
      }
      setQuizDone(true);
    }
  };

  if (!course) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <p className="text-zinc-500">Loading...</p>
      </div>
    );
  }

  const currentSlide = course.slides[currentSlideIdx];
  const isLastSlide = currentSlideIdx === course.slides.length - 1;
  const currentQ = quiz?.questions[quizStep];
  const totalQuestions = quiz?.questions.length || 0;
  const labels = ["A", "B", "C", "D", "E", "F"];

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
              {/* Header with timer and progress */}
              <div className="flex items-center justify-between">
                <h3 className="text-base sm:text-lg font-medium text-zinc-900">
                  Quiz
                </h3>
                {quizStarted && !quizDone && (
                  <QuizTimer
                    timeLimitSeconds={quiz.time_limit_seconds}
                    onTimeUp={handleTimeUp}
                    running={quizStarted && !quizDone}
                  />
                )}
              </div>

              {/* Previous attempt summary */}
              {previousAttempt && !quizStarted && !viewingAttempt && (
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
                    onClick={() => setViewingAttempt(true)}
                    className="text-xs text-zinc-600 hover:text-zinc-900 underline underline-offset-2"
                  >
                    View your answers
                  </button>
                </div>
              )}

              {/* Review mode: all questions with results */}
              {viewingAttempt && previousAttempt && quiz && (
                <div className="space-y-6">
                  {quiz.questions.map((q, i) => {
                    const userAnswer = previousAttempt.answers?.[q.id];
                    const isCorrect = userAnswer === q.correct_answer;
                    return (
                      <div key={q.id} className="space-y-3">
                        <h4 className="text-sm font-medium text-zinc-900">
                          <span className="text-zinc-400 font-mono text-xs mr-1">
                            {i + 1}.
                          </span>
                          {q.question_text}
                        </h4>
                        <div className="space-y-1.5">
                          {q.options.map((opt, j) => {
                            const chosen = userAnswer === opt;
                            const correct = opt === q.correct_answer;
                            let cls =
                              "w-full text-left px-3 py-2 rounded-md text-sm ";
                            if (correct) {
                              cls += "bg-emerald-50 border border-emerald-200 text-emerald-800 ";
                            } else if (chosen && !correct) {
                              cls += "bg-red-50 border border-red-200 text-red-800 ";
                            } else {
                              cls += "text-zinc-400 ";
                            }
                            return (
                              <div key={opt} className={cls}>
                                <span className="font-mono text-xs mr-2 opacity-60">
                                  {labels[j]}.
                                </span>
                                {opt}
                                {correct && (
                                  <span className="ml-2 text-emerald-600 text-xs">
                                    Correct
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        {q.explanation && (
                          <p className="text-xs text-zinc-400 bg-zinc-50 rounded-md p-3">
                            {q.explanation}
                          </p>
                        )}
                      </div>
                    );
                  })}
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setViewingAttempt(false)}
                      className="text-sm text-zinc-600 hover:text-zinc-900 underline underline-offset-2"
                    >
                      Hide answers
                    </button>
                    <button
                      onClick={startQuiz}
                      className="px-5 py-2 text-sm bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors"
                    >
                      Retake Quiz
                    </button>
                  </div>
                </div>
              )}

              {/* Quiz done: results summary */}
              {quizDone && !viewingAttempt && (
                <div className="space-y-6">
                  <div className="p-5 bg-zinc-50 border border-zinc-200 rounded-xl text-center">
                    <p className="text-lg font-semibold text-zinc-900">
                      {score}/{totalQuestions} correct
                      {totalQuestions > 0 &&
                        ` · ${Math.round((score / totalQuestions) * 100)}%`}
                    </p>
                    <p className="text-xs text-zinc-400 mt-1">
                      {score === totalQuestions
                        ? "Perfect!"
                        : score >= totalQuestions * 0.7
                        ? "Great job!"
                        : score >= totalQuestions * 0.5
                        ? "Keep going!"
                        : "You'll get it next time."}
                    </p>
                  </div>

                  <div className="space-y-4">
                    {quiz.questions.map((q, i) => {
                      const userAnswer = answers[q.id];
                      const isCorrect = userAnswer === q.correct_answer;
                      return (
                        <div
                          key={q.id}
                          className={`p-4 rounded-lg border ${
                            isCorrect
                              ? "border-emerald-200 bg-emerald-50/50"
                              : "border-red-200 bg-red-50/50"
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <span className="font-mono text-xs mt-0.5 shrink-0 text-zinc-500">
                              {i + 1}.
                            </span>
                            <div className="space-y-2 min-w-0">
                              <p className="text-sm font-medium text-zinc-900">
                                {q.question_text}
                              </p>
                              <p className="text-xs">
                                <span className="text-zinc-400">
                                  Your answer:{" "}
                                </span>
                                <span
                                  className={
                                    isCorrect
                                      ? "text-emerald-700"
                                      : "text-red-700"
                                  }
                                >
                                  {userAnswer || "(not answered)"}
                                </span>
                              </p>
                              {!isCorrect && (
                                <p className="text-xs">
                                  <span className="text-zinc-400">
                                    Correct:{" "}
                                  </span>
                                  <span className="text-emerald-700">
                                    {q.correct_answer}
                                  </span>
                                </p>
                              )}
                              {q.explanation && (
                                <p className="text-xs text-zinc-500 bg-white rounded p-2.5">
                                  {q.explanation}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    onClick={startQuiz}
                    className="px-6 py-2.5 text-sm bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors"
                  >
                    Retake Quiz
                  </button>
                </div>
              )}

              {/* Step-wise quiz */}
              {quizStarted && !quizDone && currentQ && !viewingAttempt && (
                <div className="space-y-5">
                  <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1">
                    <span>
                      Question {quizStep + 1} of {totalQuestions}
                    </span>
                    <div className="flex-1 h-1 bg-zinc-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-zinc-300 rounded-full transition-all duration-300"
                        style={{
                          width: `${((quizStep + 1) / totalQuestions) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  <h4 className="text-base font-medium text-zinc-900">
                    {currentQ.question_text}
                  </h4>

                  <div className="space-y-2">
                    {currentQ.options.map((opt, j) => {
                      const isSelected = selectedAnswer === opt;
                      const isCorrect = opt === currentQ.correct_answer;
                      let cls =
                        "w-full text-left px-4 py-3 rounded-lg border text-sm transition-all ";

                      if (revealed) {
                        if (isCorrect) {
                          cls +=
                            "bg-emerald-50 border-emerald-300 text-emerald-800 ";
                        } else if (isSelected && !isCorrect) {
                          cls += "bg-red-50 border-red-300 text-red-800 ";
                        } else {
                          cls += "border-zinc-100 text-zinc-300 opacity-50 ";
                        }
                      } else {
                        cls += isSelected
                          ? "border-zinc-900 bg-zinc-50 text-zinc-900 "
                          : "border-zinc-200 hover:border-zinc-400 text-zinc-700 ";
                      }

                      return (
                        <button
                          key={opt}
                          onClick={() => !revealed && setSelectedAnswer(opt)}
                          disabled={revealed}
                          className={cls}
                        >
                          <span className="font-mono text-xs mr-2 opacity-60">
                            {labels[j]}.
                          </span>
                          {opt}
                          {revealed && isCorrect && (
                            <span className="ml-2 text-emerald-600 text-xs font-medium">
                              Correct
                            </span>
                          )}
                          {revealed && isSelected && !isCorrect && (
                            <span className="ml-2 text-red-600 text-xs font-medium">
                              Your pick
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {revealed && currentQ.explanation && (
                    <div className="p-3.5 bg-zinc-50 rounded-lg text-sm text-zinc-600">
                      {currentQ.explanation}
                    </div>
                  )}

                  {!revealed ? (
                    <button
                      onClick={checkAnswer}
                      disabled={!selectedAnswer}
                      className="px-6 py-2.5 text-sm bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors disabled:opacity-40"
                    >
                      Check Answer
                    </button>
                  ) : quizStep < totalQuestions - 1 ? (
                    <button
                      onClick={nextQuestion}
                      className="px-6 py-2.5 text-sm bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors"
                    >
                      Next Question
                    </button>
                  ) : null}
                </div>
              )}

              {/* Start button */}
              {!quizStarted && !quizDone && !viewingAttempt && (
                <button
                  onClick={startQuiz}
                  className="px-6 py-2.5 text-sm bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors"
                >
                  {previousAttempt ? "Retake Quiz" : "Start Quiz"}
                </button>
              )}
            </div>
          ) : (
            <p className="text-sm text-zinc-400">No quiz for this slide.</p>
          )}

          {/* Slide navigation */}
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
