import type { ReactNode } from "react";
import {
  Building2,
  CalendarDays,
  Circle,
  CircleCheck,
  CircleDot,
  CircleX,
  Clock,
  FileSpreadsheet,
  FileText,
  Gauge,
  Hourglass,
  Info,
  Lock,
  MapPin,
  MonitorPlay,
  Play,
  Presentation,
  RefreshCw,
  Timer,
  User,
} from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { Glyph } from "@/components/ui/Icon";
import { ModeBadge } from "@/components/course/CourseCover";
import { formatDate, formatDayMonth, formatDuration, formatPrice, formatRelative, formatTime, toArabicDigits } from "@/lib/format";
import { PAYMENT_METHOD_LABEL } from "@/lib/trainings";
import type { EnrollmentDetail, SessionView } from "@/lib/data/trainings";
import { Chip, InfoRow, LabeledProgress, PathStep, ProgressRing, SectionCard, numberWord } from "./ui";

export const learnHref = (d: EnrollmentDetail, lessonId?: string | null) => `/trainee/learn/${d.id}${lessonId ? `?lesson=${lessonId}` : ""}`;
export const messagesHref = (d: EnrollmentDetail) => `/messages?course=${d.course.id}`;

function dateRange(d: EnrollmentDetail) {
  const { startsAt, endsAt } = d.course;
  if (!startsAt) return "—";
  if (!endsAt) return formatDayMonth(startsAt);
  return `${formatDayMonth(startsAt)} – ${formatDayMonth(endsAt)}`;
}

/* ─────────────── Hero (166:6206 · 188:9808) ─────────────── */

export function DetailHero({ d, cancelled = false }: { d: EnrollmentDetail; cancelled?: boolean }) {
  const recorded = d.course.mode === "recorded";
  const running = !recorded && (d.status === "in_progress" || (d.status === "confirmed" && !!d.course.startsAt && new Date(d.course.startsAt) <= new Date()));
  const percent = recorded ? (d.lessonsTotal ? (d.lessonsDone / d.lessonsTotal) * 100 : 0) : d.counts.percent;
  const next = d.nextSession;

  let summary: string;
  if (recorded) {
    const done = d.modules.filter((m) => m.state === "completed").length;
    summary = `أنجزت ${numberWord(done, ["صفر فصول", "فصلًا واحدًا", "فصلين", "فصول", "فصلًا"])} من ${toArabicDigits(d.modules.length)}`;
    if (d.lastLesson) summary += ` · آخر توقف: الفصل ${toArabicDigits(d.lastLesson.module)} — الدرس ${toArabicDigits(d.lastLesson.lesson)}`;
    summary += d.lessonsDone === d.lessonsTotal && d.lessonsTotal > 0 ? " · أكملت كل الدروس." : ".";
  } else {
    summary = `حضرت ${numberWord(d.counts.attended, ["صفر جلسات", "جلسة واحدة", "جلستين", "جلسات", "جلسة"])} من ${toArabicDigits(d.counts.total)}`;
    if (next && !cancelled) summary += ` · الجلسة القادمة ${next.day} ${formatTime(next.startsAt)}${next.location ? ` في ${next.location}` : ""}.`;
    else summary += ".";
  }

  return (
    <section aria-labelledby="course-title" className="flex flex-col gap-6 rounded-22 bg-bg-brand-tint px-5 py-6 sm:px-7 sm:py-[26px] md:flex-row md:items-center">
      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          {cancelled ? (
            <Chip tone="error" icon={CircleX}>
              ملغاة
            </Chip>
          ) : running ? (
            <Chip tone="warning" icon={Timer}>
              جارية الآن
            </Chip>
          ) : null}
          {recorded ? (
            <>
              <Chip tone="surface" icon={RefreshCw} className="text-text-brand">
                وصول مدى الحياة
              </Chip>
            </>
          ) : (
            <ModeBadge mode={d.course.mode} />
          )}
          {["confirmed", "in_progress", "completed"].includes(d.status) || cancelled ? (
            <Chip tone={recorded ? "surface" : "success"} icon={CircleCheck} className={recorded ? "text-state-success" : ""}>
              تسجيل مؤكَّد
            </Chip>
          ) : (
            <Chip tone="neutral">{d.statusLabel}</Chip>
          )}
          {recorded && <ModeBadge mode="recorded" className="ms-auto" />}
        </div>
        <h2 id="course-title" className="text-[28px] font-bold leading-[1.2] text-text-primary sm:text-[36px]">
          {d.course.title}
        </h2>
        <p className="type-body-lg text-text-secondary">{summary}</p>
        {!cancelled && (
          <div className="flex flex-wrap items-center gap-3">
            {recorded ? (
              <>
                {["confirmed", "in_progress", "completed"].includes(d.status) && (
                  <ButtonLink href={learnHref(d, d.resumeLessonId)} size="l">
                    {d.lessonsDone > 0 ? "تابع من حيث توقفت" : "ابدأ التعلّم"}
                  </ButtonLink>
                )}
                {d.files.length > 0 && (
                  <ButtonLink href="#materials" size="l" variant="outline">
                    المواد المرفقة
                  </ButtonLink>
                )}
              </>
            ) : (
              <>
                <ButtonLink href={messagesHref(d)} size="l">
                  تواصل مع {d.course.provider ? "الجهة التدريبية" : "المدرب"}
                </ButtonLink>
                {d.sessions.length > 0 && (
                  <a
                    href={`/trainee/trainings/${d.id}/calendar`}
                    download
                    className="inline-flex h-14 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-12 px-8 type-body-lg text-text-primary inner-stroke istroke-w-[1.5px] istroke-c-border-default hover:bg-bg-brand-tint focus-ring"
                  >
                    أضف الجدول للتقويم
                  </a>
                )}
              </>
            )}
          </div>
        )}
      </div>
      <ProgressRing percent={percent} label={recorded ? "نسبة إكمال الدروس" : "نسبة الحضور"} />
    </section>
  );
}

