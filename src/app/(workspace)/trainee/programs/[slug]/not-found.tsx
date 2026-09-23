import { SearchX } from "lucide-react";
import { TopBar, PageBody } from "@/components/layout/TopBar";
import { EmptyState } from "@/components/ui/Feedback";
import { ButtonLink } from "@/components/ui/Button";

export default function ProgramNotFound() {
  return (
    <>
      <TopBar title="تفاصيل البرنامج" subtitle="البرنامج غير متاح" />
      <PageBody>
        <EmptyState
          icon={SearchX}
          title="البرنامج غير متاح"
          description="ربما أُلغي نشر هذا البرنامج أو تغيّر رابطه. ابحث عن برامج مشابهة في صفحة الاكتشاف."
          action={<ButtonLink href="/trainee/discover">اذهب إلى الاكتشاف</ButtonLink>}
        />
      </PageBody>
    </>
  );
}
