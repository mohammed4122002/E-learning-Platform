import { CircleCheck, CircleX, FileText, Lock, Users, Wallet } from "lucide-react";
import { Glyph } from "@/components/ui/Icon";
import { formatDayMonth, formatPrice, toArabicDigits } from "@/lib/format";
import type { DisputeSubject } from "@/lib/data/money";
import { Chip, HowItWorks, SectionCard } from "./ui";

/** Frozen-amount banner of TRN-DSP-01 (info tint, 1.5px info border, amount tile at the end). */
export function FreezeBanner({ amount, currency, frozen }: { amount: number; currency: string; frozen: boolean }) {
  return (
    <section aria-labelledby="freeze-title" className="flex flex-col gap-4 rounded-16 border-[1.5px] border-state-info bg-state-info-bg px-5 py-5 sm:flex-row sm:items-center sm:px-6">
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <Chip tone="surface" icon={Lock} className="self-start text-state-info">
          المبلغ مجمّد ومحمي
        </Chip>
        <h2 id="freeze-title" className="type-h4 text-text-primary">
          {frozen ? "مبلغك مجمّد ومحمي طوال المراجعة" : "سيُجمَّد المبلغ فور إرسال النزاع"}
        </h2>
        <p className="type-body text-text-secondary">
          {frozen
            ? "لا يُصرف لأي طرف حتى صدور القرار. إن صدر القرار لصالحك يُحوَّل إليك خلال ٣ إلى ٧ أيام عمل."
            : "التجميد يتم آليًا بلا قرار بشري — لا يُصرف المبلغ للجهة التدريبية ولا يُغلق الطلب حتى صدور قرار النزاع. أموالك محمية طوال فترة المراجعة."}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-center gap-0.5 self-start rounded-16 bg-bg-surface px-5 py-3.5 sm:self-center">
        <span className="type-subtitle text-text-primary">{formatPrice(amount, currency).replace(" ر.س", "")}</span>
        <span className="type-caption text-text-muted">ر.س {frozen ? "مجمّدة" : "ستُجمَّد"}</span>
      </div>
    </section>
  );
}

/** "موضوع النزاع": the rejected refund (or the payment) under dispute. */
export function DisputeSubjectCard({ subject }: { subject: DisputeSubject }) {
  const r = subject.refund;
  return (
    <SectionCard title="موضوع النزاع" id="subject-title">
      <div className="flex items-start gap-3 rounded-12 bg-state-error-bg px-4 py-3.5">
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="type-subtitle text-state-error">
            {r ? `طلب استرداد ${r.status === "rejected" ? "مرفوض" : r.status === "approved" ? "معتمد" : "قيد المراجعة"} · ${r.ref}` : `عملية دفع · ${subject.courseTitle}`}
          </span>
          <span className="type-caption text-text-secondary">
            {r
              ? [r.note ? `السبب المصنّف: ${r.note}` : null, r.decidedAt ? `قرار بتاريخ ${formatDayMonth(r.decidedAt)}` : null, `المبلغ ${formatPrice(r.amount, subject.currency)}`].filter(Boolean).join(" · ")
              : `${subject.courseTitle} · المبلغ ${formatPrice(subject.amount, subject.currency)}`}
          </span>
        </span>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-8 bg-bg-surface text-state-error">
          <Glyph icon={r ? CircleX : Wallet} size={20} />
        </span>
      </div>
    </SectionCard>
  );
}

export function DisputeFairness() {
  return (
    <HowItWorks
      id="fairness-title"
      title="كيف نضمن عدالة المراجعة؟"
      items={[
        { icon: FileText, title: "قرار مُسبّب", text: "يصلك القرار مع سببه المصنّف ومستند القرار كاملًا." },
        { icon: Users, title: "الطرفان يُسمعان", text: "تُطلب ردود الجهة التدريبية وتُعرض عليك قبل القرار." },
        { icon: Lock, title: "المبلغ مجمّد", text: "يُجمَّد المبلغ آليًا لحظة فتح النزاع — لا يمكن صرفه لأي طرف حتى القرار." },
        { icon: CircleCheck, title: "مراجع مختلف", text: "يراجع النزاع مسؤول نزاعات لم يشارك في قرار رفض الاسترداد." },
      ]}
    />
  );
}

const STEPS = [
  { title: "يُجمَّد المبلغ فورًا", text: "آليًا لحظة الإرسال" },
  { title: "يُسنَد لمراجع مستقل", text: "خلال ٢٤ ساعة عمل" },
  { title: "تُطلب ردود الجهة", text: "٣ أيام عمل للرد" },
  { title: "قرار نهائي مُسبّب", text: "خلال ٧ أيام عمل كحد أقصى" },
];

export function DisputeWhatHappens() {
  return (
    <SectionCard title="ما الذي سيحدث؟" id="happens-title">
      <ol className="flex flex-col gap-4">
        {STEPS.map((s, i) => (
          <li key={s.title} className="flex items-start gap-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-bg-brand-tint type-caption text-text-brand">{toArabicDigits(i + 1)}</span>
            <span className="flex flex-col">
              <span className="type-subtitle text-text-primary">{s.title}</span>
              <span className="type-caption text-text-muted">{s.text}</span>
            </span>
          </li>
        ))}
      </ol>
    </SectionCard>
  );
}

