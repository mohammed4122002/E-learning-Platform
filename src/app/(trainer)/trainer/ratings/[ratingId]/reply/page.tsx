import type { Metadata } from "next";
import { CircleCheck, CircleX } from "lucide-react";
import { PageBody, TopBar } from "@/components/layout/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Data";
import { Glyph } from "@/components/ui/Icon";
import { Breadcrumb } from "@/components/ui/Navigation";
import { RatingStars } from "@/components/ui/Rating";
import { ReplyBox } from "@/components/trainer-ops/Ratings";
import { ReplyForm } from "@/components/trainer-ops/ReplyForm";
import { DataPanel, OpsCard } from "@/components/trainer-ops/parts";
import { requireTrainer } from "@/lib/auth";
import { getManagedRating } from "@/lib/data/trainer-ratings";
import { formatRelative } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

type Props = PageProps<"/trainer/ratings/[ratingId]/reply">;

export const metadata: Metadata = { title: "الرد على تقييم", description: "ردّك يظهر علنًا تحت التقييم" };

const HOW = [
  { ok: true, title: "اشكر دائمًا", body: "حتى على النقد – القارئ يلاحظ." },
  { ok: true, title: "اعترف بما هو صحيح", body: "الإنكار يضرّك أكثر من التقييم نفسه." },
  { ok: true, title: "اذكر إجراءً محددًا", body: "«زدت المدة» أقوى من «سنأخذ ملاحظتك»." },
  { ok: false, title: "لا تجادل ولا تشكّك", body: "«لم تحضر كل الجلسات» يبدو دفاعيًا." },
  { ok: false, title: "لا تذكر بيانات المتدرب", body: "درجاته أو حضوره – خصوصية." },
];

/** TRR-RTG-02 · الرد على تقييم (291:8261). */
export default async function ReplyPage(props: Props) {
  const { ratingId } = await props.params;
  const user = await requireTrainer(`/trainer/ratings/${ratingId}/reply`);
  const r = await getManagedRating(ratingId);
  const supabase = await createClient();
  const { data: me } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
  const author = me?.full_name ?? "المدرب";
  const published = r.reply?.status === "published";

  const rated = (
    <OpsCard title="التقييم الذي تردّ عليه" titleId="rated-title" titleSize="h2">
      <div className="flex flex-col gap-3 rounded-16 bg-bg-page px-4 py-4 sm:px-5">
        <div className="flex items-start gap-3">
          <Avatar name={r.name} size="m" />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="type-subtitle font-bold! text-text-primary">{r.name}</span>
            <span className="type-small text-text-muted">{`${r.courseTitle} · أكمل الدورة`}</span>
          </div>
          <RatingStars value={r.score} size="m" />
        </div>
        {r.comment ? <p className="type-body-lg text-text-primary">{`«${r.comment}»`}</p> : <p className="type-body text-text-muted">تقييم بالنجوم دون تعليق.</p>}
        <span className="type-caption text-text-muted">{`نُشر ${formatRelative(r.createdAt)} · يظهر في ملفك العام`}</span>
      </div>
    </OpsCard>
  );

  const sideAfter = (
    <>
      <OpsCard title="كيف تردّ باحتراف؟" titleId="how-title" titleSize="h2">
        <ul className="flex flex-col gap-3">
          {HOW.map((h) => (
            <li key={h.title} className={`flex items-start gap-2.5 rounded-12 px-4 py-3 ${h.ok ? "bg-state-success-bg" : "bg-state-error-bg"}`}>
              <Glyph icon={h.ok ? CircleCheck : CircleX} size={20} className={`mt-0.5 shrink-0 ${h.ok ? "text-state-success" : "text-state-error"}`} />
              <span className="flex flex-col gap-0.5">
                <span className={`type-body ${h.ok ? "text-state-success" : "text-state-error"}`}>{h.title}</span>
                <span className="type-caption text-text-muted">{h.body}</span>
              </span>
            </li>
          ))}
        </ul>
      </OpsCard>
      <OpsCard title="التقييم مخالف للشروط؟" titleId="violation-title" titleSize="h2" description="إن كان مسيئًا أو من شخص لم يحضر أو يكشف بيانات خاصة، اطلب مراجعته. لا نحذف التقييم لكونه سلبيًا.">
        <ButtonLink href={`/trainer/ratings/${r.id}/review`} variant="outline" size="l" fullWidth>
          اطلب مراجعة هذا التقييم
        </ButtonLink>
      </OpsCard>
    </>
  );

  return (
    <>
      <TopBar title="الرد على تقييم" subtitle="ردّك يظهر علنًا تحت التقييم" />
      <PageBody className="gap-6">
        <Breadcrumb items={[{ label: "ملفي المهني", href: "/trainer/profile" }, { label: "التقييمات", href: "/trainer/ratings" }, { label: "الرد" }]} />
        {published ? (
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            <div className="flex min-w-0 flex-1 flex-col gap-6">
              <DataPanel tone="success" title="نُشر ردّك" intro="يظهر ردّك الآن تحت التقييم في ملفك العام، ووصل إشعار للمتدرب. الرد نهائي ولا يمكن تعديله." />
              {rated}
              <OpsCard title="هكذا يظهر في ملفك العام" titleId="public-title" titleSize="h2">
                <div className="flex flex-col gap-3 rounded-16 border border-border-default bg-bg-card px-4 py-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={r.name} size="m" />
                    <span className="min-w-0 flex-1 type-subtitle text-text-primary">{r.name}</span>
                    <RatingStars value={r.score} />
                  </div>
                  {r.comment && <p className="type-body text-text-secondary">{r.comment}</p>}
                  <ReplyBox author={`ردّ ${author}`} body={r.reply?.body ?? ""} />
                </div>
              </OpsCard>
              <ButtonLink href="/trainer/ratings" size="l" className="self-start">
                عد إلى التقييمات
              </ButtonLink>
            </div>
            <div className="flex w-full shrink-0 flex-col gap-5 lg:w-[330px]">{sideAfter}</div>
          </div>
        ) : (
          <ReplyForm
            ratingId={r.id}
            traineeName={r.name}
            score={r.score}
            comment={r.comment}
            replyAuthor={author}
            draft={r.reply?.status === "draft" ? r.reply.body : null}
            skipped={r.reply?.status === "skipped"}
            rated={rated}
            sideAfter={sideAfter}
          />
        )}
      </PageBody>
    </>
  );
}
