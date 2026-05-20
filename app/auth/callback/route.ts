import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * Obsługa linków z maila Supabase (potwierdzenie konta, reset hasła, magic link).
 * W panelu Supabase → Authentication → URL configuration dodaj:
 *   Site URL: produkcyjny origin (np. https://twoja-domena.pl)
 *   Redirect URLs: http://localhost:3000/auth/callback, https://twoja-domena.pl/auth/callback
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const nextRaw = url.searchParams.get("next") ?? "/app";
  const next = nextRaw.startsWith("/") ? nextRaw : "/app";

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
            } catch {
              // Server Component boundary — ignoruj
            }
          },
        },
      }
    );

    const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Upewnij się że profil istnieje — trigger DB jest primary safety net,
      // ale jeśli username/avatar są w metadanych, uzupełniamy je tutaj.
      if (sessionData?.user) {
        const meta = (sessionData.user.user_metadata ?? {}) as {
          username?: string | null;
          avatar_url?: string | null;
          app_role?: string | null;
        };
        const role = meta.app_role === "teacher" ? "teacher" : "student";
        // Upsert — trigger już mógł stworzyć profil, uzupełniamy username/avatar
        await supabase.from("profiles").upsert(
          {
            id: sessionData.user.id,
            email: sessionData.user.email ?? null,
            role,
            username: meta.username ?? null,
            avatar_url: meta.avatar_url ?? null,
            subscription_status: "inactive",
          },
          { onConflict: "id", ignoreDuplicates: false }
        );
      }
      return NextResponse.redirect(`${url.origin}${next}`);
    }
  }

  return NextResponse.redirect(`${url.origin}/login?error=auth_callback`);
}
