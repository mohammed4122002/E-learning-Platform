"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { CircleAlert, FileText, LoaderCircle, Shield, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Feedback";
import { Glyph } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import { formatNumber } from "@/lib/format";
import { ibanBankCode, isValidSaudiIban, normalizeIban } from "@/lib/trainer-finance";
import { initialFormState } from "@/lib/validation/auth";
import { cancelBankChange, submitBankAccount } from "@/app/(trainer)/trainer/finance/actions";

/* TRR-FIN-03 «تغيير الحساب» (301:9016): what happens on change, new IBAN, bank, IBAN certificate, «أرسل للتحقق». */

const MIME = ["image/jpeg", "image/png", "application/pdf"];
const MAX = 5 * 1024 * 1024;
type Doc = { status: "empty" } | { status: "uploading"; name: string } | { status: "done"; name: string; size: number; path: string } | { status: "error"; message: string };

const WARNINGS = [
  { title: "يُوقف السحب ٤٨ ساعة", caption: "مهلة أمان تحميك من الاحتيال إن اخترق أحد حسابك" },
  { title: "يجب أن يكون الحساب باسمك", caption: "لا نحوّل إلى حساب شخص آخر مهما كانت العلاقة" },
  { title: "نطلب مستندًا بنكيًا", caption: "شهادة آيبان أو كشف حساب يُظهر الاسم والرقم" },
  { title: "طلبات السحب المعلّقة تُجمَّد", caption: "حتى اكتمال التحقق من الحساب الجديد" },
];

/** Groups of four for readability while typing: "SA03 8000 0000 …". */
const groupIban = (v: string) => normalizeIban(v).slice(0, 24).replace(/(.{4})/g, "$1 ").trim();

