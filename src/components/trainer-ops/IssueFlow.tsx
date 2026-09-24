"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Award, CircleCheck, Hourglass, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Glyph } from "@/components/ui/Icon";
import { issueCertificates } from "@/lib/actions/trainer-ops";
import { toArabicDigits } from "@/lib/format";
import { AccentBar, OpsHero } from "./parts";

/*
 * TRR-CRT-01 «أصدر ١٧ شهادة دفعة واحدة» (276:5358) → «جارٍ الإصدار…» (463:34780).
 * Issues in small batches so the progress is the real number of certificates written; each batch generates the
 * certificate, its verification link and the trainee notification (issue_certificate) before the next one starts.
 */

const n = toArabicDigits;
const BATCH = 3;
const plural = (c: number, one: string, two: string, few: string, many: string) => (c === 1 ? one : c === 2 ? two : c <= 10 ? `${n(c)} ${few}` : `${n(c)} ${many}`);

function Step({ tone, icon, spin, title, caption }: { tone: "success" | "info" | "neutral"; icon: typeof CircleCheck; spin?: boolean; title: string; caption: string }) {
  const tint = tone === "success" ? "bg-state-success-bg" : tone === "info" ? "bg-state-info-bg" : "bg-bg-page";
  const text = tone === "success" ? "text-state-success" : tone === "info" ? "text-state-info" : "text-text-secondary";
  return (
    <li className={`flex items-center gap-4 rounded-16 px-5 py-5 ${tint}`}>
      <span className={`flex size-12 shrink-0 items-center justify-center rounded-12 bg-bg-surface ${text}`}>
        <Glyph icon={icon} size={24} className={spin ? "animate-spin motion-reduce:animate-none" : undefined} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className={`type-h4 font-bold! ${text}`}>{title}</span>
        <span className="type-small text-text-secondary">{caption}</span>
      </div>
    </li>
  );
}

export function IssueFlow({
  courseId,
  pendingIds,
  eligibleCount,
  hero,
  children,
  sideIssuing,
}: {
  courseId: string;
  /** Eligible enrollments without a certificate yet. */
  pendingIds: string[];
  eligibleCount: number;
  /** Chips of the idle hero (server rendered). */
  hero: ReactNode;
  /** Body under the idle hero (eligible / ineligible / preview / verification). */
  children: ReactNode;
  /** «قبل الإصدار» side card. */
  sideIssuing: ReactNode;
}) {
  const [phase, setPhase] = useState<"idle" | "issuing">("idle");
  const [done, setDone] = useState(0);
  const [skipped, setSkipped] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  // Snapshot at start: each batch revalidates the page, so the pending list shrinks under us.
  const [total, setTotal] = useState(pendingIds.length);

  const run = async () => {
    const ids = [...pendingIds];
    setTotal(ids.length);
    setError(null);
    setPhase("issuing");
    let issued = 0;
    let skip = 0;
    for (let i = 0; i < ids.length; i += BATCH) {
      const res = await issueCertificates(courseId, ids.slice(i, i + BATCH));
      if (!res.ok) {
        setError(res.message);
        setPhase("idle");
        router.refresh();
        return;
      }
      issued += res.data?.issued ?? 0;
      skip += res.data?.skipped ?? 0;
      setDone(Math.min(ids.length, i + BATCH));
      setSkipped(skip);
    }
    router.replace(`/trainer/courses/${courseId}/certificates/issue?issued=${issued}&skipped=${skip}`, { scroll: false });
    router.refresh();
  };

  if (phase === "issuing") {
    const pct = total ? Math.round((done / total) * 100) : 100;
    const finished = done >= total;
    return (
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-6" aria-live="polite" aria-busy={!finished}>
          <OpsHero tone="brand" icon={Award} title={plural(eligibleCount, "متدرب واحد يستحق الشهادة", "متدربان يستحقان الشهادة", "متدربين يستحقون الشهادة", "متدربًا يستحقون الشهادة")} compact>
            الإصدار الجماعي أسرع من واحد تلو الآخر – والنتيجة نفسها.
          </OpsHero>
          <section aria-labelledby="issuing-title" className="flex flex-col gap-5 rounded-22 border border-border-default bg-bg-card p-5 shadow-card sm:p-7">
            <h2 id="issuing-title" className="type-h3 font-bold! text-text-primary">
              {finished ? "اكتمل الإصدار" : "جارٍ الإصدار…"}
            </h2>
            <AccentBar percent={pct} label="تقدّم إصدار الشهادات" start={`${n(done)} من ${n(total)} شهادة`} end={`${n(pct)}٪`} />
            <ul className="flex flex-col gap-4">
              <Step tone="success" icon={CircleCheck} title="توليد الشهادات" caption={`${n(done)} من ${n(total)}${finished ? "" : " · جارٍ"}${skipped ? ` · ${n(skipped)} صادرة مسبقًا` : ""}`} />
              <Step tone={finished ? "success" : "info"} icon={finished ? CircleCheck : LoaderCircle} spin={!finished} title="ربط روابط التحقق" caption={finished ? "مكتمل" : "جارٍ"} />
              <Step tone={finished ? "success" : "neutral"} icon={finished ? CircleCheck : Hourglass} title="إرسال الإشعارات" caption={finished ? "مكتمل" : "بانتظار اكتمال التوليد"} />
            </ul>
            <p className="type-caption text-state-info">لا تغلق الصفحة – العملية تستغرق دقيقة تقريبًا.</p>
          </section>
        </div>
        <div className="flex w-full shrink-0 flex-col gap-5 lg:w-[400px]">{sideIssuing}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <OpsHero
        tone="success"
        icon={Award}
        chips={hero}
        title="إصدار شهادات الدورة"
        action={
          <Button size="l" className="w-full sm:w-auto sm:min-w-[264px]" disabled={pendingIds.length === 0} onClick={run}>
            {pendingIds.length === eligibleCount ? `أصدر ${plural(pendingIds.length, "شهادة واحدة", "شهادتين", "شهادات", "شهادة")} دفعة واحدة` : `أصدر ${plural(pendingIds.length, "الشهادة المتبقية", "الشهادتين المتبقيتين", "شهادات متبقية", "شهادة متبقية")}`}
          </Button>
        }
      >
        كل شهادة تُصدر برقم مرجعي ورابط تحقق عام دائم، وتظهر فورًا في ملف المتدرب.
        <br />
        الإصدار نهائي – السحب يتطلب طلبًا مسبّبًا للإدارة.
      </OpsHero>
      {error && (
        <p role="alert" className="rounded-12 border-[1.5px] border-state-error bg-state-error-bg px-4 py-3 type-body text-state-error">
          {error}
        </p>
      )}
      {children}
    </div>
  );
}
