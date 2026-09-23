import Link from "next/link";
import { BellOff, CircleCheck, Clock, Route, Users } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { Countdown } from "@/components/ui/Countdown";
import { formatDayMonth, toArabicDigits } from "@/lib/format";
import type { WaitlistEntryView } from "@/lib/data/trainings";
import { leaveWaitlist, rejoinWaitlist } from "@/app/(workspace)/trainee/waitlist/actions";
import { Chip, CountdownChip, StatusItemCard } from "./ui";
import { ConfirmAction } from "./ConfirmAction";

const courseLink = (slug: string) => (
  <Link href={`/courses/${slug}`} className="whitespace-nowrap rounded-8 type-caption text-text-muted hover:text-text-primary hover:underline focus-ring">
    إشعارات هذه الدورة
  </Link>
);

/** Figma "Platform / Waitlist Entry" (562:24475 · invited / waiting / expired). */
export function WaitlistEntryCard({ entry, headingLevel }: { entry: WaitlistEntryView; headingLevel?: "h2" | "h3" }) {
  const description = `${entry.courseTitle} · ${entry.meta}`;
  const joined = `انضممت في ${formatDayMonth(entry.joinedAt)}`;

  if (entry.status === "invited" && entry.inviteExpiresAt) {
    return (
      <StatusItemCard
        headingLevel={headingLevel}
        tone="success"
        icon={CircleCheck}
        highlight
        title="دعوة قبول مقعد"
        badge={
          <Chip tone="success" icon={CircleCheck}>
            شغر مقعد لك
          </Chip>
        }
        description={description}
        facts={[
          { icon: Route, label: "كيف تعمل القائمة:", value: "أنت أول الترتيب — المقعد محجوز باسمك مؤقتًا" },
          {
            icon: Clock,
            label: "المتوقع:",
            value: (
              <>
                يتبقى <Countdown until={entry.inviteExpiresAt} /> لقبول المقعد
              </>
            ),
            valueClass: "text-state-success",
          },
        ]}
        refCode={entry.ref}
        meta={joined}
        footerChip={<CountdownChip until={entry.inviteExpiresAt} tone="warning" mono />}
        actions={
          <>
            <ButtonLink href={`/trainee/waitlist/${entry.id}`}>{entry.price > 0 ? "اقبل المقعد وادفع" : "اقبل المقعد"}</ButtonLink>
            <ConfirmAction
              trigger="link"
              label="اعتذر عن المقعد"
              title="الاعتذار عن المقعد؟"
              body={`سيُعرض المقعد في «${entry.courseTitle}» على التالي في الترتيب فورًا، وتخرج من قائمة الانتظار. لا يُخصم أي مبلغ.`}
              confirmLabel="نعم، اعتذر عن المقعد"
              destructive
              action={leaveWaitlist.bind(null, entry.id)}
            />
          </>
        }
      />
    );
  }

  if (entry.status === "waiting") {
    return (
      <StatusItemCard
        headingLevel={headingLevel}
        tone="brand"
        icon={Users}
        title="بانتظار شغور مقعد"
        badge={
          entry.position ? (
            <Chip tone="brand" icon={Users}>
              ترتيبك {toArabicDigits(entry.position)} من {toArabicDigits(entry.total ?? entry.position)}
            </Chip>
          ) : undefined
        }
        description={description}
        facts={[
          { icon: Route, label: "كيف تعمل القائمة:", value: "يُعرض المقعد على الأول في الترتيب أولًا" },
          { icon: Clock, label: "المتوقع:", value: "فور تحرّر مقعد بانسحاب أو إلغاء — سنُشعرك مباشرة" },
        ]}
        refCode={entry.ref}
        meta={joined}
        actions={
          <>
            <ConfirmAction
              label="إلغاء الانتظار"
              title="الخروج من قائمة الانتظار؟"
              body={`ستفقد ترتيبك في «${entry.courseTitle}». إن انضممت لاحقًا تعود إلى آخر القائمة.`}
              confirmLabel="نعم، ألغِ الانتظار"
              destructive
              action={leaveWaitlist.bind(null, entry.id)}
            />
            {courseLink(entry.courseSlug)}
          </>
        }
      />
    );
  }

  return (
    <StatusItemCard
      headingLevel={headingLevel}
      tone="neutral"
      icon={BellOff}
      title="انتقل المقعد للتالي"
      badge={
        <Chip tone="neutral" icon={BellOff}>
          انتهت مهلة القبول
        </Chip>
      }
      description={description}
      facts={[
        { icon: Route, label: "كيف تعمل القائمة:", value: "لم تُقبل الدعوة خلال المهلة فانتقل المقعد للتالي في الترتيب" },
        { icon: Clock, label: "المتوقع:", value: "يمكنك الانضمام للانتظار من جديد" },
      ]}
      refCode={entry.ref}
      meta={joined}
      actions={
        <>
          <ConfirmAction
            label="انضم لقائمة الانتظار"
            title="الانضمام لقائمة الانتظار من جديد؟"
            body={`تنضم إلى آخر قائمة «${entry.courseTitle}» ونُشعرك فور شغور مقعد. لا يُخصم أي مبلغ قبل قبولك للمقعد.`}
            confirmLabel="انضم للقائمة"
            action={rejoinWaitlist.bind(null, entry.courseId)}
          />
          {courseLink(entry.courseSlug)}
        </>
      }
    />
  );
}
