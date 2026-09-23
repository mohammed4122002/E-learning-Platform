import { Skeleton } from "@/components/ui/Feedback";

export default function Loading() {
  return (
    <div className="flex min-h-dvh flex-col bg-bg-page" aria-busy="true" aria-label="جارٍ التحميل">
      <Skeleton className="h-[86px] w-full rounded-none" />
      <div className="mx-auto flex w-full max-w-[1328px] flex-col-reverse gap-9 px-4 py-10 sm:px-8 lg:flex-row lg:px-14">
        <Skeleton className="h-[640px] w-full lg:w-[400px]" />
        <div className="flex flex-1 flex-col gap-5">
          <Skeleton className="h-10 w-72" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    </div>
  );
}
