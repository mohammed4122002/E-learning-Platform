import { TopBar, PageBody } from "@/components/layout/TopBar";
import { Skeleton, Spinner } from "@/components/ui/Feedback";

export default function CompareLoading() {
  return (
    <>
      <TopBar title="مقارنة البرامج" subtitle="قارن حتى ثلاثة برامج جنبًا إلى جنب" />
      <PageBody className="!gap-6">
        <Skeleton className="h-6 w-48" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-6 w-96 max-w-full" />
        </div>
        <div aria-hidden className="flex flex-col gap-2 rounded-16 border border-border-default bg-bg-card p-5">
          <Skeleton className="h-32 w-full" />
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
        <Spinner label="جارٍ تجهيز المقارنة" />
      </PageBody>
    </>
  );
}
