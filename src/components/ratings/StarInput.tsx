"use client";

import { useRef, type KeyboardEvent } from "react";
import { Star } from "lucide-react";

const WORDS = ["", "ضعيف", "مقبول", "جيد", "جيد جدًا", "ممتاز"];

/**
 * Interactive "Data / Rating Stars" (89:754, size M = 22px): a radiogroup of five stars.
 * Arrow keys move the value (RTL: ArrowLeft increases), Home/End jump; a hidden input carries it in forms.
 */
export function StarInput({
  name,
  value,
  onChange,
  label,
  invalid,
  describedBy,
}: {
  name: string;
  value: number;
  onChange: (v: number) => void;
  label: string;
  invalid?: boolean;
  describedBy?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const move = (next: number) => {
    const v = Math.max(1, Math.min(5, next));
    onChange(v);
    refs.current[v - 1]?.focus();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      move((value || 0) + 1);
    } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      move((value || 2) - 1);
    } else if (e.key === "Home") {
      e.preventDefault();
      move(1);
    } else if (e.key === "End") {
      e.preventDefault();
      move(5);
    }
  };
  return (
    <div role="radiogroup" aria-label={label} aria-invalid={invalid || undefined} aria-describedby={describedBy} onKeyDown={onKey} className="flex shrink-0 items-center gap-1" dir="rtl">
      <input type="hidden" name={name} value={value || ""} />
      {[1, 2, 3, 4, 5].map((n) => {
        const on = n <= value;
        return (
          <button
            key={n}
            ref={(el) => {
              refs.current[n - 1] = el;
            }}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} من ٥ — ${WORDS[n]}`}
            tabIndex={value ? (value === n ? 0 : -1) : n === 1 ? 0 : -1}
            onClick={() => onChange(n)}
            className="cursor-pointer rounded-8 p-0.5 transition-transform hover:scale-110 focus-ring"
          >
            <Star aria-hidden size={22} strokeWidth={1.25} absoluteStrokeWidth className={on ? "fill-state-rating text-state-rating" : "text-border-default"} />
          </button>
        );
      })}
    </div>
  );
}
