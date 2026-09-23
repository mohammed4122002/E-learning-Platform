"use client";

import { CircleCheck, CloudOff, LoaderCircle, RotateCcw, WifiOff } from "lucide-react";
import { Glyph } from "@/components/ui/Icon";
import type { SaveState } from "./useProgressSaver";

/**
 * "Trainee / Connection Status" (407:4128): tells the trainee whether their progress reached the server.
 * failed/offline keep the unsaved position on the device and offer a retry (BR-S1).
 */
export function ConnectionStatus({ state, message, onRetry, compact = false }: { state: SaveState; message?: string | null; onRetry: () => void; compact?: boolean }) {
  if (state === "idle") return <span aria-live="polite" className="sr-only" />;
  if (state === "saving" || state === "saved") {
    if (compact) {
      return (
        <span aria-live="polite" className="flex items-center gap-1.5 type-caption text-text-muted">
          <Glyph icon={state === "saving" ? LoaderCircle : CircleCheck} size={16} className={state === "saving" ? "animate-[tg-spin_0.9s_linear_infinite]" : "text-state-success"} />
          {state === "saving" ? "جارٍ حفظ تقدّمك" : "حُفظ تقدّمك"}
        </span>
      );
    }
    return <span aria-live="polite" className="sr-only">{state === "saving" ? "جارٍ حفظ تقدّمك" : "حُفظ تقدّمك"}</span>;
  }
  const offline = state === "offline";
  return (
    <div
      role="alert"
      className={`flex w-full flex-wrap items-center gap-3 rounded-12 border-[1.5px] px-4 py-3 ${
        offline ? "border-state-warning bg-state-warning-bg text-state-warning" : "border-state-error bg-state-error-bg text-state-error"
      }`}
    >
      <Glyph icon={offline ? WifiOff : CloudOff} size={20} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="type-subtitle">{offline ? "أنت غير متصل بالإنترنت" : "تعذّر حفظ تقدّمك"}</p>
        <p className="type-caption text-text-secondary">
          {offline
            ? "تقدّمك محفوظ على جهازك، وسنرسله تلقائيًا فور عودة الاتصال."
            : `${message ? `${message} ` : ""}تقدّمك محفوظ على جهازك مؤقتًا — أعد المحاولة لإرساله.`}
        </p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-12 bg-bg-surface px-4 type-subtitle text-text-primary focus-ring"
      >
        <Glyph icon={RotateCcw} size={16} />
        أعد المحاولة
      </button>
    </div>
  );
}
