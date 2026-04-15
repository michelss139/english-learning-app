import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getUserIdFromApiRequest } from "@/lib/auth/adminApiAuth";
import { findHighConfidenceDuplicateSenseGroups } from "@/lib/lexicon/senseMergeCandidates";

/**
 * GET /api/admin/sense-merge-candidates
 * Read-only: high-confidence duplicate senses (same entry + same PL + definitions match heuristics).
 * Auth: Bearer JWT or signed-in session (cookies) + profiles.role === "admin".
 *
 * Browser tab navigation redirects to the HTML admin page (unless ?debug=1 on API — rare).
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const isDebug = url.searchParams.get("debug") === "1";

    const dest = req.headers.get("sec-fetch-dest");
    if (!isDebug && dest === "document") {
      return NextResponse.redirect(new URL("/admin/sense-merge-candidates", req.url));
    }

    const supabase = createSupabaseAdmin();

    const userId = await getUserIdFromApiRequest(req);
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized — sign in or send Authorization: Bearer <token>" },
        { status: 401 },
      );
    }

    const { data: profile, error: profErr } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    if (profErr || !profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await findHighConfidenceDuplicateSenseGroups(supabase, { maxGroups: 50 });

    return NextResponse.json(body);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
