import { Skeleton } from "@/components/ui/Feedback";

export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="flex min-h-dvh flex-col bg-bg-page">
      <span className="sr-only">جارٍ التحميل</span>
      <Skeleton className="h-[88px] w-full rounded-none" />
      <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-7 px-4 pt-9 sm:px-6">
        <Skeleton className="h-[420px] rounded-22" />
        <Skeleton className="h-[200px] rounded-22" />
        <Skeleton className="h-[320px] rounded-22" />
      </div>
    </div>
  );
}
