import { TopBar, PageBody } from "@/components/layout/TopBar";
import { Skeleton, Spinner } from "@/components/ui/Feedback";

/** TRN-DSC-01 · جارٍ التحميل (104:1969): filter card skeleton + card skeleton grid + "جارٍ جلب النتائج". */
export default function DiscoverLoading() {
  return (
    <>
      <TopBar title="الاكتشاف والبحث" subtitle="ابحث عن البرنامج المناسب لمسارك" />
      <PageBody className="!gap-7">
        <header className="flex flex-col gap-1.5">
          <h1 className="text-[28px] leading-[1.2] font-bold text-text-primary sm:text-[36px]">الاكتشاف والبحث</h1>
          <p className="type-body-lg text-text-secondary">جارٍ جلب النتائج…</p>
        </header>
        <div className="flex w-full flex-col items-start gap-6 lg:flex-row">
          <div aria-hidden className="flex w-full shrink-0 flex-col gap-5 rounded-16 border border-border-default bg-bg-card px-5 py-6 shadow-card lg:w-[300px]">
            <Skeleton className="h-7 w-32" />
            {Array.from({ length: 3 }, (_, g) => (
              <div key={g} className="flex flex-col gap-4 border-b border-border-divider pb-5 last:border-0">
                <Skeleton className="h-6 w-24" />
                {Array.from({ length: 4 }, (_, i) => (
                  <Skeleton key={i} className="h-5 w-full" />
                ))}
              </div>
            ))}
          </div>
          <div className="flex w-full min-w-0 flex-1 flex-col gap-5">
            <Spinner inline label="جارٍ جلب النتائج" className="self-start !px-0" />
            <div aria-hidden className="grid w-full grid-cols-1 gap-5 sm:grid-cols-[repeat(auto-fill,minmax(238px,1fr))]">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="flex flex-col gap-3 rounded-16 border border-border-default bg-bg-card p-3">
                  <Skeleton className="h-[180px] w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3 self-center" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </PageBody>
    </>
  );
}
