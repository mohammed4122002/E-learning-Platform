"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { saveBid } from "@/app/(trainer)/trainer/opportunities/actions";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Choice";
import { Alert, Spinner } from "@/components/ui/Feedback";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { BidCard, BidIcon, CardTitle, ToneLine } from "@/components/trainer-bids/parts";
import { checkBidAttachment, uploadBidAttachment } from "@/lib/bid-upload";
import { formatPercent, pluralAr } from "@/lib/format";
import { initialFormState } from "@/lib/validation/auth";
import { money2, netOf, parseAmount } from "@/lib/trainer-bids";

type Draft = { programId: string; price: string; hours: string; message: string; attachmentPath: string; attachmentName: string };

function competitors(n: number): string {
  if (n === 0) return "يصل العرض للجهة فورًا. لم يتقدّم مدرب آخر على هذا الطلب بعد.";
  const who = pluralAr(n, ["مدربًا آخر", "مدربَين آخرَين", "مدربين آخرين", "مدربًا آخر"]);
  return `يصل العرض للجهة فورًا. تنافس ${who} على هذا الطلب.`;
}

/**
 * TRR-BID-02 · تقديم عرض تدريبي (303:9392): the «عرضك» form, the live «ماذا ستستلم؟» summary and the send card.
 * The request card is rendered on the server and passed in as `requestCard`.
 */
