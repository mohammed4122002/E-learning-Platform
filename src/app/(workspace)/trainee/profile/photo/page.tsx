import type { Metadata } from "next";
import { TopBar, PageBody } from "@/components/layout/TopBar";
import { PhotoPanel } from "@/components/profile/PhotoPanel";
import { EditProfileSection } from "@/components/profile/EditProfileSection";
import { requireTrainee } from "@/lib/auth";
import { getMyProfile } from "@/lib/data/profile";

export const metadata: Metadata = { title: "صورة الملف", description: "اختر صورة من جهازك لتظهر في ملفك المهني" };

/** TRN-PRF-03 · صورة الملف (4151:2 · 4151:391 · 4151:737 · 4151:1083 · 4151:1429 · 4151:1778). */
export default async function ProfilePhotoPage() {
  const user = await requireTrainee("/trainee/profile/photo");
  const profile = await getMyProfile(user.id);
  return (
    <>
      <TopBar title="تحرير الملف" subtitle="ما تعدّله هنا يظهر في ملفك العام" />
      <PageBody className="gap-6">
        <PhotoPanel userId={user.id} fullName={profile.fullName} currentPath={profile.avatarPath} currentUrl={profile.avatarUrl} />
        <EditProfileSection profile={profile} />
      </PageBody>
    </>
  );
}
