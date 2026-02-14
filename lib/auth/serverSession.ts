import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

function extractTokenFromCookieValue(rawValue: string): string | null {
  const value = decodeURIComponent(rawValue);

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed) && typeof parsed[0] === "string" && parsed[0].length > 0) {
      return parsed[0];
    }
  } catch {
    // not JSON payload, try plain token next
  }

  if (value.length > 20 && value.split(".").length === 3) {
    return value;
  }
  return null;
}

async function readSupabaseAccessTokenFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  const all = cookieStore.getAll();
  const authCookie = all.find((c) => c.name.startsWith("sb-") && c.name.endsWith("-auth-token"));
  if (!authCookie?.value) return null;
  return extractTokenFromCookieValue(authCookie.value);
}

export async function requireServerSessionOrRedirect() {
  const token = await readSupabaseAccessTokenFromCookies();
  if (!token) redirect("/login");

  const supabase = createSupabaseAdmin();
  const { data: userData, error } = await supabase.auth.getUser(token);
  if (error || !userData?.user?.id) redirect("/login");

  return {
    userId: userData.user.id,
    accessToken: token,
  };
}
