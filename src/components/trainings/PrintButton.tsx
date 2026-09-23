"use client";

import type { ReactNode } from "react";
import { Button, type ButtonType } from "@/components/ui/Button";

/** Saves the current notice through the browser's print dialog (print → PDF). */
export function PrintButton({ children, variant = "primary" }: { children: ReactNode; variant?: ButtonType }) {
  return (
    <Button variant={variant} size="l" fullWidth onClick={() => window.print()}>
      {children}
    </Button>
  );
}
