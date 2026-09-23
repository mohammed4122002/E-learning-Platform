"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Glyph } from "@/components/ui/Icon";

export function PrintButton() {
  return (
    <Button onClick={() => window.print()}>
      <Glyph icon={Printer} size={20} />
      طباعة / حفظ PDF
    </Button>
  );
}
