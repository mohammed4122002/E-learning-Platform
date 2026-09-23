import type { Metadata } from "next";
import type { LucideIcon } from "lucide-react";
import { Award, Clock, Hourglass, Upload } from "lucide-react";
import { TopBar, PageBody } from "@/components/layout/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { ChipLink } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/Feedback";
import { Glyph } from "@/components/ui/Icon";
import { Notice, IconPill } from "@/components/ui/InfoBlocks";
import { PageHeading, SectionCard } from "@/components/ui/PageHeading";
import { ExternalCertificateCard, PlatformCertificateCard } from "@/components/certificates/CertificateCard";
import { conditionCopy, remainingLabel } from "@/components/certificates/conditions";
import { requireTrainee } from "@/lib/auth";
import { getCertificatesOverview, type PendingCertificate } from "@/lib/data/certificates";
import { formatDate, formatNumber, formatPercent, pluralAr, toArabicDigits } from "@/lib/format";

export const metadata: Metadata = { title: "شهاداتي", description: "كل شهاداتك في مكان واحد — الصادرة عن المنصة والمرفوعة من خارجها." };

const FILTERS = ["all", "platform", "external", "pending"] as const;
type Filter = (typeof FILTERS)[number];

function Stat({ icon, value, label }: { icon: LucideIcon; value: string; label: string }) {
  return (
    <li className="flex min-w-0 flex-col items-center gap-1.5 rounded-16 border border-border-default bg-bg-card px-3 py-5 text-center shadow-card">
      <span className="flex size-11 items-center justify-center rounded-8 bg-bg-brand-tint text-text-brand">
        <Glyph icon={icon} size={20} />
      </span>
      <span className="type-h2 text-text-primary">{value}</span>
      <span className="type-caption text-text-muted">{label}</span>
    </li>
  );
}

function PendingRow({ p }: { p: PendingCertificate }) {
  const next = p.conditions.find((c) => !c.met);
  const left = p.conditions.length - p.metCount;
  return (
    <li className="flex w-full flex-col gap-3.5 rounded-12 bg-state-warning-bg px-4 py-3.5 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3.5">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-8 bg-bg-surface text-state-warning">
          <Glyph icon={Hourglass} size={20} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
          <p className="type-subtitle text-text-primary">{p.courseTitle}</p>
          <p className="type-caption text-state-warning">
            {next ? `يتبقى ${conditionCopy(next).title}` : "بانتظار إصدار الشهادة"}
            {left > 0 ? ` (${remainingLabel(left)})` : ""} — أنجزت {formatPercent(p.percent)} من متطلبات الشهادة.
          </p>
        </div>
      </div>
      <ButtonLink href={`/trainee/certificates/${p.enrollmentId}`} className="w-full sm:w-auto sm:min-w-[120px]">
        أكمل الشرط
      </ButtonLink>
    </li>
  );
}

