import { CalendarDays, CircleAlert, CircleCheck, CircleX, ClipboardCheck, Hourglass, Lock } from "lucide-react";
import { Avatar } from "@/components/ui/Data";
import { ButtonLink } from "@/components/ui/Button";
import { Glyph } from "@/components/ui/Icon";
import { formatDayMonth, formatRelative, toArabicDigits } from "@/lib/format";
import type { ResultRow, ResultsView } from "@/lib/data/trainer-results";
import { ConditionRow, OpsCard, Pct, TagPill, toneText, type OpsTone } from "./parts";

/* TRR-CRS-05 · ٧ النتائج (438:20310). */

const n = toArabicDigits;
export const OUTCOME: Record<ResultRow["outcome"], { label: string; tone: OpsTone; icon: typeof CircleCheck }> = {
  passed: { label: "ناجح", tone: "success", icon: CircleCheck },
  below_attendance: { label: "دون حد الحضور", tone: "warning", icon: CircleAlert },
  failed: { label: "راسب", tone: "error", icon: CircleX },
};

export function weightsLabel(v: ResultsView) {
  const parts: [string, number][] = [];
  if (v.sessions.total) parts.push(["حضور", 30]);
  if (v.assignments.total) parts.push(["واجبات", 40]);
  if (v.hasQuizzes) parts.push(["اختبار", 30]);
  const sum = parts.reduce((a, [, w]) => a + w, 0) || 1;
  return parts.map(([l, w]) => `${l} ${n(Math.round((w / sum) * 100))}٪`).join(" · ");
}

export function ConditionsCard({ v, courseId }: { v: ResultsView; courseId: string }) {
  const base = `/trainer/courses/${courseId}`;
  const pending = v.blockers.find((b) => b.key === "sessions_pending");
  const unrec = v.blockers.find((b) => b.key === "attendance_unrecorded");
  const ungraded = v.blockers.find((b) => b.key === "submissions_ungraded");
  const allMet = v.blockers.length === 0 || (v.blockers.length === 1 && v.blockers[0].key === "results_missing");
  return (
    <OpsCard title="شروط اعتماد النتائج" titleId="cond-title" titleSize="h2" className={allMet ? "" : "border-2! border-state-warning!"}>
      <ul className="flex flex-col gap-5">
        <ConditionRow
          icon={CalendarDays}
          tone={pending ? "warning" : "success"}
          title="انتهاء كل الجلسات"
          caption={
            pending && pending.key === "sessions_pending"
              ? `${n(v.sessions.ended)} من ${n(v.sessions.total)}${pending.lastEndsAt ? ` · تنتهي ${formatDayMonth(pending.lastEndsAt)}` : ""}`
              : `${n(v.sessions.total)} من ${n(v.sessions.total)} منتهية`
          }
          action={pending ? <ButtonLink href={`${base}/attendance`} size="s">اعرض الجدول</ButtonLink> : <MetPill />}
        />
        {v.assignments.total > 0 && (
          <ConditionRow
            icon={ClipboardCheck}
            tone={ungraded ? "warning" : "success"}
            title="تقييم كل الواجبات"
            caption={`${n(v.assignments.graded)} من ${n(v.assignments.submissions)} مقيَّم${ungraded ? ` · ${n(ungraded.count)} بانتظارك` : ""}`}
            action={
              ungraded && ungraded.key === "submissions_ungraded" ? (
                <ButtonLink href={`${base}/assignments/${ungraded.items[0]?.assignment_id}/submissions`} size="s">
                  قيّم الآن
                </ButtonLink>
              ) : (
                <MetPill />
              )
            }
          />
        )}
        {v.sessions.total > 0 && (
          <ConditionRow
            icon={CircleCheck}
            tone={unrec ? "warning" : "success"}
            title="رصد كل جلسة منتهية"
            caption={`${n(v.sessions.recorded)} من ${n(v.sessions.ended)} مرصودة`}
            action={
              unrec && unrec.key === "attendance_unrecorded" ? (
                <ButtonLink href={`${base}/attendance/${unrec.sessions[0]?.id}`} size="s">
                  ارصد الآن
                </ButtonLink>
              ) : (
                <MetPill />
              )
            }
          />
        )}
        <ConditionRow icon={CircleCheck} tone="success" title="احتساب الدرجات آليًا" caption={weightsLabel(v)} action={<MetPill />} />
      </ul>
    </OpsCard>
  );
}

function MetPill() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-bg-surface px-2.5 py-[5px] type-caption text-state-success">
      <Glyph icon={CircleCheck} size={16} />
      مستوفى
    </span>
  );
}

