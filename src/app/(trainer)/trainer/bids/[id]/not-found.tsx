import { PageBody, TopBar } from "@/components/layout/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Feedback";

export default function BidNotFound() {
  return (
    <>
      <TopBar title="عروضي" subtitle="العرض غير متاح" />
      <PageBody>
        <EmptyState
          title="هذا العرض غير متاح"
          description="لم نعثر على هذا العرض بين عروضك — ربما الرابط غير صحيح."
          action={<ButtonLink href="/trainer/bids">العودة إلى عروضي</ButtonLink>}
        />
      </PageBody>
    </>
  );
}
