import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Award, BadgeCheck, CircleAlert, CircleCheck, CircleUser, CircleX, Clock, Hourglass, Landmark, OctagonX, ShieldCheck } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { Glyph } from "@/components/ui/Icon";
import { DocumentsSafety } from "./DocumentsSafety";
import { formatDate, formatDayMonth, formatTime } from "@/lib/format";
import type { VerificationView } from "@/lib/data/profile";

type Status = VerificationView["status"];

const TONE: Record<Status, { box: string; text: string; activeStep: string; icon: LucideIcon; label: string; title: string }> = {
  pending: {
    box: "border-state-warning bg-state-warning-bg",
    text: "text-state-warning",
    activeStep: "border-state-warning bg-state-warning-bg",
    icon: Hourglass,
    label: "قيد المراجعة",
    title: "قيد المراجعة",
  },
  verified: {
    box: "border-state-success bg-state-success-bg",
    text: "text-state-success",
    activeStep: "border-state-success bg-state-success-bg",
    icon: BadgeCheck,
    label: "تم التوثيق",
    title: "تم التوثيق",
  },
  needs_changes: {
    box: "border-state-info bg-state-info-bg",
    text: "text-state-info",
    activeStep: "border-state-info bg-state-info-bg",
    icon: CircleAlert,
    label: "يحتاج تعديل",
    title: "يحتاج تعديل",
  },
  rejected: {
    box: "border-state-error bg-state-error-bg",
    text: "text-state-error",
    activeStep: "border-state-error bg-state-error-bg",
    icon: OctagonX,
    label: "مرفوض",
    title: "مرفوض",
  },
};

const DOC_LABEL = { national_id: "بطاقة هوية وطنية", iqama: "إقامة", passport: "جواز سفر" } as const;

export const VERIFICATION_SUBTITLE: Record<Status, string> = {
  pending: "قيد المراجعة",
  verified: "تم التوثيق",
  needs_changes: "يحتاج تعديل",
  rejected: "مرفوض",
};

function Step({ icon, title, caption, state, activeClass }: { icon: LucideIcon; title: string; caption: string; state: "done" | "active" | "todo"; activeClass: string }) {
  return (
    <li
      aria-current={state === "active" ? "step" : undefined}
      className={`flex items-center gap-3 rounded-12 px-4 py-3.5 ${state === "active" ? `border-[1.5px] ${activeClass}` : "border-[1.5px] border-transparent bg-bg-page"}`}
    >
      <span className={`flex size-10 shrink-0 items-center justify-center rounded-full bg-bg-surface ${state === "done" ? "text-state-success" : state === "todo" ? "text-text-muted" : "text-text-primary"}`}>
        <Glyph icon={icon} size={20} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className={`type-subtitle ${state === "todo" ? "text-text-secondary" : "text-text-primary"}`}>
          {title}
          <span className="sr-only">{state === "done" ? " — مكتملة" : state === "active" ? " — الخطوة الحالية" : " — لم تبدأ"}</span>
        </p>
        <p className="type-caption text-text-muted">{caption}</p>
      </div>
    </li>
  );
}

