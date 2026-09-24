import { requireTrainer } from "@/lib/auth";

/**
 * Full-width trainer pages without the workspace sidebar (Figma TRR-PRG-06 / معاينة ظهور البرنامج draw the
 * program page as the public page with a slim «صفحة برنامج» bar). Access is still trainer-only.
 */
export default async function TrainerPageLayout({ children }: { children: React.ReactNode }) {
  await requireTrainer("/trainer/programs");
  return <div className="flex min-h-dvh flex-col bg-bg-page">{children}</div>;
}
