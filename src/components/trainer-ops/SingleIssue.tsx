"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { issueCertificates, issueProgramCertificates } from "@/lib/actions/trainer-ops";
import { DataPanel } from "./parts";

/*
 * «أصدر الشهادة» for one trainee (4254:2 → 4254:394) and «أصدر شهادات البرنامج للمستحقين» (4256:2 → 4256:419).
 * The idle panel is server rendered; while the RPC runs the yellow «جارٍ…» panel replaces it, then the page reloads
 * into its issued state (4254:703 / 4256:724).
 */
export function SingleIssue({
  kind,
  courseId,
  enrollmentId,
  eligible,
  idle,
  issuing,
  backHref,
  label,
  disabledLabel,
  doneHref,
}: {
  kind: "course" | "program";
  courseId: string;
  enrollmentId?: string;
  eligible: boolean;
  idle: ReactNode;
  issuing: { title: string; intro: string; rows: { label: string; value: string; tone?: "warning" | "neutral" }[] };
  backHref: string;
  label: string;
  disabledLabel: string;
  doneHref: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const run = async () => {
    setError(null);
    setBusy(true);
    const res = kind === "course" ? await issueCertificates(courseId, enrollmentId ? [enrollmentId] : undefined) : await issueProgramCertificates(courseId);
    if (!res.ok) {
      setBusy(false);
      setError(res.message);
      return;
    }
    router.replace(doneHref, { scroll: false });
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-5" aria-live="polite" aria-busy={busy}>
      {busy ? <DataPanel tone="warning" title={issuing.title} intro={issuing.intro} rows={issuing.rows} /> : idle}
      {error && (
        <p role="alert" className="rounded-12 border-[1.5px] border-state-error bg-state-error-bg px-4 py-3 type-body text-state-error">
          {error}
        </p>
      )}
      {!busy && (
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-start">
          <ButtonLink href={backHref} variant="secondary" size="m" className="sm:min-w-[88px]">
            رجوع
          </ButtonLink>
          <Button size="m" className="sm:min-w-[168px]" disabled={!eligible} onClick={run}>
            {eligible ? label : disabledLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
