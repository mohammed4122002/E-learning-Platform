"use client";

import { useActionState, useEffect, useId, useOptimistic, useRef, useState, useTransition } from "react";
import { Bookmark, Share2 } from "lucide-react";
import { Glyph } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Select, Textarea } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Feedback";
import { useToast } from "@/components/ui/Toast";
import { initialFormState, type FormState } from "@/lib/validation/auth";
import { INQUIRY_TOPICS } from "@/lib/validation/discover";
import { sendInquiry, setFavorite } from "@/app/(workspace)/trainee/programs/[slug]/actions";

const iconButton = "flex size-11 cursor-pointer items-center justify-center rounded-12 bg-bg-brand-tint text-text-brand hover:bg-bg-sidebar-active focus-ring disabled:opacity-60";

/** Hero bookmark (Figma icon-button · bookmark): saves the program's next open course to المفضلة. */
export function FavoriteButton({ courseId, saved, programSlug }: { courseId: string; saved: boolean; programSlug: string }) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(saved);
  return (
    <button
      type="button"
      aria-pressed={optimistic}
      disabled={pending}
      title={optimistic ? "محفوظ في المفضلة — اضغط للإزالة" : "احفظ في المفضلة لتعود إليه لاحقًا"}
      onClick={() =>
        startTransition(async () => {
          setOptimistic(!optimistic);
          const res = await setFavorite(courseId, !optimistic, programSlug);
          toast(res.status === "success" ? "success" : "error", res.message);
        })
      }
      className={iconButton}
    >
      <Bookmark aria-hidden size={20} strokeWidth={1.4} absoluteStrokeWidth className={optimistic ? "fill-current" : ""} />
      <span className="sr-only">{optimistic ? "إزالة من المفضلة" : "حفظ في المفضلة"}</span>
    </button>
  );
}

/** Hero share (Figma icon-button · share-2): native share sheet, falling back to copying the link. */
export function ShareButton({ title }: { title: string }) {
  const toast = useToast();
  return (
    <button
      type="button"
      className={iconButton}
      onClick={async () => {
        const url = window.location.href;
        try {
          if (navigator.share) {
            await navigator.share({ title, url });
            return;
          }
          await navigator.clipboard.writeText(url);
          toast("success", "نسخنا رابط البرنامج.");
        } catch (e) {
          if ((e as Error)?.name !== "AbortError") toast("error", "تعذّر نسخ الرابط. انسخه من شريط العنوان.");
        }
      }}
    >
      <Glyph icon={Share2} size={20} label="مشاركة البرنامج" />
    </button>
  );
}

/** "استفسر قبل التسجيل" — Modal form (useActionState) that stores an inquiry for the provider. */
export function InquiryButton({ courseId, programTitle }: { courseId: string | null; programTitle: string }) {
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  return (
    <>
      <Button
        variant="outline"
        size="l"
        fullWidth
        disabled={!courseId}
        onClick={() => {
          setFormKey((k) => k + 1);
          setOpen(true);
        }}
      >
        استفسر قبل التسجيل
      </Button>
      {courseId && (
        <Modal open={open} onClose={() => setOpen(false)} title="استفسر قبل التسجيل" size="m">
          <InquiryForm key={formKey} courseId={courseId} programTitle={programTitle} onDone={() => setOpen(false)} />
        </Modal>
      )}
    </>
  );
}

function InquiryForm({ courseId, programTitle, onDone }: { courseId: string; programTitle: string; onDone: () => void }) {
  const [state, action, pending] = useActionState(sendInquiry, initialFormState);
  const toast = useToast();
  const id = useId();
  const handled = useRef<FormState | null>(null);
  useEffect(() => {
    if (state.status === "success" && state.message && handled.current !== state) {
      handled.current = state;
      toast("success", state.message);
      onDone();
    }
  }, [state, toast, onDone]);

  return (
    <form action={action} noValidate className="flex flex-col gap-4" aria-describedby={`${id}-help`}>
      <p id={`${id}-help`} className="type-small text-text-secondary">
        يصل سؤالك عن «{programTitle}» إلى مقدّم البرنامج، وتصلك الإجابة في الإشعارات. لا يُلزمك الاستفسار بالتسجيل.
      </p>
      {state.status === "error" && state.message && <Alert tone="error" title={state.message} />}
      <input type="hidden" name="courseId" value={courseId} />
      <Select
        name="topic"
        label="موضوع الاستفسار"
        defaultValue={state.values?.topic ?? ""}
        placeholder="اختر الموضوع"
        options={Object.entries(INQUIRY_TOPICS).map(([value, label]) => ({ value, label }))}
        error={state.fieldErrors?.topic}
        required
      />
      <Textarea
        name="question"
        label="سؤالك"
        rows={4}
        maxLength={2000}
        defaultValue={state.values?.question}
        placeholder="مثال: هل تتوفر دفعة مسائية في مسقط الشهر القادم؟"
        error={state.fieldErrors?.question}
        hint="١٠ أحرف على الأقل"
        required
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="s" loading={pending}>
          أرسل الاستفسار
        </Button>
        <Button type="button" size="s" variant="outline" onClick={onDone} disabled={pending}>
          إلغاء
        </Button>
      </div>
    </form>
  );
}
