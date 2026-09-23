"use client";

import { useActionState, useRef, useState } from "react";
import { CircleAlert, EyeOff, FileText, Scale, Shield, Upload, X } from "lucide-react";
import { TARGET_ICONS } from "./ReportTypeCards";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Choice";
import { ChipRadio } from "@/components/ui/Chip";
import { Alert } from "@/components/ui/Feedback";
import { Textarea } from "@/components/ui/Field";
import { Glyph } from "@/components/ui/Icon";
import { IconRow } from "@/components/ui/InfoBlocks";
import { SectionCard } from "@/components/ui/PageHeading";
import { createClient } from "@/lib/supabase/client";
import { toArabicError } from "@/lib/errors";
import { submitReport } from "@/app/(workspace)/trainee/report/actions";
import { initialFormState, REPORT_REASONS, type ReportReason, type ReportTarget } from "@/lib/validation/engagement";

const REASONS_FOR: Record<ReportTarget, ReportReason[]> = {
  course: ["misleading", "inappropriate", "false_accreditation", "unprofessional", "false_trainer_info", "fake_reviews", "other"],
  trainer: ["unprofessional", "false_trainer_info", "inappropriate", "false_accreditation", "misleading", "other"],
  organization: ["misleading", "false_accreditation", "unprofessional", "fake_reviews", "inappropriate", "other"],
  review: ["fake_reviews", "inappropriate", "misleading", "other"],
};

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPT = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

