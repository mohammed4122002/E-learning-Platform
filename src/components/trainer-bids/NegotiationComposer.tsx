"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { cancelNegotiation, saveNegotiation, startNegotiation } from "@/app/(trainer)/trainer/bids/actions";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Feedback";
import { Input, Select, Textarea } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { BidHero, HeroPill } from "@/components/trainer-bids/parts";
import { ActionCaption, ActionCard, LockedTermRows, TermRow, TermsCard, TermsStrip } from "@/components/trainer-bids/NegotiationParts";
import {
  PAYMENT_TERMS,
  TERM_KEYS,
  TERM_TITLES,
  changedCountSentence,
  formatTerm,
  parseAmount,
  termValue,
  type BidTerms,
  type TermChanges,
  type TermKey,
} from "@/lib/trainer-bids";

type Fields = { price: string; days: string; hours: string; starts_on: string; ends_on: string; payment_terms: string };
type Reasons = Record<TermKey, string>;

function fieldsFrom(draft: TermChanges): Fields {
  const d = draft.duration?.value as { days?: number; hours?: number } | undefined;
  const r = draft.dates?.value as { starts_on?: string; ends_on?: string } | undefined;
  return {
    price: draft.price ? String(draft.price.value) : "",
    days: d?.days ? String(d.days) : "",
    hours: d?.hours ? String(d.hours) : "",
    starts_on: r?.starts_on ?? "",
    ends_on: r?.ends_on ?? "",
    payment_terms: draft.payment_terms ? String(draft.payment_terms.value) : "",
  };
}

/** The proposal the inputs describe: only terms that differ from the current ones. */
function toChanges(f: Fields, current: BidTerms, reasons: Reasons): TermChanges {
  const out: TermChanges = {};
  const price = parseAmount(f.price);
  if (f.price && Number.isFinite(price) && price > 0 && price !== current.price) out.price = { value: price, reason: reasons.price };
  const days = f.days ? parseAmount(f.days) : current.days;
  const hours = f.hours ? parseAmount(f.hours) : current.hours;
  if ((f.days || f.hours) && Number.isFinite(days) && Number.isFinite(hours) && (days !== current.days || hours !== current.hours)) {
    out.duration = { value: { days: Math.round(days), hours }, reason: reasons.duration };
  }
  if (f.starts_on && f.ends_on && (f.starts_on !== current.starts_on || f.ends_on !== current.ends_on)) {
    out.dates = { value: { starts_on: f.starts_on, ends_on: f.ends_on }, reason: reasons.dates };
  }
  if (f.payment_terms && f.payment_terms !== current.payment_terms) out.payment_terms = { value: f.payment_terms, reason: reasons.payment_terms };
  return out;
}

/**
 * TRR-BID-05 composer: «لم يبدأ» (457:29184), «إعداد الاقتراح» (457:29572), «فشل الإرسال» (457:30319) and the final
 * round after a counter-proposal. The draft is saved before sending, so a failed send never loses the proposal.
 */
