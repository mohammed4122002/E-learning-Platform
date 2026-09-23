import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/Button";
import { VerifyForm } from "@/components/verify/VerifyForm";
import { VerifyAside, VerifyCard, VerifyLayout, VerifyRow } from "@/components/verify/VerifyLayout";
import { verifyCertificate } from "@/lib/data/verify";
import { isCertificateCode, normalizeCertificateCode } from "@/lib/validation/profile";
import { formatDate, formatHours } from "@/lib/format";

export async function generateMetadata({ params }: PageProps<"/verify/[code]">): Promise<Metadata> {
  const { code: raw } = await params;
  const code = normalizeCertificateCode(decodeURIComponent(raw));
  const base = { alternates: { canonical: `/verify/${code}` }, robots: { index: false, follow: false } };
  if (!isCertificateCode(code)) return { title: "رقم شهادة غير صالح", ...base };
  try {
    const cert = await verifyCertificate(code);
    if (!cert) return { title: "لا توجد شهادة بهذا الرقم", ...base };
    const title = cert.status === "issued" ? `شهادة صحيحة — ${cert.courseTitle}` : "شهادة مسحوبة";
    const description =
      cert.status === "issued"
        ? `شهادة «${cert.courseTitle}» صادرة عن ${cert.issuer} عبر بوابة التدريب وهي سارية.`
        : "هذه الشهادة مسحوبة وغير صالحة للاستخدام أو التحقق.";
    return { title, description, ...base, openGraph: { title: `${title} · بوابة التدريب`, description, url: `/verify/${code}` } };
  } catch {
    return { title: "التحقق من شهادة", ...base };
  }
}

/**
 * PUB-VRF-02 · نتيجة التحقق — شهادة صحيحة (4139:1813) · مسحوبة (4139:1949) · غير موجودة (4139:2072) ·
 * إدخال غير صالح (4139:2185). Loading = loading.tsx (4139:1701), Error = error.tsx (4139:2297).
 */
export default async function VerifyResultPage({ params }: PageProps<"/verify/[code]">) {
  const { code: raw } = await params;
  const entered = decodeURIComponent(raw).slice(0, 40);
  const code = normalizeCertificateCode(entered);
  if (!isCertificateCode(code)) return <VerifyForm initial={entered} initialError />;

  const cert = await verifyCertificate(code);

  if (!cert) {
    return (
      <VerifyLayout aside={<VerifyAside title="تحقق من الرقم" lines={["الصيغة: ١٢ خانة من الأرقام والحروف A–F كما هو مطبوع على الشهادة."]} />}>
        <VerifyCard labelledBy="vr-title">
          <h1 id="vr-title" className="text-[30px] font-bold leading-[1.25] text-state-warning">
            لا توجد شهادة بهذا الرقم
          </h1>
          <p className="type-small text-text-secondary">تأكّد من الرقم كما هو مكتوب على الشهادة، أو من الرابط المُرسل إليك.</p>
          <dl>
            <VerifyRow label="الرقم المُدخل" value={<span dir="ltr">{code}</span>} tone="text-state-warning" />
          </dl>
          <ButtonLink href="/verify" size="l" fullWidth>
            جرّب رقمًا آخر
          </ButtonLink>
        </VerifyCard>
      </VerifyLayout>
    );
  }

  if (cert.status === "revoked") {
    return (
      <VerifyLayout
        aside={
          <VerifyAside title="شهادة غير صالحة" lines={["لا يُعرض سبب السحب ولا ملاحظات الإدارة لأي طرف خارجي."]}>
            <ButtonLink href="/verify" size="l" className="self-start">
              تحقّق من شهادة أخرى
            </ButtonLink>
          </VerifyAside>
        }
      >
        <VerifyCard labelledBy="vr-title">
          <h1 id="vr-title" className="text-[30px] font-bold leading-[1.25] text-state-error">
            الشهادة مسحوبة
          </h1>
          <p className="type-small text-text-secondary">هذه الشهادة مسحوبة وغير صالحة للاستخدام أو التحقق.</p>
          <dl className="flex flex-col gap-3">
            <VerifyRow label="رقم الشهادة" value={<span dir="ltr">{cert.code}</span>} />
            <VerifyRow label="الجهة المصدِّرة" value={cert.issuer} />
            <VerifyRow label="تاريخ الإصدار" value={formatDate(cert.issuedAt)} />
            <VerifyRow label="حالة الصلاحية" value="مسحوبة" tone="text-state-error" />
          </dl>
        </VerifyCard>
      </VerifyLayout>
    );
  }

  return (
    <VerifyLayout
      aside={
        <VerifyAside title="شهادة موثقة" lines={["يُعرض الاسم كما هو مطبوع على الشهادة.", "الدرجة لا تُعرض إلا إن كانت مطبوعة على الشهادة نفسها."]}>
          <ButtonLink href="/verify" size="l" className="self-start">
            تحقّق من شهادة أخرى
          </ButtonLink>
        </VerifyAside>
      }
    >
      <VerifyCard labelledBy="vr-title">
        <h1 id="vr-title" className="text-[30px] font-bold leading-[1.25] text-state-success">
          الشهادة صحيحة
        </h1>
        <p className="type-small text-text-secondary">صدرت هذه الشهادة عبر بوابة التدريب وهي سارية.</p>
        <dl className="flex flex-col gap-3">
          <VerifyRow label="رقم الشهادة" value={<span dir="ltr">{cert.code}</span>} />
          <VerifyRow label="اسم المتدرب" value={cert.traineeName} />
          <VerifyRow label="الدورة / البرنامج" value={cert.courseTitle} />
          <VerifyRow label="الجهة المصدِّرة" value={cert.issuer} />
          {cert.trainerName && <VerifyRow label="المدرب" value={cert.trainerName} />}
          <VerifyRow label="تاريخ الإصدار" value={formatDate(cert.issuedAt)} />
          {cert.hours !== null && <VerifyRow label="الساعات التدريبية" value={formatHours(Number(cert.hours))} />}
          <VerifyRow label="حالة الصلاحية" value="سارية" tone="text-state-success" />
        </dl>
      </VerifyCard>
    </VerifyLayout>
  );
}
