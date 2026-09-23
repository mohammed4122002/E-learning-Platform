import { CircleCheck, CircleX, ClipboardList, RefreshCw, Trophy, Unlock } from "lucide-react";
import type { ReactNode } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { Glyph } from "@/components/ui/Icon";
import { formatPercent, pluralAr, toArabicDigits } from "@/lib/format";
import { OPTION_LETTERS, attemptLabel, moduleLabel } from "@/lib/learning";
import type { AttemptView, QuizPage, QuizReviewItem } from "@/lib/data/learning";
import { ProgressRing } from "./ProgressRing";

function optionText(item: QuizReviewItem, value: string | null) {
  if (value === null) return null;
  const i = Number(value);
  return `${OPTION_LETTERS[i] ?? toArabicDigits(i + 1)}) ${item.options[i] ?? ""}`;
}

function Row({ label, value, tone }: { label: string; value: ReactNode; tone?: "success" | "error" }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="type-small text-text-secondary">{label}</dt>
      <dd className={`type-subtitle ${tone === "success" ? "text-state-success" : tone === "error" ? "text-state-error" : "text-text-primary"}`}>{value}</dd>
    </div>
  );
}

function NextItem({ icon, title, description, tone }: { icon: typeof Trophy; title: string; description: string; tone: "success" | "warning" | "brand" }) {
  const color = tone === "success" ? "text-state-success" : tone === "warning" ? "text-state-warning" : "text-text-brand";
  return (
    <li className="flex items-center gap-3 rounded-12 bg-bg-page px-4 py-3">
      <span className={`flex size-9 shrink-0 items-center justify-center rounded-8 bg-bg-surface ${color}`}>
        <Glyph icon={icon} size={20} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="type-subtitle text-text-primary">{title}</span>
        <span className="type-caption text-text-muted">{description}</span>
      </span>
    </li>
  );
}