/* ─────────────── Aside cards (166:6238) ─────────────── */

export function RegistrationInfoCard({ d }: { d: EnrollmentDetail }) {
  const first = d.sessions.find((s) => s.state !== "cancelled");
  if (d.course.mode === "recorded") {
    return (
      <SectionCard title="معلومات الدورة" id="info-title">
        <dl className="flex flex-col gap-4">
          {d.course.trainer && <InfoRow icon={User} label="المدرب" value={d.course.trainer} />}
          {d.course.provider && <InfoRow icon={Building2} label="جهة التدريب" value={d.course.provider} />}
          <InfoRow icon={MonitorPlay} label="النمط" value="مسجَّلة · وصول دائم" />
          <InfoRow
            icon={Clock}
            label="المدة"
            value={`${formatDuration(d.modules.reduce((t, m) => t + m.seconds, 0))} · ${numberWord(d.modules.length, ["بلا فصول", "فصل واحد", "فصلان", "فصول", "فصلًا"])}`}
          />
          <InfoRow icon={CalendarDays} label="سجّلت في" value={formatDate(d.confirmedAt ?? d.createdAt)} />
          {d.course.level && <InfoRow icon={Gauge} label="المستوى" value={d.course.level} />}
          <RefRow value={d.ref} />
        </dl>
      </SectionCard>
    );
  }
  return (
    <SectionCard title="معلومات التسجيل" id="info-title">
      <dl className="flex flex-col gap-4">
        <InfoRow icon={Building2} label={d.course.provider ? "الجهة التدريبية" : "مقدّم الدورة"} value={d.course.provider ?? d.course.trainer} />
        {d.course.mode === "in_person" ? (
          <>
            {d.course.city && <InfoRow icon={MapPin} label="الفرع" value={d.course.city} />}
            {d.course.venue && <InfoRow icon={Presentation} label="القاعة" value={d.course.venue} />}
          </>
        ) : (
          <InfoRow icon={MonitorPlay} label="المنصة" value="جلسات مباشرة عبر المنصة" />
        )}
        {d.course.trainer && <InfoRow icon={User} label="المدرب" value={d.course.trainer} />}
        <InfoRow icon={CalendarDays} label="من – إلى" value={dateRange(d)} />
        {first && <InfoRow icon={Clock} label="التوقيت" value={`${formatTime(first.startsAt)} – ${formatTime(first.endsAt)}`} />}
        <RefRow value={d.ref} />
      </dl>
    </SectionCard>
  );
}

