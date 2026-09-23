import Link from "next/link";
import type { ReactNode } from "react";
import {
  Award,
  ChevronLeft,
  CircleCheck,
  CircleDot,
  Download,
  FileText,
  Lock,
  MessageSquare,
  Play,
  Plus,
  RefreshCw,
  Video,
} from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Data";
import { Glyph } from "@/components/ui/Icon";
import { formatClock, formatDate, formatDayMonth, formatDuration, formatPercent, formatPrice, pluralAr, toArabicDigits } from "@/lib/format";
import { lessonLabel, moduleLabel } from "@/lib/learning";
import type { CourseContent, LessonView } from "@/lib/data/learning";
import { ofLessons } from "./CourseOutline";
import { ProgressRing } from "./ProgressRing";

/** Card shell used by the learning screens: surface, 1px border/default, r22, p28, card shadow. */
export function Panel({ title, id, children, className, action }: { title?: ReactNode; id?: string; children: ReactNode; className?: string; action?: ReactNode }) {
  return (
    <section aria-labelledby={title && id ? id : undefined} className={`flex w-full flex-col gap-5 rounded-22 border border-border-default bg-bg-card p-5 shadow-card sm:p-7 ${className ?? ""}`}>
      {title && (
        <div className="flex items-center gap-3">
          <h2 id={id} className="min-w-0 flex-1 type-h3 text-text-primary">
            {title}
          </h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

function Check({ done, children }: { done: boolean; children: ReactNode }) {
  return (
    <li className="flex w-full items-center gap-2.5 rounded-12 bg-bg-page px-3.5 pt-3 pb-[13px]">
      <Glyph icon={done ? CircleCheck : CircleDot} size={20} className={done ? "text-state-success" : "text-text-muted"} />
      <span className={`min-w-0 flex-1 type-body ${done ? "text-text-primary" : "text-text-muted"}`}>
        {children}
        <span className="sr-only">{done ? " — مكتمل" : " — لم يكتمل بعد"}</span>
      </span>
    </li>
  );
}

/** Figma "Trainee / Recorded · Progress Ring" (401:4414) — lessons done + certificate condition. */
export function CourseProgressCard({ content, continueHref }: { content: CourseContent; continueHref: string | null }) {
  const { completed, total, percent } = content.progress;
  const allWatched = total > 0 && completed === total;
  const quizzesDone = content.quizzes.total === 0 || content.quizzes.passed === content.quizzes.total;
  return (
    <section aria-labelledby="progress-title" className="flex w-full flex-col items-center gap-[18px] rounded-22 border border-border-default bg-bg-card px-[26px] pt-[26px] pb-7 drop-shadow-milestone">
      <div className="flex size-[110px] items-center justify-center">
        <ProgressRing percent={percent} label="نسبة إكمال الدورة" tone={allWatched ? "success" : "accent"} />
      </div>
      <h2 id="progress-title" className="w-full text-center type-h3 text-text-primary">
        تقدّمك في الدورة
      </h2>
      <p className="w-full text-center type-body-lg text-text-secondary">
        {ofLessons(completed, total)}
      </p>
      <ul className="flex w-full flex-col gap-2.5" aria-label="شروط الشهادة">
        <Check done={allWatched}>مشاهدة كل الدروس</Check>
        {content.quizzes.total > 0 && <Check done={quizzesDone}>اجتياز الاختبارات</Check>}
      </ul>
      {allWatched ? (
        <ButtonLink href="/trainee/certificates" variant="outline" size="l" fullWidth icon={<Glyph icon={Award} size={20} />}>
          اعرض شهادتك
        </ButtonLink>
      ) : continueHref ? (
        <ButtonLink href={continueHref} variant="outline" size="l" fullWidth>
          استمر بالتعلّم
        </ButtonLink>
      ) : null}
      <p className="w-full text-center type-caption text-text-muted">
        {allWatched ? "أكملت كل الدروس — شهادتك صادرة وقابلة للتحقق." : "الشهادة تصدر بعد مشاهدة ١٠٠٪ من الدروس."}
      </p>
    </section>
  );
}

/** "استمر بالتعلّم" hero (Figma 403:15316). */
export function ContinueHero({ content }: { content: CourseContent }) {
  const r = content.resume;
  const allDone = content.progress.total > 0 && content.progress.completed === content.progress.total;
  if (allDone) {
    return (
      <section className="flex w-full flex-col items-start gap-5 rounded-22 border-2 border-state-success bg-state-success-bg px-5 py-6 sm:flex-row sm:items-center sm:gap-[26px] sm:px-[30px] sm:py-7">
        <span className="flex size-[72px] shrink-0 items-center justify-center rounded-16 bg-bg-surface text-state-success">
          <Glyph icon={Award} size={32} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <h2 className="text-[28px] leading-[1.2] font-bold text-text-primary sm:text-[36px]">أكملت الدورة — أحسنت!</h2>
          <p className="type-body-lg text-text-secondary">شاهدت كل الدروس، وصدرت شهادتك باسمك. يمكنك مراجعة أي درس متى شئت.</p>
        </div>
        <ButtonLink href="/trainee/certificates" size="l" className="w-full sm:w-[280px]">
          اعرض شهادتك
        </ButtonLink>
      </section>
    );
  }
  if (!r) return null;
  const started = r.status === "in_progress" || r.positionSeconds > 0;
  const where = `${moduleLabel(r.modulePosition)} · ${lessonLabel(r.position)}`;
  const detail =
    r.kind === "video" && started
      ? `${where} · شاهدت ${formatPercent(r.watchedPercent)} منه — يستأنف من الدقيقة ${formatClock(r.positionSeconds)}.`
      : r.kind === "video"
        ? `${where} · مدته ${formatDuration(r.durationSeconds)}.`
        : `${where}.`;
  return (
    <section
      aria-labelledby="resume-title"
      className="flex w-full flex-col items-start gap-5 rounded-22 border-2 border-action-primary bg-bg-brand-tint px-5 py-6 sm:flex-row sm:items-center sm:gap-[26px] sm:px-[30px] sm:py-7"
    >
      <span className="flex size-[72px] shrink-0 items-center justify-center rounded-16 bg-bg-surface text-text-brand">
        <Glyph icon={Play} size={32} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <h2 id="resume-title" className="text-[28px] leading-[1.2] font-bold text-text-primary sm:text-[36px]">
          {started ? "توقفت عند" : "ابدأ من"}: {r.title}
        </h2>
        <p className="type-body-lg text-text-secondary">{detail}</p>
      </div>
      <ButtonLink href={r.href} size="l" className="w-full shadow-hero sm:w-[280px]">
        استمر بالتعلّم
      </ButtonLink>
    </section>
  );
}

function FileRow({ lesson, enrollmentId }: { lesson: LessonView; enrollmentId: string }) {
  return (
    <li className="flex w-full items-center gap-3 rounded-12 bg-bg-page px-3.5 py-[13px]">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-8 bg-state-error-bg text-state-error">
        <Glyph icon={FileText} size={20} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="type-small text-text-primary">{lesson.title}</span>
        <span className="type-caption text-text-muted">{lesson.hasMedia ? moduleLabel(lesson.modulePosition) : "لم يُرفع الملف بعد"}</span>
      </span>
      {lesson.hasMedia ? (
        <a
          href={`/trainee/learn/${enrollmentId}/lessons/${lesson.id}/download`}
          aria-label={`تنزيل ${lesson.title}`}
          className="flex size-10 shrink-0 items-center justify-center rounded-8 bg-bg-surface text-text-primary focus-ring"
        >
          <Glyph icon={Download} size={20} />
        </a>
      ) : (
        <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-8 bg-bg-surface text-text-disabled">
          <Glyph icon={Download} size={20} />
        </span>
      )}
    </li>
  );
}

/** "ملفات الدورة" (Figma 403:15485) — the course's file lessons. */
export function CourseFilesCard({ content }: { content: CourseContent }) {
  if (content.files.length === 0) return null;
  return (
    <Panel title="ملفات الدورة" id="files-title">
      <ul className="flex flex-col gap-5">
        {content.files.map((f) => (
          <FileRow key={f.id} lesson={f} enrollmentId={content.enrollment.id} />
        ))}
      </ul>
    </Panel>
  );
}

function LinkRow({ href, icon, children }: { href: string; icon: typeof Lock; children: ReactNode }) {
  return (
    <li>
      <Link href={href} className="flex w-full items-center gap-2.5 rounded-12 bg-bg-page px-3.5 pt-3 pb-[13px] text-text-primary hover:bg-bg-brand-tint focus-ring">
        <Glyph icon={icon} size={20} className="text-text-brand" />
        <span className="min-w-0 flex-1 type-body">{children}</span>
        <Glyph icon={ChevronLeft} size={16} className="text-text-muted" />
      </Link>
    </li>
  );
}

/** "عن الدورة" (Figma 403:15535). */
export function AboutCourseCard({ content }: { content: CourseContent }) {
  const c = content.course;
  return (
    <Panel title="عن الدورة" id="about-title">
      <div className="flex items-center gap-3">
        <Avatar name={c.trainerName || "المدرب"} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="type-subtitle text-text-primary">{c.trainerName}</p>
          <p className="type-caption text-state-success">{c.organizationName ?? c.trainerHeadline ?? "مدرب الدورة"}</p>
        </div>
      </div>
      <ul className="flex flex-col gap-5">
        <li className="flex w-full items-center gap-2.5 rounded-12 bg-bg-page px-3.5 pt-3 pb-[13px] text-text-primary">
          <Glyph icon={CircleCheck} size={20} className="text-state-success" />
          <span className="min-w-0 flex-1 type-body">وصول دائم بلا انتهاء</span>
        </li>
        <LinkRow href={`/messages?course=${c.id}`} icon={MessageSquare}>
          اسأل المدرب في أي وقت
        </LinkRow>
        <LinkRow href={`/trainee/trainings/${content.enrollment.id}`} icon={FileText}>
          اعرض إيصال الشراء
        </LinkRow>
      </ul>
    </Panel>
  );
}

/** BR-L10 banner "أضاف المدرب محتوى جديدًا" (Figma 409:16093). */
export function NewContentBanner({ content }: { content: CourseContent }) {
  const b = content.before;
  if (!b) return null;
  const added = content.newLessons.length;
  const where = [...new Set(content.newLessons.map((l) => moduleLabel(l.modulePosition)))].join(" و");
  const stat = (label: string, value: ReactNode, strong?: boolean) => (
    <div className="flex flex-1 flex-col items-center gap-1 rounded-12 bg-bg-surface px-4 py-3 text-center">
      <span className="type-caption text-text-muted">{label}</span>
      <span className={`type-subtitle ${strong ? "text-state-info" : "text-text-secondary"}`}>{value}</span>
    </div>
  );
  return (
    <section aria-labelledby="new-content-title" className="flex w-full flex-col gap-4 rounded-16 border-[1.5px] border-state-info bg-state-info-bg p-5 sm:px-6">
      <div className="flex items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2 id="new-content-title" className="type-title text-state-info">
            أضاف المدرب محتوى جديدًا
          </h2>
          <p className="type-small text-text-secondary">
            {pluralAr(added, ["درس جديد", "درسان جديدان", "دروس جديدة", "درسًا جديدًا"])} في {where} — {added === 1 ? "متاح" : "متاحة"} لك مجانًا. نسبة إكمالك أُعيد حسابها لتشمل المحتوى الجديد.
          </p>
        </div>
        <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-8 bg-bg-surface text-state-info">
          <Glyph icon={Plus} size={20} />
        </span>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        {stat("صارت", `${toArabicDigits(content.progress.completed)} من ${toArabicDigits(content.progress.total)} = ${formatPercent(content.progress.percent)}`, true)}
        {stat("أُضيف", pluralAr(added, ["درس", "درسان", "دروس", "درسًا"]))}
        {stat("كانت", `${toArabicDigits(b.completed)} من ${toArabicDigits(b.total)} = ${formatPercent(b.percent)}`)}
      </div>
      <p className="type-caption text-text-muted">النسبة تعكس ما ينبغي تعلّمه فعلًا — لا تنقص من جهدك السابق.</p>
      <ButtonLink href="#new-lessons" size="m" fullWidth>
        اعرض المحتوى الجديد
      </ButtonLink>
    </section>
  );
}

/** "الدروس الجديدة" + "لماذا تغيّرت نسبتي؟" (Figma 409:16093). */
export function NewLessonsCard({ content }: { content: CourseContent }) {
  const lessons = content.newLessons;
  if (lessons.length === 0) return null;
  const seconds = lessons.reduce((s, l) => s + l.durationSeconds, 0);
  const latest = lessons.map((l) => l.publishedAt ?? "").sort().pop();
  const doneBefore = content.lessons.filter((l) => !l.isNew && l.status === "done").length;
  return (
    <>
      <section id="new-lessons" aria-labelledby="new-lessons-title" className="flex w-full scroll-mt-28 flex-col gap-4 rounded-22 border border-border-default bg-bg-card p-5 shadow-card sm:p-7">
        <div className="flex flex-wrap items-center gap-3">
          <h2 id="new-lessons-title" className="min-w-0 flex-1 type-h2 text-text-primary">
            الدروس الجديدة
          </h2>
          <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-state-info-bg px-3.5 py-2 text-state-info">
            <Glyph icon={Plus} size={16} />
            <span className="type-caption">
              {pluralAr(lessons.length, ["درس", "درسان", "دروس", "درسًا"])} · {formatDuration(seconds)}
            </span>
          </span>
        </div>
        {latest && (
          <p className="type-small text-text-secondary">
            أضافها المدرب في {formatDayMonth(latest)} — متاحة لك مجانًا ضمن اشتراكك.
          </p>
        )}
        <ul className="flex flex-col gap-4">
          {lessons.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center gap-3 rounded-16 border-[1.5px] border-state-info bg-state-info-bg px-4 py-4 sm:flex-nowrap">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-12 bg-bg-surface text-state-error">
                <Glyph icon={Video} size={20} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="type-title text-text-primary">{l.title}</span>
                <span className="type-caption text-text-secondary">
                  {moduleLabel(l.modulePosition)} · {lessonLabel(l.position)}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-3 type-caption text-text-muted">
                <span className="tabular-nums">{formatClock(l.durationSeconds)}</span>
                <span className="flex items-center gap-1 text-state-info">
                  {l.status === "done" ? "مكتمل" : "جديد"}
                  <Glyph icon={l.status === "done" ? CircleCheck : Plus} size={16} />
                </span>
              </span>
              <ButtonLink href={l.href} size="s" className="shrink-0">
                {l.status === "done" ? "أعد المشاهدة" : "شاهد الآن"}
              </ButtonLink>
            </li>
          ))}
        </ul>
      </section>
      <Panel>
        <h2 className="type-h2 text-text-primary">لماذا تغيّرت نسبتي؟</h2>
        <p className="type-body text-text-secondary">
          نسبة الإكمال تعكس ما ينبغي تعلّمه في الدورة كاملة. حين يضيف المدرب محتوى، تُعاد النسبة لتشمله — لا لتنقص من جهدك السابق. الدروس التي أكملتها تبقى مكتملة.
        </p>
        <p role="status" className="flex items-center gap-2.5 rounded-12 bg-state-success-bg px-4 py-3.5 type-small text-state-success">
          <Glyph icon={CircleCheck} size={20} />
          لم تفقد شيئًا — {doneBefore === 1 ? "الدرس الذي أكملته ما زال مكتملًا" : `الدروس التي أكملتها (${toArabicDigits(doneBefore)}) ما زالت مكتملة`}.
        </p>
      </Panel>
    </>
  );
}

function MetaRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-12 bg-bg-page px-4 py-3.5">
      <dt className="type-small text-text-secondary">{label}</dt>
      <dd className="type-small text-text-primary tabular-nums" dir="auto">
        {value}
      </dd>
    </div>
  );
}

