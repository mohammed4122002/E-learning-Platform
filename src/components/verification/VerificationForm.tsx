"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Award, CircleCheck, CircleX, CreditCard, FileText, Hourglass, Landmark, LoaderCircle, Shield, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Checkbox } from "@/components/ui/Choice";
import { Alert } from "@/components/ui/Feedback";
import { Glyph } from "@/components/ui/Icon";
import { TileRow } from "@/components/profile/bits";
import { DocumentsSafety } from "./DocumentsSafety";
import { createClient } from "@/lib/supabase/client";
import { formatNumber } from "@/lib/format";
import { asciiDigits } from "@/lib/validation/profile";
import { initialFormState } from "@/lib/validation/auth";
import { submitVerification } from "@/app/(workspace)/trainee/verification/actions";

type DocType = "national_id" | "iqama" | "passport";
const TYPES: { value: DocType; title: string; caption: string; icon: LucideIcon }[] = [
  { value: "national_id", title: "بطاقة الهوية الوطنية", caption: "للمواطنين · الوجهان", icon: CreditCard },
  { value: "iqama", title: "الإقامة", caption: "للمقيمين · الوجهان", icon: FileText },
  { value: "passport", title: "جواز السفر", caption: "صفحة البيانات فقط", icon: FileText },
];
const MIME = ["image/jpeg", "image/png", "application/pdf"];
const MAX = 5 * 1024 * 1024;

type Slot = { status: "empty" } | { status: "uploading"; name: string } | { status: "done"; name: string; size: number; path: string } | { status: "error"; message: string };

const WHY = [
  { icon: Award, title: "شهادات قابلة للتحقق", caption: "الشهادة بلا هوية موثَّقة لا قيمة لها أمام جهة توظيف — التوثيق هو ما يجعلها دليلًا." },
  { icon: Landmark, title: "برامج معتمدة", caption: "بعض الجهات تشترط التوثيق للتسجيل في برامجها المعتمدة." },
  { icon: Shield, title: "حماية حسابك", caption: "يمنع انتحال شخصيتك أو استخدام شهاداتك من غيرك." },
  { icon: Hourglass, title: "استرداد آمن", caption: "يضمن عودة أي مبلغ مسترد إلى صاحب الحساب نفسه." },
];

const TIPS = [
  { ok: true, text: "صورة واضحة والأركان الأربعة ظاهرة" },
  { ok: true, text: "إضاءة جيدة بلا انعكاس أو ظل" },
  { ok: false, text: "لا تغطِّ أي جزء بإصبعك" },
  { ok: false, text: "لا ترفع صورة من شاشة أخرى" },
];

const sizeLabel = (bytes: number) => `${formatNumber(Math.round((bytes / 1024 / 1024) * 10) / 10)} م.ب`;

function StepBadge({ n }: { n: string }) {
  return (
    <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full bg-action-primary type-small text-text-on-brand">
      {n}
    </span>
  );
}

function UploadZone({ label, slot, onFile, optional = false }: { label: string; slot: Slot; onFile: (f: File | undefined) => void; optional?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  const done = slot.status === "done";
  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <input
        ref={ref}
        type="file"
        accept={MIME.join(",")}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          onFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => ref.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          onFile(e.dataTransfer.files[0]);
        }}
        aria-label={`${label}${done ? " — تم الرفع، اضغط للاستبدال" : ""}`}
        className={`flex min-h-[138px] w-full cursor-pointer flex-col items-center justify-center gap-2.5 rounded-12 px-4 py-6 text-center focus-ring ${
          done
            ? "border-[1.5px] border-state-success bg-state-success-bg text-state-success"
            : slot.status === "error"
              ? "border-[1.5px] border-dashed border-state-error bg-bg-surface"
              : "border-[1.5px] border-dashed border-border-default bg-bg-surface"
        }`}
      >
        <Glyph
          icon={slot.status === "uploading" ? LoaderCircle : Upload}
          size={20}
          className={slot.status === "uploading" ? "animate-[tg-spin_0.9s_linear_infinite] text-text-brand" : done ? "" : "text-text-secondary"}
        />
        <span className={`type-subtitle ${done ? "text-state-success" : "text-text-primary"}`}>
          {label}
          {done ? " — تم الرفع" : optional ? " (اختياري)" : ""}
        </span>
        <span className={`type-caption ${done ? "text-state-success" : slot.status === "error" ? "text-state-error" : "text-text-muted"}`}>
          {slot.status === "done" ? (
            <>
              <span dir="ltr">{slot.name}</span> · {sizeLabel(slot.size)}
            </>
          ) : slot.status === "uploading" ? (
            "جارٍ الرفع…"
          ) : slot.status === "error" ? (
            slot.message
          ) : (
            "اسحب الصورة أو اختر من جهازك"
          )}
        </span>
      </button>
    </div>
  );
}

