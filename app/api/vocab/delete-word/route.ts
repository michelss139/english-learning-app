import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * DELETE /api/vocab/delete-word
 * 
 * Delete word from user's vocabulary pool (user_vocab_items).
 * Also removes from all lessons (lesson_vocab_items) via cascade.
 */

type Body = {
  user_vocab_item_id: string;
};

export async function DELETE(req: Request) {
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

    const userId = userData.user.id;

    const body = (await req.json().catch(() => null)) as Body | null;
    const user_vocab_item_id = body?.user_vocab_item_id;

    if (!user_vocab_item_id) {
      return NextResponse.json({ error: "user_vocab_item_id is required" }, { status: 400 });
    }

    // Verify ownership
    const { data: item, error: checkErr } = await supabase
      .from("user_vocab_items")
      .select("id, student_id")
      .eq("id", user_vocab_item_id)
      .maybeSingle();

    if (checkErr) {
      return NextResponse.json({ error: `Failed to verify item: ${checkErr.message}` }, { status: 500 });
    }

    if (!item) {
      return NextResponse.json({ error: "Word not found" }, { status: 404 });
    }

    if (item.student_id !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Delete (cascade will remove from lesson_vocab_items)
    const { error: deleteErr } = await supabase.from("user_vocab_items").delete().eq("id", user_vocab_item_id);

    if (deleteErr) {
      return NextResponse.json({ error: `Failed to delete word: ${deleteErr.message}` }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
    });
  } catch (e: any) {
    console.error("[delete-word] Error:", e);
    return NextResponse.json(
      {
        error: e?.message ?? "Unknown error",
        stack: process.env.NODE_ENV === "development" ? e?.stack : undefined,
      },
      { status: 500 }
    );
  }
}
