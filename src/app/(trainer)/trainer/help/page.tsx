import type { Metadata } from "next";
import Link from "next/link";
import { Search, SearchX, X } from "lucide-react";
import { PageBody, TopBar } from "@/components/layout/TopBar";
import { EmptyState } from "@/components/ui/Feedback";
import { Glyph } from "@/components/ui/Icon";
import { Breadcrumb } from "@/components/ui/Navigation";
import { ButtonLink } from "@/components/ui/Button";
import { CATEGORY_STYLE, GuideRow, HELP_BASE, MostRead, SupportCard, guidesWord } from "@/components/trainer/HelpParts";
import { requireTrainer } from "@/lib/auth";
import { TRAINER_HELP_LABELS, getTrainerHelp } from "@/lib/data/trainer-help";
import { toArabicDigits } from "@/lib/format";

export const metadata: Metadata = { title: "مركز المساعدة", description: "أدلة واضحة وسريعة للمدرب" };

/** TRR-HLP-01 · مركز المساعدة (468:35979). */
export default async function TrainerHelpPage(props: PageProps<"/trainer/help">) {
  await requireTrainer("/trainer/help");
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const { byCategory, mostRead, results, query } = await getTrainerHelp(q);
  const leadSlug = byCategory[0]?.guides.find((g) => g.featured)?.slug;

  return (
    <>
      <TopBar title="مركز المساعدة" subtitle="أدلة وأسئلة شائعة" />
      <PageBody className="gap-6">
        <Breadcrumb items={[{ label: "الرئيسية", href: "/trainer" }, { label: "مركز المساعدة" }]} />
        <section className="flex flex-col gap-4 rounded-22 bg-bg-brand-tint p-6 sm:px-8 sm:py-[30px]">
          <h1 className="text-[28px] font-bold leading-[1.3] text-text-primary sm:text-[36px]">كيف نساعدك؟</h1>
          <p className="type-body-lg text-text-secondary">أدلة قصيرة مكتوبة بلغة واضحة — لا مصطلحات ولا فيديوهات طويلة.</p>
          <form action={HELP_BASE} method="get" role="search" className="flex h-12 w-full items-center gap-2.5 rounded-12 border border-border-default bg-bg-surface px-4 focus-within:border-action-primary">
            <label htmlFor="trainer-help-q" className="sr-only">
              ابحث في أدلة المدرب
            </label>
            <Glyph icon={Search} size={16} className="text-text-secondary" />
            <input
              id="trainer-help-q"
              name="q"
              type="search"
              defaultValue={query}
              maxLength={80}
              placeholder="ابحث عن سؤالك… مثال: كيف أرفع فيديو؟"
              className="min-w-0 flex-1 bg-transparent type-body text-text-primary outline-none placeholder:text-text-muted"
            />
            {query && (
              <Link href={HELP_BASE} aria-label="مسح البحث" className="flex size-8 items-center justify-center rounded-8 bg-bg-page text-text-muted focus-ring">
                <Glyph icon={X} size={16} />
              </Link>
            )}
          </form>
        </section>

        <div className="flex flex-col gap-[26px] lg:flex-row lg:items-start">
          <div className="flex min-w-0 flex-1 flex-col gap-6">
            {results ? (
              <section aria-labelledby="results-title" className="flex flex-col gap-5 rounded-22 border border-border-default bg-bg-card p-7 shadow-card">
                <div className="flex items-center gap-3">
                  <h2 id="results-title" className="flex-1 type-h3 text-text-primary">
                    نتائج البحث عن «{query}»
                  </h2>
                  <span className="type-caption text-text-muted">{guidesWord(results.length)}</span>
                </div>
                {results.length ? (
                  <ul className="flex flex-col gap-5">
                    {results.map((g) => (
                      <GuideRow key={g.slug} guide={g} />
                    ))}
                  </ul>
                ) : (
                  <EmptyState
                    icon={SearchX}
                    title="لا توجد أدلة مطابقة"
                    description="جرّب كلمة أخرى، أو اسأل فريق دعم المدربين مباشرة."
                    action={
                      <ButtonLink href={HELP_BASE} variant="outline">
                        اعرض كل الأدلة
                      </ButtonLink>
                    }
                  />
                )}
              </section>
            ) : byCategory.length ? (
              byCategory.map(({ category, guides }) => {
                const s = CATEGORY_STYLE[category];
                return (
                  <section key={category} id={category} aria-labelledby={`${category}-title`} className="flex scroll-mt-24 flex-col gap-5 rounded-22 border border-border-default bg-bg-card p-7 shadow-card">
                    <div className="flex items-center gap-3.5">
                      <span className={`flex size-[52px] shrink-0 items-center justify-center rounded-16 ${s.tile}`}>
                        <Glyph icon={s.icon} size={24} />
                      </span>
                      <div className="flex flex-1 flex-col gap-[3px]">
                        <h2 id={`${category}-title`} className="type-h2 text-text-primary">
                          {TRAINER_HELP_LABELS[category]}
                        </h2>
                        <p className="type-small text-text-muted">{guidesWord(guides.length)}</p>
                      </div>
                    </div>
                    <ul className="flex flex-col gap-5">
                      {guides.map((g) => (
                        <GuideRow key={g.slug} guide={g} lead={g.slug === leadSlug} />
                      ))}
                    </ul>
                  </section>
                );
              })
            ) : (
              <EmptyState icon={SearchX} title="لا توجد أدلة منشورة بعد" description={`يعمل فريق المحتوى على أدلة المدرب. تواصل مع الدعم لأي سؤال — نردّ خلال ${toArabicDigits(4)} ساعات عمل.`} />
            )}
          </div>
          <aside className="flex w-full flex-col gap-[22px] lg:w-[400px] lg:shrink-0">
            <SupportCard />
            <MostRead guides={mostRead} />
          </aside>
        </div>
      </PageBody>
    </>
  );
}
