import type { Metadata } from "next";
import { BookOpen, CircleAlert, Hourglass, Info, MessagesSquare, Star } from "lucide-react";
import { PageBody, TopBar } from "@/components/layout/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Feedback";
import { Glyph } from "@/components/ui/Icon";
import { FilterChip, PageHeading, numberWord } from "@/components/trainings/ui";
import { QueueItemCard } from "@/components/trainings/QueueItemCard";
import { requireTrainee } from "@/lib/auth";
import { getQueue, type QueueFilter } from "@/lib/data/money";
import { toArabicDigits } from "@/lib/format";

export const metadata: Metadata = { title: "بانتظار إجرائي", description: "كل ما يحتاج قرارًا أو إجراءً منك" };

const FILTERS: { value: QueueFilter; label: string }[] = [
  // Visual order of the Figma frame (right → left).
  { value: "all", label: "الكل" },
  { value: "done", label: "مكتملة" },
  { value: "waiting", label: "بانتظار طرف آخر" },
  { value: "action", label: "يحتاج إجراءك" },
];

const LATER = [
  { icon: CircleAlert, title: "مهلة دفع", text: "عند حجزك مقعدًا يظهر هنا بند بمؤقّت ١٥ دقيقة." },
  { icon: Star, title: "تقييم مفتوح", text: "بعد انتهاء أي دورة يظهر بند تقييم بثلاثة محاور." },
  { icon: MessagesSquare, title: "رد على استفسارك", text: "عند رد مقدّم التدريب على استفسارك قبل الشراء." },
  { icon: Hourglass, title: "طلب قيد المراجعة", text: "طلبات الاسترداد والتظلّمات تظهر هنا مع الخطوة الحالية والمسؤول عنها." },
];

/** TRN-QUE-01 · بانتظار إجرائي — default (154:4712) and empty (154:5162). */
export default async function QueuePage(props: PageProps<"/trainee/queue">) {
  const user = await requireTrainee("/trainee/queue");
  const sp = await props.searchParams;
  const filter = (FILTERS.find((f) => f.value === sp.filter)?.value ?? "all") as QueueFilter;
  const { items, counts } = await getQueue(user.id);

  const shown = items.filter((i) =>
    filter === "all" ? true : filter === "action" ? i.status === "action" || i.status === "rejected" : filter === "waiting" ? i.status === "waiting" : i.status === "approved" || i.status === "expired",
  );
  const summary =
    items.length === 0
      ? "لا شيء ينتظر إجراءك الآن."
      : `${numberWord(counts.action, ["لا شيء يحتاج إجراءً منك", "بند واحد يحتاج إجراءً منك", "بندان يحتاجان إجراءً منك", "بنود تحتاج إجراءً منك", "بندًا يحتاج إجراءً منك"])}${
          counts.waiting ? `، و${numberWord(counts.waiting, ["", "بند واحد", "بندان", "بنود", "بندًا"])} قيد المعالجة لدى أطراف أخرى` : ""
        }. مرتّبة حسب أقرب مهلة.`;

  return (
    <>
      <TopBar title="بانتظار إجرائي" subtitle="كل ما يحتاج قرارًا أو إجراءً منك" />
      <PageBody className="gap-6">
        <PageHeading title="بانتظار إجرائي" description={summary} count={items.length === 0 ? "صفر بنود" : numberWord(items.length, ["", "بند واحد", "بندان", "بنود", "بندًا"])} />

        {items.length === 0 ? (
          <>
            <EmptyState
              icon={BookOpen}
              title="لا يوجد ما ينتظر إجراءك"
              description="أنجزت كل بنودك. سنُعلمك فور ظهور مهلة دفع أو تقييم مفتوح أو رد على استفسارك — وستصلك رسالة أيضًا."
              action={<ButtonLink href="/trainee/discover">استكشف برامج جديدة</ButtonLink>}
              className="border-dashed"
            />
            <section aria-labelledby="later-title" className="flex flex-col gap-4 rounded-16 border border-border-default bg-bg-card p-4 shadow-card sm:p-6">
              <h2 id="later-title" className="type-h4 text-text-primary">
                ما الذي قد يظهر هنا لاحقًا؟
              </h2>
              <ul className="flex flex-col gap-3">
                {LATER.map((l) => (
                  <li key={l.title} className="flex items-center gap-3 rounded-12 bg-bg-page px-4 py-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-8 bg-bg-brand-tint text-text-brand">
                      <Glyph icon={l.icon} size={16} />
                    </span>
                    <span className="flex flex-col">
                      <span className="type-subtitle text-text-primary">{l.title}</span>
                      <span className="type-caption text-text-muted">{l.text}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </>
        ) : (
          <>
            <p className="flex items-center gap-[18px] rounded-12 bg-bg-brand-tint px-[18px] py-3.5 type-body text-text-brand">
              <Glyph icon={Info} size={20} />
              <span className="flex-1">كل بند يوضّح: الخطوة الحالية · من المسؤول · متى التحديث المتوقع · الإجراء التالي</span>
            </p>
            <nav aria-label="تصفية البنود" className="flex flex-wrap items-center gap-2.5">
              {FILTERS.map((f) => (
                <FilterChip key={f.value} href={f.value === "all" ? "/trainee/queue" : `/trainee/queue?filter=${f.value}`} active={filter === f.value}>
                  {f.label} · {toArabicDigits(counts[f.value])}
                </FilterChip>
              ))}
            </nav>
            <section aria-label="البنود" className="flex flex-col gap-4">
              {shown.length === 0 ? (
                <p className="rounded-12 bg-bg-page px-4 py-6 text-center type-small text-text-muted">لا بنود في هذا التصنيف حاليًا.</p>
              ) : (
                shown.map((item) => <QueueItemCard key={item.key} item={item} />)
              )}
            </section>
          </>
        )}
      </PageBody>
    </>
  );
}
