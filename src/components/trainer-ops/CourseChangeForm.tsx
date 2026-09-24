"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Banknote,
  Bell,
  CalendarDays,
  CircleAlert,
  CircleCheck,
  CircleX,
  Clock,
  Hourglass,
  Landmark,
  LayoutGrid,
  MapPin,
  RefreshCw,
  Star,
  TriangleAlert,
  User,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ChipRadio } from "@/components/ui/Chip";
import { Checkbox } from "@/components/ui/Choice";
import { Alert } from "@/components/ui/Feedback";
import { Input, Textarea } from "@/components/ui/Field";
import { Glyph } from "@/components/ui/Icon";
import { IconRow } from "@/components/ui/InfoBlocks";
import { cancelCourse, postponeCourse } from "@/lib/actions/trainer-ops";
import { formatDayMonth, formatPrice, toArabicDigits } from "@/lib/format";
import { initialFormState } from "@/lib/validation/auth";
import { CANCEL_REASONS, POSTPONE_REASONS } from "@/lib/validation/trainer-ops";
import type { OpsImpact } from "@/lib/data/trainer-roster";
import { MiniPill, toneText, type OpsTone } from "./parts";

/*
 * TRR-CRS-04 · تأجيل دورة (277:5339) and إلغاء دورة (277:5650). One form per page: the fields live in the main column,
 * the confirmation (checkbox + submit) in the side column, like the frames.
 */

const PROCESSING_RATE = 0.03; // «رسوم معالجة» shown on both frames (٣٪ of what is refunded).
const EXPECTED_WITHDRAWAL = 0.2; // «متوقع انسحابه · تقدير ٢٠٪» (postpone).

const money = (v: number) => formatPrice(Math.round(v * 100) / 100).replace(/ ر\.س$/, "") + " ر.س";
const moneyFixed = (v: number) =>
  `${new Intl.NumberFormat("ar-SA-u-nu-arab", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)} ر.س`;

function ImpactRow({ icon, iconTone, title, caption }: { icon: LucideIcon; iconTone: OpsTone; title: string; caption: string }) {
  return (
    <li className="flex items-start gap-3 rounded-12 bg-bg-surface px-3.5 py-[13px]">
      <span className={`flex size-10 shrink-0 items-center justify-center rounded-8 bg-bg-page ${toneText[iconTone]}`}>
        <Glyph icon={icon} size={20} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <span className="type-subtitle text-text-primary">{title}</span>
        <span className="type-caption text-text-muted">{caption}</span>
      </span>
    </li>
  );
}

function MoneyRow({ label, value, tone }: { label: string; value: string; tone?: OpsTone }) {
  return (
    <div className="flex items-center gap-3">
      <dt className="min-w-0 flex-1 type-body text-text-secondary">{label}</dt>
      <dd className={`whitespace-nowrap type-subtitle ${tone ? toneText[tone] : "text-text-primary"}`}>{value}</dd>
    </div>
  );
}

