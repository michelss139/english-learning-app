// app/api/vocab/repeat-suggestions/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getBearerToken(req: Request): string | null {
  const h = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!h) return null;
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() ?? null;
}

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(req: Request) {
  try {
    const token = getBearerToken(req);
    if (!token) return jsonError("Missing Authorization Bearer token", 401);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return jsonError("Server misconfigured: missing Supabase env vars", 500);
    }

    // 1) Zweryfikuj token i pobierz usera (anon client + JWT)
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userErr } = await supabaseAuth.auth.getUser(token);
    if (userErr || !userData?.user) return jsonError("Invalid or expired token", 401);

    const userId = userData.user.id;

    // 2) Zapytanie przez service role (stabilnie, bez RLS zależnego od request context)
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Widok: vocab_repeat_suggestions
    // Nie wiemy w 100%, jak nazywa się kolumna usera w widoku (student_id vs user_id),
    // więc robimy bezpieczny fallback.
    const terms: string[] = [];

    // próba 1: student_id
    {
      const { data, error } = await supabaseAdmin
        .from("vocab_repeat_suggestions")
        .select("term_en_norm")
        .eq("student_id", userId);

      if (!error && data) {
        for (const row of data as Array<{ term_en_norm: string }>) {
          if (row?.term_en_norm) terms.push(row.term_en_norm);
        }
      } else {
        // próba 2: user_id
        const { data: data2, error: error2 } = await supabaseAdmin
          .from("vocab_repeat_suggestions")
          .select("term_en_norm")
          .eq("user_id", userId);

        if (error2) {
          // Jeśli obie wersje nie pasują, zwróć czytelny błąd diagnostyczny (bez wycieku sekretów)
          return jsonError(
            "Cannot query vocab_repeat_suggestions (check view columns: expected student_id or user_id)",
            500
          );
        }

        if (data2) {
          for (const row of data2 as Array<{ term_en_norm: string }>) {
            if (row?.term_en_norm) terms.push(row.term_en_norm);
          }
        }
      }
    }

    // deduplikacja
    const unique = Array.from(new Set(terms));

    return NextResponse.json(
      { terms: unique },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (e) {
    return jsonError("Unexpected server error", 500);
  }
}
