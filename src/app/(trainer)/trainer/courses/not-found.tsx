import { SearchX } from "lucide-react";
import { PageBody, TopBar } from "@/components/layout/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Feedback";

/** A course the signed-in trainer does not manage (RLS hides it) or that does not exist. */
export default function TrainerCourseNotFound() {
  return (
    <>
      <TopBar title="دوراتي" subtitle="الدورة غير موجودة" />
      <PageBody>
        <EmptyState
          className="max-w-[560px] self-center"
          icon={SearchX}
          title="الدورة غير موجودة"
          description="ربما حُذفت المسودة أو ليست من دوراتك. ارجع إلى قائمة دوراتك."
          action={<ButtonLink href="/trainer/courses">العودة إلى دوراتي</ButtonLink>}
        />
      </PageBody>
    </>
  );
}
