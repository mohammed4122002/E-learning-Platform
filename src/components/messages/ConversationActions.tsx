"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Select, Textarea } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Feedback";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { reportConversation, setConversationMuted } from "@/app/(workspace)/messages/actions";
import { initialFormState } from "@/lib/validation/auth";

const REASONS = [
  { value: "inappropriate", label: "محتوى غير لائق" },
  { value: "harassment", label: "إساءة أو مضايقة" },
  { value: "fraud", label: "احتيال أو طلب بيانات مالية" },
  { value: "misleading", label: "معلومات مضللة" },
  { value: "copyright", label: "انتهاك حقوق" },
  { value: "other", label: "سبب آخر" },
];

function ReportForm({ conversationId, onDone }: { conversationId: string; onDone: () => void }) {
  const [state, action, pending] = useActionState(reportConversation, initialFormState);
  if (state.status === "success") {
    return (
      <div className="flex flex-col gap-4">
        <Alert tone="success" title="وصلنا بلاغك">
          {state.message}
        </Alert>
        <Button size="s" onClick={onDone} className="self-start">
          إغلاق
        </Button>
      </div>
    );
  }
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="conversationId" value={conversationId} />
      {state.status === "error" && state.message && (
        <Alert tone="error" title="تعذّر إرسال البلاغ">
          {state.message}
        </Alert>
      )}
      <Select name="reason" label="سبب البلاغ" placeholder="اختر السبب" defaultValue="" options={REASONS} required error={state.fieldErrors?.reason} />
      <Textarea name="details" label="تفاصيل (اختياري)" rows={3} maxLength={2000} error={state.fieldErrors?.details} />
      <p className="type-caption text-text-muted">نراجع آخر رسالة وصلتك في هذه المحادثة. لا يعلم الطرف الآخر بهوية المُبلِّغ.</p>
      <div className="flex flex-wrap gap-3">
        <Button type="submit" variant="danger" size="s" loading={pending}>
          أرسل البلاغ
        </Button>
        <Button variant="outline" size="s" onClick={onDone}>
          إلغاء
        </Button>
      </div>
    </form>
  );
}

/** GEN-MSG-02 · «إجراءات»: mute / unmute and report a violation. */
export function ConversationActions({ conversationId, muted }: { conversationId: string; muted: boolean }) {
  const [reporting, setReporting] = useState(false);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return (
    <section aria-labelledby="conv-actions-title" className="flex flex-col gap-4 rounded-16 border border-border-default bg-bg-card p-5 shadow-card sm:p-6">
      <h2 id="conv-actions-title" className="type-h3 text-text-primary">
        إجراءات
      </h2>
      <Button
        variant="outline"
        fullWidth
        loading={pending}
        onClick={() =>
          start(async () => {
            const res = await setConversationMuted(conversationId, !muted);
            toast(res.status === "error" ? "error" : "success", res.message ?? "");
            router.refresh();
          })
        }
      >
        {muted ? "ألغِ كتم المحادثة" : "كتم هذه المحادثة"}
      </Button>
      <button type="button" onClick={() => setReporting(true)} className="cursor-pointer self-center rounded-8 py-2 type-subtitle text-text-brand hover:underline focus-ring">
        الإبلاغ عن مخالفة
      </button>
      <Modal open={reporting} onClose={() => setReporting(false)} title="الإبلاغ عن مخالفة" size="s">
        {reporting && <ReportForm conversationId={conversationId} onDone={() => setReporting(false)} />}
      </Modal>
    </section>
  );
}
