"use client";

import { useEffect } from "react";
import { Printer } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Glyph } from "@/components/ui/Icon";

/** Screen-only toolbar of the print page; opens the browser print dialog (Save as PDF) once on load. */
export function PrintControls({ backHref, backLabel = "عد إلى الشهادة" }: { backHref: string; backLabel?: string }) {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 600);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 print:hidden">
      <Button onClick={() => window.print()} icon={<Glyph icon={Printer} size={20} />}>
        احفظ PDF / اطبع
      </Button>
      <ButtonLink href={backHref} variant="outline">
        {backLabel}
      </ButtonLink>
      <p className="w-full text-center type-caption text-text-muted">اختر «حفظ بتنسيق PDF» في نافذة الطباعة — الحجم A4 أفقي.</p>
    </div>
  );
}
