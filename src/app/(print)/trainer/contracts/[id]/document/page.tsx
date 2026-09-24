import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PrintBar } from "@/components/trainer-contracts/PrintBar";
import { requireTrainer } from "@/lib/auth";
import { getContract } from "@/lib/data/trainer-contracts";
import { formatDate, formatDayMonth, formatTime } from "@/lib/format";
import { datesText, durationText, termRows, termsSourceText, valueText2 } from "@/lib/trainer-contracts";

export const metadata: Metadata = { title: "نسخة العقد", robots: { index: false, follow: false } };

const STATUS: Record<string, string> = {
  sent: "بانتظار توقيع المدرب",
  signed_by_trainer: "وقّعه المدرب — بانتظار توقيع الجهة",
  active: "نافذ",
  terminated: "مُنهى",
  expired: "انتهت مهلة التوقيع",
};

/**
 * «نزّل نسخة العقد» (4265:1226) / «نزّل سجل التفاوض PDF» (4265:2): printable copy of the current version with the
 * click-to-sign records (typed name, time, document hash). The browser print dialog produces the PDF.
 */
export default async function ContractDocument({ params, searchParams }: PageProps<"/trainer/contracts/[id]/document">) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requireTrainer(`/trainer/contracts/${id}/document`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const c = await getContract(id, user.id);
  if (!c) notFound();
  const t = c.terms;
  const rows = termRows(t);
  const withLog = sp.log === "1";

  return (
    <main className="mx-auto flex w-full max-w-[820px] flex-col gap-6 px-4 py-8 print:max-w-none print:p-0">
      <style>{`@page { size: A4 portrait; margin: 16mm; }`}</style>
      <PrintBar backHref={`/trainer/contracts/${c.id}`} />
      <article className="flex flex-col gap-6 rounded-16 border border-border-default bg-bg-surface p-8 text-text-primary print:border-0 print:p-0">
        <header className="flex flex-col gap-2 border-b border-border-divider pb-4">
          <p className="type-caption text-text-muted">بوابة التدريب · {withLog ? "سجل التفاوض والاتفاق النهائي" : "نسخة العقد"}</p>
          <h1 className="type-h2">{c.title}</h1>
          <p className="type-small text-text-secondary">
            رقم العقد <span dir="ltr">{c.number}</span> · النسخة {c.version} · الحالة: {STATUS[c.status] ?? c.status}
          </p>
        </header>
        <section className="flex flex-col gap-2">
          <h2 className="type-h4">الطرفان</h2>
          <p className="type-body">الطرف الأول: {c.trainerName}</p>
          <p className="type-body">الطرف الثاني: {c.orgName}</p>
          {c.sourceRef && (
            <p className="type-body">
              {c.sourceType === "bid" ? "رقم العرض" : "مرجع الارتباط"}: <span dir="ltr">{c.sourceRef}</span>
            </p>
          )}
        </section>
        <section className="flex flex-col gap-2">
          <h2 className="type-h4">الشروط</h2>
          <p className="type-body">النطاق: {t.scope ?? c.title}</p>
          <p className="type-body">القيمة: {valueText2(t)}</p>
          {durationText(t) && <p className="type-body">المدة: {durationText(t)}</p>}
          {datesText(t) && <p className="type-body">التواريخ: {datesText(t)}</p>}
          <p className="type-body">مصدر الشروط: {termsSourceText(t)}</p>
          <ul className="flex list-disc flex-col gap-1 ps-6">
            {rows.map((r) => (
              <li key={r.label} className="type-body">
                {r.label}: {r.negotiable ? `${r.agreed ?? "—"} (الشرط الأصلي: ${r.original ?? "—"})` : (r.note ?? "ثابت")}
              </li>
            ))}
          </ul>
        </section>
        {withLog && (t.history ?? []).length > 0 && (
          <section className="flex flex-col gap-2">
            <h2 className="type-h4">سجل التفاوض</h2>
            <ol className="flex list-decimal flex-col gap-1 ps-6">
              {(t.history ?? []).map((h, i) => (
                <li key={i} className="type-body">
                  {h.actor === "trainer" ? "المدرب" : "الجهة"}: {h.text} — {formatDayMonth(h.at)} · {formatTime(h.at)}
                </li>
              ))}
            </ol>
          </section>
        )}
        <section className="flex flex-col gap-2">
          <h2 className="type-h4">التوقيعات</h2>
          {c.signatures.length === 0 ? (
            <p className="type-body text-text-muted">لم يُوقَّع بعد.</p>
          ) : (
            c.signatures.map((s) => (
              <p key={s.party} className="type-body">
                {s.party === "trainer" ? "توقيع المدرب" : "توقيع الجهة"}: {s.typedName} — {formatDate(s.signedAt)} · {formatTime(s.signedAt)}
              </p>
            ))
          )}
          <p className="type-caption text-text-muted">
            توقيع إلكتروني بالنقر عبر المنصة: الاسم المكتوب + الإقرار الصريح + الوقت + بصمة SHA-256 لعنوان الجهاز والمتصفح، مربوطة ببصمة نص العقد أدناه.
          </p>
          <p className="break-all type-caption text-text-muted" dir="ltr">
            SHA-256: {c.documentHash}
          </p>
        </section>
      </article>
    </main>
  );
}
