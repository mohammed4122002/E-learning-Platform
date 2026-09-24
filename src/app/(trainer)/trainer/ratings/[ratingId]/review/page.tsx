import type { Metadata } from "next";
import { CircleCheck, CircleX, Eye, FileText, Hourglass } from "lucide-react";
import { PageBody, TopBar } from "@/components/layout/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { Glyph } from "@/components/ui/Icon";
import { Breadcrumb } from "@/components/ui/Navigation";
import { ReviewForm } from "@/components/trainer-ops/ReviewForm";
import { DataPanel, OpsCard } from "@/components/trainer-ops/parts";
import { requireTrainer } from "@/lib/auth";
import { getManagedRating } from "@/lib/data/trainer-ratings";
import { formatRelative } from "@/lib/format";
import { REVIEW_REASONS } from "@/lib/validation/trainer-ops";

type Props = PageProps<"/trainer/ratings/[ratingId]/review">;

export const metadata: Metadata = { title: "طلب مراجعة تقييم", description: "مراجعة حيادية من فريق الامتثال" };

const AFTER = [
  { icon: FileText, tone: "text-text-brand", title: "يُسجَّل طلبك", body: "برقم مرجعي" },
  { icon: Hourglass, tone: "text-text-brand", title: "مراجعة حيادية", body: "٤٨ ساعة عمل · فريق الامتثال" },
  { icon: Eye, tone: "text-state-warning", title: "التقييم يبقى منشورًا", body: "أثناء المراجعة لا يُخفى" },
  { icon: CircleCheck, tone: "text-state-success", title: "القرار", body: "إبقاء أو إخفاء – يصلك مع سببه" },
];

const NOT_ACCEPTED = ["التقييم منخفض أو يضرّ بمتوسطي", "المتدرب لم يعجبه أسلوبي", "أرى أن التقييم غير عادل", "المتدرب لم يبذل جهدًا في الدورة"];

const STATUS: Record<string, { label: string; tone: "info" | "success" | "error" }> = {
  under_review: { label: "قيد المراجعة", tone: "info" },
  kept: { label: "أُبقي التقييم منشورًا", tone: "error" },
  hidden: { label: "أُخفي التقييم", tone: "success" },
};

/** TRR-RTG-03 · طلب مراجعة تقييم (291:8562). */
export default async function ReviewRequestPage(props: Props) {
  const { ratingId } = await props.params;
  const sp = await props.searchParams;
  const user = await requireTrainer(`/trainer/ratings/${ratingId}/review`);
  const r = await getManagedRating(ratingId);
  const open = r.review && (r.review.status === "under_review" || sp.sent === "1");

  const side = (
    <OpsCard title="ماذا يحدث بعد الإرسال؟" titleId="after-title">
      <ol className="flex flex-col gap-3">
        {AFTER.map((a) => (
          <li key={a.title} className="flex items-center gap-3 rounded-12 bg-bg-page px-3.5 py-3">
            <span className={`flex size-9 shrink-0 items-center justify-center rounded-8 bg-bg-surface ${a.tone}`}>
              <Glyph icon={a.icon} size={16} />
            </span>
            <span className="flex flex-col">
              <span className="type-small font-bold text-text-primary">{a.title}</span>
              <span className="type-caption text-text-muted">{a.body}</span>
            </span>
          </li>
        ))}
      </ol>
    </OpsCard>
  );

  return (
    <>
      <TopBar title="طلب مراجعة تقييم" subtitle="مراجعة حيادية من فريق الامتثال" />
      <PageBody className="gap-6">
        <Breadcrumb items={[{ label: "ملفي المهني", href: "/trainer/profile" }, { label: "التقييمات", href: "/trainer/ratings" }, { label: "طلب مراجعة" }]} />
        <section className="flex flex-col items-start gap-4 rounded-22 border-2 border-state-info bg-state-info-bg px-5 py-6 sm:flex-row sm:items-center sm:gap-6 sm:px-7">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <h1 className="text-[28px] leading-[1.2] font-bold text-text-primary sm:text-[32px]">طلب مراجعة تقييم</h1>
            <p className="type-body text-text-secondary">المراجعة لا تعني الحذف. يراجع فريق الامتثال التقييم مقابل شروط النشر فقط – التقييم السلبي الصادق يبقى منشورًا مهما كان قاسيًا.</p>
          </div>
          <span className="flex size-14 shrink-0 items-center justify-center rounded-16 bg-bg-surface text-state-info">
            <Glyph icon={Hourglass} size={24} />
          </span>
        </section>

        {open && r.review ? (
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            <div className="flex min-w-0 flex-1 flex-col gap-5">
              <DataPanel
                tone={STATUS[r.review.status]?.tone ?? "info"}
                title={r.review.status === "under_review" ? "أُرسل طلب المراجعة" : "صدر قرار المراجعة"}
                intro={r.review.status === "under_review" ? "يراجعه فريق الامتثال خلال ٤٨ ساعة عمل، ويبقى التقييم منشورًا حتى صدور القرار." : undefined}
                rows={[
                  { label: "رقم الطلب", value: <bdi dir="ltr" className="font-mono">{r.review.id.slice(0, 8).toUpperCase()}</bdi> },
                  { label: "التقييم", value: `${r.name} · ${r.courseTitle}` },
                  { label: "السبب", value: REVIEW_REASONS.find((x) => x.value === r.review?.reason)?.label ?? r.review.reason },
                  { label: "أُرسل", value: formatRelative(r.review.createdAt) },
                  { label: "الحالة", value: STATUS[r.review.status]?.label ?? r.review.status, tone: STATUS[r.review.status]?.tone ?? "info" },
                ]}
              />
              <div className="flex flex-col gap-3 sm:flex-row">
                <ButtonLink href="/trainer/ratings" size="l">
                  عد إلى التقييمات
                </ButtonLink>
                {r.reply?.status !== "published" && (
                  <ButtonLink href={`/trainer/ratings/${r.id}/reply`} variant="outline" size="l">
                    ردّ على التقييم
                  </ButtonLink>
                )}
              </div>
            </div>
            <div className="flex w-full shrink-0 flex-col gap-5 lg:w-[284px]">{side}</div>
          </div>
        ) : (
          <ReviewForm
            ratingId={r.id}
            userId={user.id}
            side={side}
            after={
              <OpsCard tone="error" title="أسباب لا تُقبل" titleId="rejected-title">
                <ul className="flex flex-col gap-3">
                  {NOT_ACCEPTED.map((t) => (
                    <li key={t} className="flex items-center gap-2.5 rounded-12 bg-bg-surface px-4 py-3 type-body text-text-primary">
                      <Glyph icon={CircleX} size={20} className="shrink-0 text-state-error" />
                      {t}
                    </li>
                  ))}
                </ul>
                <p className="type-small text-text-secondary">هذه أسباب مشروعة للانزعاج لكنها ليست مخالفة. الرد المهني عليها أنفع لك من طلب مراجعة مرفوض.</p>
              </OpsCard>
            }
          />
        )}
      </PageBody>
    </>
  );
}
