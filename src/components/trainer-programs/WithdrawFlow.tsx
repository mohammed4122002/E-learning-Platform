"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ChevronLeft, CircleCheck, CircleX, FileText, Hourglass, Info, LoaderCircle, OctagonX, Pencil, TriangleAlert } from "lucide-react";
import { withdrawReview } from "@/app/(trainer)/trainer/programs/actions";
import { FlowPanel, FlowRow } from "@/components/trainer-programs/FlowPanel";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Glyph } from "@/components/ui/Icon";

type Stage = "confirm" | "pending" | "success" | "failed";

/**
 * TRR-PRG-08 · سحب الطلب — confirm 454:27489 · pending 454:27755 · success 454:28000 · fail 454:28258.
 * `decision` is the current server-side state (after a refresh it tells why the withdrawal failed).
 */
export function WithdrawFlow({
  programId,
  reference,
  underReview,
  withdrawn = false,
  submittedAgo,
  daysLeftText,
  decision,
}: {
  programId: string;
  reference: string;
  underReview: boolean;
  withdrawn?: boolean;
  submittedAgo: string;
  daysLeftText: string;
  decision: "approved" | "needs_changes" | "rejected" | "draft" | null;
}) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>(underReview ? "confirm" : withdrawn ? "success" : "failed");
  const [message, setMessage] = useState<string | null>(null);
  const [, start] = useTransition();

  function confirm() {
    setStage("pending");
    start(async () => {
      const res = await withdrawReview(programId);
      if (res.ok) setStage("success");
      else {
        setMessage(res.code === "review_already_decided" ? null : res.message);
        setStage("failed");
      }
      router.refresh();
    });
  }

  if (stage === "confirm") {
    return (
      <FlowPanel tone="warning" icon={TriangleAlert} title="تسحب الطلب من المراجعة؟" subtitle={`الطلب قيد المراجعة منذ ${submittedAgo} — ${daysLeftText}.`}>
        <ul className="flex flex-col gap-3">
          <FlowRow icon={Hourglass} tone="warning" title="يتوقف الدور في طابور المراجعة" body="عند إعادة الإرسال يبدأ الطلب من جديد — لا يعود لمكانه." />
          <FlowRow icon={Pencil} title="يعود البرنامج مسودة قابلة للتعديل" body="تعدّل ما تشاء ثم تعيد الإرسال." />
          <FlowRow icon={CircleCheck} tone="success" title="لا يضيع شيء من عملك" body="المحتوى والأهداف والتسعير محفوظة كما هي." />
          <FlowRow icon={Info} tone="info" title="ملاحظات المراجع تبقى ظاهرة" body="إن كان الفريق كتب ملاحظة قبل السحب فستراها." />
        </ul>
        <Button size="l" fullWidth onClick={confirm}>
          نعم — اسحب الطلب
        </Button>
        <ButtonLink href={`/trainer/programs/${programId}/review`} variant="outline" size="l" fullWidth>
          تراجع — أبقِ الطلب في المراجعة
        </ButtonLink>
      </FlowPanel>
    );
  }

  if (stage === "pending") {
    return (
      <FlowPanel tone="info" icon={LoaderCircle} spinning title="جارٍ سحب الطلب…" subtitle="لحظات — نحدّث حالة الطلب ونعيد البرنامج مسودة.">
        <div role="progressbar" aria-label="سحب الطلب" aria-busy className="h-2.5 w-full overflow-hidden rounded-full bg-border-default">
          <div className="h-full w-1/3 animate-pulse rounded-full bg-action-accent" />
        </div>
        <ul className="flex flex-col gap-3">
          {["إيقاف المراجعة", "إعادة البرنامج مسودة", "إشعار فريق المراجعة"].map((t) => (
            <li key={t} className="flex items-center gap-3 rounded-12 bg-state-info-bg px-3.5 py-3.5">
              <span className="flex size-9 items-center justify-center rounded-8 bg-bg-surface text-state-info">
                <LoaderCircle aria-hidden size={20} strokeWidth={1.4} absoluteStrokeWidth className="animate-[tg-spin_0.9s_linear_infinite]" />
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="type-small text-state-info">{t}</span>
                <span className="type-caption text-text-secondary">جارٍ</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="text-center type-caption text-state-info">لا تغلق النافذة حتى اكتمال العملية.</p>
      </FlowPanel>
    );
  }

  if (stage === "success") {
    return (
      <FlowPanel tone="success" icon={CircleCheck} title="سُحب الطلب — البرنامج مسودة الآن" subtitle="يمكنك التعديل بحرّية. عند الانتهاء أعد الإرسال للاعتماد.">
        <div className="flex items-center justify-center gap-3 rounded-12 bg-state-success-bg px-4 py-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-bg-surface px-2.5 py-[5px] type-caption text-state-info">
            <Glyph icon={Hourglass} size={16} />
            قيد المراجعة
          </span>
          <Glyph icon={ChevronLeft} size={16} className="text-text-muted" />
          <span className="inline-flex items-center gap-1.5 rounded-full bg-bg-surface px-2.5 py-[5px] type-caption text-text-muted">
            <Glyph icon={FileText} size={16} />
            مسودة
          </span>
        </div>
        <p dir="ltr" className="text-end font-mono text-[13px] text-text-muted">
          {reference}
        </p>
        <ButtonLink href={`/trainer/programs/${programId}/edit/basics`} size="l" fullWidth>
          افتح المحرّر وعدّل
        </ButtonLink>
        <ButtonLink href="/trainer/programs" variant="outline" size="l" fullWidth>
          عُد لبرامجي
        </ButtonLink>
      </FlowPanel>
    );
  }

  const decided = decision === "approved" ? "معتمد ✓" : decision === "needs_changes" ? "يحتاج تعديل" : decision === "rejected" ? "مرفوض" : null;
  return (
    <FlowPanel
      tone="error"
      icon={OctagonX}
      title="تعذّر سحب الطلب"
      subtitle={message ?? (decided ? "صدر قرار المراجعة قبل ثوانٍ من ضغطك — لم يعد السحب ممكنًا." : "لا يوجد طلب قيد المراجعة لهذا البرنامج الآن.")}
    >
      {decided && (
        <FlowRow
          icon={decision === "approved" ? CircleCheck : CircleX}
          tone={decision === "approved" ? "success" : "warning"}
          title={`القرار: ${decided}`}
          body={decision === "approved" ? "برنامجك اجتاز المراجعة وأصبح جاهزًا للنشر." : decision === "needs_changes" ? "المراجع طلب تعديل حقول محددة — عدّلها وأعد الإرسال." : "قرار نهائي لهذه النسخة — يمكنك إنشاء نسخة جديدة."}
        />
      )}
      <FlowRow
        icon={Info}
        tone="info"
        title="ماذا لو أردت التعديل؟"
        body={decision === "approved" ? "البرنامج المعتمد لا يُعدَّل مباشرة — أنشئ نسخة جديدة وعدّلها بحرّية." : "افتح نتيجة المراجعة لترى الخطوة التالية."}
      />
      <ButtonLink href={`/trainer/programs/${programId}/review`} size="l" fullWidth>
        اعرض نتيجة المراجعة
      </ButtonLink>
      <Link href="/trainer/programs" className="self-center rounded-8 py-2 type-subtitle text-text-brand hover:underline focus-ring">
        أغلق
      </Link>
    </FlowPanel>
  );
}
