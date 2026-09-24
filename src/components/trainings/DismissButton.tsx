"use client";

import { useTransition } from "react";
import { useToast } from "@/components/ui/Toast";
import { dismissQueueItem } from "@/app/(workspace)/trainee/queue/actions";

/** Muted secondary action under a queue item: «ليس الآن» (24h) or «إخفاء من الطابور» (for good). */
export function DismissButton({
  itemKey,
  mode,
  action = dismissQueueItem,
}: {
  itemKey: string;
  mode: "snooze" | "hide";
  /** Server action to call (defaults to the trainee queue; the trainer queue passes its own). */
  action?: (key: string, mode: "snooze" | "hide") => Promise<{ ok: boolean; message: string }>;
}) {
  const [pending, start] = useTransition();
  const toast = useToast();
  const label = mode === "snooze" ? "ليس الآن" : "إخفاء من الطابور";
  return (
    <button
      type="button"
      disabled={pending}
      aria-busy={pending || undefined}
      title={mode === "snooze" ? "يُخفى البند ٢٤ ساعة ثم يعود إن بقي بحاجة إلى إجرائك" : "يُخفى البند نهائيًا من الطابور"}
      onClick={() =>
        start(async () => {
          const res = await action(itemKey, mode);
          toast(res.ok ? "success" : "error", res.message);
        })
      }
      className="cursor-pointer whitespace-nowrap rounded-8 type-caption text-text-muted hover:text-text-primary hover:underline focus-ring disabled:cursor-progress disabled:opacity-60"
    >
      {label}
    </button>
  );
}
