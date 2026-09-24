import { ButtonLink } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Data";
import { formatRelative, toArabicDigits } from "@/lib/format";
import type { GradeState, GradingRow } from "@/lib/data/trainer-grading";
import { RemindButton } from "./RemindButton";

/* TRR-CRS-11 · قائمة التسليمات (444:22796). */

const n = toArabicDigits;

export const daysWord = (d: number) => (d === 1 ? "يومًا" : d === 2 ? "يومين" : d <= 10 ? `${n(d)} أيام` : `${n(d)} يومًا`);

/** «سلّم قبل ٣ أيام · متأخر يومًا» / «سلّم في الموعد» / «سلّم قبل الموعد بيومين». */
export function timingLabel(submittedAt: string, lateDays: number | null, withWhen = true): string {
  if (lateDays === null) return `سلّم ${formatRelative(submittedAt)}`;
  if (lateDays > 0) return `${withWhen ? `سلّم ${formatRelative(submittedAt)} · ` : ""}متأخر ${daysWord(lateDays)}${withWhen ? "" : " عن الموعد"}`;
  if (lateDays === 0) return "سلّم في الموعد";
  const d = -lateDays;
  return `سلّم قبل الموعد ${d === 1 ? "بيوم" : d === 2 ? "بيومين" : `بـ${n(d)} أيام`}`;
}

const ROW: Record<GradeState, string> = {
  pending: "bg-state-error-bg border border-state-error",
  flagged: "bg-state-warning-bg",
  graded: "bg-bg-page",
  missing: "bg-bg-disabled",
};

export function SubmissionRow({ r, base, max, assignmentId, courseId, locked }: { r: GradingRow; base: string; max: number; assignmentId: string; courseId: string; locked: boolean }) {
  const href = r.submissionId ? `${base}/${r.submissionId}` : null;
  return (
    <li className={`flex flex-wrap items-center gap-4 rounded-16 px-4 py-4 sm:flex-nowrap sm:px-5 sm:py-5 ${ROW[r.state]}`}>
      <Avatar name={r.name} size="m" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="type-h4 text-text-primary">{r.name}</span>
        <span className="type-small text-text-muted">{r.submittedAt ? timingLabel(r.submittedAt, r.lateDays) : "لم يسلّم"}</span>
      </div>
      <div className="flex w-24 shrink-0 flex-col items-center gap-1 text-center">
        {r.state === "pending" && <span className="type-h4 font-medium! text-state-error">لم يبدأ</span>}
        {r.state === "flagged" && <span className="type-h4 font-medium! text-state-warning">{r.draftScore === null ? "مسودة" : `${n(r.draftScore)} من ${n(max)}`}</span>}
        {r.state === "graded" && <span className="type-h4 font-medium! text-state-success">{`${n(r.score ?? 0)} من ${n(max)}`}</span>}
        {r.state === "missing" && (
          <>
            <span className="type-h4 text-text-secondary">—</span>
            <span className="type-small text-text-muted">لم يسلّم</span>
          </>
        )}
      </div>
      <div className="w-full shrink-0 sm:w-[114px]">
        {r.state === "pending" && href && (
          <ButtonLink href={href} size="m" fullWidth disabled={locked}>
            قيّم الآن
          </ButtonLink>
        )}
        {r.state === "flagged" && href && (
          <ButtonLink href={href} variant="outline" size="m" fullWidth className="bg-bg-surface">
            تحتاج مراجعة
          </ButtonLink>
        )}
        {r.state === "graded" && href && (
          <ButtonLink href={href} variant="outline" size="m" fullWidth className="bg-bg-surface">
            اعرض
          </ButtonLink>
        )}
        {r.state === "missing" && <RemindButton courseId={courseId} assignmentId={assignmentId} traineeId={r.traineeId} name={r.name} disabled={locked} />}
      </div>
    </li>
  );
}