export function BankForm({ userId, banks, title }: { userId: string; banks: { code: string; name: string }[]; title: string }) {
  const [state, action, pending] = useActionState(submitBankAccount, initialFormState);
  const [iban, setIban] = useState(state.values?.iban ?? "");
  const [bank, setBank] = useState(state.values?.bank ?? "");
  const [doc, setDoc] = useState<Doc>({ status: "empty" });
  const fileRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  useEffect(() => {
    if (state.status === "success" && state.message) toast("success", state.message);
  }, [state, toast]);

  const ibanOk = isValidSaudiIban(iban);
  const bankMismatch = ibanOk && bank !== "" && ibanBankCode(iban) !== bank;
  const ready = ibanOk && bank !== "" && !bankMismatch && doc.status === "done" && !pending;

  const onIban = (v: string) => {
    setIban(groupIban(v));
    const code = ibanBankCode(v);
    if (isValidSaudiIban(v) && !bank && banks.some((b) => b.code === code)) setBank(code);
  };

  const upload = async (file: File | undefined) => {
    if (!file) return;
    if (!MIME.includes(file.type)) return setDoc({ status: "error", message: "الصيغة غير مدعومة — PDF أو صورة JPG/PNG." });
    if (file.size > MAX) return setDoc({ status: "error", message: "الملف أكبر من ٥ م.ب." });
    setDoc({ status: "uploading", name: file.name });
    const safe = file.name.replace(/[^\w.\-]+/g, "_").slice(-60) || "iban";
    const path = `${userId}/${crypto.randomUUID()}-${safe}`;
    const { error } = await createClient().storage.from("bank-documents").upload(path, file, { contentType: file.type, upsert: false });
    if (error) return setDoc({ status: "error", message: "تعذّر رفع الملف. تحقّق من اتصالك وأعد المحاولة." });
    setDoc({ status: "done", name: file.name, size: file.size, path });
  };

  const ibanError = state.fieldErrors?.iban ?? (iban.replace(/\s/g, "").length >= 24 && !ibanOk ? "رقم الآيبان غير صحيح — تحقّق من الخانات." : undefined);

  return (
    <section aria-labelledby="change-title" className="flex w-full flex-col gap-[18px] rounded-22 border border-border-default bg-bg-card p-5 shadow-card sm:p-[26px]">
      <h2 id="change-title" className="type-h2 text-text-primary">
        {title}
      </h2>
      <div className="flex items-start gap-3 rounded-16 border-2 border-state-error bg-state-error-bg px-4 pt-4 pb-[18px] sm:px-[18px]">
        <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-12 bg-bg-surface text-state-error">
          <Glyph icon={Shield} size={20} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <p className="type-h3 text-state-error">ماذا يحدث عند تغيير الحساب؟</p>
          <ul className="flex flex-col gap-2">
            {WARNINGS.map((w) => (
              <li key={w.title} className="flex items-start gap-2.5 rounded-12 bg-bg-surface px-3.5 pt-3 pb-3.5">
                <Glyph icon={CircleAlert} size={20} className="mt-0.5 text-state-error" />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <p className="type-subtitle text-text-primary">{w.title}</p>
                  <p className="type-body text-text-muted">{w.caption}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <form action={action} noValidate className="flex flex-col gap-[18px]">
        {state.status === "error" && state.message && <Alert tone="error" title={state.message} />}
        <input type="hidden" name="document" value={doc.status === "done" ? doc.path : ""} />
        <div className="flex flex-col gap-4">
          <Input
            name="iban"
            label="رقم الآيبان الجديد"
            placeholder="SA00 0000 0000 0000 0000 0000"
            dir="ltr"
            inputMode="text"
            autoComplete="off"
            spellCheck={false}
            className="[&_input]:text-end"
            value={iban}
            onChange={(e) => onIban(e.target.value)}
            maxLength={29}
            error={ibanError}
            required
          />
          <Select
            name="bank"
            label="البنك"
            placeholder="اختر البنك"
            options={banks.map((b) => ({ value: b.code, label: b.name }))}
            value={bank}
            onChange={(e) => setBank(e.target.value)}
            error={state.fieldErrors?.bank ?? (bankMismatch ? "البنك المختار لا يطابق رقم الآيبان." : undefined)}
            required
          />
          <input
            ref={fileRef}
            type="file"
            accept={MIME.join(",")}
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(e) => {
              void upload(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              void upload(e.dataTransfer.files[0]);
            }}
            aria-label={doc.status === "done" ? `شهادة الآيبان — ${doc.name}، اضغط للاستبدال` : "ارفع شهادة الآيبان"}
            className={`flex h-[140px] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-16 border-[1.5px] border-dashed bg-bg-surface p-6 text-center focus-ring ${
              doc.status === "error" || state.fieldErrors?.document ? "border-state-error" : doc.status === "done" ? "border-state-success" : "border-border-default"
            }`}
          >
            <Glyph
              icon={doc.status === "uploading" ? LoaderCircle : doc.status === "done" ? FileText : Upload}
              size={24}
              className={doc.status === "uploading" ? "animate-[tg-spin_0.9s_linear_infinite] text-text-brand" : doc.status === "done" ? "text-state-success" : "text-text-secondary"}
            />
            <span className="type-subtitle text-text-primary">{doc.status === "done" || doc.status === "uploading" ? doc.name : "شهادة الآيبان"}</span>
            <span className={`type-caption ${doc.status === "error" ? "text-state-error" : "text-text-muted"}`}>
              {doc.status === "error"
                ? doc.message
                : doc.status === "done"
                  ? `${formatNumber(Math.round((doc.size / 1024 / 1024) * 10) / 10)} م.ب · اضغط للاستبدال`
                  : doc.status === "uploading"
                    ? "جارٍ الرفع…"
                    : "PDF أو صورة واضحة تُظهر اسمك ورقم الحساب · حتى ٥ م.ب"}
            </span>
          </button>
          {state.fieldErrors?.document && (
            <p role="alert" className="type-caption text-state-error">
              {state.fieldErrors.document}
            </p>
          )}
        </div>
        <Button type="submit" size="l" fullWidth disabled={!ready} loading={pending}>
          أرسل للتحقق
        </Button>
      </form>
    </section>
  );
}

/** «يمكنك إلغاء التغيير خلال ٤٨ ساعة» — cancels the pending (unverified) account. */
export function CancelBankChangeButton({ accountId }: { accountId: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  return (
    <div className="flex flex-col gap-2">
      {error && <Alert tone="error" title={error} />}
      <Button
        variant="outline"
        size="l"
        fullWidth
        loading={pending}
        onClick={() =>
          start(async () => {
            const res = await cancelBankChange(accountId);
            if (res.error) setError(res.error);
            else toast("success", "أُلغي تغيير الحساب. يبقى حسابك السابق كما هو.");
          })
        }
      >
        ألغِ التغيير
      </Button>
    </div>
  );
}
