import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, CalendarX, Clock, Info, MapPin, Presentation, User } from "lucide-react";
import { TopBar, PageBody } from "@/components/layout/TopBar";
import { Breadcrumb } from "@/components/ui/Navigation";
import { Badge, Card } from "@/components/ui/Data";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Feedback";
import { Glyph } from "@/components/ui/Icon";
import { CourseCard } from "@/components/course/CourseCard";
import { NotifyButton, WaitlistButton } from "@/components/programs/RunActions";
import { requireTrainee } from "@/lib/auth";
import { getProgramRuns, getProgramTitle, type RunView } from "@/lib/data/programs";
import { MODE_FILTER_LABELS } from "@/lib/discover-params";
import { ENROLLMENT_STATUS } from "@/lib/labels";
import { formatDateRange, formatPrice, formatTimeRange, pluralAr, toArabicDigits } from "@/lib/format";
import type { BadgeTone } from "@/components/ui/Data";

export async function generateMetadata({ params }: PageProps<"/trainee/programs/[slug]/courses">): Promise<Metadata> {
  const { slug } = await params;
  const title = await getProgramTitle(slug);
  return { title: title ? `الدورات المتاحة · ${title}` : "البرنامج غير موجود" };
}

const STATE_BADGE: Record<RunView["state"], { tone: BadgeTone; bar: string } > = {
  available: { tone: "success", bar: "bg-state-success" },
  few: { tone: "warning", bar: "bg-state-warning" },
  full: { tone: "error", bar: "bg-state-error" },
  enrolled: { tone: "brand", bar: "bg-action-primary" },
  waitlisted: { tone: "info", bar: "bg-state-error" },
  unlimited: { tone: "success", bar: "bg-state-success" },
};

function stateLabel(run: RunView): string {
  switch (run.state) {
    case "available":
      return "مقاعد متاحة";
    case "few":
      return (run.seatsLeft ?? 0) >= 3 ? `تبقّت ${toArabicDigits(run.seatsLeft ?? 0)} مقاعد` : `تبقّى ${pluralAr(run.seatsLeft ?? 0, ["مقعد واحد", "مقعدان", "مقاعد", "مقعدًا"])}`;
    case "full":
      return "اكتمل العدد";
    case "enrolled":
      return "أنت مسجَّل";
    case "waitlisted":
      return "في قائمة الانتظار";
    case "unlimited":
      return "متاح دائمًا";
  }
}

