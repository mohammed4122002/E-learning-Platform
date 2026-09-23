import { Skeleton } from "@/components/ui/Feedback";
import { PublicHeader } from "@/components/profile/PublicHeader";

export default function Loading() {
  return (
    <div className="min-h-dvh bg-bg-page">
      <PublicHeader />
      <main className="mx-auto flex w-full max-w-[1160px] flex-col gap-6 px-4 pt-8 pb-14 sm:px-6">
        <span className="sr-only" role="status">
          جارٍ تحميل الملف
        </span>
        <Skeleton className="h-44 w-full rounded-22" />
        <Skeleton className="h-40 w-full rounded-16" />
        <Skeleton className="h-60 w-full rounded-16" />
      </main>
    </div>
  );
}
