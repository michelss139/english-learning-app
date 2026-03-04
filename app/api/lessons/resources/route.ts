import { NextResponse } from "next/server";
import { ensureTutoringLessonAccess, getAuthContext } from "@/app/api/lessons/_helpers";

type CreateResourceBody = {
  lesson_id?: string;
  resource_type?: "grammar" | "pack" | "cluster" | "irregular";
  resource_id?: string;
};

export async function POST(req: Request) {
  try {
    const ctx = await getAuthContext(req);
    if ("error" in ctx) return ctx.error;

    const { supabase, userId, role } = ctx;
    const body = (await req.json().catch(() => null)) as CreateResourceBody | null;

    if (!body?.lesson_id || !body?.resource_type || !body?.resource_id?.trim()) {
      return NextResponse.json({ error: "lesson_id, resource_type and resource_id are required" }, { status: 400 });
    }

    const allowedResourceTypes = new Set(["grammar", "pack", "cluster", "irregular"]);
    if (!allowedResourceTypes.has(body.resource_type)) {
      return NextResponse.json({ error: "Invalid resource_type" }, { status: 400 });
    }

    const access = await ensureTutoringLessonAccess(supabase, body.lesson_id, userId, role);
    if ("error" in access) return access.error;

    const { data, error } = await supabase
      .from("lesson_resources")
      .insert({
        lesson_id: body.lesson_id,
        resource_type: body.resource_type,
        resource_id: body.resource_id.trim(),
      })
      .select("*")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, resource: data });
  } catch (e: any) {
    console.error("[lessons/resources] POST error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Unknown error", stack: process.env.NODE_ENV === "development" ? e?.stack : undefined },
      { status: 500 }
    );
  }
}
