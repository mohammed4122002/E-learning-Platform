import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PageBody, TopBar } from "@/components/layout/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { Breadcrumb } from "@/components/ui/Navigation";
import { RingGauge } from "@/components/trainer-ops/parts";
import { BidCard, BidHero, BidIcon, CardTitle, DetailRow, FeedbackRow, HeroPill, TintPill, TONE_BG, TONE_TEXT, type BidIconKey, type BidTone } from "@/components/trainer-bids/parts";
import { requireTrainer } from "@/lib/auth";
import { getBidStats, getOpportunity, getTrainerBid, type TrainerBid } from "@/lib/data/trainer-bids";
import { formatDate, formatDayMonth, formatPercent, pluralAr, toArabicDigits } from "@/lib/format";
import { DECISION_REASON, amount, budgetRange, contractHref, daysLabel, daysLeft, formatDayRange, hoursLabel, money2 } from "@/lib/trainer-bids";

export const metadata: Metadata = { title: "قرار العرض", description: "سبب قرار الجهة على عرضك" };

const UUID = /^[0-9a-f-]{36}$/i;

type Line = { icon: BidIconKey; tone: BidTone; title: string; body: string };

/** Improvement / repeat lines: the organization's own notes first, then what the offer data shows. */
function feedbackLines(b: TrainerBid, conflict: boolean, accepted: boolean): Line[] {
  const lines: Line[] = b.decisionNotes.map((n) => ({
    icon: n.tone === "success" ? "check" : "alert",
    tone: n.tone === "success" ? "success" : "warning",
    title: n.title,
    body: n.body,
  }));
  const price = b.terms.price;
  const within = price >= b.budgetMin && price <= b.budgetMax;
  if (accepted) {
    if (within) lines.push({ icon: "check", tone: "success", title: "سعرك داخل الميزانية", body: `${amount(price)} ضمن نطاق ${amount(b.budgetMin)} – ${amount(b.budgetMax)}` });
    if (b.attachmentName) lines.push({ icon: "check", tone: "success", title: "أرفقت مقترحًا تفصيليًا", body: "المقترح المرفق يرفع فرصة القبول — كرّره في عروضك القادمة" });
    return lines;
  }
  lines.push(
    within
      ? { icon: "check", tone: "success", title: "سعرك كان مناسبًا", body: `${amount(price)} ضمن الميزانية المعلنة — ليس سبب الرفض` }
      : { icon: "alert", tone: "warning", title: "راجع سعرك", body: `${amount(price)} خارج الميزانية المعلنة ${budgetRange(b.budgetMin, b.budgetMax)}` },
  );
  lines.push(
    conflict
      ? { icon: "alert", tone: "warning", title: "حدّث تقويمك", body: "تواريخ الطلب تتعارض مع تقويمك — قد يكون من أسباب الرفض" }
      : { icon: "check", tone: "success", title: "توفّرك كان مطابقًا", body: "التواريخ متاحة في تقويمك — ليس سبب الرفض" },
  );
  if (!b.attachmentName) lines.push({ icon: "alert", tone: "warning", title: "أرفق مقترحًا تفصيليًا", body: "لم ترفق ملفًا — المقترح يرفع فرصة القبول كثيرًا" });
  return lines;
}