function SessionCard({ run, programSlug }: { run: RunView; programSlug: string }) {
  const enrolled = run.state === "enrolled";
  const badge = STATE_BADGE[run.state];
  const taken = run.capacity !== null && run.seatsLeft !== null ? run.capacity - run.seatsLeft : null;
  const dates = run.dates.start ? formatDateRange(run.dates.start, run.dates.end) : "ابدأ فورًا · وصول دائم";

  return (
    <li
      className={`flex flex-col gap-5 rounded-16 border px-[22px] py-5 drop-shadow-milestone sm:flex-row sm:items-center ${
        enrolled ? "border-[1.5px] border-action-primary bg-bg-brand-tint" : "border-border-default bg-bg-card"
      }`}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="min-w-0 flex-1 type-title text-text-primary">{dates}</h2>
          <Badge tone={badge.tone} className="px-2.5">
            {stateLabel(run)}
          </Badge>
        </div>
        <ul className="flex flex-wrap items-center gap-x-[18px] gap-y-2 text-text-secondary">
          <li className="flex items-center gap-1.5">
            <Glyph icon={Presentation} size={16} />
            <span className="type-caption">{MODE_FILTER_LABELS[run.mode]}</span>
          </li>
          {run.trainer && (
            <li className="flex items-center gap-1.5">
              <Glyph icon={User} size={16} />
              <span className="type-caption">{run.trainer}</span>
            </li>
          )}
          <li className="flex items-center gap-1.5">
            <Glyph icon={MapPin} size={16} />
            <span className="type-caption">{run.place}</span>
          </li>
          {run.times && (
            <li className="flex items-center gap-1.5">
              <Glyph icon={Clock} size={16} />
              <span className="type-caption">{formatTimeRange(run.times.start, run.times.end)}</span>
            </li>
          )}
        </ul>
        {run.capacity !== null && taken !== null ? (
          <div className="flex flex-wrap items-center gap-2.5">
            <div
              role="progressbar"
              aria-label="المقاعد المحجوزة"
              aria-valuemin={0}
              aria-valuemax={run.capacity}
              aria-valuenow={taken}
              className="flex h-2 w-[200px] overflow-hidden rounded-full bg-border-default"
            >
              <div className={`h-full rounded-full ${badge.bar}`} style={{ width: `${Math.min(100, (taken / run.capacity) * 100)}%` }} />
            </div>
            <p className="type-caption text-text-muted">
              {toArabicDigits(taken)} من {pluralAr(run.capacity, ["مقعد واحد", "مقعدين", "مقاعد", "مقعدًا"])} محجوزة
            </p>
          </div>
        ) : (
          <p className="type-caption text-text-muted">مقاعد غير محدودة</p>
        )}
        <p dir="ltr" className="text-end font-mono text-[14px] leading-[1.5] text-text-muted">
          {run.reference}
        </p>
      </div>

      <div className="flex shrink-0 flex-row-reverse items-center justify-between gap-2 sm:flex-col sm:items-end">
        {enrolled ? (
          <>
            <p className="type-title text-text-muted">{run.enrollment?.paid ? "مدفوعة" : run.enrollment ? ENROLLMENT_STATUS[run.enrollment.status].label : ""}</p>
            <ButtonLink href="/trainee/trainings" variant="secondary" className="sm:min-w-[120px]">
              اعرض تسجيلي
            </ButtonLink>
          </>
        ) : (
          <>
            <p className="type-title text-text-primary">{run.price === 0 ? "مجانية" : formatPrice(run.price, run.currency)}</p>
            {run.state === "full" ? (
              <WaitlistButton courseId={run.id} programSlug={programSlug} dates={dates} />
            ) : run.state === "waitlisted" ? (
              <ButtonLink href="/trainee/queue" variant="outline" className="sm:min-w-[120px]">
                اعرض موقعي
              </ButtonLink>
            ) : (
              <ButtonLink href={`/courses/${run.slug}`} className="sm:min-w-[120px]">
                سجّل الآن
              </ButtonLink>
            )}
          </>
        )}
      </div>
    </li>
  );
}