function RefRow({ value }: { value: string }) {
  return (
    <div className="flex items-center gap-2.5 type-caption text-text-muted">
      <dt className="flex-1">رقم التسجيل</dt>
      <dd dir="ltr" className="font-mono text-[14px]">
        {value}
      </dd>
    </div>
  );
}

export function AttendanceCard({ d }: { d: EnrollmentDetail }) {
  const c = d.counts;
  return (
    <SectionCard title="سجل حضورك" id="attendance-title">
      <LabeledProgress label={`الجلسات الحاضرة · ${toArabicDigits(c.attended)} من ${toArabicDigits(c.total)}`} percent={c.percent} />
      <dl className="grid grid-cols-3 gap-3 text-center">
        <div className="flex flex-col gap-0.5 rounded-8 bg-bg-page py-3">
          <dd className="order-1 type-h3 text-state-success">{toArabicDigits(c.attended)}</dd>
          <dt className="order-2 type-caption text-text-muted">حاضر</dt>
        </div>
        <div className="flex flex-col gap-0.5 rounded-8 bg-bg-page py-3">
          <dd className="order-1 type-h3 text-state-error">{toArabicDigits(c.absent)}</dd>
          <dt className="order-2 type-caption text-text-muted">غائب</dt>
        </div>
        <div className="flex flex-col gap-0.5 rounded-8 bg-bg-page py-3 text-text-muted">
          <dd className="order-1 type-h3">{toArabicDigits(c.notStarted)}</dd>
          <dt className="order-2 type-caption">لم تبدأ</dt>
        </div>
      </dl>
      <p className="type-caption text-text-muted">اجتياز الدورة يتطلب حضور ٧٥٪ من الجلسات على الأقل.</p>
    </SectionCard>
  );
}

export function ActionsCard({ d }: { d: EnrollmentDetail }) {
  const recorded = d.course.mode === "recorded";
  const refundable = d.isPaid && (recorded ? ["confirmed", "in_progress", "completed"].includes(d.status) : false);
  return (
    <SectionCard title="إجراءات" id="actions-title">
      <ButtonLink href={messagesHref(d)} variant="secondary" fullWidth>
        {recorded ? "اسأل المدرب" : `تواصل مع ${d.course.provider ? "الجهة" : "المدرب"}`}
      </ButtonLink>
      {d.receiptId && (
        <ButtonLink href={`/trainee/receipts/${d.receiptId}`} variant="outline" fullWidth>
          اعرض الإيصال
        </ButtonLink>
      )}
      {d.openRefund ? (
        <ButtonLink href={`/trainee/refunds/${d.openRefund.id}`} variant="text" fullWidth>
          تابع طلب الاسترداد
        </ButtonLink>
      ) : recorded ? (
        refundable && (
          <ButtonLink href={`/trainee/trainings/${d.id}/refund`} variant="text" fullWidth>
            طلب استرداد
          </ButtonLink>
        )
      ) : (
        d.canWithdraw && (
          <ButtonLink href={`/trainee/trainings/${d.id}/withdraw`} variant="text" fullWidth>
            {d.isPaid ? "طلب انسحاب واسترداد" : "الانسحاب من الدورة"}
          </ButtonLink>
        )
      )}
      <p className="flex items-center gap-2 type-caption text-text-muted">
        <Glyph icon={Info} size={16} />
        <span className="flex-1">
          {recorded ? "الاسترداد متاح كاملًا خلال ١٤ يومًا من الشراء." : "الانسحاب بعد بدء الدورة يخضع لشرائح الاسترداد المعلنة."}
        </span>
      </p>
    </SectionCard>
  );
}

/* ─────────────── Schedule (166:6239) ─────────────── */

