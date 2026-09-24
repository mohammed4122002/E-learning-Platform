import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, ChevronLeft, Clock } from "lucide-react";
import { PageBody, TopBar } from "@/components/layout/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { Glyph } from "@/components/ui/Icon";
import { Breadcrumb } from "@/components/ui/Navigation";
import { GuideFeedback } from "@/components/trainer/GuideFeedback";
import { HELP_BASE, SUPPORT_HREF, minutesText } from "@/components/trainer/HelpParts";
import { requireTrainer } from "@/lib/auth";
import { TRAINER_HELP_LABELS, getTrainerGuide, parseGuide } from "@/lib/data/trainer-help";
import { toArabicDigits } from "@/lib/format";

export async function generateMetadata(props: PageProps<"/trainer/help/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const user = await requireTrainer(`/trainer/help/${slug}`);
  const data = await getTrainerGuide(slug, user.id);
  return { title: data?.guide.title ?? "دليل غير موجود", description: data ? parseGuide(data.guide.body).lead : undefined };
}

/** TRR-HLP-02 · دليل (468:36359): hero, numbered steps, «جاهز للتطبيق؟» CTA, feedback, related guides, support. */
export default async function TrainerGuidePage(props: PageProps<"/trainer/help/[slug]">) {
  const { slug } = await props.params;
  const user = await requireTrainer(`/trainer/help/${slug}`);
  const data = await getTrainerGuide(slug, user.id);
  if (!data) notFound();
  const { guide, related, helpful } = data;
  const { lead, steps } = parseGuide(guide.body);

  return (
    <>
      <TopBar title={guide.title} subtitle={guide.readMinutes ? `${minutesText(guide.readMinutes)} قراءة` : "دليل"} />
      <PageBody className="gap-6">
        <Breadcrumb
          items={[
            { label: "مركز المساعدة", href: HELP_BASE },
            { label: TRAINER_HELP_LABELS[guide.category], href: `${HELP_BASE}#${guide.category}` },
            { label: "دليل" },
          ]}
        />
        <div className="flex flex-col gap-[26px] lg:flex-row lg:items-start">
          <article className="flex min-w-0 flex-1 flex-col gap-6">
            <header className="flex flex-col gap-4 rounded-22 bg-bg-brand-tint p-6 sm:px-7 sm:py-[26px]">
              <div className="flex flex-wrap gap-2.5">
                {guide.readMinutes && (
                  <span className="flex items-center gap-2 rounded-full bg-bg-surface px-3.5 py-2 type-small text-text-secondary">
                    {minutesText(guide.readMinutes)} قراءة
                    <Glyph icon={Clock} size={16} />
                  </span>
                )}
                <Link href={`${HELP_BASE}#${guide.category}`} className="flex items-center gap-2 rounded-full bg-bg-surface px-3.5 py-2 type-small text-text-brand focus-ring">
                  {TRAINER_HELP_LABELS[guide.category]}
                  <Glyph icon={BookOpen} size={16} />
                </Link>
              </div>
              <h1 className="text-[28px] font-bold leading-[1.3] text-text-primary sm:text-[36px]">{guide.title}</h1>
              {lead && <p className="type-body-lg text-text-secondary">{lead}</p>}
            </header>

            <div className="flex flex-col gap-5 rounded-22 border border-border-default bg-bg-card p-5 shadow-card sm:p-6">
              {steps.length > 0 && (
                <ol className="flex flex-col gap-5">
                  {steps.map((s, i) => (
                    <li key={s.title} className="flex flex-col gap-3 rounded-16 bg-bg-page p-5">
                      <h2 className="flex items-center gap-3.5 type-h3 text-text-primary">
                        <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-12 bg-action-primary type-subtitle text-text-on-brand">
                          {toArabicDigits(i + 1)}
                        </span>
                        {s.title}
                      </h2>
                      <p className="whitespace-pre-line type-body text-text-secondary">{s.text}</p>
                    </li>
                  ))}
                </ol>
              )}
              {guide.ctaLabel && guide.ctaHref && (
                <div className="flex flex-wrap items-center gap-4 rounded-16 bg-state-success-bg px-5 py-4">
                  <p className="flex-1 type-h3 text-state-success">جاهز للتطبيق؟</p>
                  <ButtonLink href={guide.ctaHref}>{guide.ctaLabel}</ButtonLink>
                </div>
              )}
            </div>
          </article>

          <aside className="flex w-full flex-col gap-5 lg:w-[366px] lg:shrink-0">
            <GuideFeedback articleId={guide.id} initial={helpful} />
            {related.length > 0 && (
              <section aria-labelledby="related-guides" className="flex flex-col gap-5 rounded-22 border border-border-default bg-bg-card p-6 shadow-card">
                <h2 id="related-guides" className="type-h3 text-text-primary">
                  أدلة ذات صلة
                </h2>
                <ul className="flex flex-col gap-5">
                  {related.map((r) => (
                    <li key={r.slug}>
                      <Link href={`${HELP_BASE}/${r.slug}`} className="flex items-center gap-3 rounded-12 bg-bg-page px-4 py-3.5 hover:bg-bg-brand-tint focus-ring">
                        <span className="flex min-w-0 flex-1 flex-col gap-1">
                          <span className="type-small text-text-primary">{r.title}</span>
                          {r.readMinutes && <span className="type-caption text-text-muted">{minutesText(r.readMinutes)}</span>}
                        </span>
                        <Glyph icon={ChevronLeft} size={16} className="text-text-secondary" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <section aria-labelledby="still-unclear" className="flex flex-col gap-5 rounded-22 border border-border-default bg-bg-card p-6 shadow-card">
              <h2 id="still-unclear" className="type-h3 text-text-primary">
                ما زال غير واضح؟
              </h2>
              <p className="type-body text-text-secondary">اسأل فريق دعم المدربين مباشرة.</p>
              <ButtonLink href={SUPPORT_HREF} variant="outline" fullWidth>
                تواصل مع الدعم
              </ButtonLink>
            </section>
          </aside>
        </div>
      </PageBody>
    </>
  );
}
