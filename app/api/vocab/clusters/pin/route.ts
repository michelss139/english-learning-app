import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/route";
import { parsePinnedClusterSlugs, writePinnedClusterSlugs } from "@/lib/vocab/pinnedClusters";

type Body = {
  slug?: string;
};

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseRouteClient();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as Body | null;
    const slug = body?.slug?.trim();
    if (!slug) {
      return NextResponse.json({ error: "slug is required" }, { status: 400 });
    }

    const { data: cluster, error: clusterErr } = await supabase
      .from("vocab_clusters")
      .select("slug")
      .eq("slug", slug)
      .maybeSingle();

    if (clusterErr) return NextResponse.json({ error: clusterErr.message }, { status: 500 });
    if (!cluster) return NextResponse.json({ error: "Cluster not found" }, { status: 404 });

    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("id, notes")
      .eq("id", user.id)
      .maybeSingle();

    if (profileErr) return NextResponse.json({ error: profileErr.message }, { status: 500 });
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    const current = parsePinnedClusterSlugs(profile.notes);
    const set = new Set(current);
    const pinned = !set.has(slug);
    if (pinned) set.add(slug);
    else set.delete(slug);

    const updatedNotes = writePinnedClusterSlugs(profile.notes, Array.from(set));
    const { error: updateErr } = await supabase.from("profiles").update({ notes: updatedNotes }).eq("id", user.id);
    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

    return NextResponse.json({ ok: true, pinned, slug, pinned_slugs: Array.from(set) });
  } catch (e: unknown) {
    console.error("[clusters/pin] Error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}

