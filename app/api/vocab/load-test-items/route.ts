/**
 * POST /api/vocab/load-test-items
 * 
 * Load test items from pool or lesson
 * Also clears selections after loading (auto-unselect)
 */

import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { loadTestItems, TestItem } from "@/lib/vocab/testLoader";

type Body = {
  source: "pool" | "lesson" | "ids";
  selectedIds?: string[]; // user_vocab_item_ids (canonical parameter for all sources)
  lessonId?: string; // for lesson source
};

export async function POST(req: Request) {
  try {
    // Auth: verify JWT token
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : "";

    if (!token) {
      return NextResponse.json({ error: "Missing Authorization bearer token" }, { status: 401 });
    }

    const supabase = createSupabaseAdmin();

    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user?.id) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const studentId = userData.user.id;
    const body = (await req.json().catch(() => null)) as Body | null;

    if (!body?.source) {
      return NextResponse.json({ error: "source is required (pool, lesson, or ids)" }, { status: 400 });
    }

    // Load test items
    const testItems = await loadTestItems({
      studentId,
      source: body.source,
      selectedIds: body.selectedIds,
      lessonId: body.lessonId,
    });

    // Auto-unselect: clear selections after loading
    // For pool: selections are in UI state (client-side), no DB action needed
    // For lesson: selections are in UI state (client-side), no DB action needed
    // Note: We don't store selections in DB, they're only in UI state
    // The auto-unselect happens on client side after redirect to test page

    return NextResponse.json({
      ok: true,
      items: testItems,
    });
  } catch (e: any) {
    console.error("[load-test-items] Error:", e);
    return NextResponse.json(
      {
        error: e?.message ?? "Unknown error",
        stack: process.env.NODE_ENV === "development" ? e?.stack : undefined,
      },
      { status: 500 }
    );
  }
}
