import { requireTrainer } from "@/lib/auth";

/** Trainer screens without the workspace sidebar (TRR-ONB-01/02 wizard, TRR-PRF-01 public profile view). */
export default async function TrainerBareLayout({ children }: { children: React.ReactNode }) {
  await requireTrainer("/trainer");
  return children;
}
