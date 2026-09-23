"use client";

import { useEffect, useState } from "react";
import { CircleAlert, Timer } from "lucide-react";
import { Glyph } from "@/components/ui/Icon";
import { toArabicDigits } from "@/lib/format";

/*
 * Figma "Platform / Hold Timer" (145:1920): Normal (info), Warning (≤ 2 min), Expired (error).
 * 76px bar, r12, 1.5px tone border, 64px white time chip (14 Semibold) + 44px icon tile.
 */
export function HoldTimer({ expiresAt, message = "مقعدك محجوز — أكمل الدفع قبل انتهاء المهلة" }: { expiresAt: string; message?: string }) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setLeft(Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)));
    const first = setTimeout(tick, 0);
    const t = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, [expiresAt]);

  const state = left === null ? "normal" : left === 0 ? "expired" : left <= 120 ? "warning" : "normal";
  const tone = {
    normal: "bg-state-info-bg border-state-info text-state-info",
    warning: "bg-state-warning-bg border-state-warning text-state-warning",
    expired: "bg-state-error-bg border-state-error text-state-error",
  }[state];
  const text = state === "expired" ? "انتهت مهلة الحجز وتحرر المقعد" : state === "warning" ? "بقيت دقيقتان — أكمل الدفع الآن أو سيتحرر المقعد" : message;
  const m = left === null ? 15 : Math.floor(left / 60);
  const s = left === null ? 0 : left % 60;

  return (
    <div role="timer" aria-live={state === "normal" ? "off" : "assertive"} className={`flex w-full items-center gap-4 rounded-12 border-[1.5px] px-5 py-4 ${tone}`}>
      <span className="flex size-11 shrink-0 items-center justify-center rounded-8 bg-bg-surface">
        <Glyph icon={state === "expired" ? CircleAlert : Timer} size={20} />
      </span>
      <p className="flex-1 type-body">{text}</p>
      <span dir="ltr" className="rounded-8 bg-bg-surface px-3.5 py-2 text-[14px] leading-[1.5] font-semibold tabular-nums">
        {toArabicDigits(`${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`)}
      </span>
    </div>
  );
}
