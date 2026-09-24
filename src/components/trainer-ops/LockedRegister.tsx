"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { CircleCheck, CircleX, Clock, FileText, Lock, CircleMinus } from "lucide-react";
import { Avatar } from "@/components/ui/Data";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Feedback";
import { Textarea } from "@/components/ui/Field";
import { Glyph } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { requestAttendanceUnlock } from "@/lib/actions/trainer-ops";
import { formatRelative } from "@/lib/format";
import type { Mark, RegisterRow } from "@/lib/data/trainer-attendance";
import { TagPill, toneText, type OpsTone } from "./parts";
import { WhyLockedCard } from "./Attendance";

/* TRR-ATT-01 · رصد الحضور · مقفلة (463:34053). */

const PILL: Record<Mark | "none", { label: string; icon: LucideIcon; tone: OpsTone }> = {
  present: { label: "حاضر", icon: CircleCheck, tone: "success" },
  late: { label: "متأخر", icon: Clock, tone: "warning" },
  excused: { label: "غائب بعذر", icon: FileText, tone: "info" },
  absent: { label: "غائب", icon: CircleX, tone: "error" },
  none: { label: "لم يُرصد", icon: CircleMinus, tone: "neutral" },
};
const tint: Record<OpsTone, string> = {
  success: "bg-state-success-bg",
  warning: "bg-state-warning-bg",
  info: "bg-state-info-bg",
  error: "bg-state-error-bg",
  neutral: "bg-bg-disabled",
  brand: "bg-bg-brand-tint",
};

export function LockedRegister({
  courseId,
  sessionId,
  body,
  rows,
  approved,
  unlockRequestedAt,
  open,
}: {
  courseId: string;
  sessionId: string;
  body: string;
  rows: RegisterRow[];
  approved: boolean;
  unlockRequestedAt: string | null;
  open: { id: string; label: string; left: string }[];
}) {
  const [dialog, setDialog] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const requested = Boolean(unlockRequestedAt);

  const send = () =>
    start(async () => {
      setError(null);
      const res = await requestAttendanceUnlock(courseId, sessionId, reason);
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setDialog(false);
      toast("success", "أُرسل طلب فتح الرصد إلى فريق الدعم.");
      router.refresh();
    });

  const requestButton = (full?: boolean) => (
    <Button size="l" variant={full ? "primary" : "outline"} fullWidth={full} disabled={requested} onClick={() => setDialog(true)}>
      {requested ? "طلب الفتح قيد المراجعة" : "اطلب فتح الرصد"}
    </Button>
  );

  return (
    <div className="flex flex-col gap-6">
      <section className="flex w-full flex-col items-start gap-4 rounded-22 border-2 border-border-default bg-bg-disabled px-5 pt-[30px] pb-8 sm:flex-row sm:items-center sm:gap-6 sm:px-[30px]">
        <span className="flex size-[72px] shrink-0 items-center justify-center rounded-16 bg-bg-surface text-text-muted">
          <Glyph icon={Lock} size={32} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <h2 className="text-[28px] leading-[1.2] font-bold text-text-primary sm:text-[36px]">أُقفل رصد هذه الجلسة</h2>
          <p className="type-body-lg text-text-secondary">{body}</p>
        </div>
        {requestButton()}
      </section>

      {requested && (
        <Alert tone="info" title="طلب فتح الرصد قيد المراجعة">
          أرسلته {formatRelative(unlockRequestedAt as string)} — يراجعه فريق المنصة خلال يوم عمل.
        </Alert>
      )}

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <section aria-labelledby="locked-list" className="flex w-full flex-col gap-5 rounded-22 border border-border-default bg-bg-card p-5 shadow-card sm:p-7">
            <div className="flex flex-wrap items-center gap-3">
              <h2 id="locked-list" className="min-w-0 flex-1 type-h2 text-text-primary">
                ما رُصد في هذه الجلسة
              </h2>
              <TagPill icon={Lock} tone="neutral">
                مقفل — للعرض فقط
              </TagPill>
            </div>
            {!approved && <p className="type-body text-state-error">لم يُعتمد رصد هذه الجلسة قبل الإقفال.</p>}
            <ul className="flex flex-col gap-5">
              {rows.map((r) => {
                const p = PILL[r.mark ?? "none"];
                return (
                  <li key={r.traineeId} className="flex items-center gap-4 rounded-16 bg-bg-page px-[18px] py-[15px]">
                    <Avatar name={r.name} />
                    <span className="min-w-0 flex-1 truncate type-title text-text-primary">{r.name}</span>
                    <span className={`inline-flex shrink-0 items-center gap-[7px] rounded-full px-[11px] py-1.5 type-caption ${tint[p.tone]} ${toneText[p.tone]}`}>
                      <Glyph icon={p.icon} size={16} />
                      {p.label}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
          <WhyLockedCard />
        </div>

        <div className="flex w-full shrink-0 flex-col gap-[22px] lg:w-[400px]">
          <section aria-labelledby="unlock-title" className="flex w-full flex-col gap-5 rounded-22 border border-border-default bg-bg-card p-5 shadow-card sm:p-7">
            <h2 id="unlock-title" className="type-h3 text-text-primary">
              طلب فتح الرصد
            </h2>
            <p className="type-body text-text-secondary">يُقبل الطلب في حالات محددة: عطل تقني · خطأ في التسجيل · ظرف موثَّق.</p>
            {requestButton(true)}
            <p className="type-caption text-text-muted">يصل الطلب لفريق الدعم مع سبب مكتوب منك.</p>
          </section>
          {open.length > 0 && (
            <section aria-labelledby="open-title" className="flex w-full flex-col gap-5 rounded-22 border border-border-default bg-bg-card p-5 shadow-card sm:p-7">
              <h2 id="open-title" className="type-h3 text-text-primary">
                جلسات ما زالت مفتوحة
              </h2>
              <ul className="flex flex-col gap-3">
                {open.map((o) => (
                  <li key={o.id} className="flex items-center gap-3 rounded-12 border-[1.5px] border-state-error bg-state-error-bg px-4 pt-3.5 pb-[15px]">
                    <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                      <span className="type-small text-text-primary">{o.label}</span>
                      <span className="type-caption text-state-error">{o.left}</span>
                    </span>
                    <ButtonLink href={`/trainer/courses/${courseId}/attendance/${o.id}`} size="s" className="w-[120px]">
                      ارصد
                    </ButtonLink>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>

      <Modal
        open={dialog}
        onClose={() => setDialog(false)}
        title="طلب فتح الرصد"
        footer={
          <>
            <Button onClick={send} loading={pending} disabled={reason.trim().length < 10}>
              أرسل الطلب
            </Button>
            <Button variant="ghost" onClick={() => setDialog(false)}>
              إلغاء
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="type-small text-text-secondary">اكتب سببًا واضحًا — يراجعه فريق المنصة خلال يوم عمل.</p>
          {error && <Alert tone="error" title={error} />}
          <Textarea label="سبب الطلب" rows={4} maxLength={1000} value={reason} onChange={(e) => setReason(e.currentTarget.value)} />
        </div>
      </Modal>
    </div>
  );
}
