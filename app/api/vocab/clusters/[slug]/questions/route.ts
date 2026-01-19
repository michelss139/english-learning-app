/**
 * GET /api/vocab/clusters/[slug]/questions?limit=10
 * 
 * Get questions for a vocab cluster
 * Questions are built from lexicon_examples for senses belonging to cluster entries
 */

import { NextResponse } from "next/server";
import { createSupabaseServerWithToken } from "@/lib/supabase/server";

type Question = {
  id: string; // example_id
  prompt: string; // example_en with word masked as "_____"
  choices: string[]; // array of lemmas from cluster
  answer: string; // correct lemma
};

// Mask word in sentence (case-insensitive, handles basic inflections)
function maskWord(sentence: string, lemma: string): string {
  // Escape special regex characters in lemma
  const escapedLemma = lemma.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  
  // Patterns to match: lemma, lemma + 's', lemma + 'ed', lemma + 'ing', lemma + 'es'
  // Use word boundaries to avoid partial matches
  const patterns = [
    new RegExp(`\\b${escapedLemma}\\b`, "gi"),
    new RegExp(`\\b${escapedLemma}s\\b`, "gi"),
    new RegExp(`\\b${escapedLemma}ed\\b`, "gi"),
    new RegExp(`\\b${escapedLemma}ing\\b`, "gi"),
    new RegExp(`\\b${escapedLemma}es\\b`, "gi"),
  ];

  let masked = sentence;
  // Replace in reverse order (longer patterns first) to avoid double replacement
  for (let i = patterns.length - 1; i >= 0; i--) {
    masked = masked.replace(patterns[i], "_____");
  }

  return masked;
}

