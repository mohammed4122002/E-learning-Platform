import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, CalendarDays, CircleAlert, CircleCheck, Clock, Eye, FileText, Hourglass, Lightbulb, Search, Star, Upload, Users } from "lucide-react";
import { PageBody, TopBar } from "@/components/layout/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { ChipLink } from "@/components/ui/Chip";
import { Glyph } from "@/components/ui/Icon";
import { Meta, PHASE_STYLE, PhasePill, ProgramModePill } from "@/components/trainer-programs/bits";
import { ProgramsSort } from "@/components/trainer-programs/ProgramsSort";
import { requireTrainer } from "@/lib/auth";
import { latestProgramCourseId, listTrainerPrograms, type ProgramListItem } from "@/lib/data/trainer-programs";
import { formatNumber, formatRating, formatRelative, pluralAr, toArabicDigits } from "@/lib/format";
import { LEVEL_LABELS } from "@/lib/labels";
import {
  MISSING_FIELDS,
  businessDaysWord,
  filesWord,
  hoursWord,
  lessonsWord,
  missingSummary,
  reviewDaysLeft,
  versionLabelAr,
  type ProgramPhase,
} from "@/lib/trainer-programs";

export const metadata: Metadata = { title: "برامجي" };

type Filter = "all" | "suspended" | "draft" | "needs_changes" | "under_review" | "published";
const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "الكل" },
  { key: "suspended", label: "موقوفة" },
  { key: "draft", label: "مسودات" },
  { key: "needs_changes", label: "تحتاج تعديلًا" },
  { key: "under_review", label: "قيد المراجعة" },
  { key: "published", label: "منشورة" },
];
const SORTS = { updated: "الأحدث تعديلًا", created: "الأحدث إنشاءً", title: "الاسم (أ–ي)" } as const;
type SortKey = keyof typeof SORTS;

const phaseFilter = (p: ProgramPhase): Filter => (p === "rejected" ? "all" : p);

function href(state: { q: string; status: Filter; sort: SortKey }, patch: Partial<{ q: string; status: Filter; sort: SortKey }>) {
  const s = { ...state, ...patch };
  const sp = new URLSearchParams();
  if (s.q) sp.set("q", s.q);
  if (s.status !== "all") sp.set("status", s.status);
  if (s.sort !== "updated") sp.set("sort", s.sort);
  const qs = sp.toString();
  return `/trainer/programs${qs ? `?${qs}` : ""}`;
}

