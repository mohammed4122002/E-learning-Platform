import type { Metadata } from "next";
import { Eye } from "lucide-react";
import { TopBar, PageBody } from "@/components/layout/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { Glyph } from "@/components/ui/Icon";
import { Alert } from "@/components/ui/Feedback";
import { Tabs } from "@/components/ui/Navigation";
import { MyProfile, PROFILE_TABS } from "@/components/profile/MyProfile";
import { PublicProfile } from "@/components/profile/PublicProfile";
import { PreviewAside } from "@/components/profile/PreviewAside";
import { requireTrainee } from "@/lib/auth";
import { getMyProfile, getPublicProfile } from "@/lib/data/profile";
import { env } from "@/lib/env";

export const metadata: Metadata = { title: "الملف الشخصي", description: "ملفك المهني وما يظهر منه للآخرين" };

/** TRN-PRF-01 · الملف الشخصي — ملفي (242:15093) · الملف العام معاينة (242:15479). */
export default async function ProfilePage({ searchParams }: PageProps<"/trainee/profile">) {
  const user = await requireTrainee("/trainee/profile");
  const sp = await searchParams;
  const preview = sp.tab === "preview";

  if (preview) {
    const [profile, mine] = await Promise.all([getPublicProfile(user.id), getMyProfile(user.id)]);
    const publicUrl = `${env.siteUrl.replace(/\/$/, "")}/u/${user.id}`;
    return (
      <>
        <TopBar title="الملف الشخصي" subtitle="معاينة ما يراه الآخرون" />
        <PageBody className="gap-6">
          {sp.saved === "1" && <Alert tone="success" title="حُفظت تعديلاتك">هذا ما يراه الآخرون الآن.</Alert>}
          <div className="flex flex-col items-start gap-4 rounded-12 border-[1.5px] border-dashed border-state-info bg-state-info-bg px-5 py-4 sm:flex-row sm:items-center">
            <Glyph icon={Eye} size={20} className="hidden text-state-info sm:block" />
            <p className="flex-1 type-body text-state-info">
              {mine.isPublic
                ? "أنت في وضع المعاينة — هذا بالضبط ما يراه أي شخص يفتح رابط ملفك. البيانات الخاصة مخفية تلقائيًا."
                : "أنت في وضع المعاينة — ملفك خاص حاليًا، فلا يراه أحد غيرك. هذا ما سيظهر إن فعّلت المشاركة."}
            </p>
            <ButtonLink href="/trainee/profile" variant="outline" size="s">
              اخرج من المعاينة
            </ButtonLink>
          </div>
          <Tabs tabs={PROFILE_TABS} active="/trainee/profile?tab=preview" label="أقسام الملف الشخصي" />
          {profile ? (
            <PublicProfile profile={profile} aside={<PreviewAside publicUrl={publicUrl} isPublic={mine.isPublic} />} />
          ) : (
            <Alert tone="warning" title="تعذّر عرض المعاينة">حسابك مجمّد، لذلك لا يظهر ملفك العام.</Alert>
          )}
        </PageBody>
      </>
    );
  }

  const profile = await getMyProfile(user.id);
  return (
    <>
      <TopBar title="الملف الشخصي" subtitle="ملفك المهني وما يظهر منه للآخرين" />
      <PageBody className="gap-6">
        <MyProfile profile={profile} />
      </PageBody>
    </>
  );
}
