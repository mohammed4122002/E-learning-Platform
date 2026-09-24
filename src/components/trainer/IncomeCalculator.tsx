"use client";

import { useState, type ReactNode } from "react";
import { TriangleAlert } from "lucide-react";
import { Input } from "@/components/ui/Field";
import { Glyph } from "@/components/ui/Icon";
import { pluralAr, toArabicDigits } from "@/lib/format";

const fmt = new Intl.NumberFormat("ar-SA-u-nu-arab", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const money = (n: number) => `${fmt.format(Math.round(n * 100) / 100)} ر.س`;
const toLatin = (s: string) =>
  s
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[^0-9]/g, "");

type Benchmarks = {
  inPerson: number | null;
  live: number | null;
  recordedSale: number | null;
};

function NumberField({
  label,
  value,
  onChange,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  max: number;
}) {
  return (
    <Input
      label={label}
      inputMode="numeric"
      value={toArabicDigits(value)}
      onChange={(e) => {
        const n = Number(toLatin(e.target.value) || "0");
        onChange(Math.min(max, Math.max(0, n)));
      }}
      aria-describedby={undefined}
    />
  );
}

/** TRR-JRN-02: «عدّل الأرقام لتناسب واقعك» + «تقديرك الشهري» (464:36080 · 464:36106). */
export function IncomeCalculator({
  benchmarks,
  commissionPercent,
  initial,
  actual,
  hints,
}: {
  benchmarks: Benchmarks;
  commissionPercent: number;
  initial: { inPerson: number; live: number; recorded: number; offers: number };
  actual: { month: number; avg3: number };
  hints: ReactNode;
}) {
  const [v, setV] = useState(initial);
  const inPerson = v.inPerson * (benchmarks.inPerson ?? 0);
  const live = v.live * (benchmarks.live ?? 0);
  const recorded = v.recorded * (benchmarks.recordedSale ?? 0);
  const gross = inPerson + live + recorded;
  const commission = (gross * commissionPercent) / 100;
  const net = gross - commission;
  const noData =
    benchmarks.inPerson === null &&
    benchmarks.live === null &&
    benchmarks.recordedSale === null;
  const row = (label: string, value: string, cls = "text-text-primary") => (
    <div className="flex items-center gap-3 rounded-16 bg-bg-surface px-[18px] pt-[15px] pb-4">
      <span className="min-w-0 flex-1 type-body-lg text-text-secondary">
        {label}
      </span>
      <span className={`whitespace-nowrap type-subtitle ${cls}`}>{value}</span>
    </div>
  );
  const unavailable = (b: number | null) =>
    b === null ? "لا بيانات بعد" : null;
  const gap = actual.month - net;
  return (
    <div className="flex flex-col gap-[26px] lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <section
          aria-labelledby="inputs-title"
          className="flex flex-col gap-5 rounded-22 border border-border-default bg-bg-card p-5 shadow-card sm:p-7"
        >
          <h2 id="inputs-title" className="type-h2 text-text-primary">
            عدّل الأرقام لتناسب واقعك
          </h2>
          <NumberField
            label="دورات حضورية شهريًا"
            value={v.inPerson}
            max={30}
            onChange={(n) => setV((c) => ({ ...c, inPerson: n }))}
          />
          <NumberField
            label="دورات مباشرة شهريًا"
            value={v.live}
            max={30}
            onChange={(n) => setV((c) => ({ ...c, live: n }))}
          />
          <NumberField
            label="مبيعات الدورات المسجَّلة شهريًا"
            value={v.recorded}
            max={10000}
            onChange={(n) => setV((c) => ({ ...c, recorded: n }))}
          />
          <NumberField
            label="عروض تُقبل من كل ١٠"
            value={v.offers}
            max={10}
            onChange={(n) => setV((c) => ({ ...c, offers: n }))}
          />
        </section>
        <section
          aria-labelledby="estimate-title"
          aria-live="polite"
          className="flex flex-col gap-[18px] rounded-22 border-[3px] border-state-success bg-state-success-bg px-5 pt-7 pb-[30px] sm:px-[30px]"
        >
          <h2 id="estimate-title" className="type-h2 text-state-success">
            تقديرك الشهري
          </h2>
          {row(
            `حضوري · ${pluralAr(v.inPerson, ["دورة واحدة", "دورتان", "دورات", "دورة"])}`,
            unavailable(benchmarks.inPerson) ?? money(inPerson),
          )}
          {row(
            `مباشر · ${pluralAr(v.live, ["دورة واحدة", "دورتان", "دورات", "دورة"])}`,
            unavailable(benchmarks.live) ?? money(live),
          )}
          {row(
            `مسجَّل · ${pluralAr(v.recorded, ["مبيعة واحدة", "مبيعتان", "مبيعات", "مبيعة"])}`,
            unavailable(benchmarks.recordedSale) ?? money(recorded),
          )}
          {row("إجمالي قبل العمولة", money(gross))}
          {row(
            `عمولة المنصة ${toArabicDigits(commissionPercent)}٪ · قيمة تشغيلية مؤقتة وفق إعدادات المنصة`,
            `− ${money(commission)}`,
            "text-state-warning",
          )}
          <hr className="border-border-divider" />
          <div className="flex flex-wrap items-center gap-3 rounded-16 bg-bg-surface px-[18px] pt-[15px] pb-4">
            <span className="min-w-0 flex-1 type-h3 text-text-secondary">
              صافي دخلك الشهري
            </span>
            <span className="whitespace-nowrap text-[28px] leading-[1.15] font-bold text-state-success sm:text-[36px]">
              {money(net)}
            </span>
          </div>
          <p className="flex items-start gap-3 rounded-16 bg-bg-surface px-[18px] pt-[15px] pb-4 type-body-lg text-state-warning">
            <Glyph icon={TriangleAlert} size={24} />
            <span className="flex-1">
              {noData
                ? "لا توجد بعد مبيعات كافية في تخصصك لبناء متوسطات. سيظهر التقدير فور توفر بيانات."
                : "تقدير لا وعد. الدخل الفعلي يعتمد على جودة برامجك وتقييماتك وعدد العروض التي تقدّمها."}
            </span>
          </p>
        </section>
      </div>
      <aside className="flex w-full flex-col gap-[22px] lg:w-[420px] lg:shrink-0">
        <section
          aria-labelledby="actual-title"
          className="flex flex-col gap-5 rounded-22 border border-border-default bg-bg-card p-5 shadow-card sm:p-7"
        >
          <h2 id="actual-title" className="type-h3 text-text-primary">
            دخلك الفعلي
          </h2>
          {[
            {
              label: "هذا الشهر",
              value: money(actual.month),
              cls: "text-state-success",
            },
            {
              label: "متوسط ٣ أشهر",
              value: money(actual.avg3),
              cls: "text-text-primary",
            },
            {
              label: "الفجوة عن التقدير",
              value: `${gap < 0 ? "− " : "+ "}${money(Math.abs(gap))}`,
              cls: gap < 0 ? "text-state-warning" : "text-state-success",
            },
          ].map((r) => (
            <div
              key={r.label}
              className="flex items-center gap-3 rounded-12 bg-bg-page px-4 pt-3.5 pb-[15px]"
            >
              <span className="min-w-0 flex-1 type-body text-text-secondary">
                {r.label}
              </span>
              <span className={`whitespace-nowrap type-subtitle ${r.cls}`}>
                {r.value}
              </span>
            </div>
          ))}
        </section>
        {hints}
      </aside>
    </div>
  );
}
