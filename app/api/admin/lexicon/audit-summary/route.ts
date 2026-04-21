import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getUserIdFromApiRequest } from "@/lib/auth/adminApiAuth";

/**
 * GET /api/admin/lexicon/audit-summary
 * Lexicon size, gaps (missing translations / examples / patterns), POS mix,
 * top lemmas by sense count, random sample for manual QA.
 * Auth: Bearer JWT or session cookies + profiles.role === "admin".
 *
 * Requires migration: `admin_lexicon_audit_summary()` (service_role only).
 */
export async function GET(req: Request) {
  try {
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

    const { data, error } = await supabase.rpc("admin_lexicon_audit_summary");

    if (error) {
      console.error("[admin/lexicon/audit-summary]", error);
      return NextResponse.json(
        {
          error: error.message,
          hint:
            "Apply migration supabase/migrations/20260415120000_admin_lexicon_audit_summary.sql if the RPC is missing.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json(data);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
