import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

const JWT_PATTERN = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

function isJwt(value: string): boolean {
  return JWT_PATTERN.test(value);
}

function extractTokenFromParsed(parsed: unknown): string | null {
  if (!parsed) return null;

  if (typeof parsed === "string") {
    return isJwt(parsed) ? parsed : null;
  }

  if (Array.isArray(parsed)) {
    const candidate = parsed[0];
    if (typeof candidate === "string" && isJwt(candidate)) return candidate;
    return null;
  }

  if (typeof parsed === "object") {
    const obj = parsed as Record<string, unknown>;
    const direct = obj.access_token;
    if (typeof direct === "string" && isJwt(direct)) return direct;

    const currentSession = obj.currentSession;
    if (currentSession && typeof currentSession === "object") {
      const nested = (currentSession as Record<string, unknown>).access_token;
      if (typeof nested === "string" && isJwt(nested)) return nested;
    }
  }

  return null;
}

function decodePossibleBase64CookieValue(value: string): string {
  if (!value.startsWith("base64-")) return value;
  const encoded = value.slice("base64-".length);
  try {
    return Buffer.from(encoded, "base64").toString("utf8");
  } catch {
    return value;
  }
}

function extractTokenFromCookieValue(rawValue: string): string | null {
  const decoded = decodeURIComponent(rawValue);
  const value = decodePossibleBase64CookieValue(decoded);

  try {
    const parsed = JSON.parse(value);
    const token = extractTokenFromParsed(parsed);
    if (token) return token;
  } catch {
    // not JSON payload, try plain token next
  }

  if (isJwt(value)) return value;

  return null;
}

function readAuthCookieValue(allCookies: Array<{ name: string; value: string }>): string | null {
  const exact = allCookies.find((c) => /^sb-.*-auth-token$/.test(c.name));
  if (exact?.value) return exact.value;

  const chunked = allCookies
    .filter((c) => /^sb-.*-auth-token\.\d+$/.test(c.name))
    .sort((a, b) => {
      const aIdx = Number(a.name.split(".").pop() ?? "0");
      const bIdx = Number(b.name.split(".").pop() ?? "0");
      return aIdx - bIdx;
    });

  if (chunked.length === 0) return null;
  return chunked.map((c) => c.value).join("");
}

async function readSupabaseAccessTokenFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  const all = cookieStore.getAll();
  const raw = readAuthCookieValue(all);
  if (!raw) return null;
  return extractTokenFromCookieValue(raw);
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
