import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Award, ShieldCheck } from "lucide-react";
import { Glyph } from "@/components/ui/Icon";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Feedback";
import { PrintControls } from "@/components/certificates/PrintControls";
import { issuerSentence } from "@/components/certificates/CertificatePreview";
import { requireTrainee } from "@/lib/auth";
import { getPrintableCertificate } from "@/lib/data/certificates";
import { formatDate, formatNumber } from "@/lib/format";

export const metadata: Metadata = { title: "تنزيل الشهادة", robots: { index: false, follow: false } };

/* A4 landscape, no browser margins; colours kept when printing. The sheet always uses the light palette. */
const PRINT_CSS = `
@page { size: A4 landscape; margin: 0; }
.cert-sheet { --tg-surface:#ffffff; --tg-text-primary:#111111; --tg-text-secondary:#55555f; --tg-text-muted:#6b6b78; --tg-text-brand:#5b3cc4;
  --tg-brand-tint:#efebfb; --tg-border:#e2e0ee; --tg-divider:#edebf7; --tg-success:#1b7a3d; --tg-success-bg:#e6f6ec; }
@media print {
  html, body { background: #ffffff !important; }
  .cert-sheet { box-shadow: none !important; margin: 0 !important; width: 297mm !important; height: 210mm !important; border-radius: 0 !important; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
`;

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
      <article
        aria-label={`${c.kindLabel} — ${c.courseTitle}`}
        className="cert-sheet relative flex aspect-[297/210] w-full max-w-[1123px] flex-col overflow-hidden rounded-22 bg-bg-surface shadow-float"
      >
        <div aria-hidden className="h-3 w-full shrink-0 bg-action-accent" />
        <div className="m-[4%] flex flex-1 flex-col items-center justify-center gap-[2.2%] rounded-16 border-[1.5px] border-border-default px-[6%] text-center">
          <span className="flex size-16 items-center justify-center rounded-16 bg-bg-brand-tint text-text-brand">
            <Glyph icon={Award} size={32} />
          </span>
          <p className="type-body-lg text-text-muted">{c.kindLabel}</p>
          <h1 className="text-[clamp(22px,4vw,44px)] leading-[1.15] font-bold text-text-primary">{c.courseTitle}</h1>
          <p className="type-body text-text-secondary">{issuerSentence(c.organizationName)}</p>
          <p className="text-[clamp(20px,3.2vw,36px)] leading-[1.2] font-bold text-text-brand">{c.traineeName}</p>
          <p className="type-body text-text-secondary">أتمّ متطلبات البرنامج بنجاح بتاريخ {formatDate(c.issuedAt)}</p>
          <div aria-hidden className="h-px w-3/4 bg-border-divider" />
          <div className="flex flex-wrap items-start justify-center gap-x-10 gap-y-2">
            {c.hours ? (
              <div className="flex flex-col items-center">
                <p className="type-subtitle text-text-primary">{formatNumber(c.hours)} ساعة</p>
                <p className="type-caption text-text-muted">الساعات</p>
              </div>
            ) : null}
            {c.organizationName && (
              <div className="flex flex-col items-center">
                <p className="type-subtitle text-text-primary">{c.organizationName}</p>
                <p className="type-caption text-text-muted">الجهة</p>
              </div>
            )}
            <div className="flex flex-col items-center">
              <p className="type-subtitle text-text-primary">{c.trainerName}</p>
              <p className="type-caption text-text-muted">المدرب</p>
            </div>
            <div className="flex flex-col items-center">
              <p dir="ltr" className="font-mono text-[14px] leading-[1.5] text-text-primary">
                {c.code}
              </p>
              <p className="type-caption text-text-muted">رقم الشهادة</p>
            </div>
          </div>
          <p className="flex items-center gap-2 rounded-full bg-state-success-bg px-3.5 py-2 type-caption text-state-success">
            <Glyph icon={ShieldCheck} size={16} />
            تحقّق من الشهادة: <span dir="ltr" className="font-mono">{c.verifyUrl.replace(/^https?:\/\//, "")}</span>
          </p>
        </div>
      </article>
    </main>
  );
}
