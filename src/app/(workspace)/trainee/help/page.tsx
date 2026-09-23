import type { Metadata } from "next";
import { TopBar, PageBody } from "@/components/layout/TopBar";
import { HelpCenter } from "@/components/support/HelpCenter";
import { requireTrainee } from "@/lib/auth";
import { getHelpHome, isHelpCategory } from "@/lib/data/help";
import { getMyTickets } from "@/lib/data/support";

export const metadata: Metadata = { title: "مركز المساعدة", description: "إجابات جاهزة لأكثر الأسئلة شيوعًا، وتذاكر الدعم." };

/** TRN-HLP-01 · مركز المساعدة — Figma 223:12990 (workspace version). */
export default async function TraineeHelpPage({ searchParams }: PageProps<"/trainee/help">) {
  const user = await requireTrainee("/trainee/help");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const [home, tickets] = await Promise.all([getHelpHome(q, isHelpCategory(sp.category) ? sp.category : null), getMyTickets(user.id)]);
  return (
    <>
      <TopBar title="مركز المساعدة" subtitle="كيف نساعدك اليوم؟" />
      <PageBody className="gap-6">
        <HelpCenter home={home} basePath="/trainee/help" ticketHref="/trainee/inquiry" assistantHref="/trainee?assistant=1#assistant" tickets={tickets} />
      </PageBody>
    </>
  );
}
