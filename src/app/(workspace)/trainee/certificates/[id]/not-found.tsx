import { Award } from "lucide-react";
import { TopBar, PageBody } from "@/components/layout/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Feedback";

export default function CertificateNotFound() {
  return (
    <>
      <TopBar title="معاينة الشهادة" />
      <PageBody>
        <EmptyState
          icon={Award}
          title="لم نعثر على هذه الشهادة"
          description="ربما حُذف الرابط أو أنها لا تخص حسابك. شهاداتك كلها في صفحة «شهاداتي»."
          action={<ButtonLink href="/trainee/certificates">اعرض شهاداتي</ButtonLink>}
        />
      </PageBody>
    </>
  );
}
