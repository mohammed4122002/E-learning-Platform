import { Skeleton } from "@/components/ui/Feedback";

export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="flex flex-1 flex-col items-center gap-8 px-4 pt-14 pb-14">
      <span className="sr-only">جارٍ التحميل</span>
      <Skeleton className="h-[93px] w-full" />
      <Skeleton className="h-12 w-full max-w-lg" />
      <Skeleton className="h-6 w-full max-w-2xl" />
      <div className="grid w-full max-w-[1030px] grid-cols-2 gap-[18px] md:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[150px] rounded-16" />
        ))}
      </div>
    </div>
  );
}
