import type { ReactNode } from "react";
import { formatPercent } from "@/lib/format";

const tones = {
  accent: "stroke-action-accent",
  success: "stroke-state-success",
  brand: "stroke-action-primary",
  error: "stroke-state-error",
} as const;

/**
 * Figma "Data / Progress" ring (60:87) used by "Trainee / Recorded · Progress Ring" (401:4414):
 * 88px ring on a border/divider track, accent fill from 12 o'clock, 17 Regular percentage in the middle.
 */
export function ProgressRing({
  percent,
  label,
  size = 88,
  stroke = 9,
  tone = "accent",
  children,
  className,
}: {
  percent: number;
  label: string;
  size?: number;
  stroke?: number;
  tone?: keyof typeof tones;
  children?: ReactNode;
  className?: string;
}) {
  const v = Math.max(0, Math.min(100, Math.round(percent)));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={v}
      aria-valuemin={0}
      aria-valuemax={100}
      className={`relative inline-flex shrink-0 items-center justify-center ${className ?? ""}`}
      style={{ width: size, height: size }}
    >
      <svg aria-hidden width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-border-divider" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v / 100)}
          className={`${tones[tone]} transition-[stroke-dashoffset] duration-500`}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center type-body text-text-primary">{children ?? formatPercent(v)}</span>
    </div>
  );
}
