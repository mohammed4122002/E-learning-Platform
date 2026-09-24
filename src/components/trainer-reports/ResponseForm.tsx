"use client";

import { useActionState } from "react";
import { respondToReport } from "@/app/(trainer)/trainer/reports/actions";
import { EvidenceUpload } from "@/components/trainer-reports/EvidenceUpload";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Feedback";
import { initialFormState } from "@/lib/validation/auth";

/** «ردّك وتوضيحك» of the report card (282:6532): statement + evidence, «أرسل ردّي» or «أقرّ بالخطأ وأصحّح الوصف». */
export function ResponseForm({ reportId, userId, fixHref }: { reportId: string; userId: string; fixHref: string }) {
  const [state, action, pending] = useActionState(respondToReport, initialFormState);
  const fe = state.fieldErrors ?? {};
  const formId = `respond-${reportId}`;
  return (
    <form id={formId} action={action} noValidate className="flex w-full flex-col gap-4">
      <input type="hidden" name="reportId" value={reportId} />
      <input type="hidden" name="fixHref" value={fixHref} />
      {state.status === "error" && state.message && (
        <Alert tone="error" title="تعذّر إرسال الرد">
          {state.message}
        </Alert>
      )}
      <div className="flex w-full flex-col gap-3">
        <label htmlFor={`${formId}-body`} className="type-subtitle text-text-primary">
          ردّك وتوضيحك
        </label>
        <textarea
          id={`${formId}-body`}
          name="body"
          rows={3}
          maxLength={4000}
          defaultValue={state.values?.body}
          aria-invalid={Boolean(fe.body)}
          aria-describedby={fe.body ? `${formId}-err` : undefined}
          placeholder="اشرح موقفك بوقائع: ماذا يقول الوصف بالضبط؟ ماذا نُفّذ فعلًا؟ هل لديك ما يثبت ذلك؟"
          className="min-h-24 w-full resize-y rounded-12 border-[1.5px] border-border-default bg-bg-surface px-4 py-3.5 type-body text-text-primary placeholder:text-text-muted focus-ring aria-[invalid=true]:border-state-error"
        />
        {fe.body && (
          <p id={`${formId}-err`} role="alert" className="type-caption text-state-error">
            {fe.body}
          </p>
        )}
        <EvidenceUpload userId={userId} form={formId} title="أرفق ما يدعم ردّك" hint="خطة الجلسات · كشف الحضور · لقطات من المواد · حتى ١٠ م.ب" />
      </div>
      <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Button type="submit" name="intent" value="reply" size="l" loading={pending} className="w-full sm:w-auto">
          أرسل ردّي
        </Button>
        <Button type="submit" name="intent" value="admit" variant="outline" size="l" disabled={pending} className="w-full sm:w-auto">
          أقرّ بالخطأ وأصحّح الوصف
        </Button>
      </div>
      <p className="type-caption text-state-success">الإقرار المبكر وتصحيح الوصف يُغلق أغلب البلاغات بلا أثر على سجلك.</p>
    </form>
  );
}
