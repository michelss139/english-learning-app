import { createClient } from "@supabase/supabase-js";

/**
 * Creates a Supabase client for route handlers with JWT token from Bearer header
 * This ensures RLS policies work correctly (auth.uid() is set)
 * 
 * The token is passed in headers for each request, and we verify it first.
 * For RLS to work, we need to set the session. We use getUser() which verifies
 * the token and can be used to set the auth context.
 */
export async function createSupabaseServerWithToken(token: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

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

  // Verify token and set session for RLS
  // getUser() with token verifies and sets the auth context
  const { data: userData, error: userErr } = await client.auth.getUser(token);
  if (userErr || !userData?.user) {
    throw new Error(`Invalid token: ${userErr?.message || "Authentication failed"}`);
  }

  // Set session so RLS policies can access auth.uid()
  // We need both access_token and refresh_token for setSession to work properly
  // Since we only have access_token, we'll use a workaround: set the session with
  // the access_token and a dummy refresh_token, or use the token in headers for each request
  try {
    // Try to set session - this may fail if refresh_token is required
    await client.auth.setSession({
      access_token: token,
      refresh_token: token, // Use token as both - this is a workaround
    });
  } catch (e) {
    // If setSession fails, the token in headers should still work for RLS
    // RLS checks auth.uid() which is set by getUser() above
    console.warn("[supabase/server] setSession failed, using token in headers:", e);
  }

  return client;
}
