import { Skeleton } from "@/components/ui/Feedback";

/** Body skeleton of a course tab (the course chrome — top bar, hero, tabs — stays rendered by the layout). */
export function TabSkeleton() {
  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start" aria-busy="true">
      <div role="status" aria-live="polite" className="sr-only">
        جارٍ التحميل
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <Skeleton className="h-24 w-full rounded-16" />
        <Skeleton className="h-[420px] w-full rounded-22" />
      </div>
      <div className="flex w-full shrink-0 flex-col gap-5 lg:w-[400px]">
        <Skeleton className="h-[260px] w-full rounded-22" />
        <Skeleton className="h-[200px] w-full rounded-22" />
      </div>
    </div>
  );
}
