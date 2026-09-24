import type { Metadata } from "next";
import { CircleCheck, Info } from "lucide-react";
import { PageBody, TopBar } from "@/components/layout/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { Glyph } from "@/components/ui/Icon";
import { Breadcrumb } from "@/components/ui/Navigation";
import { FilterChip, PageHeading } from "@/components/trainings/ui";
import { TrainerQueueCard, UPCOMING_ICONS, itemsWord } from "@/components/trainer/QueueParts";
import { requireTrainer } from "@/lib/auth";
import { getTrainerQueue, queueCounts } from "@/lib/data/trainer-queue";
import { toArabicDigits } from "@/lib/format";

export const metadata: Metadata = { title: "بانتظار إجرائي", description: "كل ما يحتاج قرارًا أو إجراءً منك" };

type Filter = "all" | "ratings" | "finance" | "courses" | "processing" | "action";
/** Visual order of the Figma chips (right → left). */
const FILTERS: { value: Filter; label: string; counted?: boolean }[] = [
  { value: "all", label: "الكل", counted: true },
  { value: "ratings", label: "التقييمات" },
  { value: "finance", label: "المالي" },
  { value: "courses", label: "الدورات" },
  { value: "processing", label: "قيد المعالجة", counted: true },
  { value: "action", label: "يحتاج إجراءك", counted: true },
];

