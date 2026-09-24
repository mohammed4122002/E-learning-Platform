import { PageBody, TopBar } from "@/components/layout/TopBar";
import { Skeleton } from "@/components/ui/Feedback";
import { Breadcrumb } from "@/components/ui/Navigation";

function ListCard() {
  return (
    <div className="flex flex-col gap-4 rounded-22 border border-border-default bg-bg-card p-5 sm:p-6">
      <Skeleton className="h-6 w-40" />
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-12 bg-bg-page p-3">
          <Skeleton className="size-10 rounded-12" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** TRR-CRS-09 · تحميل (415:20189). */
export default function Loading() {
  return (
    <>
      <TopBar title="المبيعات" subtitle="جارٍ التحميل" />
      <PageBody className="gap-6">
        <div role="status" aria-live="polite" className="sr-only">
          جارٍ تحميل المبيعات
        </div>
        <Breadcrumb items={[{ label: "دوراتي", href: "/trainer/courses" }]} />
        <div className="overflow-hidden rounded-22 border border-border-default bg-bg-card">
          <Skeleton className="h-[72px] w-full rounded-none sm:h-[110px]" />
          <div className="flex flex-col gap-3 p-6">
            <Skeleton className="h-8 w-2/5" />
            <Skeleton className="h-4 w-1/4" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="flex flex-col gap-3 rounded-16 border border-border-default bg-bg-card p-4">
              <div className="flex items-center gap-2">
                <Skeleton className="size-8 rounded-8" />
                <Skeleton className="h-3 flex-1" />
              </div>
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="flex min-w-0 flex-1 flex-col gap-6">
            <ListCard />
            <ListCard />
          </div>
          <div className="w-full lg:w-[400px]">
            <Skeleton className="h-[260px] w-full rounded-22" />
          </div>
        </div>
      </PageBody>
    </>
  );
}
