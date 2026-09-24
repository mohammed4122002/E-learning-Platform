import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ActionRowLink, ResultPanel } from "@/components/trainer-affiliations/parts";
import { ContractFrame } from "@/components/trainer-contracts/ContractFrame";
import { requireTrainer } from "@/lib/auth";
import { getContract } from "@/lib/data/trainer-contracts";
import { formatDate } from "@/lib/format";
import { datesText, durationText, roundsOf, termsSourceText, valueText2 } from "@/lib/trainer-contracts";

export const metadata: Metadata = { title: "العقد" };

/**
 * TRR-CTR-01 · مراجعة عقد المدرب (4265:2) while the contract waits for the trainer's signature, and
 * TRR-CTR-03 · العقد النشط (4265:1226) once both parties signed. Signed-by-trainer, expired and terminated
 * contracts reuse the same panel with their real state.
 */
export default async function ContractPage({ params }: PageProps<"/trainer/contracts/[id]">) {
  const { id } = await params;
  const user = await requireTrainer(`/trainer/contracts/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const c = await getContract(id, user.id);
  if (!c) notFound();
  const t = c.terms;
  const bid = c.sourceType === "bid";
  const back = bid ? { href: "/trainer/bids", label: "العودة إلى عروضي" } : { href: "/trainer/affiliations", label: "العودة إلى ارتباطاتي" };
  const refLabel = bid ? "رقم العرض" : "مرجع الارتباط";
  const rounds = roundsOf(t);

  let panel;
  if (c.status === "sent") {
    panel = (
      <>
        <ResultPanel
          tone="brand"
          title="مراجعة العقد قبل التوقيع"
          intro="راجع الشروط النهائية قبل التوقيع. هذه هي الشروط التي وافق عليها الطرفان."
          rows={[
            ...(c.sourceRef ? [{ label: refLabel, value: <span dir="ltr">{c.sourceRef}</span> }] : []),
            { label: "الطرف الأول", value: `${c.trainerName} · ${bid ? "مدرب مستقل" : "مدرب مرتبط"}` },
            { label: "الطرف الثاني", value: c.orgName },
            { label: "النطاق", value: t.scope ?? c.title },
            { label: bid ? "السعر المتَّفق عليه" : "العمولة المتَّفق عليها", value: valueText2(t) },
            ...(durationText(t) ? [{ label: "المدة", value: durationText(t)! }] : []),
            ...(datesText(t) ? [{ label: "التواريخ", value: datesText(t)! }] : []),
            { label: "مصدر الشروط", value: rounds > 0 && !t.terms_source?.includes("·") ? `${termsSourceText(t)} · ${rounds === 2 ? "جولتان" : rounds === 1 ? "جولة واحدة" : `${rounds} جولات`}` : termsSourceText(t), tone: "brand" },
            { label: "سجل التفاوض", value: t.negotiation_log ?? ((t.history ?? []).length > 0 ? "مرفق بالعقد" : "لا يوجد") },
          ]}
        />
        <div className="flex w-full flex-row-reverse flex-wrap justify-end gap-3">
          <ActionRowLink href={`/trainer/contracts/${c.id}/sign`}>تابع إلى التوقيع</ActionRowLink>
          <ActionRowLink href={bid ? `/trainer/bids/${c.sourceId}/negotiation` :"/trainer/affiliations"} outline>
            {bid ? "ارجع إلى التفاوض" : "ارجع إلى الارتباطات"}
          </ActionRowLink>
        </div>
      </>
    );
  } else if (c.status === "active") {
    panel = (
      <>
        <ResultPanel
          tone="success"
          title="العقد نافذ"
          intro="وقّع الطرفان — العقد نافذ الآن."
          rows={[
            { label: "رقم العقد", value: <span dir="ltr">{c.number}</span> },
            { label: "الطرف الآخر", value: c.orgName },
            { label: bid ? "قيمة العقد" : "العمولة المتَّفق عليها", value: valueText2(t) },
            ...(durationText(t) ? [{ label: "المدة", value: durationText(t)! }] : []),
            ...(datesText(t) ? [{ label: "التواريخ", value: datesText(t)! }] : []),
            { label: "حالة العقد", value: "نافذ", tone: "success" },
          ]}
        />
        <div className="flex w-full flex-row-reverse flex-wrap justify-end gap-3">
          <ActionRowLink href={back.href}>{back.label}</ActionRowLink>
          <ActionRowLink href={`/trainer/contracts/${c.id}/document`} outline>
            نزّل نسخة العقد
          </ActionRowLink>
        </div>
      </>
    );
  } else if (c.status === "signed_by_trainer") {
    const mine = c.signatures.find((s) => s.party === "trainer");
    panel = (
      <>
        <ResultPanel
          tone="neutral"
          surface
          title="التوقيع الإلكتروني"
          intro={`وقّعت العقد${mine ? ` في ${formatDate(mine.signedAt)}` : ""}. يصبح نافذًا بعد توقيع ${c.orgName}.`}
          rows={[
            ...(c.sourceRef ? [{ label: refLabel, value: <span dir="ltr">{c.sourceRef}</span> }] : []),
            { label: "قيمة العقد", value: valueText2(t) },
            { label: "التوقيع", value: mine?.typedName ?? c.trainerName },
            { label: "إقرار المراجعة", value: "راجعتُ العقد وأوافق على شروطه", tone: "brand" },
            { label: "الطرف الآخر", value: `بانتظار توقيع ${c.orgName}`, tone: "warning" },
          ]}
        />
        <div className="flex w-full flex-row-reverse flex-wrap justify-end gap-3">
          <ActionRowLink href={back.href}>{back.label}</ActionRowLink>
          <ActionRowLink href={`/trainer/contracts/${c.id}/document`} outline>
            نزّل نسخة العقد
          </ActionRowLink>
        </div>
      </>
    );
  } else {
    const expired = c.status === "expired";
    panel = (
      <>
        <ResultPanel
          tone="neutral"
          title={expired ? "انتهت مهلة توقيع العقد" : "أُنهي العقد"}
          intro={expired ? "لم يكتمل التوقيع قبل انتهاء المهلة، فلم يعد العقد قابلًا للتوقيع." : c.terminationReason ? `سبب الإنهاء: ${c.terminationReason}` : "أنهت الجهة هذا العقد."}
          rows={[
            { label: "رقم العقد", value: <span dir="ltr">{c.number}</span> },
            { label: "الطرف الآخر", value: c.orgName },
            { label: "قيمة العقد", value: valueText2(t) },
            {
              label: "حالة العقد",
              value: expired ? `منتهي المهلة${c.expiredAt ? ` · ${formatDate(c.expiredAt)}` : ""}` : `مُنهى${c.terminatedAt ? ` · ${formatDate(c.terminatedAt)}` : ""}`,
              tone: "muted",
            },
          ]}
        />
        <div className="flex w-full flex-row-reverse flex-wrap justify-end gap-3">
          <ActionRowLink href={back.href}>{back.label}</ActionRowLink>
        </div>
      </>
    );
  }

  return <ContractFrame c={c}>{panel}</ContractFrame>;
}
