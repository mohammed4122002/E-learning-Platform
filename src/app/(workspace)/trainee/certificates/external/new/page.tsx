import type { Metadata } from "next";
import { TopBar, PageBody } from "@/components/layout/TopBar";
import { Breadcrumb } from "@/components/ui/Navigation";
import { Notice } from "@/components/ui/InfoBlocks";
import { ExternalCertificateForm } from "@/components/certificates/ExternalCertificateForm";
import { requireTrainee } from "@/lib/auth";

export const metadata: Metadata = { title: "إضافة شهادة خارجية", description: "أضف شهادة حصلت عليها خارج المنصة لتظهر في ملفك." };

/** TRN-CRT-03 · شهادة خارجية · النموذج — Figma 4146:2. */
export default async function NewExternalCertificatePage() {
  const user = await requireTrainee("/trainee/certificates/external/new");
  return (
    <>
      <TopBar title="شهادة خارجية" subtitle="إضافة شهادة من خارج المنصة" />
      <PageBody className="gap-6">
        <Breadcrumb items={[{ label: "الشهادات", href: "/trainee/certificates" }, { label: "إضافة شهادة خارجية" }]} />
        <Notice tone="info" title="أضف شهادة حصلت عليها خارج المنصة">
          <p>تُعرض في ملفك بشارة «شهادة خارجية» وحالة توثيق منفصلة.</p>
        </Notice>
        <ExternalCertificateForm userId={user.id} cancelHref="/trainee/certificates" />
      </PageBody>
    </>
  );
}
