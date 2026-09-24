"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { Lock, TrendingDown, TrendingUp } from "lucide-react";
import { autosaveProgram, savePricing } from "@/app/(trainer)/trainer/programs/actions";
import { announceSaved, announceSaving } from "@/components/trainer-programs/SavedIndicator";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Feedback";
import { Input } from "@/components/ui/Field";
import { Glyph } from "@/components/ui/Icon";
import { formatPrice, toArabicDigits } from "@/lib/format";
import { initialFormState } from "@/lib/validation/auth";

const EXAMPLE_SEATS = 20;

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex w-full flex-col gap-[18px] rounded-22 border border-border-default bg-bg-card p-5 shadow-card sm:p-[26px]">
      <h2 className="type-h2 text-text-primary">{title}</h2>
      {children}
    </section>
  );
}

const toNumber = (v: string) => {
  const n = Number(v.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace(/[٬,\s]/g, "").replace("٫", "."));
  return Number.isFinite(n) && n >= 0 ? n : null;
};

/** TRR-PRG-02 · ٤ التسعير (314:11489). The refund tiers mirror refund_quote() — the platform's enforced policy. */
export function PricingForm({
  programId,
  initialPrice,
  commission,
  band,
  categoryName,
}: {
  programId: string;
  initialPrice: number | null;
  commission: number;
  band: { min: number; max: number } | null;
  categoryName: string | null;
}) {
  const [state, action, pending] = useActionState(savePricing, initialFormState);
  const [price, setPrice] = useState(state.values?.price ?? (initialPrice === null ? "" : String(initialPrice)));
  const [, startAutosave] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const n = toNumber(price);
  const fee = n === null ? null : Math.round(n * commission) / 100;
  const net = n === null || fee === null ? null : Math.round((n - fee) * 100) / 100;

  function onChange() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (!formRef.current) return;
      const fd = new FormData(formRef.current);
      fd.set("step", "pricing");
      announceSaving();
      startAutosave(async () => {
        const res = await autosaveProgram(fd);
        announceSaved(res.ok && res.savedAt ? res.savedAt : null);
      });
    }, 1200);
  }

  const tone = n === null || !band ? null : n < band.min ? "low" : n > band.max ? "high" : "mid";

  return (
    <form ref={formRef} action={action} onChange={onChange} noValidate className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <input type="hidden" name="id" value={programId} />
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <Card title="السعر المرجعي للبرنامج">
          <p className="type-body text-text-muted">هذا سعر مرجعي — تحدّد السعر الفعلي عند إنشاء كل دورة، ويمكن أن يختلف حسب المكان والموسم.</p>
          <Input name="price" label="السعر للمتدرب الواحد" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} error={state.fieldErrors?.price} trailing="ر.س" placeholder="مثال: ٤٩٠" />
          {tone && band && (
            <p className={`flex items-start gap-3.5 rounded-16 px-[18px] pt-4 pb-[18px] type-body-lg ${tone === "mid" ? "bg-state-success-bg text-state-success" : "bg-state-warning-bg text-state-warning"}`}>
              <Glyph icon={tone === "low" ? TrendingDown : TrendingUp} size={20} className="mt-1.5" />
              {tone === "mid" ? "سعرك ضمن المتوسط." : tone === "low" ? "سعرك أقل من المعتاد." : "سعرك أعلى من المعتاد."} برامج {categoryName ?? "هذا التخصص"} تتراوح بين {formatPrice(band.min).replace(" ر.س", "")} و
              {formatPrice(band.max)} على المنصة.
            </p>
          )}
        </Card>

        <Card title="كم يصلك من كل متدرب؟">
          <dl className="flex flex-col gap-[18px]">
            <div className="flex items-center gap-3">
              <dt className="min-w-0 flex-1 type-body-lg text-text-secondary">سعر البرنامج للمتدرب</dt>
              <dd className="type-title text-text-primary">{n === null ? "—" : formatPrice(n)}</dd>
            </div>
            <div className="flex items-center gap-3">
              <dt className="min-w-0 flex-1 type-body-lg text-text-secondary">عمولة المنصة {toArabicDigits(commission)}٪ · قيمة تشغيلية مؤقتة وفق إعدادات المنصة</dt>
              <dd className="type-title text-state-warning">{fee === null ? "—" : `− ${formatPrice(fee)}`}</dd>
            </div>
            <div aria-hidden className="h-px w-full bg-border-divider" />
            <div className="flex items-center gap-3">
              <dt className="min-w-0 flex-1 text-[20px] leading-[1.4] text-text-secondary">صافي لك من كل متدرب</dt>
              <dd className="type-h2 text-state-success">{net === null ? "—" : formatPrice(net)}</dd>
            </div>
            <div className="flex items-center gap-3">
              <dt className="min-w-0 flex-1 text-[20px] leading-[1.4] text-text-secondary">بـ{toArabicDigits(EXAMPLE_SEATS)} متدربًا في الدورة</dt>
              <dd className="type-h2 text-state-success">{net === null ? "—" : formatPrice(Math.round(net * EXAMPLE_SEATS * 100) / 100)}</dd>
            </div>
          </dl>
        </Card>

        <Card title="سياسة الاسترداد">
          <div className="flex items-center gap-3 rounded-16 bg-bg-disabled px-[18px] py-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-12 bg-bg-surface text-text-primary">
              <Glyph icon={Lock} size={20} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
              <span className="type-title text-text-primary">السياسة الموحّدة للمنصة — غير قابلة للتعديل</span>
              <span className="type-body text-text-muted">سياسة واحدة لكل البرامج تحمي المتدرب وتوحّد التوقعات.</span>
            </span>
          </div>
          <ul className="flex flex-col gap-[18px]">
            {[
              { when: "قبل البدء بـ٧ أيام أو أكثر", what: "استرداد ١٠٠٪", tone: "text-state-success" },
              { when: "قبل البدء بـ٣ إلى ٦ أيام", what: "استرداد ٥٠٪", tone: "text-state-warning" },
              { when: "قبل البدء بأقل من ٣ أيام أو بعده", what: "لا استرداد", tone: "text-state-error" },
              { when: "الدورات المسجّلة · خلال ١٤ يومًا من الشراء", what: "استرداد ١٠٠٪", tone: "text-state-success" },
            ].map((r) => (
              <li key={r.when} className="flex items-center gap-3 rounded-12 bg-bg-page px-4 py-3.5">
                <span className="min-w-0 flex-1 type-body-lg text-text-secondary">{r.when}</span>
                <span className={`text-[16px] leading-[1.5] ${r.tone}`}>{r.what}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <aside className="flex w-full shrink-0 flex-col gap-5 lg:w-[400px]">
        <Card title="متابعة">
          {state.status === "error" && state.message && <Alert tone="error" title={state.message} />}
          <Button type="submit" name="intent" value="next" size="l" fullWidth loading={pending}>
            التالي · المعاينة والإقرار
          </Button>
          <ButtonLink href={`/trainer/programs/${programId}/edit/materials`} variant="outline" size="l" fullWidth>
            السابق · المواد
          </ButtonLink>
        </Card>
      </aside>
    </form>
  );
}
