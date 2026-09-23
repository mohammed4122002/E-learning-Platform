"use client";

import { useActionState } from "react";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ChipRadio } from "@/components/ui/Chip";
import { Alert } from "@/components/ui/Feedback";
import { Textarea } from "@/components/ui/Field";
import { TipStrip } from "@/components/ui/InfoBlocks";
import { SectionCard } from "@/components/ui/PageHeading";
import { submitInquiry } from "@/app/(workspace)/trainee/inquiry/actions";
import { INQUIRY_TOPICS, initialFormState } from "@/lib/validation/engagement";

/** TRN-INQ-01 «ما سؤالك؟» card (Figma 223:13404): topic chips, question field, privacy note, submit. */
export function InquiryForm({ courseId }: { courseId: string }) {
  const [state, action, pending] = useActionState(submitInquiry, initialFormState);
  const fe = state.fieldErrors ?? {};
  const topic = state.values?.topic || "content";
  return (
    <form action={action} noValidate>
      <input type="hidden" name="course" value={courseId} />
      <SectionCard title="ما سؤالك؟" titleId="question-title" as="div">
        <p className="type-caption text-text-muted">اختر موضوعًا ليصل سؤالك للمختص مباشرة، ثم اكتب التفاصيل.</p>
        {state.message && (
          <Alert tone="error" title="تعذّر إرسال الاستفسار">
            {state.message}
          </Alert>
        )}
        <fieldset className="flex flex-col gap-1">
          <legend className="sr-only">موضوع السؤال</legend>
          <div className="flex flex-wrap gap-2.5">
            {Object.entries(INQUIRY_TOPICS).map(([value, label]) => (
              <ChipRadio key={value} name="topic" value={value} defaultChecked={topic === value} className={value === "content" ? "min-w-[120px]" : ""}>
                {label}
              </ChipRadio>
            ))}
          </div>
          {fe.topic && (
            <p role="alert" className="type-caption text-state-error">
              {fe.topic}
            </p>
          )}
        </fieldset>
        <Textarea
          name="question"
          label="سؤالك"
          rows={3}
          required
          maxLength={2000}
          defaultValue={state.values?.question}
          error={fe.question}
          hint="١٠ أحرف على الأقل. سؤال محدد يصلك عليه رد أدق."
          placeholder="مثال: هل يغطّي البرنامج أدوات الجدولة الرقمية مثل MS Project؟ وهل أحتاج خبرة سابقة؟"
        />
        <TipStrip icon={Info} tone="info">
          لا تُشارك بيانات بطاقتك أو رقمك الوطني هنا. للأسئلة المالية أو الشكاوى استخدم مركز المساعدة.
        </TipStrip>
        <Button type="submit" size="l" fullWidth loading={pending}>
          أرسل الاستفسار
        </Button>
      </SectionCard>
    </form>
  );
}
