import { PageBody } from "@/components/layout/TopBar";
import { Skeleton } from "@/components/ui/Feedback";

export default function Loading() {
  return (
    <PageBody className="gap-6">
      <Skeleton className="h-[76px] w-full rounded-12" />
      <Skeleton className="h-[88px] w-full rounded-16" />
      <div className="flex flex-col gap-6 lg:flex-row-reverse">
        <Skeleton className="h-[420px] w-full rounded-16 lg:w-[380px]" />
        <Skeleton className="h-[420px] flex-1 rounded-16" />
      </div>
    </PageBody>
  );
}
