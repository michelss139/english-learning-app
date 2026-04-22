"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { getOrCreateProfile } from "@/lib/auth/profile";

type AnalyzeReadyRow = {
  word: string;
  lemma_norm: string;
  lemma: string;
  pos: string;
  translation_pl: string | null;
  definition_en: string;
};

type AnalyzeAmbiguousRow = {
  word: string;
  lemma_norm: string;
  entry_count: number;
  total_senses: number;
  multiple_entries_found: boolean;
  pos_options: string[];
  reason: "multiple_entries" | "multiple_senses";
};

type AnalyzeResponse = {
  slug_exists: boolean;
  total_input: number;
  normalized_unique: number;
  duplicates: string[];
  existing_ready: AnalyzeReadyRow[];
  ambiguous_existing: AnalyzeAmbiguousRow[];
  missing: string[];
  error?: string;
};

type BuildResponse = {
  pack_id: string;
  slug: string;
  created_pack: boolean;
  updated_pack: boolean;
  items_added: number;
  used_existing: string[];
  created_lexicon: string[];
  skipped_existing_pack_items: string[];
  failed: Array<{ word: string; reason: string }>;
  error?: string;
};

type PackFormState = {
  title: string;
  slug: string;
  description: string;
  vocab_mode: "daily" | "precise";
  category: string;
  display_title: string;
  display_section: string;
  display_subsection: string;
  is_published: boolean;
  update_existing_pack: boolean;
  create_missing: boolean;
  wordsText: string;
};

