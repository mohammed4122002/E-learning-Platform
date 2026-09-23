import type { Metadata } from "next";
import { TopBar, PageBody } from "@/components/layout/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { EditProfileSection } from "@/components/profile/EditProfileSection";
import { requireTrainee } from "@/lib/auth";
import { getMyProfile } from "@/lib/data/profile";

export const metadata: Metadata = { title: "تحرير الملف", description: "ما تعدّله هنا يظهر في ملفك العام" };

/** TRN-PRF-02 · تحرير الملف (243:15464). */
export default async function EditProfilePage() {
  const user = await requireTrainee("/trainee/profile/edit");
  const profile = await getMyProfile(user.id);
  return (
    <>
      <TopBar title="تحرير الملف" subtitle="ما تعدّله هنا يظهر في ملفك العام" />
      <PageBody className="gap-6">
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/trainee/profile/experience?mode=add" className="min-w-[120px]">
            أضف خبرة
          </ButtonLink>
          <ButtonLink href="/trainee/profile/photo" className="min-w-[120px]">
            ارفع صورة
          </ButtonLink>
        </div>
        <EditProfileSection profile={profile} />
      </PageBody>
    </>
  );
}