/** TRN-VER-01 · توثيق الهوية (244:15646). Files go to `identity-documents/<uid>/<uuid>-<file>` before the RPC call. */
export function VerificationForm({ userId, resubmit }: { userId: string; resubmit?: { documentType: DocType; note: string | null } }) {
  const [state, action, pending] = useActionState(submitVerification, initialFormState);
  const [docType, setDocType] = useState<DocType>(resubmit?.documentType ?? "national_id");
  const [front, setFront] = useState<Slot>({ status: "empty" });
  const [back, setBack] = useState<Slot>({ status: "empty" });
  const [consent, setConsent] = useState(false);
  const [last4, setLast4] = useState("");
  const needsBack = docType !== "passport";

  const upload = async (file: File | undefined, set: (s: Slot) => void) => {
    if (!file) return;
    if (!MIME.includes(file.type)) return set({ status: "error", message: "الصيغة غير مدعومة — JPG أو PNG أو PDF." });
    if (file.size > MAX) return set({ status: "error", message: "الملف أكبر من ٥ ميجابايت." });
    set({ status: "uploading", name: file.name });
    const safe = file.name.replace(/[^\w.\-]+/g, "_").slice(-60) || "document";
    const path = `${userId}/${crypto.randomUUID()}-${safe}`;
    const { error } = await createClient().storage.from("identity-documents").upload(path, file, { contentType: file.type, upsert: false });
    if (error) return set({ status: "error", message: "تعذّر رفع الملف. تحقّق من اتصالك وأعد المحاولة." });
    set({ status: "done", name: file.name, size: file.size, path });
  };

  const ready = front.status === "done" && (!needsBack || back.status !== "uploading") && consent && !pending;

  return (
    <form action={action} noValidate className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <input type="hidden" name="documentType" value={docType} />
      <input type="hidden" name="frontPath" value={front.status === "done" ? front.path : ""} />
      <input type="hidden" name="backPath" value={needsBack && back.status === "done" ? back.path : ""} />
      <input type="hidden" name="last4" value={last4} />

      <div className="flex min-w-0 flex-col gap-6">
        {resubmit?.note && (
          <Alert tone="info" title="ملاحظة فريق التوثيق">
            {resubmit.note}
          </Alert>
        )}
        <section aria-labelledby="step1-title" className="flex flex-col gap-5 rounded-16 border border-border-default bg-bg-card p-5 shadow-card sm:p-6">
          <div className="flex items-center gap-3">
            <h2 id="step1-title" className="flex-1 type-h3 text-text-primary">
              اختر نوع الهوية
            </h2>
            <StepBadge n="١" />
          </div>
          <div role="radiogroup" aria-labelledby="step1-title" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {TYPES.map((t) => {
              const active = t.value === docType;
              return (
                <button
                  key={t.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setDocType(t.value)}
                  className={`flex cursor-pointer flex-col items-center gap-2 rounded-12 px-4 py-5 text-center focus-ring ${
                    active ? "border-2 border-action-primary bg-bg-surface" : "border border-border-default bg-bg-page hover:bg-bg-brand-tint"
                  }`}
                >
                  <span className={`flex size-12 items-center justify-center rounded-12 ${active ? "bg-action-primary text-text-on-brand" : "bg-bg-surface text-text-brand"}`}>
                    <Glyph icon={t.icon} size={20} />
                  </span>
                  <span className={`type-subtitle ${active ? "text-text-brand" : "text-text-primary"}`}>{t.title}</span>
                  <span className="type-caption text-text-muted">{t.caption}</span>
                </button>
              );
            })}
          </div>
          <Input
            label="آخر ٤ خانات من رقم المستند (اختياري)"
            inputMode="text"
            dir="ltr"
            maxLength={4}
            placeholder="1234"
            value={last4}
            onChange={(e) => setLast4(asciiDigits(e.target.value).toUpperCase().replace(/[^0-9A-Z]/g, "").slice(-4))}
            hint="نحفظ آخر ٤ خانات فقط لمطابقة المستند — لا نطلب الرقم كاملًا ولا نعرضه."
            error={state.fieldErrors?.last4}
          />
        </section>

        <section aria-labelledby="step2-title" className="flex flex-col gap-5 rounded-16 border border-border-default bg-bg-card p-5 shadow-card sm:p-6">
          <div className="flex items-center gap-3">
            <h2 id="step2-title" className="flex-1 type-h3 text-text-primary">
              ارفع صورة الهوية
            </h2>
            <StepBadge n="٢" />
          </div>
          <div className="flex flex-col gap-4 sm:flex-row">
            <UploadZone label={docType === "passport" ? "صفحة البيانات" : "الوجه الأمامي"} slot={front} onFile={(f) => void upload(f, setFront)} />
            {needsBack && <UploadZone label="الوجه الخلفي" slot={back} onFile={(f) => void upload(f, setBack)} optional />}
          </div>
          {state.fieldErrors?.frontPath && (
            <p role="alert" className="type-caption text-state-error">
              {state.fieldErrors.frontPath}
            </p>
          )}
          <div className="flex flex-col gap-2.5 rounded-12 bg-bg-page px-4 py-4">
            <p className="type-subtitle text-text-primary">لتنجح المراجعة من أول مرة</p>
            <ul className="flex flex-col gap-2">
              {TIPS.map((t) => (
                <li key={t.text} className="flex items-center gap-2.5 type-small text-text-secondary">
                  <Glyph icon={t.ok ? CircleCheck : CircleX} size={16} className={t.ok ? "text-state-success" : "text-state-error"} />
                  {t.text}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="why-title" className="flex flex-col gap-4 rounded-16 border border-border-default bg-bg-card p-5 shadow-card sm:p-6">
          <h2 id="why-title" className="type-h3 text-text-primary">
            لماذا نطلب توثيق هويتك؟
          </h2>
          <ul className="flex flex-col gap-4">
            {WHY.map((w) => (
              <li key={w.title}>
                <TileRow icon={w.icon} title={<span className="type-subtitle">{w.title}</span>} caption={w.caption} />
              </li>
            ))}
          </ul>
        </section>
      </div>

      <aside aria-label="إرسال الطلب" className="flex min-w-0 flex-col gap-6">
        <DocumentsSafety />
        {state.status === "error" && state.message && (
          <Alert tone="error" title="تعذّر إرسال الطلب">
            {state.message}
          </Alert>
        )}
        <Checkbox name="consent" checked={consent} onChange={(e) => setConsent(e.target.checked)}>
          أقرّ بأن المستند يخصّني وأوافق على معالجته للتحقق
        </Checkbox>
        {state.fieldErrors?.consent && (
          <p role="alert" className="-mt-4 type-caption text-state-error">
            {state.fieldErrors.consent}
          </p>
        )}
        <Button type="submit" size="l" fullWidth loading={pending} disabled={!ready}>
          أرسل للمراجعة
        </Button>
        <Link href="/trainee/profile" className="self-center rounded-8 type-body-lg text-text-brand hover:underline focus-ring">
          لاحقًا — أكمل بدون توثيق
        </Link>
        <p className="type-caption text-text-muted">يمكنك استخدام المنصة والشراء والتعلّم بدون توثيق. التوثيق يلزم فقط للبرامج المعتمدة والشهادات القابلة للتحقق.</p>
      </aside>
    </form>
  );
}
