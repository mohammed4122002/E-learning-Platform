import type { Metadata } from "next";
import {
  Building2,
  CircleCheck,
  CircleAlert,
  Compass,
  Eye,
  LayoutGrid,
  Lightbulb,
  MessagesSquare,
  ShieldCheck,
  Star,
  TrendingDown,
  TrendingUp,
  SquareUser,
  Users,
} from "lucide-react";
import { PageBody, TopBar } from "@/components/layout/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { ChipLink } from "@/components/ui/Chip";
import { Glyph } from "@/components/ui/Icon";
import { RatingStars } from "@/components/ui/Rating";
import { RatingCard } from "@/components/trainer-ops/Ratings";
import { MiniPill, OpsCard, RuleRow, SideCard, type OpsTone } from "@/components/trainer-ops/parts";
import { requireTrainer } from "@/lib/auth";
import { avg, getTrainerRatings, type RatingItem } from "@/lib/data/trainer-ratings";
import { formatRating, pluralAr, toArabicDigits } from "@/lib/format";

export const metadata: Metadata = { title: "التقييمات", description: "ما يقوله متدربوك وكيف تتعامل معه" };

const n = toArabicDigits;
const FILTERS = ["month", "low", "pending", "all"] as const;
type Filter = (typeof FILTERS)[number];
const month = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-arab", { month: "long", timeZone: "Asia/Riyadh" });
const one = (v: number) => new Intl.NumberFormat("ar-SA-u-nu-arab", { maximumFractionDigits: 1 }).format(v);

type CourseStat = { courseId: string; label: string; startsAt: string; value: number; items: RatingItem[] };

function byCourse(items: RatingItem[]): CourseStat[] {
  const map = new Map<string, CourseStat>();
  items.forEach((r) => {
    const c = map.get(r.courseId) ?? { courseId: r.courseId, label: month.format(new Date(r.courseStartsAt ?? r.createdAt)), startsAt: r.courseStartsAt ?? r.createdAt, value: 0, items: [] };
    c.items.push(r);
    map.set(r.courseId, c);
  });
  return [...map.values()].map((c) => ({ ...c, value: avg(c.items.map((r) => r.score)) })).sort((a, b) => b.startsAt.localeCompare(a.startsAt));
}

const barTone = (v: number): OpsTone => (v >= 4.7 ? "success" : v >= 4 ? "warning" : "error");
const BAR: Record<string, string> = { success: "bg-state-success", warning: "bg-state-warning", error: "bg-state-error" };
const TEXT: Record<string, string> = { success: "text-state-success", warning: "text-state-warning", error: "text-state-error" };

function Steps() {
  const steps = [
    { icon: CircleCheck, tone: "text-state-success", title: "تنتهي دورتك", body: "ويُفتح التقييم للمتدربين" },
    { icon: Star, tone: "text-state-warning", title: "يقيّمون ٣ محاور", body: "خلال ٣٠ يومًا" },
    { icon: SquareUser, tone: "text-text-brand", title: "يظهر في ملفك", body: "ويمكنك الرد على كل تقييم" },
  ];
  return (
    <ol className="grid gap-4 sm:grid-cols-3">
      {steps.map((s) => (
        <li key={s.title} className="flex flex-col items-center gap-3 rounded-16 bg-bg-page px-5 py-6 text-center">
          <span className={`flex size-14 items-center justify-center rounded-12 bg-bg-surface ${s.tone}`}>
            <Glyph icon={s.icon} size={24} />
          </span>
          <span className="type-title text-text-primary">{s.title}</span>
          <span className="type-body text-text-muted">{s.body}</span>
        </li>
      ))}
    </ol>
  );
}