const programsCount = (n: number) => pluralAr(n, ["برنامج واحد", "برنامجان", "برامج", "برنامجًا"]);
const wordCount = (n: number) =>
  ["", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة", "عشرة"][n] ?? toArabicDigits(n);

/** Header sentence (262:2211): «خمسة برامج · واحد منشور يحتاج دورة جديدة، وواحد يحتاج تعديلك.» */
function headline(items: ProgramListItem[]): string {
  const total = items.length;
  const head = total <= 10 && total > 2 ? `${wordCount(total)} برامج` : programsCount(total);
  const needCourse = items.filter((p) => p.phase === "published" && p.courses.open + p.courses.running === 0).length;
  const needFix = items.filter((p) => p.phase === "needs_changes").length;
  const parts: string[] = [];
  if (needCourse) parts.push(`${needCourse === 1 ? "واحد منشور يحتاج" : `${toArabicDigits(needCourse)} منشورة تحتاج`} دورة جديدة`);
  if (needFix) parts.push(`${needFix === 1 ? "واحد يحتاج" : `${toArabicDigits(needFix)} تحتاج`} تعديلك`);
  return parts.length ? `${head} · ${parts.join("، و")}.` : `${head}.`;
}

export default async function TrainerProgramsPage({ searchParams }: PageProps<"/trainer/programs">) {
  const user = await requireTrainer("/trainer/programs");
  const sp = await searchParams;
  const [all, certCourse] = await Promise.all([listTrainerPrograms(user.id), latestProgramCourseId(user.id)]);

  if (all.length === 0) return <EmptyPrograms />;

  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 80) : "";
  const status: Filter = FILTERS.some((f) => f.key === sp.status) ? (sp.status as Filter) : "all";
  const sort: SortKey = typeof sp.sort === "string" && sp.sort in SORTS ? (sp.sort as SortKey) : "updated";
  const state = { q, status, sort };

  const counts = Object.fromEntries(FILTERS.map((f) => [f.key, f.key === "all" ? all.length : all.filter((p) => phaseFilter(p.phase) === f.key).length])) as Record<Filter, number>;
  const needle = q.toLowerCase();
  const shown = all
    .filter((p) => status === "all" || phaseFilter(p.phase) === status)
    .filter((p) => !needle || p.title.toLowerCase().includes(needle) || (p.categoryName ?? "").toLowerCase().includes(needle))
    .sort((a, b) => (sort === "title" ? a.title.localeCompare(b.title, "ar") : sort === "created" ? b.createdAt.localeCompare(a.createdAt) : b.updatedAt.localeCompare(a.updatedAt)));
  const mostWanted = all.filter((p) => p.phase === "published" && p.courses.learners > 0).sort((a, b) => b.courses.learners - a.courses.learners)[0]?.id;

  return (
    <>
      <TopBar title="برامجي" subtitle="المنتج التعليمي — تُنشأ منه الدورات" />
      <PageBody className="!gap-6">
        {/* Entry row (4257:2297) → TRR-CRT-02 of the latest course run from these programs. */}
        <div className="flex flex-col items-start gap-1.5">
          <ButtonLink href={certCourse ? `/trainer/courses/${certCourse}/certificates/program` : "/trainer/courses"} disabled={!certCourse} aria-describedby={certCourse ? undefined : "cert-entry-note"}>
            شهادات إتمام البرنامج
          </ButtonLink>
          {!certCourse && (
            <p id="cert-entry-note" className="type-caption text-text-muted">
              تُصدر الشهادات من دورة منفَّذة — لا دورات من برامجك بعد.
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-5">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <h2 className="text-[28px] leading-[1.2] font-bold text-text-primary sm:text-[36px]">برامجي</h2>
            <p className="type-body-lg text-text-secondary">{headline(all)}</p>
          </div>
          <ButtonLink href="/trainer/programs/new" size="l" className="max-sm:w-full">
            أنشئ برنامجًا جديدًا
          </ButtonLink>
        </div>

        <div className="flex flex-wrap items-center gap-4 rounded-12 bg-bg-brand-tint px-5 py-[18px] text-text-brand">
          <Glyph icon={Lightbulb} size={20} className="self-start sm:mt-1" />
          <p className="min-w-0 flex-1 basis-60 type-body">
            البرنامج هو المحتوى المعتمد (الوصف · الأهداف · المواد · السعر). الدورة تنفيذ مجدول له بتاريخ ومكان ومقاعد. لا تُنشأ دورة إلا من برنامج منشور.
          </p>
          <ButtonLink href="/trainer/courses" variant="ghost">
            اعرض دوراتي
          </ButtonLink>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row">
          <form action="/trainer/programs" role="search" className="relative flex h-12 min-w-0 flex-1 items-center gap-2.5 rounded-12 border-[1.5px] border-border-default bg-bg-surface px-4 focus-within:border-2 focus-within:border-action-primary">
            <Glyph icon={Search} size={16} className="text-text-muted" />
            <label htmlFor="programs-q" className="sr-only">
              ابحث في برامجك
            </label>
            <input
              id="programs-q"
              name="q"
              defaultValue={q}
              placeholder="ابحث في برامجك بالاسم أو التخصص"
              className="h-full min-w-0 flex-1 bg-transparent type-body text-text-primary outline-none placeholder:text-text-muted"
            />
            {status !== "all" && <input type="hidden" name="status" value={status} />}
            {sort !== "updated" && <input type="hidden" name="sort" value={sort} />}
            <button type="submit" className="sr-only">
              بحث
            </button>
          </form>
          <ProgramsSort value={sort} options={SORTS} hrefs={Object.fromEntries((Object.keys(SORTS) as SortKey[]).map((k) => [k, href(state, { sort: k })]))} />
        </div>

        <nav aria-label="تصفية حسب الحالة" className="flex flex-wrap gap-2.5">
          {FILTERS.map((f) => (
            <ChipLink key={f.key} href={href(state, { status: f.key })} selected={status === f.key} className={f.key === "all" ? "min-w-[120px] justify-center" : ""}>
              {f.label} · {toArabicDigits(counts[f.key])}
            </ChipLink>
          ))}
        </nav>

        <div className="flex flex-col items-start gap-6 lg:flex-row">
          <section aria-label="البرامج" className="flex w-full min-w-0 flex-1 flex-col gap-4">
            {shown.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-16 border-[1.5px] border-border-divider bg-bg-page px-8 py-10 text-center">
                <span className="flex size-14 items-center justify-center rounded-16 bg-bg-brand-tint text-text-brand">
                  <Glyph icon={Search} size={20} />
                </span>
                <p className="type-title text-text-primary">لا برامج تطابق البحث</p>
                <p className="type-small text-text-secondary">جرّب اسمًا آخر أو اعرض كل الحالات.</p>
                <ButtonLink href="/trainer/programs" variant="outline" size="s">
                  اعرض كل البرامج
                </ButtonLink>
              </div>
            ) : (
              shown.map((p) => <ProgramCard key={p.id} p={p} mostWanted={p.id === mostWanted} />)
            )}
          </section>

          <aside aria-label="حالات البرنامج" className="flex w-full shrink-0 flex-col gap-5 lg:w-[360px]">
            <section className="flex flex-col gap-4 rounded-16 border border-border-default bg-bg-card p-6 shadow-card">
              <h2 className="type-h3 text-text-primary">حالات البرنامج</h2>
              <p className="type-caption text-text-muted">يمر البرنامج بخمس حالات. تعرف دائمًا أين هو ومن المسؤول.</p>
              <ul className="flex flex-col gap-4">
                {(
                  [
                    ["draft", "مسودة", "أنت · تعدّل بحرّية"],
                    ["under_review", "قيد المراجعة", "المنصة · ٣ أيام عمل"],
                    ["needs_changes", "يحتاج تعديلًا", "أنت · سبب مصنَّف وحقل محدد"],
                    ["published", "منشور", "متاح · تُنشأ منه دورات"],
                    ["suspended", "موقوف", "أنت أو المنصة · لا دورات جديدة"],
                  ] as [ProgramPhase, string, string][]
                ).map(([phase, label, who]) => (
                  <li key={phase} className="flex items-center gap-2.5 rounded-12 bg-bg-page px-3 py-2.5">
                    <span className={`flex size-8 shrink-0 items-center justify-center rounded-8 bg-bg-surface ${PHASE_STYLE[phase].text}`}>
                      <Glyph icon={PHASE_STYLE[phase].icon} size={16} />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className={`type-small ${PHASE_STYLE[phase].text}`}>{label}</span>
                      <span className="type-caption text-text-muted">{who}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </aside>
        </div>
      </PageBody>
    </>
  );
}

function ProgramCard({ p, mostWanted }: { p: ProgramListItem; mostWanted: boolean }) {
  const s = PHASE_STYLE[p.phase];
  const firstMissing = p.missing[0] ? MISSING_FIELDS[p.missing[0]] : null;
  const finding = p.request?.findings[0];
  const tinted = p.phase === "under_review" || p.phase === "needs_changes" || p.phase === "rejected";

  let primary: { href: string; label: string; variant: "primary" | "outline" };
  let secondary: { href: string; label: string };
  switch (p.phase) {
    case "needs_changes":
      primary = { href: `/trainer/programs/${p.id}/edit/${finding?.field === "price" ? "pricing" : finding?.field === "materials" ? "materials" : ["objectives", "audience", "units", "prerequisites"].includes(finding?.field ?? "") ? "goals" : "basics"}`, label: "عدّل وأعد الإرسال", variant: "primary" };
      secondary = { href: `/trainer/programs/${p.id}`, label: "خيارات" };
      break;
    case "under_review":
      primary = { href: `/trainer/programs/${p.id}/review`, label: "تتبّع المراجعة", variant: "outline" };
      secondary = { href: `/trainer/programs/${p.id}`, label: "خيارات" };
      break;
    case "rejected":
      primary = { href: `/trainer/programs/${p.id}/new-version`, label: "أنشئ نسخة جديدة", variant: "primary" };
      secondary = { href: `/trainer/programs/${p.id}/review`, label: "خيارات" };
      break;
    case "published":
    case "suspended":
      primary = { href: `/trainer/programs/${p.id}`, label: "افتح البرنامج", variant: "outline" };
      secondary = { href: `/trainer/courses/new?program=${p.id}`, label: "أنشئ دورة منه" };
      break;
    default:
      primary = { href: `/trainer/programs/${p.id}/edit/${firstMissing?.step ?? "basics"}`, label: "أكمل المسودة", variant: "outline" };
      secondary = { href: `/trainer/programs/${p.id}`, label: "خيارات" };
  }

  const subtitle =
    p.phase === "published" || p.phase === "suspended"
      ? [mostWanted ? "البرنامج الأكثر طلبًا لديك" : p.summary && p.summary.length <= 60 ? p.summary : null, p.hours ? hoursWord(p.hours) : null, `مستوى ${LEVEL_LABELS[p.level]}`].filter(Boolean).join(" · ")
      : p.phase === "draft"
        ? `لم يُرسل بعد · آخر تعديل ${formatRelative(p.updatedAt)}`
        : [p.summary, p.lessons ? lessonsWord(p.lessons) : null, p.hours ? hoursWord(p.hours) : null].filter(Boolean).join(" · ") || `مستوى ${LEVEL_LABELS[p.level]}`;

  return (
    <article className={`flex flex-col gap-[18px] rounded-16 px-5 py-[18px] shadow-card sm:flex-row sm:items-start ${s.card}`}>
      <span className={`hidden size-14 shrink-0 items-center justify-center rounded-12 sm:flex ${tinted ? "bg-bg-surface/0" : ""} ${s.tile}`}>
        <Glyph icon={BookOpen} size={20} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
          <h3 className="type-title text-text-primary">
            <Link href={`/trainer/programs/${p.id}`} className="rounded-8 hover:underline focus-ring">
              {p.title}
            </Link>
          </h3>
          {p.courses.mode && <ProgramModePill mode={p.courses.mode} />}
          <PhasePill phase={p.phase} />
        </div>
        {subtitle && <p className="line-clamp-2 type-body text-text-secondary">{subtitle}</p>}

        <div className={`flex flex-wrap items-center gap-x-2.5 gap-y-2 rounded-8 px-3 py-2.5 ${tinted ? "bg-bg-surface" : "bg-bg-page"}`}>
          {/* Item order follows Figma 262:2211 from the start edge; inside an item the label precedes its value. */}
          {p.phase === "published" || p.phase === "suspended" ? (
            <>
              {p.courses.rating !== null && <Meta icon={Star} label={formatRating(p.courses.rating)} value={`من ${pluralAr(p.courses.ratings, ["تقييم واحد", "تقييمين", "تقييمات", "تقييمًا"])}`} valueClass="text-state-warning" />}
              <Meta icon={Users} label={formatNumber(p.courses.learners)} value="مسجّلًا" />
              <Meta
                icon={CalendarDays}
                value={p.courses.published ? pluralAr(p.courses.published, ["دورة واحدة", "دورتان", "دورات", "دورة"]) : "لا دورات بعد"}
                valueClass="text-text-muted"
              />
              {p.courses.running > 0 ? (
                <span className="type-caption text-state-success">منها {toArabicDigits(p.courses.running)} جارية</span>
              ) : p.courses.upcoming > 0 ? (
                <span className="type-caption text-text-primary">{p.courses.upcoming === 1 ? "واحدة قادمة" : `${toArabicDigits(p.courses.upcoming)} قادمة`}</span>
              ) : null}
            </>
          ) : p.phase === "draft" ? (
            <>
              <Meta icon={FileText} label="النسخة:" value={versionLabelAr(p.revision)} />
              <Meta icon={Upload} label="المواد:" value={filesWord(p.files)} />
              {p.missing.length > 0 ? (
                <Meta icon={CircleAlert} label="ناقص:" value={missingSummary(p.missing.slice(0, 2), true)} valueClass="text-state-error" />
              ) : (
                <Meta icon={CircleCheck} value="جاهزة للإقرار" valueClass="text-state-success" />
              )}
            </>
          ) : (
            <>
              {p.phase === "under_review" && <Meta icon={Upload} label="المواد:" value={filesWord(p.files)} />}
              {p.phase === "under_review" && p.submittedAt && <Meta icon={Hourglass} label="متبقٍ:" value={businessDaysWord(reviewDaysLeft(p.submittedAt))} />}
              {p.phase !== "under_review" && <Meta icon={FileText} label="الدورات:" value={p.courses.published ? toArabicDigits(p.courses.published) : "—"} />}
              {p.phase === "needs_changes" && p.decidedAt && <Meta icon={Clock} label="رُدّ قبل:" value={formatRelative(p.decidedAt).replace(/^منذ /, "")} />}
              <Meta icon={CalendarDays} label="النسخة:" value={versionLabelAr(p.revision)} />
            </>
          )}
        </div>

        {p.phase === "needs_changes" && finding && (
          <p className="flex items-start gap-2.5 rounded-8 bg-bg-surface px-3 py-2.5 type-caption text-state-error">
            <Glyph icon={CircleAlert} size={16} className="mt-0.5" />
            <span>
              سبب الرد المصنَّف: {finding.note || finding.label}
              {finding.label ? ` عدّل حقل «${finding.label}» تحديدًا.` : ""}
            </span>
          </p>
        )}
        {p.phase === "rejected" && p.request && (
          <p className="flex items-start gap-2.5 rounded-8 bg-bg-surface px-3 py-2.5 type-caption text-state-error">
            <Glyph icon={CircleAlert} size={16} className="mt-0.5" />
            <span>السبب المصنَّف: {p.request.reason ?? "—"}. قرار نهائي لهذه النسخة — يمكنك إنشاء نسخة جديدة.</span>
          </p>
        )}
        {p.phase === "under_review" && p.submittedAt && (
          <p className="flex items-start gap-2.5 rounded-8 bg-bg-surface px-3 py-2.5 type-caption text-state-warning">
            <Glyph icon={Hourglass} size={16} className="mt-0.5" />
            <span>أُرسل {formatRelative(p.submittedAt)} مع الإقرار. لا يمكن التعديل أثناء المراجعة — اسحب الطلب أولًا إن أردت.</span>
          </p>
        )}
        {p.phase === "draft" && (
          <p className="flex items-start gap-2.5 rounded-8 bg-bg-surface px-3 py-2.5 type-caption text-text-muted">
            <Glyph icon={FileText} size={16} className="mt-0.5" />
            <span>
              {p.missing.length > 0
                ? `يتبقى ${p.missing.length === 2 ? "حقلان إلزاميان" : p.missing.length === 1 ? "حقل إلزامي واحد" : `${toArabicDigits(p.missing.length)} حقول إلزامية`} قبل إتاحة الإرسال: ${missingSummary(p.missing)}.`
                : "كل الحقول الإلزامية مكتملة — عاين البرنامج ثم انتقل إلى الإقرار والإرسال."}
            </span>
          </p>
        )}
      </div>
      <div className="flex shrink-0 flex-row items-center gap-3 sm:flex-col sm:gap-2.5">
        <ButtonLink href={primary.href} variant={primary.variant} className="max-sm:flex-1">
          {primary.label}
        </ButtonLink>
        <Link href={secondary.href} className="rounded-8 type-caption text-text-brand hover:underline focus-ring">
          {secondary.label}
        </Link>
      </div>
    </article>
  );
}

/** TRR-PRG-01 · empty (262:2770). */
function EmptyPrograms() {
  const journey = [
    { icon: FileText, title: "اكتب البرنامج", body: "الوصف · الأهداف · المواد · السعر" },
    { icon: Eye, title: "عاين وأقرّ", body: "معاينة كما يراها المتدرب ثم إقرار موثَّق" },
    { icon: Hourglass, title: "مراجعة المنصة", body: "٣ أيام عمل · قد يُطلب تعديل بسبب مصنَّف", tone: "text-state-warning" },
    { icon: CircleCheck, title: "منشور", body: "يظهر للمتدربين وتنشئ منه دورات", tone: "text-state-success" },
  ];
  return (
    <>
      <TopBar title="برامجي" subtitle="ابدأ أول برنامج" />
      <PageBody className="!gap-6">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-[28px] leading-[1.2] font-bold text-text-primary sm:text-[36px]">برامجي</h2>
          <p className="type-body-lg text-text-secondary">لم تنشئ أي برنامج بعد. البرنامج هو أول خطوة نحو أول دورة وأول إيراد.</p>
        </div>
        <section className="flex flex-col items-center gap-6 rounded-22 bg-bg-brand-tint px-5 py-11 text-center sm:px-10">
          <span className="flex size-[88px] items-center justify-center rounded-22 bg-bg-surface text-text-brand">
            <Glyph icon={BookOpen} size={32} />
          </span>
          <h3 className="text-[32px] leading-[1.2] font-bold text-text-primary sm:text-[48px]">أنشئ برنامجك الأول</h3>
          <p className="type-body-lg text-text-secondary">
            البرنامج هو المحتوى المعتمد الذي تبيعه. بعد اعتماده تنشئ منه دورات بتواريخ وأماكن مختلفة — دون إعادة كتابة المحتوى في كل مرة.
          </p>
          <ButtonLink href="/trainer/programs/new" size="l" className="min-w-[300px] max-sm:w-full max-sm:min-w-0">
            أنشئ برنامجًا من الصفر
          </ButtonLink>
        </section>
        <section className="flex flex-col gap-5 rounded-16 border border-border-default bg-bg-card p-6 shadow-card">
          <h3 className="type-h3 text-text-primary">كيف تسير رحلة البرنامج؟</h3>
          {/* Figma places the journey right-to-left from «منشور»; DOM keeps the logical order. */}
          <ol className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:flex xl:flex-row-reverse xl:gap-10">
            {journey.map((j) => (
              <li key={j.title} className="flex flex-1 flex-col items-center gap-3 rounded-12 bg-bg-page px-4 py-5 text-center">
                <span className={`flex size-12 items-center justify-center rounded-12 bg-bg-brand-tint ${j.tone ?? "text-text-brand"}`}>
                  <Glyph icon={j.icon} size={20} />
                </span>
                <span className="type-subtitle text-text-primary">{j.title}</span>
                <span className="type-caption text-text-muted">{j.body}</span>
              </li>
            ))}
          </ol>
        </section>
        <section className="flex items-start gap-4 rounded-16 bg-state-warning-bg px-5 py-5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-8 bg-bg-surface text-state-warning">
            <Glyph icon={Lightbulb} size={20} />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <p className="type-subtitle text-state-warning">نصيحة من برامج نجحت</p>
            <p className="type-body text-text-secondary">
              البرامج التي تُعتمد من أول مراجعة تشترك في شيء واحد: أهداف تعلّم قابلة للقياس. «فهم إدارة المخاطر» يُرفض · «بناء مصفوفة مخاطر لمشروع حقيقي خلال ٤٥ دقيقة» يُعتمد.
            </p>
          </div>
        </section>
      </PageBody>
    </>
  );
}
