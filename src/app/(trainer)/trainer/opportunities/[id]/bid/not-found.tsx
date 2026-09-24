import { PageBody, TopBar } from "@/components/layout/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Feedback";

export default function BidNotFound() {
  return (
    <>
      <TopBar title="تقديم عرض" subtitle="الطلب غير متاح" />
      <PageBody>
        <EmptyState
          title="هذا الطلب غير متاح"
          description="ربما أُغلق باب العروض عليه أو لم يعد منشورًا."
          action={<ButtonLink href="/trainer/opportunities">العودة إلى الفرص</ButtonLink>}
        />
      </PageBody>
    </>
  );
}
