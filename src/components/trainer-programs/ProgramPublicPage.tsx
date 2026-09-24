import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Award,
  BadgeCheck,
  CalendarDays,
  ChevronDown,
  CircleCheck,
  CircleX,
  ClipboardCheck,
  ClipboardList,
  Clock,
  Eye,
  Film,
  Flag,
  GraduationCap,
  Hourglass,
  ImageOff,
  Layers,
  Monitor,
  Percent,
  Puzzle,
  RefreshCcw,
  Send,
  Star,
  Tag,
  TrendingUp,
  TriangleAlert,
  Users,
} from "lucide-react";
import { CopyLinkButton } from "@/components/trainer-programs/CopyLinkButton";
import { ButtonLink } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Data";
import { Glyph } from "@/components/ui/Icon";
import { RatingStars } from "@/components/ui/Rating";
import type { ProgramCourse, ProgramDetail, ProgramRatings } from "@/lib/data/trainer-programs";
import { env } from "@/lib/env";
import { formatDate, formatDayMonth, formatMonthYear, formatNumber, formatPrice, formatRating, formatRelative, pluralAr, toArabicDigits } from "@/lib/format";
import { LEVEL_LABELS } from "@/lib/labels";
import { LANGUAGE_LABELS, MISSING_FIELDS, hoursWord, lessonsWord, unitsWord, versionLabel } from "@/lib/trainer-programs";

/*
 * TRR-PRG-06 · حالة نشر البرنامج (447:23369 published · 447:23751 draft · 447:24061/4207:652 incomplete · 447:24400 under review)
 * and «معاينة ظهور البرنامج» (450:23832 · 450:24285 · 450:24600 · 450:24960): the trainee-facing program page as the trainer sees it,
 * with a state strip and trainer-only side panels. Real data only — empty parts show the gap the trainee would see.
 */

type Mode = "status" | "visibility";
type Variant = "published" | "draft" | "incomplete" | "under_review";

const MODE_WORD = { in_person: "حضوري", live_remote: "مباشر", recorded: "مسجَّل" } as const;
const MODE_ICON = { in_person: GraduationCap, live_remote: Monitor, recorded: Film } as const;

function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={`flex w-full flex-col gap-5 rounded-22 border border-border-default bg-bg-card p-5 shadow-card sm:p-[30px] ${className ?? ""}`}>{children}</section>;
}
function Pill({ icon, children, tone }: { icon: LucideIcon; children: ReactNode; tone: "success" | "brand" | "info" | "warning" | "error" | "neutral" }) {
  const cls = {
    success: "bg-state-success-bg text-state-success",
    brand: "bg-bg-brand-tint text-text-brand",
    info: "bg-state-info-bg text-state-info",
    warning: "bg-state-warning-bg text-state-warning",
    error: "bg-state-error-bg text-state-error",
    neutral: "bg-bg-disabled text-text-muted",
  }[tone];
  return (
    <span className={`inline-flex items-center gap-[7px] rounded-full px-3.5 py-[9px] text-[16px] leading-[1.5] ${cls}`}>
      <Glyph icon={icon} size={20} />
      {children}
    </span>
  );
}
function Row({ label, value, valueClass, mono }: { label: string; value: ReactNode; valueClass?: string; mono?: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-12 bg-bg-page px-3.5 py-[13px]">
      <dt className="min-w-0 flex-1 type-body text-text-secondary">{label}</dt>
      <dd dir={mono ? "ltr" : undefined} className={`text-[15px] leading-[1.6] ${mono ? "font-mono" : ""} ${valueClass ?? "text-text-primary"}`}>
        {value}
      </dd>
    </div>
  );
}
function Stat({ icon, value, label }: { icon: LucideIcon; value: string; label: string }) {
  return (
    <li className="flex items-center gap-2">
      <Glyph icon={icon} size={20} className="text-text-brand" />
      <span className="flex flex-col gap-px">
        <span className="type-title text-text-primary">{value}</span>
        <span className="type-caption text-text-muted">{label}</span>
      </span>
    </li>
  );
}

