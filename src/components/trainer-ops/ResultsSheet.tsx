"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { Award, CircleAlert, CircleCheck, ClipboardCheck, Hourglass, Lock, Star, Target, User } from "lucide-react";
import { Avatar } from "@/components/ui/Data";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Feedback";
import { Glyph } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { approveResults, saveResults } from "@/lib/actions/trainer-ops";
import { toArabicDigits } from "@/lib/format";
import type { Blocker, ResultRow } from "@/lib/data/trainer-results";
import { MiniPill, Pct, toneText, type OpsTone } from "./parts";

/* TRR-RES-01 · رصد النتائج (276:5002). */

const n = toArabicDigits;
const countWord = (k: number) => (k === 1 ? "أمر واحد يمنع" : k === 2 ? "أمران يمنعان" : k === 3 ? "ثلاثة أمور تمنع" : `${n(k)} أمور تمنع`);

type BlockerView = { title: string; body: string; href: string; cta: string };

export function ResultsSheet({
  courseId,
  rows,
  blockers,
  approved,
  heroBody,
  passRules,
  names,
}: {
  courseId: string;
  rows: ResultRow[];
  blockers: Blocker[];
  approved: boolean;
  heroBody: string;
  passRules: { attendance: boolean; passScore: number | null; maxScore: number | null };
  names: Record<string, string>;
}) {
  const [outcomes, setOutcomes] = useState<Record<string, "passed" | "failed">>(
    Object.fromEntries(rows.filter((r) => r.overridden).map((r) => [r.enrollmentId, r.outcome === "passed" ? "passed" : "failed"])),
  );
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<"calc" | "draft" | "approve" | null>(null);
  const toast = useToast();
  const router = useRouter();
  const base = `/trainer/courses/${courseId}`;

  // Figma 276:5002 order: sessions → missing results → ungraded work.
  const order = { sessions_pending: 0, attendance_unrecorded: 1, results_missing: 2, submissions_ungraded: 3 } as const;
  const views: BlockerView[] = [...blockers].sort((a, b) => order[a.key] - order[b.key]).map((b) => {
    if (b.key === "sessions_pending")
      return { title: b.count === 1 ? "جلسة لم تنتهِ بعد" : `${n(b.count)} جلسات لم تنتهِ بعد`, body: "تُعتمد النتائج بعد انتهاء آخر جلسة في الدورة.", href: `${base}/attendance`, cta: "اعرض الجدول" };
    if (b.key === "attendance_unrecorded") {
      const s = b.sessions[0];
      return {
        title: b.count === 1 ? "جلسة غير مرصودة" : `${n(b.count)} جلسات غير مرصودة`,
        body: `الجلسة ${n(s?.position ?? 0)} لم يُرصد حضورها – النتيجة تعتمد على نسبة الحضور.`,
        href: `${base}/attendance/${s?.id}`,
        cta: `ارصد الجلسة ${n(s?.position ?? 0)}`,
      };
    }
    if (b.key === "submissions_ungraded")
      return {
        title: b.count === 1 ? "واجب غير مقيَّم" : `${n(b.count)} واجبات غير مقيَّمة`,
        body: `${b.count === 1 ? "واجب بانتظار" : b.count === 2 ? "واجبان بانتظار" : `${n(b.count)} واجبات بانتظار`} تقييمك ${b.count === 1 ? "يؤثر" : b.count === 2 ? "يؤثران" : "تؤثر"} على الدرجة النهائية.`,
        href: `${base}/assignments/${b.items[0]?.assignment_id}/submissions`,
        cta: "قيّم الواجبات",
      };
    const who = b.trainees.slice(0, 3).map((t) => names[t] ?? "متدرب").join(" · ");
    return { title: b.count === 1 ? "نتيجة ناقصة" : `${n(b.count)} نتائج ناقصة`, body: `${who}${b.count > 3 ? " …" : ""}.`, href: "#sheet", cta: "اذهب لأول ناقص" };
  });
  const hardBlockers = blockers.filter((b) => b.key !== "results_missing").length;

  const run = (kind: "calc" | "draft" | "approve") =>
    start(async () => {
      setError(null);
      setBusy(kind);
      const res = kind === "approve" ? await approveResults(courseId, outcomes) : await saveResults(courseId, kind === "calc" ? {} : outcomes, kind === "calc");
      setBusy(null);
      if (!res.ok) {
        setError(res.message);
        setConfirm(false);
        return;
      }
      if (kind === "calc") setOutcomes({});
      toast("success", kind === "approve" ? "اعتُمدت النتائج نهائيًا." : kind === "calc" ? "حُسبت النتائج من الحضور والواجبات." : "حُفظت النتائج كمسودة.");
      if (kind === "approve") router.push(`${base}/results`);
      else router.refresh();
    });

  const decision = (r: ResultRow): "passed" | "failed" => outcomes[r.enrollmentId] ?? (r.outcome === "passed" ? "passed" : "failed");
  const complete = rows.filter((r) => r.saved).length;

  return (
    <div className="flex flex-col gap-6">
      <section className="flex w-full flex-col items-start gap-4 rounded-22 border-2 border-state-warning bg-state-warning-bg px-5 py-6 sm:flex-row sm:items-center sm:gap-6 sm:px-7">
        <span className="flex size-16 shrink-0 items-center justify-center rounded-16 bg-bg-surface text-state-warning">
          <Glyph icon={ClipboardCheck} size={32} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <MiniPill icon={CircleCheck} tone="brand">
              {n(complete)} من {n(rows.length)} مكتملة
            </MiniPill>
            <MiniPill icon={CircleAlert} tone={approved ? "success" : "warning"}>
              {approved ? "معتمدة" : "مسودة · لم تُعتمد"}
            </MiniPill>
          </div>
          <h2 className="text-[28px] leading-[1.2] font-bold text-text-primary sm:text-[36px]">رصد نتائج الدورة</h2>
          <p className="type-body-lg text-text-secondary">{heroBody}</p>
        </div>
        <Button size="l" className="w-full sm:w-auto" disabled={approved || hardBlockers > 0} onClick={() => setConfirm(true)}>
          اعتمد النتائج نهائيًا
        </Button>
      </section>

      {error && <Alert tone="error" title={error} />}

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          {views.length > 0 && !approved && (
            <section aria-labelledby="block-title" className="flex flex-col gap-4 rounded-22 border-2 border-state-error bg-state-error-bg p-5">
              <h2 id="block-title" className="flex items-center gap-2 type-h3 text-state-error">
                <Glyph icon={CircleAlert} size={20} />
                {countWord(views.length)} الاعتماد
              </h2>
              <ul className="flex flex-col gap-3">
                {views.map((b) => (
                  <li key={b.title} className="flex flex-wrap items-center gap-4 rounded-12 bg-bg-surface px-3.5 py-3">
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="type-subtitle text-state-error">{b.title}</span>
                      <span className="type-caption text-text-secondary">{b.body}</span>
                    </span>
                    <ButtonLink href={b.href} size="s" className="min-w-[120px]">
                      {b.cta}
                    </ButtonLink>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="flex flex-col gap-3 rounded-16 bg-bg-page p-4 sm:flex-row sm:items-center">
            <p className="min-w-0 flex-1 type-caption text-text-secondary">يمكنك الحساب الآلي ثم تعديل أي نتيجة يدويًا قبل الاعتماد.</p>
            <Button variant="secondary" disabled={approved} loading={busy === "calc"} onClick={() => run("calc")}>
              احسب من الحضور والواجبات
            </Button>
            <ButtonLink href={`${base}/results/export`} variant="outline" prefetch={false}>
              صدّر كشف النتائج
            </ButtonLink>
          </div>

          <div id="sheet" className="overflow-x-auto rounded-16 border border-border-default bg-bg-card">
            <table className="w-full min-w-[560px] text-start">
              <thead className="bg-bg-page">
                <tr className="type-caption text-text-muted">
                  <th scope="col" className="px-4 py-3 text-start font-normal">المتدرب</th>
                  <th scope="col" className="px-3 py-3 text-start font-normal">النتيجة</th>
                  <th scope="col" className="px-3 py-3 text-start font-normal">الدرجة</th>
                  <th scope="col" className="px-3 py-3 text-start font-normal">الحضور</th>
                  <th scope="col" className="px-4 py-3 text-start font-normal">القرار</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const d = decision(r);
                  const attTone: OpsTone = r.attendance === null ? "neutral" : r.attendance >= 75 ? "success" : "error";
                  return (
                    <tr key={r.enrollmentId} className="border-t border-border-divider">
                      <td className="px-4 py-3.5">
                        <span className="flex items-center gap-3">
                          <Avatar name={r.name} />
                          <span className="type-subtitle text-text-primary">{r.name}</span>
                        </span>
                      </td>
                      <td className="px-3 py-3.5 type-subtitle text-text-primary">
                        <Pct value={r.final} />
                      </td>
                      <td className="px-3 py-3.5 type-small text-text-primary">{r.maxPoints === null ? "—" : `${n(r.points ?? 0)}/${n(r.maxPoints)}`}</td>
                      <td className={`px-3 py-3.5 type-small ${toneText[attTone]}`}>{r.attendance === null ? "—" : <Pct value={r.attendance} />}</td>
                      <td className="px-4 py-3.5">
                        <div role="radiogroup" aria-label={`قرار ${r.name}`} className="flex gap-2">
                          {(["passed", "failed"] as const).map((o) => (
                            <button
                              key={o}
                              type="button"
                              role="radio"
                              aria-checked={d === o}
                              disabled={approved}
                              onClick={() => setOutcomes((x) => ({ ...x, [r.enrollmentId]: o }))}
                              className={`h-10 cursor-pointer rounded-8 px-3.5 type-small focus-ring disabled:cursor-not-allowed ${
                                d === o ? (o === "passed" ? "bg-state-success text-text-on-brand" : "bg-state-error text-text-on-brand") : "border border-border-default bg-bg-surface text-text-secondary"
                              }`}
                            >
                              {o === "passed" ? "اجتاز" : "لم يجتز"}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex w-full shrink-0 flex-col gap-5 lg:w-[380px]">
          <section aria-labelledby="rule-title" className="flex flex-col gap-4 rounded-22 border border-border-default bg-bg-card p-6 shadow-card">
            <h2 id="rule-title" className="type-h3 text-text-primary">
              قاعدة الاجتياز
            </h2>
            <p className="type-caption text-text-muted">مأخوذة من البرنامج ولا تُعدَّل على مستوى الدورة.</p>
            <ul className="flex flex-col gap-3">
              {passRules.attendance && <RuleValue icon={CircleCheck} label="حضور لا يقل عن" value="٧٥٪" />}
              {passRules.passScore !== null && passRules.maxScore !== null && (
                <RuleValue icon={CircleCheck} label="درجة الواجب لا تقل عن" value={`${n(passRules.passScore)} من ${n(passRules.maxScore)}`} />
              )}
              <RuleValue icon={Target} label="الدرجة النهائية لا تقل عن" value="٦٠٪" />
            </ul>
          </section>

          <section aria-labelledby="what-title" className="flex flex-col gap-4 rounded-22 border-2 border-state-error bg-state-error-bg p-5">
            <h2 id="what-title" className="type-h3 text-state-error">
              ماذا يحدث عند الاعتماد؟
            </h2>
            <ul className="flex flex-col gap-2.5">
              <WhatRow icon={Award} tone="success">يُفتح إصدار شهادات المجتازين</WhatRow>
              <WhatRow icon={User} tone="brand">تظهر النتيجة في ملف كل متدرب</WhatRow>
              <WhatRow icon={Star} tone="warning">يُفتح تقييم الدورة للمتدربين</WhatRow>
              <WhatRow icon={Hourglass} tone="info">يبدأ عدّ مهلة الاسترداد قبل تحرير إيرادك</WhatRow>
              <WhatRow icon={Lock} tone="error">لا يمكن تعديل النتائج بعدها إلا بطلب من الإدارة</WhatRow>
            </ul>
          </section>

          <section aria-labelledby="save-title" className="flex flex-col gap-4 rounded-22 border border-border-default bg-bg-card p-6 shadow-card">
            <h2 id="save-title" className="type-h3 text-text-primary">
              حفظ
            </h2>
            <Button size="l" fullWidth disabled={approved} loading={busy === "draft"} onClick={() => run("draft")}>
              احفظ كمسودة
            </Button>
            <Button size="l" fullWidth variant="outline" disabled={approved || hardBlockers > 0} onClick={() => setConfirm(true)}>
              اعتمد النتائج نهائيًا
            </Button>
            {!approved && hardBlockers > 0 && <p className="type-caption text-state-error">الاعتماد يُفتح بعد إغلاق الأمور المذكورة أعلاه.</p>}
          </section>
        </div>
      </div>

      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title="اعتماد النتائج نهائيًا"
        destructive
        footer={
          <>
            <Button onClick={() => run("approve")} loading={pending && busy === "approve"}>
              اعتمد النتائج
            </Button>
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              تراجع
            </Button>
          </>
        }
      >
        {`سيُعتمد ${n(rows.filter((r) => decision(r) === "passed").length)} ناجحًا و${n(rows.filter((r) => decision(r) === "failed").length)} غير مجتاز. الاعتماد نهائي ويصل إشعار النتيجة لكل متدرب.`}
      </Modal>
    </div>
  );
}

function RuleValue({ icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <li className="flex items-center gap-2.5 rounded-12 bg-bg-page px-3.5 py-3">
      <Glyph icon={icon} size={16} className="text-text-muted" />
      <span className="min-w-0 flex-1 type-small text-text-primary">{label}</span>
      <span className="type-subtitle text-state-success">{value}</span>
    </li>
  );
}

function WhatRow({ icon, tone, children }: { icon: LucideIcon; tone: OpsTone; children: string }) {
  return (
    <li className="flex items-center gap-2.5 rounded-8 bg-bg-surface px-3 py-2.5">
      <Glyph icon={icon} size={16} className={toneText[tone]} />
      <span className="min-w-0 flex-1 type-small text-text-primary">{children}</span>
    </li>
  );
}
