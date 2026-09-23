import type { Metadata } from "next";
import { HelpCenter } from "@/components/support/HelpCenter";
import { getCurrentUser } from "@/lib/auth";
import { getHelpHome, isHelpCategory } from "@/lib/data/help";

export const metadata: Metadata = {
  title: "مركز المساعدة",
  description: "إجابات عن الدفع والاسترداد والتسجيل والشهادات والدورات المسجَّلة والحضورية والحساب في بوابة التدريب.",
};

/** Public TRN-HLP-01 · مركز المساعدة (Figma 223:12990) without the workspace sidebar. */
export default async function PublicHelpPage({ searchParams }: PageProps<"/help">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const [home, user] = await Promise.all([getHelpHome(q, isHelpCategory(sp.category) ? sp.category : null), getCurrentUser()]);
  const ticketHref = user ? "/trainee/inquiry" : "/login?next=%2Ftrainee%2Finquiry";
  const assistantHref = user ? "/trainee?assistant=1#assistant" : "/login?next=%2Ftrainee%3Fassistant%3D1";
  return <HelpCenter home={home} basePath="/help" ticketHref={ticketHref} assistantHref={assistantHref} tickets={null} />;
}
