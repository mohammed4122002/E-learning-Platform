import type { ReactNode } from "react";
import { PublicHeader } from "@/components/profile/PublicHeader";

/** PUB-VRF-01/02 frame: explanation column (start) + 520px result/form card (end), vertically centred. */
export function VerifyLayout({ aside, children }: { aside: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg-page">
      <PublicHeader />
      <main id="main" className="mx-auto grid w-full max-w-[1152px] flex-1 grid-cols-1 items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_520px] lg:gap-24">
        <div className="flex flex-col gap-5">{aside}</div>
        {children}
      </main>
    </div>
  );
}

export function VerifyCard({ children, labelledBy }: { children: ReactNode; labelledBy: string }) {
  return (
    <section aria-labelledby={labelledBy} className="flex w-full flex-col gap-5 rounded-22 border border-border-default bg-bg-surface px-6 py-8 shadow-float sm:px-10 sm:py-9">
      {children}
    </section>
  );
}

export function VerifyRow({ label, value, tone = "text-text-primary" }: { label: string; value: ReactNode; tone?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 rounded-12 border border-border-default bg-bg-page px-4 py-3">
      <dt className="type-caption text-text-muted">{label}</dt>
      <dd className={`type-small font-bold ${tone}`}>{value}</dd>
    </div>
  );
}

export function VerifyAside({ title, lines, children }: { title: string; lines: string[]; children?: ReactNode }) {
  return (
    <>
      <h2 className="type-h2 text-text-primary">{title}</h2>
      {lines.map((l) => (
        <p key={l} className="type-small text-text-secondary">
          {l}
        </p>
      ))}
      {children}
    </>
  );
}
