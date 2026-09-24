import { CircleCheck, Lightbulb, Users } from "lucide-react";
import { Avatar } from "@/components/ui/Data";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Feedback";
import { Glyph } from "@/components/ui/Icon";
import { formatNumber, formatPercent, formatRelative, toArabicDigits } from "@/lib/format";
import type { BuyerRow, RecordedModule, RosterRow, WaitRow } from "@/lib/data/trainer-roster";
import { BroadcastDialog } from "./BroadcastDialog";
import { RowMenu } from "./RowMenu";
import { AccentBar, OpsCard, Pct, TagPill, toneText, type OpsTone } from "./parts";

/* TRR-CRS-05 · ٥ المتدربون (436:19902) and the recorded variant of TRR-CRS-03 (327:11674). */

const BAND: Record<RosterRow["band"], { row: string; text: OpsTone | "brand" }> = {
  regular: { row: "bg-bg-page", text: "success" },
  below: { row: "bg-state-warning-bg", text: "warning" },
  at_risk: { row: "bg-state-error-bg", text: "error" },
  none: { row: "bg-bg-page", text: "brand" },
};

function bandCaption(r: RosterRow) {
  if (r.percent === null) return "لم تنتهِ أي جلسة بعد";
  const base = `${toArabicDigits(r.attended)} من ${toArabicDigits(r.ended)}`;
  if (r.band === "regular") return `${base} جلسات`;
  if (r.band === "below") return `${base} · دون الحد`;
  return `${base} · معرّض للرسوب`;
}

/** Roster row (436:20165): r16 tone tint, px18 py16, gap16; 40px avatar + 19 Bold name + 17 muted date; 190px percent block; two 40px squares. */
export function RosterRowView({ r, courseId }: { r: RosterRow; courseId: string }) {
  const band = BAND[r.band];
  return (
    <li className={`flex w-full flex-wrap items-center gap-4 rounded-16 px-[18px] py-4 ${band.row}`}>
      <div className="flex min-w-0 flex-1 basis-56 items-center gap-3">
        <Avatar name={r.name} />
        <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
          <p className="truncate type-title text-text-primary">{r.name}</p>
          <p className="type-body text-text-muted">سجّل {formatRelative(r.enrolledAt)}</p>
        </div>
      </div>
      <div className={`flex w-[150px] flex-col gap-1 text-center sm:w-[190px] ${toneText[band.text as OpsTone]}`}>
        <p className="type-h3">{r.percent === null ? "—" : <Pct value={r.percent} />}</p>
        <p className="type-caption">{bandCaption(r)}</p>
      </div>
      <div className="flex shrink-0 items-center gap-4">
        <RowMenu
          label={`خيارات ${r.name}`}
          items={[
            { href: `/trainer/courses/${courseId}/attendance`, label: "سجل الحضور" },
            { href: `/trainer/courses/${courseId}/results`, label: "النتائج" },
          ]}
        />
        <BroadcastDialog
          iconOnly
          courseId={courseId}
          audience="selected"
          trainees={[r.traineeId]}
          recipientsLabel={r.name}
          title={`رسالة إلى ${r.name}`}
          label={`راسل ${r.name}`}
        />
      </div>
    </li>
  );
}

export function RosterCard({ rows, courseId, total, disabled }: { rows: RosterRow[]; courseId: string; total: number; disabled?: boolean }) {
  return (
    <OpsCard
      title="المتدربون المسجّلون"
      titleId="roster-title"
      titleSize="h2"
      aside={
        <div className="flex flex-wrap items-center gap-3">
          <TagPill icon={Users}>{total === 1 ? "متدرب واحد" : `${toArabicDigits(total)} متدربًا`}</TagPill>
          <BroadcastDialog
            courseId={courseId}
            audience="enrolled"
            recipientsLabel="كل المتدربين المسجّلين"
            title="رسالة إلى كل المسجّلين"
            label="راسل الجميع"
            className="min-w-[120px]"
            disabled={disabled || total === 0}
          />
        </div>
      }
    >
      {rows.length === 0 ? (
        <EmptyState icon={Users} title={total === 0 ? "لا متدربين مسجّلين بعد" : "لا نتائج مطابقة"} description={total === 0 ? "يظهر المسجّلون هنا فور تأكيد تسجيلهم." : "جرّب اسمًا آخر أو امسح البحث."} />
      ) : (
        <ul className="flex flex-col gap-5">
          {rows.map((r) => (
            <RosterRowView key={r.enrollmentId} r={r} courseId={courseId} />
          ))}
        </ul>
      )}
    </OpsCard>
  );
}

