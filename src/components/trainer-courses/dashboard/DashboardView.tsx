import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Banknote, BookOpen, CircleAlert, CircleCheck, CircleDot, Eye, Globe, Hourglass, Lightbulb, Link2, Lock, MessageSquare, Plus,
  RefreshCw, Star, TrendingUp, TriangleAlert, Users, X,
} from "lucide-react";
import { ModeBadge } from "@/components/course/CourseCover";
import { Avatar } from "@/components/ui/Data";
import { ButtonLink } from "@/components/ui/Button";
import { Glyph } from "@/components/ui/Icon";
import type { CourseHeader } from "@/lib/data/trainer-courses";
import { versionLabel } from "@/lib/data/trainer-courses";
import type { DashboardLearner, RecordedDashboard } from "@/lib/data/trainer-course-page";
import { formatDate, formatDayMonth, formatDuration, formatNumber, formatPercent, formatPrice, formatRating, formatRelative, pluralAr, toArabicDigits } from "@/lib/format";
import { CopyLink, RetryButton, ShareLinkButton } from "./DashboardClient";

/* TRR-CRS-07 · لوحة الدورة المسجَّلة: default 411:18526 · empty 413:18821 · error 413:19321 · stale 413:19550. */

const card = "flex flex-col gap-5 rounded-22 border border-border-default bg-bg-card p-5 shadow-card sm:p-7";
const money = (n: number) => new Intl.NumberFormat("ar-SA-u-nu-arab", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

export function DashboardHero({ course, saleUrl, state }: { course: CourseHeader; saleUrl: string; state: "selling" | "unsold" | "paused" }) {
  const pill =
    state === "selling"
      ? { text: "منشورة · متاحة للشراء", cls: "bg-state-success-bg text-state-success" }
      : state === "paused"
        ? { text: "منشورة · البيع موقوف مؤقتًا", cls: "bg-state-warning-bg text-state-warning" }
        : { text: "منشورة · لم تُبع بعد", cls: "bg-state-warning-bg text-state-warning" };
  return (
    <section className="overflow-hidden rounded-22 border border-border-default bg-bg-card shadow-card">
      <div aria-hidden className="h-[72px] w-full bg-[linear-gradient(174deg,#5b3cc4_0%,#268ca6_71%)] sm:h-[110px]" />
      <div className="flex flex-col gap-5 px-5 pt-5 pb-6 sm:px-[30px] sm:pt-6 sm:pb-[26px] lg:flex-row lg:items-center lg:gap-6">
        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-[7px] rounded-full px-3.5 py-[9px] type-subtitle ${pill.cls}`}>
              <Glyph icon={Globe} size={20} />
              {pill.text}
            </span>
            <ModeBadge mode="recorded" />
          </div>
          <h2 className="text-[28px] leading-[1.15] font-bold text-text-primary sm:text-[38px]">{course.title}</h2>
          <p className="flex min-w-0 flex-wrap items-center gap-2">
            <CopyLink url={saleUrl} label="انسخ" />
            <span dir="ltr" className="min-w-0 truncate font-mono text-[14px] text-text-brand">
              {saleUrl.replace(/^https?:\/\//, "")}
            </span>
            <Glyph icon={Link2} size={16} className="text-text-brand" />
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2.5 sm:flex-row lg:w-[171px] lg:flex-col">
          <ButtonLink href={`/courses/${course.slug}`} fullWidth>
            اعرض صفحة البيع
          </ButtonLink>
          <ButtonLink href={`/trainer/courses/${course.id}/content`} variant="outline" fullWidth>
            حرّر المحتوى
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}

export function SourceProgramCard({ course, drift }: { course: CourseHeader; drift: { version: number } | null }) {
  const frozen = versionLabel(course.program.version);
  return (
    <section
      className={`flex flex-col gap-4 rounded-16 border-2 px-5 pt-5 pb-[22px] sm:flex-row sm:items-center sm:px-6 ${drift ? "border-state-warning bg-state-warning-bg" : "border-state-success bg-bg-brand-tint"}`}
    >
      <span className="flex size-[52px] shrink-0 items-center justify-center rounded-12 bg-bg-surface text-text-brand">
        <Glyph icon={BookOpen} size={20} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-[5px]">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="min-w-0 flex-1 type-title text-text-primary">البرنامج المصدر: {course.program.title}</h2>
          {drift ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-bg-surface px-[11px] py-1.5 type-caption text-state-warning">
              <Glyph icon={TriangleAlert} size={16} />
              <span dir="ltr">{frozen}</span> · صدرت <span dir="ltr">{versionLabel(drift.version)}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-bg-surface px-[11px] py-1.5 type-caption text-state-success">
              <Glyph icon={Lock} size={16} />
              مجمَّد على <span dir="ltr">{frozen}</span>
            </span>
          )}
        </div>
        <p className="type-body text-text-secondary">
          {drift
            ? `حُدِّث البرنامج بعد نشر هذه الدورة. الدورة تبقى على ${frozen} — والدورات الجديدة تُبنى على ${versionLabel(drift.version)}.`
            : "هذه الدورة مرتبطة بنسخة ثابتة. تعديل البرنامج لاحقًا لن يغيّر ما اشتراه المتدربون."}
        </p>
      </div>
      <Link href={`/trainer/programs/${course.program.id}`} className="flex h-12 w-[120px] shrink-0 items-center justify-center rounded-12 type-button text-text-brand hover:bg-bg-surface focus-ring">
        اعرض البرنامج
      </Link>
    </section>
  );
}

function StatTile({ icon, label, value, sub, subTone = "text-text-muted" }: { icon: LucideIcon; label: string; value: string; sub: string; subTone?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-2.5 rounded-16 border border-border-default bg-bg-card px-5 pt-5 pb-[22px] shadow-card">
      <div className="flex items-center gap-2.5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-12 bg-bg-brand-tint text-text-brand">
          <Glyph icon={icon} size={20} />
        </span>
        <span className="min-w-0 flex-1 type-caption text-text-muted">{label}</span>
      </div>
      <p className="text-[30px] leading-[1.2] font-bold text-text-primary sm:text-[36px]">{value}</p>
      <p className={`type-caption ${subTone}`}>{sub}</p>
    </div>
  );
}

function NeedRow({ icon, title, sub, action, highlight }: { icon: LucideIcon; title: string; sub: string; action: React.ReactNode; highlight: boolean }) {
  return (
    <div className={`flex flex-wrap items-center gap-4 rounded-16 px-4 pt-[18px] pb-5 sm:flex-nowrap sm:px-5 ${highlight ? "border-[1.5px] border-state-error bg-state-error-bg" : "bg-bg-page"}`}>
      <span className="flex size-12 shrink-0 items-center justify-center rounded-12 bg-bg-surface text-text-brand">
        <Glyph icon={icon} size={20} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="type-title text-text-primary">{title}</p>
        <p className="type-body text-text-muted">{sub}</p>
      </div>
      {action}
    </div>
  );
}

const COUNT_WORDS = ["", "بند واحد ينتظر", "بندان ينتظران", "ثلاثة بنود تنتظر"];

export function NeedsAction({ course, data }: { course: CourseHeader; data: RecordedDashboard }) {
  const base = `/trainer/courses/${course.id}`;
  const items: { key: string; icon: LucideIcon; title: string; sub: string; label: string; href: string }[] = [];
  if (data.questions.count > 0)
    items.push({
      key: "q",
      icon: MessageSquare,
      title: `${pluralAr(data.questions.count, ["سؤال واحد", "سؤالان", "أسئلة", "سؤالًا"])} بلا رد`,
      sub: `أقدمها من ${data.questions.oldestName ?? "متدرب"} ${formatRelative(data.questions.oldestAt ?? new Date().toISOString())}`,
      label: "ردّ الآن",
      href: `${base}/trainees`,
    });
  if (data.ratings.unreplied > 0)
    items.push({
      key: "r",
      icon: Star,
      title: `${pluralAr(data.ratings.unreplied, ["تقييم واحد", "تقييمان", "تقييمات", "تقييمًا"])} بلا رد`,
      sub:
        data.ratings.lowestUnreplied !== null
          ? `${data.ratings.unreplied > 1 ? "أحدها" : "التقييم"} ${toArabicDigits(data.ratings.lowestUnreplied)} نجوم — الرد يرفع ثقة القراء`
          : "الرد يرفع ثقة القراء",
      label: "اعرض التقييمات",
      href: `${base}/ratings`,
    });
  if (data.refundPending)
    items.push({
      key: "f",
      icon: RefreshCw,
      title: data.refundPending.count > 1 ? `${pluralAr(data.refundPending.count, ["طلب", "طلبان", "طلبات", "طلبًا"])} استرداد جديدة` : "طلب استرداد جديد",
      sub: `${data.refundPending.name} · ${formatPrice(data.refundPending.amount)} · ${data.refundPending.inWindow ? "ضمن المهلة" : "خارج المهلة"}`,
      label: "اعرض الطلب",
      href: `${base}/sales`,
    });
  if (items.length === 0) return null;
  return (
    <section className="flex flex-col gap-4 rounded-22 border-2 border-state-error bg-bg-card px-5 pt-[26px] pb-7 shadow-card sm:px-7">
      <div className="flex items-center gap-3.5">
        <span className="flex size-[52px] shrink-0 items-center justify-center rounded-16 bg-state-error-bg text-state-error">
          <Glyph icon={CircleAlert} size={20} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2 className="type-h2 text-text-primary">يحتاج إجراءك</h2>
          <p className="type-body text-text-muted">{COUNT_WORDS[items.length]} قرارك في هذه الدورة</p>
        </div>
      </div>
      {items.map((it, i) => (
        <NeedRow
          key={it.key}
          icon={it.icon}
          title={it.title}
          sub={it.sub}
          highlight={i === 0}
          action={
            <ButtonLink href={it.href} variant={i === 0 ? "primary" : "outline"} className="min-w-[120px]">
              {it.label}
            </ButtonLink>
          }
        />
      ))}
    </section>
  );
}

const ORDINAL = ["الأولى", "الثانية", "الثالثة", "الرابعة", "الخامسة", "السادسة", "السابعة", "الثامنة", "التاسعة", "العاشرة"];

export function ContentCompletion({ course, data }: { course: CourseHeader; data: RecordedDashboard }) {
  const buyers = data.learners.length;
  const pcts = data.modules.map((m) => (buyers ? Math.round((m.completed / buyers) * 100) : 0));
  const drop = data.modules.findIndex((_, i) => i > 0 && pcts[i - 1] - pcts[i] >= 25);
  const lessons = data.modules.reduce((s, m) => s + m.lessons, 0);
  return (
    <section className={card}>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="min-w-[12rem] flex-1 type-h2 text-text-primary">المحتوى</h2>
        <span className="inline-flex items-center gap-[7px] rounded-full bg-bg-brand-tint px-3.5 py-[9px] type-subtitle text-text-brand">
          {pluralAr(data.modules.length, ["وحدة واحدة", "وحدتان", "وحدات", "وحدة"])} · {pluralAr(lessons, ["درس واحد", "درسان", "دروس", "درسًا"])}
        </span>
        <ButtonLink href={`/trainer/courses/${course.id}/content`} variant="outline" className="w-[120px]">
          أدر المحتوى
        </ButtonLink>
      </div>
      {data.modules.map((m, i) => {
        const p = pcts[i];
        const tone = p >= 70 ? "bg-state-success-bg text-state-success" : p >= 40 ? "bg-state-warning-bg text-state-warning" : "bg-state-error-bg text-state-error";
        return (
          <div key={m.id} className="flex items-center gap-4 rounded-16 bg-bg-page px-4 pt-4 pb-[18px] sm:px-[18px]">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-12 bg-bg-surface type-h3 text-text-brand">{toArabicDigits(m.position)}</span>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <p className="type-title text-text-primary">{m.title}</p>
              <p className="type-body text-text-muted">
                {pluralAr(m.lessons, ["درس واحد", "درسان", "دروس", "درسًا"])}
                {m.seconds > 0 && ` · ${formatDuration(m.seconds)}`}
              </p>
            </div>
            <span className={`inline-flex shrink-0 items-center gap-[7px] rounded-full px-[11px] py-1.5 type-small ${tone}`}>
              <Glyph icon={TrendingUp} size={16} />
              {formatPercent(p)} أكملوها
            </span>
          </div>
        );
      })}
      {drop > 0 && (
        <p className="flex items-start gap-3 rounded-16 bg-state-warning-bg px-[18px] pt-[15px] pb-4 type-body text-state-warning">
          <Glyph icon={Lightbulb} size={20} className="mt-1" />
          <span className="flex-1">الإكمال يهبط بحدّة في الوحدة {ORDINAL[drop] ?? toArabicDigits(drop + 1)}. راجع طول دروسها أو أضف تمرينًا تطبيقيًا يشدّ المتدرب.</span>
        </p>
      )}
    </section>
  );
}

function learnerLine(l: DashboardLearner, lessons: number): { pct: number; line: string; tone: string; row: string } {
  const pct = lessons ? Math.min(100, Math.round((l.done / lessons) * 100)) : 0;
  if (l.refundStatus === "under_review") return { pct, line: "متوقفة · طلبت استردادًا", tone: "text-state-warning", row: "bg-state-warning-bg" };
  if (l.openQuestions > 0) return { pct, line: `لديه ${pluralAr(l.openQuestions, ["سؤال واحد", "سؤالان", "أسئلة", "سؤالًا"])} بلا رد`, tone: "text-state-error", row: "bg-state-error-bg" };
  if (lessons > 0 && l.done >= lessons) return { pct: 100, line: l.certified ? "أكمل · صدرت شهادته" : "أكمل الدورة", tone: "text-state-success", row: "bg-bg-page" };
  return { pct, line: `${toArabicDigits(l.done)} من ${pluralAr(lessons, ["درس واحد", "درسين", "دروس", "درسًا"])}`, tone: "text-text-brand", row: "bg-bg-page" };
}

export function LearnersProgress({ course, data }: { course: CourseHeader; data: RecordedDashboard }) {
  return (
    <section className={card}>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="min-w-[12rem] flex-1 type-h2 text-text-primary">المشترون وتقدّمهم</h2>
        <Link href={`/trainer/courses/${course.id}/sales`} className="rounded-8 type-subtitle text-text-brand hover:underline focus-ring">
          اعرض الكل ({toArabicDigits(data.learners.length)})
        </Link>
      </div>
      {data.learners.slice(0, 4).map((l) => {
        const s = learnerLine(l, data.lessons);
        return (
          <div key={l.enrollmentId} className={`flex flex-wrap items-center gap-4 rounded-16 px-4 pt-4 pb-[18px] sm:flex-nowrap sm:px-[18px] ${s.row}`}>
            <div className="flex min-w-0 flex-1 basis-full items-center gap-3 sm:basis-auto">
              <Avatar name={l.name} src={l.avatar} />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <p className="truncate type-title text-text-primary">{l.name}</p>
                <p className="type-body text-text-muted">اشترى {formatRelative(l.boughtAt)}</p>
              </div>
            </div>
            <div className={`flex flex-1 flex-col gap-1 text-start sm:w-[180px] sm:flex-none sm:text-center ${s.tone}`}>
              <p className="type-h3">{formatPercent(s.pct)}</p>
              <p className="type-caption">{s.line}</p>
            </div>
            <Link href="/messages" aria-label={`راسل ${l.name}`} className="flex size-10 shrink-0 items-center justify-center rounded-8 bg-bg-surface text-text-brand focus-ring">
              <Glyph icon={MessageSquare} size={20} />
            </Link>
          </div>
        );
      })}
    </section>
  );
}

function MoneyRow({ label, value, tone = "text-text-primary" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="min-w-0 flex-1 type-body text-text-secondary">{label}</span>
      <span className={`shrink-0 type-subtitle ${tone}`}>{value}</span>
    </div>
  );
}

export function RevenueCard({ courseId, totals }: { courseId: string; totals: { gross: number; commission: number; pct: number; refunds: number; refundCount: number; net: number } }) {
  return (
    <section className={card}>
      <h2 className="type-h2 text-text-primary">الإيراد</h2>
      <MoneyRow label="إجمالي المبيعات" value={`${money(totals.gross)} ر.س`} />
      <MoneyRow label={`عمولة المنصة ${toArabicDigits(totals.pct)}٪ · قيمة تشغيلية مؤقتة وفق إعدادات المنصة`} value={`− ${money(totals.commission)} ر.س`} tone="text-state-warning" />
      {totals.refundCount > 0 && (
        <MoneyRow label={pluralAr(totals.refundCount, ["استرداد واحد", "استردادان", "استردادات", "استردادًا"])} value={`− ${money(totals.refunds)} ر.س`} tone="text-state-error" />
      )}
      <hr className="border-border-divider" />
      <div className="flex items-center gap-3">
        <span className="min-w-0 flex-1 type-title text-text-primary">صافي إيرادك</span>
        <span className="shrink-0 type-h3 text-state-success">{money(totals.net)} ر.س</span>
      </div>
      <p className="type-caption text-text-muted">يُفرَج عن إيراد كل عملية بعد ١٤ يومًا من الشراء.</p>
      <ButtonLink href={`/trainer/courses/${courseId}/sales`} size="l" variant="outline" fullWidth>
        اعرض المبيعات بالتفصيل
      </ButtonLink>
    </section>
  );
}

export function StatsRow({ course, data, totals }: { course: CourseHeader; data: RecordedDashboard; totals: { gross: number; net: number } }) {
  const buyers = data.learners.length;
  const avg = buyers && data.lessons ? Math.round(data.learners.reduce((s, l) => s + Math.min(1, l.done / data.lessons), 0) / buyers * 100) : 0;
  const finished = data.learners.filter((l) => data.lessons > 0 && l.done >= data.lessons).length;
  const conv = course.pageViews ? (buyers / course.pageViews) * 100 : 0;
  return (
    <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-5">
      <StatTile icon={Eye} label="مشاهدة الصفحة" value={formatNumber(course.pageViews)} sub={`معدل الشراء ${new Intl.NumberFormat("ar-SA-u-nu-arab", { maximumFractionDigits: 1 }).format(conv)}٪`} />
      <StatTile
        icon={Star}
        label={`من ${pluralAr(data.ratings.count, ["تقييم واحد", "تقييمين", "تقييمات", "تقييمًا"])}`}
        value={data.ratings.count ? formatRating(course.ratingAvg) : "—"}
        sub={`لم تردّ على ${toArabicDigits(data.ratings.unreplied)}`}
        subTone={data.ratings.unreplied ? "text-state-warning" : "text-text-muted"}
      />
      <StatTile icon={TrendingUp} label="متوسط الإكمال" value={formatPercent(avg)} sub={`${pluralAr(finished, ["متدرب واحد", "متدربان", "متدربين", "متدربًا"])} أكملوا الدورة`} subTone="text-state-success" />
      <StatTile icon={Banknote} label="ر.س صافي" value={money(totals.net)} sub={`من ${formatNumber(Math.round(totals.gross))} إجمالي`} />
      <StatTile icon={Users} label="مشتريًا" value={toArabicDigits(buyers)} sub={`+${toArabicDigits(data.monthBuyers)} هذا الشهر`} subTone="text-state-success" />
    </div>
  );
}

/* ── Empty (413:18821) ─────────────────────────────────────────────────────────────────────────── */

export function EmptyDashboard({
  course,
  saleUrl,
  preview,
  categoryAvg,
}: {
  course: CourseHeader;
  saleUrl: string;
  preview: { seconds: number } | null;
  categoryAvg: number | null;
}) {
  const priceOk = categoryAvg === null || course.price === 0 || course.price <= categoryAvg * 1.3;
  const tips: { icon: LucideIcon; title: string; text: string; side: React.ReactNode }[] = [
    {
      icon: Eye,
      title: "درس معاينة قوي",
      text: preview
        ? `المعاينة الحالية ${pluralAr(Math.max(1, Math.round(preview.seconds / 60)), ["دقيقة واحدة", "دقيقتان", "دقائق", "دقيقة"])} — الزائر يقرر منها. اختر درسًا يُظهر قيمتك.`
        : "لا درس معاينة بعد — الزائر يقرر من المعاينة. اختر درسًا يُظهر قيمتك.",
      side: preview ? (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-state-success-bg px-[11px] py-1.5 type-caption text-state-success">
          مبنيّ
          <Glyph icon={CircleCheck} size={16} />
        </span>
      ) : (
        <ButtonLink href={`/trainer/courses/${course.id}/content`} size="s" variant="outline" className="w-[120px]">
          أضف
        </ButtonLink>
      ),
    },
    {
      icon: Hourglass,
      title: "شارك الرابط في مكان جمهورك",
      text: "لينكدإن ومجموعات التخصص أفضل من النشر العام.",
      side: (
        <ShareLinkButton url={saleUrl} title={course.title} variant="outline" size="s" className="w-[120px]">
          شارك الآن
        </ShareLinkButton>
      ),
    },
    {
      icon: Star,
      title: "اطلب تقييمًا من أول مشترٍ",
      text: "دورة بلا تقييم تُشترى أقل بكثير.",
      side: (
        <span aria-disabled="true" className="inline-flex h-11 w-[120px] items-center justify-center rounded-12 bg-bg-disabled type-small text-text-disabled">
          لاحقًا
        </span>
      ),
    },
    {
      icon: Banknote,
      title: "راجع سعرك",
      text:
        categoryAvg === null
          ? `${formatPrice(course.price)} — لا دورات مسجَّلة أخرى في تخصصك للمقارنة بعد.`
          : priceOk
            ? `${formatPrice(course.price)} ضمن متوسط المسجَّلة في تخصصك.`
            : `${formatPrice(course.price)} أعلى من متوسط المسجَّلة في تخصصك (${formatPrice(categoryAvg)}).`,
      side:
        categoryAvg === null ? null : (
          <span className={`inline-flex items-center gap-1.5 rounded-full px-[11px] py-1.5 type-caption ${priceOk ? "bg-state-success-bg text-state-success" : "bg-state-warning-bg text-state-warning"}`}>
            {priceOk ? "مناسب" : "أعلى من المتوسط"}
            <Glyph icon={priceOk ? CircleCheck : TriangleAlert} size={16} />
          </span>
        ),
    },
  ];
  const numbers: { icon: LucideIcon; label: string; value: string; tone?: string }[] = [
    { icon: Eye, label: "مشاهدة للصفحة", value: formatNumber(course.pageViews), tone: "text-text-brand" },
    { icon: Users, label: "مشترٍ", value: "٠" },
    { icon: Banknote, label: "ر.س", value: money(0) },
    { icon: Star, label: "لا تقييمات", value: "—" },
  ];
  return (
    <>
      <section className="flex flex-col items-center gap-4 rounded-22 bg-bg-brand-tint px-5 py-10 text-center sm:px-12">
        <span className="flex size-16 items-center justify-center rounded-16 bg-bg-surface text-text-brand">
          <Glyph icon={TrendingUp} size={24} />
        </span>
        <h2 className="text-[26px] leading-[1.3] font-bold text-text-primary sm:text-[32px]">دورتك منشورة — بانتظار أول مشترٍ</h2>
        <p className="max-w-[720px] type-body-lg text-text-secondary">
          الصفحة شوهدت {pluralAr(course.pageViews, ["مرة واحدة", "مرتين", "مرات", "مرة"])} ولم تُشترَ بعد. هذا طبيعي في الأيام الأولى — انشر رابطك ليصل لمن يبحث عنه.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <ShareLinkButton url={saleUrl} title={course.title} size="l">
            شارك رابط الدورة
          </ShareLinkButton>
          <ButtonLink href={`/courses/${course.slug}`} size="l" variant="outline">
            اعرض صفحة البيع
          </ButtonLink>
        </div>
      </section>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <section className={card}>
            <h2 className="type-h2 text-text-primary">ما الذي يجلب أول مشترٍ؟</h2>
            {tips.map((t) => (
              <div key={t.title} className="flex flex-wrap items-center gap-4 rounded-16 bg-bg-page px-4 py-[18px] sm:flex-nowrap sm:px-5">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-12 bg-bg-surface text-text-brand">
                  <Glyph icon={t.icon} size={20} />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <p className="type-title text-text-primary">{t.title}</p>
                  <p className="type-body text-text-muted">{t.text}</p>
                </div>
                {t.side}
              </div>
            ))}
          </section>
          <SourceProgramCard course={course} drift={null} />
        </div>
        <aside className="w-full shrink-0 lg:w-[360px]">
          <section className={card}>
            <h2 className="type-h2 text-text-primary">الأرقام</h2>
            {numbers.map((n) => (
              <p key={n.label} className="flex items-center gap-3 rounded-12 bg-bg-page px-3.5 py-3">
                <Glyph icon={n.icon} size={20} className="text-text-secondary" />
                <span className="min-w-0 flex-1 type-body text-text-secondary">{n.label}</span>
                <span className={`type-subtitle ${n.tone ?? "text-text-primary"}`}>{n.value}</span>
              </p>
            ))}
          </section>
        </aside>
      </div>
    </>
  );
}

/* ── Error (413:19321 · ERR-DASH-503) ──────────────────────────────────────────────────────────── */

export function DashboardError({ course }: { course: CourseHeader }) {
  const ok = ["صفحة البيع تعمل والشراء متاح", "المشترون يشاهدون الدروس طبيعيًا", "مبيعاتك مسجَّلة ولن تضيع", "الشهادات تصدر آليًا كالمعتاد"];
  return (
    <>
      <section role="alert" className="flex flex-col items-center gap-4 rounded-22 border-2 border-state-error bg-state-error-bg px-5 py-10 text-center sm:px-12">
        <span className="flex size-16 items-center justify-center rounded-16 bg-bg-surface text-state-error">
          <Glyph icon={CircleAlert} size={24} />
        </span>
        <h2 className="text-[26px] leading-[1.3] font-bold text-text-primary sm:text-[32px]">تعذّر تحميل بيانات الدورة</h2>
        <p className="max-w-[720px] type-body-lg text-text-secondary">لم نتمكن من جلب المبيعات والتقدّم. دورتك ومحتواها ومشتروك بخير — المشكلة في عرض البيانات فقط.</p>
        <p className="type-caption text-text-muted">
          رمز الخطأ <span dir="ltr" className="font-mono">ERR-DASH-503</span>
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <RetryButton />
          <ButtonLink href="/trainer/help" size="l" variant="outline">
            تواصل مع الدعم
          </ButtonLink>
        </div>
      </section>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          <SourceProgramCard course={course} drift={null} />
        </div>
        <section className={`${card} w-full lg:w-[440px]`}>
          <h2 className="type-h2 text-text-primary">ما زال يعمل</h2>
          <p className="type-body text-text-secondary">هذا العطل لا يؤثّر على دورتك ولا على متدربيك:</p>
          {ok.map((t) => (
            <p key={t} className="flex items-center gap-3 rounded-12 bg-state-success-bg px-4 py-3 type-body text-state-success">
              <Glyph icon={CircleCheck} size={20} />
              <span className="flex-1">{t}</span>
            </p>
          ))}
        </section>
      </div>
    </>
  );
}

/* ── Stale program (413:19550) ─────────────────────────────────────────────────────────────────── */

function VersionBox({ title, version, sub, rows, tone }: { title: string; version: string; sub: string; rows: string[]; tone: "success" | "info" }) {
  return (
    <div className={`flex flex-col gap-3.5 rounded-16 border-[1.5px] p-5 ${tone === "success" ? "border-state-success bg-state-success-bg" : "border-state-info bg-state-info-bg"}`}>
      <p className="flex items-center gap-2.5">
        <span className="min-w-0 flex-1 type-title text-text-primary">{title}</span>
        <span dir="ltr" className={`font-mono text-[14px] ${tone === "success" ? "text-state-success" : "text-state-info"}`}>
          {version}
        </span>
      </p>
      <p className={`type-body ${tone === "success" ? "text-state-success" : "text-state-info"}`}>{sub}</p>
      {rows.map((r) => (
        <p key={r} className="flex items-center gap-2.5 rounded-12 bg-bg-surface px-3.5 py-3 type-body text-text-primary">
          <Glyph icon={CircleDot} size={16} className="text-text-muted" />
          <span className="flex-1">{r}</span>
        </p>
      ))}
    </div>
  );
}

export function StaleProgram({
  course,
  drift,
  buyers,
  current,
  hideHref,
}: {
  course: CourseHeader;
  drift: { version: number; createdAt: string; modules: number; items: number; objectives: number };
  buyers: number;
  current: { modules: number; lessons: number; objectives: number };
  hideHref: string;
}) {
  const mine = versionLabel(course.program.version);
  const next = versionLabel(drift.version);
  const added = Math.max(0, drift.items - current.lessons);
  return (
    <>
      <div className="flex items-start gap-3 rounded-12 border-[1.5px] border-state-warning bg-state-warning-bg px-4 py-3.5 text-state-warning" role="status">
        <Glyph icon={TriangleAlert} size={20} className="mt-1" />
        <div className="flex flex-1 flex-col gap-1">
          <p className="type-body">حُدِّث البرنامج المصدر — هذه الدورة تعمل على النسخة السابقة</p>
          <p className="type-small text-text-secondary">
            أصدرت {next} من «{course.program.title}». هذه الدورة مجمَّدة على {mine} وفق قواعد المنصة — ما اشتراه مشتروك لا يتغيّر. الدورات الجديدة ستُبنى على {next}.
          </p>
        </div>
        <Link href={hideHref} aria-label="إخفاء التنبيه" className="flex size-8 shrink-0 items-center justify-center rounded-8 text-text-secondary hover:bg-bg-surface focus-ring">
          <Glyph icon={X} size={16} />
        </Link>
      </div>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <SourceProgramCard course={course} drift={drift} />
          <section className={card}>
            <h2 className="type-h2 text-text-primary">ما الفرق بين النسختين؟</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <VersionBox
                title="النسخة الحالية للبرنامج"
                version={next}
                sub="تُستخدم في الدورات الجديدة"
                tone="info"
                rows={[
                  `${pluralAr(drift.modules, ["وحدة واحدة", "وحدتان", "وحدات", "وحدة"])} · ${pluralAr(drift.items, ["درس واحد", "درسان", "دروس", "درسًا"])}`,
                  pluralAr(drift.objectives, ["هدف تعليمي واحد", "هدفان تعليميان", "أهداف تعليمية", "هدفًا تعليميًا"]),
                  `صدرت ${formatDayMonth(drift.createdAt)}`,
                ]}
              />
              <VersionBox
                title="نسخة هذه الدورة"
                version={mine}
                sub={`${pluralAr(buyers, ["مشترٍ واحد يتعلّم", "مشتريان يتعلّمان", "مشترين يتعلّمون", "مشتريًا يتعلّمون"])} عليها`}
                tone="success"
                rows={[
                  `${pluralAr(current.modules, ["وحدة واحدة", "وحدتان", "وحدات", "وحدة"])} · ${pluralAr(current.lessons, ["درس واحد", "درسان", "دروس", "درسًا"])}`,
                  pluralAr(current.objectives, ["هدف تعليمي واحد", "هدفان تعليميان", "أهداف تعليمية", "هدفًا تعليميًا"]),
                  `مجمَّدة منذ ${course.publishedAt ? formatDayMonth(course.publishedAt) : formatDate(course.program.versionCreatedAt)}`,
                ]}
              />
            </div>
          </section>
          <section className={card}>
            <h2 className="type-h2 text-text-primary">خياراتك</h2>
            <NeedRow
              icon={CircleCheck}
              title="أبقِ الدورة كما هي"
              sub="مشتروك يكملون ما اشتروه. لا شيء يتغيّر — هذا الخيار الموصى به."
              highlight={false}
              action={
                <span className="inline-flex items-center gap-1.5 rounded-full bg-bg-surface px-[11px] py-1.5 type-caption text-state-success">
                  موصى به
                  <Glyph icon={CircleCheck} size={16} />
                </span>
              }
            />
            <NeedRow
              icon={Plus}
              title={`أنشئ دورة جديدة على ${next}`}
              sub="دورة منفصلة بمحتوى محدَّث وسعر جديد. الدورتان تعملان معًا."
              highlight={false}
              action={
                <ButtonLink href={`/trainer/courses/new?program=${course.program.id}`} variant="outline" className="w-[120px]">
                  أنشئ دورة
                </ButtonLink>
              }
            />
            <NeedRow
              icon={RefreshCw}
              title="انقل المحتوى الجديد يدويًا"
              sub={`أضف ${added > 0 ? pluralAr(added, ["الدرس الجديد", "الدرسين الجديدين", "دروس جديدة", "درسًا جديدًا"]) : "الدروس الجديدة"} لهذه الدورة — يُعيد نسب ${pluralAr(buyers, ["مشترٍ واحد", "مشتريين", "مشترين", "مشتريًا"])}.`}
              highlight={false}
              action={
                <ButtonLink href={`/trainer/courses/${course.id}/content`} variant="outline" className="w-[120px]">
                  اعرض الدروس
                </ButtonLink>
              }
            />
          </section>
        </div>
        <aside className="w-full shrink-0 lg:w-[400px]">
          <section className={card}>
            <h2 className="type-h3 text-text-primary">لماذا لا تتحدّث تلقائيًا؟</h2>
            <p className="type-body text-text-secondary">المتدرب اشترى وصفًا وأهدافًا محددة. تغييرها بعد الشراء إخلال بما تعاقد عليه — لذلك تُجمَّد نسخة البرنامج لحظة النشر.</p>
            <p className="type-caption text-text-brand">
              قاعدة <span dir="ltr">BR-L1</span>
            </p>
          </section>
        </aside>
      </div>
    </>
  );
}