const SESSION_CHIP: Record<SessionView["state"], { label: string; tone: "success" | "surface" | "error" | "neutral"; icon: typeof CircleCheck }> = {
  attended: { label: "حاضر", tone: "success", icon: CircleCheck },
  today: { label: "اليوم", tone: "surface", icon: Timer },
  absent: { label: "غائب", tone: "error", icon: CircleX },
  upcoming: { label: "لم تبدأ", tone: "neutral", icon: Clock },
  cancelled: { label: "ملغاة", tone: "neutral", icon: CircleX },
};

export function ScheduleCard({ d }: { d: EnrollmentDetail }) {
  return (
    <SectionCard
      title="الجدول الزمني"
      id="schedule-title"
      aside={
        <Chip tone="brand" icon={CalendarDays}>
          {numberWord(d.sessions.length, ["بلا جلسات", "جلسة واحدة", "جلستان", "جلسات", "جلسة"])}
        </Chip>
      }
    >
      {d.sessions.length === 0 ? (
        <p className="rounded-12 bg-bg-page px-4 py-6 text-center type-small text-text-muted">لم تُعلن الجهة مواعيد الجلسات بعد — سنُشعرك فور نشرها.</p>
      ) : (
        <ol className="flex flex-col gap-4">
          {d.sessions.map((s) => {
            const chip = SESSION_CHIP[s.state];
            const today = s.state === "today";
            return (
              <li
                key={s.id}
                aria-current={today ? "date" : undefined}
                className={`flex items-center gap-4 rounded-12 px-4 py-3.5 ${today ? "border-[1.5px] border-state-warning bg-state-warning-bg" : "bg-bg-page"}`}
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-8 border border-border-default bg-bg-surface type-subtitle text-text-secondary">
                  {toArabicDigits(s.position)}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                  <span className={`type-subtitle ${s.state === "cancelled" ? "text-text-muted line-through" : "text-text-primary"}`}>{s.title}</span>
                  <span className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 type-caption text-text-secondary">
                    {s.location && (
                      <span className="flex items-center gap-[5px]">
                        <Glyph icon={MapPin} size={16} />
                        {s.location}
                      </span>
                    )}
                    <span className="flex items-center gap-[5px]">
                      <Glyph icon={Clock} size={16} />
                      {s.time}
                    </span>
                    <span className="flex items-center gap-[5px]">
                      <Glyph icon={CalendarDays} size={16} />
                      {s.day}
                    </span>
                  </span>
                </div>
                <Chip tone={chip.tone} icon={chip.icon} className={today ? "text-state-warning" : ""}>
                  {chip.label}
                </Chip>
              </li>
            );
          })}
        </ol>
      )}
      <p className="type-caption text-text-muted">
        {d.course.mode === "live_remote"
          ? "يُسجَّل حضورك تلقائيًا عند دخولك الجلسة المباشرة. إن وجدت خطأ في حضورك تواصل مع المدرب خلال ٤٨ ساعة."
          : "يرصد الحضور منسّق الجهة التدريبية بعد كل جلسة. إن وجدت خطأ في حضورك تواصل مع الجهة خلال ٤٨ ساعة."}
      </p>
    </SectionCard>
  );
}

/* ─────────────── Materials (166:6450 · 188:10008) ─────────────── */

