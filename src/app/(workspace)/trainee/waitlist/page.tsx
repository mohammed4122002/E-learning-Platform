import type { Metadata } from "next";
import { BookOpen } from "lucide-react";
import { PageBody, TopBar } from "@/components/layout/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Feedback";
import { PageHeading, numberWord } from "@/components/trainings/ui";
import { WaitlistEntryCard } from "@/components/trainings/WaitlistEntryCard";
import { WaitlistHowItWorks } from "@/components/trainings/WaitlistHowItWorks";
import { requireTrainee } from "@/lib/auth";
import { getWaitlistEntries } from "@/lib/data/waitlist";

export const metadata: Metadata = { title: "قائمة انتظاري", description: "الدورات المكتملة التي تنتظر شغور مقعد فيها" };

const COURSES: [string, string, string, string, string] = ["صفر", "دورة واحدة", "دورتان", "دورات", "دورة"];

/** TRN-WTL-01 · قائمة انتظاري — default (171:6884) and empty (171:7185). */
export default async function WaitlistPage() {
  const user = await requireTrainee("/trainee/waitlist");
  const entries = await getWaitlistEntries(user.id);
  const active = entries.filter((e) => e.status !== "expired").length;

  return (
    <>
      <TopBar title="قائمة انتظاري" subtitle="الدورات المكتملة التي تنتظر شغور مقعد فيها" />
      <PageBody className="gap-6">
        <PageHeading
          title="قائمة انتظاري"
          description={
            entries.length === 0
              ? "لست في انتظار أي دورة حاليًا."
              : `أنت في انتظار ${numberWord(active, ["أي دورة", "دورة واحدة", "دورتين", "دورات", "دورة"])}. سنُشعرك فور شغور مقعد ولك مهلة محددة لقبوله.`
          }
          count={numberWord(entries.length, COURSES)}
        />
        {entries.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="لست في قائمة انتظار أي دورة"
            description="عندما تكتمل مقاعد دورة تريدها، ستجد زر «انضم لقائمة الانتظار» في صفحة الدورة — وسنتولّى الباقي."
            action={<ButtonLink href="/trainee/discover">استكشف الدورات</ButtonLink>}
            className="border-dashed"
          />
        ) : (
          <section aria-label="دورات قائمة الانتظار" className="flex flex-col gap-4">
            {entries.map((e) => (
              <WaitlistEntryCard key={e.id} entry={e} />
            ))}
          </section>
        )}
        <WaitlistHowItWorks />
      </PageBody>
    </>
  );
}