export function NegotiationComposer({
  bidId,
  negotiationId: initialId,
  phase,
  current,
  draft,
  draftMessage,
  reference,
  title,
  organizationName,
  contractUrl,
  timeline,
  side,
  onBack,
}: {
  bidId: string;
  negotiationId: string | null;
  /** not_started: no negotiation yet · preparing: draft round 1 · final: last round after a counter-proposal. */
  phase: "not_started" | "preparing" | "final";
  current: BidTerms;
  draft: TermChanges;
  draftMessage: string;
  reference: string;
  title: string;
  organizationName: string;
  contractUrl: string;
  timeline: ReactNode;
  side?: ReactNode;
  onBack?: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [fields, setFields] = useState<Fields>(() => fieldsFrom(draft));
  const [reasons, setReasons] = useState<Reasons>(() => ({
    price: draft.price?.reason ?? "",
    duration: draft.duration?.reason ?? "",
    dates: draft.dates?.reason ?? "",
    payment_terms: draft.payment_terms?.reason ?? "",
  }));
  const [message, setMessage] = useState(draftMessage);
  const [failed, setFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<"send" | "draft" | "start" | "cancel" | null>(null);
  const idRef = useRef<string | null>(initialId);

  const changes = useMemo(() => toChanges(fields, current, reasons), [fields, current, reasons]);
  const changedKeys = TERM_KEYS.filter((k) => changes[k]);
  const editing = phase !== "not_started";
  const set = (patch: Partial<Fields>) => setFields((f) => ({ ...f, ...patch }));

  async function ensureId(): Promise<string | null> {
    const known = idRef.current ?? initialId;
    if (known) return known;
    const res = await startNegotiation(bidId);
    if (!res.ok || !res.id) {
      setError(res.message);
      return null;
    }
    idRef.current = res.id;
    return res.id;
  }

  const run = (kind: NonNullable<typeof busy>, fn: () => Promise<void>) => {
    setError(null);
    setBusy(kind);
    start(async () => {
      try {
        await fn();
      } finally {
        setBusy(null);
      }
    });
  };

  const startNow = () =>
    run("start", async () => {
      const id = await ensureId();
      if (!id) return;
      if (changedKeys.length) {
        const res = await saveNegotiation(id, changes, message, false);
        if (!res.ok) return setError(res.message);
      }
      router.refresh();
    });

  const saveDraft = (leave = false) =>
    run("draft", async () => {
      const id = await ensureId();
      if (!id) return;
      const res = await saveNegotiation(id, changes, message, false);
      if (!res.ok) return setError(res.message);
      toast("success", res.message);
      if (leave) router.push("/trainer/bids");
      else router.refresh();
    });

  const send = () =>
    run("send", async () => {
      const id = await ensureId();
      if (!id) return;
      // Keep the proposal safe first; a connection failure after this point loses nothing.
      const saved = await saveNegotiation(id, changes, message, false).catch(() => null);
      if (saved && !saved.ok) return setError(saved.message);
      try {
        const res = await saveNegotiation(id, changes, message, true);
        if (!res.ok) return setError(res.message);
        setFailed(false);
        toast("success", res.message);
        router.refresh();
      } catch {
        setFailed(true);
      }
    });

  const cancel = () => {
    if (phase === "final" && onBack) return onBack();
    run("cancel", async () => {
      const id = idRef.current ?? initialId;
      if (id) {
        const res = await cancelNegotiation(id);
        if (!res.ok) return setError(res.message);
      }
      setFields(fieldsFrom({}));
      setMessage("");
      setFailed(false);
      idRef.current = null;
      router.refresh();
    });
  };

  const input = (k: TermKey) => {
    if (k === "price")
      return <Input label="اقتراحك الجديد" inputMode="decimal" value={fields.price} onChange={(e) => set({ price: e.currentTarget.value })} trailing="ر.س" />;
    if (k === "duration")
      return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="اقتراحك الجديد · الأيام" inputMode="numeric" value={fields.days} onChange={(e) => set({ days: e.currentTarget.value })} trailing="أيام" />
          <Input label="الساعات" inputMode="decimal" value={fields.hours} onChange={(e) => set({ hours: e.currentTarget.value })} trailing="ساعة" />
        </div>
      );
    if (k === "dates")
      return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="اقتراحك الجديد · من" type="date" value={fields.starts_on} onChange={(e) => set({ starts_on: e.currentTarget.value })} />
          <Input label="إلى" type="date" value={fields.ends_on} min={fields.starts_on || undefined} onChange={(e) => set({ ends_on: e.currentTarget.value })} />
        </div>
      );
    return (
      <Select
        label="اقتراحك الجديد"
        value={fields.payment_terms}
        onChange={(e) => set({ payment_terms: e.currentTarget.value })}
        options={[{ value: "", label: "بلا تغيير" }, ...Object.entries(PAYMENT_TERMS).filter(([v]) => v !== current.payment_terms).map(([value, label]) => ({ value, label }))]}
      />
    );
  };

  const rows = TERM_KEYS.map((k) => {
    const c = changes[k];
    const cur = formatTerm(k, termValue(current, k));
    if (c && !failed)
      return (
        <TermRow
          key={k}
          state="proposed"
          title={TERM_TITLES[k]}
          current={cur}
          proposal={formatTerm(k, c.value)}
          editor={
            <div className="flex flex-col gap-3">
              {input(k)}
              <Textarea label="سببك" rows={2} maxLength={500} value={reasons[k]} onChange={(e) => {
                  const value = e.currentTarget.value;
                  setReasons((r) => ({ ...r, [k]: value }));
                }} />
            </div>
          }
        />
      );
    if (c && failed) return <TermRow key={k} state="proposed" title={TERM_TITLES[k]} current={cur} proposal={formatTerm(k, c.value)} reason={c.reason} />;
    if (failed) return null;
    return <TermRow key={k} state="editable" title={TERM_TITLES[k]} current={cur} input={input(k)} />;
  });

  const hero = failed ? (
    <BidHero
      tone="error"
      icon="octagonX"
      iconTone="error"
      pill={
        <HeroPill icon="octagonX" tone="error">
          تعذّر إرسال اقتراحك
        </HeroPill>
      }
      reference={reference}
      title={title}
    >
      فشل الاتصال أثناء الإرسال — اقتراحك محفوظ ولم يضِع.
    </BidHero>
  ) : editing ? (
    <BidHero
      tone="warning"
      stroke="brand-text"
      icon="edit"
      iconTone="brand"
      pill={
        <HeroPill icon="edit" tone="brand">
          جارٍ إعداد اقتراحك
        </HeroPill>
      }
      reference={reference}
      title={title}
    >
      عدّل ما تريد ثم راجع التغييرات قبل الإرسال.
    </BidHero>
  ) : (
    <BidHero
      tone="success"
      icon="check"
      iconTone="success"
      pill={
        <HeroPill icon="check" tone="success">
          مقبول · بانتظار تعاقدك
        </HeroPill>
      }
      reference={reference}
      title={title}
      actions={
        <>
          <ButtonLink href={contractUrl} className="w-full sm:w-[183px] sm:px-4">
            أكمل التعاقد كما هو
          </ButtonLink>
          <Button variant="outline" className="w-full sm:w-[183px] sm:px-4" onClick={startNow} loading={busy === "start"} disabled={pending}>
            تفاوض على الشروط
          </Button>
        </>
      }
    >
      {`قبلت ${organizationName} عرضك. راجع الشروط — يمكنك التفاوض قبل التعاقد.`}
    </BidHero>
  );

  return (
    <>
      {hero}
      <div className="grid w-full grid-cols-1 items-start gap-[26px] lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="flex min-w-0 flex-col gap-6">
          <TermsCard
            title={failed ? "اقتراحك المحفوظ" : editing ? "ما الذي تريد تغييره؟" : "الشروط الحالية"}
            intro={failed ? undefined : editing ? "اترك الحقل فارغًا إن كنت موافقًا على الشرط كما هو." : "أربعة شروط قابلة للتفاوض وثلاثة ثابتة لا تُعدَّل."}
            strip={
              failed ? (
                <TermsStrip icon="shield" tone="success">
                  لم يصل شيء للجهة — ما زلت في نفس الموضع ولم تُستهلك جولتك.
                </TermsStrip>
              ) : editing && changedKeys.length > 0 ? (
                <TermsStrip icon="info" tone="info">
                  {changedCountSentence(changedKeys.length)}
                </TermsStrip>
              ) : undefined
            }
          >
            {rows}
            <LockedTermRows />
          </TermsCard>

          {editing && !failed && (
            <section aria-labelledby="msg-title" className="flex w-full flex-col gap-5 rounded-22 border border-border-default bg-bg-card p-5 shadow-card sm:p-7">
              <h2 id="msg-title" className="type-h2 text-text-primary">
                رسالتك للجهة
              </h2>
              <p className="type-body text-text-muted">اشرح سبب طلبك — الجهات تقبل التعديل حين تفهم مبرّره.</p>
              <Textarea aria-label="رسالتك للجهة" rows={3} maxLength={2000} value={message} onChange={(e) => setMessage(e.currentTarget.value)} />
            </section>
          )}

          <ActionCard title="الإجراء">
            {error && <Alert tone="error" title={error} />}
            {failed ? (
              <>
                <Button size="l" fullWidth onClick={send} loading={busy === "send"} disabled={pending}>
                  أعد إرسال الاقتراح
                </Button>
                <Button variant="outline" size="l" fullWidth onClick={() => saveDraft(true)} loading={busy === "draft"} disabled={pending}>
                  احفظ كمسودة وحاول لاحقًا
                </Button>
                <ActionCaption>تجده في «عروضي» بحالة مسودة تفاوض</ActionCaption>
                <Button variant="ghost" size="l" fullWidth onClick={cancel} loading={busy === "cancel"} disabled={pending}>
                  إلغاء التفاوض
                </Button>
              </>
            ) : editing ? (
              <>
                <Button size="l" fullWidth onClick={send} loading={busy === "send"} disabled={pending || changedKeys.length === 0}>
                  أرسل الاقتراح للجهة
                </Button>
                <ActionCaption>{phase === "final" ? "جولتك الأخيرة — لا تعديل بعد الإرسال حتى يردّ الطرف الآخر" : "لا تعديل بعد الإرسال حتى يردّ الطرف الآخر"}</ActionCaption>
                <Button variant="outline" size="l" fullWidth onClick={() => saveDraft(false)} loading={busy === "draft"} disabled={pending}>
                  احفظ كمسودة
                </Button>
                <Button variant="ghost" size="l" fullWidth onClick={cancel} loading={busy === "cancel"} disabled={pending}>
                  {phase === "final" ? "تراجع" : "إلغاء التفاوض"}
                </Button>
                <ActionCaption>{phase === "final" ? "يعيدك لاقتراح الجهة المقابل" : "يعيدك للشروط الأصلية بلا أثر"}</ActionCaption>
              </>
            ) : (
              <>
                <Button size="l" fullWidth onClick={startNow} loading={busy === "start"} disabled={pending}>
                  ابدأ التفاوض
                </Button>
                <ActionCaption>لك جولة واحدة على كل شرط</ActionCaption>
                <ButtonLink href={contractUrl} variant="outline" size="l" fullWidth>
                  أكمل التعاقد بالشروط الحالية
                </ButtonLink>
              </>
            )}
          </ActionCard>
        </div>
        <aside className="flex min-w-0 flex-col gap-[22px]">
          {timeline}
          {!editing && side}
        </aside>
      </div>
    </>
  );
}