export function MaterialsCard({ d, compact = false }: { d: EnrollmentDetail; compact?: boolean }) {
  if (d.files.length === 0) return null;
  return (
    <section id="materials" aria-labelledby="materials-title" className="flex w-full scroll-mt-24 flex-col gap-4 rounded-16 border border-border-default bg-bg-card p-6 shadow-card">
      <h2 id="materials-title" className="type-h3 text-text-primary">
        {compact ? "المواد المرفقة" : "الملفات المرفقة"}
      </h2>
      <ul className="flex flex-col gap-4">
        {d.files.map((f) => {
          const sheet = ["xlsx", "xls", "csv"].includes(f.ext);
          return (
            <li key={f.id} className="flex items-center gap-3 rounded-12 bg-bg-page px-3.5 py-3">
              <span className={`flex size-10 shrink-0 items-center justify-center rounded-8 bg-bg-surface ${sheet ? "text-state-success" : "text-state-error"}`}>
                <Glyph icon={sheet ? FileSpreadsheet : FileText} size={20} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="type-subtitle text-text-primary">{f.title}</span>
                <span className="type-caption uppercase text-text-muted">{f.ext || "ملف"}</span>
              </span>
              {f.url ? (
                <a href={f.url} download className="inline-flex h-11 w-[120px] shrink-0 items-center justify-center rounded-12 border-[1.5px] border-border-default type-small text-text-primary hover:bg-bg-brand-tint focus-ring">
                  تنزيل
                </a>
              ) : (
                <ButtonLink href={learnHref(d, f.id)} variant="outline" size="s" className="w-[120px]">
                  افتح
                </ButtonLink>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ─────────────── Recorded modules (188:9845) ─────────────── */

export function ModulesCard({ d }: { d: EnrollmentDetail }) {
  const done = d.modules.filter((m) => m.state === "completed").length;
  const canLearn = ["confirmed", "in_progress", "completed"].includes(d.status);
  return (
    <SectionCard
      title="فصول الدورة"
      id="modules-title"
      aside={
        <Chip tone="brand" icon={CircleCheck}>
          {toArabicDigits(done)} من {toArabicDigits(d.modules.length)} مكتملة
        </Chip>
      }
    >
      <ol className="flex flex-col gap-4">
        {d.modules.map((m) => {
          const current = m.state === "current";
          const completed = m.state === "completed";
          const tone = completed ? "bg-state-success-bg text-state-success" : current ? "bg-state-warning-bg text-state-warning" : "bg-bg-disabled text-text-muted";
          const extra = completed ? "أنجزت كل الدروس" : current ? `الدرس ${toArabicDigits(Math.min(m.done + 1, m.lessons))} من ${toArabicDigits(m.lessons)}` : "لم تبدأ بعد";
          return (
            <li
              key={m.id}
              aria-current={current ? "step" : undefined}
              className={`flex items-center gap-3.5 rounded-12 px-4 py-3.5 ${current ? "border-[1.5px] border-state-warning bg-state-warning-bg" : "bg-bg-page"}`}
            >
              <span className={`flex size-11 shrink-0 items-center justify-center rounded-8 type-title ${tone}`}>{toArabicDigits(m.position)}</span>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className={`min-w-0 flex-1 type-subtitle ${completed || current ? "text-text-primary" : "text-text-muted"}`}>{m.title}</span>
                  {completed ? (
                    <Chip tone="success" icon={CircleCheck}>
                      مكتمل
                    </Chip>
                  ) : current ? (
                    <Chip tone="warning" icon={Play}>
                      جارٍ الآن
                    </Chip>
                  ) : (
                    <Chip tone="neutral" icon={Circle}>
                      لم يبدأ
                    </Chip>
                  )}
                </div>
                <span className="type-caption text-text-muted">
                  {numberWord(m.lessons, ["بلا دروس", "درس واحد", "درسان", "دروس", "درسًا"])} · {formatDuration(m.seconds)} · {extra}
                </span>
              </div>
              {canLearn ? (
                <ButtonLink href={learnHref(d, completed ? m.firstLessonId : m.resumeLessonId)} variant={current ? "primary" : "ghost"} size="s" className="w-[120px]">
                  {completed ? "راجع" : current ? "تابع" : "ابدأ"}
                </ButtonLink>
              ) : (
                <span className="inline-flex h-11 w-[120px] shrink-0 items-center justify-center gap-1.5 rounded-12 bg-bg-disabled type-small text-text-disabled">
                  <Glyph icon={Lock} size={16} />
                  مقفل
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </SectionCard>
  );
}

export function CertificateProgressCard({ d }: { d: EnrollmentDetail }) {
  const percent = d.lessonsTotal ? (d.lessonsDone / d.lessonsTotal) * 100 : 0;
  const complete = d.status === "completed";
  return (
    <SectionCard
      title={d.hasQuiz ? "الاختبار النهائي والشهادة" : "شهادة الإتمام"}
      id="certificate-title"
      aside={
        <Chip tone={complete ? "success" : "neutral"} icon={complete ? CircleCheck : Lock}>
          {complete ? "صدرت شهادتك" : "تُصدر عند ١٠٠٪"}
        </Chip>
      }
    >
      <p className="type-body text-text-secondary">
        {complete
          ? "أكملت الدورة وصدرت شهادتك برابط تحقق عام — تجدها في صفحة «الشهادات»."
          : `أكمل ${d.hasQuiz ? "جميع الدروس والاختبارات" : "جميع الدروس"} لتصدر شهادتك تلقائيًا برابط تحقق عام. مشاهدة الدرس حتى نهايته تسجّله مكتملًا.`}
      </p>
      <LabeledProgress label="التقدّم نحو إصدار الشهادة" percent={percent} />
    </SectionCard>
  );
}

/* ─────────────── Pending provider (167:6779) ─────────────── */

export function PendingProviderHero({ d }: { d: EnrollmentDetail }) {
  return (
    <section aria-labelledby="pending-title" className="flex flex-col-reverse gap-6 rounded-22 bg-state-warning-bg px-5 py-6 sm:px-7 sm:py-[26px] md:flex-row md:items-center">
      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <ModeBadge mode={d.course.mode} />
          <Chip tone="surface" icon={Hourglass} className="text-state-warning">
            بانتظار التأكيد
          </Chip>
        </div>
        <h2 id="pending-title" className="type-h2 text-text-primary">
          {d.isPaid ? "دُفع المبلغ — بانتظار تأكيد الجهة للمقعد" : "طلبك بانتظار تأكيد الجهة للمقعد"}
        </h2>
        <p className="type-body-lg text-text-secondary">
          {d.course.mode === "in_person" ? "الدورات الحضورية" : "هذه الدورة"} تتطلب تأكيد الجهة التدريبية لتوفّر المقعد والقاعة.
          {d.isPaid ? " لم يُخصم شيء إضافي، وإن تعذّر التأكيد يُسترد المبلغ كاملًا تلقائيًا خلال ٣ أيام عمل." : " الدورة مجانية فلن يُخصم أي مبلغ."}
        </p>
      </div>
      <span className="flex size-[72px] shrink-0 items-center justify-center self-start rounded-full bg-bg-surface text-state-warning md:self-center">
        <Glyph icon={Hourglass} size={32} />
      </span>
    </section>
  );
}

export function RequestPathCard({ d }: { d: EnrollmentDetail }) {
  return (
    <SectionCard title="مسار طلبك" id="path-title">
      <ol className="flex flex-col gap-4">
        <PathStep
          icon={CircleCheck}
          state="done"
          title={d.isPaid ? "تم الدفع" : "قُدّم الطلب"}
          caption={
            d.payment
              ? `${formatPrice(d.payment.amount, d.currency)} · ${PAYMENT_METHOD_LABEL[d.payment.method] ?? d.payment.method} · ${formatRelative(d.payment.createdAt)}`
              : formatRelative(d.createdAt)
          }
        />
        <PathStep icon={Hourglass} state="current" title="بانتظار تأكيد الجهة" caption={`${d.course.provider ?? d.course.trainer} · متوقع خلال ٢٤ ساعة عمل`} />
        <PathStep icon={CircleDot} state="todo" title="تفعيل المقعد" caption="يظهر الجدول وسجل الحضور فور التأكيد" />
        <PathStep icon={CalendarDays} state="todo" title="بدء الدورة" caption={d.course.startsAt ? `${formatDate(d.course.startsAt)} · ${formatTime(d.course.startsAt)}` : "يُعلن لاحقًا"} />
      </ol>
    </SectionCard>
  );
}

export function WhatIfProviderCard({ d, children }: { d: EnrollmentDetail; children?: ReactNode }) {
  return (
    <SectionCard title="ماذا لو لم تؤكّد الجهة؟" id="whatif-title">
      <p className="type-body text-text-secondary">
        إن مرّت ٢٤ ساعة عمل دون رد، يُلغى الطلب تلقائيًا{d.isPaid ? " ويُسترد المبلغ كاملًا خلال ٣ أيام عمل" : ""} — دون أي إجراء منك.
      </p>
      <ButtonLink href={messagesHref(d)} variant="secondary" fullWidth>
        تواصل مع الجهة
      </ButtonLink>
      {children}
    </SectionCard>
  );
}
