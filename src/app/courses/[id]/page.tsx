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
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-4">
        <div className="skeleton h-8 w-1/3" />
        <div className="skeleton h-4 w-1/2" />
        <div className="skeleton h-40 w-full mt-6" />
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
      <p className="eyebrow mb-2">Course</p>
      <h1 className="display text-2xl sm:text-3xl text-ink mb-6 sm:mb-8">
        {course.title}
      </h1>

      <div className="flex items-center gap-2 mb-6 sm:mb-8 overflow-x-auto pb-2">
        {course.slides.map((slide, i) => (
          <button
            key={slide.id}
            onClick={() => setCurrentSlideIdx(i)}
            aria-label={`Slide ${i + 1}`}
            className={`shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full text-xs font-mono flex items-center justify-center transition-all duration-200 ${
              i === currentSlideIdx
                ? "bg-accent text-white shadow-[0_2px_8px_rgba(45,90,58,0.35)]"
                : i < currentSlideIdx
                ? "bg-accent-soft text-accent-deep"
                : "bg-line/60 text-ink-faint hover:bg-line"
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>

      {currentSlide && (
        <div className="space-y-8 sm:space-y-10">
          <div>
            <h2 className="text-base sm:text-lg font-medium text-ink mb-3 sm:mb-4">
              {currentSlide.title}
            </h2>
            {currentSlide.content && (
              <div className="prose prose-sm prose-copy whitespace-pre-wrap">
                {currentSlide.content}
              </div>
            )}
          </div>

          {loadingQuiz ? (
            <div className="space-y-3 pt-2">
              <div className="skeleton h-4 w-24" />
              <div className="skeleton h-11 w-full" />
              <div className="skeleton h-11 w-full" />
            </div>
          ) : quiz && quiz.questions.length > 0 ? (
            <div className="border-t border-line pt-6 sm:pt-8 space-y-4 sm:space-y-6">
              {/* Header with timer and progress */}
              <div className="flex items-center justify-between">
                <h3 className="display text-lg sm:text-xl text-ink">
                  Knowledge check
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
                <div className="p-4 bg-accent-soft/60 border border-line rounded-lg space-y-2">
                  <p className="text-sm text-ink-soft">
                    Previous attempt:{" "}
                    <span className="font-medium tabular-nums">
                      {previousAttempt.score}/{previousAttempt.total}
                    </span>
                    {previousAttempt.total > 0 && (
                      <span className="text-ink-faint ml-1">
                        ({Math.round((previousAttempt.score / previousAttempt.total) * 100)}%)
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-ink-faint">
                    Time: {previousAttempt.time_spent_seconds}s
                  </p>
                  <button
                    onClick={() => setViewingAttempt(true)}
                    className="text-xs text-accent hover:text-accent-deep underline underline-offset-2 transition-colors"
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
                        <h4 className="text-sm font-medium text-ink">
                          <span className="text-ink-faint font-mono text-xs mr-1">
                            {i + 1}.
                          </span>
                          {q.question_text}
                        </h4>
                        <div className="space-y-1.5">
                          {q.options.map((opt, j) => {
                            const chosen = userAnswer === opt;
                            const correct = opt === q.correct_answer;
                            let cls =
                              "w-full text-left px-3 py-2 rounded-md text-sm transition-colors ";
                            if (correct) {
                              cls += "bg-emerald-50 border border-emerald-200 text-emerald-800 ";
                            } else if (chosen && !correct) {
                              cls += "bg-red-50 border border-red-200 text-red-800 ";
                            } else {
                              cls += "text-ink-faint ";
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
                          <p className="text-xs text-ink-soft bg-paper rounded-md p-3 border border-line/60">
                            {q.explanation}
                          </p>
                        )}
                      </div>
                    );
                  })}
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setViewingAttempt(false)}
                      className="text-sm text-ink-soft hover:text-ink underline underline-offset-2 transition-colors"
                    >
                      Hide answers
                    </button>
                    <button onClick={startQuiz} className="btn-primary">
                      Retake quiz
                    </button>
                  </div>
                </div>
              )}

              {/* Quiz done: results summary */}
              {quizDone && !viewingAttempt && (
                <div className="space-y-6">
                  <div className="p-6 bg-accent-soft/60 border border-line rounded-xl text-center">
                    <p className="display text-2xl text-ink">
                      {score}/{totalQuestions} correct
                      {totalQuestions > 0 &&
                        ` · ${Math.round((score / totalQuestions) * 100)}%`}
                    </p>
                    <p className="text-xs text-ink-faint mt-1.5">
                      {score === totalQuestions
                        ? "Perfect score."
                        : score >= totalQuestions * 0.7
                        ? "Strong run."
                        : score >= totalQuestions * 0.5
                        ? "Halfway there — keep going."
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
                              ? "border-emerald-200 bg-emerald-50/40"
                              : "border-red-200 bg-red-50/40"
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <span className="font-mono text-xs mt-0.5 shrink-0 text-ink-faint">
                              {i + 1}.
                            </span>
                            <div className="space-y-2 min-w-0">
                              <p className="text-sm font-medium text-ink">
                                {q.question_text}
                              </p>
                              <p className="text-xs">
                                <span className="text-ink-faint">
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
                                  <span className="text-ink-faint">
                                    Correct:{" "}
                                  </span>
                                  <span className="text-emerald-700">
                                    {q.correct_answer}
                                  </span>
                                </p>
                              )}
                              {q.explanation && (
                                <p className="text-xs text-ink-soft bg-card rounded p-2.5 border border-line/60">
                                  {q.explanation}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button onClick={startQuiz} className="btn-primary">
                    Retake quiz
                  </button>
                </div>
              )}

              {/* Step-wise quiz */}
              {quizStarted && !quizDone && currentQ && !viewingAttempt && (
                <div className="space-y-5">
                  <div className="flex items-center gap-2 text-xs text-ink-faint mb-1">
                    <span className="tabular-nums">
                      Question {quizStep + 1} of {totalQuestions}
                    </span>
                    <div className="flex-1 h-1 bg-line/70 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent rounded-full transition-all duration-300"
                        style={{
                          width: `${((quizStep + 1) / totalQuestions) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  <h4 className="text-base sm:text-lg font-medium text-ink text-balance">
                    {currentQ.question_text}
                  </h4>

                  <div className="space-y-2">
                    {currentQ.options.map((opt, j) => {
                      const isSelected = selectedAnswer === opt;
                      const isCorrect = opt === currentQ.correct_answer;
                      let cls =
                        "w-full text-left px-4 py-3 rounded-lg border text-sm transition-all duration-200 active:scale-[0.995] ";

                      if (revealed) {
                        if (isCorrect) {
                          cls +=
                            "bg-emerald-50 border-emerald-300 text-emerald-800 ";
                        } else if (isSelected && !isCorrect) {
                          cls += "bg-red-50 border-red-300 text-red-800 ";
                        } else {
                          cls += "border-line/60 text-ink-faint opacity-60 ";
                        }
                      } else {
                        cls += isSelected
                          ? "border-accent bg-accent-soft text-ink shadow-[0_0_0_1px_var(--color-accent)]"
                          : "border-line-strong hover:border-accent/60 text-ink-soft hover:text-ink ";
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
                    <div className="p-3.5 bg-paper border border-line/60 rounded-lg text-sm text-ink-soft">
                      {currentQ.explanation}
                    </div>
                  )}

                  {!revealed ? (
                    <button
                      onClick={checkAnswer}
                      disabled={!selectedAnswer}
                      className="btn-primary"
                    >
                      Check answer
                    </button>
                  ) : quizStep < totalQuestions - 1 ? (
                    <button onClick={nextQuestion} className="btn-primary">
                      Next question
                    </button>
                  ) : null}
                </div>
              )}

              {/* Start button */}
              {!quizStarted && !quizDone && !viewingAttempt && (
                <button onClick={startQuiz} className="btn-primary">
                  {previousAttempt ? "Retake quiz" : "Start quiz"}
                </button>
              )}
            </div>
          ) : (
            <p className="text-sm text-ink-faint">No quiz for this slide.</p>
          )}

          {/* Slide navigation */}
          <div className="flex items-center justify-between pt-8 border-t border-line">
            <button
              onClick={() => setCurrentSlideIdx((i) => Math.max(0, i - 1))}
              disabled={currentSlideIdx === 0}
              className="btn-ghost disabled:opacity-30"
            >
              &larr; Previous
            </button>
            <span className="text-xs text-ink-faint font-mono tabular-nums">
              {currentSlideIdx + 1} / {course.slides.length}
            </span>
            {isLastSlide ? (
              <button
                onClick={() => router.push("/progress")}
                className="btn-primary"
              >
                Finish course
              </button>
            ) : (
              <button
                onClick={() => setCurrentSlideIdx((i) => i + 1)}
                className="btn-ghost"
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
