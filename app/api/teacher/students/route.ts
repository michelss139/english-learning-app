import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
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
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (profileErr || !profile) {
    return { error: NextResponse.json({ error: "Profile not found" }, { status: 404 }) };
  }

  return { supabase, userId };
}

export async function GET(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    if ("error" in ctx) return ctx.error;

    const { supabase, userId } = ctx;

    const { data: relations, error: relErr } = await supabase
      .from("teacher_student_relations")
      .select("id, student_id, created_at")
      .eq("teacher_id", userId)
      .order("created_at", { ascending: true });

    if (relErr) {
      return NextResponse.json({ error: relErr.message }, { status: 500 });
    }

    const studentIds = [...new Set((relations ?? []).map((r) => r.student_id as string))];
    if (studentIds.length === 0) {
      return NextResponse.json({ ok: true, students: [] });
    }

    const { data: profiles, error: profErr } = await supabase
      .from("profiles")
      .select("id, email, username")
      .in("id", studentIds);

    if (profErr) {
      return NextResponse.json({ error: profErr.message }, { status: 500 });
    }

    const byId = new Map((profiles ?? []).map((p) => [p.id as string, p]));

    const students = (relations ?? []).map((r) => {
      const p = byId.get(r.student_id as string);
      return {
        relation_id: r.id,
        student_id: r.student_id,
        created_at: r.created_at,
        email: p?.email ?? null,
        username: p?.username ?? null,
      };
    });

    return NextResponse.json({ ok: true, students });
  } catch (e: any) {
    console.error("[teacher/students] GET error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Unknown error" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    if ("error" in ctx) return ctx.error;

    const { supabase, userId } = ctx;
    const body = (await req.json().catch(() => null)) as { email?: string } | null;
    const rawEmail = typeof body?.email === "string" ? body.email.trim() : "";

    if (!rawEmail || !isValidEmail(rawEmail)) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }

    const emailNorm = rawEmail.toLowerCase();

    const { data: studentProfile, error: findErr } = await supabase
      .from("profiles")
      .select("id, email, username")
      .ilike("email", emailNorm)
      .maybeSingle();

    if (findErr) {
      return NextResponse.json({ error: findErr.message }, { status: 500 });
    }

    if (!studentProfile) {
      return NextResponse.json({ error: "No user with this email" }, { status: 404 });
    }

    const studentId = studentProfile.id as string;
    if (studentId === userId) {
      return NextResponse.json({ error: "Cannot assign yourself as a student" }, { status: 400 });
    }

    const { error: insertErr } = await supabase.from("teacher_student_relations").insert({
      teacher_id: userId,
      student_id: studentId,
    });

    if (insertErr) {
      if (insertErr.code === "23505") {
        return NextResponse.json({ error: "This student is already assigned" }, { status: 409 });
      }
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      id: studentId,
      email: studentProfile.email,
      username: studentProfile.username,
    });
  } catch (e: any) {
    console.error("[teacher/students] POST error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Unknown error" },
      { status: 500 },
    );
  }
}
