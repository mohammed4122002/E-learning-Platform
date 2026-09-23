"use client";

import { useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { Alert } from "@/components/ui/Feedback";
import { Glyph } from "@/components/ui/Icon";

/** Figma "Feedback / Alert" with the close (×) slot — hides for this visit only. */
export function DismissibleAlert({ tone, title, children }: { tone: "info" | "success" | "warning" | "error"; title: ReactNode; children?: ReactNode }) {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  return (
    <Alert
      tone={tone}
      title={title}
      action={
        <button type="button" onClick={() => setOpen(false)} aria-label="إغلاق التنبيه" className="mt-1 cursor-pointer rounded-8 text-text-secondary focus-ring">
          <Glyph icon={X} size={16} />
        </button>
      }
    >
      {children}
    </Alert>
  );
}
