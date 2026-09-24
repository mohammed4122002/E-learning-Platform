import { SearchX } from "lucide-react";
import { PageBody, TopBar } from "@/components/layout/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Feedback";

/** Fallback for trainer pages without their own not-found (e.g. an unknown contract, report or invitation id) — W2-QA-1. */
export default function TrainerNotFound() {
  return (
    <>
      <TopBar title="الصفحة غير موجودة" />
      <PageBody>
        <EmptyState
          className="max-w-[560px] self-center"
          icon={SearchX}
          title="الصفحة غير موجودة"
          description="ربما الرابط غير صحيح أو لم تعد هذه الصفحة متاحة لك."
          action={<ButtonLink href="/trainer">العودة إلى الرئيسية</ButtonLink>}
        />
      </PageBody>
    </>
  );
}
