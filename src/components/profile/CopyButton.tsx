"use client";

import type { ReactNode } from "react";
import { useToast } from "@/components/ui/Toast";

/** Copies an absolute URL (or text) to the clipboard and confirms with a toast. */
export function CopyButton({
  value,
  children,
  className,
  successMessage = "نُسخ الرابط",
  share = false,
}: {
  value: string;
  children: ReactNode;
  className?: string;
  successMessage?: string;
  /** Use the native share sheet when available (mobile), falling back to copying. */
  share?: boolean;
}) {
  const toast = useToast();
  const text = value.startsWith("/") && typeof window !== "undefined" ? `${window.location.origin}${value}` : value;
  return (
    <button
      type="button"
      className={className ?? "cursor-pointer rounded-8 type-small text-text-brand hover:underline focus-ring"}
      onClick={async () => {
        try {
          if (share && typeof navigator.share === "function") {
            await navigator.share({ url: text });
            return;
          }
          await navigator.clipboard.writeText(text);
          toast("success", successMessage);
        } catch (e) {
          if (e instanceof DOMException && e.name === "AbortError") return;
          toast("error", "تعذّر النسخ. انسخ الرابط يدويًا.");
        }
      }}
    >
      {children}
    </button>
  );
}
