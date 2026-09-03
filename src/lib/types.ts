export interface Course {
  id: string;
  title: string;
  description: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  slide_count?: number;
  question_count?: number;
}

export interface Slide {
  id: string;
  course_id: string;
  title: string;
  content: string;
  order_num: number;
  created_at: string;
}

export interface Quiz {
  id: string;
  slide_id: string;
  time_limit_seconds: number;
  created_at: string;
}

export interface QuizQuestion {
  id: string;
  quiz_id: string;
  question_text: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  order_num: number;
  created_at: string;
}

export interface Progress {
  id: string;
  user_id: string;
  quiz_id: string;
  score: number;
  total: number;
  time_spent_seconds: number;
  answers: Record<string, string>;
  completed_at: string;
}

export interface User {
  id: string;
  username: string;
  role: "admin" | "user";
  created_at: string;
}

export interface GameQuestion {
  id: string;
  question_text: string;
  options: string[];
  correct_answer: string;
  explanation: string;
}

export type GameStatus = "lobby" | "question" | "reveal" | "leaderboard" | "ended";

export interface Game {
  id: string;
  pin: string;
  course_id: string;
  status: GameStatus;
  current_index: number;
  question_started_at: string | Date | null;
  question_time_limit: number;
  questions: string; // JSON GameQuestion[]
  created_by: string | null;
  created_at: string;
}

export interface GamePlayer {
  id: string;
  game_id: string;
  user_id: string | null;
  nickname: string;
  score: number;
  streak: number;
  joined_at: string;
}
