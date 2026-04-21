"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

type PatternType = "collocation" | "preposition" | "complement";

type SearchSenseRow = {
  sense_id: string;
  lemma: string;
  pos: string;
  translation_pl: string | null;
  definition_en: string;
};

type PatternItem = {
  type: PatternType;
  pattern: string;
  example_en: string;
  example_pl: string | null;
};

type GenerateResponse = {
  sense?: {
    sense_id: string;
    lemma: string;
    definition: string;
  };
  patterns?: PatternItem[];
  error?: string;
};

type SaveResponse = {
  inserted?: number;
  skipped?: number;
  error?: string;
};

export default function AdminLexiconBuilderPage() {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchSenseRow[]>([]);
  const [selectedSense, setSelectedSense] = useState<SearchSenseRow | null>(null);
  const [sense, setSense] = useState<GenerateResponse["sense"] | null>(null);
  const [patterns, setPatterns] = useState<PatternItem[]>([]);
  const [selectedPatterns, setSelectedPatterns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ inserted: number; skipped: number } | null>(null);
  const [searchAttempted, setSearchAttempted] = useState(false);
  const [searchError, setSearchError] = useState("");

  const togglePattern = (patternValue: string) => {
    setSelectedPatterns((current) =>
      current.includes(patternValue) ? current.filter((value) => value !== patternValue) : [...current, patternValue]
    );
  };

  const getToken = async (): Promise<string | null> => {
    const session = await supabase.auth.getSession();
    return session?.data?.session?.access_token ?? null;
  };

  const handleSelectAll = () => {
    setSelectedPatterns(patterns.map((item) => item.pattern));
  };

  const handleClearAll = () => {
    setSelectedPatterns([]);
  };

  const handleSearch = async () => {
    setLoading(true);
    setResult(null);
    setSense(null);
    setPatterns([]);
    setSelectedPatterns([]);
    setSelectedSense(null);
    setSearchAttempted(false);
    setSearchError("");

    try {
      const token = await getToken();
      if (!token) {
        setSearchError("Missing session token");
        console.error("Missing session token");
        setSearchResults([]);
        setSearchAttempted(true);
        return;
      }

      const res = await fetch(`/api/admin/lexicon/search-senses?q=${encodeURIComponent(query)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = (await res.json().catch(() => [])) as SearchSenseRow[] | { error?: string };
      if (!res.ok) {
        const errorMessage = Array.isArray(data) ? `HTTP ${res.status}` : (data.error || `HTTP ${res.status}`);
        setSearchError(errorMessage);
        console.error(errorMessage);
        setSearchResults([]);
        setSearchAttempted(true);
        return;
      }

      setSearchResults(Array.isArray(data) ? data : []);
      setSearchAttempted(true);
    } catch (error) {
      console.error(error);
      setSearchResults([]);
      setSearchError(error instanceof Error ? error.message : "Search failed");
      setSearchAttempted(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSense = (row: SearchSenseRow) => {
    setSelectedSense(row);
    setSense(null);
    setPatterns([]);
    setSelectedPatterns([]);
    setResult(null);
  };

  const handleGenerate = async () => {
    if (!selectedSense) return;

    setLoading(true);
    setResult(null);

    try {
      const token = await getToken();
      if (!token) {
        console.error("Missing session token");
        return;
      }

      const res = await fetch("/api/admin/lexicon/generate-patterns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sense_id: selectedSense.sense_id }),
      });

      const data = (await res.json().catch(() => ({}))) as GenerateResponse;
      if (!res.ok) {
        console.error(data.error || `HTTP ${res.status}`);
        setSense(null);
        setPatterns([]);
        setSelectedPatterns([]);
        return;
      }

      const nextPatterns = Array.isArray(data.patterns) ? data.patterns : [];
      setSense(data.sense ?? null);
      setPatterns(nextPatterns);
      setSelectedPatterns([]);
    } catch (error) {
      console.error(error);
      setSense(null);
      setPatterns([]);
      setSelectedPatterns([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSelected = async () => {
    if (!selectedSense) return;

    setLoading(true);
    setResult(null);

    try {
      const token = await getToken();
      if (!token) {
        console.error("Missing session token");
        return;
      }

      const selected = patterns.filter((item) => selectedPatterns.includes(item.pattern));

      const res = await fetch("/api/admin/lexicon/save-patterns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sense_id: selectedSense.sense_id,
          patterns: selected,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as SaveResponse;
      if (!res.ok) {
        console.error(data.error || `HTTP ${res.status}`);
        return;
      }

      setResult({
        inserted: data.inserted ?? 0,
        skipped: data.skipped ?? 0,
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#ffffff",
        color: "#111111",
        padding: "24px",
        colorScheme: "light",
      }}
    >
      <h1>Lexicon Builder</h1>
      <p>
        <Link href="/admin">Back to admin</Link>
      </p>

      <div>
        <label htmlFor="search-query">Word or translation</label>
      </div>
      <input
        id="search-query"
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setSearchAttempted(false);
          setSearchError("");
          setSearchResults([]);
          setSelectedSense(null);
          setSense(null);
          setPatterns([]);
          setSelectedPatterns([]);
          setResult(null);
        }}
        style={{ width: "100%", maxWidth: "520px", padding: "8px", border: "1px solid #999", marginBottom: "8px" }}
      />
      <div style={{ marginBottom: "16px" }}>
        <button type="button" onClick={handleSearch} disabled={loading || query.trim().length < 2}>
          {loading ? "Loading..." : "Search senses"}
        </button>
      </div>

      {searchError ? <p>{searchError}</p> : null}

      {searchResults.length > 0 ? (
        <div style={{ marginBottom: "24px" }}>
          <h2>Choose sense</h2>
          <ul>
            {searchResults.map((row) => (
              <li key={row.sense_id} style={{ marginBottom: "12px" }}>
                <label>
                  <input
                    type="radio"
                    name="selected-sense"
                    checked={selectedSense?.sense_id === row.sense_id}
                    onChange={() => handleSelectSense(row)}
                  />{" "}
                  <strong>{row.lemma}</strong> ({row.pos})
                </label>
                <div>{row.translation_pl || "—"}</div>
                <div>{row.definition_en}</div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {selectedSense ? (
        <div style={{ marginBottom: "24px" }}>
          <p>
            Selected: <strong>{selectedSense.lemma}</strong> ({selectedSense.pos})
          </p>
          <p>{selectedSense.definition_en}</p>
          <button type="button" onClick={handleGenerate} disabled={loading}>
            {loading ? "Loading..." : "Generate patterns"}
          </button>
        </div>
      ) : null}

      {!loading && searchAttempted && !searchError && query.trim().length >= 2 && searchResults.length === 0 ? (
        <p>No senses found.</p>
      ) : null}

      {patterns.length > 0 ? (
        <div>
          {sense ? (
            <div>
              <p>
                Lemma: <strong>{sense.lemma}</strong>
              </p>
              <p>Definition: {sense.definition}</p>
            </div>
          ) : null}

          <h2>Generated patterns</h2>
          <div>
            <button type="button" onClick={handleSelectAll} disabled={loading || patterns.length === 0}>
              Select all
            </button>
            <button type="button" onClick={handleClearAll} disabled={loading || selectedPatterns.length === 0}>
              Clear all
            </button>
          </div>
          <ul>
            {patterns.map((item) => (
              <li key={`${item.type}-${item.pattern}`}>
                <label>
                  <input
                    type="checkbox"
                    checked={selectedPatterns.includes(item.pattern)}
                    onChange={() => togglePattern(item.pattern)}
                  />{" "}
                  {item.pattern}
                </label>
                <div>{item.example_en}</div>
              </li>
            ))}
          </ul>

          <button type="button" onClick={handleSaveSelected} disabled={loading || selectedPatterns.length === 0}>
            {loading ? "Loading..." : "Save selected"}
          </button>
        </div>
      ) : null}

      {result ? (
        <div>
          <p>Inserted: {result.inserted}</p>
          <p>Skipped: {result.skipped}</p>
        </div>
      ) : null}
    </main>
  );
}
