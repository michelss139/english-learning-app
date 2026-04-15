import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getUserIdFromApiRequest } from "@/lib/auth/adminApiAuth";
import { findDuplicateSenseGroups } from "@/lib/lexicon/duplicateSenseDetection";

/**
 * GET /api/admin/duplicate-senses
 * Read-only: potential duplicate lexicon senses (same entry + same PL translation, ≥2 senses).
 * Auth: Bearer JWT or signed-in session (cookies) + profiles.role === "admin".
 *
 * Browser tab navigation redirects to the HTML admin page (see sec-fetch-dest).
 */
export async function GET(req: Request) {
  try {
    const dest = req.headers.get("sec-fetch-dest");
    if (dest === "document") {
      return NextResponse.redirect(new URL("/admin/duplicate-senses", req.url));
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

    const groups = await findDuplicateSenseGroups(supabase, { maxGroups: 50, includeReason: false });

    const body = groups.map(({ entry_id, lemma, translation_pl, senses, likely_duplicate }) => ({
      entry_id,
      lemma,
      translation_pl,
      senses,
      likely_duplicate,
    }));

    return NextResponse.json(body);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
