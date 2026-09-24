import { PageBody, TopBar } from "@/components/layout/TopBar";
import { OpportunitiesSkeleton } from "@/components/trainer-bids/OpportunityParts";

/** TRR-BID-01 · جارٍ التحميل (464:36381). */
export default function Loading() {
  return (
    <>
      <TopBar title="تصفّح الفرص" subtitle="جارٍ التحميل" />
      <PageBody className="gap-[26px]">
        <OpportunitiesSkeleton />
      </PageBody>
    </>
  );
}
