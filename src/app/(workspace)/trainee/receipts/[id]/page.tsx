import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TopBar, PageBody } from "@/components/layout/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { requireTrainee } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatPrice, formatTime } from "@/lib/format";
import { PrintButton } from "./PrintButton";

export const metadata: Metadata = { title: "الإيصال", robots: { index: false } };

const METHOD_LABELS: Record<string, string> = { card: "بطاقة بنكية", apple_pay: "محفظة إلكترونية", bank_transfer: "تحويل بنكي", wallet: "محفظة إلكترونية" };

/** TRN-ENR-07 · الإيصال — printable tax receipt of one of the trainee's payments (RLS: own receipts only). */
export default async function ReceiptPage(props: PageProps<"/trainee/receipts/[id]">) {
  const { id } = await props.params;
  const user = await requireTrainee(`/trainee/receipts/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const { data: r } = await supabase
    .from("receipts")
    .select("id, number, amount, vat_amount, currency, issued_at, payments(method, provider_ref, enrollments(id, list_price, discount_codes(code), courses(title, organizations(name))))")
    .eq("id", id)
    .maybeSingle();
  if (!r) notFound();
  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();

  type P = {
    method: string;
    provider_ref: string | null;
    enrollments: { id: string; list_price: number; discount_codes: { code: string } | null; courses: { title: string; organizations: { name: string } | null } | null } | null;
  } | null;
  const p = r.payments as unknown as P;
  const e = p?.enrollments;
  const amount = Number(r.amount);
  const vat = Number(r.vat_amount);
  const subtotal = amount - vat;
  const listPrice = Number(e?.list_price ?? subtotal);
  const discount = Math.max(0, listPrice - subtotal);

  const rows: [string, string][] = [
    ["سعر الدورة", formatPrice(listPrice, r.currency)],
    ...(discount > 0 ? ([[`خصم${e?.discount_codes ? ` (${e.discount_codes.code})` : ""}`, `− ${formatPrice(discount, r.currency)}`]] as [string, string][]) : []),
    ["المبلغ قبل الضريبة", formatPrice(subtotal, r.currency)],
    ["ضريبة القيمة المضافة", formatPrice(vat, r.currency)],
  ];

  return (
    <>
      <TopBar title="الإيصال" subtitle={`رقم ${r.number}`} />
      <PageBody className="gap-6">
        <div className="flex flex-wrap gap-3 print:hidden">
          <PrintButton />
          {e && (
            <ButtonLink href={`/trainee/trainings/${e.id}`} variant="outline">
              العودة إلى الدورة
            </ButtonLink>
          )}
        </div>
        <article className="mx-auto flex w-full max-w-[720px] flex-col gap-6 rounded-16 border border-border-default bg-bg-surface p-6 sm:p-8 print:border-0 print:p-0">
          <header className="flex flex-wrap items-start gap-4">
            <div className="flex flex-1 flex-col gap-1">
              <h2 className="type-h2 text-text-primary">إيصال دفع</h2>
              <p className="type-small text-text-muted">{e?.courses?.organizations?.name ?? "المنصة"}</p>
            </div>
            <dl className="flex flex-col gap-1 type-small">
              <div className="flex gap-2">
                <dt className="text-text-muted">رقم الإيصال</dt>
                <dd dir="ltr" className="font-semibold text-text-primary">{r.number}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-text-muted">التاريخ</dt>
                <dd className="text-text-primary">
                  {formatDate(r.issued_at)} · {formatTime(r.issued_at)}
                </dd>
              </div>
            </dl>
          </header>
          <hr className="border-border-divider" />
          <dl className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <dt className="type-caption text-text-muted">المتدرب</dt>
              <dd className="type-subtitle text-text-primary">{profile?.full_name || user.email}</dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="type-caption text-text-muted">الدورة</dt>
              <dd className="type-subtitle text-text-primary">{e?.courses?.title ?? "—"}</dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="type-caption text-text-muted">طريقة الدفع</dt>
              <dd className="type-subtitle text-text-primary">{METHOD_LABELS[p?.method ?? ""] ?? "—"}</dd>
            </div>
            {p?.provider_ref && (
              <div className="flex flex-col gap-1">
                <dt className="type-caption text-text-muted">مرجع العملية</dt>
                <dd dir="ltr" className="type-subtitle text-end text-text-primary">{p.provider_ref}</dd>
              </div>
            )}
          </dl>
          <hr className="border-border-divider" />
          <dl className="flex flex-col gap-3">
            {rows.map(([k, v]) => (
              <div key={k} className="flex items-center gap-3">
                <dt className="flex-1 type-body text-text-secondary">{k}</dt>
                <dd className="type-subtitle text-text-primary">{v}</dd>
              </div>
            ))}
            <div className="flex items-center gap-3 border-t border-border-divider pt-3">
              <dt className="flex-1 type-h3 text-text-primary">الإجمالي المدفوع</dt>
              <dd className="type-h3 text-text-brand">{formatPrice(amount, r.currency)}</dd>
            </div>
          </dl>
          <p className="type-caption text-text-muted">الأسعار بالريال السعودي وتشمل ضريبة القيمة المضافة بعد احتسابها أعلاه. هذا الإيصال صادر إلكترونيًا ولا يحتاج إلى توقيع.</p>
        </article>
      </PageBody>
    </>
  );
}
