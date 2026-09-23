import { waitlistOffer } from "@/lib/dashboard-data";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

export function WaitlistCard() {
  return (
    <section
      aria-labelledby="waitlist-title"
      className="flex flex-col items-start gap-[22px] overflow-hidden rounded-16 bg-state-success-bg px-6 py-5 inner-stroke istroke-w-[2px] istroke-c-state-success md:flex-row md:items-center"
    >
      <div className="flex size-[52px] shrink-0 items-center justify-center rounded-12 bg-bg-surface">
        <Icon src="/assets/icons/users-success.svg" size={20} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h2 id="waitlist-title" className="type-title text-state-success">
          {waitlistOffer.title}
        </h2>
        <p className="type-body text-text-secondary">{waitlistOffer.description}</p>
      </div>
      <Button variant="primary">{waitlistOffer.cta}</Button>
    </section>
  );
}
