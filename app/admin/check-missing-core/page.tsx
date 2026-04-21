"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";

const DEFAULT_WORDS = Array.from(
  new Set([
    "be", "have", "do", "say", "get", "make", "go", "know", "take", "see",
    "come", "think", "look", "want", "give", "use", "find", "tell", "ask", "work",
    "seem", "feel", "try", "leave", "call", "help", "start", "stop", "keep", "let",
    "put", "mean", "become", "show", "hear", "play", "run", "move", "live", "believe",
    "bring", "happen", "write", "provide", "sit", "stand", "lose", "pay", "meet", "include",
    "continue", "learn", "change", "lead", "understand", "watch", "follow", "create", "speak", "read",
    "allow", "add", "spend", "grow", "open", "walk", "win", "offer", "remember", "love",
    "consider", "appear", "buy", "wait", "serve", "die", "send", "expect", "build", "stay",
    "fall", "cut", "reach", "kill", "remain", "suggest", "raise", "pass", "sell", "require",
    "report", "decide", "pull", "return", "explain", "hope", "develop", "carry", "break", "receive",
    "agree", "support", "hit", "produce", "eat", "cover", "catch", "draw", "choose", "cause",
    "point", "listen", "realize", "place", "close", "involve", "increase", "improve", "tend", "rise",
    "good", "bad", "big", "small", "long", "short", "high", "low", "old", "young",
    "new", "early", "late", "important", "different", "same", "right", "wrong", "easy", "hard",
    "happy", "sad", "angry", "afraid", "ready", "sure", "clear", "free", "strong", "weak",
    "full", "empty", "closed", "busy", "tired", "ill", "healthy", "kind", "polite", "useful",
    "possible", "impossible", "beautiful", "ugly", "clean", "dirty", "rich", "poor", "safe", "dangerous",
    "fast", "slow", "hot", "cold", "warm", "cool", "loud", "quiet", "bright", "dark",
    "family", "friend", "mother", "father", "parent", "child", "baby", "boy", "girl", "man",
    "woman", "person", "people", "house", "home", "room", "kitchen", "bathroom", "bed", "table",
    "chair", "door", "window", "car", "bus", "train", "road", "street", "city", "town",
    "village", "school", "student", "teacher", "job", "money", "food", "water", "bread", "milk",
    "coffee", "tea", "apple", "banana", "meat", "fish", "egg", "fruit", "day", "night",
    "morning", "afternoon", "evening", "week", "month", "year", "time", "hour", "minute", "hand",
    "head", "face", "eye", "ear", "nose", "mouth", "arm", "leg", "back", "foot",
    "heart", "mind", "world", "country", "language", "word", "question", "answer", "problem", "idea",
    "thing", "place", "way", "life", "part", "number", "name", "book", "story", "film",
    "music", "game", "phone", "computer", "internet", "air", "weather", "rain", "snow", "sun",
    "wind", "sea", "river", "mountain", "tree", "flower", "animal", "dog", "cat", "bird",
    "horse", "cow", "sheep",
  ])
);

const DEFAULT_TEXT = DEFAULT_WORDS.join(", ");

function parseWords(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const part of text.split(/[,\n]/)) {
    const normalized = part.trim().toLowerCase();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }

  return out;
}

export default function AdminCheckMissingCorePage() {
  const [text, setText] = useState(DEFAULT_TEXT);
  const [missing, setMissing] = useState<string[]>([]);
  const [existing, setExisting] = useState<string[]>([]);
  const [created, setCreated] = useState<string[]>([]);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [failed, setFailed] = useState<Array<{ word: string; error: string }>>([]);
  const [warning, setWarning] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function getToken(): Promise<string | null> {
    const session = await supabase.auth.getSession();
    return session?.data?.session?.access_token ?? null;
  }

  async function onCheck(options?: { preserveImportResults?: boolean }) {
    setLoading(true);
    setError("");
    if (!options?.preserveImportResults) {
      setWarning("");
    }
    const words = parseWords(text);
    setMissing([]);
    setExisting([]);
    if (!options?.preserveImportResults) {
      setCreated([]);
      setSkipped([]);
      setFailed([]);
    }

    const token = await getToken();
    if (!token) {
      setError("Missing session token");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/admin/lexicon/check-missing-core", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ words }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error || "Check failed");
        return;
      }
      const data = (await res.json()) as { missing?: string[]; existing?: string[] };
      setMissing(Array.isArray(data.missing) ? data.missing : []);
      setExisting(Array.isArray(data.existing) ? data.existing : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Check failed");
    } finally {
      setLoading(false);
    }
  }

  async function onImport() {
    setLoading(true);
    setError("");
    setWarning("");
    setCreated([]);
    setSkipped([]);
    setFailed([]);

    const token = await getToken();
    if (!token) {
      setError("Missing session token");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/admin/lexicon/import-missing-core", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ words: missing }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        created?: string[];
        skipped?: string[];
        failed?: Array<{ word: string; error: string }>;
        warning?: string;
        error?: string;
      };

      if (!res.ok) {
        setError(data.error || "Import failed");
        return;
      }

      setCreated(Array.isArray(data.created) ? data.created : []);
      setSkipped(Array.isArray(data.skipped) ? data.skipped : []);
      setFailed(Array.isArray(data.failed) ? data.failed : []);
      setWarning(typeof data.warning === "string" ? data.warning : "");
      await onCheck({ preserveImportResults: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 720, fontFamily: "sans-serif" }}>
      <p>
        <a href="/admin">← Admin</a>
      </p>
      <h1 style={{ fontSize: "1.25rem" }}>Check missing core</h1>
      <p style={{ fontSize: "0.875rem", color: "#444" }}>Comma-separated lemmas → POST with Bearer token.</p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={8}
        style={{ width: "100%", boxSizing: "border-box", marginTop: 12, fontFamily: "inherit" }}
      />

      <button type="button" onClick={() => void onCheck()} style={{ marginTop: 12 }}>
        {loading ? "Working..." : "Check missing"}
      </button>
      <button type="button" onClick={() => void onImport()} style={{ marginTop: 12, marginLeft: 8 }} disabled={loading || missing.length === 0}>
        {loading ? "Working..." : "Import missing"}
      </button>

      {error ? <p style={{ marginTop: 16 }}>Error: {error}</p> : null}
      {warning ? <p style={{ marginTop: 16 }}>Warning: {warning}</p> : null}

      <section style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: "1rem" }}>Missing</h2>
        <ul>
          {missing.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: "1rem" }}>Existing</h2>
        <ul>
          {existing.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: "1rem" }}>Created</h2>
        <ul>
          {created.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: "1rem" }}>Skipped</h2>
        <ul>
          {skipped.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: "1rem" }}>Failed</h2>
        <ul>
          {failed.map((item) => (
            <li key={`${item.word}-${item.error}`}>
              {item.word}: {item.error}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
