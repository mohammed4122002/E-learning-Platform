"use client";

import { Button } from "@/components/ui/Button";

/** «نزّل الإيصال»: the transaction page is the receipt — print / save as PDF. */
export function PrintReceipt({
  label,
  fullWidth,
  size = "m",
  variant = "outline",
}: {
  label: string;
  fullWidth?: boolean;
  size?: "m" | "l";
  variant?: "outline" | "secondary";
}) {
  return (
    <Button variant={variant} size={size} fullWidth={fullWidth} onClick={() => window.print()}>
      {label}
    </Button>
  );
}
