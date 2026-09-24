"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Award, CircleCheck, CircleX, Download, Info, Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Glyph } from "@/components/ui/Icon";
import { formatNumber, formatPrice, pluralAr, toArabicDigits } from "@/lib/format";
import { netOf } from "@/lib/trainer-courses";
import type { CourseMode } from "@/types/views";
import { useWizard } from "./WizardShell";

/* TRR-CRS-02 · ٤ المقاعد والسعر · ساعات التدريب (4227:2) and ٤ التسعير (مسجَّلة) (396:16957 / 4227:331). */

const money = (n: number) => `${new Intl.NumberFormat("ar-SA-u-nu-arab", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)} ر.س`;

export function Switch({ checked, onChange, disabled, label }: { checked: boolean; onChange?: (v: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <span className="relative inline-flex h-7 w-12 shrink-0 items-center">
      <input
        type="checkbox"
        role="switch"
        aria-label={label}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
        className="peer absolute inset-0 cursor-pointer appearance-none rounded-full bg-border-default transition-colors checked:bg-action-primary focus-ring disabled:cursor-not-allowed disabled:opacity-60"
      />
      <span aria-hidden className="pointer-events-none absolute start-[3px] size-[22px] rounded-full bg-white shadow-knob transition-transform peer-checked:-translate-x-5" />
    </span>
  );
}

/** Hours editor bound to the wizard autosave (rendered above the stepper). */
export function HoursEditor({ initial, actual, actualLabel }: { initial: number; actual: string; actualLabel: string }) {
  const { save } = useWizard();
  const [hours, setHours] = useState(initial);
  return (
    <HoursCard
      hours={hours}
      actual={actual}
      actualLabel={actualLabel}
      onChange={(h) => {
        setHours(h);
        save({ duration_hours: h });
      }}
    />
  );
}

/** «الساعات التدريبية المعتمدة» (4227:315): ±5 stepper + actual duration line. */
export function HoursCard({ hours, onChange, actual, actualLabel, readOnly = false }: { hours: number; onChange?: (h: number) => void; actual: string; actualLabel: string; readOnly?: boolean }) {
  return (
    <section className="flex flex-col gap-3.5 rounded-[14px] border border-border-default bg-bg-card p-6">
      <h2 className="type-title text-text-primary">{readOnly ? "الساعات والمدة" : "الساعات التدريبية المعتمدة"}</h2>
      {!readOnly && (
        <div className="flex items-center self-start">
          <button
            type="button"
            aria-label="زِد ٥ ساعات"
            onClick={() => onChange?.(Math.min(1000, hours + 5))}
            className="flex h-[54px] w-[55px] cursor-pointer items-center justify-center rounded-s-[10px] border border-border-default bg-bg-page text-[22px] font-bold text-text-brand focus-ring"
          >
            +
          </button>
          <output aria-live="polite" className="flex h-[52px] min-w-[142px] items-center justify-center border-y border-border-default bg-bg-surface px-9 text-[20px] font-bold text-text-primary">
            {pluralAr(hours, ["ساعة واحدة", "ساعتان", "ساعات", "ساعة"])}
          </output>
          <button
            type="button"
            aria-label="أنقص ٥ ساعات"
            disabled={hours <= 5}
            onClick={() => onChange?.(Math.max(5, hours - 5))}
            className="flex h-[54px] w-[56px] cursor-pointer items-center justify-center rounded-e-[10px] border border-border-default bg-bg-page text-[22px] font-bold text-text-brand focus-ring disabled:opacity-40"
          >
            −
          </button>
        </div>
      )}
      {!readOnly && <p className="type-caption text-text-secondary">تُحدَّد الساعات التدريبية المعتمدة بمضاعفات ٥.</p>}
      {readOnly && (
        <p className="flex items-center gap-2.5 rounded-[10px] border border-border-default bg-bg-page px-4 py-[13px]">
          <span className="text-[13.5px] text-text-secondary">الساعات التدريبية المعتمدة</span>
          <span className="text-[15px] font-bold text-text-brand">{pluralAr(hours, ["ساعة واحدة", "ساعتان", "ساعات", "ساعة"])}</span>
        </p>
      )}
      <p className="flex items-center gap-2.5 rounded-[10px] border border-border-default bg-bg-page px-4 py-[13px]">
        <span className="text-[13.5px] text-text-secondary">{actualLabel}</span>
        <span className="text-[15px] font-bold text-text-primary">{actual}</span>
      </p>
    </section>
  );
}

function Money({ label, value, tone = "text-text-primary", big = false }: { label: string; value: string; tone?: string; big?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className={`min-w-0 flex-1 ${big ? "type-title text-text-secondary" : "type-body text-text-secondary"}`}>{label}</span>
      <span className={`whitespace-nowrap ${big ? "type-h3" : "type-subtitle"} ${tone}`}>{value}</span>
    </div>
  );
}

/** «Trainer / Recorded · Pricing Card» (394:4005): Paid · Free · Locked. */
export function RecordedPricingCard({
  price,
  free,
  commission,
  locked,
  buyers = 0,
  onPrice,
  onFree,
}: {
  price: number;
  free: boolean;
  commission: number;
  locked: boolean;
  buyers?: number;
  onPrice?: (v: number) => void;
  onFree?: (v: boolean) => void;
}) {
  const [text, setText] = useState(price ? String(price) : "");
  const fee = free ? 0 : Math.round(price * commission) / 100;
  return (
    <section className={`flex flex-col gap-5 rounded-22 bg-bg-card px-7 pt-[26px] pb-7 drop-shadow-milestone ${locked ? "border-[1.5px] border-state-info" : "border border-border-default"}`}>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="min-w-[12rem] flex-1 type-h2 text-text-primary">سعر الدورة المسجَّلة</h2>
        {locked && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-state-info-bg px-2.5 py-1 type-caption text-state-info">
            مقفل — بيعت {pluralAr(buyers, ["لمشترٍ واحد", "لمشتريَين", "لمشترين", "مشتريًا"])}
            <Glyph icon={Lock} size={16} />
          </span>
        )}
      </div>
      {locked ? (
        <p className="flex items-start gap-3 rounded-16 bg-state-info-bg px-[18px] pt-[15px] pb-4 type-body-lg text-state-info">
          <Glyph icon={Lock} size={20} className="mt-1.5" />
          <span className="flex-1">السعر مقفل منذ أول عملية شراء — BR-L3. من دفع لا يتأثر بأي تغيير. تغيير السعر أنشئ دورة جديدة.</span>
        </p>
      ) : (
        <p className="flex items-start gap-3 rounded-16 bg-bg-brand-tint px-[18px] pt-[15px] pb-4 type-body-lg text-text-brand">
          <Glyph icon={Info} size={20} className="mt-1.5" />
          <span className="flex-1">الدورة المسجَّلة تُباع بيعًا مفتوحًا دائمًا — بلا مقاعد ولا حد أدنى للانعقاد ولا مواعيد.</span>
        </p>
      )}
      <div role="radiogroup" aria-label="نوع التسعير" className="grid gap-4 sm:grid-cols-2">
        {[
          { key: true, title: "مجانية", text: "بلا مقابل — تبني سمعتك وجمهورك" },
          { key: false, title: "مدفوعة", text: "السعر يُدفع مرة ووصول دائم" },
        ].map((o) => {
          const on = free === o.key;
          return (
            <button
              key={String(o.key)}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={locked}
              onClick={() => onFree?.(o.key)}
              className={`flex cursor-pointer flex-col gap-2 rounded-16 px-5 pt-5 pb-[22px] text-start focus-ring disabled:cursor-not-allowed ${
                on ? "border-2 border-action-primary bg-bg-brand-tint" : "border-[1.5px] border-border-default bg-bg-page"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <span className={`flex-1 type-title ${on ? "text-text-brand" : "text-text-primary"}`}>{o.title}</span>
                <span aria-hidden className={`flex size-[22px] items-center justify-center rounded-full border-[1.5px] bg-bg-surface ${on ? "border-2 border-action-primary" : "border-border-default"}`}>
                  {on && <span className="size-2.5 rounded-full bg-action-primary" />}
                </span>
              </span>
              <span className="type-body text-text-muted">{o.text}</span>
            </button>
          );
        })}
      </div>
      {!free && (
        <Input
          label="السعر للمشتري"
          inputMode="decimal"
          trailing="ر.س"
          value={text}
          disabled={locked}
          onChange={(e) => {
            const v = e.target.value.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace(/[^0-9.]/g, "");
            setText(v);
            const n = Number(v);
            if (v && Number.isFinite(n)) onPrice?.(n);
          }}
        />
      )}
      <div className="flex flex-col gap-3 rounded-16 bg-bg-page px-5 pt-[18px] pb-5">
        <Money label="سعر الدورة" value={free ? "مجانية" : money(price)} />
        <Money label="عمولة المنصة · وفق إعدادات المنصة المعتمدة" value={`− ${money(fee)}`} tone="text-state-warning" />
        <hr className="border-border-divider" />
        <Money label="صافي لك من كل عملية بيع" value={money(netOf(free ? 0 : price, commission))} tone="text-state-success" big />
        <p className="type-caption text-text-muted">يُفرَج عن إيراد كل عملية بيع بعد ١٤ يومًا من الشراء (مهلة الاسترداد) — BR-L9.</p>
      </div>
    </section>
  );
}

type Props = {
  courseId: string;
  mode: CourseMode;
  commission: number;
  price: number;
  pricingSet: boolean;
  priceLocked: boolean;
  buyers: number;
  capacity: number;
  minCapacity: number | null;
  waitlistEnabled: boolean;
  flags: { lifetimeAccess: boolean; allowDownloads: boolean; certificateOnCompletion: boolean };
};

export function PricingStep(p: Props) {
  const { save, flush } = useWizard();
  const router = useRouter();
  const [price, setPrice] = useState(p.price);
  const [free, setFree] = useState(p.pricingSet && p.price === 0);
  const [capacity, setCapacity] = useState(String(p.capacity));
  const [minCap, setMinCap] = useState(p.minCapacity === null ? "" : String(p.minCapacity));
  const [waitlist, setWaitlist] = useState(p.waitlistEnabled);
  const [flags, setFlags] = useState(p.flags);
  const [capError, setCapError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState<string | null>(null);
  const recorded = p.mode === "recorded";
  const cap = Number(capacity) || 0;
  const min = Number(minCap) || 0;

  async function go(target: string, key: string) {
    setLeaving(key);
    if (!p.priceLocked) save({ price: free ? 0 : price, pricing_set: true });
    const ok = await flush();
    setLeaving(null);
    if (ok) router.push(target);
  }

  const continueCard = (
    <section className="flex flex-col gap-[18px] rounded-22 border border-border-default bg-bg-card p-[26px] shadow-card">
      <h2 className="type-h2 text-text-primary">متابعة</h2>
      <Button size="l" fullWidth loading={leaving === "next"} onClick={() => void go(`/trainer/courses/${p.courseId}/setup/review`, "next")}>
        التالي · المراجعة والنشر
      </Button>
      {recorded && (
        <Button size="l" fullWidth variant="outline" loading={leaving === "later"} onClick={() => void go("/trainer/courses", "later")}>
          احفظ وأكمل لاحقًا
        </Button>
      )}
      <Link
        href={`/trainer/courses/${p.courseId}/setup/schedule`}
        className={`flex h-14 items-center justify-center rounded-12 px-8 type-body-lg focus-ring ${recorded ? "text-text-brand hover:bg-bg-brand-tint" : "border-[1.5px] border-border-default text-text-primary hover:bg-bg-brand-tint"}`}
      >
        {recorded ? "السابق · المحتوى" : "السابق · الجدولة"}
      </Link>
    </section>
  );

  if (recorded) {
    const access: { key: keyof Props["flags"]; field: "lifetime_access" | "allow_downloads" | "certificate_on_completion"; title: string; hint: string; icon: LucideIcon }[] = [
      { key: "lifetimeAccess", field: "lifetime_access", title: "وصول دائم", hint: "المشتري يشاهد متى شاء بلا انتهاء صلاحية", icon: CircleCheck },
      { key: "allowDownloads", field: "allow_downloads", title: "السماح بتنزيل الملفات", hint: "الفيديوهات لا تُنزَّل — الملفات فقط", icon: Download },
      { key: "certificateOnCompletion", field: "certificate_on_completion", title: "شهادة عند الإكمال", hint: "تصدر آليًا بعد مشاهدة ١٠٠٪ من الدروس", icon: Award },
    ];
    return (
        <div className="flex flex-col gap-[26px] lg:flex-row lg:items-start">
          <div className="flex min-w-0 flex-1 flex-col gap-[26px]">
            <RecordedPricingCard
              price={price}
              free={free}
              commission={p.commission}
              locked={p.priceLocked}
              buyers={p.buyers}
              onFree={(v) => {
                setFree(v);
                save({ price: v ? 0 : price, pricing_set: true });
              }}
              onPrice={(v) => {
                setPrice(v);
                save({ price: v, pricing_set: true });
              }}
            />
            <section className="flex flex-col gap-[18px] rounded-22 border border-border-default bg-bg-card p-[26px] shadow-card">
              <h2 className="type-h2 text-text-primary">الوصول والصلاحية</h2>
              {access.map((a) => (
                <label key={a.key} className="flex cursor-pointer items-center gap-3.5 rounded-16 bg-state-success-bg px-[18px] pt-4 pb-[18px]">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-12 bg-bg-surface text-state-success">
                    <Glyph icon={a.icon} size={20} />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="type-title text-text-primary">{a.title}</span>
                    <span className="type-body text-text-muted">{a.hint}</span>
                  </span>
                  <Switch
                    label={a.title}
                    checked={flags[a.key]}
                    onChange={(v) => {
                      setFlags((f) => ({ ...f, [a.key]: v }));
                      save({ [a.field]: v });
                    }}
                  />
                </label>
              ))}
            </section>
          </div>
          <aside className="flex w-full shrink-0 flex-col gap-[22px] lg:w-[400px]">
            <section className="flex flex-col gap-[18px] rounded-22 border border-border-default bg-bg-card p-[26px] shadow-card">
              <h2 className="type-h2 text-text-primary">ما لا يوجد في المسجَّلة</h2>
              <p className="type-body text-text-muted">هذه المفاهيم تخصّ الحضوري والمباشر فقط:</p>
              {["عدد المقاعد", "الحد الأدنى للانعقاد", "قائمة الانتظار", "تاريخ بداية ونهاية", "رصد الحضور"].map((t) => (
                <p key={t} className="flex items-center gap-3 rounded-12 bg-bg-disabled px-3.5 pt-3 pb-[13px] type-body text-text-disabled">
                  <Glyph icon={CircleX} size={20} />
                  <span className="flex-1">{t}</span>
                </p>
              ))}
            </section>
            {continueCard}
          </aside>
        </div>
    );
  }

  const fee = Math.round(price * cap * p.commission) / 100;
  return (
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <section className="flex flex-col gap-[18px] rounded-22 border border-border-default bg-bg-card p-[26px] shadow-card">
            <h2 className="type-h2 text-text-primary">المقاعد</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="الحد الأدنى للانعقاد"
                inputMode="numeric"
                value={minCap}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^0-9]/g, "");
                  setMinCap(v);
                  if (v === "" || Number(v) <= cap) {
                    setCapError(null);
                    save({ min_capacity: v === "" ? null : Number(v) });
                  } else setCapError("الحد الأدنى أكبر من العدد الأقصى.");
                }}
                error={capError ?? undefined}
              />
              <Input
                label="العدد الأقصى"
                inputMode="numeric"
                value={capacity}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^0-9]/g, "");
                  setCapacity(v);
                  if (Number(v) >= 1) save({ capacity: Number(v) });
                }}
              />
            </div>
            <label className="flex cursor-pointer items-center gap-3.5 rounded-16 bg-bg-page px-[18px] py-4">
              <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                <span className="type-title text-text-primary">فعّل قائمة الانتظار</span>
                <span className="type-body text-text-muted">عند اكتمال المقاعد ينضم المتدربون لقائمة انتظار — ويُدعون تلقائيًا عند أي انسحاب.</span>
              </span>
              <Switch
                label="فعّل قائمة الانتظار"
                checked={waitlist}
                onChange={(v) => {
                  setWaitlist(v);
                  save({ waitlist_enabled: v });
                }}
              />
            </label>
          </section>
          <section className="flex flex-col gap-[18px] rounded-22 border border-border-default bg-bg-card p-[26px] shadow-card">
            <h2 className="type-h2 text-text-primary">سعر هذه الدورة</h2>
            <PriceInput
              value={price}
              disabled={p.priceLocked}
              hint={p.priceLocked ? "السعر مقفل بعد أول تسجيل — BR-L3." : undefined}
              onChange={(v) => {
                setPrice(v);
                save({ price: v, pricing_set: true });
              }}
            />
            <label className="flex items-center gap-3.5 rounded-16 bg-bg-page px-[18px] py-4" aria-disabled>
              <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                <span className="type-title text-text-primary">سعر التسجيل المبكر</span>
                <span className="type-body text-text-muted">خصم لمن يسجّل قبل موعد تحدّده — يرفع التسجيل المبكر ويقلّل الإلغاء.</span>
              </span>
              <Switch label="سعر التسجيل المبكر" checked={false} disabled />
            </label>
          </section>
        </div>
        <aside className="flex w-full shrink-0 flex-col gap-5 lg:w-[400px]">
          <section className="flex flex-col gap-[18px] rounded-22 border border-border-default bg-bg-card p-[26px] shadow-card">
            <h2 className="type-h2 text-text-primary">عائد الدورة المتوقع</h2>
            <Money label={`السعر × ${pluralAr(cap, ["مقعد واحد", "مقعدان", "مقاعد", "مقعدًا"])}`} value={money(price * cap)} />
            <Money label={`عمولة المنصة ${toArabicDigits(p.commission)}٪ · قيمة تشغيلية مؤقتة وفق إعدادات المنصة`} value={`− ${money(fee)}`} tone="text-state-warning" />
            <hr className="border-border-divider" />
            <Money label="صافي عند اكتمال المقاعد" value={money(netOf(price * cap, p.commission))} tone="text-state-success" big />
            <Money label={`صافي عند الحد الأدنى ${formatNumber(min)}`} value={money(netOf(price * min, p.commission))} tone="text-state-warning" />
          </section>
          {continueCard}
        </aside>
      </div>
  );
}

function PriceInput({ value, onChange, disabled, hint }: { value: number; onChange: (v: number) => void; disabled?: boolean; hint?: string }) {
  const [text, setText] = useState(value ? String(value) : "");
  return (
    <Input
      label="السعر للمتدرب"
      inputMode="decimal"
      trailing="ر.س"
      value={text}
      disabled={disabled}
      hint={hint ?? (value > 0 ? `يدفع المتدرب ${formatPrice(value)} + ضريبة القيمة المضافة.` : undefined)}
      onChange={(e) => {
        const v = e.target.value.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace(/[^0-9.]/g, "");
        setText(v);
        const n = Number(v);
        if (v && Number.isFinite(n)) onChange(n);
      }}
    />
  );
}
