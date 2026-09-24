import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PageBody, TopBar } from "@/components/layout/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { Breadcrumb } from "@/components/ui/Navigation";
import { WithdrawBidButton } from "@/components/trainer-bids/WithdrawBidButton";
import { BidHero, HeroPill, type BidIconKey, type BidTone } from "@/components/trainer-bids/parts";
import { NegotiationComposer } from "@/components/trainer-bids/NegotiationComposer";
import { CounterDecision, MessageOrgButton, PrintRecordButton, WithdrawProposalButton } from "@/components/trainer-bids/NegotiationActions";
import {
  ActionCaption,
  ActionCard,
  LockedTermRows,
  NegotiationTimeline,
  SideNotes,
  TermRow,
  TermsCard,
  TermsStrip,
  type TimelineItem,
} from "@/components/trainer-bids/NegotiationParts";
import { requireTrainer } from "@/lib/auth";
import { getCommissionPercent, getNegotiations, getTrainerBid, type Negotiation, type TrainerBid } from "@/lib/data/trainer-bids";
import { formatDate, pluralAr, toArabicDigits } from "@/lib/format";
import {
  TERM_KEYS,
  TERM_TITLES,
  amount,
  applyTerms,
  budgetRange,
  contractHref,
  daysLeft,
  formatDayRange,
  formatTerm,
  hoursLeftLabel,
  money2,
  netOf,
  summarizeChanges,
  termValue,
  type BidTerms,
  type TermKey,
} from "@/lib/trainer-bids";

export const metadata: Metadata = { title: "التفاوض على الشروط", description: "تفاوض على شروط العرض المقبول قبل التعاقد" };

const UUID = /^[0-9a-f-]{36}$/i;

type TimelineBadge = { label: string; tone: BidTone; icon: BidIconKey };

const dayTime = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-arab", { day: "numeric", month: "long", timeZone: "Asia/Riyadh" });
const clock = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-arab", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Riyadh" });
/** «١٨ مايو · ٠٩:٤٠ ص» */
function stamp(at: string): string {
  const d = new Date(at);
  return `${dayTime.format(d)} · ${clock.format(d)}`;
}
/** «٢٠ مايو ٢٠٢٦ · ١٠:٠٠ ص» */
function fullStamp(at: string): string {
  return `${formatDate(at)} · ${clock.format(new Date(at))}`;
}

function timelineOf(n: Negotiation | null): TimelineItem[] {
  if (!n) return [];
  const items: TimelineItem[] = [];
  for (const r of n.rounds) {
    items.push({ key: `p${r.round}`, actor: "أنت", tone: "info", icon: "info", text: `${r.round === 2 ? "اقترحت أخيرًا" : "اقترحت"} ${summarizeChanges(r.proposal)}`, at: stamp(r.sentAt) });
    if (r.response === "countered" && r.respondedAt)
      items.push({ key: `c${r.round}`, actor: "الجهة", tone: "warning", icon: "reply", text: `ردّت بـ${summarizeChanges(r.counter)}`, at: stamp(r.respondedAt) });
    if (r.response === "accepted" && r.respondedAt) items.push({ key: `a${r.round}`, actor: "الجهة", tone: "success", icon: "check", text: "قبلت اقتراحك", at: stamp(r.respondedAt) });
    if (r.response === "rejected" && r.respondedAt) items.push({ key: `r${r.round}`, actor: "الجهة", tone: "neutral", icon: "x", text: "لم تقبل اقتراحك", at: stamp(r.respondedAt) });
    if (r.response === "withdrawn" && r.respondedAt) items.push({ key: `w${r.round}`, actor: "أنت", tone: "neutral", icon: "x", text: "سحبت الاقتراح", at: stamp(r.respondedAt) });
    if (r.response === "expired" && r.respondedAt)
      items.push({ key: `e${r.round}`, actor: "—", tone: "error", icon: "ban", text: "انقضت مهلة الرد ٧٢ ساعة", at: dayTime.format(new Date(r.respondedAt)) });
  }
  if (n.outcomeAt && n.outcomeBy === "trainer" && n.status === "agreed") items.push({ key: "ta", actor: "أنت", tone: "success", icon: "check", text: "قبلت الشروط المقابلة", at: stamp(n.outcomeAt) });
  if (n.outcomeAt && n.status === "declined") items.push({ key: "td", actor: "أنت", tone: "neutral", icon: "x", text: "رفضت الشروط المقابلة", at: stamp(n.outcomeAt) });
  if (n.outcomeAt && n.status === "expired" && n.rounds.at(-1)?.response === "countered")
    items.push({ key: "tx", actor: "—", tone: "error", icon: "ban", text: "انقضت مهلة الرد ٧٢ ساعة", at: dayTime.format(new Date(n.outcomeAt)) });
  return items;
}

