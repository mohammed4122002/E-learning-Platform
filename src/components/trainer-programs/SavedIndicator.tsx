"use client";

import { useEffect, useState } from "react";
import { CircleCheck, LoaderCircle } from "lucide-react";
import { Glyph } from "@/components/ui/Icon";

function ago(iso: string, now: number): string {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  const fmt = new Intl.RelativeTimeFormat("ar-SA-u-nu-arab", { numeric: "auto" });
  if (s < 5) return "الآن";
  if (s < 60) return s <= 10 ? "قبل ثوانٍ" : fmt.format(-s, "second").replace("منذ", "قبل");
  if (s < 3600) return fmt.format(-Math.round(s / 60), "minute").replace("منذ", "قبل");
  if (s < 86400) return fmt.format(-Math.round(s / 3600), "hour").replace("منذ", "قبل");
  return fmt.format(-Math.round(s / 86400), "day").replace("منذ", "قبل");
}

/**
 * «حُفظت المسودة تلقائيًا قبل ثانيتين» (TRR-PRG-02): 20px circle-check + 16 success text; ticks every 15s.
 * Forms announce autosaves with window events «program-saving» / «program-saved» (detail = updated_at).
 */
export function announceSaving() {
  window.dispatchEvent(new Event("program-saving"));
}
export function announceSaved(savedAt: string | null) {
  window.dispatchEvent(new CustomEvent("program-saved", { detail: savedAt }));
}

export function SavedIndicator({ savedAt: initial, auto = true, small = false }: { savedAt: string | null; auto?: boolean; small?: boolean }) {
  const [now, setNow] = useState(() => Date.now());
  const [savedAt, setSavedAt] = useState(initial);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15_000);
    const onSaved = (e: Event) => {
      setSaving(false);
      const detail = (e as CustomEvent<string | null>).detail;
      if (detail) setSavedAt(detail);
      setNow(Date.now());
    };
    const onSaving = () => setSaving(true);
    window.addEventListener("program-saved", onSaved);
    window.addEventListener("program-saving", onSaving);
    return () => {
      clearInterval(t);
      window.removeEventListener("program-saved", onSaved);
      window.removeEventListener("program-saving", onSaving);
    };
  }, []);
  if (saving) {
    return (
      <p role="status" className="flex items-center gap-2 type-subtitle text-text-muted">
        <LoaderCircle aria-hidden size={20} strokeWidth={1.4} absoluteStrokeWidth className="animate-[tg-spin_0.9s_linear_infinite]" />
        جارٍ حفظ المسودة…
      </p>
    );
  }
  if (!savedAt) return null;
  return (
    <p role="status" className={`flex items-center gap-2 text-state-success ${small ? "type-caption" : "text-[16px] leading-[1.5]"}`}>
      <Glyph icon={CircleCheck} size={small ? 16 : 20} />
      {auto ? "حُفظت المسودة تلقائيًا" : "حُفظت المسودة"} {ago(savedAt, now)}
    </p>
  );
}
