import { WorkspaceFrame } from "@/components/layout/WorkspaceFrame";
import { requireTrainer } from "@/lib/auth";

/** Trainer workspace frame (TRR-*): trainer sidebar, shared top bar. */
export default async function TrainerLayout({ children }: { children: React.ReactNode }) {
  const user = await requireTrainer("/trainer");
  return (
    <WorkspaceFrame user={user} workspace="trainer">
      {children}
    </WorkspaceFrame>
  );
}