/** «قائمة الانتظار» (436:20237): rows bg/page r12, name 15 + since 14 muted, 30px white position disc. */
export function WaitlistCard({ rows }: { rows: WaitRow[] }) {
  return (
    <OpsCard title="قائمة الانتظار" titleId="waitlist-title" description="يُدعون تلقائيًا بالترتيب عند أي انسحاب.">
      {rows.length === 0 ? (
        <p className="type-small text-text-muted">لا أحد في قائمة الانتظار.</p>
      ) : (
        <ol className="flex flex-col gap-5">
          {rows.map((w, i) => (
            <li key={w.id} className="flex items-center gap-3 rounded-12 bg-bg-page px-3.5 pt-3 pb-[13px]">
              <span className="flex size-[30px] shrink-0 items-center justify-center rounded-full bg-bg-surface type-caption text-text-brand">{toArabicDigits(i + 1)}</span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="type-small text-text-primary">{w.name}</span>
                <span className="type-caption text-text-muted">
                  {w.status === "invited" ? "دُعي لمقعد — بانتظار الدفع" : formatRelative(w.since).replace(/^قبل/, "منذ")}
                </span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </OpsCard>
  );
}

function atRiskCopy(n: number, remaining: number) {
  const rem = remaining === 1 ? "تبقّت جلسة واحدة لتداركه" : remaining === 2 ? "تبقّت جلستان لتداركه" : `تبقّت ${toArabicDigits(remaining)} جلسات لتداركه`;
  if (n === 1) return { title: "متدرب معرّض للرسوب", body: `حضوره دون ٧٥٪ — لن يجتاز حتى لو نجح في الاختبار. ${remaining ? `${rem}.` : ""}`, cta: "نبّهه الآن" };
  if (n === 2) return { title: "متدربان معرّضان للرسوب", body: `حضورهما دون ٧٥٪ — لن يجتازا حتى لو نجحا في الاختبار. ${remaining ? `${rem}.` : ""}`, cta: "نبّههما الآن" };
  return { title: `${toArabicDigits(n)} متدربين معرّضين للرسوب`, body: `حضورهم دون ٧٥٪ — لن يجتازوا حتى لو نجحوا في الاختبار. ${remaining ? `${rem}.` : ""}`, cta: "نبّههم الآن" };
}

/** «متدربان معرّضان للرسوب» (436:20258): error tint + 2px border, r22, p24, H3 error title, primary CTA. */
export function AtRiskCard({ rows, remaining, courseId }: { rows: RosterRow[]; remaining: number; courseId: string }) {
  if (!rows.length) return null;
  const copy = atRiskCopy(rows.length, remaining);
  return (
    <OpsCard tone="error" title={copy.title} titleId="at-risk-title" description={copy.body} className="gap-3.5 sm:p-6">
      <BroadcastDialog
        variant="primary"
        fullWidth
        courseId={courseId}
        audience="selected"
        trainees={rows.map((r) => r.traineeId)}
        recipientsLabel={rows.map((r) => r.name).join("، ")}
        title="تنبيه بخطر عدم الاجتياز"
        defaultBody={`حضورك في الدورة دون حد الاجتياز (٧٥٪). ${remaining ? "احرص على حضور الجلسات المتبقية لتتدارك ذلك." : "تواصل معي لنبحث الخيارات المتاحة."}`}
        label={copy.cta}
      />
    </OpsCard>
  );
}

/** «المقاعد» (272:4932): r16 p24 gap16, accent progress, three value rows, outline «عدّل عدد المقاعد». */
export function SeatsSummaryCard({
  taken,
  capacity,
  waitlist,
  withdrawn,
  href,
  disabled,
}: {
  taken: number;
  capacity: number;
  waitlist: number;
  withdrawn: number;
  href: string;
  disabled?: boolean;
}) {
  const free = Math.max(capacity - taken, 0);
  const pct = capacity ? (taken / capacity) * 100 : 0;
  return (
    <section aria-labelledby="seats-summary" className="flex w-full flex-col gap-4 rounded-16 border border-border-default bg-bg-card p-5 shadow-card sm:p-6">
      <h2 id="seats-summary" className="type-h3 text-text-primary">
        المقاعد
      </h2>
      <AccentBar percent={pct} start={`${toArabicDigits(taken)} محجوزًا من ${toArabicDigits(capacity)}`} end={formatPercent(pct)} label="نسبة المقاعد المحجوزة" />
      <dl className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <dt className="min-w-0 flex-1 type-body text-text-secondary">متاح للحجز</dt>
          <dd className="type-subtitle text-state-success">{free === 1 ? "مقعد واحد" : free === 2 ? "مقعدان" : `${toArabicDigits(free)} ${free >= 3 && free <= 10 ? "مقاعد" : "مقعدًا"}`}</dd>
        </div>
        <div className="flex items-center gap-3">
          <dt className="min-w-0 flex-1 type-body text-text-secondary">في قائمة الانتظار</dt>
          <dd className="type-subtitle text-text-muted">{toArabicDigits(waitlist)}</dd>
        </div>
        <div className="flex items-center gap-3">
          <dt className="min-w-0 flex-1 type-body text-text-secondary">انسحبوا</dt>
          <dd className="type-subtitle text-state-warning">{toArabicDigits(withdrawn)}</dd>
        </div>
      </dl>
      <ButtonLink href={href} variant="outline" fullWidth disabled={disabled}>
        عدّل عدد المقاعد
      </ButtonLink>
    </section>
  );
}

/** «إجراءات حساسة» (272:4952): error tint + 1.5px border, r16, pt20 pb22 px20, gap14. */
export function SensitiveActionsCard({
  count,
  postponeHref,
  cancelHref,
  canPostpone,
  canCancel,
}: {
  count: number;
  postponeHref: string;
  cancelHref: string;
  canPostpone: boolean;
  canCancel: boolean;
}) {
  return (
    <section aria-labelledby="sensitive-title" className="flex w-full flex-col gap-3.5 rounded-16 border-[1.5px] border-state-error bg-state-error-bg px-5 pt-5 pb-[22px]">
      <h2 id="sensitive-title" className="type-h3 text-state-error">
        إجراءات حساسة
      </h2>
      <p className="type-caption text-text-secondary">تؤثر على {count === 1 ? "متدرب واحد مسجّل" : `${toArabicDigits(count)} متدربًا مسجّلًا`} وعلى إيرادك.</p>
      <ButtonLink href={postponeHref} variant="outline" fullWidth disabled={!canPostpone}>
        أجّل الدورة
      </ButtonLink>
      <ButtonLink href={cancelHref} variant="ghost" fullWidth disabled={!canCancel}>
        ألغِ الدورة
      </ButtonLink>
    </section>
  );
}

// ── Recorded (327:11674) ────────────────────────────────────────────────────────────────────────

/** «المواد المنشورة» (327:11957): r22 p26 gap18, H2, warning caption, rows bg/page r12 with a success check. */
export function PublishedMaterialsCard({ modules }: { modules: RecordedModule[] }) {
  return (
    <OpsCard title="المواد المنشورة" titleId="materials-title" titleSize="h2" className="gap-[18px] sm:p-[26px]">
      <p className="type-caption text-state-warning">تحديث المواد يتطلب مراجعة جديدة من المنصة قبل ظهوره للمشترين.</p>
      {modules.length === 0 ? (
        <p className="type-small text-text-muted">لا فصول منشورة بعد.</p>
      ) : (
        <ul className="flex flex-col gap-[18px]">
          {modules.map((m) => (
            <li key={m.id} className="flex items-center gap-2.5 rounded-12 bg-bg-page px-3.5 py-3">
              <Glyph icon={CircleCheck} size={20} className={m.published === m.lessons && m.lessons > 0 ? "text-state-success" : "text-text-muted"} />
              <span className="min-w-0 flex-1 type-small text-text-primary">
                الفصل {toArabicDigits(m.position)} · {m.title}
              </span>
              <span className="shrink-0 type-caption text-text-muted">
                {m.lessons === 1 ? "ملف واحد" : m.lessons === 2 ? "ملفان" : `${toArabicDigits(m.lessons)} ${m.lessons <= 10 ? "ملفات" : "ملفًا"}`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </OpsCard>
  );
}

export function BuyerQuestionsCard({ pending }: { pending: number }) {
  return (
    <OpsCard title="أسئلة المشترين" titleId="questions-title" titleSize="h2" className="gap-[18px] sm:p-[26px]">
      <p className="type-body text-text-secondary">لا جلسات مباشرة في الكورس المسجَّل — الأسئلة تصلك هنا وترد عليها في وقتك.</p>
      <ButtonLink href="/messages" fullWidth disabled={pending === 0}>
        {pending === 0 ? "لا أسئلة بانتظار ردك" : pending === 1 ? "ردّ على سؤال واحد" : pending === 2 ? "ردّ على سؤالين" : `ردّ على ${toArabicDigits(pending)} أسئلة`}
      </ButtonLink>
    </OpsCard>
  );
}

function buyerCaption(b: BuyerRow, modules: number) {
  if (b.completed) return b.certificateIssued ? "أكمل · صدرت شهادته" : "أكمل الكورس";
  if (b.stalledDays !== null) return `متوقف منذ ${toArabicDigits(b.stalledDays)} يومًا`;
  if (b.moduleIndex && modules) return `الفصل ${toArabicDigits(b.moduleIndex)} من ${toArabicDigits(modules)}`;
  return "لم يبدأ بعد";
}

export function BuyersCard({ buyers, modules, courseId }: { buyers: BuyerRow[]; modules: number; courseId: string }) {
  const stalled = buyers.filter((b) => b.stalledDays !== null);
  const longest = stalled.reduce((m, b) => Math.max(m, b.stalledDays ?? 0), 0);
  return (
    <OpsCard
      title="المشترون وتقدّمهم"
      titleId="buyers-title"
      titleSize="h2"
      className="gap-[18px] sm:p-[26px]"
      aside={<TagPill icon={Users}>{buyers.length === 1 ? "مشترٍ واحد" : `${toArabicDigits(buyers.length)} مشتريًا`}</TagPill>}
    >
      <p className="type-body text-text-muted">لا تتطلب الدورة المسجَّلة رصد حضور. تظهر النتائج من الاختبارات والواجبات عند استخدامها.</p>
      {buyers.length === 0 ? (
        <EmptyState icon={Users} title="لا مشترين بعد" description="يظهر المشترون هنا فور إتمام الدفع." />
      ) : (
        <ul className="flex flex-col gap-[18px]">
          {buyers.map((b) => {
            const tone: OpsTone = b.completed ? "success" : b.stalledDays !== null ? "warning" : "brand";
            return (
              <li key={b.enrollmentId} className={`flex flex-wrap items-center gap-4 rounded-16 px-[18px] py-4 ${b.stalledDays !== null ? "bg-state-warning-bg" : "bg-bg-page"}`}>
                <div className="flex min-w-0 flex-1 basis-56 items-center gap-3">
                  <Avatar name={b.name} />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <p className="truncate type-title text-text-primary">{b.name}</p>
                    <p className="type-body text-text-muted">اشترى {formatRelative(b.boughtAt)}</p>
                  </div>
                </div>
                <div className={`flex w-[150px] flex-col gap-1 text-center ${toneText[tone]}`}>
                  <p className="type-h3"><Pct value={b.percent} /></p>
                  <p className="type-caption">{buyerCaption(b, modules)}</p>
                </div>
                <BroadcastDialog iconOnly courseId={courseId} audience="selected" trainees={[b.traineeId]} recipientsLabel={b.name} title={`رسالة إلى ${b.name}`} label={`راسل ${b.name}`} />
              </li>
            );
          })}
        </ul>
      )}
      {stalled.length > 0 && (
        <div className="flex items-start gap-3 rounded-16 bg-state-warning-bg px-4 pt-3.5 pb-4 text-state-warning">
          <Glyph icon={Lightbulb} size={20} className="mt-1" />
          <p className="min-w-0 flex-1 type-body-lg">
            {stalled.length === 1 ? "متدرب متوقف" : `${toArabicDigits(stalled.length)} متدربين متوقفون`} منذ {toArabicDigits(longest)} يومًا. رسالة تشجيعية واحدة ترفع معدل الإكمال كثيرًا — والإكمال يرفع تقييمك.
          </p>
        </div>
      )}
    </OpsCard>
  );
}

export const moneyWhole = (n: number) => formatNumber(Math.round(n));