export function DistributionCard({ rows }: { rows: ResultRow[] }) {
  const count = (o: ResultRow["outcome"]) => rows.filter((r) => r.outcome === o).length;
  const items: { o: ResultRow["outcome"]; label: string; bg: string }[] = [
    { o: "passed", label: "ناجحون", bg: "bg-state-success-bg" },
    { o: "below_attendance", label: "دون حد الحضور", bg: "bg-state-warning-bg" },
    { o: "failed", label: "راسبون", bg: "bg-state-error-bg" },
  ];
  return (
    <OpsCard title="توزيع النتائج" titleId="dist-title">
      <ul className="flex flex-col gap-4">
        {items.map((i) => (
          <li key={i.o} className={`flex items-center gap-2.5 rounded-12 px-3.5 py-3 ${i.bg} ${toneText[OUTCOME[i.o].tone]}`}>
            <span className="type-subtitle">{n(count(i.o))}</span>
            <span className="type-body">{i.label}</span>
          </li>
        ))}
      </ul>
    </OpsCard>
  );
}

export function ApprovalCard({ v, courseId }: { v: ResultsView; courseId: string }) {
  const base = `/trainer/courses/${courseId}/results`;
  const blocking = v.blockers.filter((b) => b.key !== "results_missing");
  return (
    <OpsCard title="الاعتماد" titleId="appr-title">
      {v.approval ? (
        <>
          <p className="type-body text-state-success">اعتُمدت النتائج {formatRelative(v.approval.approvedAt)} — صدرت نهائية ولا تُعدَّل.</p>
          <ButtonLink href={`/trainer/courses/${courseId}/certificates`} fullWidth size="l">
            اذهب للشهادات
          </ButtonLink>
        </>
      ) : (
        <>
          <p className="type-body text-state-error">الاعتماد نهائي – بعده تصدر الشهادات ولا تُعدَّل النتائج.</p>
          {blocking.length ? (
            <ButtonLink href={`${base}/approve`} size="l" fullWidth disabled>
              اعتمد النتائج
            </ButtonLink>
          ) : (
            <ButtonLink href={`${base}/record`} size="l" fullWidth>
              اعتمد النتائج
            </ButtonLink>
          )}
          {blocking.length > 0 && (
            <p className="type-caption text-state-warning">
              {blocking.length === 1 ? "يُفعّل بعد استيفاء الشرط الناقص." : blocking.length === 2 ? "يُفعّل بعد استيفاء الشرطين الناقصين." : "يُفعّل بعد استيفاء الشروط الناقصة."}
            </p>
          )}
        </>
      )}
      <ButtonLink href={`${base}/export`} variant="outline" size="l" fullWidth prefetch={false}>
        صدّر كشف الدرجات
      </ButtonLink>
    </OpsCard>
  );
}

export function PreliminaryCard({ v }: { v: ResultsView }) {
  return (
    <OpsCard
      title={v.approval ? "النتائج المعتمدة" : "النتائج المبدئية"}
      titleId="pre-title"
      titleSize="h2"
      aside={
        v.approval ? (
          <TagPill icon={Lock} tone="success">
            معتمدة – نهائية
          </TagPill>
        ) : (
          <TagPill icon={Hourglass} tone="warning">
            غير معتمدة – قابلة للتغيير
          </TagPill>
        )
      }
    >
      {v.rows.length === 0 ? (
        <p className="type-small text-text-muted">لا متدربين مسجّلين لاحتساب نتائجهم.</p>
      ) : (
        <ul className="flex flex-col gap-5">
          {v.rows.map((r) => {
            const o = OUTCOME[r.outcome];
            const bg = r.outcome === "passed" ? "bg-bg-page" : r.outcome === "failed" ? "bg-state-error-bg" : "bg-state-warning-bg";
            return (
              <li key={r.enrollmentId} className={`flex flex-wrap items-center gap-4 rounded-16 px-[18px] py-4 ${bg}`}>
                <Avatar name={r.name} />
                <div className="flex min-w-0 flex-1 basis-40 flex-col gap-0.5">
                  <p className="truncate type-title text-text-primary">{r.name}</p>
                  <p className="type-caption text-text-muted">
                    {r.attendance !== null ? <>حضور <Pct value={r.attendance} /></> : "بلا جلسات"}
                    {r.maxPoints !== null && <> · واجبات {n(r.points ?? 0)}/{n(r.maxPoints)}</>}
                  </p>
                </div>
                <span className={`type-h2 ${toneText[o.tone]}`}>
                  <Pct value={r.final} />
                </span>
                <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full bg-bg-surface px-2.5 py-[5px] type-caption ${toneText[o.tone]}`}>
                  <Glyph icon={o.icon} size={16} />
                  {o.label === "ناجح" ? "ناجح" : o.label}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </OpsCard>
  );
}