/** TRR-RTG-01 · التقييمات (280:6049) · empty «لا تقييمات بعد» (313:10890). */
export default async function TrainerRatingsPage(props: PageProps<"/trainer/ratings">) {
  const sp = await props.searchParams;
  const user = await requireTrainer("/trainer/ratings");
  const items = await getTrainerRatings(user.id);

  if (items.length === 0) {
    return (
      <>
        <TopBar title="التقييمات" subtitle="لا تقييمات بعد" />
        <PageBody className="gap-6">
          <header className="flex flex-col gap-2">
            <h1 className="text-[28px] leading-[1.2] font-bold text-text-primary sm:text-[36px]">التقييمات والسمعة</h1>
            <p className="type-body-lg text-text-secondary">تقييمات متدربيك هي أقوى ما يقنع الجهات بالتعاقد معك.</p>
          </header>
          <section className="flex flex-col items-center gap-5 rounded-22 bg-bg-brand-tint px-5 py-12 text-center">
            <span className="flex size-24 items-center justify-center rounded-22 bg-bg-surface text-state-warning">
              <Glyph icon={Star} size={32} />
            </span>
            <h2 className="text-[32px] leading-[1.2] font-bold text-text-primary sm:text-[44px]">لا تقييمات بعد</h2>
            <p className="max-w-[968px] type-body-lg text-text-secondary">يظهر أول تقييم بعد انتهاء أول دورة لك. المتدرب يقيّم ثلاثة محاور: جودة المحتوى · أداء المدرب · التنظيم والالتزام بالوقت.</p>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <ButtonLink href="/trainer/courses" size="l" className="sm:min-w-[320px]">
                اعرض دوراتي
              </ButtonLink>
              <ButtonLink href="/trainer/profile" variant="outline" size="l" className="bg-bg-surface sm:min-w-[240px]">
                اعرض ملفي المهني
              </ButtonLink>
            </div>
          </section>
          <OpsCard title="كيف تسير الخطوات؟" titleId="steps-title" titleSize="h2">
            <Steps />
          </OpsCard>
          <section className="flex items-start gap-4 rounded-22 bg-state-warning-bg px-5 py-5 sm:px-6">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-12 bg-bg-surface text-state-warning">
              <Glyph icon={Lightbulb} size={20} />
            </span>
            <div className="flex flex-col gap-1.5">
              <h2 className="type-h3 text-state-warning">التقييم لا يُحذف ولا يُخفى</h2>
              <p className="type-body-lg text-text-secondary">هذا ما يجعله ذا قيمة. ما تملكه هو حق الرد – والرد المهني على نقد صادق يرفع ثقة القارئ أكثر من تقييم كامل بلا رد.</p>
            </div>
          </section>
        </PageBody>
      </>
    );
  }

  const overall = avg(items.map((r) => r.score));
  const courses = byCourse(items);
  const recent = courses.slice(0, 2).flatMap((c) => c.items);
  const earlier = courses.slice(2).flatMap((c) => c.items);
  const recentAvg = avg(recent.map((r) => r.score));
  const earlierAvg = earlier.length ? avg(earlier.map((r) => r.score)) : null;
  const drop = earlierAvg !== null ? Math.round((earlierAvg - recentAvg) * 10) / 10 : 0;
  const falling = drop >= 0.2;
  const rising = drop <= -0.2;
  const grade = overall >= 4.5 ? "ممتاز" : overall >= 4 ? "جيد جدًا" : overall >= 3 ? "جيد" : "يحتاج عناية";
  const title = `تقييمك ${grade}${falling ? " – لكنه ينخفض" : rising ? " – ويتحسّن" : ""}`;

  const now = new Date().getTime();
  const inMonth = (r: RatingItem) => now - new Date(r.createdAt).getTime() < 30 * 86_400_000;
  const low = (r: RatingItem) => r.score <= 3;
  const pendingReply = (r: RatingItem) => r.reply?.status !== "published" && r.reply?.status !== "skipped";
  const filter: Filter = FILTERS.includes(sp.filter as Filter) ? (sp.filter as Filter) : "all";
  const shown = items.filter((r) => (filter === "month" ? inMonth(r) : filter === "low" ? low(r) : filter === "pending" ? pendingReply(r) : true));
  const pending = items.filter(pendingReply);
  const counts: Record<Filter, number> = { month: items.filter(inMonth).length, low: items.filter(low).length, pending: pending.length, all: items.length };
  const labels: Record<Filter, string> = { month: "هذا الشهر", low: "٣ نجوم فأقل", pending: "بانتظار ردي", all: "الكل" };
  const bars = courses.slice(0, 5);
  const lowRecent = recent.filter(low);
  const axes = [
    { label: "المحتوى", pick: (r: RatingItem) => r.content },
    { label: "أداء المدرب", pick: (r: RatingItem) => r.trainer },
    ...(items.some((r) => r.organization !== null) ? [{ label: "التنظيم والوقت", pick: (r: RatingItem) => r.organization }] : []),
  ].map((a) => {
    const cur = avg(recent.map(a.pick).filter((x): x is number => x !== null));
    const prev = earlier.length ? avg(earlier.map(a.pick).filter((x): x is number => x !== null)) : cur;
    const d = Math.round((prev - cur) * 10) / 10;
    return { ...a, cur, d };
  });

  return (
    <>
      <TopBar title="التقييمات" subtitle="ما يقوله متدربوك وكيف تتعامل معه" />
      <PageBody className="gap-6">
        <section className={`flex flex-col gap-5 rounded-22 px-5 py-6 sm:flex-row sm:items-center sm:gap-8 sm:px-7 ${falling ? "bg-state-warning-bg" : "bg-state-success-bg"}`}>
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            {(falling || rising) && (
              <div className="flex flex-wrap gap-2">
                <MiniPill icon={falling ? TrendingDown : TrendingUp} tone={falling ? "error" : "success"}>
                  {`${falling ? "انخفاض" : "تحسّن"} ${one(Math.abs(drop))} خلال آخر دورتين`}
                </MiniPill>
              </div>
            )}
            <h1 className="text-[26px] leading-[1.25] font-bold text-text-primary sm:text-[36px]">{title}</h1>
            <p className="type-body-lg text-text-secondary">
              {falling
                ? `نزل متوسطك من ${one(earlierAvg ?? overall)} إلى ${one(recentAvg)} خلال آخر دورتين. ${lowRecent.length ? "حلّلنا التقييمات المنخفضة – اقرأ التحليل أدناه قبل دورتك القادمة." : ""}`
                : `متوسطك ${formatRating(overall)} من ${pluralAr(items.length, ["تقييم واحد", "تقييمين", "تقييمات", "تقييمًا"])} على ${pluralAr(courses.length, ["دورة واحدة", "دورتين", "دورات", "دورة"])}.`}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-center gap-2 self-center rounded-16 bg-bg-surface px-8 py-5">
            <span className={`text-[48px] leading-none font-bold ${falling ? "text-state-warning" : "text-state-success"}`}>{formatRating(overall)}</span>
            <RatingStars value={overall} size="m" />
            <span className="type-caption text-text-muted">{`من ${pluralAr(items.length, ["تقييم واحد", "تقييمين", "تقييمات", "تقييمًا"])}`}</span>
          </div>
        </section>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="flex min-w-0 flex-1 flex-col gap-6">
            <OpsCard title="اتجاه تقييمك عبر الدورات" titleId="trend-title">
              <ul aria-label="متوسط التقييم لكل دورة" className="flex h-[200px] items-end gap-3 sm:gap-5">
                {bars.map((c) => {
                  const tone = barTone(c.value);
                  return (
                    <li key={c.courseId} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
                      <span className={`type-caption ${TEXT[tone]}`}>{formatRating(c.value)}</span>
                      <span aria-hidden className={`w-full max-w-[84px] rounded-t-8 ${BAR[tone]}`} style={{ height: `${Math.max(12, (c.value / 5) * 140)}px` }} />
                      <span className="w-full truncate text-center type-caption text-text-muted" title={c.items[0]?.courseTitle}>
                        {c.label}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </OpsCard>

            {falling && (
              <section aria-labelledby="why-title" className="flex flex-col gap-4 rounded-22 border-2 border-state-info bg-state-info-bg px-5 py-6 sm:px-6">
                <h2 id="why-title" className="flex items-center gap-2 type-h3 text-state-info">
                  <Glyph icon={Lightbulb} size={20} />
                  لماذا انخفض تقييمك؟
                </h2>
                <p className="type-body text-text-secondary">
                  {`حلّلنا ${pluralAr(lowRecent.length || recent.length, ["تقييمًا واحدًا", "تقييمين", "تقييمات", "تقييمًا"])}${lowRecent.length ? " بثلاث نجوم أو أقل" : ""} في آخر دورتين. المحاور تُقيَّم منفصلة${axes.filter((a) => a.d >= 0.2).length === 1 ? "، والانخفاض جاء من محور واحد فقط." : "."}`}
                </p>
                <ul className="flex flex-col gap-3">
                  {axes.map((a) => {
                    const bad = a.d >= 0.2;
                    return (
                      <li key={a.label} className="flex flex-col gap-2.5 rounded-16 bg-bg-surface px-4 py-4">
                        <div className="flex items-center justify-between gap-3">
                          <span className="type-subtitle text-text-primary">{a.label}</span>
                          <span className={`type-subtitle ${bad ? "text-state-error" : "text-state-success"}`}>{formatRating(a.cur)}</span>
                        </div>
                        <div className="h-2.5 w-full overflow-hidden rounded-full bg-border-default">
                          <div className={`h-full rounded-full ${bad ? "bg-state-error" : "bg-state-success"}`} style={{ width: `${(a.cur / 5) * 100}%` }} />
                        </div>
                        <span className={`type-caption ${bad ? "text-state-error" : "text-state-success"}`}>{bad ? `انخفض ${one(a.d)} نقطة` : "ثابت – لا مشكلة"}</span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            <OpsCard
              title="التقييمات الواردة"
              titleId="incoming-title"
              aside={
                pending.length > 0 ? (
                  <MiniPill icon={CircleAlert} tone="error" onTint={false}>
                    {`${n(pending.length)} بانتظار ردك`}
                  </MiniPill>
                ) : undefined
              }
            >
              <nav aria-label="تصفية التقييمات" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap">
                {FILTERS.map((f) => (
                  <ChipLink key={f} href={f === "all" ? "/trainer/ratings" : `/trainer/ratings?filter=${f}`} selected={filter === f}>
                    {`${labels[f]} · ${n(counts[f])}`}
                  </ChipLink>
                ))}
              </nav>
              {shown.length === 0 ? (
                <p className="rounded-16 bg-bg-page px-5 py-6 text-center type-body text-text-muted">لا تقييمات في هذا التصنيف.</p>
              ) : (
                <ul className="flex flex-col gap-4">
                  {shown.map((r) => (
                    <RatingCard key={r.id} r={r} replyLabel="ردّك" menu />
                  ))}
                </ul>
              )}
              {pending[0] && (
                <ButtonLink href={`/trainer/ratings/${pending[0].id}/reply`} size="l" fullWidth>
                  ردّ على التقييمات المعلّقة
                </ButtonLink>
              )}
            </OpsCard>
          </div>

          <div className="flex w-full shrink-0 flex-col gap-5 lg:w-[380px]">
            <SideCard title="قواعد الرد" titleId="rules-title">
              <ul className="flex flex-col gap-3">
                <RuleRow icon={MessagesSquare}>ردّ واحد لكل تقييم – لا يمكن تعديله</RuleRow>
                <RuleRow icon={Eye}>ردّك يظهر علنًا تحت التقييم</RuleRow>
                <RuleRow icon={CircleCheck} tone="success">
                  الرد المهني على نقد يرفع ثقة القرّاء
                </RuleRow>
                <RuleRow icon={ShieldCheck}>التقييم المخالف يُطلب مراجعته لا يُحذف</RuleRow>
              </ul>
            </SideCard>
            <SideCard title="تقييم مخالف؟" titleId="abuse-title" description="إن كان التقييم مسيئًا أو من متدرب لم يحضر أو يخالف الشروط، اطلب مراجعته. لا تحذف التقييمات السلبية لمجرد كونها سلبية.">
              <ButtonLink href="/trainer/ratings?filter=low" variant="outline" size="l" fullWidth>
                اطلب مراجعة تقييم
              </ButtonLink>
            </SideCard>
            <SideCard title="أثر تقييمك" titleId="effect-title">
              <ul className="flex flex-col gap-3">
                <RuleRow icon={LayoutGrid}>ترتيبك في نتائج البحث</RuleRow>
                <RuleRow icon={Compass} tone="warning">
                  مطابقتك مع طلبات الجهات
                </RuleRow>
                <RuleRow icon={Building2}>قرار الجهات بالارتباط بك</RuleRow>
                <RuleRow icon={Users}>قرار المتدربين بالشراء</RuleRow>
              </ul>
            </SideCard>
          </div>
        </div>
      </PageBody>
    </>
  );
}
