import { Skeleton, Spinner } from "@/components/ui/Feedback";

export default function ProgramPageLoading() {
  return (
    <div className="flex min-h-dvh flex-col bg-bg-page" aria-busy="true">
      <Skeleton className="h-[86px] w-full !rounded-none" />
      <Skeleton className="h-[72px] w-full !rounded-none" />
      <div className="flex w-full flex-col-reverse gap-9 px-4 py-10 sm:px-8 lg:flex-row-reverse lg:px-14">
        <Skeleton className="h-[640px] w-full lg:w-[400px]" />
        <div className="flex flex-1 flex-col gap-5">
          <Skeleton className="h-10 w-72" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-60 w-full" />
        </div>
      </div>
      <Spinner label="جارٍ تحميل صفحة البرنامج" />
    </div>
  );
}
