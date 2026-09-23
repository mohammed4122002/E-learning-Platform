import { formatPercent } from "@/lib/format";

/** Figma "Data / Progress" ring variant (60:86): 110px frame, 88px ring, accent arc, value 17 Regular centred. */
export function ProgressRing({ percent, label }: { percent: number; label: string }) {
  const v = Math.max(0, Math.min(100, Math.round(percent)));
  const r = 40;
  const c = 2 * Math.PI * r;
  return (
    <div role="progressbar" aria-label={label} aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} className="relative flex size-[110px] shrink-0 items-center justify-center">
      <svg aria-hidden viewBox="0 0 88 88" className="size-[88px] -rotate-90">
        <circle cx="44" cy="44" r={r} fill="none" strokeWidth="8" className="stroke-border-divider/60" />
        <circle
          cx="44"
          cy="44"
          r={r}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * v) / 100}
          className="stroke-action-accent"
        />
      </svg>
      <span className="absolute type-body text-text-primary">{formatPercent(v)}</span>
    </div>
  );
}
