import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Award, CircleCheck, Hourglass, Info, Lock, QrCode, TriangleAlert, User } from "lucide-react";
import { Avatar } from "@/components/ui/Data";
import { CertificateMiniPreview } from "@/components/certificates/CertificateCard";
import { kindLabelFor } from "@/lib/data/certificates";
import type { ManagedCourse } from "@/lib/data/trainer-course";
import type { CertTrainee, CertificatesView } from "@/lib/data/trainer-certificates";
import { pluralAr, toArabicDigits } from "@/lib/format";
import { ButtonLink } from "@/components/ui/Button";
import { MiniPill, OpsCard, OpsHero, RuleItem, RuleRow, SideCard, TagPill, type OpsTone } from "./parts";

/** The idle «إصدار شهادات الدورة» hero shown under the single / program panels (4254:*, 4256:*). */
export function StaticIssueHero({ v, courseId }: { v: CertificatesView; courseId: string }) {
  const left = v.pendingIssue.length;
  return (
    <OpsHero
      tone="success"
      icon={Award}
      chips={<IssueHeroChips v={v} />}
      title="إصدار شهادات الدورة"
      action={
        left > 0 ? (
          <ButtonLink href={`/trainer/courses/${courseId}/certificates/issue`} size="l" className="w-full sm:w-auto sm:min-w-[232px]">
            {left === v.eligible.length ? `أصدر ${pluralAr(left, ["شهادة واحدة", "شهادتين", "شهادات", "شهادة"])} دفعة واحدة` : `أصدر ${pluralAr(left, ["الشهادة المتبقية", "الشهادتين المتبقيتين", "شهادات متبقية", "شهادة متبقية"])}`}
          </ButtonLink>
        ) : undefined
      }
    >
      كل شهادة تُصدر برقم مرجعي ورابط تحقق عام دائم، وتظهر فورًا في ملف المتدرب.
      <br />
      الإصدار نهائي – السحب يتطلب طلبًا مسبّبًا للإدارة.
    </OpsHero>
  );
}

/* Shared blocks of TRR-CRT-01 (276:5358 and its states) and the certificates tab (438:20662). */

const n = toArabicDigits;
export const trainees = (c: number) => pluralAr(c, ["متدرب واحد", "متدربان", "متدربين", "متدربًا"]);
export const certs = (c: number) => pluralAr(c, ["شهادة واحدة", "شهادتان", "شهادات", "شهادة"]);

export function scoreLine(t: CertTrainee): string {
  const parts = [t.attendance === null ? null : `${n(t.attendance)}٪ حضور`, `${n(t.final)} درجة`];
  return parts.filter(Boolean).join(" · ");
}

/** «معاينة الشهادة» — the platform certificate card with the first eligible trainee's name. */
export function PreviewCard({ course, sampleName, caption, titleSize = "h3" }: { course: ManagedCourse; sampleName: string; caption?: string; titleSize?: "h2" | "h3" }) {
  return (
    <OpsCard title="معاينة الشهادة" titleId="preview-title" titleSize={titleSize} description={titleSize === "h2" ? "هذا شكل الشهادة التي ستصدر لكل ناجح – بختم المنصة ورابط تحقق دائم." : undefined}>
      <CertificateMiniPreview kindLabel={kindLabelFor(course.mode)} courseTitle={course.programTitle} issuerName={sampleName} />
      {caption && <p className="type-caption text-text-muted">{caption}</p>}
    </OpsCard>
  );
}

export function RuleList({ title, titleId, items, large }: { title: string; titleId: string; items: { icon: LucideIcon; tone?: OpsTone; text: string }[]; large?: boolean }) {
  // «عن الشهادة» of the certificates tab (438:20927) is a content card with 17px rows; the CRT-01 side lists are the small card.
  if (large)
    return (
      <OpsCard title={title} titleId={titleId}>
        <ul className="flex flex-col gap-5">
          {items.map((i) => (
            <RuleItem key={i.text} icon={i.icon} tone={i.tone}>
              {i.text}
            </RuleItem>
          ))}
        </ul>
      </OpsCard>
    );
  return (
    <SideCard title={title} titleId={titleId}>
      <ul className="flex flex-col gap-3">
        {items.map((i) => (
          <RuleRow key={i.text} icon={i.icon} tone={i.tone}>
            {i.text}
          </RuleRow>
        ))}
      </ul>
    </SideCard>
  );
}

export const VERIFY_RULES = [
  { icon: Hourglass, text: "رابط تحقق عام لكل شهادة" },
  { icon: QrCode, tone: "success" as const, text: "يعمل دون تسجيل دخول ولا ينتهي" },
  { icon: User, text: "تظهر فورًا في ملف المتدرب" },
  { icon: Lock, tone: "error" as const, text: "السحب يتطلب طلبًا مسبّبًا للإدارة" },
];

