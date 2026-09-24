import type { Metadata } from "next";
import { Film, Star } from "lucide-react";
import { PageBody, TopBar } from "@/components/layout/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { Glyph } from "@/components/ui/Icon";
import { Breadcrumb } from "@/components/ui/Navigation";
import { IncomeCalculator } from "@/components/trainer/IncomeCalculator";
import { requireTrainer } from "@/lib/auth";
import { getTrainerOverview } from "@/lib/data/trainer";
import { createClient } from "@/lib/supabase/server";
import { formatRating } from "@/lib/format";

export const metadata: Metadata = { title: "حاسبة الدخل التقديري", description: "كم أستطيع أن أربح؟ تقدير مبني على متوسطات المنصة في تخصصك." };

/** TRR-JRN-02 · حاسبة الدخل التقديري (464:35932). Platform averages come from trainer_income_benchmarks(). */
export default async function IncomeCalculatorPage() {
  const user = await requireTrainer("/trainer/journey/income");
  const supabase = await createClient();
  const [o, bench] = await Promise.all([getTrainerOverview(user.id), supabase.rpc("trainer_income_benchmarks")]);
  if (bench.error) throw new Error(bench.error.message);
  const b = (bench.data ?? {}) as Record<string, number | null>;
  const n = (v: unknown) => (v === null || v === undefined ? null : Number(v));
  const s = o.stats;
  const hasRecorded = o.courses.some((c) => c.mode === "recorded");
  // Start from the trainer's real volume this month (their own courses), so the estimate reflects them first.
  const monthStart = new Date(new Date().toISOString().slice(0, 7) + "-01T00:00:00+03:00").getTime();
  const thisMonth = o.courses.filter((c) => c.startsAt && new Date(c.startsAt).getTime() >= monthStart);
  const initial = {
    inPerson: thisMonth.filter((c) => c.mode === "in_person").length,
    live: thisMonth.filter((c) => c.mode === "live_remote").length,
    recorded: 0,
    offers: 0,
  };

  const hints = (
    <section aria-labelledby="closer-title" className="flex flex-col gap-5 rounded-22 border border-border-default bg-bg-card p-5 shadow-card sm:p-7">
      <h2 id="closer-title" className="type-h3 text-text-primary">
        ما الذي يقرّبك من التقدير؟
      </h2>
      {!hasRecorded && (
        <div className="flex flex-col gap-2.5 rounded-12 bg-state-warning-bg px-4 pt-3.5 pb-4">
          <p className="flex items-start gap-2.5 type-body text-text-primary">
            <Glyph icon={Film} size={20} className="mt-1 text-state-warning" />
            <span className="flex-1">ليس لديك دورة مسجَّلة تبيع تلقائيًا</span>
          </p>
          <ButtonLink href="/trainer/courses" variant="outline" size="s" fullWidth>
            أنشئ دورة مسجَّلة
          </ButtonLink>
        </div>
      )}
      {s.ratingTrainer !== null && (
        <p
          className={`flex items-start gap-2.5 rounded-12 px-4 pt-3.5 pb-4 type-body text-text-primary ${
            s.platformRatingAvg === null || s.ratingTrainer >= s.platformRatingAvg ? "bg-state-success-bg" : "bg-state-warning-bg"
          }`}
        >
          <Glyph icon={Star} size={20} className="mt-1 text-state-success" />
          <span className="flex-1">
            تقييمك {formatRating(s.ratingTrainer)} — {s.platformRatingAvg === null || s.ratingTrainer >= s.platformRatingAvg ? "أعلى من المتوسط" : `أقل من المتوسط ${formatRating(s.platformRatingAvg)}`}
          </span>
        </p>
      )}
      {hasRecorded && s.ratingTrainer === null && <p className="rounded-12 bg-bg-page px-4 py-3.5 type-body text-text-muted">سيظهر هنا ما يرفع دخلك بعد أول تقييم لدوراتك.</p>}
    </section>
  );

  return (
    <>
      <TopBar title="كم أستطيع أن أربح؟" subtitle="حاسبة تقديرية" />
      <PageBody className="gap-6">
        <Breadcrumb items={[{ label: "الرئيسية", href: "/trainer" }, { label: "حاسبة الدخل" }]} />
        <div className="flex flex-col gap-1.5">
          <h2 className="text-[28px] leading-[1.2] font-bold text-text-primary sm:text-[36px]">كم أستطيع أن أربح؟</h2>
          <p className="type-body-lg text-text-secondary">تقدير مبني على متوسطات المنصة في تخصصك — ليس وعدًا بدخل.</p>
        </div>
        <IncomeCalculator
          benchmarks={{ inPerson: n(b.in_person_per_course), live: n(b.live_per_course), recordedSale: n(b.recorded_per_sale) }}
          commissionPercent={s.commissionPercent}
          initial={initial}
          actual={{ month: s.monthTotal, avg3: s.threeMonthAvg }}
          hints={hints}
        />
      </PageBody>
    </>
  );
}
