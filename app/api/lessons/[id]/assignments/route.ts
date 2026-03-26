import { NextResponse } from "next/server";
import { ensureLessonAccess } from "@/app/api/lessons/_helpers";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

type CreateAssignmentBody = {
  exercise_type: "pack" | "cluster" | "irregular";
  context_slug: string;
  params?: Record<string, any>;
  due_date?: string | null;
};

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

    const { data: rows, error: selErr } = await supabase
      .from("lesson_assignments")
      .select("id, exercise_type, context_slug, status")
      .eq("lesson_id", id)
      .order("created_at", { ascending: true });

    if (selErr) {
      return NextResponse.json({ error: selErr.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      assignments: rows ?? [],
    });
  } catch (e: any) {
    console.error("[lessons/:id/assignments] GET error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Unknown error", stack: process.env.NODE_ENV === "development" ? e?.stack : undefined },
      { status: 500 },
    );
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ctx = await getAuthContext(req);
    if ("error" in ctx) return ctx.error;

    const { supabase, userId, role } = ctx;
    const access = await ensureLessonAccess(supabase, id, userId, role);
    if ("error" in access) return access.error;

    const { lesson } = access;
    if (role !== "admin" && lesson.created_by !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await req.json().catch(() => null)) as CreateAssignmentBody | null;
    if (!body?.exercise_type || !["pack", "cluster", "irregular"].includes(body.exercise_type)) {
      return NextResponse.json({ error: "exercise_type is required" }, { status: 400 });
    }

    const rawSlug = typeof body.context_slug === "string" ? body.context_slug.trim() : "";
    if (body.exercise_type !== "irregular" && !rawSlug) {
      return NextResponse.json({ error: "context_slug is required" }, { status: 400 });
    }

    const { data: assignment, error: insertErr } = await supabase
      .from("lesson_assignments")
      .insert({
        lesson_id: id,
        exercise_type: body.exercise_type,
        context_slug: rawSlug,
        params: body.params ?? {},
        due_date: body.due_date ?? null,
      })
      .select(
        "id, lesson_id, exercise_type, context_slug, params, due_date, status, completed_session_id, completed_at, created_at"
      )
      .maybeSingle();

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, assignment });
  } catch (e: any) {
    console.error("[lessons/:id/assignments] POST error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Unknown error", stack: process.env.NODE_ENV === "development" ? e?.stack : undefined },
      { status: 500 }
    );
  }
}
