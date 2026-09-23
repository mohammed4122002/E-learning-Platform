type ProgressBarProps = {
  percent: number;
  /** Track width from Figma (px); shrinks with its container on small screens. */
  width: number;
  label: string;
};

/** Accent fill on a border/default track, filled from the start (right) side. */
export function ProgressBar({ percent, width, label }: ProgressBarProps) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      className="flex h-2.5 max-w-full shrink-0 overflow-hidden rounded-full bg-border-default"
      style={{ width }}
    >
      <div className="h-full rounded-full bg-action-accent" style={{ width: `${percent}%` }} />
    </div>
  );
}
