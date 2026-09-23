import { Users } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { Glyph } from "@/components/ui/Icon";
import { Countdown } from "@/components/ui/Countdown";
import { pluralAr } from "@/lib/format";
import type { DashboardView } from "@/lib/data/dashboard";

/** TRN-DSH-01 — a freed seat offered from the waitlist (TRN-WTL-02). */
export function WaitlistCard({ invite }: { invite: NonNullable<DashboardView["waitlistInvite"]> }) {
  return (
    <section
      aria-labelledby="waitlist-title"
      className="flex flex-col items-start gap-[22px] overflow-hidden rounded-16 bg-state-success-bg px-6 py-5 inner-stroke istroke-w-[2px] istroke-c-state-success md:flex-row md:items-center"
    >
      <div className="flex size-[52px] shrink-0 items-center justify-center rounded-12 bg-bg-surface text-state-success">
        <Glyph icon={Users} size={20} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h2 id="waitlist-title" className="type-title text-state-success">
          حجز مقعد في دورة تنتظرها
        </h2>
        <p className="type-body text-text-secondary">
          «{invite.courseTitle}» — يتبقى <Countdown until={invite.expiresAt} /> لقبول المقعد
          {invite.otherWaiting > 0 && ` · وأنت في انتظار ${pluralAr(invite.otherWaiting, ["دورة أخرى", "دورتين أخريين", "دورات أخرى", "دورة أخرى"])}`}.
        </p>
      </div>
      <ButtonLink href={`/trainee/waitlist/${invite.entryId}`}>اقبل المقعد</ButtonLink>
    </section>
  );
}
