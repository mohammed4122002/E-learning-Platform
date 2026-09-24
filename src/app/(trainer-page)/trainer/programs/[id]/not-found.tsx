import { SearchX } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Feedback";

/** A program the signed-in trainer does not own (RLS hides it) or that does not exist. */
export default function ProgramPageNotFound() {
  return (
    <main className="flex flex-1 items-start justify-center px-4 pt-10 pb-14 sm:px-14">
      <EmptyState
        className="max-w-[560px]"
        icon={SearchX}
        title="البرنامج غير موجود"
        description="ربما حُذفت المسودة أو ليست من برامجك. ارجع إلى قائمة برامجك."
        action={<ButtonLink href="/trainer/programs">العودة إلى برامجي</ButtonLink>}
      />
    </main>
  );
}
