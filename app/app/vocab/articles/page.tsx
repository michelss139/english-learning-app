import { createSupabaseServerClient } from "@/lib/supabase/server";
import ArticlesClient, { type ArticleDto } from "./ArticlesClient";

export const dynamic = "force-dynamic";

export default async function ArticlesPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    : { data: null };

  const isAdmin = profile?.role === "admin";

  let query = supabase
    .from("articles")
    .select("id, slug, title, category, cover_image_url, published_at, created_at")
    .order("published_at", { ascending: false });

  if (!isAdmin) {
    query = query.eq("is_published", true);
  }

  const { data: articles, error } = await query;

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200/80 bg-rose-50/80 px-4 py-3">
        <p className="text-sm text-rose-700">Nie udało się wczytać artykułów.</p>
      </div>
    );
  }

  const articleIds = (articles ?? []).map((a) => a.id);
  const { data: levels } = articleIds.length > 0
    ? await supabase
        .from("article_levels")
        .select("article_id, level")
        .in("article_id", articleIds)
    : { data: [] };

  const levelsByArticle = new Map<string, string[]>();
  for (const row of levels ?? []) {
    const existing = levelsByArticle.get(row.article_id) ?? [];
    existing.push(row.level);
    levelsByArticle.set(row.article_id, existing);
  }

  const dtos: ArticleDto[] = (articles ?? []).map((a) => ({
    id: a.id,
    slug: a.slug,
    title: a.title,
    category: a.category,
    cover_image_url: a.cover_image_url ?? null,
    published_at: a.published_at ?? a.created_at ?? null,
    levels: (levelsByArticle.get(a.id) ?? []).sort(),
  }));

  return <ArticlesClient articles={dtos} isAdmin={isAdmin} />;
}
