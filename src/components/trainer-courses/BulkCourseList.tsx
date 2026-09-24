"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { CalendarDays, Check, CircleAlert, Clock, Minus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Glyph } from "@/components/ui/Icon";
import { pluralAr, toArabicDigits } from "@/lib/format";
import { NotifyModal } from "./course/NotifyModal";

export type BulkRow = { id: string; title: string; place: string; note: string; alert: boolean; upcoming: boolean };

/**
 * TRR-CRS-01 · إجراءات جماعية (327:11990): selectable rows + the brand action bar
 * (راسل المسجّلين · ارصد الحضور · صدّر كشوفًا · أجّل · إلغاء التحديد).
 */
export function BulkCourseList({ rows, total, controls, empty }: { rows: BulkRow[]; total: number; controls: ReactNode; empty: ReactNode }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const router = useRouter();
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const allOnPage = rows.length > 0 && rows.every((r) => selected.includes(r.id));

  const intro = selected.length
    ? `حدّدت ${pluralAr(selected.length, ["دورة واحدة", "دورتين", "دورات", "دورة"])} من ${toArabicDigits(total)}.`
    : `حدّد دورات من ${toArabicDigits(total)}.`;

  return (
    <>
      {/* 327:12122 — heading + live selection count */}
      <div className="flex flex-col gap-1.5">
        <h2 className="text-[28px] leading-[1.2] font-bold text-text-primary sm:text-[36px]">دوراتي</h2>
        <p className="type-body-lg text-text-secondary" aria-live="polite">
          {intro} نفّذ إجراءً واحدًا عليها جميعًا بدل فتح كل دورة على حدة.
        </p>
      </div>

      {selected.length > 0 && (
        <section aria-label="إجراءات على الدورات المحدّدة" className="flex flex-col gap-3.5 rounded-16 border-2 border-action-primary bg-bg-brand-tint px-[22px] py-[18px] lg:flex-row lg:items-center">
          <label className="flex h-11 cursor-pointer items-center gap-2.5 lg:w-[240px]">
            <span className="relative flex size-[22px] shrink-0 items-center justify-center rounded-8 bg-action-primary text-text-on-brand">
              <input
                type="checkbox"
                className="absolute inset-0 cursor-pointer appearance-none rounded-8 focus-ring"
                checked={allOnPage}
                onChange={() => setSelected(allOnPage ? [] : rows.map((r) => r.id))}
                aria-label="تحديد كل دورات الصفحة"
              />
              <Glyph icon={allOnPage ? Check : Minus} size={16} className="pointer-events-none" />
            </span>
            <span className="type-body text-text-primary">
              {toArabicDigits(selected.length)} محدَّدة من {toArabicDigits(total)}
            </span>
          </label>
          <div className="flex flex-1 flex-wrap items-center gap-3 lg:justify-end">
            <button type="button" onClick={() => setSelected([])} className="cursor-pointer rounded-8 px-2 type-subtitle text-text-brand focus-ring">
              إلغاء التحديد
            </button>
            <Button variant="ghost" className="w-[120px]" onClick={() => router.push(`/trainer/courses/${selected[0]}/postpone`)}>
              أجّل
            </Button>
            <Button variant="outline" className="w-[120px]" onClick={() => window.open(`/trainer/courses/export?ids=${selected.join(",")}`, "_self")}>
              صدّر كشوفًا
            </Button>
            <Button className="w-[120px]" onClick={() => router.push(`/trainer/courses/${selected[0]}/attendance`)}>
              ارصد الحضور
            </Button>
            <Button variant="secondary" onClick={() => setNotifyOpen(true)}>
              راسل المسجّلين
            </Button>
          </div>
        </section>
      )}

      {controls}

      {rows.length === 0 ? (
        empty
      ) : (
        <ul className="flex flex-col gap-3.5">
          {rows.map((r) => {
            const on = selected.includes(r.id);
            return (
              <li
                key={r.id}
                className={`flex flex-wrap items-center gap-4 rounded-16 px-5 py-[18px] shadow-card sm:flex-nowrap ${
                  on ? "border-2 border-action-primary bg-bg-brand-tint" : "border border-border-default bg-bg-card"
                }`}
              >
                <span className={`flex size-12 shrink-0 items-center justify-center rounded-12 ${r.alert ? "bg-state-error-bg text-state-error" : "bg-bg-page text-text-brand"}`}>
                  <Glyph icon={CalendarDays} size={20} />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <p className="type-title text-text-primary">{r.title}</p>
                  <p className="type-body text-text-muted">{r.place}</p>
                </div>
                <span className={`inline-flex items-center gap-[7px] whitespace-nowrap rounded-full px-3.5 py-[9px] type-subtitle ${r.alert ? "bg-bg-surface text-state-error" : "bg-bg-page text-text-secondary"}`}>
                  {r.note}
                  <Glyph icon={r.alert ? CircleAlert : Clock} size={20} />
                </span>
                <label className="flex h-11 cursor-pointer items-center sm:w-[60px] sm:justify-end lg:w-[240px]">
                  <span className="relative flex size-[22px] items-center justify-center">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggle(r.id)}
                      aria-label={`تحديد ${r.title}`}
                      className="peer absolute inset-0 cursor-pointer appearance-none rounded-8 border-[1.5px] border-border-default bg-bg-surface checked:border-0 checked:bg-action-primary focus-ring"
                    />
                    <Check aria-hidden size={16} strokeWidth={1.75} absoluteStrokeWidth className="pointer-events-none relative text-text-on-brand opacity-0 peer-checked:opacity-100" />
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}

      <NotifyModal
        open={notifyOpen}
        onClose={() => setNotifyOpen(false)}
        courseIds={selected}
        title="راسل المسجّلين"
        intro={`يصل التنبيه إلى كل المسجّلين في ${toArabicDigits(selected.length)} دورات محدّدة — داخل المنصة وبالبريد.`}
      />
    </>
  );
}
