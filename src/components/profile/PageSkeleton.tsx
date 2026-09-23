import { TopBar, PageBody } from "@/components/layout/TopBar";
import { Skeleton } from "@/components/ui/Feedback";

/** `loading.tsx` body for the workspace screens of this area: top bar + hero + two-column cards. */
export function PageSkeleton({ title, subtitle, hero = true, side = true }: { title: string; subtitle?: string; hero?: boolean; side?: boolean }) {
  return (
    <>
      <TopBar title={title} subtitle={subtitle} />
      <PageBody className="gap-6">
        <span className="sr-only" role="status">
          جارٍ التحميل
        </span>
        {hero && <Skeleton className="h-40 w-full rounded-22" />}
        <div className={`grid grid-cols-1 gap-6 ${side ? "lg:grid-cols-[minmax(0,1fr)_380px]" : ""}`}>
          <div className="flex flex-col gap-6">
            <Skeleton className="h-44 w-full rounded-16" />
            <Skeleton className="h-56 w-full rounded-16" />
            <Skeleton className="h-40 w-full rounded-16" />
          </div>
          {side && (
            <div className="flex flex-col gap-5">
              <Skeleton className="h-72 w-full rounded-16" />
              <Skeleton className="h-48 w-full rounded-16" />
            </div>
          )}
        </div>
      </PageBody>
    </>
  );
}
