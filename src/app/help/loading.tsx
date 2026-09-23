import { Skeleton } from "@/components/ui/Feedback";

export default function Loading() {
  return (
    <div role="status" aria-label="جارٍ التحميل" className="flex flex-col gap-6">
      <Skeleton className="h-10 w-56" />
      <Skeleton className="h-[73px] w-full rounded-22" />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-[154px] rounded-16" />
        ))}
      </div>
    </div>
  );
}
