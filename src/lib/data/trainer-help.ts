import "server-only";
import { createClient } from "@/lib/supabase/server";

/* TRR-HLP-01/02 · مركز المساعدة للمدرب — `help_articles` rows with audience = 'trainer'. */

export const TRAINER_HELP_CATEGORIES = ["trainer_programs", "trainer_courses", "trainer_opportunities", "trainer_finance", "trainer_profile"] as const;
export type TrainerHelpCategory = (typeof TRAINER_HELP_CATEGORIES)[number];

export const TRAINER_HELP_LABELS: Record<TrainerHelpCategory, string> = {
  trainer_programs: "البرامج",
  trainer_courses: "الدورات والجدولة",
  trainer_opportunities: "الفرص والعروض",
  trainer_finance: "المالي والتسوية",
  trainer_profile: "الملف والاعتماد",
};

export type TrainerGuide = {
  id: string;
  slug: string;
  category: TrainerHelpCategory;
  title: string;
  body: string;
  featured: boolean;
  readMinutes: number | null;
  ctaLabel: string | null;
  ctaHref: string | null;
};

const SELECT = "id, slug, category, title, body, is_featured, read_minutes, cta_label, cta_href" as const;
type Row = { id: string; slug: string; category: string; title: string; body: string; is_featured: boolean; read_minutes: number | null; cta_label: string | null; cta_href: string | null };
const toGuide = (r: Row): TrainerGuide => ({
  id: r.id,
  slug: r.slug,
  category: r.category as TrainerHelpCategory,
  title: r.title,
  body: r.body,
  featured: r.is_featured,
  readMinutes: r.read_minutes,
  ctaLabel: r.cta_label,
  ctaHref: r.cta_href,
});

function likeTerm(q: string) {
  return `%${q.replace(/[\\%_]/g, (m) => `\\${m}`).replace(/[(),"]/g, " ")}%`;
}

export async function getTrainerHelp(query: string) {
  const supabase = await createClient();
  const q = query.trim().slice(0, 80);
  const [all, results] = await Promise.all([
    supabase.from("help_articles").select(SELECT).eq("published", true).eq("audience", "trainer").order("position"),
    q
      ? supabase
          .from("help_articles")
          .select(SELECT)
          .eq("published", true)
          .eq("audience", "trainer")
          .or(`title.ilike.${likeTerm(q)},body.ilike.${likeTerm(q)}`)
          .order("position")
          .limit(30)
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (all.error) throw new Error(all.error.message);
  if (results.error) throw new Error(results.error.message);
  const guides = (all.data as Row[]).map(toGuide);
  const byCategory = TRAINER_HELP_CATEGORIES.map((c) => ({ category: c, guides: guides.filter((g) => g.category === c) })).filter((g) => g.guides.length > 0);
  // «الأكثر قراءة»: the guides the help team features, in the Figma order (468:36341).
  const MOST_READ_ORDER: TrainerHelpCategory[] = ["trainer_programs", "trainer_courses", "trainer_finance", "trainer_opportunities", "trainer_profile"];
  const mostRead = MOST_READ_ORDER.flatMap((c) => guides.filter((g) => g.category === c && g.featured));
  return { byCategory, mostRead, results: results.data ? (results.data as Row[]).map(toGuide) : null, query: q };
}

export async function getTrainerGuide(slug: string, userId: string) {
  if (!/^[a-z0-9-]{2,120}$/.test(slug)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.from("help_articles").select(SELECT).eq("slug", slug).eq("published", true).eq("audience", "trainer").maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const guide = toGuide(data as Row);
  const [rel, fb] = await Promise.all([
    supabase.from("help_articles").select(SELECT).eq("published", true).eq("audience", "trainer").eq("category", guide.category).neq("slug", slug).order("position").limit(3),
    supabase.from("help_article_feedback").select("helpful").eq("article_id", guide.id).eq("user_id", userId).maybeSingle(),
  ]);
  return { guide, related: ((rel.data ?? []) as Row[]).map(toGuide), helpful: fb.data?.helpful ?? null };
}

/** Lead paragraph + «## title\ntext» steps. */
export function parseGuide(body: string): { lead: string; steps: { title: string; text: string }[] } {
  const blocks = body.split(/\n(?=## )/);
  const lead = blocks[0].startsWith("## ") ? "" : blocks.shift()!.trim();
  const steps = blocks.map((b) => {
    const [head, ...rest] = b.replace(/^## /, "").split("\n");
    return { title: head.trim(), text: rest.join("\n").trim() };
  });
  return { lead, steps };
}
