import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  BadgeCheck,
  BellRing,
  CalendarDays,
  CircleAlert,
  CircleCheck,
  CircleX,
  Clock,
  Copy,
  FileText,
  Hourglass,
  Lock,
  OctagonX,
  PencilLine,
  SquarePen,
  Users,
} from "lucide-react";
import { PageBody, TopBar } from "@/components/layout/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { Alert, EmptyState } from "@/components/ui/Feedback";
import { Glyph } from "@/components/ui/Icon";
import { Breadcrumb } from "@/components/ui/Navigation";
import { requireTrainer } from "@/lib/auth";
import { getTrainerProgram } from "@/lib/data/trainer-programs";
import { formatDayMonth, formatTime, pluralAr, toArabicDigits } from "@/lib/format";
import { FINDING_FIELDS, REVIEW_SLA_DAYS, businessDaysWord, fixDaysLeft, reviewDaysLeft, shortHash, versionLabel } from "@/lib/trainer-programs";

export const metadata: Metadata = { title: "حالة طلب النشر" };

const timeFmt = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-arab", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true, timeZone: "Asia/Riyadh" });

type Tone = "warning" | "success" | "error";
const HERO: Record<Tone, { box: string; text: string }> = {
  warning: { box: "border-state-warning bg-state-warning-bg", text: "text-state-warning" },
  success: { box: "border-state-success bg-state-success-bg", text: "text-state-success" },
  error: { box: "border-state-error bg-state-error-bg", text: "text-state-error" },
};

function Card({ title, children, tone, badge }: { title: string; children: React.ReactNode; tone?: "error"; badge?: React.ReactNode }) {
  return (
    <section className={`flex w-full flex-col gap-4 rounded-16 p-5 sm:p-6 ${tone === "error" ? "border-2 border-state-error bg-state-error-bg" : "border border-border-default bg-bg-card shadow-card"}`}>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className={`min-w-0 type-h3 ${badge ? "" : "flex-1"} ${tone === "error" ? "text-state-error" : "text-text-primary"}`}>{title}</h2>
        {badge}
      </div>
      {children}
    </section>
  );
}

function Step({ icon, title, sub, state }: { icon: LucideIcon; title: string; sub: string; state: "done" | "current" | "todo" | "success" | "error" | "waiting" }) {
  const box =
    state === "current" || state === "waiting"
      ? "border-[1.5px] border-state-warning bg-state-warning-bg"
      : state === "success"
        ? "border-[1.5px] border-state-success bg-state-success-bg"
        : state === "error"
          ? "border-[1.5px] border-state-error bg-state-error-bg"
          : "bg-bg-page";
  const ic = state === "todo" ? "text-text-muted" : state === "error" ? "text-state-error" : state === "current" || state === "waiting" ? "text-state-warning" : "text-state-success";
  return (
    <li className={`flex items-start gap-3 rounded-12 px-3.5 py-[13px] ${box}`}>
      <span className={`flex size-10 shrink-0 items-center justify-center rounded-full bg-bg-surface ${ic}`}>
        <Glyph icon={icon} size={20} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <span className={`text-[16px] leading-[1.5] ${state === "todo" ? "text-text-muted" : "text-text-primary"}`}>{title}</span>
        <span className={`type-caption ${state === "waiting" ? "text-state-warning" : "text-text-muted"}`}>{sub}</span>
      </span>
    </li>
  );
}

function Row({ icon, title, sub, tone = "text-text-brand", children }: { icon: LucideIcon; title: string; sub: string; tone?: string; children?: React.ReactNode }) {
  return (
    <li className="flex flex-wrap items-center gap-3 rounded-12 bg-bg-page px-3.5 py-[13px]">
      <span className={`flex size-10 shrink-0 items-center justify-center rounded-8 bg-bg-surface ${tone}`}>
        <Glyph icon={icon} size={20} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[16px] leading-[1.5] text-text-primary">{title}</span>
        <span className="type-caption text-text-muted">{sub}</span>
      </span>
      {children}
    </li>
  );
}

