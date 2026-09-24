"use client";

import Link from "next/link";
import { useActionState, useRef, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { CircleAlert, CircleX, EyeOff, FileText, Upload, UserRound, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Choice";
import { Glyph } from "@/components/ui/Icon";
import { requestRatingReview } from "@/lib/actions/trainer-ops";
import { toArabicError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/client";
import { initialFormState } from "@/lib/validation/auth";
import { REVIEW_REASONS } from "@/lib/validation/trainer-ops";

/* TRR-RTG-03 · طلب مراجعة تقييم (291:8562): reason cards, explanation + optional evidence, acknowledgement and send. */

const ICONS: Record<string, LucideIcon> = { abusive: CircleX, not_attended: UserRound, private_data: EyeOff, duplicate: CircleAlert };
const ACCEPT = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_BYTES = 10 * 1024 * 1024;

export function ReviewForm({ ratingId, userId, side, after }: { ratingId: string; userId: string; side: ReactNode; after: ReactNode }) {
  const [state, action, pending] = useActionState(requestRatingReview, initialFormState);
  const fe = state.fieldErrors ?? {};
  const [reason, setReason] = useState<string>(state.values?.reason ?? "");
  const [ack, setAck] = useState(false);
  const [evidencePath, setEvidencePath] = useState("");
  const [evidenceName, setEvidenceName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function upload(file: File | undefined) {
    setUploadError(null);
    if (!file) return;
    if (!ACCEPT.includes(file.type)) return setUploadError("اختر صورة (JPG / PNG / WEBP) أو ملف PDF.");
    if (file.size > MAX_BYTES) return setUploadError("حجم الملف أكبر من ١٠ م.ب.");
    setUploading(true);
    const ext = (file.name.split(".").pop() ?? "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${userId}/rating-${ratingId}-${crypto.randomUUID()}.${ext}`;
    const { error } = await createClient().storage.from("report-evidence").upload(path, file, { contentType: file.type });
    setUploading(false);
    if (error) return setUploadError(toArabicError({ code: "upload_failed" }));
    setEvidencePath(path);
    setEvidenceName(file.name);
  }

  return (
    <form action={action} noValidate className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <input type="hidden" name="ratingId" value={ratingId} />
      <input type="hidden" name="evidencePath" value={evidencePath} />
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        {state.message && (
          <p role="alert" className="rounded-12 border-[1.5px] border-state-error bg-state-error-bg px-4 py-3 type-body text-state-error">
            {state.message}
          </p>
        )}
        <section aria-labelledby="reason-title" className="flex flex-col gap-4 rounded-22 border border-border-default bg-bg-card p-5 shadow-card sm:p-6">
          <h2 id="reason-title" className="type-h2 text-text-primary">
            ما سبب طلبك؟
          </h2>
          <p className="type-small text-text-muted">اختر السبب الذي ينطبق فعلًا. الطلبات بلا أساس تُرفض وتُسجَّل.</p>
          <fieldset className="flex flex-col gap-3" aria-invalid={fe.reason ? true : undefined} aria-describedby={fe.reason ? "reason-error" : undefined}>
            <legend className="sr-only">سبب الطلب</legend>
            {REVIEW_REASONS.map((r) => {
              const on = reason === r.value;
              return (
                <label
                  key={r.value}
                  className={`flex cursor-pointer items-center gap-3 rounded-16 border-[1.5px] px-4 py-3.5 transition-colors focus-within:ring-2 focus-within:ring-action-primary ${
                    on ? "border-action-primary bg-bg-brand-tint" : "border-border-default bg-bg-page hover:bg-bg-brand-tint"
                  }`}
                >
                  <span className={`flex size-10 shrink-0 items-center justify-center rounded-12 bg-bg-surface ${r.value === "abusive" ? "text-state-error" : r.value === "duplicate" ? "text-state-warning" : r.value === "private_data" ? "text-text-primary" : "text-state-warning"}`}>
                    <Glyph icon={ICONS[r.value]} size={20} />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className={`type-subtitle font-bold! ${on ? "text-text-brand" : "text-text-primary"}`}>{r.label}</span>
                    <span className="type-small text-text-muted">{r.hint}</span>
                  </span>
                  <input type="radio" name="reason" value={r.value} checked={on} onChange={() => setReason(r.value)} className="size-5 shrink-0 cursor-pointer accent-[var(--color-action-primary)]" />
                </label>
              );
            })}
          </fieldset>
          {fe.reason && (
            <p id="reason-error" role="alert" className="type-caption text-state-error">
              {fe.reason}
            </p>
          )}
        </section>

        <section aria-labelledby="explain-title" className="flex flex-col gap-4 rounded-22 border border-border-default bg-bg-card p-5 shadow-card sm:p-6">
          <h2 id="explain-title" className="type-h2 text-text-primary">
            اشرح وأرفق ما يدعم طلبك
          </h2>
          <label htmlFor="review-details" className="flex flex-col gap-2">
            <span className="type-small text-text-secondary">شرحك</span>
            <textarea
              id="review-details"
              name="details"
              rows={3}
              maxLength={2000}
              defaultValue={state.values?.details ?? ""}
              placeholder="اذكر الوقائع: ما العبارة المخالفة بالضبط؟ ولماذا تخالف الشروط؟"
              aria-invalid={fe.details ? true : undefined}
              aria-describedby={fe.details ? "details-error" : undefined}
              className={`min-h-24 w-full resize-y rounded-12 border-[1.5px] bg-bg-surface px-4 py-3 type-body text-text-primary outline-none placeholder:text-text-muted focus:border-2 focus:border-action-primary ${fe.details ? "border-state-error" : "border-border-default"}`}
            />
          </label>
          {fe.details && (
            <p id="details-error" role="alert" className="type-caption text-state-error">
              {fe.details}
            </p>
          )}
          <input ref={fileRef} id="review-evidence" type="file" accept={ACCEPT.join(",")} className="sr-only" onChange={(e) => upload(e.target.files?.[0])} />
          {evidenceName ? (
            <div className="flex items-center gap-3 rounded-16 border-[1.5px] border-border-default bg-bg-surface px-4 py-3.5">
              <Glyph icon={FileText} size={20} className="text-text-brand" />
              <span className="min-w-0 flex-1 truncate type-subtitle text-text-primary" dir="auto">
                {evidenceName}
              </span>
              <button
                type="button"
                aria-label="إزالة الملف"
                onClick={() => {
                  setEvidencePath("");
                  setEvidenceName(null);
                  if (fileRef.current) fileRef.current.value = "";
                }}
                className="cursor-pointer rounded-8 p-1 text-text-muted hover:text-state-error focus-ring"
              >
                <Glyph icon={X} size={16} />
              </button>
            </div>
          ) : (
            <label
              htmlFor="review-evidence"
              className="flex min-h-[112px] cursor-pointer flex-col items-center justify-center gap-2 rounded-16 border-[1.5px] border-dashed border-border-default bg-bg-surface p-5 text-center focus-within:border-action-primary hover:bg-bg-brand-tint"
            >
              <Glyph icon={Upload} size={20} className="text-text-secondary" />
              <span className="type-subtitle text-text-primary">{uploading ? "جارٍ الرفع…" : "أرفق دليلًا (اختياري)"}</span>
              <span className="type-caption text-text-muted">كشف الحضور · لقطة شاشة · حتى ١٠ م.ب</span>
            </label>
          )}
          {uploadError && (
            <p role="alert" className="type-caption text-state-error">
              {uploadError}
            </p>
          )}
        </section>
        {after}
      </div>

      <div className="flex w-full shrink-0 flex-col gap-5 lg:w-[284px]">
        {side}
        <section aria-labelledby="submit-title" className="flex flex-col gap-4 rounded-22 border border-border-default bg-bg-card p-5 shadow-card">
          <h2 id="submit-title" className="type-h3 font-bold! text-text-primary">
            إرسال الطلب
          </h2>
          <Checkbox name="acknowledge" checked={ack} onChange={(e) => setAck(e.currentTarget.checked)}>
            أقرّ بأن طلبي مبني على مخالفة فعلية
          </Checkbox>
          {fe.acknowledge && <p className="type-caption text-state-error">{fe.acknowledge}</p>}
          <Button type="submit" size="l" fullWidth disabled={!ack || !reason || uploading} loading={pending}>
            أرسل طلب المراجعة
          </Button>
          <Link href={`/trainer/ratings/${ratingId}/reply`} className="self-center py-1 type-body text-text-brand hover:underline focus-ring">
            أفضّل الرد على التقييم بدلًا من ذلك
          </Link>
        </section>
      </div>
    </form>
  );
}
