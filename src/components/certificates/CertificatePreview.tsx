import { Award, ShieldCheck, ShieldX } from "lucide-react";
import { Glyph } from "@/components/ui/Icon";
import { formatDate, formatNumber } from "@/lib/format";

export type CertificateFace = {
  kindLabel: string;
  courseTitle: string;
  traineeName: string;
  organizationName: string | null;
  trainerName: string;
  hours: number | null;
  code: string | null;
  completedAt: string | null;
};

/** The sentence under the title — BR-R2: provider courses are certified by the provider, independent ones by the platform. */
export function issuerSentence(organizationName: string | null) {
  return organizationName ? `تشهد ${organizationName} عبر منصة بوابة التدريب بأن` : "تشهد منصة بوابة التدريب بأن";
}

function Meta({ value, label, mono }: { value: string; label: string; mono?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-[3px] text-center">
      <span className={mono ? "font-mono text-[14px] leading-[1.5] text-text-primary" : "type-subtitle text-text-primary"} dir={mono ? "ltr" : undefined}>
        {value}
      </span>
      <span className="type-caption text-text-muted">{label}</span>
    </div>
  );
}

/**
 * Figma "CERTIFICATE PREVIEW" (205:11635, component "Platform / Certificate" 63:186): r22 float card, 8px accent ribbon,
 * award tile, kind, Type/Display title, trainee name 36 Bold brand, meta row and verification pill.
 * `variant="preview"` renders the faded look of a certificate that is not issued yet (205:11885).
 */
export function CertificatePreview({ face, variant }: { face: CertificateFace; variant: "issued" | "revoked" | "preview" }) {
  const faded = variant === "preview";
  return (
    <figure
      aria-label={`${face.kindLabel} — ${face.courseTitle}`}
      className="flex w-full flex-col items-start overflow-hidden rounded-22 border border-border-default bg-bg-card shadow-float"
    >
      <div aria-hidden className={`h-2 w-[calc(100%-60px)] shrink-0 ${variant === "revoked" ? "bg-border-default" : "bg-action-accent"} ${faded ? "opacity-50" : ""}`} />
      <div className={`flex w-full flex-col items-center gap-[18px] px-5 pt-9 pb-10 text-center sm:px-10 ${faded ? "opacity-45" : ""}`}>
        <span className="flex size-16 items-center justify-center rounded-16 bg-bg-brand-tint text-text-brand">
          <Glyph icon={Award} size={32} />
        </span>
        <p className="type-body-lg text-text-muted">{face.kindLabel}</p>
        <p className="text-[32px] leading-[1.15] font-bold text-text-primary sm:text-[48px]">{face.courseTitle}</p>
        <p className="type-body text-text-secondary">{issuerSentence(face.organizationName)}</p>
        <p className="text-[28px] leading-[1.2] font-bold text-text-brand sm:text-[36px]">{face.traineeName}</p>
        <p className="type-body text-text-secondary">
          {face.completedAt ? `أتمّ متطلبات البرنامج بنجاح بتاريخ ${formatDate(face.completedAt)}` : "أتمّ متطلبات البرنامج بنجاح"}
        </p>
        <div aria-hidden className="h-px w-full bg-border-divider" />
        <div className="flex w-full flex-wrap items-center justify-center gap-6">
          {face.hours ? <Meta value={`${formatNumber(face.hours)} ساعة`} label="الساعات" /> : null}
          {face.organizationName ? <Meta value={face.organizationName} label="الجهة" /> : null}
          <Meta value={face.trainerName} label="المدرب" />
          <Meta value={face.code ?? "—"} label="رقم الشهادة" mono />
        </div>
        {variant === "revoked" ? (
          <p className="flex items-center gap-2 rounded-full bg-state-error-bg px-3.5 py-2.5 type-caption text-state-error">
            <Glyph icon={ShieldX} size={16} />
            مسحوبة — رابط التحقق يعرض حالتها «مسحوبة»
          </p>
        ) : (
          <p className="flex items-center gap-2 rounded-full bg-state-success-bg px-3.5 py-2.5 type-caption text-state-success">
            <Glyph icon={ShieldCheck} size={16} />
            قابلة للتحقق عبر رابط عام دون تسجيل دخول
          </p>
        )}
      </div>
    </figure>
  );
}