export function EligibleCard({ v, limit = 3, readyLabel = "جاهزة", hrefBase, moreHref }: { v: CertificatesView; limit?: number; readyLabel?: string; hrefBase?: string; moreHref?: string }) {
  const shown = v.eligible.slice(0, limit);
  const rest = v.eligible.length - shown.length;
  return (
    <OpsCard
      title="المستحقون للشهادة"
      titleId="eligible-title"
      aside={
        <MiniPill icon={CircleCheck} tone="success" onTint={false}>
          {trainees(v.eligible.length)}
        </MiniPill>
      }
    >
      {v.eligible.length === 0 ? (
        <p className="rounded-12 bg-bg-page px-4 py-5 text-center type-body text-text-muted">لا يوجد ناجحون في النتائج المعتمدة.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {shown.map((t) => (
            <li key={t.enrollmentId} className="flex items-center gap-3 rounded-12 bg-bg-page px-3.5 py-3.5">
              <Avatar name={t.name} size="m" />
              <div className="flex min-w-0 flex-1 flex-col">
                {hrefBase ? (
                  <Link href={`${hrefBase}/${t.enrollmentId}`} className="type-subtitle text-text-primary hover:text-text-brand focus-ring">
                    {t.name}
                  </Link>
                ) : (
                  <span className="type-subtitle text-text-primary">{t.name}</span>
                )}
                <span className="type-small text-text-muted">{scoreLine(t)}</span>
              </div>
              {t.certificate ? (
                <MiniPill icon={CircleCheck} tone="success" onTint={false}>
                  صادرة
                </MiniPill>
              ) : (
                <MiniPill icon={CircleCheck} tone="success" onTint={false}>
                  {readyLabel}
                </MiniPill>
              )}
            </li>
          ))}
        </ul>
      )}
      {rest > 0 &&
        (moreHref ? (
          <Link href={moreHref} scroll={false} className="type-caption text-text-muted hover:text-text-brand focus-ring">{`و${trainees(rest)} آخرين مستحقين – محددون جميعًا افتراضيًا.`}</Link>
        ) : (
          <p className="type-caption text-text-muted">{`و${trainees(rest)} آخرين مستحقين – محددون جميعًا افتراضيًا.`}</p>
        ))}
    </OpsCard>
  );
}

export function IneligibleCard({ v }: { v: CertificatesView }) {
  if (v.ineligible.length === 0) return null;
  return (
    <OpsCard tone="error" title={`غير مستحقين – ${trainees(v.ineligible.length)}`} titleId="ineligible-title" description="لا تُصدر لهم شهادة. يصلهم إشعار بالسبب وبخيار إعادة التسجيل في دورة قادمة.">
      <ul className="flex flex-col gap-3">
        {v.ineligible.map((t) => (
          <li key={t.enrollmentId} className="flex items-center gap-3 rounded-12 bg-bg-surface px-3.5 py-3.5">
            <Avatar name={t.name} size="m" />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="type-subtitle text-text-primary">{t.name}</span>
              <span className="type-small text-state-error">{t.reason}</span>
            </div>
          </li>
        ))}
      </ul>
    </OpsCard>
  );
}

/** «إصدار شهادات الدورة» hero of 276:5358. */
export function IssueHeroChips({ v }: { v: CertificatesView }) {
  return (
    <>
      <MiniPill icon={User} tone="brand">
        {`${pluralAr(v.eligible.length, ["مستحق واحد", "مستحقان", "مستحقين", "مستحقًا"])} · ${n(v.ineligible.length)} ${v.ineligible.length === 1 ? "غير مستحق" : "غير مستحقين"}`}
      </MiniPill>
      <MiniPill icon={CircleCheck} tone="success">
        النتائج معتمدة
      </MiniPill>
    </>
  );
}

export const BEFORE_ISSUE = (ineligible: CertificatesView["ineligible"], organizationName: string | null) => [
  { icon: CircleCheck, tone: "success" as const, text: "النتائج معتمدة – الشرط الأساسي" },
  { icon: Award, text: `الشهادة باسم ${organizationName ?? "المنصة"} واسمك` },
  ...(ineligible.length
    ? [{ icon: TriangleAlert, tone: "warning" as const, text: ineligible.length === 1 ? `مستثنى واحد: ${ineligible[0].reason}` : `${trainees(ineligible.length)} مستثنون – راجع الأسباب` }]
    : []),
  { icon: Info, text: "الإصدار نهائي ولا يُلغى" },
];

export function IssuedPill({ issued, failed }: { issued: number; failed: number }) {
  return (
    <TagPill icon={Award} tone="success">
      {`${n(issued)} صادرة · ${n(failed)} فشلت`}
    </TagPill>
  );
}


/** Body of 276:5358 under the hero: eligible / ineligible on the start side, preview / verification on the end side. */
export function IssueBody({ v, course, all }: { v: CertificatesView; course: ManagedCourse; all?: boolean }) {
  const base = `/trainer/courses/${course.id}/certificates/issue`;
  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <EligibleCard v={v} limit={all ? 500 : 3} hrefBase={base} moreHref={`${base}?all=1#eligible-title`} />
        <IneligibleCard v={v} />
      </div>
      <div className="flex w-full shrink-0 flex-col gap-5 lg:w-[380px]">
        <PreviewCard course={course} sampleName={v.eligible[0]?.name ?? course.trainerName} caption="التصميم موحّد للمنصة. اسمك كمدرب واسم الجهة يظهران تلقائيًا." />
        <RuleList title="التحقق" titleId="verify-title" items={VERIFY_RULES} />
      </div>
    </div>
  );
}

