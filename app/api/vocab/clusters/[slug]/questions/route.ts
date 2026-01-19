/**
 * GET /api/vocab/clusters/[slug]/questions?limit=10
 * 
 * Get questions for a vocab cluster
 * Questions are built from lexicon_examples for senses belonging to cluster entries
 */

import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

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

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    // Auth: verify JWT token
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : "";

    if (!token) {
      return NextResponse.json({ error: "Missing Authorization bearer token" }, { status: 401 });
    }

    const supabase = createSupabaseAdmin();

    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user?.id) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const { slug } = await params;
    const url = new URL(req.url);
    const limitParam = url.searchParams.get("limit");
    const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10), 1), 10) : 10;

    // Get cluster
    const { data: cluster, error: clusterErr } = await supabase
      .from("vocab_clusters")
      .select("id, slug, title")
      .eq("slug", slug)
      .single();

    if (clusterErr || !cluster) {
      return NextResponse.json({ error: "Cluster not found" }, { status: 404 });
    }

    // Check cluster type and unlock status
    const { data: clusterData, error: clusterDataErr } = await supabase
      .from("vocab_clusters")
      .select("is_recommended, is_unlockable")
      .eq("id", cluster.id)
      .single();

    if (clusterDataErr || !clusterData) {
      return NextResponse.json({ error: "Cluster not found" }, { status: 404 });
    }

    // Recommended clusters are always unlocked (no DB check needed)
    if (clusterData.is_recommended) {
      // Continue to load questions
    } else if (clusterData.is_unlockable) {
      // For unlockable clusters, require unlock record
      const { data: unlocked } = await supabase
        .from("user_unlocked_vocab_clusters")
        .select("id")
        .eq("student_id", userData.user.id)
        .eq("cluster_id", cluster.id)
        .maybeSingle();

      if (!unlocked) {
        return NextResponse.json({ error: "Cluster is locked" }, { status: 403 });
      }
    }

    // Get cluster entry_ids
    const { data: clusterEntries, error: entriesErr } = await supabase
      .from("vocab_cluster_entries")
      .select("entry_id, lexicon_entries(lemma)")
      .eq("cluster_id", cluster.id);

    if (entriesErr) {
      return NextResponse.json({ error: `Failed to fetch cluster entries: ${entriesErr.message}` }, { status: 500 });
    }

    if (!clusterEntries || clusterEntries.length === 0) {
      return NextResponse.json({ ok: true, questions: [] });
    }

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

    // Get all senses for these entries
    const { data: senses, error: sensesErr } = await supabase
      .from("lexicon_senses")
      .select("id, entry_id")
      .in("entry_id", entryIds);

    if (sensesErr) {
      return NextResponse.json({ error: `Failed to fetch senses: ${sensesErr.message}` }, { status: 500 });
    }

    if (!senses || senses.length === 0) {
      return NextResponse.json({ ok: true, questions: [] });
    }

    const senseIds = senses.map((s) => s.id);
    const entryIdToLemma = new Map<string, string>();
    for (const entry of clusterEntries) {
      const lexiconEntry = Array.isArray(entry.lexicon_entries) ? entry.lexicon_entries[0] : entry.lexicon_entries;
      if (lexiconEntry?.lemma) {
        entryIdToLemma.set(entry.entry_id, lexiconEntry.lemma);
      }
    }

    // Get examples for these senses
    const { data: examples, error: examplesErr } = await supabase
      .from("lexicon_examples")
      .select("id, sense_id, example_en, lexicon_senses(entry_id)")
      .in("sense_id", senseIds)
      .limit(limit * 3); // Get more than needed, then filter

    if (examplesErr) {
      return NextResponse.json({ error: `Failed to fetch examples: ${examplesErr.message}` }, { status: 500 });
    }

    if (!examples || examples.length === 0) {
      return NextResponse.json({ ok: true, questions: [] });
    }

    // Build questions
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

      // Shuffle choices (always include correct answer)
      const shuffledChoices = [...lemmas].sort(() => Math.random() - 0.5);

      questions.push({
        id: example.id,
        prompt,
        choices: shuffledChoices,
        answer: correctLemma,
      });

      usedExampleIds.add(example.id);
    }

    return NextResponse.json({
      ok: true,
      questions: questions.slice(0, limit),
    });
  } catch (e: any) {
    console.error("[clusters/questions] Error:", e);
    return NextResponse.json(
      {
        error: e?.message ?? "Unknown error",
        stack: process.env.NODE_ENV === "development" ? e?.stack : undefined,
      },
      { status: 500 }
    );
  }
}
