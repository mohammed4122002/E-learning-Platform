import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Award, CalendarDays, ChevronDown, ChevronLeft, CircleUser, CreditCard, MapPin, MonitorPlay, Search, X } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Feedback";
import { Glyph } from "@/components/ui/Icon";
import { PageHeading, SectionCard } from "@/components/ui/PageHeading";
import { pluralAr } from "@/lib/format";
import { HELP_CATEGORIES, HELP_CATEGORY_LABELS, type HelpArticle, type HelpCategory, type HelpHome } from "@/lib/data/help";
import type { Ticket } from "@/lib/data/support";

export const HELP_ICONS: Record<HelpCategory, LucideIcon> = {
  payments: CreditCard,
  enrollment: CalendarDays,
  certificates: Award,
  recorded: MonitorPlay,
  in_person: MapPin,
  account: CircleUser,
};

const articlesWord = (n: number) => pluralAr(n, ["مقالة واحدة", "مقالتان", "مقالات", "مقالة"]);

/** Figma "Nav / Search Overlay" (138:1867) collapsed: r22 surface, float shadow, 20 Medium placeholder, search icon. GET form → ?q= */
function SearchBox({ basePath, query }: { basePath: string; query: string }) {
  return (
    <div className="w-full">
      <form action={basePath} method="get" role="search" className="flex w-full items-center gap-3.5 rounded-22 border border-border-default bg-bg-surface px-[22px] py-5 shadow-float focus-within:border-action-primary">
        <label htmlFor="help-q" className="sr-only">
          ابحث في مركز المساعدة
        </label>
        <Glyph icon={Search} size={20} className="text-text-brand" />
        <input
          id="help-q"
          name="q"
          type="search"
          defaultValue={query}
          maxLength={80}
          placeholder="ابحث في مركز المساعدة — مثال: كيف أسترد مبلغًا؟"
          className="min-w-0 flex-1 bg-transparent type-h3 text-text-primary outline-none placeholder:text-text-muted"
        />
        {query ? (
          <Link href={basePath} aria-label="مسح البحث" className="flex size-8 items-center justify-center rounded-8 bg-bg-page text-text-muted focus-ring">
            <Glyph icon={X} size={16} />
          </Link>
        ) : (
          <button type="submit" className="hidden cursor-pointer rounded-8 bg-bg-page px-2.5 py-1.5 type-caption text-text-muted focus-ring sm:block">
            بحث
          </button>
        )}
      </form>
    </div>
  );
}

function FaqItem({ article, basePath, open }: { article: HelpArticle; basePath: string; open?: boolean }) {
  return (
    <li>
      <details open={open} className="group flex w-full flex-col rounded-12 bg-bg-page px-4 pt-3.5 pb-4">
        <summary className="flex w-full cursor-pointer list-none items-center gap-2.5 rounded-8 focus-ring [&::-webkit-details-marker]:hidden">
          <span className="min-w-0 flex-1 type-subtitle text-text-primary">{article.title}</span>
          <Glyph icon={ChevronDown} size={20} className="text-text-secondary transition-transform group-open:rotate-180" />
        </summary>
        <div className="flex flex-col gap-2 pt-2">
          <p className="type-body whitespace-pre-line text-text-secondary">{article.body.split("\n\n")[0]}</p>
          <Link href={`${basePath}/${article.slug}`} className="self-start rounded-8 type-caption text-text-brand hover:underline focus-ring">
            اقرأ المقالة كاملة
          </Link>
        </div>
      </details>
    </li>
  );
}

function ArticleLinkRow({ article, basePath }: { article: HelpArticle; basePath: string }) {
  return (
    <li>
      <Link href={`${basePath}/${article.slug}`} className="flex w-full items-center gap-2.5 rounded-12 bg-bg-page px-4 py-3.5 hover:bg-bg-brand-tint focus-ring">
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="type-subtitle text-text-primary">{article.title}</span>
          <span className="line-clamp-1 type-caption text-text-muted">{article.body.split("\n")[0]}</span>
        </span>
        <Glyph icon={ChevronLeft} size={16} className="text-text-muted" />
      </Link>
    </li>
  );
}

