import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import {
  Award,
  CalendarDays,
  CircleCheck,
  CircleQuestionMark,
  CircleX,
  ClipboardList,
  Download,
  FileText,
  Hourglass,
  MessageSquare,
  RefreshCw,
  Route,
  Target,
  Upload,
} from "lucide-react";
import { TopBar, PageBody } from "@/components/layout/TopBar";
import { Breadcrumb } from "@/components/ui/Navigation";
import { ButtonLink } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Data";
import { Glyph } from "@/components/ui/Icon";
import { AccentProgress } from "@/components/course/CourseCard";
import { SubmissionFlow, type FlowAssignment } from "@/components/learning/SubmissionFlow";
import { requireTrainee } from "@/lib/auth";
import { ASSIGNMENT_STATE, getAssignment, submissionFileUrl, type AssignmentView } from "@/lib/data/assignments";
import { formatDate, formatDayMonth, formatPercent, formatRelative, formatTime, pluralAr, toArabicDigits } from "@/lib/format";
import { formatBytes, moduleLabel } from "@/lib/learning";

export async function generateMetadata(props: PageProps<"/trainee/assignments/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const user = await requireTrainee();
  const a = await getAssignment(user.id, id);
  return { title: a ? a.title : "الواجب" };
}

const ORD = ["الأول", "الثاني", "الثالث", "الرابع", "الخامس"];

