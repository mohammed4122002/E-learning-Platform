"use client";

import { Button } from "@/components/ui/Button";

/** «نزّل الإيصال»: the transaction page is the receipt — print / save as PDF. */
export function PrintReceipt({ label, fullWidth, size = "m" }: { label: string; fullWidth?: boolean; size?: "m" | "l" }) {
  return (
    <Button variant="outline" size={size} fullWidth={fullWidth} onClick={() => window.print()}>
      {label}
    </Button>
  );
}
