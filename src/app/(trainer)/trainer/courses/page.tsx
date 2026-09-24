import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, List, Search } from "lucide-react";
import { PageBody, TopBar } from "@/components/layout/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { ChipLink } from "@/components/ui/Chip";
import { Glyph } from "@/components/ui/Icon";
import { Pagination } from "@/components/ui/Navigation";
import { BulkCourseList, type BulkRow } from "@/components/trainer-courses/BulkCourseList";
import { SortSelect } from "@/components/trainer-courses/SortSelect";
import {
  CourseCard,
  EmptyCourses,
  LiveReadyCard,
  SidePanels,
  StatsRow,
  cardNote,
  placeLabel,
} from "@/components/trainer-courses/CourseListParts";
import { requireTrainer } from "@/lib/auth";
import { listTrainerCourses, type TrainerCourseItem } from "@/lib/data/trainer-courses";
import { daysUntil } from "@/lib/trainer-courses";
import { pluralAr, toArabicDigits } from "@/lib/format";

export const metadata: Metadata = { title: "دوراتي", description: "التنفيذ المجدول لبرامجك المنشورة" };

const FILTERS = [
  { key: "all", label: "الكل" },
  { key: "running", label: "جارية" },
  { key: "upcoming", label: "قادمة" },
  { key: "full", label: "اكتملت المقاعد" },
  { key: "ended", label: "منتهية" },
  { key: "cancelled", label: "ملغاة" },
] as const;

const BULK_FILTERS = [
  { key: "all", label: "الكل" },
  { key: "attendance", label: "تحتاج رصد حضور" },
  { key: "running", label: "جارية" },
  { key: "upcoming", label: "قادمة" },
  { key: "full", label: "اكتملت المقاعد" },
  { key: "week", label: "هذا الأسبوع" },
] as const;

const PAGE_SIZE = 10;

function matches(c: TrainerCourseItem, key: string): boolean {
  if (key === "all") return true;
  if (key === "attendance") return Boolean(c.missedAttendance);
  if (key === "week") {
    const s = c.nextSession?.startsAt ?? c.startsAt;
    return Boolean(s && daysUntil(s) >= 0 && daysUntil(s) <= 7);
  }
  return c.state === key;
}

function searchable(c: TrainerCourseItem) {
  return [c.title, c.programTitle, c.venue, c.city].filter(Boolean).join(" ").toLowerCase();
}

const arg = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");

