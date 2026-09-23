"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { CircleCheck, CircleX, Info, TriangleAlert } from "lucide-react";
import { Glyph } from "@/components/ui/Icon";

/*
 * Figma "Feedback / Toast" (59:63): 400px, surface, 1px border/default, r12, p 14/16, gap 12,
 * shadow 0 8 40 @10%, 4×28 tone bar, 20px icon, 16 Medium text/primary.
 */
type ToastTone = "success" | "error" | "info" | "warning";
type ToastItem = { id: number; tone: ToastTone; message: string };

const toneMap: Record<ToastTone, { icon: LucideIcon; color: string; bar: string }> = {
  success: { icon: CircleCheck, color: "text-state-success", bar: "bg-state-success" },
  error: { icon: CircleX, color: "text-state-error", bar: "bg-state-error" },
  info: { icon: Info, color: "text-state-info", bar: "bg-state-info" },
  warning: { icon: TriangleAlert, color: "text-state-warning", bar: "bg-state-warning" },
};

const ToastContext = createContext<(tone: ToastTone, message: string) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback((tone: ToastTone, message: string) => {
    setItems((list) => [...list.slice(-2), { id: Date.now() + Math.random(), tone, message }]);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-center gap-3 sm:inset-x-auto sm:start-6">
        {items.map((t) => (
          <ToastView key={t.id} item={t} onDone={() => setItems((list) => list.filter((x) => x.id !== t.id))} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastView({ item, onDone }: { item: ToastItem; onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 5000);
    return () => clearTimeout(timer);
  }, [onDone]);
  const t = toneMap[item.tone];
  return (
    <div role={item.tone === "error" ? "alert" : "status"} className="pointer-events-auto flex w-full max-w-[400px] items-center gap-3 rounded-12 border border-border-default bg-bg-surface px-4 py-3.5 shadow-float">
      <span aria-hidden className={`h-7 w-1 shrink-0 rounded-full ${t.bar}`} />
      <Glyph icon={t.icon} size={20} className={t.color} />
      <p className="flex-1 type-subtitle text-text-primary">{item.message}</p>
    </div>
  );
}
