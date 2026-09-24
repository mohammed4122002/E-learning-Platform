import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { CircleCheck, CircleHelp, Clock, ClipboardCheck, Lock, Shield } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { Glyph } from "@/components/ui/Icon";
import { formatDayMonth, formatTime, toArabicDigits } from "@/lib/format";
import type { AttendanceOverview, SessionSummary } from "@/lib/data/trainer-attendance";
import { RingGauge, TagPill, toneText, type OpsTone } from "./parts";

/* TRR-CRS-05 · ٦ الحضور (436:20264) — blocks of the attendance tab and the register side columns. */

const weekday = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-arab", { weekday: "long", timeZone: "Asia/Riyadh" });
export const sessionDay = (iso: string) => `${weekday.format(new Date(iso))} ${formatDayMonth(iso)}`;
export const hoursLeft = (iso: string) => Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 3_600_000));
export const hoursWord = (h: number) => (h === 1 ? "ساعة واحدة" : h === 2 ? "ساعتان" : h <= 10 ? `${toArabicDigits(h)} ساعات` : `${toArabicDigits(h)} ساعة`);

/** Session to record now (436:20470): error tint + 2px border, r22, 56px white tile, H2 title, 18 error line, 56px CTA. */
export function PendingSessionCard({ s, href }: { s: SessionSummary; href: string }) {
  return (
    <section className="flex w-full flex-col items-start gap-4 rounded-22 border-2 border-state-error bg-state-error-bg px-6 pt-[22px] pb-6 sm:flex-row sm:items-center">
      <span className="flex size-14 shrink-0 items-center justify-center rounded-16 bg-bg-surface text-state-error">
        <Glyph icon={ClipboardCheck} size={20} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-[5px]">
        <h2 className="type-h2 text-text-primary">
          الجلسة {toArabicDigits(s.position)} · {s.title}
        </h2>
        <p className="type-body-lg text-state-error">
          {sessionDay(s.startsAt)} · {formatTime(s.startsAt)} – {formatTime(s.endsAt)} · لم يُرصد الحضور بعد
        </p>
      </div>
      <ButtonLink href={href} size="l" className="w-full sm:w-[183px]">
        ابدأ رصد الحضور
      </ButtonLink>
    </section>
  );
}

function sessionState(s: SessionSummary): { tone: OpsTone; value: string; caption: string } {
  if (s.approved) {
    const ratio = s.roster ? s.attended / s.roster : 0;
    return { tone: ratio >= 0.9 ? "success" : "warning", value: `${toArabicDigits(s.attended)} من ${toArabicDigits(s.roster)}`, caption: "مرصود" };
  }
  if (s.locked) return { tone: "error", value: "لم يُرصد", caption: "أُقفل الرصد" };
  if (!s.started) return { tone: "neutral", value: "قادمة", caption: formatTime(s.startsAt) };
  return { tone: "error", value: "لم يُرصد", caption: "بانتظارك" };
}

/** Session row (436:20496/20508): r16 px18 py16, 48px white number tile, 19 Bold + 17 muted date, status block, lock pill or CTA. */
export function SessionLogRow({ s, href }: { s: SessionSummary; href: string }) {
  const st = sessionState(s);
  const actionable = s.started && !s.approved && !s.locked;
  return (
    <li className={`flex w-full flex-wrap items-center gap-4 rounded-16 px-[18px] pt-4 pb-[18px] ${actionable ? "bg-state-error-bg" : "bg-bg-page"}`}>
      <span className="flex size-12 shrink-0 items-center justify-center rounded-12 bg-bg-surface type-h3 text-text-brand">{toArabicDigits(s.position)}</span>
      <Link href={href} className="flex min-w-0 flex-1 basis-40 flex-col gap-1 rounded-8 focus-ring">
        <span className="type-title text-text-primary">{s.title}</span>
        <span className="type-body text-text-muted">{sessionDay(s.startsAt)}</span>
      </Link>
      <div className={`flex w-[134px] flex-col gap-[3px] sm:w-[170px] ${toneText[st.tone]}`}>
        <span className="type-h3">{st.value}</span>
        <span className="type-caption">{st.caption}</span>
      </div>
      {actionable ? (
        <ButtonLink href={href} size="s" className="w-[120px]">
          ارصد
        </ButtonLink>
      ) : s.locked ? (
        <span className="inline-flex shrink-0 items-center gap-[7px] rounded-full bg-bg-disabled px-[11px] py-1.5 type-caption text-text-muted">
          <Glyph icon={Lock} size={16} />
          مقفل
        </span>
      ) : null}
    </li>
  );
}

/** «متوسط الحضور» (436:20564): r22 p28, ring 110 centred, 17 muted caption. */
export function AverageCard({ o }: { o: AttendanceOverview }) {
  return (
    <section aria-labelledby="avg-title" className="flex w-full flex-col gap-5 rounded-22 border border-border-default bg-bg-card p-5 shadow-card sm:p-7">
      <h2 id="avg-title" className="type-h3 text-text-primary">
        متوسط الحضور
      </h2>
      <div className="flex justify-center">
        <RingGauge percent={o.averagePercent ?? 0} size={110} label="متوسط الحضور" />
      </div>
      <p className="text-center type-body text-text-muted">
        {o.averagePercent === null
          ? "لم تنتهِ أي جلسة بعد."
          : `${toArabicDigits(o.aboveThreshold)} من ${toArabicDigits(o.enrolled)} ${o.enrolled > 10 ? "متدربًا" : "متدربين"} فوق حد الاجتياز ٧٥٪.`}
      </p>
    </section>
  );
}

