import { IconPill } from "./bits";
import { formatDate } from "@/lib/format";
import type { ExternalCertificateView, ProfileCertificateView } from "@/lib/data/profile";

const REVIEW_LABEL = {
  pending: { label: "قيد المراجعة", tone: "text-state-warning" },
  verified: { label: "موثّقة", tone: "text-state-success" },
  needs_changes: { label: "تحتاج تعديلًا", tone: "text-state-info" },
  rejected: { label: "مرفوضة", tone: "text-state-error" },
} as const;

function Row({ label, value, tone = "text-text-primary" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 rounded-12 border border-border-default bg-bg-page px-4 py-[11px]">
      <span className="type-caption text-text-secondary">{label}</span>
      <span className={`type-small font-bold ${tone}`}>{value}</span>
    </div>
  );
}

/** TRN-PRF-01 · تبويب شهادات خارجية (4146:1616): platform vs external certificates, clearly distinguished. */
export function ExternalCertificatesSection({ platform, external }: { platform: ProfileCertificateView | null; external: ExternalCertificateView }) {
  const review = REVIEW_LABEL[external.status];
  return (
    <section aria-labelledby="cert-kinds-title" className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 rounded-16 border-[1.5px] border-action-primary bg-bg-brand-tint px-6 py-[22px]">
        <h2 id="cert-kinds-title" className="text-[22px] font-bold leading-snug text-text-brand">
          شهاداتك في الملف المهني
        </h2>
        <p className="type-small text-text-secondary">شهادات بوابة التدريب والشهادات الخارجية معروضة بتمييز واضح حتى لا يختلط الموثَّق بغيره.</p>
      </div>

      {platform && (
        <article className="flex flex-col gap-2.5 rounded-16 border-[1.5px] border-action-primary bg-bg-surface p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="flex-1 type-title text-text-primary">شهادة صادرة من بوابة التدريب</h3>
            <IconPill tone="success">صادرة عن المنصة</IconPill>
          </div>
          <Row label="الشهادة" value={platform.title} />
          <Row label="الرقم" value={platform.code} />
          <Row label="الجهة" value={platform.issuer ?? "بوابة التدريب"} />
          <Row label="الحالة" value="سارية" tone="text-state-success" />
        </article>
      )}

      <article className="flex flex-col gap-2.5 rounded-16 border-[1.5px] border-state-info bg-bg-surface p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="flex-1 type-title text-text-primary">شهادة خارجية مضافة من المتدرب</h3>
          <IconPill tone="info">شهادة خارجية</IconPill>
        </div>
        <Row label="الشهادة" value={external.title} />
        <Row label="الجهة المصدرة" value={external.issuer} />
        <Row label="تاريخ الإصدار" value={formatDate(external.issuedOn)} />
        <Row label="حالة التوثيق" value={review.label} tone={review.tone} />
        <Row label="التحقق" value="لدى الجهة المصدرة — ليست بوابة التدريب" tone="text-state-info" />
      </article>
    </section>
  );
}