/** TRR-PRG-05 · حالة طلب النشر — under review 270:3296 · approved 270:3540 · approved-not-published 4223:2 · needs changes 270:3796 · rejected 270:4040. */
export default async function ReviewStatusPage({ params, searchParams }: PageProps<"/trainer/programs/[id]/review">) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requireTrainer(`/trainer/programs/${id}/review`);
  const p = await getTrainerProgram(id, user.id);
  if (!p) notFound();
  const r = p.request;
  const decl = r ? (p.declarations.find((d) => d.id === r.declarationId) ?? null) : null;

  const shell = (children: React.ReactNode) => (
    <>
      <TopBar title="حالة طلب النشر" subtitle={p.title} />
      <PageBody className="!gap-6">
        <Breadcrumb items={[{ label: "برامجي", href: "/trainer/programs" }, { label: p.title, href: `/trainer/programs/${p.id}` }, { label: "حالة الطلب" }]} />
        {children}
      </PageBody>
    </>
  );

  if (!r || r.status === "withdrawn") {
    return shell(
      <EmptyState
        icon={FileText}
        title="لم يُرسل البرنامج للمراجعة بعد"
        description={sp.withdrawn === "1" ? "سُحب الطلب وعاد البرنامج مسودة قابلة للتعديل. عدّل ما تشاء ثم أعد الإرسال." : "عاين البرنامج كما يراه المتدرب، ثم أقرّ وأرسله للمراجعة."}
        action={
          <>
            <ButtonLink href={`/trainer/programs/${p.id}/preview`}>عاين وأرسل</ButtonLink>
            <ButtonLink href={`/trainer/programs/${p.id}/edit/basics`} variant="outline">
              افتح المحرّر
            </ButtonLink>
          </>
        }
      />,
    );
  }

  const approved = r.status === "approved";
  const live = approved && p.courses.published > 0;
  const tone: Tone = r.status === "under_review" || (approved && !live) ? "warning" : approved ? "success" : "error";
  const version = versionLabel(r.revision);
  const submitted = `${formatDayMonth(r.submittedAt)} · ${formatTime(r.submittedAt)} · ${version}`;
  const decidedDay = r.decidedAt ? formatDayMonth(r.decidedAt) : "";
  const daysLeft = reviewDaysLeft(r.submittedAt);
  /** Figma 270:4040's remedies are written for an unverified accreditation claim; other reasons get generic ones. */
  const accreditationClaim = /اعتماد/.test(r.reason ?? "");

  const hero = {
    under_review: {
      icon: Hourglass,
      pill: { icon: Hourglass, label: "قيد المراجعة" },
      title: "قيد المراجعة",
      body: "استلمنا برنامجك ويراجعه فريق المنصة. لا إجراء مطلوب منك الآن.",
      timing: daysLeft > 0 ? `متبقٍ ${businessDaysWord(daysLeft)} من أصل ${toArabicDigits(REVIEW_SLA_DAYS)}` : "تجاوزت المراجعة المدة المتوقعة — يصدر القرار قريبًا",
      actions: (
        <ButtonLink href={`/trainer/programs/${p.id}/withdraw`} variant="outline" size="l">
          اسحب الطلب للتعديل
        </ButtonLink>
      ),
    },
    approved: {
      icon: CircleCheck,
      pill: { icon: CircleCheck, label: live ? "مقبول ومنشور" : "معتمد · غير منشور" },
      title: live ? "مقبول ومنشور" : "معتمد · غير منشور",
      body: live ? "اعتُمد برنامجك ونُشر. أصبح ظاهرًا للمتدربين ويمكنك إنشاء دورات مجدولة منه." : "تم اعتماد برنامجك — لم يُنشر بعد لعدم وجود دورة منشورة. انشر دورة واحدة على الأقل ليظهر البرنامج تلقائيًا للمتدربين.",
      timing: r.decidedAt ? (live ? `نُشر ${formatDayMonth(r.decidedAt)} · ${formatTime(r.decidedAt)}` : `اعتُمد ${formatDayMonth(r.decidedAt)} · ${formatTime(r.decidedAt)} — بانتظار أول دورة منشورة`) : "",
      actions: (
        <>
          <ButtonLink href={`/trainer/courses/new?program=${p.id}`} size="l">
            أنشئ أول دورة من هذا البرنامج
          </ButtonLink>
          <ButtonLink href={`/trainer/programs/${p.id}/visibility`} variant="outline" size="l" disabled={!live}>
            اعرض صفحة البرنامج
          </ButtonLink>
        </>
      ),
    },
    needs_changes: {
      icon: CircleAlert,
      pill: { icon: CircleAlert, label: "يحتاج تعديل" },
      title: "يحتاج تعديل",
      body: `${r.findings.length === 2 ? "حقلان يحتاجان" : r.findings.length === 1 ? "حقل واحد يحتاج" : `${toArabicDigits(r.findings.length)} حقول تحتاج`} تعديلك. بقية البرنامج معتمد ولا يحتاج تغييرًا.`,
      timing: r.decidedAt ? `لديك ${pluralAr(fixDaysLeft(r.decidedAt), ["يوم واحد", "يومان", "أيام", "يومًا"])} قبل أرشفة الطلب` : "",
      actions: (
        <ButtonLink href={`/trainer/programs/${p.id}/edit/${FINDING_FIELDS[r.findings[0]?.field ?? ""]?.step ?? "basics"}`} size="l">
          افتح المحرّر على الحقل الأول
        </ButtonLink>
      ),
    },
    rejected: {
      icon: OctagonX,
      pill: { icon: CircleX, label: "مرفوض" },
      title: "مرفوض",
      body: "تعذّر اعتماد البرنامج بصيغته الحالية. يمكنك إنشاء نسخة جديدة تعالج السبب.",
      timing: "قرار نهائي لهذه النسخة",
      actions: (
        <>
          <ButtonLink href={`/trainer/programs/${p.id}/new-version`} size="l">
            أنشئ نسخة جديدة
          </ButtonLink>
          <ButtonLink href="/help" variant="outline" size="l">
            تظلّم على القرار
          </ButtonLink>
        </>
      ),
    },
  }[r.status as "under_review" | "approved" | "needs_changes" | "rejected"];

  const decisionStep =
    r.status === "under_review" ? (
      <Step icon={BadgeCheck} title="القرار" sub={daysLeft > 0 ? `يصدر خلال ${businessDaysWord(daysLeft)}` : "يصدر قريبًا"} state="todo" />
    ) : r.status === "approved" ? (
      <Step icon={BadgeCheck} title="القرار" sub={`اعتُمد · ${decidedDay} · ${r.decidedAt ? formatTime(r.decidedAt) : ""}`} state="done" />
    ) : r.status === "needs_changes" ? (
      <Step icon={CircleAlert} title="القرار" sub={`رُدّ لتعديل · ${decidedDay}`} state="error" />
    ) : (
      <Step icon={CircleX} title="القرار" sub={`رُفض · ${decidedDay}`} state="error" />
    );
  const publishStep = live ? (
    <Step icon={CircleCheck} title="النشر" sub="ظاهر للمتدربين الآن" state="success" />
  ) : approved ? (
    <Step icon={CircleCheck} title="النشر" sub="بانتظار نشر أول دورة" state="waiting" />
  ) : (
    <Step icon={CircleCheck} title="النشر" sub="بعد الاعتماد" state="todo" />
  );

  return shell(
    <>
      {sp.submitted === "1" && r.status === "under_review" && <Alert tone="success" title="أُرسل برنامجك للمراجعة مع الإقرار. يصلك إشعار فور صدور القرار." />}
      <section className={`flex flex-col gap-5 rounded-22 border-2 px-5 py-7 sm:flex-row sm:items-center sm:gap-[26px] sm:px-[30px] ${HERO[tone].box}`}>
        <span className={`flex size-[72px] shrink-0 items-center justify-center rounded-full bg-bg-surface ${approved ? "text-state-success" : HERO[tone].text}`}>
          <Glyph icon={hero.icon} size={32} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-bg-surface px-2.5 py-[5px] type-caption text-text-secondary">
              <Glyph icon={FileText} size={16} />
              النسخة <span dir="ltr">{version}</span>
            </span>
            <span className={`inline-flex items-center gap-1.5 rounded-full bg-bg-surface px-2.5 py-[5px] type-caption ${HERO[tone].text}`}>
              <Glyph icon={hero.pill.icon} size={16} />
              {hero.pill.label}
            </span>
          </div>
          <h2 className={`text-[28px] leading-[1.2] font-bold sm:text-[36px] ${approved && !live ? "text-state-warning" : "text-text-primary"}`}>{hero.title}</h2>
          <p className="type-body-lg text-text-secondary">{hero.body}</p>
          {hero.timing && (
            <p className={`flex items-center gap-2 text-[16px] leading-[1.5] ${approved ? "text-state-success" : HERO[tone].text}`}>
              <Glyph icon={Clock} size={16} />
              {hero.timing}
            </p>
          )}
          <div className="mt-1 flex flex-wrap gap-3">{hero.actions}</div>
        </div>
      </section>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <Card title="مسار طلبك">
            <ol className="flex flex-col gap-3">
              <Step icon={BadgeCheck} title="الإقرار والإرسال" sub={submitted} state="done" />
              <Step icon={Hourglass} title="المراجعة الفنية" sub="مطابقة المحتوى للمعايير" state={r.status === "under_review" ? "current" : "done"} />
              {decisionStep}
              {publishStep}
            </ol>
          </Card>

          {r.status === "under_review" && (
            <Card title="أثناء المراجعة">
              <ul className="flex flex-col gap-3">
                <Row icon={Lock} tone="text-state-warning" title="البرنامج مقفل للتعديل" sub="لتعديله اسحب الطلب — يعود مسودة وتفقد دورك في طابور المراجعة." />
                <Row icon={CircleCheck} tone="text-state-success" title="بقية عملك لا يتأثر" sub="دوراتك الجارية ومتدربوك وبرامجك الأخرى تعمل بشكل طبيعي." />
                <Row icon={BellRing} title="يصلك إشعار فور القرار" sub="في المنصة والبريد — لا تحتاج متابعة هذه الصفحة." />
              </ul>
            </Card>
          )}

          {approved && (
            <Card title="ماذا تستطيع الآن؟">
              <ul className="flex flex-col gap-3">
                <Row icon={CalendarDays} title="أنشئ دورة مجدولة" sub="حدّد التاريخ والمكان والمقاعد — المحتوى جاهز ولا يُعاد كتابته.">
                  <ButtonLink href={`/trainer/courses/new?program=${p.id}`} size="s">
                    أنشئ دورة
                  </ButtonLink>
                </Row>
                <Row icon={Users} title="استقبل عروض الجهات" sub={live ? "برنامجك المنشور يظهر في مطابقة طلبات التدريب." : "يظهر برنامجك في مطابقة طلبات التدريب فور نشر أول دورة."} />
                <Row icon={Copy} title="أنشئ نسخة معدّلة" sub="لتقديم صيغة أخرى — لا يؤثر على النسخة المنشورة." />
              </ul>
            </Card>
          )}

          {r.status === "needs_changes" && (
            <Card
              title="الحقول المطلوب تعديلها"
              tone="error"
              badge={
                <span className="inline-flex items-center gap-1.5 rounded-full bg-bg-surface px-2.5 py-[5px] type-caption text-state-error">
                  <Glyph icon={CircleAlert} size={16} />
                  {r.findings.length === 2 ? "حقلان" : pluralAr(r.findings.length, ["حقل واحد", "حقلان", "حقول", "حقلًا"])}
                </span>
              }
            >
              <p className="type-body text-text-secondary">بقية الحقول معتمدة — لا تغيّرها. عدّل هذه فقط وأعد الإرسال بنسخة {versionLabel(r.revision + 1)}.</p>
              <ol className="flex flex-col gap-3">
                {r.findings.map((f, i) => (
                  <li key={`${f.field}-${i}`} className="flex flex-col gap-3 rounded-12 bg-bg-surface px-4 py-4 sm:flex-row sm:items-start">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-state-error-bg type-caption text-state-error">{toArabicDigits(i + 1)}</span>
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="text-[16px] leading-[1.5] text-state-error">{f.label}</span>
                      <span className="type-body text-text-secondary">{f.note}</span>
                    </span>
                    <ButtonLink href={`/trainer/programs/${p.id}/edit/${FINDING_FIELDS[f.field]?.step ?? "basics"}`} size="s">
                      اذهب للحقل
                    </ButtonLink>
                  </li>
                ))}
              </ol>
            </Card>
          )}

          {r.status === "rejected" && (
            <Card title="سبب الرفض" tone="error">
              <div className="flex items-start gap-3 rounded-12 bg-bg-surface px-4 py-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-8 bg-state-error-bg text-state-error">
                  <Glyph icon={CircleX} size={20} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-[16px] leading-[1.5] text-state-error">السبب المصنَّف: {r.reason}</span>
                  {r.note && <span className="type-body text-text-secondary">{r.note}</span>}
                </span>
              </div>
              <p className="text-[16px] leading-[1.5] text-text-primary">كيف تعالج هذا؟</p>
              <ul className="flex flex-col gap-3">
                {(accreditationClaim
                  ? [
                      { icon: BadgeCheck, t: "ارفع مستند الاعتماد", d: "أرفق شهادة الاعتماد في ملفك المهني ثم أعد ذكرها في الوصف." },
                      { icon: SquarePen, t: "أو احذف الادعاء", d: "عدّل الوصف بحذف عبارة الاعتماد وأعد الإرسال — يُقبل عادة من أول مراجعة." },
                    ]
                  : [
                      { icon: CircleCheck, t: "أنشئ نسخة جديدة تعالج السبب", d: "النسخة الجديدة مستقلة — عدّلها ثم أعد إرسالها للمراجعة." },
                      { icon: PencilLine, t: "أو تظلّم على القرار", d: "إن رأيت أن القرار خاطئ، تواصل مع الدعم مع ما يثبت موقفك." },
                    ]
                ).map((x) => (
                  <li key={x.t} className="flex items-start gap-3 rounded-12 bg-bg-surface px-4 py-3.5">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-8 bg-state-success-bg text-state-success">
                      <Glyph icon={x.icon} size={20} />
                    </span>
                    <span className="flex flex-col gap-0.5">
                      <span className="text-[16px] leading-[1.5] text-text-primary">{x.t}</span>
                      <span className="type-caption text-text-muted">{x.d}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <aside className="flex w-full shrink-0 flex-col gap-5 lg:w-[380px]">
          <Card title="بيانات الطلب">
            <dl className="flex flex-col gap-3.5">
              <div className="flex items-center gap-3">
                <dt className="min-w-0 flex-1 type-caption text-text-muted">رقم البرنامج</dt>
                <dd dir="ltr" className="font-mono text-[14px] text-text-primary">
                  {p.reference}
                </dd>
              </div>
              <div className="flex items-center gap-3">
                <dt className="min-w-0 flex-1 type-caption text-text-muted">النسخة المرسَلة</dt>
                <dd dir="ltr" className="font-mono text-[14px] text-text-primary">
                  {version}
                </dd>
              </div>
              <div className="flex items-center gap-3">
                <dt className="min-w-0 flex-1 type-caption text-text-muted">تاريخ الإقرار</dt>
                <dd className="text-[16px] leading-[1.5] text-text-primary">{decl ? `${formatDayMonth(decl.createdAt)} · ${timeFmt.format(new Date(decl.createdAt))}` : "—"}</dd>
              </div>
              <div className="flex items-center gap-3">
                <dt className="min-w-0 flex-1 type-caption text-text-muted">بصمة المحتوى</dt>
                <dd dir="ltr" className="font-mono text-[14px] text-text-primary">
                  {decl ? shortHash(decl.contentHash) : "—"}
                </dd>
              </div>
            </dl>
            <Link href={`/trainer/programs/${p.id}/declaration`} className="flex h-12 items-center justify-center rounded-12 type-button text-text-brand hover:bg-bg-brand-tint focus-ring">
              اعرض سجل الإقرار
            </Link>
          </Card>
          {approved ? (
            <Card title="نصيحة لدورتك الأولى">
              <p className="type-body text-text-secondary">ابدأ بدورة واحدة بمقاعد محدودة لتختبر الطلب قبل جدولة دورات متعددة.</p>
              <ButtonLink href="/help" variant="outline" fullWidth>
                دليل جدولة الدورات
              </ButtonLink>
            </Card>
          ) : (
            <Card title="تحتاج مساعدة؟">
              <p className="type-body text-text-secondary">فريق دعم المدربين يراجع برنامجك معك قبل إعادة الإرسال ويوضّح المطلوب بدقة.</p>
              <ButtonLink href="/help" variant="outline" fullWidth>
                تواصل مع دعم المدربين
              </ButtonLink>
            </Card>
          )}
        </aside>
      </div>
    </>,
  );
}