function RuleLine({ icon, tone, children }: { icon: LucideIcon; tone: OpsTone; children: string }) {
  return (
    <li className="flex items-center gap-3 rounded-12 bg-bg-page px-3.5 py-3">
      <Glyph icon={icon} size={20} className={toneText[tone]} />
      <span className="min-w-0 flex-1 type-body text-text-primary">{children}</span>
    </li>
  );
}

/** «قاعدة الرصد» (436:20570): r22 p28, rows bg/page r12 px14 py12, 17 text + 20 icon. */
export function RulesCard() {
  return (
    <section aria-labelledby="rules-title" className="flex w-full flex-col gap-5 rounded-22 border border-border-default bg-bg-card p-5 shadow-card sm:p-7">
      <h2 id="rules-title" className="type-h3 text-text-primary">
        قاعدة الرصد
      </h2>
      <ul className="flex flex-col gap-5">
        <RuleLine icon={Clock} tone="warning">
          يُقفل بعد ٤٨ ساعة من الجلسة
        </RuleLine>
        <RuleLine icon={Lock} tone="error">
          لا تعديل بعد الإقفال
        </RuleLine>
        <RuleLine icon={CircleHelp} tone="brand">
          للتصحيح بعد الإقفال راسل الدعم
        </RuleLine>
        <RuleLine icon={CircleCheck} tone="success">
          حد الاجتياز ٧٥٪ من الجلسات
        </RuleLine>
      </ul>
    </section>
  );
}

export function SessionLogCard({ o, courseId }: { o: AttendanceOverview; courseId: string }) {
  const started = [...o.sessions].filter((s) => s.started).reverse();
  const upcoming = o.sessions.filter((s) => !s.started);
  const list = [...started, ...upcoming];
  const endedCount = o.sessions.filter((s) => s.started).length;
  return (
    <section aria-labelledby="log-title" className="flex w-full flex-col gap-5 rounded-22 border border-border-default bg-bg-card p-5 shadow-card sm:p-7">
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="log-title" className="min-w-0 flex-1 type-h2 text-text-primary">
          سجل الجلسات
        </h2>
        <TagPill icon={CircleCheck} tone="success">
          {toArabicDigits(o.recorded)} مرصودة من {toArabicDigits(endedCount)}
        </TagPill>
        <ButtonLink href={`/trainer/courses/${courseId}/attendance/export`} variant="outline" prefetch={false} className="w-[146px] px-3">
          صدّر كشف الحضور
        </ButtonLink>
      </div>
      {list.length === 0 ? (
        <p className="type-small text-text-muted">لا جلسات مجدولة لهذه الدورة.</p>
      ) : (
        <ul className="flex flex-col gap-5">
          {list.map((s) => (
            <SessionLogRow key={s.id} s={s} href={`/trainer/courses/${courseId}/attendance/${s.id}`} />
          ))}
        </ul>
      )}
    </section>
  );
}

/** «لماذا يُقفل الرصد؟» (463:34262). */
export function WhyLockedCard() {
  const items: { icon: LucideIcon; tone: "success" | "brand" | "info"; title: string; body: string }[] = [
    { icon: Shield, tone: "success", title: "يحمي المتدرب من تعديل متأخر", body: "سجل الحضور يدخل في الدرجة والشهادة — تعديله بعد أيام يفتح باب النزاع." },
    { icon: Clock, tone: "brand", title: "مهلة ٤٨ ساعة كافية", body: "تبدأ من انتهاء الجلسة وتنبّهك المنصة قبل انتهائها بـ١٢ ساعة." },
    { icon: CircleHelp, tone: "info", title: "التصحيح ممكن عبر الدعم", body: "إن كان هناك خطأ فعلي، اطلب فتح الرصد وسيراجعه فريق المنصة خلال يوم عمل." },
  ];
  const bg = { success: "bg-state-success-bg", brand: "bg-bg-page", info: "bg-state-info-bg" };
  return (
    <section aria-labelledby="why-title" className="flex w-full flex-col gap-5 rounded-22 border border-border-default bg-bg-card p-5 shadow-card sm:p-7">
      <h2 id="why-title" className="type-h2 text-text-primary">
        لماذا يُقفل الرصد؟
      </h2>
      <ul className="flex flex-col gap-5">
        {items.map((i) => (
          <li key={i.title} className={`flex items-start gap-3.5 rounded-16 px-5 pt-[17px] pb-[19px] ${bg[i.tone]}`}>
            <span className={`flex size-12 shrink-0 items-center justify-center rounded-12 bg-bg-surface ${toneText[i.tone]}`}>
              <Glyph icon={i.icon} size={24} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className={`type-title ${toneText[i.tone]}`}>{i.title}</span>
              <span className="type-body text-text-secondary">{i.body}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
