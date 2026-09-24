import { RotateCcw } from "lucide-react";
import { PageBody, TopBar } from "@/components/layout/TopBar";
import { Skeleton } from "@/components/ui/Feedback";
import { Glyph } from "@/components/ui/Icon";
import { Breadcrumb } from "@/components/ui/Navigation";

/** TRR-CRS-09 · تحميل (415:20189): heading, five stat tiles, the transactions table and «جارٍ جمع مبيعاتك». */
export default function Loading() {
  return (
    <>
      <TopBar title="المبيعات" subtitle="جارٍ التحميل" />
      <PageBody className="gap-6">
        <div role="status" aria-live="polite" className="sr-only">
          جارٍ تحميل المبيعات
        </div>
        <Breadcrumb items={[{ label: "دوراتي", href: "/trainer/courses" }, { label: "المبيعات" }]} />
        <div className="flex flex-col gap-3">
          <Skeleton className="h-8 w-[300px] max-w-full rounded-8" />
          <Skeleton className="h-[18px] w-[220px] max-w-full rounded-8" />
        </div>
        <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="flex flex-col gap-3.5 rounded-16 border border-border-default bg-bg-card px-5 pt-5 pb-[22px]">
              <div className="flex items-center gap-2.5">
                <Skeleton className="size-10 shrink-0 rounded-12" />
                <Skeleton className="h-3 flex-1 rounded-8" />
              </div>
              <Skeleton className="h-7 w-[90px] rounded-8" />
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <section className="flex min-w-0 flex-1 flex-col gap-5 rounded-22 border border-border-default bg-bg-card p-5 sm:p-7">
            <Skeleton className="h-6 w-[180px] rounded-8" />
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="flex items-center gap-4 rounded-16 bg-bg-page px-5 py-[18px]">
                <Skeleton className="size-11 shrink-0 rounded-full" />
                <div className="flex w-[104px] flex-col gap-2">
                  <Skeleton className="h-4 w-full rounded-8" />
                  <Skeleton className="h-3 w-full rounded-8" />
                </div>
                <Skeleton className="hidden h-4 flex-1 rounded-8 sm:block" />
                <Skeleton className="hidden h-4 flex-1 rounded-8 sm:block" />
                <Skeleton className="h-4 w-[90px] rounded-8" />
              </div>
            ))}
          </section>
          <aside className="flex w-full shrink-0 flex-col items-center gap-3 rounded-22 border border-border-default bg-bg-card px-6 pt-10 pb-10 text-center lg:w-[400px]">
            <span className="flex size-16 items-center justify-center rounded-16 bg-bg-brand-tint text-text-brand">
              <Glyph icon={RotateCcw} size={32} />
            </span>
            <p className="type-h3 text-text-primary">جارٍ جمع مبيعاتك</p>
            <p className="type-body text-text-muted">نحسب العمولات والاستردادات والمبالغ المتاحة.</p>
          </aside>
        </div>
      </PageBody>
    </>
  );
}
