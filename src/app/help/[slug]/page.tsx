import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/ui/Navigation";
import { HelpArticleView } from "@/components/support/HelpCenter";
import { getCurrentUser } from "@/lib/auth";
import { getHelpArticle, HELP_CATEGORY_LABELS } from "@/lib/data/help";

export async function generateMetadata({ params }: PageProps<"/help/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const data = await getHelpArticle(slug);
  return data ? { title: data.article.title, description: data.article.body.slice(0, 150) } : { title: "المقالة غير موجودة" };
}

/** Public help article. */
export default async function PublicHelpArticlePage({ params }: PageProps<"/help/[slug]">) {
  const { slug } = await params;
  const [data, user] = await Promise.all([getHelpArticle(slug), getCurrentUser()]);
  if (!data) notFound();
  return (
    <>
      <Breadcrumb
        items={[
          { label: "مركز المساعدة", href: "/help" },
          { label: HELP_CATEGORY_LABELS[data.article.category], href: `/help?category=${data.article.category}` },
          { label: data.article.title },
        ]}
      />
      <HelpArticleView article={data.article} related={data.related} basePath="/help" ticketHref={user ? "/trainee/inquiry" : "/login?next=%2Ftrainee%2Finquiry"} />
    </>
  );
}