/** TRN-LRN-04 · نتيجة الاختبار — Figma 191:10306 (ناجحة); the failing variant mirrors it with error tones. */
export function QuizResult({
  page,
  attempt,
  attemptNo,
  review,
  pendingAssignments,
}: {
  page: QuizPage;
  attempt: AttemptView;
  attemptNo: number;
  review: QuizReviewItem[];
  pendingAssignments: number;
}) {
  const passed = attempt.passed;
  const correct = review.filter((r) => r.isCorrect).length;
  const total = review.length || page.quiz.questions.length;
  const revealed = review.some((r) => r.correct !== null);
  const next = page.nextModule;
  const nextLesson = next?.lessons[0];
  const moduleHref = page.module ? `/trainee/learn/${page.enrollmentId}/journey?module=${page.module.id}` : `/trainee/learn/${page.enrollmentId}`;
  const canRetake = !page.passed && page.attemptsLeft > 0;

  return (
    <div className="flex flex-col gap-[26px]">
      <section
        aria-labelledby="result-title"
        className={`flex w-full flex-col items-start gap-6 rounded-22 border-2 px-5 py-6 sm:flex-row sm:items-center sm:px-7 ${
          passed ? "border-state-success bg-state-success-bg" : "border-state-error bg-state-error-bg"
        }`}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <ul className="flex flex-wrap items-center gap-2">
            <li className="flex items-center gap-1.5 rounded-full bg-bg-surface px-3 py-1 type-caption text-text-secondary">
              <Glyph icon={RefreshCw} size={16} />
              {attemptLabel(attemptNo, page.quiz.maxAttempts).replace(/ من .*/, "")}
            </li>
            <li className={`flex items-center gap-1.5 rounded-full bg-bg-surface px-3 py-1 type-caption ${passed ? "text-state-success" : "text-state-error"}`}>
              <Glyph icon={passed ? CircleCheck : CircleX} size={16} />
              {passed ? "اجتزت الاختبار" : "لم تجتز هذه المرة"}
            </li>
          </ul>
          <h2 id="result-title" className="text-[28px] leading-[1.2] font-bold text-text-primary sm:text-[36px]">
            {passed ? `أحسنت — اجتزت ${page.quiz.title}` : `لم تجتز ${page.quiz.title} بعد`}
          </h2>
          <p className="type-body-lg text-text-secondary">
            أجبت على {toArabicDigits(correct)} من {pluralAr(total, ["سؤال واحد", "سؤالين", "أسئلة", "سؤالًا"])} بشكل صحيح
            {passed
              ? next
                ? `. ${moduleLabel(next.position)} «${next.title}» مفتوح الآن.`
                : "."
              : `، ودرجة النجاح ${formatPercent(page.quiz.passPercent)}. ${
                  canRetake ? `لديك ${pluralAr(page.attemptsLeft, ["محاولة واحدة متبقية", "محاولتان متبقيتان", "محاولات متبقية", "محاولة متبقية"])} — راجع دروس المحور ثم أعد المحاولة.` : "استنفدت المحاولات المتاحة — تواصل مع المدرب إن احتجت محاولة إضافية."
                }`}
          </p>
          <div className="flex flex-wrap gap-3">
            {passed ? (
              nextLesson ? (
                <ButtonLink href={nextLesson.href}>ابدأ {moduleLabel(next!.position)}</ButtonLink>
              ) : (
                <ButtonLink href={`/trainee/learn/${page.enrollmentId}`}>العودة إلى محتوى الدورة</ButtonLink>
              )
            ) : canRetake ? (
              <ButtonLink href={`/trainee/learn/quiz/${page.quiz.id}?retake=1`}>أعد المحاولة</ButtonLink>
            ) : (
              <ButtonLink href={`/messages?course=${page.quiz.courseId}`}>راسل المدرب</ButtonLink>
            )}
            <ButtonLink href={passed ? "#review" : moduleHref} variant="outline">
              {passed ? "راجع إجاباتك" : "راجع دروس المحور"}
            </ButtonLink>
          </div>
        </div>
        <ProgressRing percent={attempt.scorePercent} label="نتيجتك في الاختبار" size={110} stroke={12} tone={passed ? "success" : "error"} />
      </section>

      <div className="flex w-full flex-col gap-[26px] lg:flex-row lg:items-start">
        <section id="review" aria-labelledby="review-title" className="flex min-w-0 flex-1 scroll-mt-28 flex-col gap-3 rounded-22 border border-border-default bg-bg-card p-5 shadow-card sm:p-6">
          <h2 id="review-title" className="type-h3 text-text-primary">
            مراجعة إجاباتك
          </h2>
          {!revealed && (
            <p className="rounded-12 bg-bg-page px-4 py-3 type-caption text-text-secondary">تظهر الإجابات الصحيحة بعد اجتياز الاختبار أو استنفاد المحاولات.</p>
          )}
          <ol className="flex flex-col gap-3">
            {review.map((r, i) => (
              <li key={r.id} className={`flex flex-col gap-1.5 rounded-12 px-4 py-3 ${r.isCorrect ? "bg-bg-page" : "bg-state-error-bg"}`}>
                <div className="flex items-start gap-3">
                  <p className="min-w-0 flex-1 type-small text-text-primary">
                    <span className="tabular-nums">{toArabicDigits(String(i + 1).padStart(2, "0"))}</span> {r.text}
                  </p>
                  <span className={`flex shrink-0 items-center gap-1.5 rounded-full bg-bg-surface px-2.5 py-1 type-caption ${r.isCorrect ? "text-state-success" : "text-state-error"}`}>
                    <Glyph icon={r.isCorrect ? CircleCheck : CircleX} size={16} />
                    {r.isCorrect ? "صحيحة" : r.chosen === null ? "بلا إجابة" : "خاطئة"}
                  </span>
                </div>
                {!r.isCorrect && r.chosen !== null && <p className="type-caption text-text-secondary">إجابتك: {optionText(r, r.chosen)}</p>}
                {!r.isCorrect && r.correct !== null && <p className="type-caption text-state-error">الإجابة الصحيحة: {optionText(r, r.correct)}</p>}
              </li>
            ))}
          </ol>
        </section>

        <aside aria-label="تفاصيل النتيجة وما التالي" className="flex w-full flex-col gap-5 lg:w-[380px] lg:shrink-0">
          <section aria-labelledby="details-title" className="flex flex-col gap-4 rounded-22 border border-border-default bg-bg-card p-5 shadow-card sm:p-6">
            <h2 id="details-title" className="type-h3 text-text-primary">
              تفاصيل النتيجة
            </h2>
            <dl className="flex flex-col gap-4">
              <Row label="الدرجة" value={`${toArabicDigits(correct)} من ${toArabicDigits(total)}`} />
              <Row label="النسبة" value={formatPercent(attempt.scorePercent)} tone={passed ? "success" : "error"} />
              <Row label="درجة النجاح" value={formatPercent(page.quiz.passPercent)} />
              <Row label="المحاولة" value={attemptLabel(attemptNo, page.quiz.maxAttempts).replace("المحاولة ", "")} />
            </dl>
          </section>
          <section aria-labelledby="next-title" className="flex flex-col gap-4 rounded-22 border border-border-default bg-bg-card p-5 shadow-card sm:p-6">
            <h2 id="next-title" className="type-h3 text-text-primary">
              ما التالي؟
            </h2>
            <ul className="flex flex-col gap-3">
              {passed && next && (
                <NextItem icon={Unlock} tone="success" title={`فُتح ${moduleLabel(next.position)}`} description={`${next.title} · ${pluralAr(next.total, ["درس واحد", "درسان", "دروس", "درسًا"])}`} />
              )}
              {!passed && canRetake && (
                <NextItem icon={RefreshCw} tone="brand" title="أعد المحاولة بعد المراجعة" description={`تحتاج ${formatPercent(page.quiz.passPercent)} على الأقل للاجتياز.`} />
              )}
              {pendingAssignments > 0 && (
                <NextItem
                  icon={ClipboardList}
                  tone="warning"
                  title={pendingAssignments === 1 ? "واجب عملي بانتظارك" : `${toArabicDigits(pendingAssignments)} واجبات بانتظارك`}
                  description="في هذه الدورة — لم يُسلَّم بعد"
                />
              )}
              <NextItem icon={Trophy} tone="brand" title="الشهادة" description="تصدر بعد مشاهدة ١٠٠٪ من دروس الدورة." />
            </ul>
            {pendingAssignments > 0 && (
              <ButtonLink href="/trainee/assignments" variant="outline" size="s" fullWidth>
                اذهب إلى الواجبات
              </ButtonLink>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