/**
 * TRN-HLP-01 · مركز المساعدة (Figma 223:12990) body, shared by /trainee/help (workspace) and the public /help page.
 */
export function HelpCenter({
  home,
  basePath,
  ticketHref,
  assistantHref,
  tickets,
}: {
  home: HelpHome;
  basePath: string;
  ticketHref: string;
  assistantHref: string;
  /** Signed-in trainees see «تذاكري»; visitors do not. */
  tickets: Ticket[] | null;
}) {
  const listing = home.results;
  return (
    <>
      <PageHeading title="كيف نساعدك؟" description="معظم الأسئلة لها إجابة جاهزة. إن لم تجدها، افتح تذكرة دعم ونردّ خلال يوم عمل." />
      <SearchBox basePath={basePath} query={home.query} />

      <nav aria-label="مواضيع المساعدة">
        <ul className="grid w-full grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {HELP_CATEGORIES.map((c) => {
            const active = home.category === c;
            return (
              <li key={c}>
                <Link
                  href={active ? basePath : `${basePath}?category=${c}`}
                  aria-current={active ? "true" : undefined}
                  className={`flex h-full w-full flex-col items-start gap-2.5 rounded-16 border bg-bg-card px-5 pt-5 pb-[22px] shadow-card transition-colors hover:border-action-primary focus-ring ${
                    active ? "border-[1.5px] border-action-primary" : "border-border-default"
                  }`}
                >
                  <span className="flex size-11 items-center justify-center rounded-12 bg-bg-brand-tint text-text-brand">
                    <Glyph icon={HELP_ICONS[c]} size={20} />
                  </span>
                  <span className="type-title text-text-primary">{HELP_CATEGORY_LABELS[c]}</span>
                  <span className="type-caption text-text-muted">{articlesWord(home.counts[c])}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="flex w-full flex-col items-start gap-6 lg:flex-row">
        <div className="flex w-full min-w-0 flex-1 flex-col">
          {listing ? (
            <SectionCard
              title={home.query ? `نتائج البحث عن «${home.query}»` : HELP_CATEGORY_LABELS[home.category!]}
              titleId="help-results-title"
              aside={
                <Link href={basePath} className="shrink-0 rounded-8 type-caption text-text-brand hover:underline focus-ring">
                  كل المواضيع
                </Link>
              }
            >
              {listing.length ? (
                <>
                  <p aria-live="polite" className="type-caption text-text-muted">
                    {articlesWord(listing.length)}
                  </p>
                  <ul className="flex flex-col gap-3">
                    {listing.map((a) => (
                      <ArticleLinkRow key={a.slug} article={a} basePath={basePath} />
                    ))}
                  </ul>
                </>
              ) : (
                <EmptyState
                  icon={Search}
                  title="لم نجد نتائج مطابقة"
                  description="جرّب كلمات أخرى أو تصفّح المواضيع أعلاه — أو افتح تذكرة دعم ونردّ خلال يوم عمل."
                  action={<ButtonLink href={ticketHref}>افتح تذكرة دعم</ButtonLink>}
                />
              )}
            </SectionCard>
          ) : (
            <SectionCard title="الأسئلة الأكثر شيوعًا" titleId="faq-title">
              {home.featured.length ? (
                <ul className="flex flex-col gap-4">
                  {home.featured.map((a) => (
                    <FaqItem key={a.slug} article={a} basePath={basePath} open />
                  ))}
                </ul>
              ) : (
                <EmptyState icon={Search} title="لا مقالات منشورة بعد" description="نعمل على إضافة الإجابات. افتح تذكرة دعم ونردّ خلال يوم عمل." />
              )}
            </SectionCard>
          )}
        </div>

        <aside aria-label="الدعم" className="flex w-full shrink-0 flex-col gap-5 lg:w-[380px]">
          <SectionCard title="لم تجد إجابتك؟" titleId="no-answer-title">
            <p className="type-body text-text-secondary">افتح تذكرة دعم. نردّ خلال يوم عمل واحد، وتتابع حالتها من «بانتظار إجرائي».</p>
            <ButtonLink href={ticketHref} size="l" fullWidth>
              افتح تذكرة دعم
            </ButtonLink>
            <ButtonLink href={assistantHref} size="l" variant="outline" fullWidth>
              اسأل المساعد الذكي
            </ButtonLink>
          </SectionCard>
          {tickets && (
            <SectionCard title="تذاكري" titleId="tickets-title">
              {tickets.length ? (
                <ul className="flex flex-col gap-4">
                  {tickets.map((t) => (
                    <li key={t.id}>
                      <Link href={t.href} className="flex w-full items-center gap-2.5 rounded-12 bg-bg-page px-3 py-[11px] hover:bg-bg-brand-tint focus-ring">
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className="truncate type-small text-text-primary">{t.title}</span>
                          <span dir="ltr" className="self-end font-mono text-[14px] leading-[1.5] text-text-muted sm:self-start">
                            {t.reference}
                          </span>
                        </span>
                        <span className={`shrink-0 rounded-full bg-bg-surface px-2.5 py-[5px] type-caption ${t.state === "closed" ? "text-state-success" : "text-state-warning"}`}>
                          {t.state === "closed" ? "مغلقة" : "قيد المعالجة"}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="type-small text-text-muted">لا تذاكر بعد. استفساراتك وبلاغاتك تظهر هنا مع حالتها.</p>
              )}
            </SectionCard>
          )}
        </aside>
      </div>
    </>
  );
}

/** Article detail body (TRN-HLP-01 · /help/[slug]). */
export function HelpArticleView({ article, related, basePath, ticketHref }: { article: HelpArticle; related: HelpArticle[]; basePath: string; ticketHref: string }) {
  return (
    <div className="flex w-full flex-col items-start gap-6 lg:flex-row">
      <article className="flex w-full min-w-0 flex-1 flex-col gap-4 rounded-16 border border-border-default bg-bg-card p-5 shadow-card sm:p-8">
        <span className="inline-flex items-center gap-2 self-start rounded-full bg-bg-brand-tint px-3 py-[5px] type-caption text-text-brand">
          <Glyph icon={HELP_ICONS[article.category]} size={16} />
          {HELP_CATEGORY_LABELS[article.category]}
        </span>
        <h2 className="text-[26px] leading-[1.3] font-bold text-text-primary sm:text-[32px]">{article.title}</h2>
        {article.body.split("\n\n").map((p, i) => (
          <p key={i} className="type-body-lg text-text-secondary">
            {p}
          </p>
        ))}
        <div className="mt-2 flex flex-wrap items-center gap-3 border-t border-border-divider pt-4">
          <span className="type-small text-text-muted">لم تجد ما تبحث عنه؟</span>
          <ButtonLink href={ticketHref} size="s">
            افتح تذكرة دعم
          </ButtonLink>
        </div>
      </article>
      <aside aria-label="مقالات ذات صلة" className="flex w-full shrink-0 flex-col gap-5 lg:w-[380px]">
        <SectionCard title="مقالات ذات صلة" titleId="related-title">
          {related.length ? (
            <ul className="flex flex-col gap-3">
              {related.map((a) => (
                <ArticleLinkRow key={a.slug} article={a} basePath={basePath} />
              ))}
            </ul>
          ) : (
            <p className="type-small text-text-muted">لا مقالات أخرى في هذا الموضوع.</p>
          )}
          <Link href={`${basePath}?category=${article.category}`} className="rounded-8 type-subtitle text-text-brand hover:underline focus-ring">
            كل مقالات «{HELP_CATEGORY_LABELS[article.category]}»
          </Link>
        </SectionCard>
      </aside>
    </div>
  );
}
