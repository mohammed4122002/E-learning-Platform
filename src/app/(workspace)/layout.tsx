import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { WorkspaceFrame } from "@/components/layout/WorkspaceFrame";
import { WORKSPACE_COOKIE, requireUser } from "@/lib/auth";

/**
 * Trainee area + shared screens (notifications, messages, account, checkout).
 * Shared screens keep the shell of the workspace area the user came from (cookie set by proxy.ts).
 * Every trainee page checks its own access with requireTrainee().
 */
export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const kinds = new Set(user.workspaces.map((w) => w.kind));
  if (!kinds.has("trainee") && !kinds.has("trainer")) redirect("/select-workspace");
  const last = (await cookies()).get(WORKSPACE_COOKIE)?.value;
  const workspace = (last === "trainer" && kinds.has("trainer")) || !kinds.has("trainee") ? "trainer" : "trainee";
  return (
    <WorkspaceFrame user={user} workspace={workspace}>
      {children}
    </WorkspaceFrame>
  );
}
