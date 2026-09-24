"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { TrainerContent } from "@/lib/data/trainer-courses";
import { ContentEditor } from "../content/ContentEditor";
import { ContentProgressCard, PublishConditionsCard } from "../content/ContentReadiness";
import { useWizard } from "./WizardShell";

/* TRR-CRS-02 · ٣ المحتوى والوحدات (مسجَّلة) — 395:16270. */
export function ContentStep({ courseId, content }: { courseId: string; content: TrainerContent }) {
  const { flush } = useWizard();
  const router = useRouter();
  const [leaving, setLeaving] = useState<string | null>(null);
  const go = async (href: string, key: string) => {
    setLeaving(key);
    const ok = await flush();
    setLeaving(null);
    if (ok) router.push(href);
  };
  return (
    <div className="flex flex-col gap-[26px] lg:flex-row lg:items-start">
      <aside className="order-2 flex w-full shrink-0 flex-col gap-[22px] lg:order-none lg:w-[400px]">
        <ContentProgressCard content={content} action={{ label: "تابع للتسعير", href: `/trainer/courses/${courseId}/setup/pricing` }} />
        <PublishConditionsCard content={content} />
        <section className="flex flex-col gap-[18px] rounded-22 border border-border-default bg-bg-card p-[26px] shadow-card">
          <h2 className="type-h2 text-text-primary">متابعة</h2>
          <p className="type-body text-state-warning">يمكنك المتابعة والرفع مستمر — لكن النشر يتطلب اكتمال كل الشروط.</p>
          <Button size="l" fullWidth loading={leaving === "next"} onClick={() => void go(`/trainer/courses/${courseId}/setup/pricing`, "next")}>
            التالي · التسعير
          </Button>
          <Button size="l" fullWidth variant="outline" loading={leaving === "later"} onClick={() => void go("/trainer/courses", "later")}>
            احفظ وأكمل لاحقًا
          </Button>
          <Link href={`/trainer/courses/${courseId}/setup/mode`} className="flex h-14 items-center justify-center rounded-12 type-body-lg text-text-brand hover:bg-bg-brand-tint focus-ring">
            السابق · النمط
          </Link>
        </section>
      </aside>
      <div className="min-w-0 flex-1">
        <ContentEditor courseId={courseId} modules={content.modules} published={false} totals={content.totals} />
      </div>
    </div>
  );
}
