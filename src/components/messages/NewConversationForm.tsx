"use client";

import { useActionState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Feedback";
import { startConversation } from "@/app/(workspace)/messages/actions";
import { initialFormState } from "@/lib/validation/auth";

/** /messages/new?course=<slug> — first message to the course team (start_conversation). */
export function NewConversationForm({ course }: { course: { id: string; title: string; slug: string; recipient: string } }) {
  const [state, action, pending] = useActionState(startConversation, initialFormState);
  return (
    <form action={action} noValidate className="flex flex-col gap-5 rounded-16 border border-border-default bg-bg-card p-5 shadow-card sm:p-6">
      <input type="hidden" name="courseId" value={course.id} />
      <div className="flex flex-col gap-1">
        <h2 className="type-h3 text-text-primary">رسالة إلى {course.recipient}</h2>
        <p className="type-small text-text-secondary">بخصوص: {course.title}</p>
      </div>
      {state.status === "error" && state.message && (
        <Alert tone="error" title="تعذّر بدء المحادثة">
          {state.message}
        </Alert>
      )}
      <Input name="subject" label="الموضوع (اختياري)" maxLength={200} placeholder={course.title} defaultValue={state.values?.subject} error={state.fieldErrors?.subject} />
      <Textarea
        name="body"
        label="رسالتك"
        rows={5}
        required
        maxLength={4000}
        placeholder="اكتب سؤالك بوضوح — مثال: هل يغطّي البرنامج أدوات الجدولة الرقمية؟"
        defaultValue={state.values?.body}
        error={state.fieldErrors?.body}
      />
      <p className="type-caption text-text-muted">تصل رسالتك إلى فريق الجهة المقدّمة للدورة أو إلى المدرب مباشرة. لا تُشارك بيانات بطاقتك أو رقمك الوطني.</p>
      <div className="flex flex-wrap gap-3">
        <Button type="submit" loading={pending}>
          أرسل الرسالة
        </Button>
        <ButtonLink href={`/courses/${course.slug}`} variant="outline">
          إلغاء
        </ButtonLink>
      </div>
    </form>
  );
}
