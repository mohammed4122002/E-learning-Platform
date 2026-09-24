import { CircleQuestionMark } from "lucide-react";
import { TopBar, PageBody } from "@/components/layout/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Feedback";

export default function TrainerGuideNotFound() {
  return (
    <>
      <TopBar title="مركز المساعدة" />
      <PageBody>
        <EmptyState
          icon={CircleQuestionMark}
          title="لم نعثر على هذا الدليل"
          description="ربما نُقل أو حُذف. ابحث في مركز المساعدة عن موضوعك."
          action={<ButtonLink href="/trainer/help">عد إلى مركز المساعدة</ButtonLink>}
        />
      </PageBody>
    </>
  );
}
