import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { requireUser } from "@/lib/auth";
import { getShellData } from "@/lib/data/shell";
import { avatarUrl } from "@/lib/storage";

/** Signed-in workspace frame (trainee sidebar + shared screens: notifications, messages, account). */
export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (!user.workspaces.some((w) => w.kind === "trainee")) redirect("/select-workspace");
  const data = await getShellData(user.id);
  const verified = user.identityStatus === "verified";
  return (
    <AppShell
      user={{
        fullName: user.fullName || user.email,
        email: user.email,
        avatarUrl: avatarUrl(user.avatarPath),
        verified,
        roleLabel: verified ? "موثَّق · متدرب" : "متدرب",
      }}
      data={data}
    >
      {children}
    </AppShell>
  );
}
