import { Shield } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { Glyph } from "@/components/ui/Icon";
import { Tabs } from "@/components/ui/Navigation";
import { PageHeading } from "@/components/profile/bits";

export const ACCOUNT_TABS = [
  { href: "/account", label: "الحساب واللغة" },
  { href: "/account/security", label: "الأمان والجلسات" },
  { href: "/account/notifications", label: "تفضيلات الإشعارات" },
  { href: "/account/privacy", label: "الخصوصية والبيانات" },
];

/** GEN-ACC-01 header shared by the four tabs (228:13766 · 228:13978 · 229:14061 · 229:14437). */
export function AccountHeader({ active }: { active: string }) {
  return (
    <>
      <PageHeading title="إعدادات الحساب" description="بياناتك وأمانك وإشعاراتك وخصوصيتك — كلها هنا. التغييرات تُحفظ فورًا ما لم يُذكر خلاف ذلك." />
      <div className="flex flex-col items-start gap-4 rounded-16 bg-bg-brand-tint px-5 py-5 sm:flex-row sm:items-center">
        <Glyph icon={Shield} size={20} className="hidden text-text-brand sm:block" />
        <p className="flex-1 type-body text-text-brand">هذه الصفحة لبيانات حسابك الخاصة — لا يراها أحد. ما يظهر للآخرين تتحكم به من «ملفي المهني» وهو منفصل تمامًا.</p>
        <ButtonLink href="/trainee/profile" variant="outline">
          اذهب لملفي المهني
        </ButtonLink>
      </div>
      <Tabs tabs={ACCOUNT_TABS} active={active} label="أقسام إعدادات الحساب" />
    </>
  );
}
