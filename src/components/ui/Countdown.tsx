"use client";

import { useEffect, useState } from "react";
import { toArabicDigits } from "@/lib/format";

function remaining(until: string) {
  return Math.max(0, Math.floor((new Date(until).getTime() - Date.now()) / 1000));
}

/** Live "hh:mm" / "mm:ss" countdown (seat holds, waitlist invites). Renders ٠٠:٠٠ once expired. */
export function Countdown({ until, withSeconds = false, onExpire }: { until: string; withSeconds?: boolean; onExpire?: () => void }) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => {
      const r = remaining(until);
      setLeft(r);
      if (r === 0) {
        clearInterval(t);
        onExpire?.();
      }
    };
    const first = setTimeout(tick, 0);
    const t = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, [until, onExpire]);

  if (left === null) return <span className="tabular-nums">‎--:--</span>;
  const h = Math.floor(left / 3600);
  const m = Math.floor((left % 3600) / 60);
  const s = left % 60;
  const text = withSeconds || h === 0 ? `${String(h * 60 + m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  return (
    <time dir="ltr" className="tabular-nums" dateTime={until}>
      {toArabicDigits(text)}
    </time>
  );
}
