"use client";

import { useActionState, useRef, useState } from "react";
import { TriangleAlert } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Choice";
import { ChipButton } from "@/components/ui/Chip";
import { Avatar } from "@/components/ui/Data";
import { Alert } from "@/components/ui/Feedback";
import { Textarea } from "@/components/ui/Field";
import { Glyph } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { KeyValue } from "@/components/ui/InfoBlocks";
import { SectionCard } from "@/components/ui/PageHeading";
import { formatRating, toArabicDigits } from "@/lib/format";
import { submitRating } from "@/app/(workspace)/trainee/ratings/actions";
import { initialFormState, RATING_TAGS } from "@/lib/validation/engagement";
import { StarInput } from "./StarInput";

type Props = {
  enrollmentId: string;
  isProvider: boolean;
  trainerName: string;
  trainerHeadline: string | null;
  trainerAvatar: string | null;
};

function AxisRow({ title, hint, children, error, id }: { title: string; hint: string; children: React.ReactNode; error?: string; id: string }) {
  return (
    <div className="flex w-full flex-col gap-1">
      <div className={`flex w-full flex-col gap-3 rounded-12 bg-bg-page px-[18px] pt-4 pb-[18px] sm:flex-row sm:items-center ${error ? "ring-2 ring-state-error" : ""}`}>
        <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
          <p id={`${id}-label`} className="type-title text-text-primary">
            {title}
          </p>
          <p className="type-caption text-text-muted">{hint}</p>
        </div>
        {children}
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="type-caption text-state-error">
          {error}
        </p>
      )}
    </div>
  );
}