/** TRN-RPT-01 · النموذج (Figma 227:13498): reason chips, details, optional evidence, confidentiality + acknowledgement. */
export function ReportForm({
  userId,
  type,
  target,
  typeCards,
  cancelHref,
}: {
  userId: string;
  type: ReportTarget;
  target: { id: string; title: string; meta: string } | null;
  typeCards: React.ReactNode;
  cancelHref: string;
}) {
  const [state, action, pending] = useActionState(submitReport, initialFormState);
  const fe = state.fieldErrors ?? {};
  const [confirmed, setConfirmed] = useState(false);
  const [evidencePath, setEvidencePath] = useState("");
  const [evidenceName, setEvidenceName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const reasons = REASONS_FOR[type];
  const reason = (state.values?.reason as ReportReason) || reasons[0];

  async function upload(file: File | undefined) {
    setUploadError(null);
    if (!file) return;
    if (!ACCEPT.includes(file.type)) return setUploadError("اختر صورة (JPG / PNG / WEBP) أو ملف PDF.");
    if (file.size > MAX_BYTES) return setUploadError("حجم الملف أكبر من ١٠ م.ب.");
    setUploading(true);
    const ext = (file.name.split(".").pop() ?? "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
    const base = file.name.replace(/\.[^.]+$/, "").replace(/[^A-Za-z0-9_-]+/g, "_").slice(0, 60) || "evidence";
    const path = `${userId}/${crypto.randomUUID()}-${base}.${ext}`;
    const { error } = await createClient().storage.from("report-evidence").upload(path, file, { contentType: file.type });
    setUploading(false);
    if (error) return setUploadError(toArabicError({ code: "upload_failed" }));
    setEvidencePath(path);
    setEvidenceName(file.name);
  }

  return (
    <form action={action} noValidate className="flex w-full flex-col items-start gap-6 lg:flex-row">
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="target" value={target?.id ?? ""} />
      <input type="hidden" name="evidencePath" value={evidencePath} />

      <div className="flex w-full min-w-0 flex-1 flex-col gap-6">
        {state.message && (
          <Alert tone="error" title="تعذّر إرسال البلاغ">
            {state.message}
          </Alert>
        )}
        <SectionCard title="عمّ تُبلّغ؟" titleId="report-what-title" as="div">
          {typeCards}
          {target ? (
            <div className="flex w-full items-center gap-3.5 rounded-12 bg-bg-page px-4 py-3.5">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-8 bg-bg-surface text-text-brand">
                <Glyph icon={TARGET_ICONS[type]} size={20} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                <span className="type-subtitle text-text-primary">{target.title}</span>
                <span className="type-caption text-text-muted">{target.meta}</span>
              </span>
              <ButtonLink href={`/trainee/report?type=${type}`} variant="ghost" size="s" className="w-20 sm:w-[120px]" aria-label="تغيير العنصر المُبلَّغ عنه">
                تغيير
              </ButtonLink>
            </div>
          ) : null}
          {fe.target && (
            <p role="alert" className="type-caption text-state-error">
              {fe.target}
            </p>
          )}
        </SectionCard>

        <SectionCard title="سبب البلاغ" titleId="report-reason-title" as="div">
          <p className="type-caption text-text-muted">اختر السبب الأقرب — يحدّد المسار الذي يسلكه البلاغ داخل الإدارة.</p>
          <fieldset className="flex flex-col gap-1">
            <legend className="sr-only">سبب البلاغ</legend>
            <div className="flex flex-wrap gap-2.5">
              {reasons.map((r) => (
                <ChipRadio key={r} name="reason" value={r} defaultChecked={reason === r}>
                  {REPORT_REASONS[r]}
                </ChipRadio>
              ))}
            </div>
            {fe.reason && (
              <p role="alert" className="type-caption text-state-error">
                {fe.reason}
              </p>
            )}
          </fieldset>
          <Textarea
            name="details"
            label="تفاصيل البلاغ"
            rows={3}
            required
            maxLength={2000}
            defaultValue={state.values?.details}
            error={fe.details}
            hint="٢٠ حرفًا على الأقل. اذكر ما رأيت ومتى وأين."
            placeholder="مثال: وصف البرنامج يذكر شهادة معتمدة من جهة دولية، لكن الشهادة الصادرة بعد الإتمام صادرة عن الجهة نفسها فقط."
          />
        </SectionCard>

        <SectionCard title="أدلة داعمة (اختيارية)" titleId="report-evidence-title" as="div">
          <input ref={fileRef} id="report-evidence" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="sr-only" onChange={(e) => upload(e.target.files?.[0])} />
          {evidenceName ? (
            <div className="flex w-full items-center gap-3 rounded-16 border-[1.5px] border-border-default bg-bg-surface px-4 py-3.5">
              <Glyph icon={FileText} size={20} className="text-text-brand" />
              <span className="min-w-0 flex-1 truncate type-subtitle text-text-primary" dir="auto">
                {evidenceName}
              </span>
              <button
                type="button"
                onClick={() => {
                  setEvidencePath("");
                  setEvidenceName(null);
                  if (fileRef.current) fileRef.current.value = "";
                }}
                aria-label="إزالة الملف"
                className="cursor-pointer rounded-8 p-1 text-text-muted hover:text-state-error focus-ring"
              >
                <Glyph icon={X} size={16} />
              </button>
            </div>
          ) : (
            <label
              htmlFor="report-evidence"
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                upload(e.dataTransfer.files?.[0]);
              }}
              className={`flex h-[140px] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-16 border-[1.5px] border-dashed p-6 text-center focus-within:border-action-primary ${
                dragOver ? "border-action-primary bg-bg-brand-tint" : "border-border-default bg-bg-surface"
              }`}
            >
              <Glyph icon={Upload} size={24} className="text-text-secondary" />
              <span className="type-subtitle text-text-primary">{uploading ? "جارٍ الرفع…" : "اسحب لقطة شاشة أو مستندًا"}</span>
              <span className="type-caption text-text-muted">صور أو PDF حتى ١٠ م.ب لكل ملف — أو اضغط للاختيار</span>
            </label>
          )}
          {uploadError && (
            <p role="alert" className="type-caption text-state-error">
              {uploadError}
            </p>
          )}
          <p className="type-caption text-text-muted">الأدلة تُسرّع المراجعة كثيرًا. لا ترفع بيانات شخصية لطرف ثالث.</p>
        </SectionCard>
      </div>

      <aside aria-label="سرّية البلاغ" className="flex w-full shrink-0 flex-col gap-5 lg:w-[380px]">
        <SectionCard title="سرّية البلاغ" titleId="report-privacy-title">
          <ul className="flex flex-col gap-4">
            <IconRow titleSize="small" icon={EyeOff} title="هويتك لا تُكشف" description="لا يعرف المبلَّغ عنه من قدّم البلاغ إطلاقًا." />
            <IconRow titleSize="small" icon={Shield} title="لا أثر على تسجيلك" description="تسجيلك ودرجاتك وشهادتك لا تتأثر بتقديم بلاغ." />
            <IconRow titleSize="small" icon={Scale} title="مراجعة محايدة" description="يراجعه فريق الامتثال لا الجهة المعنيّة." />
            <IconRow titleSize="small" icon={CircleAlert} title="البلاغ الكيدي مخالفة" description="البلاغات المتكررة بلا أساس تُعرّض الحساب للتقييد." />
          </ul>
        </SectionCard>
        <div className="flex flex-col gap-1">
          <Checkbox name="confirm" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)}>
            أقرّ بصحة ما ورد في البلاغ
          </Checkbox>
          {fe.confirm && (
            <p role="alert" className="type-caption text-state-error">
              {fe.confirm}
            </p>
          )}
        </div>
        <Button type="submit" size="l" fullWidth loading={pending} disabled={!confirmed || !target || uploading}>
          أرسل البلاغ
        </Button>
        {!target && <p className="type-caption text-text-muted">اختر العنصر الذي تُبلّغ عنه أولًا.</p>}
        <ButtonLink href={cancelHref} variant="text" size="l" fullWidth>
          إلغاء
        </ButtonLink>
      </aside>
    </form>
  );
}
