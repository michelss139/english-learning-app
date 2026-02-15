/**
 * GET /api/vocab/clusters
 * 
 * Get list of vocab clusters with unlocked status
 * For unlockable clusters, checks if user has all required words and unlocks if needed
 */

import { NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/route";

type Cluster = {
  id: string;
  slug: string;
  title: string;
  is_recommended: boolean;
  is_unlockable: boolean;
  unlocked: boolean;
  unlocked_at: string | null;
};

export async function GET(req: Request) {
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

    // Get all clusters
    const { data: clusters, error: clustersErr } = await supabase
      .from("vocab_clusters")
      .select("*")
      .order("is_recommended", { ascending: false })
      .order("title");

    if (clustersErr) {
      return NextResponse.json({ error: `Failed to fetch clusters: ${clustersErr.message}` }, { status: 500 });
    }

    // Get user's unlocked clusters
    const { data: unlocked, error: unlockedErr } = await supabase
      .from("user_unlocked_vocab_clusters")
      .select("cluster_id, unlocked_at")
      .eq("student_id", studentId);

    if (unlockedErr) {
      return NextResponse.json({ error: `Failed to fetch unlocked clusters: ${unlockedErr.message}` }, { status: 500 });
    }

    const unlockedSet = new Set((unlocked || []).map((u) => u.cluster_id));
    const unlockedAtMap = new Map((unlocked || []).map((u) => [u.cluster_id, u.unlocked_at]));

    // Process clusters and check unlockable ones
    const result: Cluster[] = [];
    const clustersToUnlock: string[] = [];
    const newlyUnlockedSlugs: string[] = [];

    for (const cluster of clusters || []) {
      // Recommended clusters are always unlocked (no DB record needed)
      if (cluster.is_recommended) {
        result.push({
          id: cluster.id,
          slug: cluster.slug,
          title: cluster.title,
          is_recommended: cluster.is_recommended,
          is_unlockable: cluster.is_unlockable,
          unlocked: true, // Always unlocked
          unlocked_at: null, // No unlock record for recommended
        });
        continue;
      }

      // For unlockable clusters, check if record exists in user_unlocked_vocab_clusters
      const isUnlocked = unlockedSet.has(cluster.id);

      // If not unlocked, check if user has all required words
      if (cluster.is_unlockable && !isUnlocked) {
        // Get required entry_ids for this cluster
        const { data: clusterEntries, error: entriesErr } = await supabase
          .from("vocab_cluster_entries")
          .select("entry_id")
          .eq("cluster_id", cluster.id);

        if (entriesErr) {
          console.error(`[clusters] Error fetching entries for cluster ${cluster.slug}:`, entriesErr);
          // Still add to result as locked
          result.push({
            id: cluster.id,
            slug: cluster.slug,
            title: cluster.title,
            is_recommended: cluster.is_recommended,
            is_unlockable: cluster.is_unlockable,
            unlocked: false,
            unlocked_at: null,
          });
          continue;
        }

        if (clusterEntries && clusterEntries.length > 0) {
          const requiredEntryIds = clusterEntries.map((e) => e.entry_id);

          // Get user's vocab items with sense_id -> entry_id
          const { data: userVocab, error: userVocabErr } = await supabase
            .from("user_vocab_items")
            .select(
              `
              sense_id,
              lexicon_senses(entry_id)
            `
            )
            .eq("student_id", studentId)
            .eq("source", "lexicon");

          if (userVocabErr) {
            console.error(`[clusters] Error fetching user vocab:`, userVocabErr);
            // Still add to result as locked
            result.push({
              id: cluster.id,
              slug: cluster.slug,
              title: cluster.title,
              is_recommended: cluster.is_recommended,
              is_unlockable: cluster.is_unlockable,
              unlocked: false,
              unlocked_at: null,
            });
            continue;
          }

          // Extract entry_ids from user's vocab
          const userEntryIds = new Set<string>();
          for (const item of userVocab || []) {
            const sense = Array.isArray(item.lexicon_senses) ? item.lexicon_senses[0] : item.lexicon_senses;
            if (sense?.entry_id) {
              userEntryIds.add(sense.entry_id);
            }
          }

          // Check if user has all required entry_ids
          const hasAll = requiredEntryIds.every((entryId) => userEntryIds.has(entryId));

          if (hasAll) {
            clustersToUnlock.push(cluster.id);
            newlyUnlockedSlugs.push(cluster.slug);
          }
        }
      }

      // For unlockable clusters, unlocked status comes from DB record
      result.push({
        id: cluster.id,
        slug: cluster.slug,
        title: cluster.title,
        is_recommended: cluster.is_recommended,
        is_unlockable: cluster.is_unlockable,
        unlocked: isUnlocked || clustersToUnlock.includes(cluster.id),
        unlocked_at: unlockedAtMap.get(cluster.id) || (clustersToUnlock.includes(cluster.id) ? new Date().toISOString() : null),
      });
    }

    // Unlock clusters that meet the criteria
    if (clustersToUnlock.length > 0) {
      const unlocks = clustersToUnlock.map((clusterId) => ({
        student_id: studentId,
        cluster_id: clusterId,
      }));

      const { error: unlockErr } = await supabase.from("user_unlocked_vocab_clusters").insert(unlocks);

      if (unlockErr) {
        console.error("[clusters] Error unlocking clusters:", unlockErr);
        // Don't fail the request, just log the error
        // Remove from newlyUnlockedSlugs if insert failed
        newlyUnlockedSlugs.length = 0;
      }
    }

    return NextResponse.json({
      ok: true,
      clusters: result,
      newlyUnlockedSlugs: newlyUnlockedSlugs, // For banner display
    });
  } catch (e: any) {
    console.error("[clusters] Error:", e);
    return NextResponse.json(
      {
        error: e?.message ?? "Unknown error",
        stack: process.env.NODE_ENV === "development" ? e?.stack : undefined,
      },
      { status: 500 }
    );
  }
}
