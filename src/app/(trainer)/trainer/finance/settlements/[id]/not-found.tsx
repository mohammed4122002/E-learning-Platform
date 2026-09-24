import { SearchX } from "lucide-react";
import { PageBody, TopBar } from "@/components/layout/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Feedback";

/** An unknown settlement number or one with no ledger rows for the signed-in trainer (W2-FIN-14). */
export default function SettlementNotFound() {
  return (
    <>
      <TopBar title="تفاصيل التسوية" subtitle="التسوية غير موجودة" />
      <PageBody>
        <EmptyState
          className="max-w-[560px] self-center"
          icon={SearchX}
          title="التسوية غير موجودة"
          description="لم نعثر على هذه التسوية بين تسوياتك — ربما الرابط غير صحيح."
          action={<ButtonLink href="/trainer/finance">العودة إلى الرصيد</ButtonLink>}
        />
      </PageBody>
    </>
  );
}