function parseWords(text: string): string[] {
  return text
    .split(/[\n,]/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

const INITIAL_FORM: PackFormState = {
  title: "",
  slug: "",
  description: "",
  vocab_mode: "daily",
  category: "general",
  display_title: "",
  display_section: "",
  display_subsection: "",
  is_published: false,
  update_existing_pack: false,
  create_missing: true,
  wordsText: "",
};

export default function PackBuilderPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [form, setForm] = useState<PackFormState>(INITIAL_FORM);
  const [error, setError] = useState("");
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResponse | null>(null);
  const [buildResult, setBuildResult] = useState<BuildResponse | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const session = await supabase.auth.getSession();
        if (!session.data.session) {
          router.push("/login");
          return;
        }

        const profile = await getOrCreateProfile();
        if (!profile) {
          router.push("/login");
          return;
        }

        if (profile.role !== "admin") {
          router.push("/app");
          return;
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Unauthorized");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [router]);

  const parsedWordsCount = useMemo(() => parseWords(form.wordsText).length, [form.wordsText]);

  const getToken = async (): Promise<string | null> => {
    const session = await supabase.auth.getSession();
    return session?.data?.session?.access_token ?? null;
  };

  const updateForm = <K extends keyof PackFormState>(key: K, value: PackFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleAnalyze = async () => {
    setWorking(true);
    setError("");
    setBuildResult(null);

    try {
      const token = await getToken();
      if (!token) {
        setError("Missing session token");
        return;
      }

      const res = await fetch("/api/admin/pack-builder/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          slug: form.slug,
          words: parseWords(form.wordsText),
        }),
      });

      const data = (await res.json().catch(() => ({}))) as AnalyzeResponse;
      if (!res.ok) {
        setError(data.error || `HTTP ${res.status}`);
        setAnalyzeResult(null);
        return;
      }

      setAnalyzeResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Analyze failed");
      setAnalyzeResult(null);
    } finally {
      setWorking(false);
    }
  };

  const handleBuild = async () => {
    setWorking(true);
    setError("");

    try {
      const token = await getToken();
      if (!token) {
        setError("Missing session token");
        return;
      }

      const res = await fetch("/api/admin/pack-builder/build", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: form.title,
          slug: form.slug,
          description: form.description || null,
          vocab_mode: form.vocab_mode,
          category: form.category || null,
          display_title: form.display_title || null,
          display_section: form.display_section || null,
          display_subsection: form.display_subsection || null,
          is_published: form.is_published,
          words: parseWords(form.wordsText),
          create_missing: form.create_missing,
          update_existing_pack: form.update_existing_pack,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as BuildResponse;
      if (!res.ok) {
        setError(data.error || `HTTP ${res.status}`);
        setBuildResult(null);
        return;
      }

      setBuildResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Build failed");
      setBuildResult(null);
    } finally {
      setWorking(false);
    }
  };

  if (loading) {
    return <main style={{ minHeight: "100vh", padding: 24 }}>Loading...</main>;
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 10px",
    border: "1px solid #bdbdbd",
    borderRadius: 6,
    background: "#fff",
    color: "#111",
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#fff",
        color: "#111",
        padding: 24,
        colorScheme: "light",
      }}
    >
      <div style={{ maxWidth: 980, margin: "0 auto", display: "grid", gap: 20 }}>
        <div>
          <h1 style={{ margin: "0 0 8px" }}>Pack Builder</h1>
          <p style={{ margin: 0 }}>
            <Link href="/admin">Back to admin</Link>
          </p>
        </div>

        {error ? (
          <div style={{ border: "1px solid #d88", background: "#fff3f3", padding: 12, borderRadius: 8 }}>{error}</div>
        ) : null}

        <section style={{ border: "1px solid #ddd", borderRadius: 10, padding: 16 }}>
          <h2 style={{ marginTop: 0 }}>Pack metadata</h2>
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
            <div>
              <label htmlFor="title">Title</label>
              <input id="title" type="text" value={form.title} onChange={(e) => updateForm("title", e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label htmlFor="slug">Slug</label>
              <input id="slug" type="text" value={form.slug} onChange={(e) => updateForm("slug", e.target.value)} style={inputStyle} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label htmlFor="description">Description</label>
              <input
                id="description"
                type="text"
                value={form.description}
                onChange={(e) => updateForm("description", e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label htmlFor="vocab_mode">Vocab mode</label>
              <select
                id="vocab_mode"
                value={form.vocab_mode}
                onChange={(e) => updateForm("vocab_mode", e.target.value as "daily" | "precise")}
                style={inputStyle}
              >
                <option value="daily">daily</option>
                <option value="precise">precise</option>
              </select>
            </div>
            <div>
              <label htmlFor="category">Category</label>
              <input
                id="category"
                type="text"
                value={form.category}
                onChange={(e) => updateForm("category", e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label htmlFor="display_title">Display title</label>
              <input
                id="display_title"
                type="text"
                value={form.display_title}
                onChange={(e) => updateForm("display_title", e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label htmlFor="display_section">Display section</label>
              <input
                id="display_section"
                type="text"
                value={form.display_section}
                onChange={(e) => updateForm("display_section", e.target.value)}
                style={inputStyle}
              />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label htmlFor="display_subsection">Display subsection</label>
              <input
                id="display_subsection"
                type="text"
                value={form.display_subsection}
                onChange={(e) => updateForm("display_subsection", e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginTop: 16 }}>
            <label>
              <input
                type="checkbox"
                checked={form.is_published}
                onChange={(e) => updateForm("is_published", e.target.checked)}
              />{" "}
              is_published
            </label>
            <label>
              <input
                type="checkbox"
                checked={form.update_existing_pack}
                onChange={(e) => updateForm("update_existing_pack", e.target.checked)}
              />{" "}
              update_existing_pack
            </label>
            <label>
              <input
                type="checkbox"
                checked={form.create_missing}
                onChange={(e) => updateForm("create_missing", e.target.checked)}
              />{" "}
              create_missing
            </label>
          </div>
        </section>

        <section style={{ border: "1px solid #ddd", borderRadius: 10, padding: 16 }}>
          <h2 style={{ marginTop: 0 }}>Lemma list</h2>
          <p style={{ marginTop: 0, color: "#555" }}>One word per line also works, commas are supported too.</p>
          <textarea
            value={form.wordsText}
            onChange={(e) => updateForm("wordsText", e.target.value)}
            rows={16}
            style={{ ...inputStyle, fontFamily: "monospace", resize: "vertical" }}
          />
          <div style={{ marginTop: 8, color: "#555" }}>Parsed items: {parsedWordsCount}</div>
        </section>

        <div style={{ display: "flex", gap: 12 }}>
          <button type="button" onClick={handleAnalyze} disabled={working}>
            {working ? "Working..." : "Analyze"}
          </button>
          <button type="button" onClick={handleBuild} disabled={working}>
            {working ? "Working..." : "Build pack"}
          </button>
        </div>

        {analyzeResult ? (
          <section style={{ border: "1px solid #ddd", borderRadius: 10, padding: 16 }}>
            <h2 style={{ marginTop: 0 }}>Analyze result</h2>
            <div style={{ display: "grid", gap: 6 }}>
              <div>Total input: {analyzeResult.total_input}</div>
              <div>Normalized unique: {analyzeResult.normalized_unique}</div>
              <div>Slug exists: {analyzeResult.slug_exists ? "yes" : "no"}</div>
              <div>Duplicates: {analyzeResult.duplicates.length ? analyzeResult.duplicates.join(", ") : "none"}</div>
            </div>

            <div style={{ marginTop: 18 }}>
              <h3>Existing ready</h3>
              {analyzeResult.existing_ready.length === 0 ? (
                <p>None</p>
              ) : (
                <ul>
                  {analyzeResult.existing_ready.map((row) => (
                    <li key={row.word}>
                      <strong>{row.lemma}</strong> ({row.pos})
                      {row.translation_pl ? ` - ${row.translation_pl}` : ""}
                      {" - "}
                      {row.definition_en}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div style={{ marginTop: 18 }}>
              <h3>Ambiguous existing</h3>
              {analyzeResult.ambiguous_existing.length === 0 ? (
                <p>None</p>
              ) : (
                <ul>
                  {analyzeResult.ambiguous_existing.map((row) => (
                    <li key={row.word}>
                      <strong>{row.word}</strong> - {row.reason}, entries: {row.entry_count}, senses: {row.total_senses}
                      {row.pos_options.length ? `, pos: ${row.pos_options.join(", ")}` : ""}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div style={{ marginTop: 18 }}>
              <h3>Missing</h3>
              {analyzeResult.missing.length === 0 ? <p>None</p> : <p>{analyzeResult.missing.join(", ")}</p>}
            </div>
          </section>
        ) : null}

        {buildResult ? (
          <section style={{ border: "1px solid #ddd", borderRadius: 10, padding: 16 }}>
            <h2 style={{ marginTop: 0 }}>Build result</h2>
            <div style={{ display: "grid", gap: 6 }}>
              <div>Pack slug: {buildResult.slug}</div>
              <div>Pack id: {buildResult.pack_id}</div>
              <div>Created pack: {buildResult.created_pack ? "yes" : "no"}</div>
              <div>Updated pack: {buildResult.updated_pack ? "yes" : "no"}</div>
              <div>Items added: {buildResult.items_added}</div>
            </div>

            <div style={{ marginTop: 18 }}>
              <h3>Used existing</h3>
              <p>{buildResult.used_existing.length ? buildResult.used_existing.join(", ") : "None"}</p>
            </div>

            <div style={{ marginTop: 18 }}>
              <h3>Created lexicon</h3>
              <p>{buildResult.created_lexicon.length ? buildResult.created_lexicon.join(", ") : "None"}</p>
            </div>

            <div style={{ marginTop: 18 }}>
              <h3>Skipped existing pack items</h3>
              <p>
                {buildResult.skipped_existing_pack_items.length
                  ? buildResult.skipped_existing_pack_items.join(", ")
                  : "None"}
              </p>
            </div>

            <div style={{ marginTop: 18 }}>
              <h3>Failed</h3>
              {buildResult.failed.length === 0 ? (
                <p>None</p>
              ) : (
                <ul>
                  {buildResult.failed.map((item, index) => (
                    <li key={`${item.word}-${index}`}>
                      <strong>{item.word}</strong> - {item.reason}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