/** TRN-RTG-01 · النموذج (Figma 206:11731). Content + trainer axes always; organisation axis for provider courses (BR-R3). */
export function RatingForm({ enrollmentId, isProvider, trainerName, trainerHeadline, trainerAvatar }: Props) {
  const [state, action, pending] = useActionState(submitRating, initialFormState);
  const [content, setContent] = useState(Number(state.values?.content) || 0);
  const [trainer, setTrainer] = useState(Number(state.values?.trainer) || 0);
  const [org, setOrg] = useState(Number(state.values?.organization) || 0);
  const [tags, setTags] = useState<string[]>(state.values?.tags ? state.values.tags.split("|").filter(Boolean) : []);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const fe = state.fieldErrors ?? {};

  const axes = [content, trainer, ...(isProvider ? [org] : [])];
  const filled = axes.filter(Boolean);
  const avg = filled.length ? filled.reduce((a, b) => a + b, 0) / filled.length : 0;
  const scoreText = (v: number) => (v ? `${toArabicDigits(v)} / ٥` : "—");

  return (
    <form ref={formRef} action={action} noValidate className="flex w-full flex-col items-start gap-6 lg:flex-row">
      <input type="hidden" name="enrollment" value={enrollmentId} />
      {tags.map((t) => (
        <input key={t} type="hidden" name="tags" value={t} />
      ))}

      <div className="flex w-full min-w-0 flex-1 flex-col gap-6">
        {state.message && (
          <Alert tone="error" title="تعذّر إرسال التقييم">
            {state.message}
          </Alert>
        )}
        <SectionCard title="قيّم الدورة" titleId="rate-course-title">
          <AxisRow id="axis-content" title="المحتوى" hint="هل غطّى ما وُعدت به؟ وهل كان محدّثًا ومفيدًا؟" error={fe.content}>
            <StarInput name="content" value={content} onChange={setContent} label="تقييم المحتوى" invalid={!!fe.content} describedBy={fe.content ? "axis-content-error" : undefined} />
          </AxisRow>
          {isProvider && (
            <AxisRow id="axis-org" title="التنظيم" hint="جودة المنصة والمواد والالتزام بالمواعيد" error={fe.organization}>
              <StarInput name="organization" value={org} onChange={setOrg} label="تقييم التنظيم" invalid={!!fe.organization} describedBy={fe.organization ? "axis-org-error" : undefined} />
            </AxisRow>
          )}
        </SectionCard>

        <SectionCard title="تقييم المدرب" titleId="rate-trainer-title">
          <div className="flex w-full flex-col gap-1">
            <div className={`flex w-full flex-col gap-3.5 rounded-12 bg-bg-page px-4 py-3.5 sm:flex-row sm:items-center ${fe.trainer ? "ring-2 ring-state-error" : ""}`}>
              <div className="flex min-w-0 flex-1 items-center gap-3.5">
                <Avatar name={trainerName} src={trainerAvatar} />
                <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                  <p className="type-title text-text-primary">{trainerName}</p>
                  <p className="type-caption text-text-muted">{trainerHeadline ? `${trainerHeadline} · قدّم هذه الدورة` : "قدّم هذه الدورة"} — وضوح الشرح · التفاعل · الرد على الأسئلة</p>
                </div>
              </div>
              <StarInput name="trainer" value={trainer} onChange={setTrainer} label={`تقييم أداء المدرب ${trainerName}`} invalid={!!fe.trainer} describedBy={fe.trainer ? "axis-trainer-error" : undefined} />
            </div>
            {fe.trainer && (
              <p id="axis-trainer-error" role="alert" className="type-caption text-state-error">
                {fe.trainer}
              </p>
            )}
          </div>
        </SectionCard>

        <SectionCard title="تعليقك (اختياري)" titleId="comment-title">
          <p className="type-caption text-text-muted">اكتب ما يفيد متدربًا يفكّر في التسجيل. تجنّب البيانات الشخصية.</p>
          <div className="flex flex-wrap gap-2.5" role="group" aria-label="وسوم سريعة">
            {RATING_TAGS.map((t) => (
              <ChipButton key={t} selected={tags.includes(t)} onClick={() => setTags((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]))}>
                {t}
              </ChipButton>
            ))}
          </div>
          <Textarea name="comment" label="تعليقك" rows={3} maxLength={1800} defaultValue={state.values?.comment} error={fe.comment} placeholder="مثال: محتوى تطبيقي ممتاز، والأمثلة من واقع مشاريع حقيقية." />
        </SectionCard>
      </div>

      <aside aria-label="ملخّص تقييمك" className="flex w-full shrink-0 flex-col gap-5 lg:sticky lg:top-[110px] lg:w-[380px]">
        <SectionCard title="ملخّص تقييمك" titleId="summary-title">
          <dl className="flex flex-col gap-4">
            <KeyValue label="المحتوى" value={scoreText(content)} valueClass="text-state-rating" />
            <KeyValue label="أداء المدرب" value={scoreText(trainer)} valueClass="text-state-rating" />
            {isProvider && <KeyValue label="التنظيم" value={scoreText(org)} valueClass="text-state-rating" />}
            <div aria-hidden className="h-px w-full bg-border-divider" />
            <div className="flex w-full items-center gap-3">
              <dt className="min-w-0 flex-1 type-title text-text-primary">المتوسط</dt>
              <dd className="shrink-0 type-h3 text-state-rating">{avg ? `${formatRating(avg)} / ٥` : "—"}</dd>
            </div>
          </dl>
        </SectionCard>
        <p className="flex w-full items-center gap-2.5 rounded-12 bg-state-warning-bg px-3.5 py-3 type-body text-state-warning">
          <Glyph icon={TriangleAlert} size={20} />
          <span className="min-w-0 flex-1">التقييم نهائي ولا يمكن تعديله بعد الإرسال. راجعه قبل التأكيد.</span>
        </p>
        <div className="flex flex-col gap-1">
          <Checkbox name="consent" defaultChecked={state.values ? undefined : false} aria-invalid={fe.consent ? true : undefined}>
            أوافق على نشر تقييمي باسمي
          </Checkbox>
          {fe.consent && (
            <p role="alert" className="type-caption text-state-error">
              {fe.consent}
            </p>
          )}
        </div>
        <Button size="l" fullWidth loading={pending} onClick={() => setConfirmOpen(true)}>
          أرسل التقييم
        </Button>
        <ButtonLink href="/trainee/ratings" variant="text" size="l" fullWidth>
          لاحقًا
        </ButtonLink>
      </aside>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        size="s"
        title="إرسال التقييم نهائيًا؟"
        footer={
          <>
            <Button
              size="s"
              loading={pending}
              onClick={() => {
                setConfirmOpen(false);
                formRef.current?.requestSubmit();
              }}
            >
              أرسل التقييم
            </Button>
            <Button size="s" variant="outline" onClick={() => setConfirmOpen(false)}>
              راجع مرة أخرى
            </Button>
          </>
        }
      >
        يُنشر تقييمك باسمك على صفحة البرنامج ويصل إلى {isProvider ? "الجهة التدريبية و" : ""}المدرب. لا يمكن تعديله بعد الإرسال.
      </Modal>
    </form>
  );
}
