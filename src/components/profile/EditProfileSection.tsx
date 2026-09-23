import { Breadcrumb } from "@/components/ui/Navigation";
import { PageHeading } from "./bits";
import { EditProfileForm } from "./EditProfileForm";
import type { MyProfileView } from "@/lib/data/profile";

/** Body of TRN-PRF-02 (243:15464); TRN-PRF-03/04 render their flow panel above the same editor. */
export function EditProfileSection({ profile }: { profile: MyProfileView }) {
  return (
    <>
      <Breadcrumb items={[{ label: "الملف الشخصي", href: "/trainee/profile" }, { label: "تحرير" }]} />
      <PageHeading title="تحرير ملفي المهني" description="كل حقل موسوم بمن يراه. الحقول الموثّقة مقفلة — تغييرها يتطلب إعادة توثيق هويتك." />
      <EditProfileForm
        fullName={profile.fullName}
        verified={profile.identityStatus === "verified"}
        headline={profile.headline}
        bio={profile.bio}
        city={profile.city}
        phone={profile.phone}
        avatarUrl={profile.avatarUrl}
        experiences={profile.experiences}
        skills={profile.skills}
      />
    </>
  );
}
