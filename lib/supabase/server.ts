import { createClient } from "@supabase/supabase-js";

/**
 * Creates a Supabase client for route handlers with JWT token from Bearer header
 * This ensures RLS policies work correctly (auth.uid() is set)
 * 
 * Uses anon key with token in headers for RLS to work properly.
 * The token is verified first, then used in all subsequent requests.
 */
export async function createSupabaseServerWithToken(token: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  // Create client with token in headers - this is how RLS gets auth.uid()
  const client = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  // Verify token is valid by calling getUser
  // This doesn't set the session, but verifies the token
  const { data: userData, error: userErr } = await client.auth.getUser();
  if (userErr || !userData?.user) {
    throw new Error(`Invalid token: ${userErr?.message || "Authentication failed"}`);
  }

  // Note: RLS will work because we have Authorization header in global headers
  // Supabase PostgREST uses the JWT from Authorization header to set auth.uid()
  return client;
}
