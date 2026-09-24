import { SearchX } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Feedback";

export default function PreviewNotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg-page p-6">
      <EmptyState
        className="max-w-[560px]"
        icon={SearchX}
        title="الدورة غير موجودة"
        description="لا يمكن معاينة دورة ليست من دوراتك."
        action={<ButtonLink href="/trainer/courses">العودة إلى دوراتي</ButtonLink>}
      />
    </main>
  );
}
