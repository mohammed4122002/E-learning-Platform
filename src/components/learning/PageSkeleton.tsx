import { Skeleton } from "@/components/ui/Feedback";

/** Loading state shared by the learning routes: top bar placeholder + hero + two-column body. */
export function PageSkeleton({ variant = "two-column" }: { variant?: "two-column" | "list" }) {
  return (
    <div role="status" aria-live="polite" aria-label="جارٍ التحميل" className="flex flex-col">
      <div className="flex h-[86px] items-center gap-4 border-b border-border-divider bg-bg-surface px-4 sm:px-8">
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="size-11" />
        <Skeleton className="size-11" />
      </div>
      <div className="flex flex-col gap-7 px-4 pt-8 pb-14 sm:px-6 lg:px-12">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-36 w-full rounded-22" />
        {variant === "two-column" ? (
          <div className="flex flex-col gap-6 lg:flex-row">
            <div className="flex flex-1 flex-col gap-4">
              <Skeleton className="h-16 w-full rounded-16" />
              <Skeleton className="h-16 w-full rounded-16" />
              <Skeleton className="h-16 w-full rounded-16" />
              <Skeleton className="h-16 w-full rounded-16" />
            </div>
            <Skeleton className="h-96 w-full rounded-22 lg:w-[380px]" />
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-12" />
            ))}
          </div>
        )}
        <span className="sr-only">جارٍ التحميل</span>
      </div>
    </div>
  );
}
