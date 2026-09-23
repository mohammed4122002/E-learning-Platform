import Link from "next/link";
import type { ReactNode } from "react";
import { formatNumericDate } from "@/lib/format";
import type { ExternalCertificate, PlatformCertificate, ReviewStatus } from "@/lib/data/certificates";
import { CopyLinkButton } from "./CopyLinkButton";

/* Small pill used on the certificate card: px 10, py 3, 12 Medium (Figma "Platform / Certificate" 63:168). */
const pillTones = {
  success: "bg-state-success-bg text-state-success",
  brand: "bg-bg-brand-tint text-text-brand",
  warning: "bg-state-warning-bg text-state-warning",
  error: "bg-state-error-bg text-state-error",
  info: "bg-state-info-bg text-state-info",
  neutral: "bg-bg-disabled text-text-secondary",
} as const;

export function CertPill({ tone, children }: { tone: keyof typeof pillTones; children: ReactNode }) {
  return <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-[3px] text-[12px] leading-[1.5] font-medium whitespace-nowrap ${pillTones[tone]}`}>{children}</span>;
}

export const EXTERNAL_STATUS: Record<ReviewStatus, { label: string; tone: keyof typeof pillTones }> = {
  pending: { label: "قيد المراجعة", tone: "warning" },
  needs_changes: { label: "تحتاج تصحيحًا", tone: "warning" },
  verified: { label: "موثّقة", tone: "success" },
  rejected: { label: "مرفوضة", tone: "error" },
};

function Shell({ ribbon, children, muted }: { ribbon: string; children: ReactNode; muted?: boolean }) {
  return (
    <article
      className={`flex min-h-[224px] w-full min-w-0 flex-col gap-3.5 rounded-16 border border-border-default bg-bg-card p-[18px] drop-shadow-milestone ${muted ? "opacity-90" : ""}`}
    >
      <div aria-hidden className={`h-1.5 w-full shrink-0 rounded-full ${ribbon}`} />
      {children}
    </article>
  );
}

function Footer({ action, date }: { action: ReactNode; date: string }) {
  return (
    <div className="mt-auto flex w-full items-center justify-between gap-3">
      {action}
      <span className="type-small whitespace-nowrap text-text-muted">{date}</span>
    </div>
  );
}

/** Figma "Platform / Certificate" (63:186) — a certificate issued by the platform (issued or revoked). */
export function PlatformCertificateCard({ certificate: c }: { certificate: PlatformCertificate }) {
  const revoked = c.status === "revoked";
  return (
    <Shell ribbon={revoked ? "bg-border-default" : "bg-action-accent"} muted={revoked}>
      <h3 className="w-full type-h3 text-text-primary">
        <Link href={`/trainee/certificates/${c.id}`} className="rounded-8 hover:text-text-brand focus-ring">
          {c.kindLabel} — {c.courseTitle}
        </Link>
      </h3>
      <p className="w-full type-body text-text-secondary">{c.issuerName}</p>
      <div className="flex w-full flex-wrap items-center gap-2">
        {revoked ? (
          <>
            <CertPill tone="error">مسحوبة</CertPill>
            <CertPill tone="neutral">غير صالحة للتحقق</CertPill>
          </>
        ) : (
          <>
            <CertPill tone="success">صادرة عن المنصة</CertPill>
            <CertPill tone="brand">قابلة للتحقق</CertPill>
          </>
        )}
      </div>
      <Footer
        date={formatNumericDate(revoked && c.revokedAt ? c.revokedAt : c.issuedAt)}
        action={
          revoked ? (
            <Link href={`/trainee/certificates/${c.id}`} className="rounded-8 type-small text-text-brand hover:underline focus-ring">
              اعرض التفاصيل
            </Link>
          ) : (
            <CopyLinkButton text={c.verifyUrl} />
          )
        }
      />
    </Shell>
  );
}

/** Static "Platform / Certificate" used as «معاينة شهادتك» before issuance (409:16481). */
export function CertificateMiniPreview({ kindLabel, courseTitle, issuerName }: { kindLabel: string; courseTitle: string; issuerName: string }) {
  return (
    <Shell ribbon="bg-action-accent">
      <p className="w-full type-h3 text-text-primary">
        {kindLabel} — {courseTitle}
      </p>
      <p className="w-full type-body text-text-secondary">{issuerName}</p>
      <div className="flex w-full flex-wrap items-center gap-2">
        <CertPill tone="success">صادرة عن المنصة</CertPill>
        <CertPill tone="brand">قابلة للتحقق</CertPill>
      </div>
      <Footer action={<span className="type-small text-text-muted">رابط التحقق يُفعَّل بعد الإصدار</span>} date="— / — / —" />
    </Shell>
  );
}

/** External certificate uploaded by the trainee — "Card / Certificate" (61:277) warning ribbon variant. */
export function ExternalCertificateCard({ certificate: c }: { certificate: ExternalCertificate }) {
  const status = EXTERNAL_STATUS[c.status];
  return (
    <Shell ribbon={c.status === "rejected" ? "bg-border-default" : "bg-state-warning"}>
      <h3 className="w-full type-h3 text-text-primary">
        <Link href={`/trainee/certificates/external/${c.id}`} className="rounded-8 hover:text-text-brand focus-ring">
          {c.title}
        </Link>
      </h3>
      <p className="w-full type-body text-text-secondary">{c.issuer}</p>
      <div className="flex w-full flex-wrap items-center gap-2">
        <CertPill tone="info">شهادة خارجية</CertPill>
        <CertPill tone={status.tone}>{status.label}</CertPill>
      </div>
      <Footer
        date={formatNumericDate(c.issuedOn)}
        action={
          <Link href={`/trainee/certificates/external/${c.id}`} className="rounded-8 type-small text-text-brand hover:underline focus-ring">
            {c.status === "needs_changes" ? "عدّل الطلب" : "اعرض الطلب"}
          </Link>
        }
      />
    </Shell>
  );
}
