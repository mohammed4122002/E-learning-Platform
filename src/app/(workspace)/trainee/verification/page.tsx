import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BadgeCheck, Clock, Info } from "lucide-react";
import { TopBar, PageBody } from "@/components/layout/TopBar";
import { Glyph } from "@/components/ui/Icon";
import { IconPill } from "@/components/profile/bits";
import { VerificationForm } from "@/components/verification/VerificationForm";
import { VerificationStatus, VERIFICATION_SUBTITLE } from "@/components/verification/VerificationStatus";
import { requireTrainee } from "@/lib/auth";
import { getLatestVerification } from "@/lib/data/profile";

export const metadata: Metadata = { title: "توثيق الهوية", description: "وثّق هويتك لتصبح شهاداتك قابلة للتحقق" };

/** TRN-VER-01 · توثيق الهوية (244:15646) and TRN-VER-02 · حالة التوثيق (244:15937 / 16155 / 16390 / 16615). */
export default async function VerificationPage({ searchParams }: PageProps<"/trainee/verification">) {
  const user = await requireTrainee("/trainee/verification");
  const sp = await searchParams;
  const latest = await getLatestVerification(user.id);
  const canSubmit = !latest || latest.status === "needs_changes" || latest.status === "rejected";
  const showForm = !latest || (sp.new === "1" && canSubmit);

  if (sp.new === "1" && !canSubmit) redirect("/trainee/verification");

  if (latest && !showForm) {
    return (
      <>
        <TopBar title="حالة التوثيق" subtitle={VERIFICATION_SUBTITLE[latest.status]} />
        <PageBody className="gap-6">
          <VerificationStatus v={latest} />
        </PageBody>
      </>
    );
  }

  return (
    <>
      <TopBar title="توثيق الهوية" subtitle="خطوتان · تستغرق ٣ دقائق" />
      <PageBody className="gap-6">
        <section aria-labelledby="ver-hero-title" className="flex flex-col gap-5 rounded-22 bg-bg-brand-tint px-5 py-6 sm:flex-row sm:items-center sm:gap-7 sm:px-[30px] sm:py-7">
          <span className="flex size-[68px] shrink-0 items-center justify-center rounded-16 bg-action-primary text-text-on-brand">
            <Glyph icon={BadgeCheck} size={32} />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <IconPill tone="surface-brand" icon={Info}>
                اختياري لكنه يفتح لك المزيد
              </IconPill>
              <IconPill tone="neutral" icon={Clock}>
                ٣ دقائق
              </IconPill>
            </div>
            <h2 id="ver-hero-title" className="text-[30px] font-bold leading-[1.2] text-text-primary sm:text-[36px]">
              {latest ? "أعد رفع مستندك" : "وثّق هويتك"}
            </h2>
            <p className="type-body-lg text-text-secondary">خطوتان فقط: اختر نوع الهوية وارفع صورتها. تُراجع خلال ٢٤ إلى ٤٨ ساعة عمل، ويصلك إشعار فور صدور القرار.</p>
          </div>
        </section>
        <VerificationForm
          userId={user.id}
          resubmit={latest ? { documentType: latest.documentType, note: latest.reviewerNote } : undefined}
        />
      </PageBody>
    </>
  );
}
