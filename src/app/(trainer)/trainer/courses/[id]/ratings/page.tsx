import type { Metadata } from "next";
import Link from "next/link";
import { CircleAlert, Info, Lightbulb, Star } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { Glyph } from "@/components/ui/Icon";
import { RatingStars } from "@/components/ui/Rating";
import { AxisRow, RatingCard } from "@/components/trainer-ops/Ratings";
import { RequestRatingsButton } from "@/components/trainer-ops/RequestRatingsButton";
import { MiniPill, OpsCard } from "@/components/trainer-ops/parts";
import { requireTrainer } from "@/lib/auth";
import { getManagedCourse } from "@/lib/data/trainer-course";
import { avg, getCourseRatings } from "@/lib/data/trainer-ratings";
import { formatRating, pluralAr, toArabicDigits } from "@/lib/format";

export async function generateMetadata(props: PageProps<"/trainer/courses/[id]/ratings">): Promise<Metadata> {
  const { id } = await props.params;
  const course = await getManagedCourse(id);
  return { title: `التقييمات · ${course.title}` };
}

const n = toArabicDigits;
const WINDOW_DAYS = 30;
const DAY = 86_400_000;

/** TRR-CRS-05 · ٩ التقييمات (438:20952). */
export default async function CourseRatingsTab(props: PageProps<"/trainer/courses/[id]/ratings">) {
  const { id } = await props.params;
  await requireTrainer(`/trainer/courses/${id}/ratings`);
  const course = await getManagedCourse(id);
  const v = await getCourseRatings(course);
  const items = v.items;
  const pending = items.filter((r) => r.reply?.status !== "published" && r.reply?.status !== "skipped");
  const hasOrg = items.some((r) => r.organization !== null);
  const score = avg(items.map((r) => r.score));
  const ended = course.endsAt ? new Date(course.endsAt).getTime() <= new Date().getTime() : false;
  const closesIn = course.endsAt ? Math.ceil((new Date(course.endsAt).getTime() + WINDOW_DAYS * DAY - new Date().getTime()) / DAY) : null;
  const recentlyAsked = v.lastRequestAt ? new Date().getTime() - new Date(v.lastRequestAt).getTime() < 3 * DAY : false;
  const lowest = [...items].sort((a, b) => a.score - b.score)[0];
  const diff = v.before !== null ? Math.round((v.overall - v.before) * 100) / 100 : null;
  const replyLabel = pending.length === 1 ? "ردّ على التقييم" : pending.length === 2 ? "ردّ على التقييمين" : `ردّ على ${n(pending.length)} تقييمات`;

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <OpsCard title="تقييم هذه الدورة" titleId="course-rating-title" titleSize="h2">
          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-16 bg-bg-page px-5 py-8 text-center">
              <span className="flex size-14 items-center justify-center rounded-16 bg-bg-surface text-state-rating">
                <Glyph icon={Star} size={24} />
              </span>
              <p className="type-h4 font-bold! text-text-primary">لا تقييمات بعد</p>
              <p className="type-body text-text-muted">{ended ? "يُفتح التقييم للمتدربين بعد انتهاء الدورة لمدة ٣٠ يومًا." : "يُفتح التقييم للمتدربين بعد انتهاء الدورة."}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4 sm:flex-row-reverse sm:items-stretch">
              <div className="flex shrink-0 flex-col items-center justify-center gap-2 rounded-16 bg-state-warning-bg px-6 py-5 sm:w-[164px]">
                <span className="text-[44px] leading-none font-bold text-state-warning">{formatRating(score)}</span>
                <RatingStars value={score} size="m" />
                <span className="type-caption text-text-muted">{`${pluralAr(items.length, ["تقييم واحد", "تقييمان", "تقييمات", "تقييمًا"])} من ${n(v.eligible || items.length)}`}</span>
              </div>
              <ul className="flex min-w-0 flex-1 flex-col gap-3">
                <AxisRow label="جودة المحتوى" value={avg(items.map((r) => r.content))} />
                <AxisRow label="أداء المدرب" value={avg(items.map((r) => r.trainer))} />
                {hasOrg && <AxisRow label="التنظيم والالتزام" value={avg(items.filter((r) => r.organization !== null).map((r) => r.organization as number))} />}
              </ul>
            </div>
          )}
          {hasOrg && course.organizationName && (
            <p className="flex items-start gap-2 rounded-16 bg-state-info-bg px-4 py-3.5 type-body text-state-info">
              <Glyph icon={Info} size={20} className="mt-0.5 shrink-0" />
              {`محورا المحتوى وأداء المدرب يذهبان لملفك · محور التنظيم لملف ${course.organizationName} – لأن القاعة والتنظيم مسؤوليتهم.`}
            </p>
          )}
        </OpsCard>

        <OpsCard
          title="تعليقات المتدربين"
          titleId="comments-title"
          titleSize="h2"
          aside={
            pending.length > 0 ? (
              <MiniPill icon={CircleAlert} tone="error" onTint={false}>
                {`${n(pending.length)} بلا رد`}
              </MiniPill>
            ) : undefined
          }
        >
          {items.length === 0 ? (
            <p className="rounded-16 bg-bg-page px-5 py-6 text-center type-body text-text-muted">تظهر تعليقات المتدربين هنا فور نشر تقييماتهم.</p>
          ) : (
            <ul className="flex flex-col gap-4">
              {items.map((r) => (
                <RatingCard key={r.id} r={r} replyLabel={course.trainerName} menu />
              ))}
            </ul>
          )}
          {hasOrg && course.organizationName && (
            <p className="flex items-start gap-2 rounded-16 bg-state-warning-bg px-4 py-3.5 type-body text-state-warning">
              <Glyph icon={Lightbulb} size={20} className="mt-0.5 shrink-0" />
              {`ملاحظة القاعة والمواعيد تخصّ ${course.organizationName} لا أنت – لكن الرد عليها يُظهر اهتمامك ويرفع ثقة القارئ.`}
            </p>
          )}
        </OpsCard>
      </div>

      <div className="flex w-full shrink-0 flex-col gap-5 lg:w-[346px]">
        <OpsCard title="إجراءات" titleId="rating-actions-title">
          {pending[0] && (
            <ButtonLink href={`/trainer/ratings/${pending[0].id}/reply`} size="l" fullWidth>
              {replyLabel}
            </ButtonLink>
          )}
          <RequestRatingsButton courseId={course.id} remaining={v.remaining} disabled={!ended || recentlyAsked || (closesIn !== null && closesIn <= 0)} />
          <p className="type-caption text-text-muted">
            {!ended
              ? "يُفتح التقييم بعد انتهاء الدورة."
              : v.remaining === 0
                ? "كل المتدربين قيّموا الدورة."
                : recentlyAsked
                  ? "أُرسل طلب التقييم مؤخرًا · يمكنك الطلب مجددًا بعد ٣ أيام من آخر طلب"
                  : closesIn !== null && closesIn > 0
                    ? `لم يقيّموا بعد · تُغلق المهلة بعد ${pluralAr(closesIn, ["يوم واحد", "يومين", "أيام", "يومًا"])}`
                    : "انتهت مهلة التقييم."}
          </p>
          {lowest && (
            <Link href={`/trainer/ratings/${lowest.id}/review`} className="self-center py-2 type-body text-text-brand hover:underline focus-ring">
              أبلغ عن تقييم مسيء
            </Link>
          )}
        </OpsCard>
        <OpsCard title="أثر هذه الدورة" titleId="impact-title">
          <ul className="flex flex-col gap-3">
            <li className="flex items-center justify-between gap-3 rounded-12 bg-bg-page px-4 py-4">
              <span className="type-body text-text-secondary">تقييمك العام</span>
              <span className="type-subtitle text-state-success">{v.overall ? formatRating(v.overall) : "—"}</span>
            </li>
            <li className="flex items-center justify-between gap-3 rounded-12 bg-bg-page px-4 py-4">
              <span className="type-body text-text-secondary">قبل هذه الدورة</span>
              <span className="type-subtitle text-text-muted">{v.before !== null ? new Intl.NumberFormat("ar-SA-u-nu-arab", { maximumFractionDigits: 2 }).format(v.before) : "—"}</span>
            </li>
            <li className="flex items-center justify-between gap-3 rounded-12 bg-bg-page px-4 py-4">
              <span className="type-body text-text-secondary">الأثر</span>
              <bdi dir="ltr" className={`type-subtitle ${diff === null ? "text-text-muted" : diff >= 0 ? "text-state-success" : "text-state-error"}`}>
                {diff === null ? "—" : `${diff >= 0 ? "+" : "−"}${new Intl.NumberFormat("ar-SA-u-nu-arab", { minimumFractionDigits: 2 }).format(Math.abs(diff))}`}
              </bdi>
            </li>
          </ul>
        </OpsCard>
      </div>
    </div>
  );
}
