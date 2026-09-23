import "server-only";
import { createClient } from "@/lib/supabase/server";

/* TRN-HLP-01 · مركز المساعدة — content from `help_articles` (seeded from the Figma frame). Works for anonymous visitors (RLS help_read). */

export const HELP_CATEGORIES = ["payments", "enrollment", "certificates", "recorded", "in_person", "account"] as const;
export type HelpCategory = (typeof HELP_CATEGORIES)[number];

export const HELP_CATEGORY_LABELS: Record<HelpCategory, string> = {
  payments: "الدفع والاسترداد",
  enrollment: "التسجيل والمقاعد",
  certificates: "الشهادات والتحقق",
  recorded: "الدورات المسجَّلة",
  in_person: "الدورات الحضورية",
  account: "الحساب والتوثيق",
};

export function isHelpCategory(v: unknown): v is HelpCategory {
  return typeof v === "string" && (HELP_CATEGORIES as readonly string[]).includes(v);
}

export type HelpArticle = { slug: string; category: HelpCategory; title: string; body: string; featured: boolean };

type Row = { slug: string; category: string; title: string; body: string; is_featured: boolean };
const toArticle = (r: Row): HelpArticle => ({ slug: r.slug, category: r.category as HelpCategory, title: r.title, body: r.body, featured: r.is_featured });
const SELECT = "slug, category, title, body, is_featured" as const;

export type HelpHome = {
  counts: Record<HelpCategory, number>;
  featured: HelpArticle[];
  results: HelpArticle[] | null;
  category: HelpCategory | null;
  query: string;
};

/** Escapes LIKE wildcards and PostgREST `or()` separators in user input. */
function likeTerm(q: string) {
  return `%${q.replace(/[\\%_]/g, (m) => `\\${m}`).replace(/[(),"]/g, " ")}%`;
}

export async function getHelpHome(query: string, category: HelpCategory | null): Promise<HelpHome> {
  const supabase = await createClient();
  const q = query.trim().slice(0, 80);
  const [all, results] = await Promise.all([
    supabase.from("help_articles").select(SELECT).eq("published", true).order("category").order("position"),
    q
      ? supabase.from("help_articles").select(SELECT).eq("published", true).or(`title.ilike.${likeTerm(q)},body.ilike.${likeTerm(q)}`).order("position").limit(30)
      : category
        ? supabase.from("help_articles").select(SELECT).eq("published", true).eq("category", category).order("position")
        : Promise.resolve({ data: null, error: null }),
  ]);
  if (all.error) throw new Error(all.error.message);
  if (results.error) throw new Error(results.error.message);
  const articles = (all.data as Row[]).map(toArticle);
  const counts = Object.fromEntries(HELP_CATEGORIES.map((c) => [c, articles.filter((a) => a.category === c).length])) as Record<HelpCategory, number>;
  return {
    counts,
    featured: articles.filter((a) => a.featured),
    results: results.data ? (results.data as Row[]).map(toArticle) : null,
    category: q ? null : category,
    query: q,
  };
}

export async function getHelpArticle(slug: string): Promise<{ article: HelpArticle; related: HelpArticle[] } | null> {
  if (!/^[a-z0-9-]{2,120}$/.test(slug)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("help_articles").select(SELECT).eq("slug", slug).eq("published", true).maybeSingle();
  if (!data) return null;
  const article = toArticle(data as Row);
  const { data: rel } = await supabase
    .from("help_articles")
    .select(SELECT)
    .eq("published", true)
    .eq("category", article.category)
    .neq("slug", slug)
    .order("position")
    .limit(5);
  return { article, related: ((rel ?? []) as Row[]).map(toArticle) };
}

/** A few articles for other screens (e.g. TRN-INQ-01 «ربما تجد إجابتك هنا»). */
export async function getHelpArticlesByCategory(category: HelpCategory, limit = 3): Promise<HelpArticle[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("help_articles").select(SELECT).eq("published", true).eq("category", category).order("position").limit(limit);
  return ((data ?? []) as Row[]).map(toArticle);
}
