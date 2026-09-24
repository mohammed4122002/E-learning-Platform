import { Skeleton } from "@/components/ui/Feedback";

/** `loading.tsx` body of the course tabs (the tab layout already renders the top bar and tab strip). */
export function TabSkeleton({ stats = true }: { stats?: boolean }) {
  return (
    <div className="flex flex-col gap-6">
      <div role="status" aria-live="polite" className="sr-only">
        جارٍ التحميل
      </div>
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-[166px] rounded-16" />
          ))}
        </div>
      )}
      <div className="flex flex-col gap-6 lg:flex-row">
        <Skeleton className="h-[560px] w-full flex-1 rounded-22" />
        <Skeleton className="h-[420px] w-full rounded-22 lg:w-[380px]" />
      </div>
    </div>
  );
}
