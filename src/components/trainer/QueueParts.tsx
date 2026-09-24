import type { LucideIcon } from "lucide-react";
import { Award, CalendarCheck, CircleAlert, Clock, FileText, Hourglass, Landmark, Shield, Signpost, Star, User } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { Chip, StatusItemCard } from "@/components/trainings/ui";
import { DismissButton } from "@/components/trainings/DismissButton";
import { dismissTrainerQueueItem } from "@/app/(trainer)/trainer/queue/actions";
import type { QueueIcon, TrainerQueueItem } from "@/lib/data/trainer-queue";

/** Rendered TG components of TRR-QUE-01 (256:1267): Institute = landmark, Status/Pending = hourglass (also on money items). */
export const QUEUE_ICONS: Record<QueueIcon, LucideIcon> = {
  alert: CircleAlert,
  building: Landmark,
  star: Star,
  hourglass: Hourglass,
  banknote: Hourglass,
  shield: Shield,
  file: FileText,
  calendar: CalendarCheck,
};

export const UPCOMING_ICONS = { session: CalendarCheck, certificate: Award } as const;

const TENS = ["", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة", "عشرة"];

/** "بند واحد" · "بندان" · "ثلاثة بنود" · "١٢ بندًا" (Figma copy spells small counts out). */
export function itemsWord(n: number): string {
  if (n === 1) return "بند واحد";
  if (n === 2) return "بندان";
  if (n >= 3 && n <= 10) return `${TENS[n]} بنود`;
  return `${n.toLocaleString("ar-SA-u-nu-arab")} بندًا`;
}

/** One row of TRR-QUE-01 (256:1443): urgent = 2px error border + «عاجل»; in processing = «قيد المعالجة». */
export function TrainerQueueCard({ item }: { item: TrainerQueueItem }) {
  const urgent = item.kind === "action";
  const icon = QUEUE_ICONS[item.icon];
  return (
    <StatusItemCard
      tone={urgent ? "error" : "warning"}
      icon={icon}
      highlight={urgent}
      title={item.title}
      badge={
        <Chip tone={urgent ? "error" : "warning"} icon={urgent ? icon : icon === CircleAlert ? Hourglass : icon}>
          {urgent ? "عاجل" : "قيد المعالجة"}
        </Chip>
      }
      description={item.description}
      facts={[
        { icon: Signpost, label: "الخطوة الحالية:", value: item.step },
        { icon: User, label: "المسؤول:", value: item.owner, valueClass: item.ownerYou ? "text-state-error" : undefined },
        { icon: Clock, label: "التحديث المتوقع:", value: item.eta },
      ]}
      refCode={item.ref}
      refFirst
      footerChip={
        item.age ? (
          <Chip tone={urgent ? "error" : "warning"} icon={Clock}>
            {item.age}
          </Chip>
        ) : undefined
      }
      actions={
        <>
          <ButtonLink href={item.primary.href} variant={urgent ? "primary" : "outline"} className="min-w-[120px]">
            {item.primary.label}
          </ButtonLink>
          <DismissButton itemKey={item.key} mode={item.secondary} action={dismissTrainerQueueItem} />
        </>
      }
    />
  );
}
