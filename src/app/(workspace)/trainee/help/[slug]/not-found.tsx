import { CircleQuestionMark } from "lucide-react";
import { TopBar, PageBody } from "@/components/layout/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Feedback";

export default function HelpArticleNotFound() {
  return (
    <>
      <TopBar title="مركز المساعدة" />
      <PageBody>
        <EmptyState
          icon={CircleQuestionMark}
          title="لم نعثر على هذه المقالة"
          description="ربما نُقلت أو حُذفت. ابحث في مركز المساعدة عن موضوعك."
          action={<ButtonLink href="/trainee/help">عد إلى مركز المساعدة</ButtonLink>}
        />
      </PageBody>
    </>
  );
}
