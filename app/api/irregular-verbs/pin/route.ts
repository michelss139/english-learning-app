import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/route";

type Body = {
  id?: string;
  verb_id?: string;
};

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseRouteClient();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as Body | null;
    const verbId = body?.id ?? body?.verb_id;

    if (!verbId || typeof verbId !== "string" || !isUuid(verbId)) {
      return NextResponse.json({ error: "id is required (uuid)" }, { status: 400 });
    }

    // Verify verb exists
    const { data: verb, error: verbErr } = await supabase
      .from("irregular_verbs")
      .select("id")
      .eq("id", verbId)
      .maybeSingle();

    if (verbErr) {
      return NextResponse.json({ error: verbErr.message }, { status: 500 });
    }
    if (!verb) {
      return NextResponse.json({ error: "Verb not found" }, { status: 404 });
    }

    const { data: existing, error: checkErr } = await supabase
      .from("user_irregular_verbs")
      .select("student_id, irregular_verb_id")
      .eq("student_id", user.id)
      .eq("irregular_verb_id", verbId)
      .maybeSingle();

    if (checkErr) {
      return NextResponse.json({ error: checkErr.message }, { status: 500 });
    }

    if (existing) {
      const { error: deleteErr } = await supabase
        .from("user_irregular_verbs")
        .delete()
        .eq("student_id", user.id)
        .eq("irregular_verb_id", verbId);

      if (deleteErr) {
        return NextResponse.json({ error: deleteErr.message }, { status: 500 });
      }

      return NextResponse.json({ ok: true, pinned: false, id: verbId });
    }

    const { error: insertErr } = await supabase.from("user_irregular_verbs").insert({
      student_id: user.id,
      irregular_verb_id: verbId,
    });

    if (insertErr) {
      // Ignore duplicate errors (race)
      if (!String(insertErr.message).toLowerCase().includes("duplicate")) {
        return NextResponse.json({ error: insertErr.message }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true, pinned: true, id: verbId });
  } catch (e: unknown) {
    console.error("[irregular-verbs/pin] Error:", e);
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Unknown error",
        stack: process.env.NODE_ENV === "development" && e instanceof Error ? e.stack : undefined,
      },
      { status: 500 },
    );
  }
}

