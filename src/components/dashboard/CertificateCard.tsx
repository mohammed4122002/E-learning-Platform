import type { Certificate } from "@/types/dashboard";
import { Pill } from "@/components/ui/Pill";

/** Figma "Card / Certificate". */
export function CertificateCard({ certificate }: { certificate: Certificate }) {
  const { title, meta, ribbon, status, link } = certificate;
  return (
    <article className="flex w-full min-w-0 flex-col items-start gap-3 overflow-hidden rounded-16 bg-bg-card p-4 shadow-card inner-stroke">
      <div className={`h-1.5 w-full shrink-0 rounded-full ${ribbon === "accent" ? "bg-action-accent" : "bg-state-warning"}`} />
      <h3 className="w-full type-h4 text-text-primary">{title}</h3>
      <p className="w-full type-caption text-text-secondary">{meta}</p>
      <div className="flex w-full items-center">
        <Pill tone={status.tone} className="max-w-full py-[3px]">
          <span className="truncate">{status.label}</span>
        </Pill>
      </div>
      {link.available ? (
        <a href="#" className="w-full type-caption text-text-brand">
          {link.label}
        </a>
      ) : (
        <p className="w-full type-caption text-text-muted">{link.label}</p>
      )}
    </article>
  );
}
