import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseRouteClient } from "@/lib/supabase/route";

type Suggestion = {
  title: string;
  description: string;
  href: string;
};

function normalizeTerm(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

export async function GET(req: Request) {
  try {
    const routeSupabase = await createSupabaseRouteClient();
    const {
      data: { user },
      error: sessionErr,
    } = await routeSupabase.auth.getUser();
    if (sessionErr || !user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createSupabaseAdmin();
    const userId = user.id;

    const shopPack = await supabase
      .from("vocab_packs")
      .select("id, slug, title")
      .eq("slug", "shop")
      .maybeSingle();

    const { data: toLearnRows } = await supabase
      .from("v2_vocab_to_learn_total")
      .select("term_en_norm")
      .eq("student_id", userId)
      .limit(200);

    const toLearnSet = new Set((toLearnRows ?? []).map((row: any) => row.term_en_norm).filter(Boolean));

    let suggestion: Suggestion | null = null;

    if (toLearnSet.size > 0) {
      const { data: events } = await supabase
        .from("vocab_answer_events")
        .select("question_mode,prompt,expected,context_type,context_id,pack_id,created_at")
        .eq("student_id", userId)
        .order("created_at", { ascending: false })
        .limit(500);

      const packCounts = new Map<string, number>();
      const clusterCounts = new Map<string, number>();

      (events ?? []).forEach((event: any) => {
        const termKey =
          event.question_mode === "en-pl"
            ? normalizeTerm(event.prompt)
            : normalizeTerm(event.expected);
        if (!termKey || !toLearnSet.has(termKey)) return;

        if (event.context_type === "vocab_pack" && event.pack_id) {
          packCounts.set(event.pack_id, (packCounts.get(event.pack_id) ?? 0) + 1);
        }
        if (event.context_type === "vocab_cluster" && event.context_id) {
          clusterCounts.set(event.context_id, (clusterCounts.get(event.context_id) ?? 0) + 1);
        }
      });

      const packTotal = Array.from(packCounts.values()).reduce((acc, n) => acc + n, 0);
      const clusterTotal = Array.from(clusterCounts.values()).reduce((acc, n) => acc + n, 0);

      if (packTotal >= clusterTotal && packTotal > 0) {
        if (shopPack.data?.slug) {
          suggestion = {
            title: `Fiszki: ${shopPack.data.title}`,
            description: "10 pytań • kierunek PL → EN",
            href: `/app/vocab/pack/${shopPack.data.slug}?limit=10&direction=pl-en&autostart=1`,
          };
        } else {
          const topPackId = Array.from(packCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0];
          if (topPackId) {
            const { data: packRow } = await supabase
              .from("vocab_packs")
              .select("slug,title")
              .eq("id", topPackId)
              .maybeSingle();

            if (packRow?.slug) {
              suggestion = {
                title: `Fiszki: ${packRow.title}`,
                description: "10 pytań • kierunek PL → EN",
                href: `/app/vocab/pack/${packRow.slug}?limit=10&direction=pl-en&autostart=1`,
              };
            }
          }
        }
      }

      if (!suggestion && clusterTotal > 0) {
        const topCluster = Array.from(clusterCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0];
        if (topCluster) {
          const { data: clusterRow } = await supabase
            .from("vocab_clusters")
            .select("slug,title")
            .eq("slug", topCluster)
            .maybeSingle();

          suggestion = {
            title: `Typowe błędy: ${clusterRow?.title ?? topCluster}`,
            description: "10 pytań • wybór słowa w zdaniu",
            href: `/app/vocab/cluster/${topCluster}?limit=10&autostart=1`,
          };
        }
      }

      if (!suggestion) {
        suggestion = {
          title: "Irregular verbs",
          description: "Minimum 5 czasowników w sesji",
          href: "/app/irregular-verbs/train",
        };
      }
    }

    if (!suggestion) {
      const { data: lastEvent } = await supabase
        .from("vocab_answer_events")
        .select("context_type,context_id,pack_id")
        .eq("student_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastEvent?.context_type === "vocab_pack" && lastEvent.pack_id) {
        const { data: packRow } = await supabase
          .from("vocab_packs")
          .select("slug,title")
          .eq("id", lastEvent.pack_id)
          .maybeSingle();

        if (packRow?.slug) {
          suggestion = {
            title: `Fiszki: ${packRow.title}`,
            description: "10 pytań • kierunek PL → EN",
            href: `/app/vocab/pack/${packRow.slug}?limit=10&direction=pl-en&autostart=1`,
          };
        }
      } else if (lastEvent?.context_type === "vocab_cluster" && lastEvent.context_id) {
        const { data: clusterRow } = await supabase
          .from("vocab_clusters")
          .select("slug,title")
          .eq("slug", lastEvent.context_id)
          .maybeSingle();

        suggestion = {
          title: `Typowe błędy: ${clusterRow?.title ?? lastEvent.context_id}`,
          description: "10 pytań • wybór słowa w zdaniu",
          href: `/app/vocab/cluster/${lastEvent.context_id}?limit=10&autostart=1`,
        };
      } else {
        const { data: lastIrregular } = await supabase
          .from("irregular_verb_runs")
          .select("id,created_at")
          .eq("student_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (lastIrregular) {
          suggestion = {
            title: "Irregular verbs",
            description: "Minimum 5 czasowników w sesji",
            href: "/app/irregular-verbs/train",
          };
        }
      }

      if (!suggestion) {
        if (shopPack.data?.slug) {
          suggestion = {
            title: `Fiszki: ${shopPack.data.title}`,
            description: "10 pytań • kierunek PL → EN",
            href: `/app/vocab/pack/${shopPack.data.slug}?limit=10&direction=pl-en&autostart=1`,
          };
        } else {
          const { data: firstPack } = await supabase
            .from("vocab_packs")
            .select("slug,title")
            .eq("is_published", true)
            .order("order_index", { ascending: true })
            .limit(1)
            .maybeSingle();

          if (firstPack?.slug) {
            suggestion = {
              title: `Fiszki: ${firstPack.title}`,
              description: "10 pytań • kierunek PL → EN",
              href: `/app/vocab/pack/${firstPack.slug}?limit=10&direction=pl-en&autostart=1`,
            };
          }
        }
      }
    }

    if (!suggestion) {
      suggestion = {
        title: "Fiszki",
        description: "Wybierz pakiet i rozpocznij trening",
        href: "/app/vocab/packs",
      };
    }

    return NextResponse.json({ ok: true, suggestion });
  } catch (e: any) {
    console.error("[app/suggestion] Error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Unknown error", stack: process.env.NODE_ENV === "development" ? e?.stack : undefined },
      { status: 500 }
    );
  }
}
