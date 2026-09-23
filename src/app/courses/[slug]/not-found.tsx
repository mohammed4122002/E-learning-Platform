import { SearchX } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Feedback";

export default function CourseNotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg-page p-6">
      <EmptyState
        className="max-w-[560px]"
        icon={SearchX}
        title="الدورة غير موجودة"
        description="ربما أُلغيت الدورة أو تغيّر رابطها. تصفّح الدورات المتاحة لتجد ما يناسبك."
        action={<ButtonLink href="/trainee/discover">اكتشف دورة</ButtonLink>}
      />
    </main>
  );
}
