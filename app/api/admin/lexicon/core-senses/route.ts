import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getUserIdFromApiRequest } from "@/lib/auth/adminApiAuth";

type CoreSenseRow = {
  sense_id: string;
  lemma: string;
  pos: string;
  definition_en: string;
  translation_pl: string | null;
  cefr_level: string;
};

/**
 * GET /api/admin/lexicon/core-senses
 * CORE senses: CEFR A1, A2, B1 (non-null). Max 500 rows, ordered by CEFR, lemma, sense_order.
 * Auth: JWT or session + profiles.role === "admin".
 *
 * Requires migration: `admin_core_senses()` (service_role only).
 */
export async function GET(req: Request) {
  try {
    const supabase = createSupabaseAdmin();

    const userId = await getUserIdFromApiRequest(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error: profErr } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    if (profErr || !profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await supabase.rpc("admin_core_senses");

    if (error) {
      console.error("[admin/lexicon/core-senses]", error);
      return NextResponse.json(
        {
          error: error.message,
          hint: "Apply migration supabase/migrations/20260415130000_admin_core_senses.sql if the RPC is missing.",
        },
        { status: 500 },
      );
    }

    const rows = (data ?? []) as CoreSenseRow[];
    return NextResponse.json(rows);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("[admin/lexicon/core-senses]", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
