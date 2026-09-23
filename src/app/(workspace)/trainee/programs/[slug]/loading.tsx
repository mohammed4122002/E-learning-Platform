import { TopBar, PageBody } from "@/components/layout/TopBar";
import { Skeleton, Spinner } from "@/components/ui/Feedback";

export default function ProgramLoading() {
  return (
    <>
      <TopBar title="تفاصيل البرنامج" subtitle="جارٍ التحميل…" />
      <PageBody className="!gap-7">
        <Skeleton className="h-6 w-72" />
        <div aria-hidden className="flex flex-col overflow-hidden rounded-22 border border-border-default bg-bg-card">
          <Skeleton className="h-[280px] w-full !rounded-none" />
          <div className="flex flex-col gap-4 px-8 py-7">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-12 w-2/3" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-1/2" />
          </div>
        </div>
        <div className="flex w-full flex-col gap-6 lg:flex-row">
          <div aria-hidden className="flex flex-1 flex-col gap-6">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
          <div aria-hidden className="flex w-full flex-col gap-5 lg:w-[360px]">
            <Skeleton className="h-72 w-full" />
          </div>
        </div>
        <Spinner label="جارٍ تحميل البرنامج" />
      </PageBody>
    </>
  );
}