export function BidForm({
  requestId,
  requestCard,
  programs,
  draft,
  commissionPercent,
  otherBids,
}: {
  requestId: string;
  requestCard: ReactNode;
  programs: { id: string; title: string }[];
  draft: Draft;
  commissionPercent: number;
  otherBids: number;
}) {
  const [state, action, pending] = useActionState(saveBid, initialFormState);
  const toast = useToast();
  const v = state.values ?? draft;
  const [price, setPrice] = useState(v.price ?? "");
  const [committed, setCommitted] = useState(false);
  const [file, setFile] = useState<{ path: string; name: string } | null>(draft.attachmentPath ? { path: draft.attachmentPath, name: draft.attachmentName } : null);
  const [upload, setUpload] = useState<{ busy: boolean; error: string | null }>({ busy: false, error: null });
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.status === "success" && state.message) toast("success", state.message);
  }, [state, toast]);

  const amount = parseAmount(price);
  const valid = Number.isFinite(amount) && amount > 0;
  const commission = valid ? Math.round(amount * commissionPercent) / 100 : 0;
  const net = valid ? netOf(amount, commissionPercent) : 0;
  const fe = state.fieldErrors ?? {};

  async function pick(f: File | undefined) {
    if (!f) return;
    const problem = checkBidAttachment(f);
    if (problem) return setUpload({ busy: false, error: problem });
    setUpload({ busy: true, error: null });
    try {
      setFile(await uploadBidAttachment(f, requestId));
      setUpload({ busy: false, error: null });
    } catch {
      setUpload({ busy: false, error: "تعذّر رفع الملف. تحقّق من الاتصال وأعد المحاولة." });
    }
  }

  return (
    <form action={action} className="grid w-full grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_400px]" noValidate>
      <input type="hidden" name="requestId" value={requestId} />
      <input type="hidden" name="attachmentPath" value={file?.path ?? ""} />
      <input type="hidden" name="attachmentName" value={file?.name ?? ""} />

      <div className="flex min-w-0 flex-col gap-6">
        {requestCard}
        <BidCard pad={26} labelledBy="offer-title">
          <CardTitle id="offer-title">عرضك</CardTitle>
          <Select
            name="programId"
            label="البرنامج الذي ستقدّمه"
            defaultValue={v.programId ?? ""}
            placeholder={programs.length ? "اختر برنامجًا منشورًا" : "لا برامج منشورة بعد"}
            options={programs.map((p) => ({ value: p.id, label: `${p.title} — منشور` }))}
            disabled={programs.length === 0}
            error={fe.programId}
          />
          <ul>
            <ToneLine icon="info" tone="info" textTone>
              تستطيع اختيار برنامج منشور فقط. إن لم يناسب أيٌّ منها،{" "}
              <Link href="/trainer/programs/new" className="underline underline-offset-4 focus-ring">
                أنشئ برنامجًا جديدًا
              </Link>{" "}
              أولًا.
            </ToneLine>
          </ul>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input name="hours" label="عدد الساعات" inputMode="decimal" defaultValue={v.hours ?? ""} trailing="ساعة" error={fe.hours} />
            <Input
              name="price"
              label="سعرك للورشة كاملة"
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.currentTarget.value)}
              error={fe.price}
            />
          </div>
          <Textarea name="message" label="لماذا أنت المناسب لهذه الورشة؟" rows={3} defaultValue={v.message ?? ""} error={fe.message} maxLength={4000} />
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={upload.busy}
              className="flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-16 border-[1.5px] border-dashed border-border-default bg-bg-surface p-6 text-center hover:bg-bg-brand-tint focus-ring"
            >
              {upload.busy ? <Spinner inline label="جارٍ رفع الملف" /> : <BidIcon name="upload" size={24} className="text-text-secondary" />}
              <span className="type-subtitle text-text-primary">{file ? file.name : "أرفق خطة الورشة (اختياري)"}</span>
              <span className="type-caption text-text-muted">{file ? "اضغط لاستبدال الملف · PDF" : "PDF · العروض المرفقة بخطة تُقبل أكثر بثلاثة أضعاف"}</span>
            </button>
            <input ref={fileInput} type="file" accept="application/pdf,.pdf" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => pick(e.currentTarget.files?.[0])} />
            {upload.error && (
              <p role="alert" className="type-caption text-state-error">
                {upload.error}
              </p>
            )}
          </div>
        </BidCard>
      </div>

      <aside className="flex min-w-0 flex-col gap-5">
        <BidCard pad={26} labelledBy="receive-title">
          <CardTitle id="receive-title">ماذا ستستلم؟</CardTitle>
          <dl className="flex flex-col gap-[18px]">
            <div className="flex items-center gap-3">
              <dt className="min-w-0 flex-1 type-body-lg text-text-secondary">قيمة عرضك</dt>
              <dd className="shrink-0 type-title text-text-primary">{valid ? money2(amount) : "—"}</dd>
            </div>
            <div className="flex items-center gap-3">
              <dt className="min-w-0 flex-1 type-body-lg text-text-secondary">{`عمولة المنصة ${formatPercent(commissionPercent)} · قيمة تشغيلية مؤقتة وفق إعدادات المنصة`}</dt>
              <dd className="shrink-0 type-title text-state-error">{valid ? `− ${money2(commission)}` : "—"}</dd>
            </div>
          </dl>
          <hr className="border-border-divider" />
          <div className="flex items-center gap-3">
            <span className="min-w-0 flex-1 type-h3 text-text-secondary">صافي لك</span>
            <span className="shrink-0 type-h2 text-state-success">{valid ? money2(net) : "—"}</span>
          </div>
          <p className="type-caption text-text-secondary">يُدفع بعد تنفيذ الورشة وتأكيد الجهة — لا مقدَّم.</p>
        </BidCard>

        <BidCard pad={26} labelledBy="wins-title">
          <CardTitle id="wins-title">ما يفوز بالعروض</CardTitle>
          <ul className="flex flex-col gap-[18px]">
            <ToneLine icon="check" tone="success">اربط خبرتك بقطاع الجهة تحديدًا</ToneLine>
            <ToneLine icon="check" tone="success">اذكر مخرَجًا ملموسًا لكل يوم</ToneLine>
            <ToneLine icon="check" tone="success">أرفق خطة الورشة</ToneLine>
            <ToneLine icon="octagonX" tone="error">لا تنسخ وصف برنامجك كما هو</ToneLine>
            <ToneLine icon="octagonX" tone="error">لا تقدّم بأقل سعر فقط — الجودة تفوز</ToneLine>
          </ul>
        </BidCard>

        <BidCard pad={26} labelledBy="send-title">
          <CardTitle id="send-title">إرسال العرض</CardTitle>
          <p className="type-body text-text-secondary">{competitors(otherBids)}</p>
          {state.status === "error" && state.message && <Alert tone="error" title={state.message} />}
          <Checkbox name="commit" checked={committed} onChange={(e) => setCommitted(e.currentTarget.checked)}>
            ألتزم بالتنفيذ في التواريخ المذكورة إن قُبل عرضي
          </Checkbox>
          <Button type="submit" name="intent" value="submit" size="l" fullWidth disabled={!committed || pending || upload.busy} loading={pending}>
            أرسل العرض
          </Button>
          <Button type="submit" name="intent" value="draft" variant="outline" size="l" fullWidth disabled={pending || upload.busy}>
            احفظ كمسودة
          </Button>
          <p className="type-caption text-state-warning">قبول عرضك يحجز التواريخ في تقويمك تلقائيًا.</p>
        </BidCard>
      </aside>
    </form>
  );
}
