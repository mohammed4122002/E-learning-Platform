"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { gradeSubmission } from "@/lib/actions/trainer-ops";
import { toArabicDigits } from "@/lib/format";
import { toLatinDigits } from "@/lib/validation/trainer-ops";

/*
 * «تقييمك» (444:23127) and its saved state (444:23412): rubric scores → total, feedback, and the three actions
 * «احفظ وانتقل للتالي» · «احفظ فقط» · «علّمها للمراجعة لاحقًا». The grade reaches the trainee only on save.
 */

const n = toArabicDigits;
type Item = { id: string; label: string; max: number };

export function GradeForm({
  courseId,
  submissionId,
  rubric,
  maxScore,
  initialScores,
  initialFeedback,
  graded,
  locked,
  selfHref,
  nextHref,
  nextName,
}: {
  courseId: string;
  submissionId: string;
  rubric: Item[];
  maxScore: number;
  initialScores: Record<string, number>;
  initialFeedback: string;
  graded: boolean;
  /** Results approved: grades are final. */
  locked: boolean;
  selfHref: string;
  nextHref: string | null;
  nextName: string | null;
}) {
  const items: Item[] = useMemo(() => (rubric.length ? rubric : [{ id: "total", label: "الدرجة", max: maxScore }]), [rubric, maxScore]);
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(items.map((i) => [i.id, initialScores[i.id] === undefined ? "" : n(initialScores[i.id])])),
  );
  const [feedback, setFeedback] = useState(initialFeedback);
  const [editing, setEditing] = useState(!graded);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"next" | "save" | "flag" | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();

  const parsed = useMemo(
    () =>
      items.map((i) => {
        const raw = toLatinDigits(values[i.id] ?? "").replace("٫", ".").trim();
        const v = raw === "" ? null : Number(raw);
        const bad = v === null || Number.isNaN(v) || v < 0 || v > i.max;
        return { ...i, v, bad, empty: raw === "" };
      }),
    [items, values],
  );
  const total = parsed.reduce((a, p) => a + (p.v && !Number.isNaN(p.v) ? p.v : 0), 0);
  const max = items.reduce((a, i) => a + i.max, 0);
  const pct = max ? Math.round((total / max) * 100) : 0;
  const readOnly = !editing || locked;
  const success = graded && !editing;

  const submit = (kind: "next" | "save" | "flag") => {
    setError(null);
    const invalid = parsed.find((p) => p.bad);
    if (invalid) {
      setError(invalid.empty ? `أدخل درجة «${invalid.label}».` : `درجة «${invalid.label}» بين ٠ و${n(invalid.max)}.`);
      return;
    }
    setBusy(kind);
    start(async () => {
      const res = await gradeSubmission({
        courseId,
        submissionId,
        scores: Object.fromEntries(parsed.map((p) => [p.id, p.v as number])),
        feedback,
        flag: kind === "flag",
      });
      setBusy(null);
      if (!res.ok) {
        setError(res.message);
        return;
      }
      if (kind === "flag") {
        toast("warning", "علّمتها للمراجعة — بقيت في قائمة انتظارك ولم تُرسل الدرجة.");
        router.push(nextHref ?? selfHref.replace(/\/[^/]+$/, ""));
        return;
      }
      if (kind === "next" && nextHref) {
        toast("success", "حُفظ التقييم ووصلت الدرجة للمتدرب.");
        router.push(nextHref);
        return;
      }
      setEditing(false);
      router.replace(`${selfHref}?saved=1`, { scroll: false });
      router.refresh();
    });
  };

  return (
    <section
      aria-labelledby="grade-title"
      className={`flex w-full flex-col gap-5 rounded-22 border-2 bg-bg-card p-5 shadow-card sm:p-6 ${success ? "border-state-success" : "border-action-primary"}`}
    >
      <div className="flex flex-col gap-2">
        <h2 id="grade-title" className="type-h2 text-text-primary">
          تقييمك
        </h2>
        <p className="type-caption text-text-muted">
          {rubric.length ? `وزّع الدرجة على ${rubric.length === 3 ? "معايير الواجب الثلاثة" : "معايير الواجب"} – يرى المتدرب التوزيع لا الدرجة فقط.` : "أدخل درجة الواجب — تصل للمتدرب مع ملاحظتك."}
        </p>
      </div>
      <ul className="flex flex-col gap-4">
        {parsed.map((p) => (
          <li key={p.id} className="flex items-center gap-3 rounded-16 bg-bg-page px-4 py-4">
            <label htmlFor={`score-${p.id}`} className="min-w-0 flex-1 type-subtitle font-bold! text-text-primary">
              {p.label}
            </label>
            <input
              id={`score-${p.id}`}
              inputMode="decimal"
              autoComplete="off"
              disabled={readOnly}
              value={values[p.id] ?? ""}
              aria-invalid={error && p.bad ? true : undefined}
              onChange={(e) => setValues((s) => ({ ...s, [p.id]: e.target.value }))}
              className={`h-12 w-24 rounded-12 border-[1.5px] px-3 text-start type-body outline-none sm:w-28 ${
                readOnly ? "border-border-default bg-bg-disabled text-text-muted" : error && p.bad ? "border-state-error bg-bg-surface" : "border-border-default bg-bg-surface text-text-primary focus:border-2 focus:border-action-primary"
              }`}
            />
            <span className="w-11 shrink-0 type-small text-text-muted">{`من ${n(p.max)}`}</span>
          </li>
        ))}
      </ul>
      <div className={`flex flex-wrap items-center justify-between gap-3 rounded-16 px-5 py-5 ${success ? "bg-state-success-bg" : "bg-bg-brand-tint"}`} aria-live="polite">
        <span className="type-body text-text-secondary">{`الدرجة الإجمالية · ${n(pct)}٪`}</span>
        <span className={`text-[32px] leading-[1.2] font-bold ${success ? "text-state-success" : "text-text-brand"}`}>{`${n(Math.round(total * 10) / 10)} من ${n(max)}`}</span>
      </div>
      <Textarea label="ملاحظتك للمتدرب" rows={3} value={feedback} disabled={readOnly} maxLength={4000} onChange={(e) => setFeedback(e.target.value)} />
      {error && (
        <p role="alert" className="type-small text-state-error">
          {error}
        </p>
      )}
      {success ? (
        !locked && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {nextHref && (
              <ButtonLink href={nextHref} size="l" className="w-full sm:w-auto sm:min-w-[182px]">
                {nextName ? `قيّم التالي · ${nextName}` : "قيّم التالي"}
              </ButtonLink>
            )}
            <Button variant="outline" size="l" className="w-full sm:w-auto" onClick={() => setEditing(true)}>
              عدّل هذا التقييم
            </Button>
          </div>
        )
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Button size="l" className="w-full sm:w-auto sm:min-w-[162px]" loading={busy === "next"} disabled={pending || locked} onClick={() => submit(nextHref ? "next" : "save")}>
              {nextHref ? "احفظ وانتقل للتالي" : "احفظ"}
            </Button>
            {nextHref && (
              <Button variant="outline" size="l" className="w-full sm:w-auto" loading={busy === "save"} disabled={pending || locked} onClick={() => submit("save")}>
                احفظ فقط
              </Button>
            )}
            {!graded && (
              <Button variant="text" size="l" className="w-full sm:w-auto" loading={busy === "flag"} disabled={pending || locked} onClick={() => submit("flag")}>
                علّمها للمراجعة لاحقًا
              </Button>
            )}
          </div>
          {!graded && <p className="type-caption text-text-muted">«علّمها للمراجعة» تبقيها في قائمة انتظارك ولا ترسل الدرجة للمتدرب.</p>}
        </>
      )}
    </section>
  );
}