const toDateInput = (iso: string | null, addDays = 0) => {
  if (!iso) return "";
  const d = new Date(new Date(iso).getTime() + addDays * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
};

export function CourseChangeForm({
  mode,
  courseId,
  impact,
  backHref,
  postponeHref,
  seatsHref,
}: {
  mode: "postpone" | "cancel";
  courseId: string;
  impact: OpsImpact;
  backHref: string;
  postponeHref: string;
  seatsHref: string;
}) {
  const [state, action, pending] = useActionState(mode === "postpone" ? postponeCourse : cancelCourse, initialFormState);
  const [ack, setAck] = useState(false);
  const [startsOn, setStartsOn] = useState(state.values?.startsOn ?? toDateInput(impact.firstStart, 14));
  const [endsOn, setEndsOn] = useState(state.values?.endsOn ?? toDateInput(impact.lastEnd, 14));
  const fe = state.fieldErrors ?? {};
  const n = toArabicDigits;
  const isPostpone = mode === "postpone";

  // Conflict check of the shifted sessions against the trainer's other sessions («فُحصت تلقائيًا»).
  const conflict = (() => {
    if (!isPostpone || !startsOn || !impact.firstStart) return null;
    const target = new Date(`${startsOn}T00:00:00+03:00`);
    const riyadhMidnight = new Date(`${toDateInput(impact.firstStart)}T00:00:00+03:00`);
    const delta = target.getTime() - riyadhMidnight.getTime();
    if (!Number.isFinite(delta)) return null;
    for (const s of impact.sessions) {
      const a = new Date(s.startsAt).getTime() + delta;
      const b = new Date(s.endsAt).getTime() + delta;
      const hit = impact.busy.find((x) => new Date(x.startsAt).getTime() < b && new Date(x.endsAt).getTime() > a);
      if (hit) return { title: hit.courseTitle, at: new Date(a).toISOString() };
    }
    return false;
  })();

  const refund = impact.collected;
  const withdrawals = isPostpone ? impact.collected * EXPECTED_WITHDRAWAL : refund;
  const fee = withdrawals * PROCESSING_RATE;
  const net = isPostpone ? impact.collected - withdrawals - fee : -fee;
  const withinGrace = (impact.daysToStart ?? 0) >= 14;
  const reasons = isPostpone ? POSTPONE_REASONS : CANCEL_REASONS;
  const tone: OpsTone = isPostpone ? "warning" : "error";

  return (
    <form action={action} className="flex flex-col gap-6" noValidate>
      <input type="hidden" name="courseId" value={courseId} />

      <section className={`flex w-full flex-col items-start gap-4 rounded-22 border-2 px-5 py-6 sm:flex-row sm:items-center sm:gap-6 sm:px-7 ${isPostpone ? "border-state-warning bg-state-warning-bg" : "border-state-error bg-state-error-bg"}`}>
        <span className={`flex size-16 shrink-0 items-center justify-center rounded-16 bg-bg-surface ${toneText[tone]}`}>
          <Glyph icon={isPostpone ? CalendarDays : CircleX} size={32} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <MiniPill icon={Banknote} tone="secondary">
              {money(impact.collected)} محصّلة
            </MiniPill>
            {impact.daysToStart !== null && (
              <MiniPill icon={CalendarDays} tone="secondary">
                {impact.daysToStart >= 0 ? `تبدأ بعد ${n(impact.daysToStart)} يومًا` : "بدأت"}
              </MiniPill>
            )}
            <MiniPill icon={Users} tone={isPostpone ? "brand" : "error"}>
              {impact.registered === 1 ? "متدرب واحد مسجّل" : `${n(impact.registered)} متدربًا مسجّلًا`}
            </MiniPill>
          </div>
          <h2 className="text-[28px] leading-[1.2] font-bold text-text-primary sm:text-[36px]">{isPostpone ? "تأجيل الدورة" : "إلغاء الدورة"}</h2>
          <p className="type-body-lg text-text-secondary">
            {isPostpone ? "التأجيل ينقل كل الجلسات بالتواريخ الجديدة ويُبقي التسجيلات كما هي." : "الإلغاء نهائي ويُلغي كل التسجيلات ويفرض استردادًا كاملًا آليًا."}
          </p>
        </div>
      </section>

      {state.status === "error" && state.message && <Alert tone="error" title={state.message} />}

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <section aria-labelledby="impact-title" className={`flex flex-col gap-4 rounded-16 border-2 px-5 pt-6 pb-[26px] sm:px-6 ${isPostpone ? "border-state-warning bg-state-warning-bg" : "border-state-error bg-state-error-bg"}`}>
            <div className="flex flex-wrap items-center gap-3">
              <h2 id="impact-title" className={`min-w-0 flex-1 type-h3 ${toneText[tone]}`}>
                الأثر على المتدربين الـ{n(impact.registered)}
              </h2>
              <MiniPill icon={CircleAlert} tone={tone}>
                {isPostpone ? "أثر متوسط" : "أثر بالغ"}
              </MiniPill>
            </div>
            <ul className="flex flex-col gap-4">
              {isPostpone ? (
                <>
                  <ImpactRow icon={Bell} iconTone="warning" title="يصلهم إشعار بالتواريخ الجديدة" caption="مع خيار الموافقة أو الانسحاب باسترداد كامل." />
                  <ImpactRow icon={CalendarDays} iconTone="info" title="تُحدَّث تواريخهم تلقائيًا" caption="في ملف تدريبهم وتقويمهم وتذكيراتهم." />
                  <ImpactRow icon={RefreshCw} iconTone="success" title="من لا يناسبه الموعد الجديد" caption="ينسحب باسترداد كامل ١٠٠٪ خلال ٧ أيام من الإشعار." />
                  <ImpactRow icon={Users} iconTone="brand" title="مقاعد المنسحبين تُعرض" caption="على قائمة الانتظار تلقائيًا." />
                </>
              ) : (
                <>
                  <ImpactRow icon={Bell} iconTone="error" title="يصلهم إشعار فوري" caption="في المنصة والبريد والرسائل القصيرة خلال دقائق." />
                  <ImpactRow icon={Hourglass} iconTone="success" title="استرداد كامل آلي" caption="١٠٠٪ بلا خصم — بغض النظر عن شرائح الاسترداد المعتادة." />
                  <ImpactRow icon={CircleX} iconTone="error" title="تُلغى تسجيلاتهم" caption="تختفي الدورة من ملف تدريبهم ولا تُحتسب في سجلهم." />
                  <ImpactRow icon={LayoutGrid} iconTone="brand" title="تُقترح عليهم بدائل" caption="دورات أخرى من البرنامج نفسه إن وُجدت." />
                </>
              )}
            </ul>
          </section>

          <section aria-labelledby="money-title" className="flex flex-col gap-4 rounded-16 border border-border-default bg-bg-card p-5 shadow-card sm:p-6">
            <h2 id="money-title" className="type-h3 text-text-primary">
              الأثر المالي عليك
            </h2>
            <dl className="flex flex-col gap-4">
              <MoneyRow label="المبلغ المحصَّل" value={moneyFixed(impact.collected)} />
              {isPostpone ? (
                <MoneyRow label="متوقع انسحابه" value={`− ${moneyFixed(withdrawals)} · تقدير ٢٠٪`} tone="warning" />
              ) : (
                <MoneyRow label="يُسترد للمتدربين" value={`− ${moneyFixed(refund)}`} tone="error" />
              )}
              <MoneyRow label={isPostpone ? "رسوم معالجة" : "رسوم معالجة الاسترداد"} value={`− ${moneyFixed(fee)}${isPostpone ? "" : " · ٣٪"}`} tone={tone} />
            </dl>
            <hr className="border-border-divider" />
            <div className="flex items-center gap-3">
              <p className="min-w-0 flex-1 type-title text-text-secondary">{isPostpone ? "صافي متوقع بعد التأجيل" : "صافي أثر الإلغاء"}</p>
              <p className={`whitespace-nowrap type-h3 ${isPostpone ? "text-state-success" : "text-state-error"}`}>
                {isPostpone ? moneyFixed(net) : `− ${moneyFixed(fee)}`}
              </p>
            </div>
            <div className={`flex items-start gap-2.5 rounded-12 px-3.5 py-3 ${isPostpone ? "bg-state-warning-bg text-state-warning" : "bg-state-error-bg text-state-error"}`}>
              <Glyph icon={Star} size={20} className="mt-1" />
              <p className="min-w-0 flex-1 type-body">
                {isPostpone
                  ? withinGrace
                    ? "التأجيل يُسجَّل ولا يؤثر على تقييمك إن كان قبل البدء بأسبوعين على الأقل — وأنت ضمن المهلة."
                    : "التأجيل يُسجَّل ولا يؤثر على تقييمك إن كان قبل البدء بأسبوعين على الأقل."
                  : "الإلغاء يُسجَّل في سجل التزامك ويظهر للجهات كمؤشر. إلغاءان في السنة يوقفان النشر مؤقتًا حتى مراجعة الإدارة."}
              </p>
            </div>
          </section>

          <section aria-labelledby="details-title" className="flex flex-col gap-4 rounded-16 border border-border-default bg-bg-card p-5 shadow-card sm:p-6">
            <h2 id="details-title" className="type-h3 text-text-primary">
              {isPostpone ? "التواريخ الجديدة" : "سبب الإلغاء"}
            </h2>
            {isPostpone && (
              <>
                <div className="flex flex-col gap-4 sm:flex-row">
                  <Input
                    label="تاريخ البداية الجديد"
                    name="startsOn"
                    type="date"
                    required
                    value={startsOn}
                    min={toDateInput(new Date().toISOString(), 1)}
                    onChange={(e) => setStartsOn(e.currentTarget.value)}
                    error={fe.startsOn}
                    className="flex-1"
                  />
                  <Input
                    label="تاريخ النهاية الجديد"
                    name="endsOn"
                    type="date"
                    required
                    value={endsOn}
                    min={startsOn || undefined}
                    onChange={(e) => setEndsOn(e.currentTarget.value)}
                    error={fe.endsOn}
                    className="flex-1"
                  />
                </div>
                {conflict === false && (
                  <div className="flex items-center gap-2.5 rounded-12 bg-state-success-bg px-3.5 py-3 text-state-success">
                    <Glyph icon={CircleCheck} size={20} />
                    <p className="min-w-0 flex-1 type-body">التواريخ الجديدة خالية من التعارض في تقويمك — فُحصت تلقائيًا.</p>
                  </div>
                )}
                {conflict && (
                  <div role="alert" className="flex items-center gap-2.5 rounded-12 bg-state-warning-bg px-3.5 py-3 text-state-warning">
                    <Glyph icon={TriangleAlert} size={20} />
                    <p className="min-w-0 flex-1 type-body">
                      تتعارض التواريخ الجديدة مع «{conflict.title}» يوم {formatDayMonth(conflict.at)} — راجع تقويمك.
                    </p>
                  </div>
                )}
              </>
            )}
            <fieldset className="flex flex-col gap-2">
              <legend className="sr-only">{isPostpone ? "سبب التأجيل" : "سبب الإلغاء"}</legend>
              <div className="flex flex-wrap gap-2.5">
                {reasons.map((r) => (
                  <ChipRadio key={r.value} name="reason" value={r.value} defaultChecked={state.values?.reason === r.value}>
                    {r.label}
                  </ChipRadio>
                ))}
              </div>
              {fe.reason && (
                <p role="alert" className="type-caption text-state-error">
                  {fe.reason}
                </p>
              )}
            </fieldset>
            <Textarea
              label="رسالتك للمتدربين"
              name="message"
              rows={3}
              maxLength={2000}
              defaultValue={state.values?.message}
              placeholder="تُرسل كما كتبتها مع الإشعار. اشرح السبب باحترام واذكر البديل إن وُجد."
              error={fe.message}
            />
          </section>
        </div>

        <div className="flex w-full shrink-0 flex-col gap-5 lg:w-[400px]">
          <section aria-labelledby="alt-title" className="flex flex-col gap-4 rounded-16 border border-border-default bg-bg-card p-5 shadow-card sm:p-6">
            <h2 id="alt-title" className="type-h3 text-text-primary">
              {isPostpone ? "بدائل قبل التأجيل" : "بدائل قبل الإلغاء"}
            </h2>
            <p className="type-caption text-text-muted">{isPostpone ? "إن كان السبب تعارضًا فقط:" : "الإلغاء آخر الحلول. جرّب هذه أولًا."}</p>
            <ul className="flex flex-col gap-4">
              {isPostpone ? (
                <>
                  <IconRow icon={User} title="استبدل مدربًا مساعدًا" description="إن كان التعارض شخصيًا" />
                  <IconRow icon={MapPin} title="غيّر القاعة أو الفرع" description="إن كان السبب المكان" />
                  <IconRow icon={Clock} title="عدّل التوقيت فقط" description="بلا تغيير التواريخ" />
                </>
              ) : (
                <>
                  <li>
                    <Link href={postponeHref} className="block rounded-12 focus-ring">
                      <IconRowInner icon={CalendarDays} title="أجّل بدل الإلغاء" description="تحتفظ بالمسجّلين وبإيرادك" />
                    </Link>
                  </li>
                  <li>
                    <Link href={seatsHref} className="block rounded-12 focus-ring">
                      <IconRowInner icon={Users} title="خفّض الحد الأدنى للمقاعد" description="إن كان السبب قلة التسجيل" />
                    </Link>
                  </li>
                  <IconRow icon={Landmark} title="اعرضها على جهة تدريبية" description="قد تتبنّاها وتنفّذها" />
                </>
              )}
            </ul>
          </section>

          <section aria-labelledby="confirm-title" className="flex flex-col gap-4 rounded-16 border border-border-default bg-bg-card p-5 shadow-card sm:p-6">
            <h2 id="confirm-title" className="type-h3 text-text-primary">
              التأكيد
            </h2>
            <Checkbox name="acknowledge" checked={ack} onChange={(e) => setAck(e.currentTarget.checked)}>
              {isPostpone ? "أفهم أن المتدربين قد ينسحبون باسترداد كامل" : "أفهم أن الإلغاء نهائي ويُسجَّل في سجل التزامي"}
            </Checkbox>
            {fe.acknowledge && (
              <p role="alert" className="type-caption text-state-error">
                {fe.acknowledge}
              </p>
            )}
            <Button type="submit" size="l" fullWidth variant={isPostpone ? "primary" : "danger"} disabled={!ack} loading={pending}>
              {isPostpone ? "أكّد التأجيل وأبلغ المتدربين" : "ألغِ الدورة نهائيًا"}
            </Button>
            <Link href={backHref} className="flex h-14 items-center justify-center rounded-12 type-body-lg text-text-brand hover:underline focus-ring">
              تراجع — أبقِ الدورة كما هي
            </Link>
          </section>
        </div>
      </div>
    </form>
  );
}

/** IconRow body without the <li> (used inside links). */
function IconRowInner({ icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return (
    <span className="flex w-full items-start gap-2.5 rounded-12 bg-bg-page px-3 py-[11px] hover:bg-bg-brand-tint">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-8 bg-bg-surface text-text-brand">
        <Glyph icon={icon} size={20} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="type-subtitle text-text-primary">{title}</span>
        <span className="type-caption text-text-muted">{description}</span>
      </span>
    </span>
  );
}
