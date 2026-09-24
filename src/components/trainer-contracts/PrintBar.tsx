"use client";

import { Printer } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Glyph } from "@/components/ui/Icon";

/** Screen-only toolbar of the contract document (A4 portrait); «حفظ بتنسيق PDF» from the print dialog. */
export function PrintBar({ backHref }: { backHref: string }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 print:hidden">
      <Button onClick={() => window.print()} icon={<Glyph icon={Printer} size={20} />}>
        احفظ PDF / اطبع
      </Button>
      <ButtonLink href={backHref} variant="outline">
        عد إلى العقد
      </ButtonLink>
      <p className="w-full text-center type-caption text-text-muted">اختر «حفظ بتنسيق PDF» في نافذة الطباعة — الحجم A4 عمودي.</p>
    </div>
  );
}
