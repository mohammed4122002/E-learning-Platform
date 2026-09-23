import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  CalendarDays,
  CircleAlert,
  CircleCheck,
  CircleDot,
  Clock,
  ClipboardCheck,
  Hourglass,
  ListChecks,
  Lock,
  MonitorPlay,
  RefreshCw,
  Target,
  Trophy,
} from "lucide-react";
import { Breadcrumb } from "@/components/ui/Navigation";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Glyph } from "@/components/ui/Icon";
import { IconPill, IconRow, Notice, StatusHero, StepRow } from "@/components/ui/InfoBlocks";
import { PageHeading, SectionCard } from "@/components/ui/PageHeading";
import { formatClock, formatDate, formatSessionTime, pluralAr, toArabicDigits } from "@/lib/format";
import type { CertificateCondition, CertificateDetail, PendingCertificate, PlatformCertificate, RemainingLesson } from "@/lib/data/certificates";
import { CertificatePreview } from "./CertificatePreview";
import { CertificateMiniPreview } from "./CertificateCard";
import { CopyLinkButton } from "./CopyLinkButton";
import { conditionCopy } from "./conditions";
import { ProgressRing } from "./ProgressRing";

function conditionsWord(n: number) {
  if (n === 1) return "الشرط";
  if (n === 2) return "الشرطين";
  return `الشروط ${["", "", "", "الثلاثة", "الأربعة", "الخمسة"][n] ?? ""}`.trim();
}

const trainingHref = (enrollmentId: string) => `/trainee/trainings/${enrollmentId}`;

function linkedInShare(url: string) {
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
}
function linkedInAddToProfile(c: PlatformCertificate) {
  const d = new Date(c.issuedAt);
  const q = new URLSearchParams({
    startTask: "CERTIFICATION_NAME",
    name: `${c.kindLabel} — ${c.courseTitle}`,
    organizationName: c.issuerName,
    issueYear: String(d.getUTCFullYear()),
    issueMonth: String(d.getUTCMonth() + 1),
    certUrl: c.verifyUrl,
    certId: c.code,
  });
  return `https://www.linkedin.com/profile/add?${q.toString()}`;
}

