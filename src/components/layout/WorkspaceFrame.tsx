import { AppShell } from "@/components/layout/AppShell";
import { WORKSPACE_SHELL, type ShellWorkspace } from "@/components/layout/nav";
import type { CurrentUser } from "@/lib/auth";
import { getShellData } from "@/lib/data/shell";
import { avatarUrl } from "@/lib/storage";

/** Server wrapper around <AppShell> for one workspace (trainee or trainer). */
export async function WorkspaceFrame({ user, workspace, children }: { user: CurrentUser; workspace: ShellWorkspace; children: React.ReactNode }) {
  const data = await getShellData(user.id);
  const verified = user.identityStatus === "verified";
  const role = WORKSPACE_SHELL[workspace].role;
  return (
    <AppShell
      user={{
        fullName: user.fullName || user.email,
        email: user.email,
        avatarUrl: avatarUrl(user.avatarPath),
        verified,
        roleLabel: verified ? `موثَّق · ${role}` : role,
        workspace,
      }}
      data={data}
    >
      {children}
    </AppShell>
  );
}
