"use client";

import { useRef, useState } from "react";
import { toArabicDigits } from "@/lib/format";

/*
 * PUB-AUT-03 / PUB-AUT-04 step 2: six boxes (≈65×69, r12, 1.5px border/default, 26 Bold);
 * the active box is 2px action/primary on bg/page; empty boxes are bg/page.
 * The digits are submitted as a single hidden "token" field. Arabic-Indic input is accepted.
 */
export function OtpInput({ name = "token", error, autoFocus = true }: { name?: string; error?: string; autoFocus?: boolean }) {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const normalise = (v: string) => v.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace(/\D/g, "");

  function setAt(index: number, value: string) {
    let clean = normalise(value);
    // Typing over a filled box: keep only the newly typed digit.
    if (clean.length === 2 && digits[index] && clean.includes(digits[index])) {
      clean = clean[0] === digits[index] ? clean[1] : clean[0];
    }
    if (clean.length > 1) {
      // Paste or autofill: spread the digits from this box on.
      const next = [...digits];
      clean.slice(0, 6 - index).split("").forEach((d, i) => (next[index + i] = d));
      setDigits(next);
      refs.current[Math.min(index + clean.length, 5)]?.focus();
      return;
    }
    const next = [...digits];
    next[index] = clean;
    setDigits(next);
    if (clean && index < 5) refs.current[index + 1]?.focus();
  }

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="sr-only">رمز التحقق المكوّن من ٦ أرقام</legend>
      {/* Codes read left-to-right even in Arabic UI. */}
      <div dir="ltr" className="flex justify-center gap-2.5 sm:gap-3">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            autoFocus={autoFocus && i === 0}
            aria-label={`الرقم ${toArabicDigits(i + 1)}`}
            aria-invalid={error ? true : undefined}
            maxLength={6}
            value={d}
            onChange={(e) => setAt(i, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus();
              if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
              if (e.key === "ArrowRight" && i < 5) refs.current[i + 1]?.focus();
            }}
            className={`h-[69px] w-full max-w-[68px] min-w-0 rounded-12 border-[1.5px] text-center text-[26px] font-bold text-text-primary outline-none transition-colors focus:border-2 focus:border-action-primary focus:bg-bg-page ${
              error ? "border-state-error" : d ? "border-border-default bg-bg-surface" : "border-border-default bg-bg-page"
            }`}
          />
        ))}
      </div>
      <input type="hidden" name={name} value={digits.join("")} />
      {error && (
        <p role="alert" className="text-center type-caption text-state-error">
          {error}
        </p>
      )}
    </fieldset>
  );
}
