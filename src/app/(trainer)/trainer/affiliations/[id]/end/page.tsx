import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Award, BookOpen, CalendarDays, CircleAlert, CircleX, Hourglass, Landmark, MessagesSquare, Star, Tag, Users } from "lucide-react";
import { PageBody, TopBar } from "@/components/layout/TopBar";
import { ActionButton } from "@/components/trainer-affiliations/ActionButtons";
import { EndAffiliationFlow } from "@/components/trainer-affiliations/EndAffiliationFlow";
import { Hero, HeroPill, TileRow, ToneCard } from "@/components/trainer-affiliations/parts";
import { Glyph } from "@/components/ui/Icon";
import { Breadcrumb } from "@/components/ui/Navigation";
import { requireTrainer } from "@/lib/auth";
import { getAffiliation } from "@/lib/data/trainer-affiliations";
import { formatDate, formatMonthYear, pluralAr } from "@/lib/format";
import { noticeLabel, runningCoursesTitle } from "@/lib/trainer-affiliations";

export const metadata: Metadata = { title: "إنهاء ارتباط" };

const TRY = [
  { icon: MessagesSquare, title: "تفاوض على العمولة", body: "أكثر أسباب الإنهاء قابل للحل بمحادثة.", subject: "التفاوض على العمولة" },
  { icon: Tag, title: "قلّص النطاق", body: "أبقِ برنامجًا واحدًا بدل الإنهاء الكامل.", subject: "تقليص نطاق الارتباط" },
  { icon: Hourglass, title: "جمّد مؤقتًا", body: "لا دورات جديدة مع بقاء العلاقة.", subject: "تجميد الارتباط مؤقتًا" },
];

/** TRR-AFL-03 · إنهاء ارتباط (293:9013). */
export default async function EndAffiliationPage({ params }: PageProps<"/trainer/affiliations/[id]/end">) {
  const { id } = await params;
  const user = await requireTrainer(`/trainer/affiliations/${id}/end`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const a = await getAffiliation(id, user.id);
  if (!a) notFound();
  if (a.status === "ended") redirect("/trainer/affiliations");
  const ending = a.status === "ending";
  const notice = noticeLabel(a.noticeDays);

  const tryCard = (
    <section aria-labelledby="try-title" className="flex w-full flex-col items-start gap-[18px] rounded-22 border border-border-default bg-bg-card p-5 shadow-card sm:p-[26px]">
      <h2 id="try-title" className="type-h2 text-text-primary">
        قبل الإنهاء — جرّب هذا
      </h2>
      <ul className="flex w-full flex-col gap-[18px]">
        {TRY.map((t) => (
          <li key={t.title} className="w-full">
            <ActionButton
              kind="conversation"
              fields={{ orgId: a.org.id, subject: `${t.subject} · ${a.org.name}` }}
              className="flex w-full cursor-pointer items-start gap-3 rounded-12 bg-bg-page px-3.5 py-[13px] text-start hover:bg-bg-brand-tint focus-ring"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-8 bg-bg-surface text-text-brand">
                <Glyph icon={t.icon} size={20} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="type-subtitle text-text-primary">{t.title}</span>
                <span className="type-caption text-text-muted">{t.body}</span>
              </span>
            </ActionButton>
          </li>
        ))}
      </ul>
    </section>
  );

  const mainTop = (
    <>
      <ToneCard tone="success" big>
        <h2 className="type-h2 text-state-success">ما الذي يستمر — ولا تقلق منه</h2>
        <ul className="flex w-full flex-col gap-4">
          <TileRow icon={BookOpen} title={runningCoursesTitle(a.runningCourses)} body="تُستكمل حتى نهايتها بمواعيدها ومتدربيها" />
          <TileRow icon={Hourglass} title="إيرادك من هذه الدورات" body="يصلك كاملًا بعد انتهائها كالمعتاد" />
          <TileRow icon={Award} title="شهادات متدربيها" body="تصدر عادةً باسمك واسم المعهد" />
          <TileRow icon={Star} title="تقييماتك منها" body="تبقى في ملفك ولا تُحذف" />
        </ul>
      </ToneCard>
      <ToneCard tone="warning" big>
        <h2 className="type-h2 text-state-warning">ما الذي يتوقف</h2>
        <ul className="flex w-full flex-col gap-4">
          <TileRow icon={CircleX} title="لا دورات جديدة" body="لا يستطيع المعهد جدولة دورة جديدة من برامجك" />
          <TileRow icon={CalendarDays} title={`مهلة ${notice}`} body={`الإنهاء يسري بعد ${notice} من إشعارك — نظاميًا`} />
          <TileRow icon={Landmark} title="يختفي من ملفك العام" body="بعد سريان الإنهاء" />
          <TileRow icon={Users} title="متدربو المعهد" body="لا يصبحون متدربيك المباشرين — علاقتهم بالمعهد" />
        </ul>
      </ToneCard>
    </>
  );

  return (
    <>
      <TopBar title="إنهاء ارتباط" subtitle={a.org.name} />
      <PageBody className="!gap-6">
        <Breadcrumb items={[{ label: "ملفي المهني", href: "/trainer/profile" }, { label: "الارتباطات", href: "/trainer/affiliations" }, { label: "إنهاء" }]} />
        <Hero
          tone="warning"
          icon={Landmark}
          title={`إنهاء الارتباط ب${a.org.name}`}
          pills={
            <>
              <HeroPill icon={Users} tone="brand">
                {a.trainees === 0 ? "لا متدربين بعد" : pluralAr(a.trainees, ["متدرب واحد", "متدربان", "متدربين", "متدربًا"])}
              </HeroPill>
              <HeroPill icon={CircleAlert} tone="error">
                {a.runningCourses === 0 ? "لا دورات جارية" : pluralAr(a.runningCourses, ["دورة جارية واحدة", "دورتان جاريتان", "دورات جارية", "دورة جارية"])}
              </HeroPill>
              <HeroPill icon={CalendarDays} tone="neutral">
                نشط منذ {formatMonthYear(a.startedAt)}
              </HeroPill>
            </>
          }
        >
          الإنهاء لا يُلغي شيئًا فورًا. تستمر الدورات الجارية حتى نهايتها ويستمر إيرادك منها — لكن لا دورات جديدة بعد الإشعار.
        </Hero>
        <EndAffiliationFlow
          affiliationId={a.id}
          ending={ending}
          endingNote={ending && a.endEffectiveAt ? `أشعرت ${a.org.name} بالإنهاء في ${formatDate(a.endRequestedAt ?? a.endEffectiveAt)} — يسري في ${formatDate(a.endEffectiveAt)}.` : null}
          noticeText={`أفهم أن الإنهاء يسري بعد ${notice} وأن الدورات الجارية تستمر`}
          mainTop={mainTop}
          tryCard={tryCard}
        />
      </PageBody>
    </>
  );
}
