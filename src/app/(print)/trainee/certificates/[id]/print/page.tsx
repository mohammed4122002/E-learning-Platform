import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Feedback";
import { PrintControls } from "@/components/certificates/PrintControls";
import { CertificateSheet, PRINT_CSS } from "@/components/certificates/CertificateSheet";
import { requireTrainee } from "@/lib/auth";
import { getPrintableCertificate } from "@/lib/data/certificates";

export const metadata: Metadata = { title: "تنزيل الشهادة", robots: { index: false, follow: false } };

/**
 * Print-optimised certificate for "نزّل الشهادة PDF" (TRN-CRT-02). Same content as Figma "Platform / Certificate" (63:186):
 * accent ribbon, award tile, kind, course title, issuer sentence (BR-R2), trainee name, meta row, verification line.
 */
export default async function CertificatePrintPage({ params }: PageProps<"/trainee/certificates/[id]/print">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const user = await requireTrainee(`/trainee/certificates/${id}/print`);
  const c = await getPrintableCertificate(user.id, id);
  if (!c) notFound();

  if (c.status === "revoked") {
    return (
      <main className="mx-auto flex min-h-dvh max-w-xl items-center px-4">
        <EmptyState
          tone="error"
          title="لا يمكن تنزيل شهادة مسحوبة"
          description="سُحبت هذه الشهادة، فالتنزيل والمشاركة معطَّلان. رابط التحقق العام يعرض حالتها «مسحوبة»."
          action={<ButtonLink href={`/trainee/certificates/${c.id}`}>عد إلى الشهادة</ButtonLink>}
        />
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh flex-col items-center gap-6 bg-bg-page px-4 py-8 print:block print:bg-white print:p-0">
      <style>{PRINT_CSS}</style>
      <PrintControls backHref={`/trainee/certificates/${c.id}`} />
      <CertificateSheet
        c={{ kindLabel: c.kindLabel, courseTitle: c.courseTitle, organizationName: c.organizationName, traineeName: c.traineeName, issuedAt: c.issuedAt, hours: c.hours, trainerName: c.trainerName, code: c.code, verifyUrl: c.verifyUrl }}
      />
    </main>
  );
}
