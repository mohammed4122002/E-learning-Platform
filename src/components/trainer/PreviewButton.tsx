"use client";

import type { ReactNode } from "react";
import { Button, type ButtonSize, type ButtonType } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

/**
 * Buttons that organizations use on the trainer's public profile (طلب عرض · مراسلة · حجز موعد). On the trainer's own
 * preview (TRR-PRF-01) they keep their look but only explain what the visitor would get.
 */
export function PreviewButton({ children, variant, size = "l", className, message }: { children: ReactNode; variant?: ButtonType; size?: ButtonSize; className?: string; message: string }) {
  const toast = useToast();
  return (
    <Button variant={variant} size={size} className={className} onClick={() => toast("info", message)}>
      {children}
    </Button>
  );
}
