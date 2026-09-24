import type { Metadata } from "next";
import { WorkspaceFrame } from "@/components/layout/WorkspaceFrame";
import { EmptyProfile } from "@/components/trainer/EmptyProfile";
import { PublicProfileView } from "@/components/trainer/PublicProfileView";
import { requireTrainer } from "@/lib/auth";
import { getTrainerOverview } from "@/lib/data/trainer";
import { getPublicProfile, isProfileEmpty } from "@/lib/data/trainer-profile";

export const metadata: Metadata = { title: "الملف المهني", description: "ملفك المهني كما تراه الجهات التدريبية" };

/**
 * TRR-PRF-01 · الملف المهني — public view as organizations see it (289:7405, no sidebar) and the empty state of a new
 * trainer (290:8349, inside the workspace shell).
 */
export default async function TrainerProfilePage() {
  const user = await requireTrainer("/trainer/profile");
  const o = await getTrainerOverview(user.id);
  if (isProfileEmpty(o)) {
    return (
      <WorkspaceFrame user={user} workspace="trainer">
        <EmptyProfile o={o} />
      </WorkspaceFrame>
    );
  }
  const data = await getPublicProfile(user.id);
  return <PublicProfileView data={data} userId={user.id} />;
}
