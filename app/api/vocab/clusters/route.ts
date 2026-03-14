/**
 * GET /api/vocab/clusters
 *
 * Get list of vocab clusters for logged-in users.
 */

import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/route";
import { loadClusterCatalog } from "@/lib/vocab/clusterLoader";

export async function GET() {
  try {
    const supabase = await createSupabaseRouteClient();

    // Verify token and get user (this also sets the session for RLS)
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user?.id) {
      return NextResponse.json(
        { 
          error: "Invalid or expired token",
          code: "UNAUTHORIZED",
          message: userErr?.message || "Authentication failed"
        },
        { status: 401 }
      );
    }

    const studentId = user.id;

    const { clusters } = await loadClusterCatalog({
      supabase,
      studentId,
    });

    return NextResponse.json({
      ok: true,
      clusters,
    });
  } catch (e: unknown) {
    console.error("[clusters] Error:", e);
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Unknown error",
        stack: process.env.NODE_ENV === "development" && e instanceof Error ? e.stack : undefined,
      },
      { status: 500 }
    );
  }
}
