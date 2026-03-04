import { NextResponse } from "next/server";
import { getAuthContext } from "@/app/api/lessons/_helpers";

type CalendarLessonRow = {
  id: string;
  lesson_date: string;
  topic: string;
};

type StudentLessonRow = {
  id: string;
  lesson_date: string;
};

type LessonAssignmentRow = {
  lesson_id: string;
};

type LessonVocabItemRow = {
  student_lesson_id: string;
};

type LessonTopicRow = {
  lesson_id: string;
  topic_type: "conversation" | "grammar" | "custom";
};

type CalendarTopicType = "conversation" | "grammar" | "mixed" | "none";

export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    if ("error" in ctx) return ctx.error;

    const { supabase, userId } = ctx;
    const { searchParams } = new URL(req.url);
    const month = (searchParams.get("month") ?? "").trim();

    if (!/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: "month must be in YYYY-MM format" }, { status: 400 });
    }

    const rangeStart = `${month}-01`;
    const [yearStr, monthStr] = month.split("-");
    const year = Number(yearStr);
    const monthIndex = Number(monthStr) - 1;
    const nextMonth = new Date(Date.UTC(year, monthIndex + 1, 1)).toISOString().slice(0, 10);

    const { data: lessons, error } = await supabase
      .from("lessons")
      .select("id, lesson_date, topic")
      .eq("student_id", userId)
      .not("student_id", "is", null)
      .gte("lesson_date", rangeStart)
      .lt("lesson_date", nextMonth)
      .order("lesson_date", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const typedLessons = (lessons ?? []) as CalendarLessonRow[];
    if (typedLessons.length === 0) {
      return NextResponse.json([]);
    }

    const lessonIds = typedLessons.map((l) => l.id);
    const lessonDates = Array.from(new Set(typedLessons.map((l) => l.lesson_date)));

    const [
      { data: assignments, error: assignmentsErr },
      { data: studentLessons, error: studentLessonsErr },
      { data: lessonTopics, error: lessonTopicsErr },
    ] =
      await Promise.all([
        supabase
          .from("lesson_assignments")
          .select("lesson_id")
          .in("lesson_id", lessonIds)
          .eq("status", "assigned"),
        supabase
          .from("student_lessons")
          .select("id, lesson_date")
          .eq("student_id", userId)
          .in("lesson_date", lessonDates),
        supabase
          .from("lesson_topics")
          .select("lesson_id, topic_type")
          .in("lesson_id", lessonIds),
      ]);

    if (assignmentsErr) {
      return NextResponse.json({ error: assignmentsErr.message }, { status: 500 });
    }
    if (studentLessonsErr) {
      return NextResponse.json({ error: studentLessonsErr.message }, { status: 500 });
    }
    if (lessonTopicsErr) {
      return NextResponse.json({ error: lessonTopicsErr.message }, { status: 500 });
    }

    const assignmentCountByLessonId = new Map<string, number>();
    for (const row of (assignments ?? []) as LessonAssignmentRow[]) {
      assignmentCountByLessonId.set(row.lesson_id, (assignmentCountByLessonId.get(row.lesson_id) ?? 0) + 1);
    }

    const typedStudentLessons = (studentLessons ?? []) as StudentLessonRow[];
    const studentLessonIds = typedStudentLessons.map((sl) => sl.id);
    const studentLessonDateById = new Map<string, string>();
    for (const sl of typedStudentLessons) {
      studentLessonDateById.set(sl.id, sl.lesson_date);
    }

    const vocabCountByDate = new Map<string, number>();
    if (studentLessonIds.length > 0) {
      const { data: lessonVocabItems, error: lessonVocabErr } = await supabase
        .from("lesson_vocab_items")
        .select("student_lesson_id")
        .in("student_lesson_id", studentLessonIds);

      if (lessonVocabErr) {
        return NextResponse.json({ error: lessonVocabErr.message }, { status: 500 });
      }

      for (const row of (lessonVocabItems ?? []) as LessonVocabItemRow[]) {
        const lessonDate = studentLessonDateById.get(row.student_lesson_id);
        if (!lessonDate) continue;
        vocabCountByDate.set(lessonDate, (vocabCountByDate.get(lessonDate) ?? 0) + 1);
      }
    }

    const topicTypesByLessonId = new Map<string, Set<string>>();
    for (const row of (lessonTopics ?? []) as LessonTopicRow[]) {
      if (!topicTypesByLessonId.has(row.lesson_id)) {
        topicTypesByLessonId.set(row.lesson_id, new Set());
      }
      topicTypesByLessonId.get(row.lesson_id)?.add(row.topic_type);
    }

    const resolveTopicType = (lessonId: string): CalendarTopicType => {
      const types = topicTypesByLessonId.get(lessonId);
      if (!types || types.size === 0) return "none";
      if (types.size > 1) return "mixed";
      if (types.has("conversation")) return "conversation";
      if (types.has("grammar")) return "grammar";
      return "mixed";
    };

    const payload = typedLessons.map((lesson) => ({
      id: lesson.id,
      lesson_date: lesson.lesson_date,
      topic: lesson.topic,
      assignment_count: assignmentCountByLessonId.get(lesson.id) ?? 0,
      vocab_count: vocabCountByDate.get(lesson.lesson_date) ?? 0,
      topic_type: resolveTopicType(lesson.id),
    }));

    return NextResponse.json(payload);
  } catch (e: any) {
    console.error("[lessons/calendar] GET error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Unknown error", stack: process.env.NODE_ENV === "development" ? e?.stack : undefined },
      { status: 500 }
    );
  }
}
