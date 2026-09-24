import { SearchX } from "lucide-react";
import { PageBody, TopBar } from "@/components/layout/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Feedback";

/** A program the signed-in trainer does not own (RLS hides it) or that does not exist. */
export default function TrainerProgramNotFound() {
  return (
    <>
      <TopBar title="برامجي" subtitle="البرنامج غير موجود" />
      <PageBody>
        <EmptyState
          className="max-w-[560px] self-center"
          icon={SearchX}
          title="البرنامج غير موجود"
          description="ربما حُذفت المسودة أو ليست من برامجك. ارجع إلى قائمة برامجك."
          action={<ButtonLink href="/trainer/programs">العودة إلى برامجي</ButtonLink>}
        />
      </PageBody>
    </>
  );
}
