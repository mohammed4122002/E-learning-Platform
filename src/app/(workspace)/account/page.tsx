import type { Metadata } from "next";
import { TopBar, PageBody } from "@/components/layout/TopBar";
import { Alert } from "@/components/ui/Feedback";
import { AccountHeader } from "@/components/account/AccountHeader";
import { AccountIdentityForm, LocaleCard } from "@/components/account/AccountForms";
import { VerificationSideCard } from "@/components/account/VerificationSideCard";
import { requireUser } from "@/lib/auth";
import { getAccount } from "@/lib/data/account";

export const metadata: Metadata = { title: "إعدادات الحساب", description: "الحساب واللغة" };

/** GEN-ACC-01 · ١ الحساب واللغة (228:13766). */
export default async function AccountPage({ searchParams }: PageProps<"/account">) {
  const user = await requireUser("/account");
  const [account, sp] = await Promise.all([getAccount(user.id), searchParams]);
  return (
    <>
      <TopBar title="إعدادات الحساب" subtitle="الحساب واللغة" />
      <PageBody className="gap-6">
        <AccountHeader active="/account" />
        {sp.email === "changed" && <Alert tone="success" title="تأكّد بريدك الجديد">أصبح بريد الدخول هو {account.email}.</Alert>}
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="flex min-w-0 flex-col gap-6">
            <AccountIdentityForm
              userId={account.id}
              fullName={account.fullName}
              email={account.email}
              pendingEmail={account.pendingEmail}
              phone={account.phone}
              verified={account.identityStatus === "verified"}
              avatarUrl={account.avatarUrl}
            />
            <LocaleCard locale={account.locale} timezone={account.timezone} arabicDigits={account.arabicDigits} />
          </div>
          <aside aria-label="حالة التوثيق" className="flex min-w-0 flex-col gap-6">
            <VerificationSideCard verification={account.verification} />
          </aside>
        </div>
      </PageBody>
    </>
  );
}
