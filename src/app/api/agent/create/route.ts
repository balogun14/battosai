import { NextRequest, NextResponse } from "next/server";
import { db, initDB } from "@/lib/db";

function validateApiKey(request: NextRequest): boolean {
  const apiKey = process.env.AGENT_API_KEY;
  if (!apiKey) return false;
  const header = request.headers.get("x-api-key");
  return header === apiKey;
}

interface QuestionInput {
  question_text: string;
  options: string[];
  correct_answer: string;
  explanation?: string;
}

interface SlideInput {
  title: string;
  content?: string;
  quiz?: {
    time_limit_seconds?: number;
    questions: QuestionInput[];
  };
}

interface CreateRequest {
  course: {
    title: string;
    description?: string;
    id?: string;
  };
  slides: SlideInput[];
}

export async function POST(request: NextRequest) {
  if (!validateApiKey(request)) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  await initDB();

  let body: CreateRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { course, slides } = body;

  if (!course?.title || typeof course.title !== "string" || !course.title.trim()) {
    return NextResponse.json(
      { error: "course.title is required" },
      { status: 400 }
    );
  }

  if (!Array.isArray(slides) || slides.length === 0) {
    return NextResponse.json(
      { error: "slides array is required and must not be empty" },
      { status: 400 }
    );
  }

  const courseTitle = course.title.trim().slice(0, 200);
  const courseDesc = (course.description || "").trim().slice(0, 5000);

  let courseId: string;

  if (course.id) {
    const existing = await db
      .execute({ sql: "SELECT id FROM courses WHERE id = ?", args: [course.id] })
      .then((r) => r.rows[0]);
    if (!existing) {
      return NextResponse.json(
        { error: `Course with id '${course.id}' not found` },
        { status: 404 }
      );
    }
    courseId = course.id;
  } else {
    courseId = crypto.randomUUID();
    await db.execute({
      sql: "INSERT INTO courses (id, title, description, created_by) VALUES (?, ?, ?, ?)",
      args: [courseId, courseTitle, courseDesc, null],
    });
  }

  const createdSlides: unknown[] = [];

  for (let si = 0; si < slides.length; si++) {
    const slide = slides[si];
    if (!slide?.title || typeof slide.title !== "string" || !slide.title.trim()) {
      return NextResponse.json(
        { error: `slides[${si}].title is required` },
        { status: 400 }
      );
    }

    const slideId = crypto.randomUUID();
    await db.execute({
      sql: "INSERT INTO slides (id, course_id, title, content, order_num) VALUES (?, ?, ?, ?, ?)",
      args: [
        slideId,
        courseId,
        slide.title.trim().slice(0, 200),
        (slide.content || "").trim().slice(0, 10000),
        si,
      ],
    });

    const quizId = crypto.randomUUID();
    await db.execute({
      sql: "INSERT INTO quizzes (id, slide_id, time_limit_seconds) VALUES (?, ?, ?)",
      args: [quizId, slideId, slide.quiz?.time_limit_seconds || 300],
    });

    let questionCount = 0;
    if (slide.quiz?.questions && Array.isArray(slide.quiz.questions)) {
      for (let qi = 0; qi < slide.quiz.questions.length; qi++) {
        const q = slide.quiz.questions[qi];
        if (!q.question_text || !Array.isArray(q.options) || q.options.length < 2) {
          continue;
        }
        if (!q.correct_answer) continue;

        const qid = crypto.randomUUID();
        await db.execute({
          sql: `INSERT INTO quiz_questions (id, quiz_id, question_text, options, correct_answer, explanation, order_num)
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
          args: [
            qid,
            quizId,
            q.question_text.slice(0, 2000),
            JSON.stringify(q.options.map((o) => String(o).slice(0, 500))),
            String(q.correct_answer).slice(0, 500),
            (q.explanation || "").slice(0, 5000),
            qi,
          ],
        });
        questionCount++;
      }
    }

    createdSlides.push({
      id: slideId,
      course_id: courseId,
      title: slide.title.trim(),
      order_num: si,
      quiz_questions: questionCount,
    });
  }

  return NextResponse.json(
    {
      success: true,
      course: { id: courseId, title: courseTitle, slide_count: createdSlides.length },
      slides: createdSlides,
    },
    { status: 201 }
  );
}