function Card({ title, id, children, action }: { title: string; id: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex w-full flex-col gap-4 rounded-16 border border-border-default bg-bg-card p-6 shadow-card">
      <div className="flex flex-wrap items-center gap-3">
        <h2 id={id} className="min-w-0 flex-1 type-h3 text-text-primary">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

type Tone = "brand" | "warning" | "info" | "success" | "error";
const HEAD: Record<Tone, { box: string; text: string }> = {
  brand: { box: "border-action-primary bg-bg-brand-tint", text: "text-text-brand" },
  warning: { box: "border-state-warning bg-state-warning-bg", text: "text-state-warning" },
  info: { box: "border-state-info bg-state-info-bg", text: "text-state-info" },
  success: { box: "border-state-success bg-state-success-bg", text: "text-state-success" },
  error: { box: "border-state-error bg-state-error-bg", text: "text-state-error" },
};

function head(a: AssignmentView): { tone: Tone; icon: typeof Hourglass; pill: string; lead: string } {
  const left = Math.max(0, a.maxAttempts - a.attemptsUsed);
  const due = a.dueAt ? formatDate(a.dueAt) : null;
  switch (a.state) {
    case "submitted":
      return {
        tone: "warning",
        icon: Hourglass,
        pill: "بانتظار مراجعة المدرب",
        lead: `سُلّم ملفك في ${formatDayMonth(a.latest!.submittedAt)}. يراجعه المدرب خلال ٣ أيام عمل ويصلك إشعار بالنتيجة. لا إجراء مطلوب منك الآن.`,
      };
    case "needs_revision":
      return {
        tone: "info",
        icon: RefreshCw,
        pill: "طُلب تعديل",
        lead: a.pastDue
          ? "راجع المدرب ملفك وطلب تعديلًا، لكن الموعد النهائي انقضى ولم يعد التسليم متاحًا."
          : `راجع المدرب ملفك وطلب تعديلًا قبل اعتماد الدرجة النهائية. لديك ${pluralAr(left, ["محاولة واحدة متبقية", "محاولتان متبقيتان", "محاولات متبقية", "محاولة متبقية"])}${due ? ` والموعد النهائي ${due}` : ""}.`,
      };
    case "accepted":
      return {
        tone: "success",
        icon: Award,
        pill: "تم التقييم",
        lead: `اعتمد المدرب واجبك${a.latest?.score !== null && a.latest?.score !== undefined ? ` بدرجة ${toArabicDigits(a.latest.score)} من ${toArabicDigits(a.maxScore)}` : ""}. تظهر النتيجة في سجل تعلّمك.`,
      };
    case "rejected":
      return { tone: "error", icon: CircleX, pill: "مرفوض", lead: "لم يُعتمد هذا التسليم. راجع ملاحظات المدرب، وتواصل معه إن كان لديك استفسار." };
    case "late":
      return { tone: "error", icon: CalendarDays, pill: "انقضى الموعد", lead: `انتهى الموعد النهائي${due ? ` في ${due}` : ""} دون تسليم، والإرسال المتأخر غير متاح لهذا الواجب.` };
    default:
      return {
        tone: "brand",
        icon: ClipboardList,
        pill: "لم يبدأ",
        lead: `سلّم ملفك${due ? ` قبل ${due}` : ""}. يراجعه المدرب خلال ٣ أيام عمل ويصلك إشعار بالنتيجة.`,
      };
  }
}

type Step = { title: string; meta: string; icon: typeof Hourglass; state: "done" | "current" | "todo"; tone?: Tone };

function trackSteps(a: AssignmentView): Step[] {
  const steps: Step[] = [{ title: "فُتح الواجب", meta: formatDayMonth(a.opensAt), icon: CircleCheck, state: "done" }];
  const subs = [...a.submissions].reverse();
  subs.forEach((s, i) => {
    steps.push({
      title: subs.length === 1 && i === 0 ? "سلّمت ملفك" : `التسليم ${ORD[i] ?? toArabicDigits(i + 1)}`,
      meta: `${formatDayMonth(s.submittedAt)} · ${formatTime(s.submittedAt)}${s.score !== null && s.reviewedAt ? ` · ${toArabicDigits(s.score)} من ${toArabicDigits(a.maxScore)}` : ""}`,
      icon: Upload,
      state: "done",
    });
    if (s.reviewedAt) {
      steps.push({ title: "مراجعة المدرب", meta: `${formatDayMonth(s.reviewedAt)} · ${ASSIGNMENT_STATE[s.status].label}`, icon: MessageSquare, state: "done" });
    }
  });
  const latest = a.latest;
  if (latest?.status === "submitted" && !latest.reviewedAt) {
    steps.push({ title: "مراجعة المدرب", meta: `${a.course.trainerName} · خلال ٣ أيام عمل`, icon: Hourglass, state: "current", tone: "warning" });
  } else if (latest?.status === "needs_revision" && a.canSubmit) {
    steps.push({
      title: `التسليم ${ORD[a.attemptsUsed] ?? toArabicDigits(a.attemptsUsed + 1)}`,
      meta: `بانتظارك · المحاولة ${toArabicDigits(a.attemptsUsed + 1)} من ${toArabicDigits(a.maxAttempts)}`,
      icon: RefreshCw,
      state: "current",
      tone: "info",
    });
  } else if (!latest) {
    steps.push({
      title: "سلّم ملفك",
      meta: a.pastDue ? "انقضى الموعد" : a.dueAt ? `قبل ${formatDayMonth(a.dueAt)}` : "في أي وقت",
      icon: Upload,
      state: a.pastDue ? "todo" : "current",
      tone: "brand",
    });
  }
  steps.push(
    latest?.status === "accepted"
      ? { title: "الدرجة النهائية", meta: latest.score !== null ? `${toArabicDigits(latest.score)} من ${toArabicDigits(a.maxScore)}` : "اعتُمدت", icon: Award, state: "done" }
      : { title: latest ? "الدرجة النهائية" : "النتيجة والتقييم", meta: latest ? "تُعتمد بعد المراجعة" : `من ${toArabicDigits(a.maxScore)} درجة + ملاحظات المدرب`, icon: Award, state: "todo" },
  );
  return steps;
}

function Track({ a }: { a: AssignmentView }) {
  const cur: Record<Tone, string> = {
    warning: "border-[1.5px] border-state-warning bg-state-warning-bg",
    info: "border-[1.5px] border-state-info bg-state-info-bg",
    brand: "border-[1.5px] border-action-primary bg-bg-brand-tint",
    success: "border-[1.5px] border-state-success bg-state-success-bg",
    error: "border-[1.5px] border-state-error bg-state-error-bg",
  };
  return (
    <Card title="مسار الواجب" id="track-title">
      <ol className="flex flex-col gap-4">
        {trackSteps(a).map((s, i) => (
          <li
            key={`${s.title}-${i}`}
            aria-current={s.state === "current" ? "step" : undefined}
            className={`flex items-start gap-3 rounded-12 px-3 py-[11px] ${s.state === "current" ? cur[s.tone ?? "brand"] : "bg-bg-page"}`}
          >
            <span className={`flex size-9 shrink-0 items-center justify-center rounded-full bg-bg-surface ${s.state === "done" ? "text-state-success" : s.state === "current" ? HEAD[s.tone ?? "brand"].text : "text-text-muted"}`}>
              <Glyph icon={s.icon} size={20} />
            </span>
            <span className={`flex min-w-0 flex-1 flex-col gap-0.5 ${s.state === "todo" ? "text-text-muted" : ""}`}>
              <span className={`type-small ${s.state === "todo" ? "" : "text-text-primary"}`}>{s.title}</span>
              <span className="type-caption text-text-muted">{s.meta}</span>
            </span>
          </li>
        ))}
      </ol>
    </Card>
  );
}

function Requirements({ a }: { a: AssignmentView }) {
  const tile = (label: string, value: string, icon: typeof Hourglass, tone?: string) => (
    <div className="flex min-w-0 flex-1 items-center gap-2.5 rounded-12 bg-bg-page px-3.5 py-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-8 bg-bg-surface text-text-secondary">
        <Glyph icon={icon} size={20} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="type-caption text-text-muted">{label}</span>
        <span className={`type-subtitle ${tone ?? "text-text-primary"}`}>{value}</span>
      </span>
    </div>
  );
  return (
    <Card title="المطلوب منك" id="req-title">
      {a.instructions && <p className="type-body text-text-secondary">{a.instructions}</p>}
      {a.requirements.length > 0 && (
        <ul className="grid grid-cols-1 gap-x-3.5 gap-y-3 sm:grid-cols-2">
          {a.requirements.map((r) => (
            <li key={r} className="flex items-start gap-2.5 type-body text-text-secondary">
              <Glyph icon={CircleCheck} size={20} className="mt-1 text-state-success" />
              {r}
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-col gap-4 sm:flex-row">
        {tile("الموعد النهائي", a.dueAt ? formatDate(a.dueAt) : "بلا موعد", CalendarDays, a.pastDue ? "text-state-error" : "text-state-warning")}
        {tile("الصيغة", `${a.acceptedFormats} حتى ${toArabicDigits(a.maxFileMb)} م.ب`, FileText)}
        {tile("التسليمات", `حتى ${pluralAr(a.maxAttempts, ["محاولة واحدة", "محاولتين", "محاولات", "محاولة"])}`, RefreshCw)}
      </div>
    </Card>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <li className="flex flex-col gap-1 rounded-12 bg-bg-page px-3 py-2.5">
      <p className="flex items-center gap-2 type-small text-text-primary">
        <Glyph icon={CircleQuestionMark} size={16} className="text-text-brand" />
        {q}
      </p>
      <p className="type-caption text-text-muted">{a}</p>
    </li>
  );
}

/** TRN-LRN-05 · الواجب — Figma 198:10646 (بانتظار المراجعة) · 198:10969 (مطلوب تعديل) + submission flow 4145:*. */
export default async function AssignmentPage(props: PageProps<"/trainee/assignments/[id]">) {
  const { id } = await props.params;
  const user = await requireTrainee(`/trainee/assignments/${id}`);
  const a = await getAssignment(user.id, id);
  if (!a) notFound();

  const h = head(a);
  const latest = a.latest;
  const reviewed = a.submissions.find((s) => s.reviewedAt) ?? null;
  const fileUrl = latest ? await submissionFileUrl(latest.filePath, latest.fileName) : null;
  const flow: FlowAssignment = {
    id: a.id,
    title: a.title,
    courseTitle: a.course.title,
    dueAt: a.dueAt,
    acceptedFormats: a.acceptedFormats,
    maxFileMb: a.maxFileMb,
    statusLabel: ASSIGNMENT_STATE[a.state].label,
    attemptsUsed: a.attemptsUsed,
    maxAttempts: a.maxAttempts,
    current: latest ? { fileName: latest.fileName, fileSize: latest.fileSize, submittedAt: latest.submittedAt, note: latest.note } : null,
  };
  const topFlow = !latest ? (a.pastDue ? "late" : a.canSubmit ? "initial" : null) : null;
  const inlineFlow = latest?.status === "needs_revision" && a.canSubmit ? "revision" : latest?.status === "submitted" && a.canSubmit ? "replace" : null;
  const scored = reviewed?.score ?? null;
  const pass = a.passScore;

  return (
    <>
      <TopBar title="الواجب العملي" subtitle={a.course.title} />
      <PageBody className="gap-6">
        {topFlow && <SubmissionFlow assignment={flow} userId={user.id} mode={topFlow} />}

        <Breadcrumb items={[{ label: "الواجبات", href: "/trainee/assignments" }, ...(a.enrollmentId ? [{ label: a.course.title, href: `/trainee/learn/${a.enrollmentId}` }] : [{ label: a.course.title }]), { label: a.title }]} />

        <section aria-labelledby="assignment-title" className={`flex w-full items-center gap-5 rounded-22 border-2 px-5 py-[22px] sm:px-[26px] ${HEAD[h.tone].box}`}>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <ul className="flex flex-wrap items-center gap-2" aria-label="حالة الواجب">
              <li className={`flex items-center gap-1.5 rounded-full bg-bg-surface px-2.5 py-[5px] type-caption ${HEAD[h.tone].text}`}>
                <Glyph icon={h.icon} size={16} />
                {h.pill}
              </li>
              {a.module && (
                <li className="flex items-center gap-1.5 rounded-full bg-bg-surface px-2.5 py-[5px] type-caption text-text-secondary">
                  <Glyph icon={Route} size={16} />
                  {moduleLabel(a.module.position)} · {a.module.title}
                </li>
              )}
              {a.weightPercent !== null && (
                <li className="flex items-center gap-1.5 rounded-full bg-bg-surface px-2.5 py-[5px] type-caption text-text-secondary">
                  <Glyph icon={Target} size={16} />
                  وزنه {formatPercent(a.weightPercent)} من التقييم
                </li>
              )}
            </ul>
            <h2 id="assignment-title" className="text-[28px] leading-[1.2] font-bold text-text-primary sm:text-[36px]">
              {a.title}
            </h2>
            <p className="type-body-lg text-text-secondary">{h.lead}</p>
          </div>
          <span className={`hidden size-[60px] shrink-0 items-center justify-center rounded-16 bg-bg-surface sm:flex ${HEAD[h.tone].text}`}>
            <Glyph icon={h.icon} size={32} />
          </span>
        </section>

        <div className="flex w-full flex-col gap-6 lg:flex-row lg:items-start">
          <div className="flex min-w-0 flex-1 flex-col gap-6">
            {reviewed?.feedback && (
              <Card
                title="ملاحظات المدرب"
                id="feedback-title"
                action={
                  scored !== null ? (
                    <span className="flex items-center gap-1.5 rounded-full bg-bg-brand-tint px-3 py-1 type-caption text-text-brand">
                      <Glyph icon={Award} size={16} />
                      {reviewed.status === "accepted" ? "الدرجة" : "درجة مبدئية"} {toArabicDigits(scored)} من {toArabicDigits(a.maxScore)}
                    </span>
                  ) : undefined
                }
              >
                <figure className="flex items-start gap-3 rounded-12 bg-state-info-bg p-4">
                  <Avatar name={a.course.trainerName} size="s" />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <figcaption className="type-caption text-text-muted">
                      {a.course.trainerName} · {formatRelative(reviewed.reviewedAt!)}
                    </figcaption>
                    <blockquote className="type-body text-text-primary">{reviewed.feedback}</blockquote>
                  </div>
                </figure>
              </Card>
            )}
            {reviewed && a.rubric.length > 0 && Object.keys(reviewed.rubricScores).length > 0 && (
              <Card title="تفصيل الدرجة" id="rubric-title">
                <dl className="flex flex-col gap-4">
                  {a.rubric.map((r) => {
                    const v = reviewed.rubricScores[r.id];
                    const ratio = r.max ? (v ?? 0) / r.max : 0;
                    return (
                      <div key={r.id} className="flex items-center justify-between gap-3">
                        <dt className="type-small text-text-secondary">{r.label}</dt>
                        <dd className={`type-subtitle tabular-nums ${ratio >= 0.75 ? "text-state-success" : ratio >= 0.5 ? "text-state-warning" : "text-state-error"}`}>
                          {v === undefined ? "—" : `${toArabicDigits(v)} / ${toArabicDigits(r.max)}`}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </Card>
            )}
            {inlineFlow === "revision" && <SubmissionFlow assignment={flow} userId={user.id} mode="revision" />}
            <Requirements a={a} />
            {inlineFlow === "replace" && <SubmissionFlow assignment={flow} userId={user.id} mode="replace" />}
            {latest && !inlineFlow && (
              <Card title="تسليمك" id="yours-title">
                <div className="flex flex-wrap items-center gap-3 rounded-12 bg-bg-page px-3.5 py-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-8 bg-state-error-bg text-state-error">
                    <Glyph icon={FileText} size={20} />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="type-subtitle text-text-primary">{latest.fileName ?? "ملف الحل"}</span>
                    <span className="type-caption text-text-muted">
                      {[formatBytes(latest.fileSize), `سُلّم في ${formatDayMonth(latest.submittedAt)}`].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  {fileUrl && (
                    <a href={fileUrl} className="inline-flex h-11 items-center gap-2 rounded-12 px-[18px] type-small text-text-primary inner-stroke istroke-w-[1.5px] istroke-c-border-default hover:bg-bg-brand-tint focus-ring">
                      <Glyph icon={Download} size={16} />
                      نزّل
                    </a>
                  )}
                </div>
                {latest.note && <p className="type-small text-text-secondary">ملاحظاتك: {latest.note}</p>}
              </Card>
            )}
          </div>

          <aside aria-label="مسار الواجب ومساعدة" className="flex w-full flex-col gap-6 lg:w-[380px] lg:shrink-0">
            <Track a={a} />
            {scored !== null && pass !== null ? (
              <Card title="أثر ذلك على تقييمك" id="impact-title">
                <p className={`type-body ${scored >= pass ? "text-state-success" : "text-state-warning"}`}>
                  حد الاجتياز {toArabicDigits(pass)} درجة من {toArabicDigits(a.maxScore)}. درجتك {reviewed?.status === "accepted" ? "" : "المبدئية "}
                  {toArabicDigits(scored)} —{" "}
                  {scored >= pass
                    ? reviewed?.status === "accepted"
                      ? "أنت مجتاز."
                      : "أنت مجتاز بالفعل، والتعديل يرفع درجتك."
                    : "تحتاج إلى التعديل لبلوغ حد الاجتياز."}
                </p>
                <div className="flex items-center justify-between gap-3 type-caption text-text-muted">
                  <span>
                    درجتك {toArabicDigits(scored)} من {toArabicDigits(a.maxScore)} · حد الاجتياز {toArabicDigits(pass)}
                  </span>
                  <span>{formatPercent((scored / a.maxScore) * 100)}</span>
                </div>
                <AccentProgress percent={(scored / a.maxScore) * 100} label="درجتك في الواجب" />
              </Card>
            ) : (
              <Card title={latest ? "أثناء الانتظار" : "قبل أن تبدأ"} id="faq-title">
                <ul className="flex flex-col gap-4">
                  <Faq q="هل يعطّل الواجب تقدّمي؟" a="لا. يمكنك متابعة الدروس والاختبارات بشكل طبيعي." />
                  <Faq q="ماذا لو تأخر المدرب؟" a="بعد ٣ أيام عمل يصلك تنبيه، ويمكنك مراسلته من هنا." />
                  <Faq
                    q="كيف تُحتسب الدرجة؟"
                    a={pass !== null ? `من ${toArabicDigits(a.maxScore)} درجة، وحد الاجتياز ${toArabicDigits(pass)} — تظهر النتيجة في سجل تعلّمك.` : `من ${toArabicDigits(a.maxScore)} درجة — تظهر النتيجة في سجل تعلّمك.`}
                  />
                </ul>
              </Card>
            )}
            <ButtonLink href={`/messages?course=${a.course.id}`} variant="secondary" size="l" fullWidth>
              راسل المدرب
            </ButtonLink>
          </aside>
        </div>
      </PageBody>
    </>
  );
}