function errorResponse(step: string, error: any, status = 500) {
  return NextResponse.json(
    {
      ok: false,
      step,
      message: error?.message || "Unknown error",
      details: error?.details || null,
      hint: error?.hint || null,
      code: error?.code || null,
    },
    { status }
  );
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const url = new URL(req.url);
  const limitParam = url.searchParams.get("limit");
  let limit = 10;
  
  try {
    limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10), 1), 10) : 10;
  } catch (e) {
    console.error("[clusters/questions] Invalid limit param:", limitParam);
    limit = 10;
  }

  console.log("[clusters/questions] Request:", { slug, limit });

  try {
    // Step 1: Auth - verify JWT token
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : "";

    if (!token) {
      console.error("[clusters/questions] Step 1: Missing token");
      return errorResponse("auth", { message: "Missing Authorization bearer token", code: "UNAUTHORIZED" }, 401);
    }

    // Step 2: Create Supabase client with user auth context (for RLS)
    let supabase;
    try {
      supabase = await createSupabaseServerWithToken(token);
      console.log("[clusters/questions] Step 2: Supabase client created");
    } catch (e: any) {
      console.error("[clusters/questions] Step 2: Failed to create client:", e);
      return errorResponse("create_client", e, 500);
    }

    // Step 3: Verify token and get user
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user?.id) {
      console.error("[clusters/questions] Step 3: Auth failed:", { userErr, userId: userData?.user?.id });
      return errorResponse("verify_user", userErr || { message: "Authentication failed" }, 401);
    }

    const userId = userData.user.id;
    console.log("[clusters/questions] Step 3: User verified:", { userId, slug, limit });

    // Step 4: Get cluster
    const { data: cluster, error: clusterErr } = await supabase
      .from("vocab_clusters")
      .select("id, slug, title, is_recommended, is_unlockable")
      .eq("slug", slug)
      .single();

    if (clusterErr) {
      console.error("[clusters/questions] Step 4: Cluster fetch error:", clusterErr);
      if (clusterErr.code === "PGRST116") {
        return errorResponse("fetch_cluster", { ...clusterErr, message: `Cluster with slug "${slug}" does not exist"` }, 404);
      }
      if (clusterErr.code === "42501" || clusterErr.message?.includes("permission denied")) {
        return errorResponse("fetch_cluster", { ...clusterErr, message: "Row Level Security policy prevented access" }, 403);
      }
      return errorResponse("fetch_cluster", clusterErr, 500);
    }

    if (!cluster) {
      console.error("[clusters/questions] Step 4: Cluster not found (null)");
      return errorResponse("fetch_cluster", { message: `Cluster with slug "${slug}" not found`, code: "NOT_FOUND" }, 404);
    }

    console.log("[clusters/questions] Step 4: Cluster found:", { id: cluster.id, slug: cluster.slug, is_recommended: cluster.is_recommended, is_unlockable: cluster.is_unlockable });

    // Step 5: Check unlock status
    let isUnlocked = false;
    if (cluster.is_recommended) {
      isUnlocked = true;
      console.log("[clusters/questions] Step 5: Recommended cluster - always unlocked");
    } else if (cluster.is_unlockable) {
      // For unlockable clusters, require unlock record
      // Table has composite PK (student_id, cluster_id), no id column
      const { data: unlocked, error: unlockedErr } = await supabase
        .from("user_unlocked_vocab_clusters")
        .select("unlocked_at")
        .eq("student_id", userId)
        .eq("cluster_id", cluster.id)
        .maybeSingle();

      if (unlockedErr) {
        console.error("[clusters/questions] Step 5: Unlock check error:", unlockedErr);
        if (unlockedErr.code === "42501" || unlockedErr.message?.includes("permission denied")) {
          return errorResponse("check_unlock", { ...unlockedErr, message: "Row Level Security policy prevented access" }, 403);
        }
        return errorResponse("check_unlock", unlockedErr, 500);
      }

      isUnlocked = !!unlocked;
      console.log("[clusters/questions] Step 5: Unlockable cluster - unlocked:", isUnlocked, unlocked ? `(unlocked_at: ${unlocked.unlocked_at})` : "");

      if (!isUnlocked) {
        return errorResponse("check_unlock", { 
          message: "Cluster is locked. Add all words from this cluster to your pool to unlock it.",
          code: "LOCKED" 
        }, 403);
      }
    }

    // Step 6: Get cluster entry_ids
    const { data: clusterEntries, error: entriesErr } = await supabase
      .from("vocab_cluster_entries")
      .select("entry_id, lexicon_entries(lemma)")
      .eq("cluster_id", cluster.id);

    if (entriesErr) {
      console.error("[clusters/questions] Step 6: Cluster entries error:", entriesErr);
      return errorResponse("fetch_cluster_entries", entriesErr, 500);
    }

    if (!clusterEntries || clusterEntries.length === 0) {
      console.log("[clusters/questions] Step 6: No cluster entries found");
      return NextResponse.json({ ok: true, questions: [] });
    }

    console.log("[clusters/questions] Step 6: Cluster entries found:", clusterEntries.length);

    // Extract entry_ids and lemmas
    const entryIds = clusterEntries.map((e) => e.entry_id);
    const lemmas: string[] = [];
    for (const entry of clusterEntries) {
      const lexiconEntry = Array.isArray(entry.lexicon_entries) ? entry.lexicon_entries[0] : entry.lexicon_entries;
      if (lexiconEntry?.lemma) {
        lemmas.push(lexiconEntry.lemma);
      }
    }

    if (lemmas.length === 0) {
      return NextResponse.json({ ok: true, questions: [] });
    }

    // Step 7: Get all senses for these entries
    const { data: senses, error: sensesErr } = await supabase
      .from("lexicon_senses")
      .select("id, entry_id")
      .in("entry_id", entryIds);

    if (sensesErr) {
      console.error("[clusters/questions] Step 7: Senses error:", sensesErr);
      return errorResponse("fetch_senses", sensesErr, 500);
    }

    if (!senses || senses.length === 0) {
      console.log("[clusters/questions] Step 7: No senses found");
      return NextResponse.json({ ok: true, questions: [] });
    }

    console.log("[clusters/questions] Step 7: Senses found:", senses.length);

    const senseIds = senses.map((s) => s.id);
    const entryIdToLemma = new Map<string, string>();
    for (const entry of clusterEntries) {
      const lexiconEntry = Array.isArray(entry.lexicon_entries) ? entry.lexicon_entries[0] : entry.lexicon_entries;
      if (lexiconEntry?.lemma) {
        entryIdToLemma.set(entry.entry_id, lexiconEntry.lemma);
      }
    }

    // Step 8: Get examples for these senses with rotation (order by last_used_at)
    // Priority: null last_used_at first, then oldest last_used_at
    const { data: examples, error: examplesErr } = await supabase
      .from("lexicon_examples")
      .select("id, sense_id, example_en, lexicon_senses(entry_id)")
      .in("sense_id", senseIds)
      .order("last_used_at", { ascending: true, nullsFirst: true })
      .limit(limit * 3); // Get more than needed, then filter

    if (examplesErr) {
      console.error("[clusters/questions] Step 8: Examples error:", examplesErr);
      return errorResponse("fetch_examples", examplesErr, 500);
    }

    if (!examples || examples.length === 0) {
      console.log("[clusters/questions] Step 8: No examples found");
      return NextResponse.json({ ok: true, questions: [] });
    }

    console.log("[clusters/questions] Step 8: Examples found:", examples.length);

    // Step 9: Build questions
    const questions: Question[] = [];
    const usedExampleIds = new Set<string>();

    for (const example of examples) {
      if (questions.length >= limit) break;
      if (usedExampleIds.has(example.id)) continue;

      const sense = Array.isArray(example.lexicon_senses) ? example.lexicon_senses[0] : example.lexicon_senses;
      if (!sense?.entry_id) continue;

      const correctLemma = entryIdToLemma.get(sense.entry_id);
      if (!correctLemma) continue;

      // Check if example contains the word (case-insensitive)
      const lowerExample = example.example_en.toLowerCase();
      const lowerLemma = correctLemma.toLowerCase();
      if (
        !lowerExample.includes(lowerLemma) &&
        !lowerExample.includes(`${lowerLemma}s`) &&
        !lowerExample.includes(`${lowerLemma}ed`) &&
        !lowerExample.includes(`${lowerLemma}ing`) &&
        !lowerExample.includes(`${lowerLemma}es`)
      ) {
        continue; // Skip examples that don't contain the word
      }

      // Mask the word
      const prompt = maskWord(example.example_en, correctLemma);

      // Shuffle choices (always include correct answer) - keep this shuffle for UI variety
      const shuffledChoices = [...lemmas].sort(() => Math.random() - 0.5);

      questions.push({
        id: example.id,
        prompt,
        choices: shuffledChoices,
        answer: correctLemma,
      });

      usedExampleIds.add(example.id);
    }

    console.log("[clusters/questions] Step 9: Questions built:", questions.length);

    // Step 10: Update last_used_at for used examples
    const exampleIdsToUpdate = Array.from(usedExampleIds);
    if (exampleIdsToUpdate.length > 0) {
      const { error: updateErr } = await supabase
        .from("lexicon_examples")
        .update({ last_used_at: new Date().toISOString() })
        .in("id", exampleIdsToUpdate);

      if (updateErr) {
        console.error("[clusters/questions] Step 10: Update last_used_at error:", updateErr);
        // Don't fail the request, just log the error
      } else {
        console.log("[clusters/questions] Step 10: Updated last_used_at for", exampleIdsToUpdate.length, "examples");
      }
    }
    
    return NextResponse.json({
      ok: true,
      questions: questions.slice(0, limit),
    });
  } catch (e: any) {
    console.error("[clusters/questions] Unexpected error:", e);
    return errorResponse("unexpected", e, 500);
  }
}