/** TRN-CRT-01 · شهاداتي — Figma 205:11303 (default) · 4136:1148 (revoked certificate notice). */
export default async function CertificatesPage({ searchParams }: PageProps<"/trainee/certificates">) {
  const user = await requireTrainee("/trainee/certificates");
  const sp = await searchParams;
  const filter: Filter = FILTERS.includes(sp.filter as Filter) ? (sp.filter as Filter) : "all";
  const { platform, external, pending, stats } = await getCertificatesOverview(user.id);

  const revoked = platform.filter((c) => c.status === "revoked");
  const total = platform.length + external.length;
  const hasAnything = total + pending.length > 0;
  const description = hasAnything
    ? `${stats.issued ? `${pluralAr(stats.issued, ["شهادة واحدة", "شهادتان", "شهادات", "شهادة"])} صادرة عن المنصة` : "لا شهادات صادرة عن المنصة بعد"}${
        stats.external ? ` و${pluralAr(stats.external, ["واحدة", "اثنتان", "شهادات", "شهادة"])} مرفوعة من خارجها` : ""
      }. جميعها تظهر أيضًا في ملف التدريب.`
    : "أكمل دورتك الأولى لتحصل على شهادة موثّقة برابط تحقق عام، أو أضف شهادة حصلت عليها خارج المنصة.";

  const showPlatform = filter === "all" || filter === "platform";
  const showExternal = filter === "all" || filter === "external";
  const showPending = filter === "all" || filter === "pending";
  const cards = [
    ...(showPlatform ? platform.map((c) => <PlatformCertificateCard key={c.id} certificate={c} />) : []),
    ...(showExternal ? external.map((c) => <ExternalCertificateCard key={c.id} certificate={c} />) : []),
  ];

  return (
    <>
      <TopBar title="الشهادات" subtitle="كل شهاداتك في مكان واحد" />
      <PageBody className="gap-6">
        {revoked.length > 0 && (
          <Notice tone="error" title={revoked.length === 1 ? "شهادة مسحوبة في قائمتك" : `${toArabicDigits(revoked.length)} شهادات مسحوبة في قائمتك`}>
            {revoked.map((c) => (
              <p key={c.id}>
                {c.courseTitle} · <span dir="ltr" className="font-mono">{c.code}</span> — سُحبت في {formatDate(c.revokedAt ?? c.issuedAt)}.
                {c.revokeReason ? ` ${c.revokeReason}` : ""}
              </p>
            ))}
            <p>التنزيل والمشاركة معطَّلان. تبقى في سجل التعلم بحالة واضحة ولا تُحذف.</p>
          </Notice>
        )}

        <PageHeading title="شهاداتي" description={description} />

        <ul aria-label="ملخص الشهادات" className="grid w-full grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          <Stat icon={Award} value={toArabicDigits(stats.issued)} label="صادرة عن المنصة" />
          <Stat icon={Upload} value={toArabicDigits(stats.external)} label="مرفوعة من خارج" />
          <Stat icon={Hourglass} value={toArabicDigits(stats.pending)} label="بانتظار شرط" />
          <Stat icon={Clock} value={formatNumber(stats.hours)} label="ساعة موثّقة" />
        </ul>

        {hasAnything && (
          <nav aria-label="تصفية الشهادات" className="flex w-full flex-wrap items-center gap-2.5">
            <ChipLink href="/trainee/certificates" selected={filter === "all"} className="min-w-[120px]">
              الكل · {toArabicDigits(total + pending.length)}
            </ChipLink>
            <ChipLink href="/trainee/certificates?filter=platform" selected={filter === "platform"}>
              صادرة عن المنصة · {toArabicDigits(platform.length)}
            </ChipLink>
            <ChipLink href="/trainee/certificates?filter=external" selected={filter === "external"}>
              مرفوعة · {toArabicDigits(external.length)}
            </ChipLink>
            <ChipLink href="/trainee/certificates?filter=pending" selected={filter === "pending"}>
              بانتظار شرط · {toArabicDigits(pending.length)}
            </ChipLink>
          </nav>
        )}

        {!hasAnything ? (
          <EmptyState
            icon={Award}
            title="لا شهادات بعد"
            description="أكمل دورتك الأولى لتحصل على شهادة موثّقة برابط تحقق عام يعمل دون تسجيل دخول."
            action={<ButtonLink href="/trainee/discover">اكتشف دورة</ButtonLink>}
          />
        ) : (
          cards.length > 0 && (
            <section aria-label="الشهادات" className="grid w-full grid-cols-1 items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3">
              {cards}
            </section>
          )
        )}

        {hasAnything && cards.length === 0 && !(showPending && pending.length) && (
          <EmptyState icon={Award} title="لا شهادات في هذا التصنيف" description="غيّر التصفية لعرض بقية شهاداتك." action={<ButtonLink href="/trainee/certificates" variant="outline">اعرض الكل</ButtonLink>} />
        )}

        {showPending && pending.length > 0 && (
          <SectionCard
            title={pending.length === 1 ? "شهادة بانتظار استيفاء شرط" : "شهادات بانتظار استيفاء شروط"}
            titleId="pending-title"
            aside={
              <IconPill icon={Hourglass} tone="warning">
                {pending.length === 1 ? remainingLabel(pending[0].conditions.length - pending[0].metCount || 1) : pluralAr(pending.length, ["شهادة واحدة", "شهادتان", "شهادات", "شهادة"])}
              </IconPill>
            }
          >
            <ul className="flex flex-col gap-3">
              {pending.map((p) => (
                <PendingRow key={p.enrollmentId} p={p} />
              ))}
            </ul>
          </SectionCard>
        )}

        <section
          aria-labelledby="external-cta-title"
          className="flex w-full flex-col items-start gap-5 rounded-16 border-[1.5px] border-dashed border-border-focus bg-bg-page px-6 py-[22px] sm:flex-row sm:items-center"
        >
          <span className="flex size-[52px] shrink-0 items-center justify-center rounded-12 bg-bg-surface text-text-brand">
            <Glyph icon={Upload} size={20} />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h2 id="external-cta-title" className="type-title text-text-primary">
              حصلت على شهادة من خارج المنصة؟
            </h2>
            <p className="type-body text-text-secondary">
              ارفعها لتظهر في ملف تدريبك وسجلّك المهني. ستُعرض موسومة «مرفوعة من صاحبها — لم تتحقق منها المنصة» تمييزًا لها عن الشهادات الصادرة عنّا.
            </p>
          </div>
          <ButtonLink href="/trainee/certificates/external/new" variant="outline" className="w-full sm:w-auto">
            أضف شهادة خارجية
          </ButtonLink>
        </section>
      </PageBody>
    </>
  );
}