export function ProgramPublicPage({ p, mode, courses, ratings }: { p: ProgramDetail; mode: Mode; courses: ProgramCourse[]; ratings: ProgramRatings | null }) {
  const variant: Variant = p.phase === "published" || p.phase === "suspended" ? "published" : p.phase === "under_review" ? "under_review" : p.missing.length > 0 ? "incomplete" : "draft";
  const url = `${env.siteUrl}/trainee/programs/${p.slug}`;
  const displayUrl = url.replace(/^https?:\/\//, "");
  const editHref = variant === "published" ? `/trainer/programs/${p.id}/new-version` : `/trainer/programs/${p.id}/edit/basics`;
  const modesLine = p.courses.modes.map((m) => MODE_WORD[m]).join(" · ");
  const nextCourse = courses.find((c) => c.startsAt) ?? null;

  const strip = {
    published:
      mode === "status"
        ? { tone: "bg-state-success-bg text-state-success", icon: CircleCheck, title: "هذا ما يراه المتدرب والجهات الآن", body: "برنامجك منشور وصفحته متاحة للجميع عبر الرابط أدناه." }
        : { tone: "bg-state-info-bg text-state-info", icon: Eye, title: "وضع المعاينة — هذا بالضبط ما يراه المتدرب والجهات", body: "هذه صفحتك العامة الحقيقية لا نسخة منها. أي تعديل على البرنامج يظهر هنا فورًا." },
    draft:
      mode === "status"
        ? { tone: "bg-state-info-bg text-state-info", icon: Eye, title: "وضع المعاينة — البرنامج غير منشور", body: "هكذا ستظهر صفحتك بعد الاعتماد. لا يراها أحد الآن." }
        : { tone: "bg-state-warning-bg text-state-warning", icon: Eye, title: "معاينة مسودة — لا أحد يراها غيرك", body: "البرنامج لم يُرسل للاعتماد بعد. هذا شكله عند النشر." },
    incomplete: {
      tone: "bg-state-error-bg text-state-error",
      icon: mode === "status" ? CircleX : TriangleAlert,
      title: mode === "status" ? "معاينة برنامج ناقص — لا يمكن إرساله" : `${p.missing.length === 3 ? "ثلاثة شروط" : pluralAr(p.missing.length, ["شرط واحد", "شرطان", "شروط", "شرطًا"])} ${p.missing.length > 2 ? "تمنع" : "يمنع"} الإرسال للاعتماد`,
      body: mode === "status" ? `${pluralAr(p.missing.length, ["عنصر واحد ناقص يظهر", "عنصران ناقصان يظهران", "عناصر ناقصة تظهر", "عنصرًا ناقصًا يظهر"])} فراغات في صفحتك. أكملها قبل الإرسال.` : "أكملها من المحرّر — كل بند أدناه يأخذك لمكانه مباشرة.",
    },
    under_review: { tone: "bg-state-warning-bg text-state-warning", icon: Hourglass, title: "قيد مراجعة المنصة — لا تعديل الآن", body: "صفحتك مجمّدة حتى صدور القرار خلال ٣ أيام عمل." },
  }[variant];

  const statusPill =
    variant === "published" ? (
      <Pill icon={Send} tone="success">
        {mode === "visibility" ? "منشور · متاح للتسجيل" : "منشور"}
      </Pill>
    ) : variant === "under_review" ? (
      <Pill icon={Hourglass} tone="warning">
        قيد المراجعة
      </Pill>
    ) : variant === "incomplete" ? (
      <Pill icon={TriangleAlert} tone="error">
        ناقص — لا يمكن الإرسال
      </Pill>
    ) : (
      <Pill icon={ClipboardList} tone="neutral">
        {mode === "visibility" ? "مسودة · غير منشور" : "مسودة"}
      </Pill>
    );

  const includes: { icon: LucideIcon; text: string }[] = [
    { icon: Clock, text: p.hours ? `${hoursWord(p.hours)} تدريبية` : "المدة لم تُحدَّد" },
    { icon: Puzzle, text: `${unitsWord(p.units.length)} · ${lessonsWord(p.totals.lessons)}` },
    ...(p.totals.assignments ? [{ icon: ClipboardCheck, text: pluralAr(p.totals.assignments, ["واجب تطبيقي واحد", "واجبان تطبيقيان", "واجبات تطبيقية", "واجبًا تطبيقيًا"]) }] : []),
    { icon: Award, text: "شهادة إتمام قابلة للتحقق" },
    ...(modesLine ? [{ icon: Layers, text: modesLine }] : []),
  ];

  return (
    <>
      <div className={`flex items-center gap-3.5 px-4 py-4 sm:px-14 ${strip.tone}`}>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-12 bg-bg-surface">
          <Glyph icon={strip.icon} size={20} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="type-subtitle">{strip.title}</p>
          <p className="type-caption text-text-secondary">{strip.body}</p>
        </div>
      </div>

      <main id="main" className="flex flex-col-reverse gap-9 px-4 pt-8 pb-16 sm:px-8 lg:flex-row-reverse lg:items-start lg:px-14 lg:pt-11">
        {/* SIDE (400) — on the left in RTL */}
        <aside className="flex w-full shrink-0 flex-col gap-[22px] lg:w-[400px]">
          <section className="flex flex-col overflow-hidden rounded-22 border border-border-default bg-bg-card shadow-float">
            {p.cover ? (
              <div className="relative h-[225px] w-full">
                <Image src={p.cover} alt="" fill sizes="400px" className="object-cover" />
              </div>
            ) : (
              <div className="m-0 flex h-[225px] flex-col items-center justify-center gap-3 border-2 border-dashed border-state-error bg-state-error-bg/40">
                <span className="flex size-12 items-center justify-center rounded-12 bg-bg-surface text-state-error">
                  <Glyph icon={ImageOff} size={24} />
                </span>
                <span className="type-subtitle text-state-error">لا صورة غلاف</span>
              </div>
            )}
            <div className="flex flex-col gap-[18px] px-5 pt-[26px] pb-[30px] sm:px-7">
              <div className="flex flex-col gap-1">
                <p className={`text-[34px] leading-[1.2] font-bold sm:text-[42px] ${p.price === null ? "text-state-error" : "text-text-primary"}`}>{p.price === null ? "لم يُحدَّد السعر" : formatPrice(p.price)}</p>
                <p className="type-body text-text-muted">{variant === "incomplete" && mode === "visibility" ? "السعر شرط النشر" : "سعر مرجعي · يُحدَّد نهائيًا في كل دورة"}</p>
              </div>
              {variant === "published" ? (
                <>
                  <ButtonLink href={`/trainee/programs/${p.slug}/courses`} size="l" fullWidth>
                    اعرض الدورات المتاحة
                  </ButtonLink>
                  <p className={`flex items-center justify-center gap-2 rounded-12 px-3 py-2.5 type-caption ${courses.length ? "bg-state-success-bg text-state-success" : "bg-bg-page text-text-muted"}`}>
                    <Glyph icon={CalendarDays} size={16} />
                    {courses.length
                      ? `${pluralAr(courses.length, ["دورة واحدة مفتوحة", "دورتان مفتوحتان", "دورات مفتوحة", "دورة مفتوحة"])} للتسجيل${nextCourse?.startsAt ? ` · أقربها ${formatDayMonth(nextCourse.startsAt)}` : ""}`
                      : "لا دورات مفتوحة للتسجيل الآن"}
                  </p>
                </>
              ) : (
                <>
                  <span className="flex h-14 items-center justify-center rounded-12 bg-bg-disabled type-body-lg text-text-disabled">
                    {variant === "incomplete" && mode === "visibility" ? "أكمل الشروط الثلاثة" : variant === "draft" && mode === "visibility" ? "انشر البرنامج أولًا" : "سجّل في هذا البرنامج (معاينة)"}
                  </span>
                  <p className="text-center type-caption text-text-muted">الزر معطّل في المعاينة — يعمل بعد النشر</p>
                </>
              )}
              <div aria-hidden className="h-px w-full bg-border-divider" />
              <p className="text-[16px] leading-[1.5] text-text-primary">يشمل البرنامج</p>
              <ul className="flex flex-col gap-3">
                {includes.map((x) => (
                  <li key={x.text} className="flex items-center gap-2.5 type-body text-text-primary">
                    <Glyph icon={x.icon} size={20} className="text-state-success" />
                    {x.text}
                  </li>
                ))}
              </ul>
              {variant === "published" && <CopyLinkButton url={url} label="شارك البرنامج" />}
            </div>
          </section>

          {variant === "incomplete" && mode === "status" && (
            <section className="flex flex-col gap-4 rounded-22 border-2 border-state-error bg-bg-card p-6">
              <h2 className="type-h3 text-state-error">{p.missing.length === 3 ? "ثلاثة عناصر ناقصة" : `${pluralAr(p.missing.length, ["عنصر واحد ناقص", "عنصران ناقصان", "عناصر ناقصة", "عنصرًا ناقصًا"])}`}</h2>
              <p className="type-caption text-text-secondary">كل واحد يظهر فراغًا في صفحتك — اضغط لتذهب لمكانه.</p>
              <ul className="flex flex-col gap-2.5">
                {p.missing.map((m) => (
                  <li key={m}>
                    <Link href={`/trainer/programs/${p.id}/edit/${MISSING_FIELDS[m].step}`} className="flex items-center gap-3 rounded-12 border border-border-default bg-bg-surface px-3.5 py-3 focus-ring">
                      <span className="flex size-9 items-center justify-center rounded-8 bg-state-error-bg text-state-error">
                        <Glyph icon={m === "cover" ? ImageOff : m === "price" ? Percent : Flag} size={16} />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="type-small text-state-error">{MISSING_FIELDS[m].label}</span>
                        <span className="type-caption text-text-muted">الخطوة {toArabicDigits(MISSING_FIELDS[m].stepNo)}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <ButtonLink href={`/trainer/programs/${p.id}/edit/${MISSING_FIELDS[p.missing[0]].step}`} fullWidth>
                أكمل الناقص
              </ButtonLink>
            </section>
          )}

          {mode === "visibility" && variant === "published" && (
            <Card className="!p-6 !gap-4">
              <h2 className="type-h3 text-text-primary">الدورات المتاحة</h2>
              <p className="type-caption text-text-muted">البرنامج واحد — والدورات تنفيذات له بتواريخ وأنماط مختلفة.</p>
              {courses.length === 0 ? (
                <p className="rounded-12 bg-bg-page px-4 py-4 text-center type-small text-text-muted">لا دورات مفتوحة الآن.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {courses.map((c) => (
                    <li key={c.id}>
                      <Link href={`/courses/${c.slug}`} className="flex items-center gap-3 rounded-12 bg-bg-page px-3.5 py-3 focus-ring">
                        <span className="flex size-9 items-center justify-center rounded-8 bg-bg-surface text-state-success">
                          <Glyph icon={MODE_ICON[c.mode]} size={20} />
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="type-small text-text-primary">{[MODE_WORD[c.mode], c.city].filter(Boolean).join(" · ")}</span>
                          <span className="type-caption text-state-success">
                            {c.mode === "recorded" ? "متاح دائمًا · ابدأ فورًا" : `${c.startsAt ? formatDayMonth(c.startsAt) : ""}${c.endsAt ? ` – ${formatDayMonth(c.endsAt)}` : ""} · ${c.seatsLeft === null ? "متاح" : pluralAr(c.seatsLeft, ["مقعد واحد", "مقعدان", "مقاعد", "مقعدًا"])}`}
                          </span>
                        </span>
                        <Glyph icon={ChevronDown} size={16} className="rotate-90 text-text-muted" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          <Card className="!p-6 !gap-4">
            <h2 className="type-h3 text-text-primary">{mode === "visibility" ? "عن البرنامج" : "حالة البرنامج"}</h2>
            <dl className="flex flex-col gap-3">
              {mode === "visibility" ? (
                <>
                  <Row
                    label="حالة البرنامج"
                    value={variant === "published" ? "منشور · متاح للتسجيل" : variant === "under_review" ? "قيد المراجعة" : variant === "incomplete" ? "ناقص · لا يمكن الإرسال" : "مسودة · غير منشور"}
                    valueClass={variant === "published" ? "text-state-success" : variant === "incomplete" ? "text-state-error" : "text-text-primary"}
                  />
                  <Row label="رقم البرنامج" value={p.reference} mono />
                  <Row label="النسخة" value={versionLabel(p.revision)} mono />
                  <Row label="آخر تحديث" value={formatDate(p.updatedAt)} />
                  <Row label="لغة التقديم" value={LANGUAGE_LABELS[p.language] ?? p.language} />
                  <Row label="شهادة" value="قابلة للتحقق" />
                </>
              ) : variant === "published" ? (
                <>
                  <Row label="النسخة" value={versionLabel(p.revision)} mono />
                  <Row label="نُشر في" value={p.publishedAt ? formatDate(p.publishedAt) : "—"} />
                  <Row label="الدورات" value={`${toArabicDigits(p.courses.published)} نُفِّذت أو جارية · ${toArabicDigits(p.courses.open)} مفتوحة`} />
                  <Row label="الرابط" value="متاح للجميع" />
                  <div className="flex items-center gap-2.5 rounded-12 bg-bg-brand-tint px-3.5 pt-[13px] pb-3.5">
                    <span dir="ltr" className="min-w-0 flex-1 truncate font-mono text-[14px] text-text-brand">
                      {displayUrl}
                    </span>
                    <CopyLinkButton url={url} label="انسخ" compact />
                  </div>
                </>
              ) : variant === "under_review" ? (
                <>
                  <Row label="النسخة" value={versionLabel(p.revision)} mono />
                  <Row label="أُرسل في" value={p.submittedAt ? formatDate(p.submittedAt) : "—"} />
                  <Row label="القرار المتوقع" value="خلال ٣ أيام عمل" />
                  <Row label="التعديل" value="مقفل" valueClass="text-state-warning" />
                </>
              ) : (
                <>
                  <Row label="النسخة" value={`مسودة ${versionLabel(p.revision)}`} />
                  {variant === "incomplete" ? <Row label="الاكتمال" value={`${pluralAr(p.missing.length, ["عنصر ناقص", "عنصران ناقصان", "عناصر ناقصة", "عنصرًا ناقصًا"])}`} valueClass="text-state-error" /> : <Row label="آخر حفظ" value={formatRelative(p.updatedAt)} />}
                  <Row label="الدورات" value="لا يمكن إنشاؤها بعد" />
                  <Row label={variant === "incomplete" ? "الإرسال" : "الرابط"} value={variant === "incomplete" ? "معطّل" : "غير متاح"} valueClass={variant === "incomplete" ? "text-state-error" : undefined} />
                </>
              )}
            </dl>
          </Card>

          <Card className="!p-6 !gap-4">
            <h2 className="type-h3 text-text-primary">{mode === "visibility" ? "إجراءات المدرب" : "إجراءات"}</h2>
            {variant === "published" ? (
              <>
                <ButtonLink href={`/trainer/courses/new?program=${p.id}`} size="l" fullWidth>
                  أنشئ دورة من هذا البرنامج
                </ButtonLink>
                <ButtonLink href={editHref} variant="outline" size="l" fullWidth>
                  حرّر البرنامج
                </ButtonLink>
                <CopyLinkButton url={url} label="شارك الرابط" />
                <p className="type-caption text-text-secondary">{mode === "visibility" ? "أي تعديل يُنشئ نسخة جديدة ولا يمس الدورات الجارية." : "إنشاء دورة يجمّد نسخة البرنامج الحالية — تعديلك لاحقًا لن يمسّ الدورات القائمة."}</p>
              </>
            ) : variant === "under_review" ? (
              <>
                <ButtonLink href={`/trainer/programs/${p.id}/review`} size="l" fullWidth>
                  تتبّع حالة الطلب
                </ButtonLink>
                <ButtonLink href={`/trainer/programs/${p.id}/withdraw`} variant="outline" size="l" fullWidth>
                  اسحب الطلب للتعديل
                </ButtonLink>
                <ButtonLink href={editHref} size="l" fullWidth disabled>
                  حرّر البرنامج
                </ButtonLink>
                <p className="type-caption text-text-secondary">السحب يعيد البرنامج مسودة ويلغي طلب المراجعة.</p>
              </>
            ) : variant === "incomplete" ? (
              <>
                <ButtonLink href={`/trainer/programs/${p.id}/edit/${MISSING_FIELDS[p.missing[0]].step}`} size="l" fullWidth>
                  {p.missing.length === 3 ? "أكمل النواقص الثلاثة" : "أكمل النواقص"}
                </ButtonLink>
                <ButtonLink href={`/trainer/programs/${p.id}/declaration`} size="l" fullWidth disabled>
                  أرسل للاعتماد
                </ButtonLink>
                <p className="type-caption text-state-warning">الإرسال يُفعَّل بعد إكمال الشروط.</p>
              </>
            ) : (
              <>
                <ButtonLink href={`/trainer/programs/${p.id}/declaration`} size="l" fullWidth>
                  {mode === "visibility" ? "أرسل للاعتماد" : "أرسل للمراجعة"}
                </ButtonLink>
                <ButtonLink href={editHref} variant="outline" size="l" fullWidth>
                  {mode === "visibility" ? "أكمل المحرّر" : "حرّر البرنامج"}
                </ButtonLink>
                <p className="type-caption text-text-secondary">{mode === "visibility" ? "لا أحد يرى هذه الصفحة قبل النشر" : "المراجعة تستغرق ٣ أيام عمل بقرار مسبَّب."}</p>
              </>
            )}
          </Card>
        </aside>

        {/* MAIN */}
        <div className="flex min-w-0 flex-1 flex-col gap-7">
          <div className="flex flex-col gap-[18px]">
            <div className="flex flex-wrap items-center gap-2">
              {statusPill}
              {p.category && (
                <Pill icon={Tag} tone="brand">
                  {p.category.name}
                </Pill>
              )}
              <Pill icon={TrendingUp} tone={mode === "visibility" ? "warning" : "info"}>
                مستوى {LEVEL_LABELS[p.level]}
              </Pill>
            </div>
            <h1 className="text-[34px] leading-[1.15] font-bold text-text-primary sm:text-[50px]">{p.title}</h1>
            {p.summary ? <p className="text-[18px] leading-[1.75] text-text-secondary sm:text-[20px]">{p.summary}</p> : <p className="text-[20px] leading-[1.75] text-state-error">لم يُكتب وصف البرنامج بعد — يظهر هذا الفراغ للمتدرب.</p>}
            <ul className="flex flex-wrap gap-x-6 gap-y-3">
              {ratings ? <Stat icon={Star} value={formatRating(ratings.average)} label={`من ${pluralAr(ratings.count, ["تقييم واحد", "تقييمين", "تقييمات", "تقييمًا"])}`} /> : null}
              <Stat icon={Users} value={formatNumber(p.courses.learners)} label={mode === "visibility" ? "متدربًا" : "متدربًا أكملوه"} />
              {mode === "visibility" ? <Stat icon={Clock} value={p.hours ? hoursWord(p.hours) : "—"} label="مدة البرنامج" /> : <Stat icon={CalendarDays} value={toArabicDigits(p.courses.published)} label="دورات نُفِّذت" />}
              <Stat icon={RefreshCcw} value={mode === "visibility" ? `النسخة ${versionLabel(p.revision)}` : "آخر تحديث"} label={mode === "visibility" ? (variant === "published" ? `آخر تحديث ${formatMonthYear(p.updatedAt)}` : "لم يُنشر بعد") : formatMonthYear(p.updatedAt)} />
            </ul>
            <div className="flex flex-wrap items-center gap-3.5 rounded-16 border border-border-default bg-bg-surface px-5 py-[18px]">
              <Avatar name={p.trainer.name} src={p.trainer.avatar} size="l" />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="type-title text-text-primary">{p.trainer.name}</p>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                  {p.trainer.verified && (
                    <span className="inline-flex items-center gap-[7px] rounded-full bg-state-success-bg px-[11px] py-1.5 type-caption text-state-success">
                      <Glyph icon={BadgeCheck} size={16} />
                      مدرب معتمد
                    </span>
                  )}
                  <span className="type-body text-text-muted">
                    {p.trainer.rating !== null ? `${formatRating(p.trainer.rating)} من ${pluralAr(p.trainer.ratings, ["تقييم واحد", "تقييمين", "تقييمات", "تقييمًا"])} · ` : ""}
                    {formatNumber(p.trainer.learners)} متدربًا
                  </span>
                </div>
              </div>
              <ButtonLink href="/trainer/profile" variant="outline">
                ملف المدرب
              </ButtonLink>
            </div>
          </div>

          <Card>
            <h2 className="type-h2 text-text-primary">ماذا ستقدر على فعله بعد البرنامج؟</h2>
            {p.objectives.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-16 border-2 border-dashed border-state-error bg-state-error-bg px-6 py-8 text-center">
                <span className="flex size-12 items-center justify-center rounded-12 bg-bg-surface text-state-error">
                  <Glyph icon={Flag} size={20} />
                </span>
                <p className="type-subtitle text-state-error">لم تُضف أهداف تعليمية</p>
                <p className="type-caption text-text-secondary">المتدرب لن يعرف ما سيتعلمه. هذا القسم إلزامي قبل الإرسال.</p>
              </div>
            ) : (
              <ul className={`grid grid-cols-1 gap-4 ${mode === "status" ? "md:grid-cols-2" : ""}`}>
                {p.objectives.map((o) => (
                  <li key={o} className="flex items-center gap-3 rounded-16 bg-state-success-bg px-[18px] pt-4 pb-[18px]">
                    <Glyph icon={CircleCheck} size={20} className="text-state-success" />
                    <span className="type-body-lg text-text-primary">{o}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="min-w-0 flex-1 type-h2 text-text-primary">{mode === "visibility" ? "محتوى البرنامج" : "محاور البرنامج"}</h2>
              <Pill icon={Puzzle} tone="brand">
                {[unitsWord(p.units.length), lessonsWord(p.totals.lessons), p.hours ? hoursWord(p.hours) : null].filter(Boolean).join(" · ")}
              </Pill>
            </div>
            {p.units.length === 0 ? (
              <p className="rounded-16 border-[1.5px] border-dashed border-border-default px-5 py-6 text-center type-body text-text-muted">لا محاور بعد.</p>
            ) : (
              <ol className="flex flex-col gap-3.5">
                {p.units.map((u, i) => (
                  <li key={u.id}>
                    <details open={i === 0} className="group rounded-16 bg-bg-page">
                      <summary className="flex cursor-pointer list-none items-center gap-3.5 rounded-16 px-[22px] pt-5 pb-[22px] focus-ring [&::-webkit-details-marker]:hidden">
                        <span className="flex size-12 shrink-0 items-center justify-center rounded-12 bg-bg-brand-tint text-[20px] leading-[1.4] text-text-brand">{toArabicDigits(i + 1)}</span>
                        <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                          <span className="type-title text-text-primary">{u.title}</span>
                          <span className="type-body text-text-muted">{[lessonsWord(u.lessons), u.minutes ? hoursWord(Math.round((u.minutes / 60) * 10) / 10) : null].filter(Boolean).join(" · ")}</span>
                        </span>
                        <Glyph icon={ChevronDown} size={20} className="text-text-secondary transition-transform group-open:rotate-180" />
                      </summary>
                      {u.items.length > 0 && (
                        <ul className="flex flex-col gap-3 px-[22px] pb-[22px]">
                          {u.items.map((it) => (
                            <li key={it.id} className="flex items-center gap-3 rounded-12 bg-bg-surface px-4 pt-[13px] pb-3.5">
                              <span className="min-w-0 flex-1 type-body text-text-primary">{it.title}</span>
                              {it.minutes ? <span className="type-caption text-text-muted">{toArabicDigits(it.minutes)} دقيقة</span> : null}
                            </li>
                          ))}
                        </ul>
                      )}
                    </details>
                  </li>
                ))}
              </ol>
            )}
          </Card>

          <Card>
            <h2 className="type-h2 text-text-primary">{mode === "visibility" ? "المهارات والمتطلبات" : "لمن هذا البرنامج؟"}</h2>
            <div className={`grid grid-cols-1 gap-4 ${mode === "status" ? "md:grid-cols-2" : ""}`}>
              {mode === "status" && (
                <div className="flex flex-col gap-3 rounded-16 bg-bg-page px-5 pt-5 pb-[22px]">
                  <p className="flex items-center gap-2.5 type-title !font-normal text-text-primary">
                    <Glyph icon={Users} size={20} className="text-text-brand" />
                    الجمهور المستهدف
                  </p>
                  {p.audience.length ? (
                    p.audience.map((a) => (
                      <p key={a} className="flex items-center gap-2.5 type-body text-text-secondary">
                        <Glyph icon={CircleCheck} size={16} className="text-state-success" />
                        {a}
                      </p>
                    ))
                  ) : (
                    <p className="type-body text-text-muted">لم يُحدَّد الجمهور بعد.</p>
                  )}
                </div>
              )}
              <div className="flex flex-col gap-3 rounded-16 bg-bg-page px-5 pt-5 pb-[22px]">
                <p className="flex items-center gap-2.5 type-title !font-normal text-text-primary">
                  <Glyph icon={ClipboardList} size={20} className="text-text-brand" />
                  المتطلبات المسبقة
                </p>
                {p.prerequisites ? (
                  p.prerequisites
                    .split(/\n+/)
                    .filter(Boolean)
                    .map((r) => (
                      <p key={r} className="flex items-center gap-2.5 type-body text-text-secondary">
                        <Glyph icon={CircleCheck} size={16} className="text-state-success" />
                        {r}
                      </p>
                    ))
                ) : (
                  <p className="type-body text-text-muted">لا متطلبات مسبقة.</p>
                )}
              </div>
            </div>
            <p className="text-[16px] leading-[1.5] text-text-primary">المهارات التي تكتسبها</p>
            <ul className="flex flex-wrap gap-2.5">
              {p.skills.length ? (
                p.skills.map((s) => (
                  <li key={s}>
                    <Pill icon={Layers} tone="brand">
                      {s}
                    </Pill>
                  </li>
                ))
              ) : (
                <li className="type-body text-text-muted">لم تُحدَّد مهارات بعد.</li>
              )}
            </ul>
            <p className="type-caption text-state-success">تُضاف تلقائيًا إلى ملف المتدرب بعد إكماله البرنامج — موثَّقة لا مُدخَلة.</p>
            {mode === "visibility" && p.audience.length > 0 && (
              <>
                <p className="text-[16px] leading-[1.5] text-text-primary">لمن هذا البرنامج؟</p>
                <ul className="flex flex-wrap gap-2.5">
                  {p.audience.map((a) => (
                    <li key={a}>
                      <Pill icon={Users} tone="info">
                        {a}
                      </Pill>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Card>

          {ratings && (
            <Card>
              <div className="flex flex-col gap-6 sm:flex-row-reverse sm:items-start">
                <div className="flex shrink-0 flex-col items-center gap-2 rounded-16 bg-state-warning-bg px-[30px] pt-[22px] pb-6">
                  <p className="text-[50px] leading-[1.1] font-bold text-state-warning">{formatRating(ratings.average)}</p>
                  <RatingStars value={ratings.average} size="m" />
                  <p className="type-caption text-text-muted">{pluralAr(ratings.count, ["تقييم واحد", "تقييمان", "تقييمات", "تقييمًا"])}</p>
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <h2 className="type-h2 text-text-primary">تقييمات البرنامج</h2>
                  <p className="type-body text-text-muted">مجمّعة من {pluralAr(ratings.courses, ["دورة واحدة", "دورتين", "دورات", "دورة"])} نُفِّذت من هذا البرنامج.</p>
                  {mode === "status" ? (
                    <dl className="flex flex-col gap-2">
                      {[
                        { l: "المحتوى", v: ratings.content },
                        { l: "المدرب", v: ratings.trainer },
                        ...(ratings.organization !== null ? [{ l: "التنظيم", v: ratings.organization }] : []),
                      ].map((a) => (
                        <div key={a.l} className="flex items-center gap-3 rounded-12 bg-bg-page px-4 pt-3 pb-[13px]">
                          <dt className="min-w-0 flex-1 type-body text-text-secondary">{a.l}</dt>
                          <dd className="text-[16px] text-state-warning">{formatRating(a.v)}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {ratings.distribution.map((pct, i) => (
                        <li key={i} className="flex items-center gap-3">
                          <span className="w-6 type-caption text-text-secondary">{toArabicDigits(5 - i)}</span>
                          <Glyph icon={Star} size={16} className="text-state-warning" />
                          <span className="h-2 flex-1 overflow-hidden rounded-full bg-border-default">
                            <span className="block h-full rounded-full bg-state-warning" style={{ width: `${pct}%` }} />
                          </span>
                          <span className="w-10 text-end type-caption text-text-muted">{toArabicDigits(pct)}٪</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              {ratings.latest && (
                <article className="flex flex-col gap-3.5 rounded-16 border border-border-default bg-bg-surface p-[18px]">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={ratings.latest.name} />
                    <p className="min-w-0 flex-1 type-body text-text-primary">{ratings.latest.name}</p>
                    <RatingStars value={ratings.latest.stars} />
                  </div>
                  <p className="type-small text-text-secondary">{ratings.latest.comment}</p>
                </article>
              )}
            </Card>
          )}
        </div>
      </main>
    </>
  );
}
