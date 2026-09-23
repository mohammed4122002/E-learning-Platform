import type { ReactNode } from "react";
import { BookOpen, ShieldCheck } from "lucide-react";
import { Glyph } from "@/components/ui/Icon";
import { formatPrice, toArabicDigits } from "@/lib/format";

/*
 * Figma "Platform / Order Summary" (145:2005): 380px card, r16, p24, gap 16. Title 20 Medium, course row with
 * 48px brand-tint tile, price rows (17 Regular label / 16 Medium value), total 19 Bold / 20 Medium, refund note.
 */
export function OrderSummary({
  title,
  subtitle,
  listPrice,
  discount,
  discountCode,
  vat,
  vatRate,
  total,
  currency,
  refundNote,
  footer,
}: {
  title: string;
  subtitle: string;
  listPrice: number;
  discount: number;
  discountCode: string | null;
  vat: number;
  vatRate: number;
  total: number;
  currency: string;
  refundNote: string | null;
  footer?: ReactNode;
}) {
  const row = (label: string, value: string, muted = false) => (
    <div className="flex items-center gap-3">
      <span className="flex-1 type-body text-text-secondary">{label}</span>
      <span className={`type-subtitle ${muted ? "text-text-muted" : "text-text-primary"}`}>{value}</span>
    </div>
  );
  return (
    <section aria-labelledby="order-summary-title" className="flex flex-col gap-4 rounded-16 border border-border-default bg-bg-surface p-6">
      <h2 id="order-summary-title" className="type-h3 text-text-primary">
        ملخّص الطلب
      </h2>
      <div className="flex items-center gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
          <p className="type-subtitle text-text-primary">{title}</p>
          <p className="type-caption text-text-muted">{subtitle}</p>
        </div>
        <span className="flex size-12 shrink-0 items-center justify-center rounded-8 bg-bg-brand-tint text-text-brand">
          <Glyph icon={BookOpen} size={20} />
        </span>
      </div>
      <hr className="border-border-divider" />
      {row("سعر الدورة", listPrice === 0 ? "مجانية" : formatPrice(listPrice, currency))}
      {discount > 0 && (
        <div className="flex items-center gap-3">
          <span className="flex-1 type-body text-state-success">خصم رمز {discountCode}</span>
          <span className="type-subtitle text-state-success">− {formatPrice(discount, currency)}</span>
        </div>
      )}
      {listPrice > 0 && row(`ضريبة القيمة المضافة ${toArabicDigits(vatRate)}٪`, formatPrice(vat, currency), true)}
      <hr className="border-border-divider" />
      <div className="flex items-center gap-3">
        <span className="flex-1 type-title text-text-primary">الإجمالي</span>
        <span className="type-h3 text-text-primary">{total === 0 ? "مجانية" : formatPrice(total, currency)}</span>
      </div>
      {refundNote && (
        <p className="flex items-center gap-2.5 type-caption text-text-secondary">
          <Glyph icon={ShieldCheck} size={16} className="text-state-success" />
          {refundNote}
        </p>
      )}
      {footer}
    </section>
  );
}
