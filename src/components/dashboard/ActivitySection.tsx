import type { LucideIcon } from "lucide-react";
import { Award, Banknote, CalendarDays, CircleCheck, Ticket, Trophy } from "lucide-react";
import { Glyph } from "@/components/ui/Icon";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { EmptyState } from "@/components/ui/Feedback";
import { formatRelative } from "@/lib/format";
import type { ActivityItem, ActivityKind } from "@/lib/data/dashboard";

const ICONS: Record<ActivityKind, { icon: LucideIcon; color: string }> = {
  lesson: { icon: CircleCheck, color: "text-state-success" },
  quiz: { icon: Trophy, color: "text-state-warning" },
  session: { icon: CalendarDays, color: "text-text-brand" },
  refund: { icon: Banknote, color: "text-state-success" },
  certificate: { icon: Award, color: "text-state-warning" },
  enrollment: { icon: Ticket, color: "text-text-brand" },
};

export function ActivitySection({ items }: { items: ActivityItem[] }) {
  return (
    <section aria-labelledby="activity-title" className="flex flex-col gap-[18px]">
      <SectionHeader id="activity-title" title="آخر نشاطك" subtitle="كل ما جرى في حسابك خلال الأيام الماضية" link={{ label: "سجل النشاط الكامل", href: "/trainee/learning-record" }} />
      {items.length === 0 ? (
        <EmptyState icon={CalendarDays} title="لا نشاط بعد" description="سيظهر هنا كل ما تنجزه: الدروس، الاختبارات، الجلسات والشهادات." />
      ) : (
        <ol className="flex w-full flex-col gap-4 overflow-hidden rounded-16 bg-bg-card p-4 shadow-card inner-stroke sm:p-6">
          {items.map((item) => {
            const s = ICONS[item.kind];
            return (
              <li key={item.id} className="flex w-full items-start gap-3.5 rounded-12 bg-bg-page px-3.5 py-[13px]">
                <span className={`flex size-10 shrink-0 items-center justify-center rounded-8 bg-bg-surface ${s.color}`}>
                  <Glyph icon={s.icon} size={20} />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                  <p className="type-subtitle text-text-primary">{item.title}</p>
                  <p className="type-caption text-text-muted">{item.description}</p>
                </div>
                <time dateTime={item.at} className="shrink-0 whitespace-nowrap type-caption text-text-muted">
                  {formatRelative(item.at)}
                </time>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
