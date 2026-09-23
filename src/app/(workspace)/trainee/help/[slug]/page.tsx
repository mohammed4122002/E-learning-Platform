import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TopBar, PageBody } from "@/components/layout/TopBar";
import { Breadcrumb } from "@/components/ui/Navigation";
import { HelpArticleView } from "@/components/support/HelpCenter";
import { requireTrainee } from "@/lib/auth";
import { getHelpArticle, HELP_CATEGORY_LABELS } from "@/lib/data/help";

export async function generateMetadata({ params }: PageProps<"/trainee/help/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const data = await getHelpArticle(slug);
  return data ? { title: data.article.title, description: data.article.body.slice(0, 150) } : { title: "المقالة غير موجودة" };
}

/** TRN-HLP-01 · article detail (workspace). */
export default async function TraineeHelpArticlePage({ params }: PageProps<"/trainee/help/[slug]">) {
  const { slug } = await params;
  await requireTrainee(`/trainee/help/${slug}`);
  const data = await getHelpArticle(slug);
  if (!data) notFound();
  return (
    <>
      <TopBar title="مركز المساعدة" subtitle={HELP_CATEGORY_LABELS[data.article.category]} />
      <PageBody className="gap-6">
        <Breadcrumb
          items={[
            { label: "مركز المساعدة", href: "/trainee/help" },
            { label: HELP_CATEGORY_LABELS[data.article.category], href: `/trainee/help?category=${data.article.category}` },
            { label: data.article.title },
          ]}
        />
        <HelpArticleView article={data.article} related={data.related} basePath="/trainee/help" ticketHref="/trainee/inquiry" />
      </PageBody>
    </>
  );
}
