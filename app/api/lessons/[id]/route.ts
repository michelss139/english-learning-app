import { NextResponse } from "next/server";
import {
  ensureLessonAccess,
  LESSON_API_ROW_SELECT,
} from "@/app/api/lessons/_helpers";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * PATCH body: optimistic concurrency via `if_lesson_updated_at` (must match DB row).
 * Lesson roles are contextual: teacher = created_by, student = student_id.
 * Global `admin` is an explicit override for support; domain rules use lesson roles first.
 */

const LESSON_ROW_SELECT = LESSON_API_ROW_SELECT;

const ALLOWED_PATCH_KEYS = new Set([
  "if_lesson_updated_at",
  "lesson_date",
  "topic",
  "summary",
  "teacher_note",
  "student_note",
  "irregular_verbs",
]);

type ParsedPatchBody = {
  ifLessonUpdatedAt: string;
  lesson_date?: string;
  topic?: string;
  summary?: string | null;
  teacher_note?: string | null;
  student_note?: string | null;
  irregular_verbs?: string;
};

type IrregularVerbsResolveResult = {
  stored: string | null;
  saved_verbs: string[];
  ignored_verbs: string[];
};

async function resolveIrregularVerbsForLesson(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  raw: string
): Promise<IrregularVerbsResolveResult> {
  const segments = raw.split(",").map((s) => s.trim()).filter((s) => s.length > 0);
  const orderedNorms: string[] = [];
  const normToDisplay = new Map<string, string>();
  for (const seg of segments) {
    const norm = seg.toLowerCase();
    if (normToDisplay.has(norm)) continue;
    normToDisplay.set(norm, seg);
    orderedNorms.push(norm);
  }

  if (orderedNorms.length === 0) {
    return { stored: null, saved_verbs: [], ignored_verbs: [] };
  }

  const { data: rows, error } = await supabase
    .from("irregular_verbs")
    .select("base, base_norm")
    .in("base_norm", orderedNorms);

  if (error) throw new Error(error.message);

  const byNorm = new Map((rows ?? []).map((r) => [r.base_norm as string, r.base as string]));
  const saved_verbs = orderedNorms.filter((n) => byNorm.has(n)).map((n) => byNorm.get(n)!);
  const ignored_verbs = orderedNorms.filter((n) => !byNorm.has(n)).map((n) => normToDisplay.get(n)!);
  const stored = saved_verbs.length === 0 ? null : saved_verbs.join(", ");

  return { stored, saved_verbs, ignored_verbs };
}

function parsePatchBody(raw: unknown): { ok: true; body: ParsedPatchBody } | { ok: false; response: NextResponse } {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "JSON body must be an object" }, { status: 400 }),
    };
  }

  const o = raw as Record<string, unknown>;
  for (const key of Object.keys(o)) {
    if (!ALLOWED_PATCH_KEYS.has(key)) {
      return {
        ok: false,
        response: NextResponse.json({ error: `Unknown field: ${key}` }, { status: 400 }),
      };
    }
  }

  const ifRaw = o.if_lesson_updated_at;
  if (typeof ifRaw !== "string" || ifRaw.trim().length === 0) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "if_lesson_updated_at is required (ISO timestamp from last lesson fetch)" },
        { status: 400 },
      ),
    };
  }
  const ifLessonUpdatedAt = ifRaw.trim();
  const t = Date.parse(ifLessonUpdatedAt);
  if (!Number.isFinite(t)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "if_lesson_updated_at must be a valid ISO timestamp" }, { status: 400 }),
    };
  }

  const body: ParsedPatchBody = { ifLessonUpdatedAt };

  if ("lesson_date" in o) {
    if (typeof o.lesson_date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(o.lesson_date.trim())) {
      return {
        ok: false,
        response: NextResponse.json({ error: "lesson_date must be YYYY-MM-DD" }, { status: 400 }),
      };
    }
    body.lesson_date = o.lesson_date.trim();
  }

  if ("topic" in o) {
    if (typeof o.topic !== "string") {
      return { ok: false, response: NextResponse.json({ error: "topic must be a string" }, { status: 400 }) };
    }
    body.topic = o.topic.trim();
  }

  if ("summary" in o) {
    if (o.summary !== null && typeof o.summary !== "string") {
      return { ok: false, response: NextResponse.json({ error: "summary must be string or null" }, { status: 400 }) };
    }
    body.summary = o.summary === null ? null : o.summary.trim() === "" ? null : o.summary.trim();
  }

  if ("teacher_note" in o) {
    if (o.teacher_note !== null && typeof o.teacher_note !== "string") {
      return {
        ok: false,
        response: NextResponse.json({ error: "teacher_note must be string or null" }, { status: 400 }),
      };
    }
    body.teacher_note =
      o.teacher_note === null ? null : o.teacher_note.trim() === "" ? null : o.teacher_note.trim();
  }

  if ("student_note" in o) {
    if (o.student_note !== null && typeof o.student_note !== "string") {
      return {
        ok: false,
        response: NextResponse.json({ error: "student_note must be string or null" }, { status: 400 }),
      };
    }
    body.student_note =
      o.student_note === null ? null : o.student_note.trim() === "" ? null : o.student_note.trim();
  }

  if ("irregular_verbs" in o) {
    if (typeof o.irregular_verbs !== "string") {
      return {
        ok: false,
        response: NextResponse.json({ error: "irregular_verbs must be a string" }, { status: 400 }),
      };
    }
    body.irregular_verbs = o.irregular_verbs;
  }

  const wantsMeta =
    body.lesson_date !== undefined ||
    body.topic !== undefined ||
    body.summary !== undefined ||
    body.irregular_verbs !== undefined;
  const wantsTeacherNote = body.teacher_note !== undefined;
  const wantsStudentNote = body.student_note !== undefined;

  if (!wantsMeta && !wantsTeacherNote && !wantsStudentNote) {
    return {
      ok: false,
      response: NextResponse.json({ error: "No fields to update" }, { status: 400 }),
    };
  }

  return { ok: true, body };
}

