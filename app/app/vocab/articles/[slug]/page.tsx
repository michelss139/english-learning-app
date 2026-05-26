import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import ArticleClient, { type ArticleDetailDto } from "./ArticleClient";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    : { data: null };

  const isAdmin = profile?.role === "admin";

  const { data: article, error } = await supabase
    .from("articles")
    .select("id, slug, title, category, cover_image_url, is_published, published_at, created_at")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !article) return notFound();
  if (!article.is_published && !isAdmin) return notFound();

  const [{ data: levels }, { data: glossary }, { data: questions }] = await Promise.all([
    supabase
      .from("article_levels")
      .select("level, body_text")
      .eq("article_id", article.id)
      .order("level"),
    supabase
      .from("article_glossary")
      .select("level, term, definition, sort_order")
      .eq("article_id", article.id)
      .order("sort_order"),
    supabase
      .from("article_conversation_questions")
      .select("level, question, sort_order")
      .eq("article_id", article.id)
      .order("sort_order"),
  ]);

  const dto: ArticleDetailDto = {
    slug: article.slug,
    title: article.title,
    category: article.category,
    cover_image_url: article.cover_image_url ?? null,
    published_at: article.published_at ?? article.created_at ?? null,
    levels: (levels ?? []) as ArticleDetailDto["levels"],
    glossary: (glossary ?? []) as ArticleDetailDto["glossary"],
    questions: (questions ?? []) as ArticleDetailDto["questions"],
  };

  return <ArticleClient article={dto} />;
}
