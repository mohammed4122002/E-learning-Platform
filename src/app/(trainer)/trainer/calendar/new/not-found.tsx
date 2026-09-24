import { CalendarX } from "lucide-react";
import { TopBar, PageBody } from "@/components/layout/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Feedback";

export default function EventNotFound() {
  return (
    <>
      <TopBar title="تعديل موعد" />
      <PageBody>
        <EmptyState
          icon={CalendarX}
          title="لم نعثر على هذا الموعد"
          description="ربما حُذف، أو أنه ليس في تقويمك."
          action={<ButtonLink href="/trainer/calendar">عد إلى الجدول</ButtonLink>}
        />
      </PageBody>
    </>
  );
}
