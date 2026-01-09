import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

function normTerm(term: string): string {
  return term.trim().toLowerCase();
}

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

    const userId = userData.user.id;

    const body = await req.json().catch(() => null);
    const term_en = (body?.term_en ?? "").toString().trim();

    if (!term_en) {
      return NextResponse.json({ error: "term_en is required" }, { status: 400 });
    }

    const term_en_norm = normTerm(term_en);

    console.log("[add-to-pool] Starting for term:", term_en, "norm:", term_en_norm, "userId:", userId);

    // 1) Sprawdź czy global_vocab_item już istnieje
    const { data: existingGlobal, error: globalCheckErr } = await supabase
      .from("global_vocab_items")
      .select("id")
      .eq("term_en_norm", term_en_norm)
      .maybeSingle();

    if (globalCheckErr) {
      console.error("[add-to-pool] Error checking global_vocab_items:", globalCheckErr);
      return NextResponse.json(
        { error: `Failed to check global_vocab_items: ${globalCheckErr.message}`, code: globalCheckErr.code },
        { status: 500 }
      );
    }

    console.log("[add-to-pool] Existing global item:", existingGlobal?.id || "none");

    let globalVocabItemId: string;

    if (existingGlobal) {
      globalVocabItemId = existingGlobal.id;
    } else {
      // 2) Utwórz global_vocab_item jeśli nie istnieje
      console.log("[add-to-pool] Creating new global_vocab_item");
      const { data: newGlobal, error: globalInsertErr } = await supabase
        .from("global_vocab_items")
        .insert({
          term_en: term_en,
          term_en_norm: term_en_norm,
        })
        .select("id")
        .single();

      if (globalInsertErr) {
        console.error("[add-to-pool] Error inserting global_vocab_item:", globalInsertErr);
        // Możliwe że ktoś inny utworzył w międzyczasie - spróbuj ponownie znaleźć
        const { data: retryGlobal, error: retryErr } = await supabase
          .from("global_vocab_items")
          .select("id")
          .eq("term_en_norm", term_en_norm)
          .maybeSingle();

        if (retryErr || !retryGlobal) {
          return NextResponse.json(
            {
              error: `Failed to create global_vocab_item: ${globalInsertErr.message}`,
              code: globalInsertErr.code,
              details: globalInsertErr,
            },
            { status: 500 }
          );
        }

        console.log("[add-to-pool] Found existing after insert error:", retryGlobal.id);
        globalVocabItemId = retryGlobal.id;
      } else {
        console.log("[add-to-pool] Created global_vocab_item:", newGlobal.id);
        globalVocabItemId = newGlobal.id;
      }
    }

    // 3) Sprawdź czy user_vocab link już istnieje
    console.log("[add-to-pool] Checking user_vocab link for userId:", userId, "globalId:", globalVocabItemId);
    const { data: existingLink, error: linkCheckErr } = await supabase
      .from("user_vocab")
      .select("student_id, global_vocab_item_id")
      .eq("student_id", userId)
      .eq("global_vocab_item_id", globalVocabItemId)
      .maybeSingle();

    if (linkCheckErr) {
      console.error("[add-to-pool] Error checking user_vocab:", linkCheckErr);
      return NextResponse.json({ error: linkCheckErr.message }, { status: 500 });
    }

    if (!existingLink) {
      // 4) Utwórz user_vocab link jeśli nie istnieje
      console.log("[add-to-pool] Creating user_vocab link");
      const { error: linkInsertErr } = await supabase.from("user_vocab").insert({
        student_id: userId,
        global_vocab_item_id: globalVocabItemId,
      });

      if (linkInsertErr) {
        console.error("[add-to-pool] Error inserting user_vocab:", linkInsertErr);
        // Ignoruj duplicate errors (możliwe race condition)
        if (!String(linkInsertErr.message).toLowerCase().includes("duplicate")) {
          return NextResponse.json(
            {
              error: `Failed to create user_vocab link: ${linkInsertErr.message}`,
              code: linkInsertErr.code,
              details: linkInsertErr,
            },
            { status: 500 }
          );
        }
        console.log("[add-to-pool] Ignored duplicate user_vocab error");
      } else {
        console.log("[add-to-pool] Successfully created user_vocab link");
      }
    } else {
      console.log("[add-to-pool] user_vocab link already exists");
    }

    return NextResponse.json({
      ok: true,
      global_vocab_item_id: globalVocabItemId,
      term_en_norm: term_en_norm,
    });
  } catch (e: any) {
    console.error("add-to-pool error:", e);
    return NextResponse.json(
      {
        error: e?.message ?? "Unknown error",
        stack: process.env.NODE_ENV === "development" ? e?.stack : undefined,
      },
      { status: 500 }
    );
  }
}
