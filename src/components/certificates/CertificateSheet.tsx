import { Award, ShieldCheck } from "lucide-react";
import { Glyph } from "@/components/ui/Icon";
import { issuerSentence } from "@/components/certificates/CertificatePreview";
import { formatDate, formatNumber } from "@/lib/format";

/* A4 landscape, no browser margins; colours kept when printing. The sheet always uses the light palette. */
export const PRINT_CSS = `
@page { size: A4 landscape; margin: 0; }
.cert-sheet { --tg-surface:#ffffff; --tg-text-primary:#111111; --tg-text-secondary:#55555f; --tg-text-muted:#6b6b78; --tg-text-brand:#5b3cc4;
  --tg-brand-tint:#efebfb; --tg-border:#e2e0ee; --tg-divider:#edebf7; --tg-success:#1b7a3d; --tg-success-bg:#e6f6ec; }
@media print {
  html, body { background: #ffffff !important; }
  .cert-sheet { box-shadow: none !important; margin: 0 !important; width: 297mm !important; height: 210mm !important; border-radius: 0 !important; break-after: page; }
  .cert-sheet:last-of-type { break-after: auto; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
`;

export type SheetData = {
  kindLabel: string;
  courseTitle: string;
  organizationName: string | null;
  traineeName: string;
  issuedAt: string;
  hours: number | null;
  trainerName: string | null;
  code: string;
  verifyUrl: string;
};

/**
 * Print-optimised certificate (TRN-CRT-02 «نزّل الشهادة PDF», TRR-CRT-01/02 «نزّل الشهادات PDF»). Same content as
 * Figma "Platform / Certificate" (63:186): accent ribbon, award tile, kind, title, issuer sentence (BR-R2),
 * trainee name, meta row, verification line.
 */
export function CertificateSheet({ c }: { c: SheetData }) {
  return (
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
          {c.trainerName && (
            <div className="flex flex-col items-center">
              <p className="type-subtitle text-text-primary">{c.trainerName}</p>
              <p className="type-caption text-text-muted">المدرب</p>
            </div>
          )}
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
  );
}
