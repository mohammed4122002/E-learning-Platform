import { Ban, CircleAlert, CircleCheck, CircleX, Clock, Hourglass, Route, User } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import type { QueueItem, QueueStatus } from "@/lib/data/money";
import { CHIP_ICONS, Chip, CountdownChip, StatusItemCard, type ChipTone, type ItemTone } from "./ui";
import { DismissButton } from "./DismissButton";

const STATUS: Record<QueueStatus, { tone: ItemTone; icon: typeof CircleAlert; badge: ChipTone }> = {
  action: { tone: "error", icon: CircleAlert, badge: "error" },
  waiting: { tone: "warning", icon: Hourglass, badge: "warning" },
  approved: { tone: "success", icon: CircleCheck, badge: "success" },
  rejected: { tone: "error", icon: CircleX, badge: "error" },
  expired: { tone: "neutral", icon: Ban, badge: "neutral" },
};

/** One row of TRN-QUE-01 (Figma "Platform / Queue Item", 153:2089). */
export function QueueItemCard({ item }: { item: QueueItem }) {
  const s = STATUS[item.status];
  const chipTone = item.chip.tone as ChipTone;
  return (
    <StatusItemCard
      tone={s.tone}
      icon={s.icon}
      highlight={item.status === "action"}
      title={item.title}
      badge={
        <Chip tone={s.badge} icon={CHIP_ICONS[item.badge.icon]}>
          {item.badge.label}
        </Chip>
      }
      description={item.description}
      facts={[
        { icon: Route, label: "الخطوة الحالية:", value: item.step },
        { icon: User, label: "المسؤول:", value: item.owner.label, valueClass: item.owner.you ? "text-state-error" : undefined },
        { icon: Clock, label: "التحديث المتوقع:", value: item.eta },
      ]}
      refCode={item.ref}
      footerChip={
        item.chip.until ? (
          <CountdownChip until={item.chip.until} label={item.chip.label} tone={chipTone} />
        ) : (
          <Chip tone={chipTone} icon={CHIP_ICONS[item.chip.icon]}>
            {item.chip.label}
          </Chip>
        )
      }
      actions={
        <>
          <ButtonLink href={item.primary.href} variant={item.primary.variant} className="min-w-[120px]">
            {item.primary.label}
          </ButtonLink>
          <DismissButton itemKey={item.key} mode={item.secondary} />
        </>
      }
    />
  );
}