function ChangeRow({ icon, title, description, success }: { icon: typeof Lock; title: string; description: string; success?: boolean }) {
  return (
    <li className={`flex items-center gap-3 rounded-12 px-4 py-4 ${success ? "bg-state-success-bg" : "bg-bg-page"}`}>
      <span className={`flex size-9 shrink-0 items-center justify-center rounded-8 bg-bg-surface ${success ? "text-state-success" : "text-text-secondary"}`}>
        <Glyph icon={icon} size={20} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={`type-subtitle ${success ? "text-state-success" : "text-text-primary"}`}>{title}</span>
        <span className="type-caption text-text-secondary">{description}</span>
      </span>
    </li>
  );
}

const METHOD_LABELS: Record<string, string> = {
  card: "البطاقة المستخدمة في الدفع",
  mada: "بطاقة مدى المستخدمة في الدفع",
  apple_pay: "Apple Pay",
  bank_transfer: "الحساب البنكي المحوِّل",
  free: "—",
};

function refundRef(id: string, at: string): string {
  return `RFD-${new Date(at).getUTCFullYear()}-${id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}

/** TRN-MYE-04 · سُحب الوصول (Figma 408:16019). */
export function AccessEndedView({ content }: { content: CourseContent }) {
  const ended = content.ended!;
  const refund = ended.refund;
  const endedOn = refund?.decidedAt ?? ended.endedAt;
  const lead = refund
    ? `استُرد المبلغ إليك في ${formatDate(refund.decidedAt ?? refund.createdAt)}، وبذلك انتهى وصولك للمحتوى وفق سياسة الاسترداد.`
    : ended.status === "withdrawn"
      ? `انسحبت من الدورة${endedOn ? ` في ${formatDate(endedOn)}` : ""}، وبذلك انتهى وصولك للمحتوى.`
      : ended.status === "cancelled"
        ? "أُلغي هذا التسجيل، ولم يعد المحتوى متاحًا لك."
        : `سُحب وصولك لمحتوى الدورة${endedOn ? ` في ${formatDate(endedOn)}` : ""}.`;
  return (
    <>
      <section className="flex w-full flex-col items-center gap-4 rounded-22 border-2 border-state-warning bg-state-warning-bg px-6 py-9 text-center sm:py-10">
        <span className="flex size-14 items-center justify-center rounded-full bg-bg-surface text-state-warning">
          <Glyph icon={Lock} size={24} />
        </span>
        <h2 className="text-[28px] leading-[1.2] font-bold text-text-primary sm:text-[36px]">انتهى وصولك لهذه الدورة</h2>
        <p className="max-w-2xl type-body-lg text-text-secondary">{lead}</p>
      </section>
      <div className="flex w-full flex-col gap-6 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          {refund ? (
            <Panel title="تفاصيل الاسترداد" id="refund-title">
              <dl className="flex flex-col gap-3">
                <MetaRow label="رقم عملية الاسترداد" value={<span dir="ltr">{refundRef(refund.id, refund.createdAt)}</span>} />
                {ended.payment?.ref && <MetaRow label="رقم الشراء الأصلي" value={<span dir="ltr">{ended.payment.ref}</span>} />}
                <MetaRow label="المبلغ المسترد" value={formatPrice(refund.amount, ended.payment?.currency ?? "SAR")} />
                {refund.decidedAt && <MetaRow label="تاريخ الاسترداد" value={formatDate(refund.decidedAt)} />}
                {ended.payment && <MetaRow label="وجهة الاسترداد" value={METHOD_LABELS[ended.payment.method] ?? "وسيلة الدفع الأصلية"} />}
              </dl>
            </Panel>
          ) : (
            <Panel title="تفاصيل التسجيل" id="ended-title">
              <dl className="flex flex-col gap-3">
                <MetaRow label="الدورة" value={content.course.title} />
                {endedOn && <MetaRow label="تاريخ انتهاء الوصول" value={formatDate(endedOn)} />}
              </dl>
            </Panel>
          )}
          <Panel title="ماذا تغيّر؟" id="changes-title">
            <ul className="flex flex-col gap-3">
              <ChangeRow icon={Lock} title="لم يعد بإمكانك مشاهدة الدروس" description={`المحتوى مغلق منذ ${refund ? "تاريخ الاسترداد" : "انتهاء التسجيل"}.`} />
              <ChangeRow icon={Download} title="لم تعد الملفات متاحة للتنزيل" description="ما نزّلته سابقًا يبقى في جهازك." />
              <ChangeRow icon={Award} title="لم تصدر لك شهادة" description="لم تكمل الدورة قبل انتهاء الوصول." />
              <ChangeRow icon={CircleCheck} title="سجلّ عملياتك محفوظ" description="الإيصال وإيصال الاسترداد يبقيان في سجلّك المالي." success />
            </ul>
          </Panel>
        </div>
        <div className="flex w-full flex-col gap-6 lg:w-[380px] lg:shrink-0">
          <section className="flex flex-col items-center gap-4 rounded-22 bg-bg-brand-tint px-6 py-7 text-center">
            <span className="flex size-14 items-center justify-center rounded-16 bg-bg-surface text-text-brand">
              <Glyph icon={RefreshCw} size={24} />
            </span>
            <h2 className="type-h3 text-text-primary">غيّرت رأيك؟</h2>
            <p className="type-small text-text-secondary">يمكنك شراء الدورة من جديد في أي وقت. سيبدأ تقدّمك من الصفر.</p>
            <ButtonLink href={`/courses/${content.course.slug}`} size="m" fullWidth className="shadow-hero">
              اشترِ الدورة مجددًا
            </ButtonLink>
          </section>
          <Panel title="لديك سؤال؟" id="question-title">
            <p className="type-small text-text-secondary">إن كنت ترى أن {refund ? "الاسترداد" : "إنهاء الوصول"} تم بالخطأ، تواصل مع الدعم خلال ٣٠ يومًا من تاريخه.</p>
            <ButtonLink href="/trainee/help" variant="outline" size="s" fullWidth>
              تواصل مع الدعم
            </ButtonLink>
          </Panel>
        </div>
      </div>
    </>
  );
}
