import { TopBar, PageBody } from "@/components/layout/TopBar";
import { Skeleton } from "@/components/ui/Feedback";

/** `loading.tsx` body for workspace pages: real top bar + shimmering heading, stats/cards and two-column blocks. */
export function PageSkeleton({ title, subtitle, layout = "grid" }: { title: string; subtitle?: string; layout?: "grid" | "split" | "list" }) {
  return (
    <>
      <TopBar title={title} subtitle={subtitle} />
      <PageBody className="gap-6">
        <div role="status" aria-live="polite" className="sr-only">
          جارٍ التحميل
        </div>
        <div className="flex flex-col gap-3">
          <Skeleton className="h-10 w-56" />
          <Skeleton className="h-6 w-full max-w-xl" />
        </div>
        {layout === "grid" && (
          <>
            <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-[151px] rounded-16" />
              ))}
            </div>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }, (_, i) => (
                <Skeleton key={i} className="h-[224px] rounded-16" />
              ))}
            </div>
          </>
        )}
        {layout === "split" && (
          <div className="flex flex-col gap-6 lg:flex-row">
            <Skeleton className="h-[480px] w-full rounded-16 lg:w-[380px]" />
            <Skeleton className="h-[620px] w-full flex-1 rounded-22" />
          </div>
        )}
        {layout === "list" && (
          <div className="flex flex-col gap-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-[88px] rounded-12" />
            ))}
          </div>
        )}
      </PageBody>
    </>
  );
}
