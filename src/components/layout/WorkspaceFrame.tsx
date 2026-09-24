import { AppShell } from "@/components/layout/AppShell";
import { WORKSPACE_SHELL, type ShellWorkspace } from "@/components/layout/nav";
import type { CurrentUser } from "@/lib/auth";
import { getShellData } from "@/lib/data/shell";
import { avatarUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import type { TrainerCardStats } from "@/components/layout/ShellContext";

async function getTrainerCard(verified: boolean): Promise<TrainerCardStats> {
  const supabase = await createClient();
  const [{ data: stats }, { data: views }] = await Promise.all([supabase.rpc("trainer_stats"), supabase.rpc("profile_view_count")]);
  const s = (stats ?? {}) as { rating_trainer?: number | null; active_trainees?: number };
  return { accredited: verified, rating: s.rating_trainer ?? null, learners: Number(s.active_trainees ?? 0), views: Number(views ?? 0) };
}

/** Server wrapper around <AppShell> for one workspace (trainee or trainer). */
export async function WorkspaceFrame({ user, workspace, children }: { user: CurrentUser; workspace: ShellWorkspace; children: React.ReactNode }) {
  const verified = user.identityStatus === "verified";
  const [data, trainerCard] = await Promise.all([getShellData(user.id), workspace === "trainer" ? getTrainerCard(verified) : Promise.resolve(undefined)]);
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
        trainerCard,
      }}
      data={data}
    >
      {children}
    </AppShell>
  );
}
