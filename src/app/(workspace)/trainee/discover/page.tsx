import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Search } from "lucide-react";
import { TopBar, PageBody } from "@/components/layout/TopBar";
import { EmptyState } from "@/components/ui/Feedback";
import { ButtonLink } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Navigation";
import { FilterPanel } from "@/components/discover/FilterPanel";
import { SortSelect } from "@/components/discover/SortSelect";
import { SearchOverlay } from "@/components/discover/SearchOverlay";
import { ActiveFilterChips, CompareBar, ResultsGrid } from "@/components/discover/DiscoverParts";
import { requireTrainee } from "@/lib/auth";
import { getDiscover, getNearbyCourses } from "@/lib/data/discover";
import { activeFilterCount, discoverHref, parseDiscover } from "@/lib/discover-params";
import { pluralAr, toArabicDigits } from "@/lib/format";

export const metadata: Metadata = { title: "الاكتشاف والبحث", description: "ابحث عن البرنامج المناسب لمسارك" };

/**
 * TRN-DSC-01 · الاكتشاف والبحث — Figma 104:1016 (النتائج), 104:1582 (لا نتائج), 104:1969 (جارٍ التحميل → loading.tsx),
 * 138:5088 (نافذة البحث), 4134:2 / 4134:598 (شريط المقارنة), 631:57485 (فلتر الموقع).
 */
export default async function DiscoverPage({ searchParams }: PageProps<"/trainee/discover">) {
  await requireTrainee("/trainee/discover");
  const state = parseDiscover(await searchParams);
  const view = await getDiscover(state);
  if (view.total > 0 && state.page > view.pageCount) redirect(discoverHref(state, { page: view.pageCount }));

  const filters = activeFilterCount(state);
  const nearby = view.total === 0 ? await getNearbyCourses(state) : [];
  const resultsLabel =
    view.total === 0
      ? "لا نتائج مطابقة"
      : `${pluralAr(view.total, ["نتيجة واحدة", "نتيجتان", "نتائج", "نتيجة"])}${state.q ? ` لـ «${state.q}»` : ""}`;

  return (
    <>
      <TopBar title="الاكتشاف والبحث" subtitle="ابحث عن البرنامج المناسب لمسارك" />
      <PageBody className="!gap-7">
        <header className="flex flex-col gap-1.5">
          <h1 className="text-[28px] leading-[1.2] font-bold text-text-primary sm:text-[36px]">الاكتشاف والبحث</h1>
          <p className="type-body-lg text-text-secondary">اعثر على البرنامج المناسب لمسارك — يمكنك التصفية حسب التخصص ونمط الحضور والسعر والتقييم.</p>
        </header>

        <ActiveFilterChips state={state} categoryNames={view.categoryNames} />

        <div className="flex w-full flex-col items-start gap-6 lg:flex-row">
          <FilterPanel state={state} categories={view.categories} modes={view.modes} levels={view.levels} cities={view.cities} />

          <section aria-labelledby="results-title" className="flex w-full min-w-0 flex-1 flex-col gap-5">
            <div className="flex w-full flex-wrap items-center justify-between gap-3">
              <h2 id="results-title" aria-live="polite" className="min-w-0 flex-1 type-body text-text-secondary">
                {resultsLabel}
              </h2>
              <SortSelect state={state} />
            </div>

            {view.total > 0 ? (
              <>
                <ResultsGrid cards={view.cards} state={state} />
                <div className="flex w-full justify-center pt-3">
                  <Pagination page={view.page} pageCount={view.pageCount} hrefFor={(p) => discoverHref(state, { page: p })} />
                </div>
              </>
            ) : (
              <>
                <EmptyState
                  icon={Search}
                  className="border-dashed"
                  title="لا نتائج تطابق بحثك"
                  description={
                    filters > 0
                      ? `جرّب توسيع البحث أو إزالة بعض عوامل التصفية — لديك ${pluralAr(filters, ["فلتر واحد مفعّل", "فلتران مفعّلان", "فلاتر مفعّلة", "فلترًا مفعّلًا"])}.`
                      : "لا توجد برامج منشورة حاليًا. عُد قريبًا — نضيف برامج جديدة باستمرار."
                  }
                  action={
                    filters > 0 ? (
                      <ButtonLink href={discoverHref(state, { q: "", cat: [], mode: [], level: [], city: [], price: null, rating: null })}>امسح الفلاتر</ButtonLink>
                    ) : undefined
                  }
                />
                {nearby.length > 0 && (
                  <section aria-labelledby="nearby-title" className="flex flex-col gap-5 pt-4">
                    <h2 id="nearby-title" className="type-h3 text-text-primary">
                      برامج قريبة من بحثك
                    </h2>
                    <ResultsGrid cards={nearby} state={state} dense />
                  </section>
                )}
              </>
            )}
          </section>
        </div>

        <CompareBar state={state} items={view.compare} />
        <p className="sr-only" aria-live="polite">
          {view.compare.length > 0 ? `في المقارنة ${toArabicDigits(view.compare.length)} من ٣` : ""}
        </p>
      </PageBody>
      {state.focus && <SearchOverlay initialQuery={state.q} onCloseHref={discoverHref(state)} />}
    </>
  );
}
