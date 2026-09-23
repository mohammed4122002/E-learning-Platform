"use client";

import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Info } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Choice";
import { Alert } from "@/components/ui/Feedback";
import { Textarea } from "@/components/ui/Field";
import { Glyph } from "@/components/ui/Icon";
import { DISPUTE_REASONS } from "@/lib/trainings";
import { initialFormState } from "@/lib/validation/trainings";
import { openDispute, type DisputeFormState } from "@/app/(workspace)/trainee/disputes/actions";
import { ChoiceChips, SectionCard } from "./ui";
import { DropZone, UploadList, useDisputeUploads } from "./DisputeUploads";

const FORM_REASONS = DISPUTE_REASONS.filter((r) => ["not_delivered", "withdrawal_date", "course_cancelled", "wrong_amount", "other"].includes(r.value));

/** TRN-DSP-01 · فتح نزاع مالي (183:9286) with TRN-DSP-02 evidence uploads (4153:314 · 4153:575 · 4153:840). */
export function DisputeForm({ paymentId, backHref, subject, fairness, happens, defaultReason }: { paymentId: string; backHref: string; subject: ReactNode; fairness: ReactNode; happens: ReactNode; defaultReason: string }) {
  const [state, action, pending] = useActionState<DisputeFormState, FormData>(openDispute, initialFormState);
  const [reason, setReason] = useState(state.values?.reason || defaultReason);
  const [ack, setAck] = useState(false);
  const [phase, setPhase] = useState<"form" | "uploading" | "failed">("form");
  const uploads = useDisputeUploads();
  const router = useRouter();
  const started = useRef(false);

  // After the dispute exists, upload the queued evidence, then open the dispute page.
  useEffect(() => {
    if (state.status !== "success" || !state.disputeId || started.current) return;
    started.current = true;
    const id = state.disputeId;
    const hasFiles = uploads.items.length > 0;
    const t = setTimeout(async () => {
      if (!hasFiles) {
        router.push(`/trainee/disputes/${id}?sent=1`);
        return;
      }
      setPhase("uploading");
      const ok = await uploads.uploadAll(id);
      if (ok) router.push(`/trainee/disputes/${id}?sent=1`);
      else setPhase("failed");
    }, 0);
    return () => clearTimeout(t);
  }, [state, uploads, router]);

  const locked = state.status === "success";

  return (
    <form action={action} noValidate className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <input type="hidden" name="paymentId" value={paymentId} />
      <div className="flex min-w-0 flex-col gap-6">
        {state.message && (
          <Alert tone="error" title="تعذّر فتح النزاع">
            {state.message}
          </Alert>
        )}
        {phase === "failed" && state.disputeId && (
          <Alert tone="warning" title="فُتح النزاع لكن فشل رفع بعض المرفقات">
            أعد محاولة رفع الملفات أدناه، أو تابع إلى صفحة النزاع وأرفقها لاحقًا.
          </Alert>
        )}
        {subject}
        <SectionCard title="لماذا ترى القرار غير صحيح؟" id="why-title">
          <p className="type-caption text-text-muted">اختر السبب الأقرب ثم اشرح باختصار. الشرح الواضح يُسرّع المراجعة.</p>
          <ChoiceChips name="reason" label="سبب النزاع" options={FORM_REASONS} value={reason} onChange={setReason} />
          {state.fieldErrors?.reason && (
            <p role="alert" className="type-caption text-state-error">
              {state.fieldErrors.reason}
            </p>
          )}
          <Textarea
            name="details"
            label="شرح النزاع"
            placeholder="اشرح ما حدث بالتواريخ والتفاصيل التي تدعم موقفك…"
            rows={4}
            required
            defaultValue={state.values?.details}
            error={state.fieldErrors?.details}
            hint="٢٠ حرفًا على الأقل."
            maxLength={4000}
            disabled={locked}
          />
        </SectionCard>
        <section id="evidence" aria-labelledby="evidence-title" className="flex w-full scroll-mt-24 flex-col gap-4 rounded-16 border border-border-default bg-bg-card p-6 shadow-card">
          <h2 id="evidence-title" className="type-h3 text-text-primary">
            المستندات المؤيدة (اختياري لكنه يُسرّع القرار)
          </h2>
          <DropZone onFiles={(f) => uploads.add(f)} disabled={phase === "uploading"} tone={uploads.items.some((i) => i.status === "done") ? "success" : "brand"} />
          {uploads.rejected && (
            <p role="alert" className="type-caption text-state-error">
              {uploads.rejected}
            </p>
          )}
          <UploadList
            items={uploads.items}
            onRemove={phase === "form" ? (i) => uploads.remove(i.key) : undefined}
            onRetry={
              state.disputeId
                ? async () => {
                    const id = state.disputeId!;
                    setPhase("uploading");
                    const ok = await uploads.uploadAll(id);
                    if (ok) router.push(`/trainee/disputes/${id}?sent=1`);
                    else setPhase("failed");
                  }
                : undefined
            }
          />
          <p className="type-caption text-text-muted">يُقبل PDF أو صورة حتى ١٠ م.ب لكل ملف. لا ترفع بيانات بطاقتك — لسنا بحاجة إليها.</p>
        </section>
        {fairness}
      </div>
      <aside aria-label="إرسال النزاع" className="flex flex-col gap-5">
        {happens}
        <div className="flex flex-col gap-1">
          <Checkbox name="acknowledge" checked={ack} onChange={(e) => setAck(e.target.checked)} disabled={locked}>
            أقرّ بصحة المعلومات والمستندات المرفقة
          </Checkbox>
          {state.fieldErrors?.acknowledge && (
            <p role="alert" className="type-caption text-state-error">
              {state.fieldErrors.acknowledge}
            </p>
          )}
        </div>
        {locked && state.disputeId ? (
          <ButtonLink href={`/trainee/disputes/${state.disputeId}?sent=1`} size="l" fullWidth>
            {phase === "uploading" ? "جارٍ رفع المرفقات…" : "تابع إلى صفحة النزاع"}
          </ButtonLink>
        ) : (
          <Button type="submit" size="l" fullWidth loading={pending} disabled={!ack}>
            أرسل النزاع
          </Button>
        )}
        <ButtonLink href={backHref} variant="text" fullWidth>
          تراجع
        </ButtonLink>
        <p className="flex items-center gap-2 rounded-12 bg-bg-page px-3.5 py-3 type-caption text-text-muted">
          <Glyph icon={Info} size={16} />
          <span className="flex-1">يمكنك سحب النزاع في أي وقت قبل صدور القرار.</span>
        </p>
      </aside>
    </form>
  );
}
