import type { Metadata } from "next";
import type { LucideIcon } from "lucide-react";
import { Building2, Compass, Lightbulb, Plus, Tag, User } from "lucide-react";
import { TopBar, PageBody } from "@/components/layout/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Feedback";
import { Glyph } from "@/components/ui/Icon";
import { IconPill, TipStrip } from "@/components/ui/InfoBlocks";
import { PageHeading, SectionCard } from "@/components/ui/PageHeading";
import { FollowButton } from "@/components/course/FollowButton";
import { requireTrainee } from "@/lib/auth";
import { getFollows, type FollowItem } from "@/lib/data/follows";
import { formatRating, pluralAr, toArabicDigits } from "@/lib/format";

export const metadata: Metadata = { title: "المتابعات", description: "التخصصات والجهات والمدربون الذين تتابعهم." };

const programsWord = (n: number) => (n === 0 ? "لا برامج بعد" : pluralAr(n, ["برنامج واحد", "برنامجان", "برامج", "برنامجًا"]));

function Row({ item, icon }: { item: FollowItem; icon: LucideIcon }) {
  const meta =
    item.target === "category"
      ? `${programsWord(item.programs)} · ${item.newThisMonth ? `${pluralAr(item.newThisMonth, ["برنامج جديد", "برنامجان جديدان", "برامج جديدة", "برنامجًا جديدًا"])} هذا الشهر` : "لا جديد"}`
      : `${programsWord(item.programs)}${item.rating ? ` · ${formatRating(item.rating)} تقييم` : ""}`;
  return (
    <li className="flex w-full min-w-0 items-center gap-3 rounded-12 bg-bg-page px-3.5 py-[13px]">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-8 bg-bg-surface text-text-brand">
        <Glyph icon={icon} size={20} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <p className="min-w-0 flex-1 type-subtitle text-text-primary">{item.name}</p>
          {item.newThisMonth > 0 && (
            <IconPill icon={Plus} tone="surface-success">
              {item.newThisMonth === 1 ? "١ جديد" : `${toArabicDigits(item.newThisMonth)} جديدة`}
            </IconPill>
          )}
        </div>
        <p className="type-caption text-text-muted">{meta}</p>
      </div>
      <FollowButton mode="unfollow" target={item.target} targetId={item.targetId} targetName={item.name} initialFollowing className="w-20 shrink-0 sm:w-[120px]" />
    </li>
  );
}

function Group({ id, title, hint, items, icon, empty }: { id: string; title: string; hint: string; items: FollowItem[]; icon: LucideIcon; empty: React.ReactNode }) {
  return (
    <SectionCard
      title={title}
      titleId={id}
      aside={
        <IconPill tone="brand">
          {toArabicDigits(items.length)} متابَعة
        </IconPill>
      }
    >
      <p className="type-caption text-text-muted">{hint}</p>
      {items.length ? (
        <ul className="grid w-full grid-cols-1 gap-4 lg:grid-cols-2">
          {items.map((i) => (
            <Row key={i.followId} item={i} icon={icon} />
          ))}
        </ul>
      ) : (
        <p className="rounded-12 bg-bg-page px-4 py-3 type-small text-text-muted">{empty}</p>
      )}
    </SectionCard>
  );
}

/** TRN-FLW-01 · المتابعات — Figma 219:12673. */
export default async function FollowingPage() {
  const user = await requireTrainee("/trainee/following");
  const { categories, organizations, trainers, unfollowedCategories } = await getFollows(user.id);
  const total = categories.length + organizations.length + trainers.length;
  const summary = [
    categories.length ? pluralAr(categories.length, ["تخصصًا واحدًا", "تخصصين", "تخصصات", "تخصصًا"]) : null,
    organizations.length ? pluralAr(organizations.length, ["جهة واحدة", "جهتين", "جهات", "جهة"]) : null,
    trainers.length ? pluralAr(trainers.length, ["مدربًا واحدًا", "مدربَين", "مدربين", "مدربًا"]) : null,
  ].filter(Boolean);

  return (
    <>
      <TopBar title="المتابعات" subtitle="ما تتابعه يُغذّي مقترحاتك" />
      <PageBody className="gap-6">
        <PageHeading
          title="المتابعات"
          description={`متابعتك تُغذّي «مقترحة لك» في لوحتك وتُنبّهك بالجديد.${summary.length ? ` تتابع الآن ${summary.join(" و")}.` : ""}`}
        />
        <TipStrip icon={Lightbulb}>كلما تابعت أكثر، صارت مقترحاتك أدقّ. المتابعة لا تُلزمك بشيء ولا تُشارَك مع أحد، ويمكنك إلغاؤها في أي وقت.</TipStrip>

        {total === 0 ? (
          <EmptyState
            icon={Tag}
            title="لا تتابع أي شيء بعد"
            description="تابع التخصصات والجهات والمدربين من صفحات الدورات لتصلك تنبيهات بالجديد وتتحسّن مقترحاتك."
            action={<ButtonLink href="/trainee/discover">اكتشف التخصصات</ButtonLink>}
          />
        ) : (
          <>
            <Group id="follow-cats" title="التخصصات" hint="تظهر برامجها في «مقترحة لك» وتصلك تنبيهات بالبرامج الجديدة فيها." items={categories} icon={Tag} empty="لا تتابع أي تخصص بعد." />
            <Group id="follow-orgs" title="الجهات التدريبية" hint="يصلك إشعار عند نشرها برنامجًا جديدًا أو فتح دورة." items={organizations} icon={Building2} empty="لا تتابع أي جهة تدريبية بعد." />
            <Group id="follow-trainers" title="المدربون" hint="يصلك إشعار عند تقديمهم دورة جديدة." items={trainers} icon={User} empty="لا تتابع أي مدرب بعد." />
          </>
        )}

        {unfollowedCategories > 0 && (
          <section aria-labelledby="expand-title" className="flex w-full flex-col items-start gap-3.5 rounded-12 bg-bg-page px-5 py-[18px] sm:flex-row sm:items-center">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-8 bg-bg-brand-tint text-text-brand">
              <Glyph icon={Compass} size={20} />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
              <h2 id="expand-title" className="type-subtitle text-text-primary">
                وسّع اهتماماتك
              </h2>
              <p className="type-caption text-text-muted">هناك {pluralAr(unfollowedCategories, ["تخصص واحد آخر", "تخصصان آخران", "تخصصات أخرى", "تخصصًا آخر"])} على المنصة لم تتابعها بعد.</p>
            </div>
            <ButtonLink href="/trainee/discover" className="w-full sm:w-auto">
              اكتشف تخصصات جديدة
            </ButtonLink>
          </section>
        )}
      </PageBody>
    </>
  );
}