/** TRN-DSC-03 · قائمة دورات البرنامج — Figma 111:2190 (default) and 111:2553 (فارغة). */
export default async function ProgramCoursesPage({ params, searchParams }: PageProps<"/trainee/programs/[slug]/courses">) {
  const { slug } = await params;
  const sp = await searchParams;
  const user = await requireTrainee(`/trainee/programs/${slug}/courses`);
  const view = await getProgramRuns(slug, user.id);
  if (!view) notFound();

  const city = typeof sp.city === "string" ? sp.city : "";
  const month = typeof sp.month === "string" && /^\d{4}-\d{2}$/.test(sp.month) ? sp.month : "";
  const base = `/trainee/programs/${view.program.slug}/courses`;
  const cities = [...new Set(view.runs.map((r) => r.city).filter((c): c is string => !!c))];
  const hasRemote = view.runs.some((r) => r.mode !== "in_person");
  const months = [...new Map(view.runs.filter((r) => r.month).map((r) => [r.month!.key, r.month!.label])).entries()].sort(([a], [b]) => a.localeCompare(b));
  const runs = view.runs.filter(
    (r) => (!city || (city === "remote" ? r.mode !== "in_person" : r.city === city)) && (!month || r.month?.key === month),
  );
  const chip = (label: string, params: { city?: string; month?: string }, active: boolean) => {
    const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]).toString();
    return (
      <li key={`${label}-${q}`}>
        <Link
          href={q ? `${base}?${q}` : base}
          scroll={false}
          aria-current={active ? "true" : undefined}
          className={`flex h-9 min-w-[72px] items-center justify-center rounded-full px-3.5 type-small whitespace-nowrap focus-ring ${
            active ? "border-[1.5px] border-action-primary bg-bg-brand-tint text-text-brand" : "border border-border-default bg-bg-surface text-text-primary hover:bg-bg-brand-tint"
          }`}
        >
          {label}
        </Link>
      </li>
    );
  };

  return (
    <>
      <TopBar title="الدورات المتاحة" subtitle={view.program.title} />
      <PageBody className="!gap-7">
        <Breadcrumb
          items={[
            { label: "الاكتشاف", href: "/trainee/discover" },
            { label: view.program.title, href: `/trainee/programs/${view.program.slug}` },
            { label: "الدورات المتاحة" },
          ]}
        />

        <Card as="div" className="flex items-center gap-[18px] px-[22px] py-[18px]">
          <span className="flex size-[52px] shrink-0 items-center justify-center rounded-12 bg-bg-brand-tint text-text-brand">
            <Glyph icon={BookOpen} size={20} />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <p className="type-title text-text-primary">{view.program.title}</p>
            <p className="type-caption text-text-muted">{view.program.meta}</p>
          </div>
          <ButtonLink href={`/trainee/programs/${view.program.slug}`} variant="ghost" className="max-sm:hidden">
            العودة للبرنامج
          </ButtonLink>
        </Card>

        <header className="flex flex-col gap-1.5">
          <h1 className="text-[28px] leading-[1.2] font-bold text-text-primary sm:text-[36px]">الدورات المتاحة</h1>
          <p className="type-body-lg text-text-secondary">
            {view.runs.length > 0 ? "اختر التاريخ والمكان الذي يناسبك. المقاعد تُحجز فور إتمام الدفع." : "لا توجد دورات مجدولة لهذا البرنامج حاليًا."}
          </p>
        </header>

        {view.runs.length === 0 ? (
          <>
            <EmptyState
              icon={BookOpen}
              className="border-dashed"
              title="لا دورات مجدولة حاليًا"
              description="هذا البرنامج منشور لكن لم تُجدول له دورات بعد. فعّل التنبيه وسنُشعرك فور فتح أول دورة."
              action={<NotifyButton programSlug={view.program.slug} targetName={view.followTarget.name} following={view.following} />}
            />
            {view.alternatives.length > 0 && (
              <Card className="flex flex-col gap-5 p-6">
                <h2 className="type-h3 text-text-primary">برامج بديلة في التخصص نفسه</h2>
                <ul className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {view.alternatives.map((c) => (
                    <li key={c.id} className="flex">
                      <CourseCard course={c} />
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </>
        ) : (
          <>
            {(cities.length > 0 || months.length > 1) && (
              <nav aria-label="تصفية الدورات">
                <ul className="flex flex-wrap items-center gap-2.5">
                  {chip("كل المدن", { month }, !city)}
                  {cities.map((c) => chip(c, { city: c, month }, city === c))}
                  {hasRemote && chip("عن بُعد", { city: "remote", month }, city === "remote")}
                  {months.length > 1 && months.map(([key, label]) => chip(label, { city, month: month === key ? "" : key }, month === key))}
                </ul>
              </nav>
            )}

            <p className="type-body text-text-secondary" aria-live="polite">
              {runs.length > 0 ? pluralAr(runs.length, ["دورة واحدة متاحة", "دورتان متاحتان", "دورات متاحة", "دورة متاحة"]) : "لا دورات تطابق هذا الاختيار"}
            </p>

            {runs.length > 0 ? (
              <ul className="flex flex-col gap-4">
                {runs.map((r) => (
                  <SessionCard key={r.id} run={r} programSlug={view.program.slug} />
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={CalendarX}
                title="لا دورات في هذا الاختيار"
                description="جرّب مدينة أو شهرًا آخر، أو اعرض كل الدورات المتاحة."
                action={<ButtonLink href={base}>اعرض كل الدورات</ButtonLink>}
              />
            )}

            <p className="flex items-center gap-3 rounded-12 bg-state-info-bg px-[18px] py-4 type-body text-state-info">
              <Glyph icon={Info} size={20} />
              عند اكتمال العدد يمكنك الانضمام لقائمة الانتظار — سنُشعرك فور شغور مقعد، ولك مهلة محددة لقبوله قبل انتقاله للتالي في الترتيب.
            </p>
          </>
        )}
      </PageBody>
    </>
  );
}