/** TRN-VER-02 · حالة التوثيق — قيد المراجعة (244:15937) · موثّقة (244:16155) · تحتاج تعديلات (244:16390) · مرفوضة (244:16615). */
export function VerificationStatus({ v }: { v: VerificationView }) {
  const t = TONE[v.status];
  const reviewed = v.status !== "pending";
  const steps: { icon: LucideIcon; title: string; caption: string; state: "done" | "active" | "todo" }[] = [
    { icon: CircleCheck, title: "رفع المستند", caption: `${formatDayMonth(v.submittedAt)} · ${formatTime(v.submittedAt)}`, state: "done" },
    {
      icon: v.status === "verified" ? CircleCheck : ShieldCheck,
      title: "مراجعة فريق التوثيق",
      caption: "٢٤–٤٨ ساعة عمل",
      state: v.status === "verified" ? "done" : "active",
    },
    { icon: BadgeCheck, title: "القرار", caption: "يصلك إشعار فور صدوره", state: v.status === "verified" ? "active" : "todo" },
    { icon: BadgeCheck, title: "تفعيل الشارة", caption: "تظهر «هوية موثَّقة» في ملفك", state: "todo" },
  ];

  const description = {
    pending: "استلمنا مستندك ويراجعه فريق التوثيق. لا إجراء مطلوب منك الآن.",
    verified: "هويتك موثَّقة. أصبحت شهاداتك قابلة للتحقق ويمكنك التسجيل في البرامج المعتمدة.",
    needs_changes: "المستند غير مكتمل. أعد رفع صورة أوضح ولن تحتاج البدء من جديد — بياناتك محفوظة.",
    rejected: `تعذّر التحقق من المستند.${v.reviewerNote ? ` السبب المصنَّف: ${v.reviewerNote}` : ""}`,
  }[v.status];
  const meta = {
    pending: "متوقع خلال ٢٤ إلى ٤٨ ساعة عمل",
    verified: `اكتمل في ${formatDate(v.reviewedAt ?? v.submittedAt)}`,
    needs_changes: "لديك ٧ أيام لإعادة الرفع",
    rejected: "يمكنك تقديم طلب جديد أو التواصل مع الدعم",
  }[v.status];

  return (
    <>
      <section aria-labelledby="ver-status-title" className={`flex flex-col gap-5 rounded-22 border-[1.5px] px-5 py-6 sm:flex-row sm:items-center sm:gap-7 sm:px-[30px] sm:py-7 ${t.box}`}>
        <span className={`flex size-[68px] shrink-0 items-center justify-center rounded-full bg-bg-surface ${t.text}`}>
          <Glyph icon={t.icon} size={32} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className={`inline-flex items-center gap-1.5 rounded-full bg-bg-surface px-2.5 py-[5px] type-caption ${t.text}`}>
              <Glyph icon={t.icon} size={16} />
              {t.label}
            </span>
            <span dir="ltr" className="font-mono text-[14px] leading-normal text-text-secondary">
              {v.reference}
            </span>
          </div>
          <h2 id="ver-status-title" className="text-[30px] font-bold leading-[1.2] text-text-primary sm:text-[36px]">
            {t.title}
          </h2>
          <p className="type-body-lg text-text-secondary">{description}</p>
          <p className={`flex items-center gap-2 type-subtitle ${t.text}`}>
            <Glyph icon={Clock} size={16} />
            {meta}
          </p>
        </div>
      </section>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-6">
          <section aria-labelledby="ver-track-title" className="flex flex-col gap-4 rounded-16 border border-border-default bg-bg-card p-5 shadow-card sm:p-6">
            <h2 id="ver-track-title" className="type-h3 text-text-primary">
              مسار طلبك
            </h2>
            <ol className="flex flex-col gap-4">
              {steps.map((s) => (
                <Step key={s.title} {...s} activeClass={t.activeStep} />
              ))}
            </ol>
            <p className="type-caption text-text-muted">
              نوع المستند: {DOC_LABEL[v.documentType]}
              {v.last4 ? ` · ينتهي بـ ${v.last4}` : ""}
            </p>
          </section>

          {v.status === "verified" && (
            <section aria-labelledby="ver-unlocked-title" className="flex flex-col gap-4 rounded-16 border border-border-default bg-bg-card p-5 shadow-card sm:p-6">
              <h2 id="ver-unlocked-title" className="type-h3 text-text-primary">
                ماذا فُتح لك الآن؟
              </h2>
              {[
                { icon: Award, title: "شهادات قابلة للتحقق", caption: "كل شهادة تصدر لك لها رابط تحقق عام" },
                { icon: Landmark, title: "البرامج المعتمدة", caption: "يمكنك التسجيل في البرامج التي تشترط التوثيق" },
                { icon: CircleUser, title: "شارة في ملفك", caption: "«هوية موثَّقة» تظهر للجهات وفي ملفك العام" },
              ].map((r) => (
                <div key={r.title} className="flex items-center gap-3 rounded-12 bg-state-success-bg px-4 py-3.5">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-8 bg-bg-surface text-state-success">
                    <Glyph icon={r.icon} size={20} />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <p className="type-subtitle text-text-primary">{r.title}</p>
                    <p className="type-caption text-text-muted">{r.caption}</p>
                  </div>
                </div>
              ))}
              <ButtonLink href="/trainee/profile" size="l" fullWidth>
                اعرض ملفي المهني
              </ButtonLink>
            </section>
          )}

          {v.status === "needs_changes" && (
            <section aria-labelledby="ver-fix-title" className="flex flex-col gap-4 rounded-16 border border-border-default bg-bg-card p-5 shadow-card sm:p-6">
              <h2 id="ver-fix-title" className="type-h3 text-text-primary">
                ما الذي يحتاج تعديلًا؟
              </h2>
              <div className="flex items-start gap-3 rounded-12 bg-state-info-bg px-4 py-3.5">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-8 bg-bg-surface text-state-info">
                  <Glyph icon={CircleAlert} size={20} />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <p className="type-subtitle text-state-info">{v.reviewerNote ?? "الصورة غير واضحة"}</p>
                  <p className="type-body text-text-secondary">التقط الصورة على سطح مستوٍ بإضاءة جيدة مع ظهور الأركان الأربعة كاملة.</p>
                </div>
              </div>
              <ButtonLink href="/trainee/verification?new=1" size="l" fullWidth>
                أعد رفع المستند
              </ButtonLink>
              <p className="type-caption text-state-success">بياناتك محفوظة — لن تعيد الخطوات من البداية.</p>
            </section>
          )}

          {v.status === "rejected" && (
            <section aria-labelledby="ver-reject-title" className="flex flex-col gap-4 rounded-16 border border-border-default bg-bg-card p-5 shadow-card sm:p-6">
              <h2 id="ver-reject-title" className="type-h3 text-text-primary">
                سبب الرفض
              </h2>
              <div className="flex items-start gap-3 rounded-12 bg-state-error-bg px-4 py-3.5">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-8 bg-bg-surface text-state-error">
                  <Glyph icon={CircleX} size={20} />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <p className="type-subtitle text-state-error">{v.reviewerNote ?? "تعذّر التحقق من المستند"}</p>
                  <p className="type-body text-text-secondary">صحّح اسم حسابك أو ارفع مستندًا مطابقًا، ثم قدّم طلبًا جديدًا.</p>
                </div>
              </div>
              <ButtonLink href="/trainee/verification?new=1" size="l" fullWidth>
                قدّم طلبًا جديدًا
              </ButtonLink>
            </section>
          )}
        </div>

        <aside aria-label="أمان المستندات" className="flex min-w-0 flex-col gap-6">
          <DocumentsSafety />
          {reviewed && (
            <Link href="/trainee/help" className="self-center rounded-8 type-body-lg text-text-brand hover:underline focus-ring">
              تواصل مع الدعم
            </Link>
          )}
        </aside>
      </div>
    </>
  );
}
