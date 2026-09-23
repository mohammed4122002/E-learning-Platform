import type { Metadata } from "next";
import Link from "next/link";
import { Info } from "lucide-react";
import { TopBar, PageBody } from "@/components/layout/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { Glyph } from "@/components/ui/Icon";
import { AccountHeader } from "@/components/account/AccountHeader";
import { NotificationPrefsPanel } from "@/components/account/NotificationPrefsPanel";
import { requireUser } from "@/lib/auth";
import { getAccount } from "@/lib/data/account";

export const metadata: Metadata = { title: "تفضيلات الإشعارات", description: "تفضيلات الإشعارات والتواصل" };

/** GEN-ACC-01 · ٣ تفضيلات الإشعارات (229:14061). */
export default async function NotificationPrefsPage() {
  const user = await requireUser("/account/notifications");
  const account = await getAccount(user.id);
  return (
    <>
      <TopBar title="إعدادات الحساب" subtitle="تفضيلات الإشعارات والتواصل" />
      <PageBody className="gap-6">
        <AccountHeader active="/account/notifications" />
        <div className="flex flex-col items-start gap-4 rounded-16 border border-border-default bg-bg-page px-5 py-5 sm:flex-row sm:items-center">
          <Glyph icon={Info} size={20} className="hidden text-text-secondary sm:block" />
          <p className="flex-1 type-body text-text-secondary">هنا تضبط ما يصلك وأين — لا تقرأ إشعاراتك أو رسائلك. محتواها في صفحتيهما المستقلتين.</p>
          <ButtonLink href="/notifications" variant="outline">
            افتح مركز الإشعارات
          </ButtonLink>
          <Link href="/messages" className="rounded-8 px-2 type-subtitle text-text-brand hover:underline focus-ring">
            افتح المحادثات
          </Link>
        </div>
        <NotificationPrefsPanel initial={account.prefs} />
      </PageBody>
    </>
  );
}