/** TRR-CRS-01 · دوراتي — default 271:3915, empty 313:10290, bulk 327:11990, live ready 4236:2. */
export default async function TrainerCoursesPage({ searchParams }: PageProps<"/trainer/courses">) {
  const user = await requireTrainer("/trainer/courses");
  const sp = await searchParams;
  const q = arg(sp.q).trim();
  const view = arg(sp.view) === "select" ? "select" : "list";
  const filter = arg(sp.status) || "all";
  const sort = arg(sp.sort) || "soonest";
  const page = Math.max(1, Number(arg(sp.page)) || 1);
  const data = await listTrainerCourses(user.id);
  const { items } = data;

  if (items.length === 0) {
    return (
      <>
        <TopBar title="دوراتي" subtitle="لا دورات بعد" />
        <PageBody className="gap-6">
          <div className="flex flex-col gap-1.5">
            <h2 className="text-[28px] leading-[1.2] font-bold text-text-primary sm:text-[36px]">دوراتي</h2>
            <p className="type-body-lg text-text-secondary">الدورة هي التنفيذ المجدول لبرنامج منشور — بتاريخ ومكان ومقاعد.</p>
          </div>
          <EmptyCourses program={data.firstProgram} />
        </PageBody>
      </>
    );
  }

  const searched = q ? items.filter((c) => searchable(c).includes(q.toLowerCase())) : items;
  const href = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const next = { q: q || undefined, view: view === "select" ? "select" : undefined, status: filter === "all" ? undefined : filter, sort: sort === "soonest" ? undefined : sort, ...patch };
    Object.entries(next).forEach(([k, v]) => v && p.set(k, v));
    const s = p.toString();
    return `/trainer/courses${s ? `?${s}` : ""}`;
  };
  const running = data.stats.running;
  const subtitle = `${pluralAr(items.length, ["دورة واحدة", "دورتان", "دورات", "دورة"])} · ${pluralAr(running, ["واحدة جارية", "اثنتان جاريتان", "جارية", "جارية"])} و${toArabicDigits(data.stats.activeTrainees)} متدربًا نشطًا. الدورة تنفيذ مجدول لبرنامج منشور.`;

  if (view === "select") {
    const filtered = searched.filter((c) => matches(c, filter));
    const sorted = [...filtered].sort((a, b) => {
      if (sort === "newest") return b.createdAt.localeCompare(a.createdAt);
      if (sort === "title") return a.title.localeCompare(b.title, "ar");
      const ka = a.nextSession?.startsAt ?? a.startsAt ?? "9999";
      const kb = b.nextSession?.startsAt ?? b.startsAt ?? "9999";
      return ka.localeCompare(kb);
    });
    const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
    const current = Math.min(page, pageCount);
    const rows: BulkRow[] = sorted.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE).map((c) => {
      const missed = c.missedAttendance;
      const d = c.startsAt ? daysUntil(c.startsAt) : null;
      return {
        id: c.id,
        title: c.title,
        place: placeLabel(c),
        alert: Boolean(missed),
        upcoming: d !== null && d > 0,
        note: missed
          ? `الجلسة ${toArabicDigits(missed.position)} · انتهت ${daysUntil(missed.endsAt) === -1 ? "أمس" : "مؤخرًا"}`
          : d !== null && d > 0
            ? `تبدأ بعد ${pluralAr(d, ["يوم واحد", "يومين", "أيام", "يومًا"])}`
            : cardNote(c).text,
      };
    });
    return (
      <>
        <TopBar title="دوراتي" subtitle="تحديد وإجراء جماعي" />
        <PageBody className="gap-6">
          <div className="flex flex-col gap-1.5">
            <h2 className="text-[28px] leading-[1.2] font-bold text-text-primary sm:text-[36px]">دوراتي</h2>
            <p className="type-body-lg text-text-secondary">حدّد دورات من {toArabicDigits(items.length)}. نفّذ إجراءً واحدًا عليها جميعًا بدل فتح كل دورة على حدة.</p>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <form action="/trainer/courses" className="relative flex-1" role="search">
              <input type="hidden" name="view" value="select" />
              <label htmlFor="bulk-q" className="sr-only">
                ابحث في الدورات
              </label>
              <input
                id="bulk-q"
                name="q"
                defaultValue={q}
                placeholder={`ابحث في ${toArabicDigits(items.length)} دورة بالاسم أو البرنامج أو المكان`}
                className="h-12 w-full rounded-12 border-[1.5px] border-border-default bg-bg-surface ps-4 pe-11 type-body text-text-primary outline-none placeholder:text-text-muted focus:border-2 focus:border-action-primary"
              />
              <Glyph icon={Search} size={16} className="pointer-events-none absolute end-4 top-4 text-text-secondary" />
            </form>
            <SortSelect value={sort} />
          </div>
          <nav aria-label="تصفية الدورات" className="flex flex-wrap gap-2.5">
            {BULK_FILTERS.map((f) => (
              <ChipLink key={f.key} href={href({ status: f.key === "all" ? undefined : f.key, page: undefined })} selected={filter === f.key}>
                {f.label} · {toArabicDigits(searched.filter((c) => matches(c, f.key)).length)}
              </ChipLink>
            ))}
          </nav>
          {rows.length === 0 ? (
            <p className="rounded-16 border-[1.5px] border-border-divider bg-bg-page px-6 py-10 text-center type-body text-text-secondary">لا دورات تطابق هذا التصفية.</p>
          ) : (
            <BulkCourseList key={`${filter}-${q}-${current}-${sort}`} rows={rows} total={items.length} />
          )}
          <div className="flex justify-center">
            <Pagination page={current} pageCount={pageCount} hrefFor={(p) => href({ page: String(p) })} />
          </div>
          <Link href={href({ view: undefined, page: undefined })} className="self-center rounded-8 type-subtitle text-text-brand hover:underline focus-ring">
            العودة إلى البطاقات
          </Link>
        </PageBody>
      </>
    );
  }

  const shown = searched.filter((c) => matches(c, filter));
  return (
    <>
      <TopBar title="دوراتي" subtitle="التنفيذ المجدول لبرامجك المنشورة" />
      <PageBody className="gap-6">
        <div className="flex flex-col-reverse gap-5 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <h2 className="text-[28px] leading-[1.2] font-bold text-text-primary sm:text-[36px]">دوراتي</h2>
            <p className="type-body-lg text-text-secondary">{subtitle}</p>
          </div>
          <ButtonLink href={data.firstProgram ? `/trainer/courses/new?program=${data.firstProgram.id}` : "/trainer/programs"} size="l" className="self-start sm:self-center">
            أنشئ دورة جديدة
          </ButtonLink>
        </div>

        {data.liveReady && <LiveReadyCard c={data.liveReady} />}

        <StatsRow stats={data.stats} />

        <div className="flex flex-col-reverse gap-4 sm:flex-row sm:items-center">
          <form action="/trainer/courses" className="relative flex-1" role="search">
            {filter !== "all" && <input type="hidden" name="status" value={filter} />}
            <label htmlFor="courses-q" className="sr-only">
              ابحث في دوراتي
            </label>
            <input
              id="courses-q"
              name="q"
              defaultValue={q}
              placeholder="ابحث بالاسم أو البرنامج أو المكان"
              className="h-12 w-full rounded-12 border-[1.5px] border-border-default bg-bg-surface ps-4 pe-11 type-body text-text-primary outline-none placeholder:text-text-muted focus:border-2 focus:border-action-primary"
            />
            <Glyph icon={Search} size={16} className="pointer-events-none absolute end-4 top-4 text-text-secondary" />
          </form>
          <div className="flex shrink-0 gap-1 self-start rounded-12 bg-bg-page p-1">
            <span aria-current="page" className="flex items-center gap-1.5 rounded-8 bg-bg-surface px-4 py-2.5 type-subtitle text-text-brand shadow-card">
              قائمة
              <Glyph icon={List} size={16} />
            </span>
            <Link href="/trainer/calendar" className="flex items-center gap-1.5 rounded-8 px-4 py-2.5 type-subtitle text-text-muted hover:text-text-primary focus-ring">
              تقويم
              <Glyph icon={CalendarDays} size={16} />
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {FILTERS.map((f) => (
            <ChipLink key={f.key} href={href({ status: f.key === "all" ? undefined : f.key })} selected={filter === f.key} className={f.key === "all" ? "min-w-[120px]" : ""}>
              {f.label} · {toArabicDigits(searched.filter((c) => matches(c, f.key)).length)}
            </ChipLink>
          ))}
          <Link href={href({ view: "select" })} className="ms-auto rounded-8 type-subtitle text-text-brand hover:underline focus-ring">
            تحديد وإجراء جماعي
          </Link>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            {shown.length === 0 ? (
              <p className="rounded-16 border-[1.5px] border-border-divider bg-bg-page px-6 py-10 text-center type-body text-text-secondary">
                {q ? `لا دورات تطابق «${q}».` : "لا دورات في هذه الحالة."}
              </p>
            ) : (
              shown.map((c) => <CourseCard key={c.id} c={c} />)
            )}
          </div>
          <SidePanels availability={data.availability} />
        </div>
      </PageBody>
    </>
  );
}
