import Link from "next/link";
import { CopyButton } from "./CopyButton";
import { formatNumericDate } from "@/lib/format";

/** Figma "Platform / Certificate" (63:164) — Issued. Links to the public verification page (PUB-VRF-02). */
export function ProfileCertificateCard({
  title,
  traineeName,
  issuedAt,
  code,
}: {
  title: string;
  traineeName: string;
  issuedAt: string;
  code: string;
}) {
  const verifyPath = `/verify/${code}`;
  return (
    <article className="flex min-w-0 flex-1 flex-col gap-3.5 rounded-16 border border-border-default bg-bg-card p-[18px] drop-shadow-milestone">
      <div aria-hidden className="h-1.5 w-full rounded-full bg-action-accent" />
      <h3 className="type-h3 text-text-primary">
        <Link href={verifyPath} className="rounded-8 hover:underline focus-ring">
          شهادة إتمام — {title}
        </Link>
      </h3>
      <p className="type-body text-text-secondary">{traineeName}</p>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-bg-brand-tint px-2.5 py-[3px] text-[12px] font-medium leading-normal text-text-brand">قابلة للتحقق</span>
        <span className="rounded-full bg-state-success-bg px-2.5 py-[3px] text-[12px] font-medium leading-normal text-state-success">صادرة عن المنصة</span>
      </div>
      <div className="mt-auto flex items-center justify-between gap-3">
        <CopyButton value={verifyPath} successMessage="نُسخ رابط التحقق">
          نسخ رابط التحقق
        </CopyButton>
        <span className="type-small text-text-muted">{formatNumericDate(issuedAt)}</span>
      </div>
    </article>
  );
}