/** TRR-QUE-01 · بانتظار إجرائي — default (256:1267) and empty (464:36175). */
export default async function TrainerQueuePage(props: PageProps<"/trainer/queue">) {
  const user = await requireTrainer("/trainer/queue");
  const sp = await props.searchParams;
  const filter = (FILTERS.find((f) => f.value === sp.filter)?.value ?? "all") as Filter;
  const { items, upcoming, doneThisWeek } = await getTrainerQueue(user.id);
  const counts = queueCounts(items);

  if (items.length === 0) {
    return (
      <>
        <TopBar title="ما يحتاج إجراءك" subtitle="لا مهام" />
        <PageBody className="gap-6">
          <Breadcrumb items={[{ label: "الرئيسية", href: "/trainer" }, { label: "ما يحتاج إجراءك" }]} />
          <div className="flex flex-col gap-[26px] lg:flex-row lg:items-start">
            <div className="flex min-w-0 flex-1 flex-col gap-6">
              <section className="flex flex-col items-center gap-[18px] rounded-22 bg-state-success-bg px-6 pt-14 pb-[58px] text-center sm:px-12">
                <span className="flex size-24 items-center justify-center rounded-22 bg-bg-surface text-state-success">
                  <Glyph icon={CircleCheck} size={32} />
                </span>
                <h2 className="text-[30px] leading-[1.15] font-bold text-text-primary sm:text-[38px]">لا شيء ينتظر إجراءك</h2>
                <p className="type-h3 text-text-secondary">أنهيت كل مهامك — لا واجبات بلا تقييم ولا حضور بلا رصد ولا عروض بلا رد. أحسنت.</p>
                <div className="flex w-full flex-col items-center justify-center gap-4 sm:flex-row">
                  <ButtonLink href="/trainer/courses" size="l" className="w-full sm:w-[240px]">
                    اعرض دوراتي
                  </ButtonLink>
                  <ButtonLink href="/trainer/opportunities" variant="outline" size="l" className="w-full sm:w-[240px]">
                    تصفّح فرصًا جديدة
                  </ButtonLink>
                </div>
              </section>
              {upcoming.length > 0 && (
                <section aria-labelledby="next-title" className="flex flex-col gap-5 rounded-22 border border-border-default bg-bg-card p-5 shadow-card sm:p-7">
                  <h2 id="next-title" className="type-h2 text-text-primary">
                    ما القادم؟
                  </h2>
                  <p className="type-body text-text-muted">لا مهام الآن — لكن هذه ستحتاج انتباهك قريبًا:</p>
                  <ul className="flex flex-col gap-5">
                    {upcoming.map((u) => (
                      <li key={u.key} className="flex items-start gap-3.5 rounded-16 bg-bg-page px-5 pt-[17px] pb-[19px]">
                        <span className="flex size-12 shrink-0 items-center justify-center rounded-12 bg-bg-surface text-text-brand">
                          <Glyph icon={UPCOMING_ICONS[u.icon]} size={24} />
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col gap-1">
                          <span className="type-title text-text-primary">{u.title}</span>
                          <span className="type-body text-text-muted">{u.detail}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
            <aside className="flex w-full flex-col lg:w-[400px] lg:shrink-0">
              <section aria-labelledby="week-title" className="flex flex-col gap-5 rounded-22 border border-border-default bg-bg-card p-7 shadow-card">
                <h2 id="week-title" className="type-h3 text-text-primary">
                  هذا الأسبوع
                </h2>
                <p className="flex items-start gap-2.5 rounded-12 bg-bg-page px-3.5 pt-3 pb-[13px] type-body text-text-primary">
                  <Glyph icon={CircleCheck} size={20} className="mt-1 text-state-success" />
                  <span className="flex-1">
                    {doneThisWeek === 0 ? "لا مهام منجزة بعد" : `${toArabicDigits(doneThisWeek)} ${doneThisWeek === 1 ? "مهمة أنجزتها" : doneThisWeek === 2 ? "مهمتان أنجزتهما" : "مهام أنجزتها"}`}
                  </span>
                </p>
              </section>
            </aside>
          </div>
        </PageBody>
      </>
    );
  }

  const shown = items.filter((i) =>
    filter === "all" ? true : filter === "action" ? i.kind === "action" : filter === "processing" ? i.kind === "processing" : i.category === filter,
  );
  const summary = [
    counts.action ? `${itemsWord(counts.action)} ${counts.action === 1 ? "يحتاج" : counts.action === 2 ? "يحتاجان" : "تحتاج"} إجراءك` : "لا شيء يحتاج إجراءك",
    counts.processing ? `و${itemsWord(counts.processing)} قيد المعالجة لدى المنصة أو الجهات` : "",
  ]
    .filter(Boolean)
    .join("، ");

  return (
    <>
      <TopBar title="بانتظار إجرائي" subtitle="كل ما يحتاج قرارًا أو إجراءً منك" />
      <PageBody className="gap-6">
        <PageHeading title="بانتظار إجرائي" description={`${summary}. مرتّبة حسب أقرب مهلة.`} count={items.length === 1 ? "بند واحد" : items.length === 2 ? "بندان" : `${toArabicDigits(items.length)} ${items.length <= 10 ? "بنود" : "بندًا"}`} />
        <p className="flex items-center gap-4 rounded-12 bg-bg-brand-tint px-[18px] py-3.5 type-body text-text-brand">
          <Glyph icon={Info} size={20} />
          <span className="flex-1">كل بند يوضّح: الخطوة الحالية · من المسؤول · متى التحديث المتوقع · الإجراء التالي.</span>
        </p>
        <nav aria-label="تصفية البنود" className="flex flex-wrap items-center gap-2.5">
          {FILTERS.map((f) => (
            <FilterChip key={f.value} href={f.value === "all" ? "/trainer/queue" : `/trainer/queue?filter=${f.value}`} active={filter === f.value}>
              {f.label}
              {f.counted ? ` · ${toArabicDigits(counts[f.value as "all" | "processing" | "action"])}` : ""}
            </FilterChip>
          ))}
        </nav>
        <section aria-label="البنود" className="flex flex-col gap-4">
          {shown.length === 0 ? (
            <p className="rounded-12 bg-bg-page px-4 py-6 text-center type-small text-text-muted">لا بنود في هذا التصنيف حاليًا.</p>
          ) : (
            shown.map((item) => <TrainerQueueCard key={item.key} item={item} />)
          )}
        </section>
      </PageBody>
    </>
  );
}
