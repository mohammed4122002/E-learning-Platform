import type { Metadata } from "next";
import { TopBar, PageBody } from "@/components/layout/TopBar";
import { AccountHeader } from "@/components/account/AccountHeader";
import { PrivacyPanel } from "@/components/account/PrivacyPanel";
import { requireUser } from "@/lib/auth";
import { getAccount, getDeletionBlockers } from "@/lib/data/account";

export const metadata: Metadata = { title: "الخصوصية والبيانات", description: "من يرى بياناتك، وتنزيلها، وحذف الحساب" };

/** GEN-ACC-01 · ٤ الخصوصية والبيانات (229:14437). */
export default async function PrivacyPage() {
  const user = await requireUser("/account/privacy");
  const [account, blockers] = await Promise.all([getAccount(user.id), getDeletionBlockers()]);
  return (
    <>
      <TopBar title="إعدادات الحساب" subtitle="الخصوصية والبيانات" />
      <PageBody className="gap-6">
        <AccountHeader active="/account/privacy" />
        <PrivacyPanel isPublic={account.isPublic} showCertificates={account.showCertificates} showLearningRecord={account.showLearningRecord} blockers={blockers} />
      </PageBody>
    </>
  );
}
