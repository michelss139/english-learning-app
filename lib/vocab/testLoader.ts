/**
 * Helper to load test items from different sources (pool, lesson, ids)
 * Returns TestItem[] with term_en, translation_pl, pos
 */

import { createSupabaseAdmin } from "@/lib/supabase/admin";

export type TestItem = {
  id: string; // user_vocab_item_id
  term_en: string;
  translation_pl: string | null;
  pos?: string | null;
};

type LoadTestItemsParams = {
  studentId: string;
  source: "pool" | "lesson" | "ids";
  selectedIds?: string[]; // user_vocab_item_ids (canonical parameter for all sources)
  lessonId?: string; // for lesson source
};

/**
 * Load test items from specified source
 */
export async function loadTestItems(params: LoadTestItemsParams): Promise<TestItem[]> {
  const { studentId, source, selectedIds, lessonId } = params;
  const supabase = createSupabaseAdmin();

  let userVocabItemIds: string[] = [];

  if (source === "pool") {
    // Pool: use selectedIds (user_vocab_item_ids)
    if (!selectedIds || selectedIds.length === 0) {
      return [];
    }
    userVocabItemIds = selectedIds;
  } else if (source === "lesson") {
    // Lesson: get selectedIds from lesson_vocab_items
    if (!lessonId) {
      throw new Error("lessonId required for lesson source");
    }
    
    if (selectedIds && selectedIds.length > 0) {
      // Use provided selectedIds (from UI checkboxes)
      userVocabItemIds = selectedIds;
    } else {
      // Fallback: get all words from lesson (if no selection provided)
      const { data: lessonVocab, error: lessonErr } = await supabase
        .from("lesson_vocab_items")
        .select("user_vocab_item_id")
        .eq("student_lesson_id", lessonId);
      
      if (lessonErr) throw lessonErr;
      userVocabItemIds = (lessonVocab || []).map((lv) => lv.user_vocab_item_id);
    }
  } else if (source === "ids") {
    // Legacy: ids source (but still uses selectedIds parameter for consistency)
    if (!selectedIds || selectedIds.length === 0) {
      return [];
    }
    userVocabItemIds = selectedIds;
  } else {
    throw new Error(`Unknown source: ${source}`);
  }

  if (userVocabItemIds.length === 0) {
    return [];
  }

  // Load user_vocab_items with lexicon data (lemma, translation, pos)
  const { data: userItems, error: itemsErr } = await supabase
    .from("user_vocab_items")
    .select(
      `
      id,
      custom_lemma,
      custom_translation_pl,
      source,
      verified,
      lexicon_senses(
        id,
        lexicon_entries(lemma, pos),
        lexicon_translations(translation_pl)
      )
    `
    )
    .eq("student_id", studentId)
    .in("id", userVocabItemIds);

  if (itemsErr) throw itemsErr;

  // Map to TestItem format
  const testItems: TestItem[] = [];

  for (const item of userItems || []) {
    let term_en: string;
    let translation_pl: string | null = null;
    let pos: string | null = null;

    if (item.source === "lexicon" && item.lexicon_senses) {
      // Lexicon word: get from lexicon
      const sense = Array.isArray(item.lexicon_senses) 
        ? item.lexicon_senses[0] 
        : item.lexicon_senses;
      
      if (sense) {
        const entry = Array.isArray(sense.lexicon_entries)
          ? sense.lexicon_entries[0]
          : sense.lexicon_entries;
        
        if (entry) {
          term_en = entry.lemma || "";
          pos = entry.pos || null;
        } else {
          term_en = item.custom_lemma || "";
        }

        // lexicon_translations can be array or single object
        let translation: any = null;
        if (Array.isArray(sense.lexicon_translations)) {
          translation = sense.lexicon_translations[0] || null;
        } else if (sense.lexicon_translations) {
          translation = sense.lexicon_translations;
        }
        
        translation_pl = translation?.translation_pl || null;
      } else {
        term_en = item.custom_lemma || "";
      }
    } else {
      // Custom word
      term_en = item.custom_lemma || "";
      translation_pl = item.custom_translation_pl || null;
    }

    if (!term_en) continue; // Skip items without term_en

    testItems.push({
      id: item.id,
      term_en,
      translation_pl,
      pos,
    });
  }

  return testItems;
}
