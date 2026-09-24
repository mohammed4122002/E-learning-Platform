"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

/** Copies the public program link (TRR-PRG-06 «شارك الرابط» / «انسخ»). */
export function CopyLinkButton({ url, label, compact }: { url: string; label: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      if (navigator.share && !compact && /Mobi/.test(navigator.userAgent)) await navigator.share({ url });
      else await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }
  return (
    <Button variant="ghost" size={compact ? "s" : "m"} fullWidth={!compact} onClick={copy} aria-live="polite" className={compact ? "w-[120px]" : ""}>
      {copied ? "نُسخ الرابط" : label}
    </Button>
  );
}