async function getAuthContext(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : "";

  if (!token) {
    return { error: NextResponse.json({ error: "Missing Authorization bearer token" }, { status: 401 }) };
  }

  const supabase = createSupabaseAdmin();
  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData?.user?.id) {
    return { error: NextResponse.json({ error: "Invalid session" }, { status: 401 }) };
  }

  const userId = userData.user.id;
  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", userId)
    .maybeSingle();

  if (profileErr || !profile) {
    return { error: NextResponse.json({ error: "Profile not found" }, { status: 404 }) };
  }

  return { supabase, userId, role: profile.role };
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ctx = await getAuthContext(req);
    if ("error" in ctx) return ctx.error;

    const { supabase, userId, role } = ctx;
    const access = await ensureLessonAccess(supabase, id, userId, role);
    if ("error" in access) return access.error;

    const { data: notes, error: notesErr } = await supabase
      .from("lesson_notes")
      .select("id, lesson_id, author_id, author_role, content, created_at")
      .eq("lesson_id", id)
      .order("created_at", { ascending: true });

    if (notesErr) {
      return NextResponse.json({ error: notesErr.message }, { status: 500 });
    }

    const { data: assignments, error: assignmentsErr } = await supabase
      .from("lesson_assignments")
      .select(
        "id, lesson_id, exercise_type, context_slug, params, due_date, status, completed_session_id, completed_at, created_at"
      )
      .eq("lesson_id", id)
      .order("created_at", { ascending: true });

    if (assignmentsErr) {
      return NextResponse.json({ error: assignmentsErr.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      lesson: access.lesson,
      notes: notes ?? [],
      assignments: assignments ?? [],
    });
  } catch (e: any) {
    console.error("[lessons/:id] GET error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Unknown error", stack: process.env.NODE_ENV === "development" ? e?.stack : undefined },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ctx = await getAuthContext(req);
    if ("error" in ctx) return ctx.error;

    const { supabase, userId, role } = ctx;
    const access = await ensureLessonAccess(supabase, id, userId, role);
    if ("error" in access) return access.error;

    const rawJson = await req.json().catch(() => null);
    const parsed = parsePatchBody(rawJson);
    if (!parsed.ok) return parsed.response;

    const body = parsed.body;
    const lessonRow = access.lesson as {
      student_id: string;
      created_by: string;
      updated_at: string;
    };

    const isAdminOverride = role === "admin";
    const isLessonTeacher = userId === lessonRow.created_by;
    const isLessonStudent = userId === lessonRow.student_id;

    const wantsLessonDate = body.lesson_date !== undefined;
    const wantsTopic = body.topic !== undefined;
    const wantsSummary = body.summary !== undefined;
    const wantsIrregularVerbs = body.irregular_verbs !== undefined;
    const wantsMeta = wantsLessonDate || wantsTopic || wantsSummary || wantsIrregularVerbs;
    const wantsTeacherNote = body.teacher_note !== undefined;
    const wantsStudentNote = body.student_note !== undefined;

    if (!isAdminOverride) {
      if (wantsSummary) {
        return NextResponse.json(
          { error: "Only administrators can update summary" },
          { status: 403 },
        );
      }
      if (wantsLessonDate && !isLessonTeacher && !isLessonStudent) {
        return NextResponse.json(
          {
            error: "Only the lesson teacher, the enrolled student, or an administrator may change the lesson date",
          },
          { status: 403 },
        );
      }
      if (wantsTopic && !isLessonTeacher) {
        return NextResponse.json({ error: "Only the lesson teacher may update the topic" }, { status: 403 });
      }
      if (wantsIrregularVerbs && !isLessonTeacher && !isAdminOverride) {
        return NextResponse.json(
          { error: "Only the lesson teacher may update irregular_verbs" },
          { status: 403 },
        );
      }
      if (wantsTeacherNote && !isLessonTeacher) {
        return NextResponse.json({ error: "Only the lesson teacher (author) may update teacher_note" }, { status: 403 });
      }
      if (wantsStudentNote && !isLessonStudent) {
        return NextResponse.json({ error: "Only the enrolled student may update student_note" }, { status: 403 });
      }
    }

    if (body.ifLessonUpdatedAt !== lessonRow.updated_at) {
      return NextResponse.json(
        {
          error: "Lesson was modified elsewhere. Use the latest updated_at and try again.",
          code: "LESSON_CONFLICT",
          lesson: access.lesson,
        },
        { status: 409 },
      );
    }

    let irregularVerbsStored: string | null = null;
    let irregularVerbsFeedback: IrregularVerbsResolveResult | null = null;
    if (wantsIrregularVerbs) {
      try {
        irregularVerbsFeedback = await resolveIrregularVerbsForLesson(supabase, body.irregular_verbs!);
        irregularVerbsStored = irregularVerbsFeedback.stored;
      } catch (e: any) {
        return NextResponse.json(
          { error: e?.message ?? "Failed to resolve irregular verbs" },
          { status: 500 },
        );
      }
    }

    const updates: Record<string, string | null> = {};

    if (isAdminOverride) {
      if (body.lesson_date !== undefined) updates.lesson_date = body.lesson_date;
      if (body.topic !== undefined) updates.topic = body.topic;
      if (body.summary !== undefined) updates.summary = body.summary;
      if (body.teacher_note !== undefined) updates.teacher_note = body.teacher_note;
      if (body.student_note !== undefined) updates.student_note = body.student_note;
      if (wantsIrregularVerbs) updates.irregular_verbs = irregularVerbsStored;
    } else {
      if (wantsTeacherNote) updates.teacher_note = body.teacher_note!;
      if (wantsStudentNote) updates.student_note = body.student_note!;
      if (wantsTopic && isLessonTeacher) updates.topic = body.topic!;
      if (wantsIrregularVerbs && isLessonTeacher) updates.irregular_verbs = irregularVerbsStored;
      if (wantsLessonDate && (isLessonTeacher || isLessonStudent)) {
        updates.lesson_date = body.lesson_date!;
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No permitted fields to update" }, { status: 400 });
    }

    const nextUpdatedAt = new Date().toISOString();
    updates.updated_at = nextUpdatedAt;

    const { data: updatedLesson, error: updateErr } = await supabase
      .from("lessons")
      .update(updates)
      .eq("id", id)
      .eq("updated_at", body.ifLessonUpdatedAt)
      .select(LESSON_ROW_SELECT)
      .maybeSingle();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    if (!updatedLesson) {
      const { data: current } = await supabase.from("lessons").select(LESSON_ROW_SELECT).eq("id", id).maybeSingle();
      return NextResponse.json(
        {
          error: "Lesson was modified elsewhere. Refresh and try again.",
          code: "LESSON_CONFLICT",
          lesson: current ?? null,
        },
        { status: 409 },
      );
    }

    return NextResponse.json({
      ok: true,
      lesson: updatedLesson,
      ...(wantsIrregularVerbs && irregularVerbsFeedback
        ? {
            saved_verbs: irregularVerbsFeedback.saved_verbs,
            ignored_verbs: irregularVerbsFeedback.ignored_verbs,
          }
        : {}),
    });
  } catch (e: any) {
    console.error("[lessons/:id] PATCH error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Unknown error", stack: process.env.NODE_ENV === "development" ? e?.stack : undefined },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ctx = await getAuthContext(req);
    if ("error" in ctx) return ctx.error;

    const { supabase, userId, role } = ctx;
    const access = await ensureLessonAccess(supabase, id, userId, role);
    if ("error" in access) return access.error;

    const row = access.lesson as { student_id: string; created_by: string };
    const isAdminOverride = role === "admin";
    const mayDelete =
      isAdminOverride || userId === row.student_id || userId === row.created_by;

    if (!mayDelete) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { error: delErr } = await supabase.from("lessons").delete().eq("id", id);

    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[lessons/:id] DELETE error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Unknown error", stack: process.env.NODE_ENV === "development" ? e?.stack : undefined },
      { status: 500 }
    );
  }
}