/** TRR-BID-04 · سبب القرار — rejected 439:21481, accepted 439:21725. */
export default async function DecisionPage({ params }: PageProps<"/trainer/bids/[id]/decision">) {
  const { id } = await params;
  await requireTrainer(`/trainer/bids/${id}/decision`);
  if (!UUID.test(id)) notFound();
  const b = await getTrainerBid(id);
  if (!b) notFound();
  if (b.status !== "accepted" && b.status !== "rejected") redirect("/trainer/bids");
  const accepted = b.status === "accepted";
  const [stats, opp] = await Promise.all([getBidStats(), accepted ? Promise.resolve(null) : getOpportunity(b.requestId)]);

  const submitted = b.submittedAt ? formatDayMonth(b.submittedAt) : "—";
  const meta = [b.organizationName, `${amount(b.terms.price)} ر.س`, daysLabel(b.terms.days), `قُدّم في ${submitted}`].join(" · ");
  const reason = b.decisionReason ? DECISION_REASON[b.decisionReason] : "لم تذكر الجهة سببًا مصنّفًا";
  const lines = feedbackLines(b, Boolean(opp?.conflict), accepted);
  const rate = stats.total ? (stats.accepted / stats.total) * 100 : 0;
  const platform = stats.platformTotal ? (stats.platformAccepted / stats.platformTotal) * 100 : 0;
  const compare = Math.round(rate) > Math.round(platform) ? "أعلى من" : Math.round(rate) < Math.round(platform) ? "أقل من" : "مثل";
  const tone: BidTone = accepted ? "success" : "info";
  const left = b.contractDueAt ? daysLeft(b.contractDueAt) : 7;

  return (
    <>
      <TopBar title="قرار العرض" subtitle={accepted ? "عرض مقبول" : "عرض لم يُقبل"} />
      <PageBody className="gap-[26px] lg:px-14">
        <Breadcrumb items={[{ label: "تصفّح الفرص", href: "/trainer/opportunities" }, { label: "عروضي", href: "/trainer/bids" }, { label: "قرار العرض" }]} />
        {accepted ? (
          <BidHero
            tone="success"
            strokeWidth={3}
            size="l"
            icon="check"
            iconTone="success"
            pill={
              <HeroPill icon="check" tone="success">
                عرضك مقبول
              </HeroPill>
            }
            reference={b.reference}
            title={b.requestTitle}
            actions={
              <ButtonLink href={contractHref(b.id, b.negotiationStatus)} size="l" className="w-full sm:w-[240px]">
                أكمل التعاقد
              </ButtonLink>
            }
          >
            {meta}
          </BidHero>
        ) : (
          <BidHero
            tone="card"
            size="l"
            icon="x"
            iconTone="neutral"
            iconAtEnd
            pill={
              <TintPill icon="x" tone="neutral">
                لم يُقبل هذا العرض
              </TintPill>
            }
            reference={b.reference}
            title={b.requestTitle}
          >
            {meta}
          </BidHero>
        )}

        <div className="grid w-full grid-cols-1 items-start gap-[26px] lg:grid-cols-[minmax(0,1fr)_400px]">
          <div className="flex min-w-0 flex-col gap-[26px]">
            <section
              aria-labelledby="why-title"
              className={`flex w-full flex-col gap-[18px] rounded-22 border-2 bg-bg-card px-5 pt-[26px] pb-7 shadow-card sm:px-7 ${accepted ? "border-state-success" : "border-state-info"}`}
            >
              <CardTitle id="why-title">{accepted ? "لماذا اختارتك الجهة؟" : "لماذا لم يُقبل عرضك؟"}</CardTitle>
              <p className="type-body text-text-muted">
                {accepted ? "هذا ما ذكرته الجهة في قرارها — استخدمه في عروضك القادمة." : "الجهة ذكرت سببًا مصنّفًا وتعليقًا. لا يظهر لك اسم من فاز ولا سعره."}
              </p>
              <div className={`flex items-center gap-3.5 rounded-16 px-5 pt-5 pb-[22px] ${TONE_BG[tone]}`}>
                <span className={`flex size-[52px] shrink-0 items-center justify-center rounded-12 bg-bg-surface ${TONE_TEXT[tone]}`}>
                  <BidIcon name={accepted ? "award" : "info"} size={20} />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-[5px]">
                  <p className={`type-h3 ${TONE_TEXT[tone]}`}>{reason}</p>
                  <p className="type-caption text-text-muted">السبب المصنَّف الذي اختارته الجهة</p>
                </div>
              </div>
              <figure className="flex flex-col gap-2.5 rounded-16 bg-bg-page px-5 pt-[18px] pb-5">
                <figcaption className="flex items-center gap-2.5">
                  <BidIcon name="messages" size={20} className="text-text-secondary" />
                  <span className="flex-1 type-subtitle text-text-muted">تعليق الجهة</span>
                </figcaption>
                <blockquote className="type-body-lg text-text-primary">{b.decisionComment ? `«${b.decisionComment}»` : "لم تكتب الجهة تعليقًا."}</blockquote>
                {b.decidedAt && <p className="type-caption text-text-muted">{`صدر القرار في ${formatDate(b.decidedAt)}`}</p>}
              </figure>
            </section>

            {lines.length > 0 && (
              <BidCard labelledBy="lines-title">
                <CardTitle id="lines-title">{accepted ? "ما الذي تكرّره في عروضك؟" : "ما الذي تحسّنه في عرضك القادم؟"}</CardTitle>
                <ul className="flex flex-col gap-5">
                  {lines.map((l) => (
                    <FeedbackRow key={l.title} icon={l.icon} tone={l.tone} title={l.title}>
                      {l.body}
                    </FeedbackRow>
                  ))}
                </ul>
              </BidCard>
            )}
          </div>

          <aside className="flex min-w-0 flex-col gap-[22px]">
            <BidCard labelledBy="details-title">
              <CardTitle id="details-title" size="h3">
                تفاصيل عرضك
              </CardTitle>
              <dl className="flex flex-col gap-5">
                <DetailRow label="السعر" value={money2(b.terms.price)} />
                <DetailRow label="المدة" value={`${daysLabel(b.terms.days)} · ${hoursLabel(b.terms.hours)}`} />
                <DetailRow label="التواريخ" value={b.terms.starts_on ? formatDayRange(b.terms.starts_on, b.terms.ends_on) : "—"} />
                <DetailRow label="البرنامج" value={b.programTitle ?? "—"} />
                <DetailRow label="قُدّم في" value={b.submittedAt ? formatDate(b.submittedAt) : "—"} />
                <DetailRow label="القرار" value={b.decidedAt ? formatDate(b.decidedAt) : "—"} />
              </dl>
            </BidCard>

            {accepted ? (
              <BidCard labelledBy="next-title">
                <CardTitle id="next-title" size="h3">
                  الخطوة التالية
                </CardTitle>
                <p className="type-body text-text-secondary">{`أكمل التعاقد خلال ${pluralAr(Math.max(left, 1), ["يوم واحد", "يومين", "أيام", "يومًا"])} — وإلا يُعرض الطلب على مدرب آخر.`}</p>
                <ButtonLink href={contractHref(b.id, b.negotiationStatus)} size="l" fullWidth>
                  أكمل التعاقد
                </ButtonLink>
                <ButtonLink href={`/trainer/bids/${b.id}/negotiation`} variant="outline" size="l" fullWidth>
                  راجع الشروط أو تفاوض
                </ButtonLink>
              </BidCard>
            ) : (
              <>
                <BidCard labelledBy="now-title">
                  <CardTitle id="now-title" size="h3">
                    ماذا الآن؟
                  </CardTitle>
                  <p className="type-body text-text-secondary">الرفض لا يؤثر على تقييمك ولا على ترتيبك. الجهة نفسها قد تطلبك مستقبلًا.</p>
                  <ButtonLink href="/trainer/opportunities?f=all" size="l" fullWidth>
                    تصفّح فرصًا مشابهة
                  </ButtonLink>
                  <ButtonLink href="/trainer/bids" variant="ghost" size="l" fullWidth>
                    عُد لعروضي
                  </ButtonLink>
                </BidCard>
                <BidCard labelledBy="rate-title">
                  <CardTitle id="rate-title" size="h3">
                    نسبة قبولك
                  </CardTitle>
                  <RingGauge percent={rate} size={110} label="نسبة قبول عروضك" />
                  <p className={`type-body ${compare === "أقل من" ? "text-state-warning" : "text-state-success"}`}>
                    {`${toArabicDigits(stats.accepted)} مقبولة من ${pluralAr(stats.total, ["عرض واحد", "عرضين", "عروض", "عرضًا"])} — ${compare} متوسط المنصة ${formatPercent(platform)}.`}
                  </p>
                </BidCard>
              </>
            )}
          </aside>
        </div>
      </PageBody>
    </>
  );
}
