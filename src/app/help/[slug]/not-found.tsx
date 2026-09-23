import { CircleQuestionMark } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Feedback";

export default function PublicHelpArticleNotFound() {
  return (
    <EmptyState
      icon={CircleQuestionMark}
      title="لم نعثر على هذه المقالة"
      description="ربما نُقلت أو حُذفت. ابحث في مركز المساعدة عن موضوعك."
      action={<ButtonLink href="/help">عد إلى مركز المساعدة</ButtonLink>}
    />
  );
}
