import type { Metadata } from "next";
import { Star, Timer } from "lucide-react";
import { TopBar, PageBody } from "@/components/layout/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Feedback";
import { Glyph } from "@/components/ui/Icon";
import { IconPill } from "@/components/ui/InfoBlocks";
import { Tabs } from "@/components/ui/Navigation";
import { PageHeading, SectionCard } from "@/components/ui/PageHeading";
import { ReviewCard } from "@/components/ratings/ReviewCard";
import { requireTrainee } from "@/lib/auth";
import { getRatingsOverview, modeLabel, type AwaitingRating } from "@/lib/data/ratings";
import { formatDayMonth, formatRating, pluralAr, toArabicDigits } from "@/lib/format";

export const metadata: Metadata = { title: "تقييماتي", description: "تقييماتك المرسلة والدورات التي تنتظر تقييمك." };

function AwaitingRow({ a }: { a: AwaitingRating }) {
  const urgent = a.daysLeft <= 7;
  return (
    <li
      className={`flex w-full flex-col gap-4 rounded-12 px-4 py-3.5 sm:flex-row sm:items-center ${urgent ? "border-[1.5px] border-state-warning bg-state-warning-bg" : "bg-bg-page"}`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-8 bg-bg-surface text-state-rating">
          <Glyph icon={Star} size={20} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-[5px]">
          <p className="type-subtitle text-text-primary">{a.courseTitle}</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <p className="min-w-0 flex-1 type-caption text-text-muted">
              {a.sourceName} · {modeLabel(a.courseMode)} · انتهت {formatDayMonth(a.endedAt)}
            </p>
            <IconPill icon={Timer} tone={urgent ? "surface-warning" : "surface-brand"}>
              يتبقى {pluralAr(a.daysLeft, ["يوم واحد", "يومان", "أيام", "يومًا"])}
            </IconPill>
          </div>
        </div>
      </div>
      <ButtonLink href={`/trainee/ratings/new?enrollment=${a.enrollmentId}`} className="w-full sm:w-[120px]">
        قيّم الآن
      </ButtonLink>
    </li>
  );
}

/** TRN-RTG-02 · تقييماتي — Figma 217:12068. */
export default async function RatingsPage({ searchParams }: PageProps<"/trainee/ratings">) {
  const user = await requireTrainee("/trainee/ratings");
  const sp = await searchParams;
  const tab = sp.tab === "sent" ? "sent" : "pending";
  const { awaiting, sent, averageGiven } = await getRatingsOverview(user.id);
  const author = user.fullName || user.email;

  const description =
    sent.length || awaiting.length
      ? `${sent.length ? `قيّمت ${pluralAr(sent.length, ["دورة واحدة", "دورتين", "دورات", "دورة"])}` : "لم تقيّم أي دورة بعد"}${
          awaiting.length ? `، وتنتظرك ${pluralAr(awaiting.length, ["دورة واحدة", "دورتان", "دورات", "دورة"])}` : ""
        }. تقييمك يُنشر باسمك ويصل إلى الجهة والمدرب.`
      : "بعد إتمام أي دورة يمكنك تقييمها خلال ٣٠ يومًا. تقييمك يُنشر باسمك ويصل إلى الجهة والمدرب.";

  return (
    <>
      <TopBar title="التقييمات" subtitle="تقييماتك وما ينتظر تقييمك" />
      <PageBody className="gap-6">
        <PageHeading title="تقييماتي" description={description} />
        <Tabs
          label="أقسام التقييمات"
          active={tab === "sent" ? "/trainee/ratings?tab=sent" : "/trainee/ratings"}
          tabs={[
            { href: "/trainee/ratings", label: `بانتظار تقييمك · ${toArabicDigits(awaiting.length)}` },
            { href: "/trainee/ratings?tab=sent", label: `تقييماتي المرسلة · ${toArabicDigits(sent.length)}` },
          ]}
        />

        {tab === "pending" && (
          <SectionCard title="دورات تنتظر تقييمك" titleId="awaiting-title">
            <p className="type-caption text-text-muted">التقييم متاح ٣٠ يومًا بعد انتهاء الدورة ويُرسل مرة واحدة فقط. بعد المهلة يُغلق ولا يمكن التقييم.</p>
            {awaiting.length ? (
              <ul className="flex flex-col gap-4">
                {awaiting.map((a) => (
                  <AwaitingRow key={a.enrollmentId} a={a} />
                ))}
              </ul>
            ) : (
              <EmptyState icon={Star} title="لا دورات تنتظر تقييمك" description="أحسنت — قيّمت كل دوراتك المكتملة. ستظهر هنا الدورات التي تُتمّها لاحقًا." />
            )}
          </SectionCard>
        )}

        <SectionCard
          title="تقييماتي المرسلة"
          titleId="sent-title"
          aside={
            averageGiven !== null && (
              <IconPill icon={Star} tone="page">
                <span className="text-state-rating">متوسط تقييمك {formatRating(averageGiven)}</span>
              </IconPill>
            )
          }
        >
          <p className="type-caption text-text-muted">لا يمكن تعديل التقييم بعد إرساله. يمكن للمقدّم الرد عليه ردًّا واحدًا.</p>
          {sent.length ? (
            <div className="flex flex-col gap-4">
              {sent.map((r) => (
                <ReviewCard key={r.id} rating={r} authorName={author} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Star}
              title="لم ترسل أي تقييم بعد"
              description="تقييمك يساعد متدربين آخرين على اختيار الدورة المناسبة."
              action={awaiting.length ? <ButtonLink href={`/trainee/ratings/new?enrollment=${awaiting[0].enrollmentId}`}>قيّم «{awaiting[0].courseTitle}»</ButtonLink> : undefined}
            />
          )}
        </SectionCard>
      </PageBody>
    </>
  );
}
