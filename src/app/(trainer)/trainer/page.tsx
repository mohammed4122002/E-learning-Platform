import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageBody, TopBar } from "@/components/layout/TopBar";
import { DefaultHome, NewTrainerHome, PartialHome } from "@/components/trainer/TrainerHome";
import { requireTrainer } from "@/lib/auth";
import { computeJourney, getSessionsBetween, homeState, profileStrength, riyadhDayStart } from "@/lib/data/trainer";
import { getTrainerQueue } from "@/lib/data/trainer-queue";
import { formatSessionTime, pluralAr } from "@/lib/format";
import { firstName, greeting } from "@/lib/trainer";

export const metadata: Metadata = { title: "لوحة المدرب", description: "نظرة عامة على نشاطك في مساحة المدرب" };

const SUBTITLE = { new: "ابدأ رحلتك", partial: "أكمل اعتمادك", default: "نظرة عامة على نشاطك" } as const;

/** TRR-DSH-01 · لوحة المدرب — default (256:848), new trainer (296:8159), partial accreditation (296:8468). */
export default async function TrainerHomePage() {
  const user = await requireTrainer("/trainer");
  const { items, overview: o } = await getTrainerQueue(user.id);
  if (!o.profile?.onboarding_completed_at) redirect("/trainer/onboarding");

  const journey = computeJourney(o);
  const state = homeState(o);
  const name = firstName(o.account.fullName || user.fullName);
  const greetingLine = `${greeting()} ${name} 👋`;

  let body: React.ReactNode;
  if (state === "new") {
    body = <NewTrainerHome o={o} journey={journey} firstName={name} />;
  } else if (state === "partial") {
    body = <PartialHome o={o} journey={journey} greetingLine={greetingLine} queue={items} strength={profileStrength(o)} />;
  } else {
    const start = riyadhDayStart(new Date());
    const today = await getSessionsBetween(o, start, new Date(start.getTime() + 86_400_000));
    const dayLabel = formatSessionTime(start).split(" · ")[0];
    const todayLabel = `${dayLabel} · ${today.length === 0 ? "لا جلسات" : pluralAr(today.length, ["جلسة واحدة", "جلستان", "جلسات", "جلسة"])}`;
    body = <DefaultHome o={o} journey={journey} greetingLine={greetingLine} queue={items} today={today} todayLabel={todayLabel} />;
  }

  return (
    <>
      <TopBar title="الرئيسية" subtitle={SUBTITLE[state]} />
      <PageBody className="gap-6">{body}</PageBody>
    </>
  );
}
