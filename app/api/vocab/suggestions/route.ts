/**
 * GET /api/vocab/suggestions
 * 
 * Get word suggestions for training based on error history.
 * 
 * Query params:
 * - selectedIds: comma-separated user_vocab_item_ids (to exclude from suggestions)
 * 
 * Returns:
 * - items: array of { id, term_en, translation_pl, pos, error_rate }
 * - Only words with same POS as selected words
 * - Only words with attempts >= 3
 * - Sorted by error_rate DESC, last_seen DESC
 * - Limit 5
 */

import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

type SuggestionItem = {
  id: string; // user_vocab_item_id
  term_en: string;
  translation_pl: string | null;
  pos: string | null;
  error_rate: number; // wrongs / attempts
};

export async function GET(req: Request) {
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

    const studentId = userData.user.id;

    // Parse selectedIds from query params
    const url = new URL(req.url);
    const selectedIdsParam = url.searchParams.get("selectedIds") || "";
    const selectedIds = selectedIdsParam
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    // If no selectedIds, return empty (no suggestions without context)
    if (selectedIds.length === 0) {
      return NextResponse.json({
        ok: true,
        items: [],
      });
    }

    // Step 1: Get POS of selected words
    // Join: user_vocab_items -> lexicon_senses -> lexicon_entries (pos)
    const { data: selectedItems, error: selectedErr } = await supabase
      .from("user_vocab_items")
      .select(
        `
        id,
        sense_id,
        lexicon_senses(
          entry_id,
          lexicon_entries(pos)
        )
      `
      )
      .eq("student_id", studentId)
      .in("id", selectedIds)
      .eq("source", "lexicon"); // Only lexicon words have POS

    if (selectedErr) {
      return NextResponse.json({ error: `Failed to fetch selected items: ${selectedErr.message}` }, { status: 500 });
    }

    if (!selectedItems || selectedItems.length === 0) {
      // No lexicon words selected, return empty
      return NextResponse.json({
        ok: true,
        items: [],
      });
    }

    // Extract POS values from selected words
    const selectedPosSet = new Set<string>();
    for (const item of selectedItems) {
      const sense = Array.isArray(item.lexicon_senses) ? item.lexicon_senses[0] : item.lexicon_senses;
      if (sense) {
        const entry = Array.isArray(sense.lexicon_entries) ? sense.lexicon_entries[0] : sense.lexicon_entries;
        if (entry?.pos) {
          selectedPosSet.add(entry.pos);
        }
      }
    }

    // If no POS found, return empty
    if (selectedPosSet.size === 0) {
      return NextResponse.json({
        ok: true,
        items: [],
      });
    }

    const selectedPosArray = Array.from(selectedPosSet);

    // Step 2: Get all user's lexicon words (excluding selectedIds)
    const { data: allCandidateItems, error: allCandidatesErr } = await supabase
      .from("user_vocab_items")
      .select(
        `
        id,
        sense_id,
        custom_lemma,
        custom_translation_pl,
        lexicon_senses(
          entry_id,
          lexicon_entries(lemma, pos),
          lexicon_translations(translation_pl)
        )
      `
      )
      .eq("student_id", studentId)
      .eq("source", "lexicon");

    if (allCandidatesErr) {
      return NextResponse.json({ error: `Failed to fetch candidates: ${allCandidatesErr.message}` }, { status: 500 });
    }

    // Filter out selectedIds in JavaScript (Supabase .not() with array is tricky)
    const selectedIdsSet = new Set(selectedIds);
    const candidateItems = (allCandidateItems || []).filter((item) => !selectedIdsSet.has(item.id));

    if (candidateItems.length === 0) {
      return NextResponse.json({
        ok: true,
        items: [],
      });
    }

    // Filter candidates by POS
    const candidatesWithPos: Array<{
      id: string;
      term_en: string;
      translation_pl: string | null;
      pos: string;
    }> = [];

    for (const item of candidateItems) {
      const sense = Array.isArray(item.lexicon_senses) ? item.lexicon_senses[0] : item.lexicon_senses;
      if (!sense) continue;

      const entry = Array.isArray(sense.lexicon_entries) ? sense.lexicon_entries[0] : sense.lexicon_entries;
      if (!entry?.pos) continue;

      // Only include if POS matches
      if (!selectedPosArray.includes(entry.pos)) continue;

      const translation = Array.isArray(sense.lexicon_translations)
        ? sense.lexicon_translations[0]
        : sense.lexicon_translations;

      candidatesWithPos.push({
        id: item.id,
        term_en: entry.lemma || item.custom_lemma || "",
        translation_pl: translation?.translation_pl || item.custom_translation_pl || null,
        pos: entry.pos,
      });
    }

    if (candidatesWithPos.length === 0) {
      return NextResponse.json({
        ok: true,
        items: [],
      });
    }

    const candidateIds = candidatesWithPos.map((c) => c.id);

    // Step 3: Get event statistics per user_vocab_item_id
    // Filter: evaluation IN ('correct','wrong'), student_id = current user
    const { data: events, error: eventsErr } = await supabase
      .from("vocab_answer_events")
      .select("user_vocab_item_id, evaluation, created_at")
      .eq("student_id", studentId)
      .in("user_vocab_item_id", candidateIds)
      .in("evaluation", ["correct", "wrong"]);

    if (eventsErr) {
      return NextResponse.json({ error: `Failed to fetch events: ${eventsErr.message}` }, { status: 500 });
    }

    // Step 4: Calculate statistics per user_vocab_item_id
    type Stats = {
      attempts: number;
      wrongs: number;
      error_rate: number;
      last_seen: Date | null;
    };

    const statsMap = new Map<string, Stats>();

    for (const event of events || []) {
      const itemId = event.user_vocab_item_id;
      if (!statsMap.has(itemId)) {
        statsMap.set(itemId, {
          attempts: 0,
          wrongs: 0,
          error_rate: 0,
          last_seen: null,
        });
      }

      const stats = statsMap.get(itemId)!;
      stats.attempts++;
      if (event.evaluation === "wrong") {
        stats.wrongs++;
      }

      const eventDate = new Date(event.created_at);
      if (!stats.last_seen || eventDate > stats.last_seen) {
        stats.last_seen = eventDate;
      }
    }

    // Calculate error_rate for all items
    for (const [itemId, stats] of statsMap.entries()) {
      stats.error_rate = stats.attempts > 0 ? stats.wrongs / stats.attempts : 0;
    }

    // Step 5: Filter by attempts >= 3 and build suggestions
    const suggestions: SuggestionItem[] = [];

    for (const candidate of candidatesWithPos) {
      const stats = statsMap.get(candidate.id);
      if (!stats || stats.attempts < 3) continue; // Skip items with < 3 attempts

      suggestions.push({
        id: candidate.id,
        term_en: candidate.term_en,
        translation_pl: candidate.translation_pl,
        pos: candidate.pos,
        error_rate: stats.error_rate,
        // Store last_seen for sorting (not in response, but we'll use it)
        ...({ _last_seen: stats.last_seen } as any),
      });
    }

    // Step 6: Sort by error_rate DESC, then last_seen DESC
    suggestions.sort((a, b) => {
      // First by error_rate DESC
      if (a.error_rate !== b.error_rate) {
        return b.error_rate - a.error_rate;
      }
      // Then by last_seen DESC (most recent first)
      const aLastSeen = (a as any)._last_seen;
      const bLastSeen = (b as any)._last_seen;
      if (aLastSeen && bLastSeen) {
        return bLastSeen.getTime() - aLastSeen.getTime();
      }
      if (aLastSeen) return -1;
      if (bLastSeen) return 1;
      return 0;
    });

    // Step 7: Limit to 5
    const limited = suggestions.slice(0, 5);

    // Remove internal _last_seen field
    const result: SuggestionItem[] = limited.map((item) => {
      const { _last_seen, ...rest } = item as SuggestionItem & { _last_seen?: Date };
      return rest;
    });

    return NextResponse.json({
      ok: true,
      items: result,
    });
  } catch (e: any) {
    console.error("[suggestions] Error:", e);
    return NextResponse.json(
      {
        error: e?.message ?? "Unknown error",
        stack: process.env.NODE_ENV === "development" ? e?.stack : undefined,
      },
      { status: 500 }
    );
  }
}
