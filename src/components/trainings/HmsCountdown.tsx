"use client";

import { useEffect, useState } from "react";
import { toArabicDigits } from "@/lib/format";

/** "٠٤:٣٢:١٨" countdown (hours:minutes:seconds) for waitlist invites — the Figma mono timer. */
export function HmsCountdown({ until }: { until: string }) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setLeft(Math.max(0, Math.floor((new Date(until).getTime() - Date.now()) / 1000)));
    const first = setTimeout(tick, 0);
    const t = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, [until]);
  if (left === null) return <span className="tabular-nums">--:--:--</span>;
  const pad = (n: number) => String(n).padStart(2, "0");
  const text = `${pad(Math.floor(left / 3600))}:${pad(Math.floor((left % 3600) / 60))}:${pad(left % 60)}`;
  return (
    <time dir="ltr" dateTime={until} className="tabular-nums">
      {toArabicDigits(text)}
    </time>
  );
}
