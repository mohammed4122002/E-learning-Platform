import { TopBar, PageBody } from "@/components/layout/TopBar";
import { Skeleton, Spinner } from "@/components/ui/Feedback";

export default function ProgramCoursesLoading() {
  return (
    <>
      <TopBar title="الدورات المتاحة" subtitle="جارٍ التحميل…" />
      <PageBody className="!gap-7">
        <Skeleton className="h-6 w-72" />
        <Skeleton className="h-[88px] w-full !rounded-16" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-6 w-96 max-w-full" />
        </div>
        <div aria-hidden className="flex gap-2.5">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-9 w-24 !rounded-full" />
          ))}
        </div>
        <Spinner inline label="جارٍ جلب الدورات" className="self-start !px-0" />
        <div aria-hidden className="flex flex-col gap-4">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-[150px] w-full !rounded-16" />
          ))}
        </div>
      </PageBody>
    </>
  );
}
