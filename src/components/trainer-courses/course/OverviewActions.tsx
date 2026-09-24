"use client";

import Link from "next/link";
import { useState } from "react";
import { Award, CircleCheck, FileText, MessageSquare } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Glyph } from "@/components/ui/Icon";
import { toArabicDigits } from "@/lib/format";
import { NotifyModal } from "./NotifyModal";

/* TRR-CRS-05 ١ نظرة عامة — «إجراءات الدورة» (334:12805) and «إجراءات حساسة» (334:12850). */

function ActionRow({ icon, title, sub, tone = "page", children }: { icon: LucideIcon; title: string; sub: string; tone?: "page" | "error"; children?: React.ReactNode }) {
  return (
    <div className={`flex items-center gap-3 rounded-12 px-3.5 py-[13px] ${tone === "error" ? "bg-state-error-bg" : "bg-bg-page"}`}>
      <span className={`flex size-10 shrink-0 items-center justify-center rounded-8 bg-bg-surface ${tone === "error" ? "text-state-error" : "text-text-brand"}`}>
        <Glyph icon={icon} size={20} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="type-subtitle text-text-primary">{title}</p>
        <p className="type-caption text-text-muted">{sub}</p>
      </div>
      {children}
    </div>
  );
}

export function OverviewActions({
  courseId,
  today,
  trainees,
  sensitive,
}: {
  courseId: string;
  /** Today's session (attendance to take), or null. */
  today: { label: string } | null;
  trainees: number;
  sensitive: boolean;
}) {
  const [notifyOpen, setNotifyOpen] = useState(false);
  const base = `/trainer/courses/${courseId}`;
  return (
    <>
      <section className="flex flex-col gap-[18px] rounded-22 border border-border-default bg-bg-card p-5 shadow-card sm:p-[26px]">
        <h2 className="type-h2 text-text-primary">إجراءات الدورة</h2>
        <ActionRow icon={CircleCheck} title="رصد حضور اليوم" sub={today ? today.label : "لا جلسة اليوم"} tone={today ? "error" : "page"}>
          <ButtonLink href={`${base}/attendance`} size="s" variant={today ? "primary" : "outline"} className="w-[120px]">
            ارصد الآن
          </ButtonLink>
        </ActionRow>
        <ActionRow icon={MessageSquare} title="أرسل تنبيهًا للمسجّلين" sub="تغيير قاعة · تذكير · ملاحظة">
          <Button size="s" variant="outline" className="w-[120px]" disabled={trainees === 0} onClick={() => setNotifyOpen(true)}>
            أرسل
          </Button>
        </ActionRow>
        <ActionRow icon={FileText} title="صدّر كشوف الدورة" sub="حضور · نتائج · مسجّلون">
          <ButtonLink href={`/trainer/courses/export?ids=${courseId}`} size="s" variant="outline" className="w-[120px]">
            صدّر
          </ButtonLink>
        </ActionRow>
        <Link href={`${base}/certificates`} className="rounded-12 focus-ring">
          <ActionRow icon={Award} title="أصدر الشهادات" sub="بعد اعتماد النتائج" />
        </Link>
      </section>
      {sensitive && (
        <section className="flex flex-col gap-3.5 rounded-22 border-2 border-state-error bg-state-error-bg px-[22px] pt-[22px] pb-6">
          <h2 className="type-h2 text-state-error">إجراءات حساسة</h2>
          <p className="type-body text-text-secondary">تؤثر على {toArabicDigits(trainees)} متدربًا مسجّلًا وعلى إيرادك.</p>
          <ButtonLink href={`${base}/postpone`} size="l" variant="outline" fullWidth>
            أجّل الدورة
          </ButtonLink>
          <ButtonLink href={`${base}/cancel`} size="l" variant="ghost" fullWidth>
            ألغِ الدورة
          </ButtonLink>
        </section>
      )}
      <NotifyModal
        open={notifyOpen}
        onClose={() => setNotifyOpen(false)}
        courseIds={[courseId]}
        title="أرسل تنبيهًا للمسجّلين"
        intro={`يصل التنبيه إلى ${toArabicDigits(trainees)} متدربًا مسجّلًا — داخل المنصة وبالبريد.`}
      />
    </>
  );
}
