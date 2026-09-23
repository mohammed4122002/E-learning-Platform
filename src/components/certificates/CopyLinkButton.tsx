"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Button, type ButtonSize, type ButtonType } from "@/components/ui/Button";
import { Glyph } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";

async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Older browsers / insecure contexts: fall back to a hidden textarea.
    const el = document.createElement("textarea");
    el.value = text;
    el.setAttribute("readonly", "");
    el.style.position = "fixed";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand("copy");
    el.remove();
    return ok;
  }
}

/** «نسخ رابط التحقق» — copies the public verification URL and confirms with a toast. */
export function CopyLinkButton({
  text,
  label = "نسخ رابط التحقق",
  as = "link",
  variant = "outline",
  size = "l",
  className,
}: {
  text: string;
  label?: string;
  as?: "link" | "button";
  variant?: ButtonType;
  size?: ButtonSize;
  className?: string;
}) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const onClick = async () => {
    const ok = await copy(text);
    if (ok) {
      setCopied(true);
      toast("success", "نُسخ رابط التحقق — الصقه حيث تشاء.");
      setTimeout(() => setCopied(false), 2500);
    } else {
      toast("error", "تعذّر النسخ. انسخ الرابط يدويًا.");
    }
  };
  if (as === "button") {
    return (
      <Button variant={variant} size={size} fullWidth onClick={onClick} icon={copied ? <Glyph icon={Check} size={20} /> : undefined} className={className}>
        {copied ? "تم النسخ" : label}
      </Button>
    );
  }
  return (
    <button type="button" onClick={onClick} className={`cursor-pointer rounded-8 type-small whitespace-nowrap text-text-brand hover:underline focus-ring ${className ?? ""}`}>
      <span aria-live="polite">{copied ? "تم النسخ ✓" : label}</span>
    </button>
  );
}
