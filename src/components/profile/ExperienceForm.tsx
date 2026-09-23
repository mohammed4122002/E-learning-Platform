"use client";

import { useActionState, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Field";
import { Checkbox } from "@/components/ui/Choice";
import { Alert } from "@/components/ui/Feedback";
import { DataCard, FieldTag, FlowNotice } from "./bits";
import { saveExperience } from "@/app/(workspace)/trainee/profile/actions";
import { initialFormState } from "@/lib/validation/auth";
import type { ExperienceView } from "@/lib/data/profile";

function Label({ text, tag }: { text: string; tag: "required" | "optional" | "disabled" }) {
  return (
    <span className="inline-flex items-center gap-2">
      {text}
      <FieldTag kind={tag} />
    </span>
  );
}

/** TRN-PRF-04 · إضافة (4152:736) / تعديل (4152:1102). */
export function ExperienceForm({ experience }: { experience?: ExperienceView }) {
  const [state, action, pending] = useActionState(saveExperience, initialFormState);
  const v = state.values;
  const [isCurrent, setIsCurrent] = useState(v ? v.isCurrent === "on" : (experience?.isCurrent ?? false));
  const editing = Boolean(experience);
  const thisMonth = new Date().toISOString().slice(0, 7);

  return (
    <form action={action} noValidate className="flex flex-col gap-6">
      <FlowNotice tone="brand" title={editing ? "تعديل الخبرة" : "أضف خبرة جديدة"}>
        {editing ? "عدّل البيانات ثم احفظ — يظهر التعديل في ملفك فورًا." : "املأ البيانات ثم راجعها قبل الحفظ."}
      </FlowNotice>
      {state.status === "error" && state.message && (
        <Alert tone="error" title="تعذّر حفظ الخبرة">
          {state.message}
        </Alert>
      )}
      {experience && <input type="hidden" name="id" value={experience.id} />}
      <DataCard title="بيانات الخبرة">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            name="title"
            label={<Label text="المسمى" tag="required" />}
            placeholder="مثال: منسّق مشاريع"
            required
            maxLength={160}
            defaultValue={v?.title ?? experience?.title ?? ""}
            error={state.fieldErrors?.title}
          />
          <Input
            name="organization"
            label={<Label text="الجهة" tag="required" />}
            placeholder="مثال: شركة البناء الحديث"
            required
            maxLength={160}
            defaultValue={v?.organization ?? experience?.organization ?? ""}
            error={state.fieldErrors?.organization}
          />
          <Input
            name="startMonth"
            type="month"
            max={thisMonth}
            label={<Label text="تاريخ البداية" tag="required" />}
            required
            defaultValue={v?.startMonth ?? experience?.startDate.slice(0, 7) ?? ""}
            error={state.fieldErrors?.startMonth}
          />
          <Input
            name="endMonth"
            type="month"
            max={thisMonth}
            label={<Label text="تاريخ النهاية" tag={isCurrent ? "disabled" : "required"} />}
            disabled={isCurrent}
            hint={isCurrent ? "ما زلت أعمل هنا — لا حاجة لتاريخ النهاية" : undefined}
            defaultValue={v?.endMonth ?? experience?.endDate?.slice(0, 7) ?? ""}
            error={state.fieldErrors?.endMonth}
          />
        </div>
        <Checkbox name="isCurrent" checked={isCurrent} onChange={(e) => setIsCurrent(e.target.checked)} description="إن أزلت التحديد يصبح تاريخ النهاية إلزاميًا">
          ما زلت أعمل هنا
        </Checkbox>
        <Textarea
          name="description"
          label={<Label text="الوصف" tag="optional" />}
          rows={3}
          maxLength={2000}
          placeholder="مثال: متابعة جداول المشاريع والتنسيق بين الفرق"
          defaultValue={v?.description ?? experience?.description ?? ""}
          error={state.fieldErrors?.description}
        />
      </DataCard>
      <div className="flex flex-wrap items-center gap-3">
        <ButtonLink href="/trainee/profile/experience" variant="secondary">
          إلغاء
        </ButtonLink>
        <Button type="submit" loading={pending}>
          احفظ الخبرة
        </Button>
      </div>
    </form>
  );
}