function displayUrl(url: string) {
  return url.replace(/^https?:\/\//, "");
}

/* ─────────────────────────── Issued / revoked (205:11511 · 4136:1405) ─────────────────────────── */

export function IssuedCertificateView({ detail }: { detail: Extract<CertificateDetail, { kind: "issued" | "revoked" }> }) {
  const c = detail.certificate;
  const revoked = detail.kind === "revoked";
  return (
    <>
      {revoked && (
        <Notice tone="error" title="الشهادة مسحوبة">
          <p>{c.revokeReason ?? "سُحبت هذه الشهادة بعد قبول طلب استرداد استثنائي وفق القاعدة المعتمدة."}</p>
          <p>لم تعد صالحة للتحقق العام، ولا يمكن تنزيلها أو مشاركتها.</p>
          <p>رابط التحقق العام يعرض «مسحوبة» ولا يُحذف.</p>
          <p>
            أرسلنا تفاصيل القرار إلى بريدك الإلكتروني. يمكنك{" "}
            <Link href="/trainee/help" className="text-text-brand underline-offset-4 hover:underline">
              التواصل مع الدعم
            </Link>{" "}
            إذا أردت تقديم اعتراض.
          </p>
        </Notice>
      )}
      <Breadcrumb items={[{ label: "الشهادات", href: "/trainee/certificates" }, { label: c.courseTitle }]} />
      {revoked ? (
        <StatusHero tone="error" icon={Trophy} title="الشهادة مسحوبة — غير صالحة للتحقق" titleTone="error">
          سُحبت هذه الشهادة{c.revokedAt ? ` في ${formatDate(c.revokedAt)}` : ""} بقرار استرداد استثنائي. رابط التحقق يعرض حالتها «مسحوبة».
        </StatusHero>
      ) : (
        <StatusHero tone="success" icon={Trophy} title="مبروك — شهادتك صادرة وجاهزة">
          استوفيت كل متطلبات البرنامج. الشهادة موثّقة برقم مرجعي ورابط تحقق عام يعمل دون تسجيل دخول، وأُضيفت تلقائيًا إلى ملف تدريبك.
        </StatusHero>
      )}

      <div className="flex w-full flex-col items-start gap-6 lg:flex-row">
        <div className="flex w-full min-w-0 flex-1 flex-col gap-6">
          <CertificatePreview
            variant={revoked ? "revoked" : "issued"}
            face={{
              kindLabel: c.kindLabel,
              courseTitle: c.courseTitle,
              traineeName: c.traineeName,
              organizationName: c.organizationName,
              trainerName: c.trainerName,
              hours: c.hours,
              code: c.code,
              completedAt: c.issuedAt,
            }}
          />
          {detail.conditions.length > 0 && (
            <SectionCard title="الشروط المستوفاة" titleId="conditions-title">
              <ul className="flex flex-col gap-4">
                {detail.conditions.map((cond) => {
                  const copy = conditionCopy({ ...cond, met: true });
                  return <StepRow key={cond.key} state="done" title={copy.title} description={copy.detail} />;
                })}
              </ul>
            </SectionCard>
          )}
        </div>

        <aside aria-label="إجراءات الشهادة" className="flex w-full shrink-0 flex-col gap-5 lg:w-[380px]">
          <SectionCard title="إجراءات" titleId="actions-title">
            {revoked ? (
              <>
                <Button size="l" fullWidth disabled>
                  نزّل الشهادة PDF
                </Button>
                <Button size="l" variant="outline" fullWidth disabled>
                  نسخ رابط التحقق
                </Button>
                <Button size="l" variant="outline" fullWidth disabled>
                  مشاركة على لينكدإن
                </Button>
                <Button size="l" variant="text" fullWidth disabled>
                  أضفها لملفك المهني
                </Button>
                <p className="type-caption text-text-muted">التنزيل والمشاركة معطَّلان لأن الشهادة مسحوبة.</p>
              </>
            ) : (
              <>
                <ButtonLink href={`/trainee/certificates/${c.id}/print`} size="l" fullWidth target="_blank" rel="noopener">
                  نزّل الشهادة PDF
                </ButtonLink>
                <CopyLinkButton as="button" text={c.verifyUrl} />
                <a
                  href={linkedInShare(c.verifyUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-12 px-8 type-body-lg text-text-primary inner-stroke istroke-w-[1.5px] istroke-c-border-default hover:bg-bg-brand-tint focus-ring"
                >
                  مشاركة على لينكدإن
                  <span className="sr-only"> (يفتح في نافذة جديدة)</span>
                </a>
                <a
                  href={linkedInAddToProfile(c)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-14 w-full items-center justify-center rounded-12 px-8 type-body-lg text-text-brand hover:underline underline-offset-4 focus-ring"
                >
                  أضفها لملفك المهني
                  <span className="sr-only"> (لينكدإن — يفتح في نافذة جديدة)</span>
                </a>
              </>
            )}
          </SectionCard>

          <SectionCard title="التحقق" titleId="verify-title">
            <div className="flex w-full flex-col gap-1.5 rounded-12 bg-bg-page px-3.5 py-3">
              <span className="type-caption text-text-muted">رابط التحقق العام</span>
              <Link href={c.verifyPath} dir="ltr" className="truncate text-end font-mono text-[14px] leading-[1.5] text-text-brand hover:underline focus-ring">
                {displayUrl(c.verifyUrl)}
              </Link>
            </div>
            <p className="type-caption text-text-secondary">
              {revoked
                ? "يعرض الرابط حالة الشهادة «مسحوبة» لأي جهة تفتحه، ولا يُحذف."
                : "أي جهة توظيف تستطيع فتح الرابط والتأكد من صحة الشهادة دون حساب. الرابط دائم ولا ينتهي."}
            </p>
          </SectionCard>

          {!revoked && !detail.rated && detail.courseRatingOpen && (
            <SectionCard title="الخطوة الأخيرة" titleId="last-step-title">
              <p className="type-body text-text-secondary">لم تقيّم الدورة بعد. تقييمك يساعد متدربين آخرين على الاختيار، ويُرسل مرة واحدة فقط.</p>
              <ButtonLink href={`/trainee/ratings/new?enrollment=${c.enrollmentId}`} variant="accent" size="l" fullWidth>
                قيّم الدورة الآن
              </ButtonLink>
            </SectionCard>
          )}
        </aside>
      </div>
    </>
  );
}

/* ───────────────────────── Pending — sessions-based course (205:11723) ───────────────────────── */

function nextStepCta(next: CertificateCondition | undefined): string {
  switch (next?.key) {
    case "quizzes":
      return "ابدأ الاختبار";
    case "assignments":
      return "سلّم الواجب";
    case "attendance":
      return "اعرض الجلسات القادمة";
    case "lessons":
      return "أكمل الدروس";
    default:
      return "افتح الدورة";
  }
}

function NextStepRows({ next }: { next: CertificateCondition }) {
  const rows: { icon: LucideIcon; title: string; description: string }[] = [];
  if (next.key === "quizzes") {
    const q = (next.info.next ?? {}) as { title?: string; question_count?: number; time_limit_minutes?: number | null; pass_percent?: number; attempts?: number };
    if (q.question_count) rows.push({ icon: ListChecks, title: pluralAr(q.question_count, ["سؤال واحد", "سؤالان", "أسئلة", "سؤالًا"]), description: q.title ?? "اختيار من متعدد" });
    rows.push({ icon: Clock, title: q.time_limit_minutes ? `${toArabicDigits(q.time_limit_minutes)} دقيقة` : "بلا حد زمني", description: q.time_limit_minutes ? "المؤقت لا يتوقف عند الخروج" : "أجب بإيقاعك" });
    if (q.pass_percent !== undefined) {
      rows.push({
        icon: Target,
        title: `النجاح ${toArabicDigits(q.pass_percent)}٪`,
        description: q.question_count ? `${toArabicDigits(Math.ceil((q.question_count * q.pass_percent) / 100))} إجابة صحيحة على الأقل` : "من مجموع الدرجات",
      });
    }
    rows.push({ icon: RefreshCw, title: q.attempts ? `${pluralAr(q.attempts, ["محاولة واحدة", "محاولتان", "محاولات", "محاولة"])} حتى الآن` : "لم تبدأ بعد", description: "يمكنك الإعادة إن لم تجتز" });
  } else if (next.key === "attendance") {
    const required = typeof next.info.required === "number" ? next.info.required : next.total;
    const nextAt = typeof next.info.next_session_at === "string" ? next.info.next_session_at : null;
    rows.push({ icon: CalendarDays, title: `${toArabicDigits(next.done)} من ${toArabicDigits(next.total)} جلسة`, description: "حضورك المسجّل حتى الآن" });
    rows.push({ icon: Target, title: `المطلوب ${toArabicDigits(required)} جلسات`, description: "٨٠٪ من الجلسات المجدولة" });
    if (nextAt) rows.push({ icon: Clock, title: "الجلسة القادمة", description: formatSessionTime(nextAt) });
  } else if (next.key === "assignments") {
    rows.push({ icon: ClipboardCheck, title: `قُبل ${toArabicDigits(next.done)} من ${toArabicDigits(next.total)}`, description: "يُقبل الواجب بعد مراجعة المدرب" });
    rows.push({ icon: RefreshCw, title: "يمكنك إعادة التسليم", description: "إن طُلب منك تعديل الواجب" });
  } else {
    rows.push({ icon: MonitorPlay, title: `${toArabicDigits(next.total - next.done)} دروس متبقية`, description: "كل درس يُحتسب عند مشاهدة ٩٠٪ منه" });
  }
  return (
    <ul className="flex flex-col gap-4">
      {rows.map((r) => (
        <IconRow key={r.title} icon={r.icon} title={r.title} description={r.description} />
      ))}
    </ul>
  );
}

function LockNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex w-full items-center gap-2.5 rounded-12 bg-bg-page px-3.5 py-3 type-body text-text-secondary">
      <Glyph icon={Lock} size={20} className="text-text-muted" />
      <span className="min-w-0 flex-1">{children}</span>
    </p>
  );
}

function previewFace(p: PendingCertificate, traineeName: string) {
  return {
    kindLabel: p.kindLabel,
    courseTitle: p.courseTitle,
    traineeName,
    organizationName: p.organizationName,
    trainerName: p.trainerName,
    hours: p.hours,
    code: null,
    completedAt: null,
  };
}

export function PendingCertificateView({ detail }: { detail: Extract<CertificateDetail, { kind: "pending" }> }) {
  const p = detail.pending;
  if (p.courseMode === "recorded") return <RecordedPendingView detail={detail} />;
  const unmet = p.conditions.filter((c) => !c.met);
  const next = unmet[0];
  const allMet = unmet.length === 0;
  const cta = nextStepCta(next);
  return (
    <>
      <Breadcrumb items={[{ label: "الشهادات", href: "/trainee/certificates" }, { label: p.courseTitle }]} />
      <StatusHero
        tone={allMet ? "info" : "warning"}
        lead={<ProgressRing percent={allMet ? 100 : p.percent} label="نسبة استيفاء شروط الشهادة" />}
        title={
          allMet
            ? "استوفيت كل الشروط — شهادتك قيد الإصدار"
            : unmet.length === 1
              ? "شهادتك جاهزة تقريبًا — يتبقى شرط واحد"
              : `شهادتك قيد الإنجاز — ${pluralAr(unmet.length, ["شرط واحد", "شرطان متبقيان", "شروط متبقية", "شرطًا متبقيًا"])}`
        }
        footer={
          !allMet && (
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <ButtonLink href={trainingHref(p.enrollmentId)} size="l">
                {cta}
              </ButtonLink>
              <ButtonLink href={trainingHref(p.enrollmentId)} size="l" variant="text">
                راجع الدورة أولًا
              </ButtonLink>
            </div>
          )
        }
      >
        {allMet
          ? "أنجزت كل متطلبات البرنامج. تصدر الشهادة باسم الجهة فور إغلاق الدورة — يصلك إشعار عند إصدارها."
          : `${p.metCount ? `أنجزت ${toArabicDigits(p.metCount)} من ${toArabicDigits(p.conditions.length)} شروط.` : `لم تستوفِ أي شرط بعد — أنجزت ${toArabicDigits(p.percent)}٪ من المتطلبات.`} يتبقى ${next ? conditionCopy(next).title : ""} وستصدر شهادتك تلقائيًا — بلا طلب ولا انتظار موافقة.`}
      </StatusHero>

      <div className="flex w-full flex-col items-start gap-6 lg:flex-row">
        <div className="flex w-full min-w-0 flex-1 flex-col gap-6">
          <SectionCard title="شروط إصدار الشهادة" titleId="conditions-title">
            <p className="type-caption text-text-muted">
              تُصدر الشهادة آليًا فور استيفاء {conditionsWord(p.conditions.length)}. لا حاجة لتقديم طلب.
            </p>
            <ul className="flex flex-col gap-4">
              {p.conditions.map((cond) => {
                const copy = conditionCopy(cond);
                return <StepRow key={cond.key} state={cond.met ? "done" : "alert"} title={copy.title} description={copy.detail} />;
              })}
            </ul>
          </SectionCard>
          <CertificatePreview variant="preview" face={previewFace(p, detail.traineeName)} />
          <LockNote>
            هذه معاينة فقط — تُفعَّل الشهادة ويصبح رابط التحقق فعّالًا {allMet ? "فور إصدارها" : `بعد ${next ? conditionCopy(next).title : "استيفاء الشروط"}`}.
          </LockNote>
        </div>
        <aside aria-label="الخطوة التالية" className="flex w-full shrink-0 flex-col gap-5 lg:w-[380px]">
          {next ? (
            <>
              <SectionCard title="ما الذي يفصلك عن الشهادة؟" titleId="next-title">
                <NextStepRows next={next} />
              </SectionCard>
              <ButtonLink href={trainingHref(p.enrollmentId)} size="l" fullWidth>
                {cta}
              </ButtonLink>
            </>
          ) : (
            <SectionCard title="ما التالي؟" titleId="next-title">
              <p className="type-body text-text-secondary">لا إجراء مطلوب منك. سنرسل لك إشعارًا فور إصدار الشهادة.</p>
              <ButtonLink href="/trainee/certificates" variant="outline" size="l" fullWidth>
                عد إلى شهاداتي
              </ButtonLink>
            </SectionCard>
          )}
        </aside>
      </div>
    </>
  );
}

/* ───────────────────────── Pending — recorded course (409:16323) ───────────────────────── */

const CONDITION_NOTES: Record<CertificateCondition["key"], string> = {
  lessons: "كل درس يُحتسب مكتملًا عند مشاهدة ٩٠٪ من مدته — لا حاجة لمشاهدة الثواني الأخيرة.",
  quizzes: "اختبارات الوحدات القصيرة داخل الدروس — نتيجتها تظهر فورًا ويمكنك إعادة المحاولة.",
  assignments: "يُقبل الواجب بعد مراجعة المدرب، ويمكنك إعادة التسليم إن طُلب تعديل.",
  attendance: "سجّل حضورك في كل جلسة عبر رمز الحضور.",
};

function RecordedConditionCard({ c }: { c: CertificateCondition }) {
  const copy = conditionCopy(c);
  return (
    <li className="flex w-full flex-col gap-2.5 rounded-16 bg-bg-surface px-5 pt-[18px] pb-5">
      <div className="flex w-full flex-wrap items-center gap-3.5">
        <span className={`flex size-12 shrink-0 items-center justify-center rounded-12 ${c.met ? "bg-state-success-bg text-state-success" : "bg-state-warning-bg text-state-warning"}`}>
          <Glyph icon={c.met ? CircleCheck : copy.icon} size={20} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="type-title text-text-primary">{copy.title}</p>
          <p className={`type-body ${c.met ? "text-state-success" : "text-state-warning"}`}>{copy.detail}</p>
        </div>
        {c.met ? (
          <IconPill icon={CircleCheck} tone="success">
            مستوفى
          </IconPill>
        ) : (
          <IconPill icon={Clock} tone="warning">
            يتبقى
          </IconPill>
        )}
      </div>
      <p className="type-body text-text-muted">{CONDITION_NOTES[c.key]}</p>
    </li>
  );
}

function RecordedPendingView({ detail }: { detail: Extract<CertificateDetail, { kind: "pending" }> }) {
  const p = detail.pending;
  const lessons = p.conditions.find((c) => c.key === "lessons");
  const n = p.conditions.length;
  return (
    <>
      <Breadcrumb items={[{ label: "شهاداتي", href: "/trainee/certificates" }, { label: p.courseTitle }]} />
      <PageHeading title="شهادة بانتظار الإكمال" description="دورة مسجَّلة — شرط الشهادة هو مشاهدة المحتوى كاملًا." />
      <div className="flex w-full flex-col items-start gap-[26px] lg:flex-row">
        <div className="flex w-full min-w-0 flex-1 flex-col gap-[26px]">
          <section aria-labelledby="conditions-title" className="flex w-full flex-col gap-[18px] rounded-22 border-2 border-state-warning bg-state-warning-bg px-5 pt-[26px] pb-7 sm:px-7">
            <div className="flex w-full items-center gap-3.5">
              <span className="flex size-[52px] shrink-0 items-center justify-center rounded-16 bg-bg-surface text-state-warning">
                <Glyph icon={CircleAlert} size={20} />
              </span>
              <h2 id="conditions-title" className="min-w-0 flex-1 type-h2 text-state-warning">
                {n === 1 ? "شرط واحد لإصدار شهادتك" : n === 2 ? "شرطان لإصدار شهادتك" : `${toArabicDigits(n)} شروط لإصدار شهادتك`}
              </h2>
            </div>
            <ul className="flex flex-col gap-[18px]">
              {p.conditions.map((c) => (
                <RecordedConditionCard key={c.key} c={c} />
              ))}
            </ul>
            <p className="flex w-full items-start gap-3 rounded-16 bg-bg-surface px-[18px] pt-[15px] pb-4 type-body-lg text-state-warning">
              <Glyph icon={CircleCheck} size={20} className="mt-1.5" />
              <span className="min-w-0 flex-1">تُصدر الشهادة آليًا فور استيفاء {conditionsWord(n)} — لا حاجة لتقديم طلب.</span>
            </p>
          </section>

          <section aria-labelledby="preview-title" className="flex w-full flex-col gap-5 rounded-22 border border-border-default bg-bg-card p-5 shadow-card sm:p-7">
            <h2 id="preview-title" className="type-h2 text-text-primary">
              معاينة شهادتك
            </h2>
            <CertificateMiniPreview kindLabel={p.kindLabel} courseTitle={p.courseTitle} issuerName={p.issuerName} />
            <p className="type-body text-text-muted">هذه معاينة فقط — يُفعَّل رابط التحقق بعد إكمال الدورة.</p>
          </section>
        </div>

        <aside aria-label="تقدّمك" className="flex w-full shrink-0 flex-col gap-[22px] lg:w-[420px]">
          <section aria-labelledby="progress-title" className="flex w-full flex-col items-center gap-[18px] rounded-22 border border-border-default bg-bg-card px-[26px] pt-[26px] pb-7 drop-shadow-milestone">
            <ProgressRing percent={lessons ? (lessons.done / Math.max(1, lessons.total)) * 100 : p.percent} label="تقدّمك في الدورة" />
            <h2 id="progress-title" className="type-h3 text-text-primary">
              تقدّمك في الدورة
            </h2>
            {lessons && (
              <p className="type-body-lg text-text-secondary">
                {toArabicDigits(lessons.done)} من {toArabicDigits(lessons.total)} {lessons.total > 10 ? "درسًا" : "دروس"}
              </p>
            )}
            <ul className="flex w-full flex-col gap-2.5">
              {p.conditions.map((c) => (
                <li key={c.key} className="flex w-full items-center gap-2.5 rounded-12 bg-bg-page px-3.5 pt-3 pb-[13px]">
                  <Glyph icon={c.met ? CircleCheck : Hourglass} size={20} className={c.met ? "text-state-success" : "text-text-muted"} />
                  <span className={`min-w-0 flex-1 type-body ${c.met ? "text-text-primary" : "text-text-muted"}`}>
                    {c.key === "lessons" ? "مشاهدة كل الدروس" : c.key === "quizzes" ? "اجتياز الاختبارات" : conditionCopy(c).title}
                  </span>
                  <span className="sr-only">{c.met ? "مستوفى" : "لم يُستوفَ بعد"}</span>
                </li>
              ))}
            </ul>
            <ButtonLink href={trainingHref(p.enrollmentId)} variant="outline" size="l" fullWidth>
              استمر بالتعلّم
            </ButtonLink>
            <p className="text-center type-caption text-text-muted">الشهادة تصدر بعد مشاهدة ١٠٠٪ من الدروس.</p>
          </section>

          {detail.remainingLessons.length > 0 && (
            <section aria-labelledby="remaining-title" className="flex w-full flex-col gap-5 rounded-22 border border-border-default bg-bg-card p-7 shadow-card">
              <h2 id="remaining-title" className="type-h3 text-text-primary">
                الدروس المتبقية
              </h2>
              <ul className="flex flex-col gap-5">
                {detail.remainingLessons.slice(0, 6).map((l) => (
                  <RemainingLessonRow key={l.id} lesson={l} />
                ))}
              </ul>
              {detail.remainingLessons.length > 6 && (
                <p className="type-caption text-text-muted">و{pluralAr(detail.remainingLessons.length - 6, ["درس آخر", "درسان آخران", "دروس أخرى", "درسًا آخر"])}</p>
              )}
              <ButtonLink href={trainingHref(p.enrollmentId)} size="l" fullWidth>
                أكمل الدروس المتبقية
              </ButtonLink>
            </section>
          )}
        </aside>
      </div>
    </>
  );
}

function RemainingLessonRow({ lesson }: { lesson: RemainingLesson }) {
  return (
    <li className="flex w-full items-center gap-3 rounded-12 bg-bg-page px-3.5 py-[13px]">
      <Glyph icon={CircleDot} size={20} className="text-text-muted" />
      <span className="min-w-0 flex-1 type-body text-text-primary">{lesson.title}</span>
      {lesson.durationSeconds > 0 && <span className="shrink-0 font-mono text-[14px] leading-[1.5] text-text-muted">{formatClock(lesson.durationSeconds)}</span>}
    </li>
  );
}
