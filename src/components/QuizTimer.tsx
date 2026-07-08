"use client";

import { useEffect, useState, useRef } from "react";

interface QuizTimerProps {
  timeLimitSeconds: number;
  onTimeUp: () => void;
  running: boolean;
}

export default function QuizTimer({
  timeLimitSeconds,
  onTimeUp,
  running,
}: QuizTimerProps) {
  const [remaining, setRemaining] = useState(timeLimitSeconds);
  const onTimeUpRef = useRef(onTimeUp);
  onTimeUpRef.current = onTimeUp;

  useEffect(() => {
    setRemaining(timeLimitSeconds);
  }, [timeLimitSeconds]);

  useEffect(() => {
    if (!running) return;
    if (remaining <= 0) {
      onTimeUpRef.current();
      return;
    }

    const id = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          setTimeout(() => onTimeUpRef.current(), 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(id);
  }, [running, remaining]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const pct = (remaining / timeLimitSeconds) * 100;
  const urgent = remaining < 60;

  return (
    <div className="flex items-center gap-3">
      <div className="h-1 w-24 bg-zinc-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${
            urgent ? "bg-red-500" : "bg-zinc-800"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span
        className={`font-mono text-sm tabular-nums ${
          urgent ? "text-red-600" : "text-zinc-500"
        }`}
      >
        {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
      </span>
    </div>
  );
}
