import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Resolve the current user id from either:
 * - `Authorization: Bearer <access_token>` (e.g. client fetch), or
 * - Supabase session cookies (e.g. same-origin browser GET).
 */
export async function getUserIdFromApiRequest(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : "";

  const supabaseAdmin = createSupabaseAdmin();

  if (token) {
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData?.user?.id) return null;
    return userData.user.id;
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}