function contractCaption(b: TrainerBid): string {
  if (!b.contractDueAt) return "";
  if (b.contractPaused) return "مهلة التعاقد متوقفة حتى ينتهي التفاوض";
  const d = daysLeft(b.contractDueAt);
  return d <= 0 ? "انتهت مهلة التعاقد" : `يتبقى ${pluralAr(d, ["يوم واحد", "يومان", "أيام", "يومًا"])} على مهلة التعاقد`;
}

/** «٥٬٢٠٠ ر.س · ١٥ – ١٧ مايو» */
function termsLine(t: BidTerms): string {
  return [`${amount(t.price)} ر.س`, t.starts_on ? formatDayRange(t.starts_on, t.ends_on) : null].filter(Boolean).join(" · ");
}

function changedKeys(a: BidTerms, b: BidTerms): TermKey[] {
  return TERM_KEYS.filter((k) => JSON.stringify(termValue(a, k)) !== JSON.stringify(termValue(b, k)));
}

/** TRR-BID-05 · التفاوض — 457:29184 … 458:31553 (eight states). */
export default async function NegotiationPage({ params }: PageProps<"/trainer/bids/[id]/negotiation">) {
  const { id } = await params;
  await requireTrainer(`/trainer/bids/${id}/negotiation`);
  if (!UUID.test(id)) notFound();
  const b = await getTrainerBid(id);
  if (!b) notFound();
  if (b.status === "rejected") redirect(`/trainer/bids/${id}/decision`);
  if (b.status !== "accepted") redirect("/trainer/bids");
  const [negotiations, commission] = await Promise.all([getNegotiations(id), getCommissionPercent()]);
  const latest = negotiations.at(-1) ?? null;
  const live = latest && !["cancelled", "withdrawn"].includes(latest.status) ? latest : null;
  const state = live?.status ?? "not_started";
  const contractUrl = contractHref(b.id);
  const round = live?.rounds.at(-1);
  const base = round?.baseTerms ?? b.original;

  const items = timelineOf(live);
  const activeBadge: TimelineBadge = { label: `الجولة ${toArabicDigits(Math.max(1, live?.round ?? 1))}`, tone: "info", icon: "hourglass" };
  const deadline = live?.respondBy && (state === "awaiting_org" || state === "countered") ? `يتبقى ${hoursLeftLabel(live.respondBy)} للرد` : null;
  const timeline = (badge: TimelineBadge = activeBadge) => <NegotiationTimeline badge={badge} items={items} deadline={deadline} empty="لم تُرسل أي جولة بعد — تظهر هنا اقتراحاتك وردود الجهة." />;

  const SUBTITLE: Record<string, string> = {
    not_started: "الشروط الحالية",
    draft: "جارٍ إعداد اقتراحك",
    awaiting_org: "أُرسل الاقتراح",
    countered: "ردّت الجهة باقتراح",
    agreed: "اتُّفق على الشروط",
    rejected: "رُفض الاقتراح",
    declined: "رفضت الشروط المقابلة",
    expired: "انقضت مهلة الرد",
  };
  const shell = (body: React.ReactNode) => (
    <>
      <TopBar title="التفاوض على الشروط" subtitle={SUBTITLE[state]} />
      <PageBody className="gap-[26px]">
        <Breadcrumb items={[{ label: "تصفّح الفرص", href: "/trainer/opportunities" }, { label: "عروضي", href: "/trainer/bids" }, { label: "التفاوض" }]} />
        {body}
      </PageBody>
    </>
  );
  const common = { reference: b.reference, title: b.requestTitle, organizationName: b.organizationName, contractUrl };

  // ── Not started / preparing (composer) ──────────────────────────────────────────────────────────────
  if (state === "not_started" || state === "draft") {
    return shell(
      <NegotiationComposer
        key={live?.id ?? "new"}
        bidId={b.id}
        negotiationId={live?.id ?? null}
        phase={state === "draft" ? "preparing" : "not_started"}
        current={b.terms}
        draft={live?.draftTerms ?? {}}
        draftMessage={live?.draftMessage ?? ""}
        timeline={timeline()}
        side={
          <SideNotes
            title="قبل أن تتفاوض"
            rows={[
              { icon: "info", tone: "brand", text: "التفاوض يوقف مهلة التعاقد حتى ردّ الجهة" },
              { icon: "warning", tone: "warning", text: "لك جولة واحدة — استخدمها بحكمة" },
              { icon: "check", tone: "success", text: "رفض الجهة لا يلغي العرض الأصلي" },
            ]}
          />
        }
        {...common}
      />,
    );
  }

  const proposal = round?.proposal ?? {};
  const proposedKeys = TERM_KEYS.filter((k) => proposal[k]);

  // ── Awaiting the organization ───────────────────────────────────────────────────────────────────────
  if (state === "awaiting_org" && live && round) {
    return shell(
      <>
        <BidHero
          tone="info"
          icon="hourglass"
          iconTone="info"
          pill={
            <HeroPill icon="hourglass" tone="info">
              بانتظار رد الجهة
            </HeroPill>
          }
          reference={b.reference}
          title={b.requestTitle}
        >
          {`أُرسل اقتراحك في ${dayTime.format(new Date(round.sentAt))} · يتبقى ${hoursLeftLabel(live.respondBy ?? round.respondBy)} على انتهاء مهلة الرد.`}
        </BidHero>
        <div className="grid w-full grid-cols-1 items-start gap-[26px] lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="flex min-w-0 flex-col gap-6">
            <TermsCard
              title="اقتراحك المرسَل"
              strip={
                <TermsStrip icon="hourglass" tone="info">
                  لا يمكن التعديل حتى تردّ الجهة. يصلك إشعار فور وصول الرد.
                </TermsStrip>
              }
            >
              {proposedKeys.map((k) => (
                <TermRow key={k} state="proposed" title={TERM_TITLES[k]} current={formatTerm(k, termValue(base, k))} proposal={formatTerm(k, proposal[k]!.value)} reason={proposal[k]!.reason} />
              ))}
              <LockedTermRows />
            </TermsCard>
            <ActionCard title="الإجراء">
              <WithdrawProposalButton negotiationId={live.id} />
              <ActionCaption>يعيد الشروط الأصلية ويستأنف مهلة التعاقد</ActionCaption>
              <MessageOrgButton bidId={b.id} />
            </ActionCard>
          </div>
          <aside className="flex min-w-0 flex-col gap-[22px]">
            {timeline()}
            <SideNotes
              title="ماذا لو لم تردّ؟"
              rows={[
                { icon: "clock", tone: "warning", text: "بعد ٧٢ ساعة تنتهي مهلة الرد" },
                { icon: "check", tone: "success", text: "تعود الشروط الأصلية وتستأنف مهلة التعاقد" },
                { icon: "info", tone: "brand", text: "لا تخسر العرض بسبب عدم الرد" },
              ]}
            />
          </aside>
        </div>
      </>,
    );
  }

  // ── Counter-proposal from the organization ──────────────────────────────────────────────────────────
  if (state === "countered" && live && round) {
    const counter = round.counter ?? {};
    const proposed = applyTerms(base, proposal);
    const offered = applyTerms(proposed, counter);
    const net = (p: number) => amount(netOf(p, commission));
    const gain = netOf(offered.price, commission) - netOf(base.price, commission);
    return shell(
      <CounterDecision
        negotiationId={live.id}
        bidId={b.id}
        canPropose={live.round < 2}
        acceptCaption={`${termsLine(offered)} · يصبح التعاقد جاهزًا فورًا`}
        rejectCaption={`${termsLine(base)} · العرض يبقى قائمًا ولا يُلغى`}
        hero={
          <BidHero
            tone="warning"
            strokeWidth={3}
            icon="reply"
            iconTone="warning"
            pill={
              <HeroPill icon="reply" tone="warning">
                اقتراح مقابل من الجهة
              </HeroPill>
            }
            reference={b.reference}
            title={b.requestTitle}
          >
            {`ردّت ${b.organizationName} في ${round.respondedAt ? stamp(round.respondedAt) : ""} بشروط وسط. راجعها — لك ${live.round < 2 ? "ثلاثة خيارات" : "خياران"}.`}
          </BidHero>
        }
        termsCard={
          <TermsCard
            title="اقتراح الجهة المقابل"
            intro="السلسلة كاملة: الشرط الحالي ← اقتراحك ← ردّ الجهة."
            strip={
              live.round < 2 ? (
                <TermsStrip icon="warning" tone="warning">
                  لك جولة أخيرة واحدة. بعدها إما تقبل أو ترفض ويعود العرض لشروطه الأصلية.
                </TermsStrip>
              ) : undefined
            }
          >
            {proposedKeys.map((k) =>
              counter[k] ? (
                <TermRow
                  key={k}
                  state="countered"
                  title={TERM_TITLES[k]}
                  current={formatTerm(k, termValue(base, k))}
                  proposal={formatTerm(k, proposal[k]!.value)}
                  counter={formatTerm(k, counter[k]!.value)}
                  reason={counter[k]!.reason ?? round.responseReason}
                />
              ) : (
                <TermRow key={k} state="proposed" title={TERM_TITLES[k]} current={formatTerm(k, termValue(base, k))} proposal={formatTerm(k, proposal[k]!.value)} reason={proposal[k]!.reason} />
              ),
            )}
            <LockedTermRows />
          </TermsCard>
        }
        timeline={timeline()}
        side={
          <SideNotes
            title="قارن قبل أن تقرر"
            rows={[
              { icon: "wallet", tone: "neutral", text: `اقتراحك ${amount(proposed.price)} → صافي ${net(proposed.price)}` },
              { icon: "reply", tone: "warning", text: `ردّ الجهة ${amount(offered.price)} → صافي ${net(offered.price)}` },
              { icon: "info", tone: "neutral", text: `الأصلي ${amount(base.price)} → صافي ${net(base.price)}` },
              {
                icon: "growth",
                tone: gain >= 0 ? "success" : "warning",
                text: gain >= 0 ? `قبول الردّ يزيدك ${amount(gain)} ر.س عن الأصلي` : `قبول الردّ ينقصك ${amount(-gain)} ر.س عن الأصلي`,
              },
            ]}
          />
        }
        composer={{ current: base, draft: live.draftTerms, draftMessage: live.draftMessage ?? "", ...common }}
      />,
    );
  }

  // ── Agreed ──────────────────────────────────────────────────────────────────────────────────────────
  if (state === "agreed" && live) {
    const agreed = live.agreedTerms ?? b.terms;
    const keys = changedKeys(b.original, agreed);
    const byOrg = live.outcomeBy === "org";
    const netAgreed = netOf(agreed.price, commission);
    const diff = agreed.price - b.original.price;
    const n = keys.length;
    const what = n === 1 ? "الشرط" : n === 2 ? "الشرطين" : "الشروط";
    return shell(
      <>
        <BidHero
          tone="success"
          strokeWidth={3}
          icon="check"
          iconTone="success"
          pill={
            <HeroPill icon="check" tone="success">
              {byOrg ? "قبلت الجهة اقتراحك" : "اتُّفق على الشروط"}
            </HeroPill>
          }
          reference={b.reference}
          title={b.requestTitle}
          actions={<ButtonLink href={contractUrl}>أكمل التعاقد</ButtonLink>}
        >
          {byOrg
            ? `وافقت ${b.organizationName} على ${what} في ${live.outcomeAt ? fullStamp(live.outcomeAt) : ""}. الشروط الجديدة هي المعتمدة الآن.`
            : `قبلت الشروط المقابلة من ${b.organizationName} في ${live.outcomeAt ? fullStamp(live.outcomeAt) : ""}. الشروط الجديدة هي المعتمدة الآن.`}
        </BidHero>
        <div className="grid w-full grid-cols-1 items-start gap-[26px] lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="flex min-w-0 flex-col gap-6">
            <TermsCard
              title="الشروط النهائية المتَّفق عليها"
              strip={
                <TermsStrip icon="check" tone="success">
                  هذه الشروط هي التي سيُبنى عليها التعاقد — راجعها قبل التوقيع.
                </TermsStrip>
              }
            >
              {keys.map((k) => (
                <TermRow key={k} state="agreed" title={TERM_TITLES[k]} original={formatTerm(k, termValue(b.original, k))} agreed={formatTerm(k, termValue(agreed, k))} />
              ))}
              <LockedTermRows />
            </TermsCard>
            <ActionCard title="الخطوة التالية" intro="الاتفاق مسجَّل ومُلزم للطرفين. يتبقى التعاقد.">
              <ButtonLink href={contractUrl} size="l" fullWidth>
                أكمل التعاقد بالشروط الجديدة
              </ButtonLink>
              <ActionCaption>{contractCaption(b)}</ActionCaption>
              <PrintRecordButton />
              <ActionCaption>{live.rounds.length > 1 ? "يوثّق الجولتين والاتفاق النهائي" : "يوثّق الجولة والاتفاق النهائي"}</ActionCaption>
              <MessageOrgButton bidId={b.id} />
            </ActionCard>
          </div>
          <aside className="flex min-w-0 flex-col gap-[22px]">
            {timeline({ label: "انتهى بالاتفاق", tone: "success", icon: "check" })}
            <SideNotes
              title="صافي عائدك بعد التفاوض"
              tone="success"
              rows={[
                { icon: "wallet", tone: "neutral", text: `السعر المتَّفق عليه ${money2(agreed.price)}` },
                { icon: "percent", tone: "warning", text: `عمولة المنصة ${toArabicDigits(commission)}٪ · قيمة تشغيلية مؤقتة وفق إعدادات المنصة · − ${money2(agreed.price - netAgreed).replace(" ر.س", "")}` },
                { icon: "check", tone: "success", text: `يصلك ${money2(netAgreed)}` },
                { icon: "growth", tone: diff >= 0 ? "success" : "warning", text: diff >= 0 ? `زاد ${money2(diff)} عن العرض الأصلي` : `نقص ${money2(-diff)} عن العرض الأصلي` },
              ]}
            />
          </aside>
        </div>
      </>,
    );
  }

  // ── Rejected by the organization / counter declined by the trainer / expired ────────────────────────
  const expired = state === "expired";
  const declined = state === "declined";
  const heroTone = expired ? "warning" : "info";
  const lastAt = live?.outcomeAt ?? round?.respondedAt ?? null;
  const reason = live?.outcomeReason ?? round?.responseReason ?? null;
  const proposedAll = applyTerms(base, proposal);
  const askedTop = Boolean(proposal.price) && proposedAll.price >= b.budgetMax;
  return shell(
    <>
      <BidHero
        tone={heroTone}
        stroke={expired ? "neutral" : "info"}
        icon={expired ? "ban" : "x"}
        iconTone={expired ? "neutral" : "info"}
        pill={
          <HeroPill icon={expired ? "ban" : "x"} tone={expired ? "neutral" : "info"}>
            {expired ? "انتهت مهلة الرد" : declined ? "رفضت الشروط المقابلة" : "لم تقبل الجهة اقتراحك"}
          </HeroPill>
        }
        reference={b.reference}
        title={b.requestTitle}
        actions={<ButtonLink href={contractUrl}>{expired ? "أكمل التعاقد" : "أكمل التعاقد بالشروط الأصلية"}</ButtonLink>}
      >
        {expired
          ? `انقضت ٧٢ ساعة بلا ردّ في ${lastAt ? fullStamp(lastAt) : ""}. عادت الشروط الأصلية تلقائيًا.`
          : declined
            ? `رفضت الشروط المقابلة في ${lastAt ? stamp(lastAt) : ""}. الشروط الأصلية ما زالت سارية والعرض لم يُلغَ.`
            : `ردّت ${b.organizationName} في ${lastAt ? stamp(lastAt) : ""}. الشروط الأصلية ما زالت سارية والعرض لم يُلغَ.`}
      </BidHero>
      <div className="grid w-full grid-cols-1 items-start gap-[26px] lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="flex min-w-0 flex-col gap-6">
          <TermsCard
            title={expired ? "الشروط التي كانت قائمة — وعادت سارية" : "الشروط الأصلية — سارية الآن"}
            strip={
              expired ? (
                <TermsStrip icon="check" tone="success">
                  العرض لم يُلغَ — واستؤنفت مهلة التعاقد من حيث توقفت لحظة بدء التفاوض.
                </TermsStrip>
              ) : reason ? (
                <TermsStrip icon="comment" tone="info">{`سبب الجهة: «${reason}»`}</TermsStrip>
              ) : undefined
            }
          >
            {proposedKeys.map((k) => (
              <TermRow
                key={k}
                state="agreed"
                pill="الشرط الساري"
                agreedLabel="الساري"
                title={TERM_TITLES[k]}
                original={formatTerm(k, termValue(b.original, k))}
                agreed={formatTerm(k, termValue(b.terms, k))}
              />
            ))}
            <LockedTermRows />
          </TermsCard>
          <ActionCard title="ماذا تستطيع الآن؟" intro={expired ? "لا تمديد للمهلة — النظام يعيد الشروط الأصلية تلقائيًا لحماية الطرفين." : "العرض قائم — الرفض شمل الاقتراح لا العرض نفسه."}>
            <ButtonLink href={contractUrl} size="l" fullWidth>
              أكمل التعاقد بالشروط الأصلية
            </ButtonLink>
            <ActionCaption>{expired ? contractCaption(b) : `${termsLine(b.terms)} · ${contractCaption(b)}`}</ActionCaption>
            <MessageOrgButton bidId={b.id} variant="outline" />
            <ActionCaption>{expired ? "قد يكون فاتها الإشعار — المراسلة لا تعيد فتح التفاوض" : "قد تقبل تعديلًا أصغر خارج التفاوض الرسمي"}</ActionCaption>
            <WithdrawBidButton bidId={b.id} title={b.requestTitle} afterAccept label="اعتذر عن العرض" variant="ghost" size="l" fullWidth />
            <ActionCaption>{expired ? "يُسجَّل انسحابًا بعد القبول" : "يُسجَّل انسحابًا بعد القبول — يؤثر على سجل التزامك"}</ActionCaption>
          </ActionCard>
        </div>
        <aside className="flex min-w-0 flex-col gap-[22px]">
          {timeline(
            expired
              ? { label: "انتهت المهلة", tone: "neutral", icon: "ban" }
              : { label: declined ? "رفضت الشروط المقابلة" : "رُفض الاقتراح", tone: "neutral", icon: "x" },
          )}
          {expired ? (
            <SideNotes
              title="عن انتهاء المهلة"
              rows={[
                { icon: "clock", tone: "neutral", text: "المهلة ٧٢ ساعة ثابتة لكل جولة" },
                { icon: "x", tone: "warning", text: "لا يمكن طلب تمديد" },
                { icon: "check", tone: "success", text: "لا تُستهلك جولتك — الجهة هي التي لم تردّ" },
                { icon: "info", tone: "brand", text: "يمكنك بدء تفاوض جديد إن بقيت مهلة التعاقد" },
              ]}
            />
          ) : (
            <SideNotes
              title="اقتراحك المرفوض — محفوظ"
              rows={[
                { icon: "info", tone: "neutral", text: summarizeChanges(proposal).replace(/ \+ /g, " · ") },
                { icon: "info", tone: "brand", text: `الميزانية المعلنة كانت ${budgetRange(b.budgetMin, b.budgetMax).replace(" ر.س", "")}` },
                ...(askedTop
                  ? [
                      { icon: "warning" as const, tone: "warning" as const, text: "طلبت الحد الأعلى — والجهة اعتمدت أقل" },
                      { icon: "check" as const, tone: "success" as const, text: "في المرة القادمة اطلب ضمن وسط النطاق" },
                    ]
                  : []),
              ]}
            />
          )}
        </aside>
      </div>
    </>,
  );
}
