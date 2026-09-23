import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TopBar, PageBody } from "@/components/layout/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { DataCard, DataRow, FlowNotice } from "@/components/profile/bits";
import { ExperienceForm } from "@/components/profile/ExperienceForm";
import { DeleteExperienceButton } from "@/components/profile/DeleteExperienceButton";
import { EditProfileSection } from "@/components/profile/EditProfileSection";
import { experienceYears } from "@/components/profile/format";
import { requireTrainee } from "@/lib/auth";
import { getMyProfile } from "@/lib/data/profile";
import { pluralAr } from "@/lib/format";

export const metadata: Metadata = { title: "الخبرات المهنية", description: "أضف خبراتك لتظهر في ملفك المهني" };

const secondary = "secondary" as const;

/**
 * TRN-PRF-04 · الخبرات المهنية — القائمة (4152:2) · فارغة (4152:392) · إضافة (4152:736) · تعديل (4152:1102) ·
 * تم الحفظ (4152:1460) · تأكيد الحذف (4152:1810). The step is driven by the URL (?mode=add | ?edit= | ?delete= | ?saved=).
 */
export default async function ExperiencePage({ searchParams }: PageProps<"/trainee/profile/experience">) {
  const user = await requireTrainee("/trainee/profile/experience");
  const sp = await searchParams;
  const profile = await getMyProfile(user.id);
  const list = profile.experiences;
  const find = (id: unknown) => (typeof id === "string" ? list.find((e) => e.id === id) : undefined);

  let panel: React.ReactNode;
  if (sp.mode === "add") {
    panel = <ExperienceForm />;
  } else if (sp.edit) {
    const e = find(sp.edit);
    if (!e) notFound();
    panel = <ExperienceForm key={e.id} experience={e} />;
  } else if (sp.delete) {
    const e = find(sp.delete);
    if (!e) notFound();
    panel = (
      <>
        <FlowNotice tone="error" title="حذف الخبرة">
          سيُحذف هذا السجل من ملفك المهني ولا يمكن التراجع.
        </FlowNotice>
        <DataCard title="بيانات الخبرة">
          <DataRow label="المسمى" value={e.title} />
          <DataRow label="الجهة" value={e.organization} />
          <DataRow label="المدة" value={experienceYears(e)} />
          <DataRow label="الإجراء" value="بانتظار تأكيدك" tone="error" />
        </DataCard>
        <div className="flex flex-wrap items-center gap-3">
          <ButtonLink href="/trainee/profile/experience" variant={secondary}>
            تراجع
          </ButtonLink>
          <DeleteExperienceButton id={e.id} />
        </div>
      </>
    );
  } else if (sp.saved) {
    const e = find(sp.saved);
    if (!e) notFound();
    panel = (
      <>
        <FlowNotice tone="success" title="حُفظت الخبرة">
          ظهرت الخبرة في ملفك المهني.
        </FlowNotice>
        <DataCard title="بيانات الخبرة">
          <DataRow label="المسمى" value={e.title} />
          <DataRow label="الجهة" value={e.organization} />
          <DataRow label="الحالة" value="محفوظة" tone="success" />
        </DataCard>
        <div className="flex flex-wrap items-center gap-3">
          <ButtonLink href="/trainee/profile/experience">عد إلى قائمة الخبرات</ButtonLink>
        </div>
      </>
    );
  } else if (list.length === 0) {
    panel = (
      <>
        <FlowNotice tone={sp.deleted ? "success" : "neutral"} title={sp.deleted ? "حُذفت الخبرة" : "لا توجد خبرات بعد"}>
          أضف خبرتك الأولى لتكتمل صورة ملفك المهني.
        </FlowNotice>
        <DataCard title="بيانات الخبرة">
          <DataRow label="عدد الخبرات" value="لا شيء" tone="muted" />
        </DataCard>
        <div className="flex flex-wrap items-center gap-3">
          <ButtonLink href="/trainee/profile" variant={secondary}>
            عد إلى ملفي
          </ButtonLink>
          <ButtonLink href="/trainee/profile/experience?mode=add">أضف خبرتك الأولى</ButtonLink>
        </div>
        <Link
          href="/trainee/profile/experience?mode=add"
          className="flex w-full items-center justify-center rounded-16 border-[1.5px] border-dashed border-action-primary bg-bg-surface px-6 py-9 type-subtitle font-bold text-text-brand focus-ring"
        >
          أضف خبرتك الأولى
        </Link>
      </>
    );
  } else {
    panel = (
      <>
        <FlowNotice tone={sp.deleted ? "success" : "brand"} title={sp.deleted ? "حُذفت الخبرة" : "خبراتك المهنية"}>
          {sp.deleted ? "لم يعد السجل يظهر في ملفك المهني." : "أضف خبراتك لتظهر في ملفك المهني."}
        </FlowNotice>
        <DataCard title="قائمة الخبرات">
          {list.map((e) => (
            <DataRow
              key={e.id}
              label={e.title}
              value={`${e.organization} · ${experienceYears(e)}`}
              action={
                <span className="flex items-center gap-2">
                  <Link
                    href={`/trainee/profile/experience?edit=${e.id}`}
                    aria-label={`تعديل خبرة ${e.title}`}
                    className="flex h-8 items-center rounded-8 bg-bg-surface px-3.5 type-caption text-text-brand inner-stroke istroke-w-[1.5px] istroke-c-action-primary focus-ring"
                  >
                    تعديل
                  </Link>
                  <Link
                    href={`/trainee/profile/experience?delete=${e.id}`}
                    aria-label={`حذف خبرة ${e.title}`}
                    className="flex h-8 items-center rounded-8 bg-bg-surface px-3.5 type-caption text-state-error inner-stroke istroke-w-[1.5px] istroke-c-state-error focus-ring"
                  >
                    حذف
                  </Link>
                </span>
              }
            />
          ))}
          <DataRow label="عدد الخبرات" value={pluralAr(list.length, ["خبرة واحدة", "خبرتان", "خبرات", "خبرة"])} />
        </DataCard>
        <div className="flex flex-wrap items-center gap-3">
          <ButtonLink href="/trainee/profile" variant={secondary}>
            عد إلى ملفي
          </ButtonLink>
          <ButtonLink href="/trainee/profile/experience?mode=add">أضف خبرة</ButtonLink>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar title="تحرير الملف" subtitle="ما تعدّله هنا يظهر في ملفك العام" />
      <PageBody className="gap-6">
        <section aria-label="الخبرات المهنية" className="flex flex-col gap-6">
          {panel}
        </section>
        <EditProfileSection profile={profile} />
      </PageBody>
    </>
  );
}
