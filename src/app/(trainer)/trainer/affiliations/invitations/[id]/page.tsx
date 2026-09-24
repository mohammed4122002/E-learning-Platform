import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { BadgeCheck, BookOpen, CalendarDays, Clock, Contact, Hourglass, Info, Landmark, Lock, MapPin, Shield, Star, Tag, Users } from "lucide-react";
import { PageBody, TopBar } from "@/components/layout/TopBar";
import { ActionButton, DeclineButton } from "@/components/trainer-affiliations/ActionButtons";
import { AcceptInvitationButton } from "@/components/trainer-affiliations/AcceptInvitationButton";
import { Card, Columns, Hero, HeroPill, TileRow, ToneCard } from "@/components/trainer-affiliations/parts";
import { Alert } from "@/components/ui/Feedback";
import { Glyph } from "@/components/ui/Icon";
import { Breadcrumb } from "@/components/ui/Navigation";
import { requireTrainer } from "@/lib/auth";
import { getInvitation } from "@/lib/data/trainer-affiliations";
import { formatDate, formatNumber, formatRating, pluralAr } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { commissionLabel, durationLabel, expiresInLabel } from "@/lib/trainer-affiliations";
import { money2 } from "@/lib/trainer-contracts";

export const metadata: Metadata = { title: "دعوة ارتباط" };

/** Example price of the «كم ستربح فعليًا؟» card (Figma copy: «مثال على دورة سعرها ٢٤٠ ر.س للمتدرب»). */
const EXAMPLE_PRICE = 240;

const STATUS_NOTE: Record<string, { title: string; body: string }> = {
  accepted: { title: "قبلت هذه الدعوة", body: "الارتباط نشط — تجده في ارتباطاتي." },
  declined: { title: "رفضت هذه الدعوة", body: "أُبلغت الجهة برفضك بلا سبب." },
  expired: { title: "انتهت مهلة هذه الدعوة", body: "لم يعد بالإمكان قبولها أو رفضها. يمكن للجهة إرسال دعوة جديدة." },
  withdrawn: { title: "سحبت الجهة هذه الدعوة", body: "لم تعد الدعوة متاحة." },
};

function TermRow({ icon, label, value, tone = "primary" }: { icon: LucideIcon; label: string; value: string; tone?: "primary" | "warning" | "success" }) {
  const c = tone === "warning" ? "text-state-warning" : tone === "success" ? "text-state-success" : "text-text-primary";
  return (
    <div className="flex w-full flex-col gap-2 rounded-16 bg-bg-page px-[18px] py-4 sm:flex-row sm:items-center sm:gap-3.5">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-12 bg-bg-surface text-text-brand">
          <Glyph icon={icon} size={20} />
        </span>
        <dt className="min-w-0 flex-1 type-body-lg text-text-secondary">{label}</dt>
      </div>
      <dd className={`type-subtitle ${c}`}>{value}</dd>
    </div>
  );
}

function MoneyLine({ label, value, tone = "primary", big }: { label: string; value: string; tone?: "primary" | "warning" | "success"; big?: boolean }) {
  const c = tone === "warning" ? "text-state-warning" : tone === "success" ? "text-state-success" : "text-text-primary";
  return (
    <div className="flex w-full items-center gap-3">
      <dt className={`min-w-0 flex-1 text-text-secondary ${big ? "type-h3" : "type-body-lg"}`}>{label}</dt>
      <dd className={`shrink-0 ${big ? "type-h2" : "type-title"} ${c}`}>{value}</dd>
    </div>
  );
}

/** TRR-AFL-02 · قبول دعوة ارتباط (293:8660). */
export default async function InvitationPage({ params }: PageProps<"/trainer/affiliations/invitations/[id]">) {
  const { id } = await params;
  const user = await requireTrainer(`/trainer/affiliations/invitations/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const inv = await getInvitation(id, user.id);
  if (!inv) notFound();
  const supabase = await createClient();
  const { data: platformPct } = await supabase.rpc("platform_commission_percent");
  const platform = Number(platformPct ?? 10);
  const pending = inv.status === "pending";

  const orgFee = Math.round(EXAMPLE_PRICE * inv.commissionPercent) / 100;
  const platformFee = Math.round(EXAMPLE_PRICE * platform) / 100;
  const net = EXAMPLE_PRICE - orgFee - platformFee;
  const direct = EXAMPLE_PRICE - platformFee;

  return (
    <>
      <TopBar title="دعوة ارتباط" subtitle={inv.org.name} />
      <PageBody className="!gap-6">
        <Breadcrumb items={[{ label: "ملفي المهني", href: "/trainer/profile" }, { label: "الارتباطات", href: "/trainer/affiliations" }, { label: `دعوة ${inv.org.name}` }]} />
        <Hero
          tone="brand"
          icon={Landmark}
          title={`${inv.org.name} يدعوك للارتباط`}
          pills={
            <>
              {pending && <HeroPill icon={Clock} tone="warning">{expiresInLabel(inv.expiresAt, "تنتهي المهلة")}</HeroPill>}
              {(inv.org.rating !== null || inv.org.affiliatedTrainers > 0) && (
                <HeroPill icon={Star} tone="brand">
                  {[
                    inv.org.rating !== null ? `${formatRating(inv.org.rating)} تقييم` : null,
                    inv.org.affiliatedTrainers > 0 ? pluralAr(inv.org.affiliatedTrainers, ["مدرب واحد", "مدربان", "مدربين", "مدربًا"]) : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </HeroPill>
              )}
              {inv.org.verified && <HeroPill icon={BadgeCheck} tone="success">جهة موثَّقة</HeroPill>}
            </>
          }
        >
          الارتباط يعني أن المعهد ينفّذ برامجك باسمه ويتولّى التسويق والقاعات، مقابل عمولة من كل تسجيل. اقرأ الشروط بهدوء — لا شيء يُلزمك.
        </Hero>

        {!pending && STATUS_NOTE[inv.status] && (
          <Alert tone={inv.status === "accepted" ? "success" : "info"} title={STATUS_NOTE[inv.status].title}>
            {STATUS_NOTE[inv.status].body}
          </Alert>
        )}

        <Columns
          asideWidth={400}
          main={
            <>
              <Card big labelledBy="terms-title">
                <h2 id="terms-title" className="type-h2 text-text-primary">
                  الشروط المقترحة
                </h2>
                <dl className="flex w-full flex-col gap-[18px]">
                  <TermRow icon={Hourglass} label="عمولة المعهد" value={commissionLabel(inv.commissionPercent)} tone="warning" />
                  <TermRow icon={Tag} label="نطاق الارتباط" value={`${inv.scopeLabel} — بقية برامجك تبقى لك`} />
                  <TermRow
                    icon={Lock}
                    label="الحصرية"
                    value={inv.exclusive ? "حصري — لا ارتباط بجهات أخرى طوال المدة" : "غير حصري — تبقى مرتبطًا بجهات أخرى وتبيع مباشرة"}
                    tone={inv.exclusive ? "warning" : "success"}
                  />
                  <TermRow icon={CalendarDays} label="المدة" value={durationLabel(inv.termMonths, inv.renewable, inv.noticeDays)} />
                  <TermRow icon={Landmark} label="من ينشر الدورة" value="المعهد · باسمه وتحت مسؤوليته" />
                  <TermRow icon={Contact} label="اسمك كمدرب" value="يظهر في صفحة الدورة وفي الشهادة" tone="success" />
                  {inv.executionScope && <TermRow icon={MapPin} label="نطاق التنفيذ" value={inv.executionScope} />}
                </dl>
                {inv.message && <p className="w-full rounded-16 bg-bg-brand-tint px-[18px] py-4 type-body text-text-primary">«{inv.message}»</p>}
              </Card>

              <Card big labelledBy="earn-title">
                <h2 id="earn-title" className="type-h2 text-text-primary">
                  كم ستربح فعليًا؟
                </h2>
                <p className="type-body text-text-muted">مثال على دورة سعرها {formatNumber(EXAMPLE_PRICE)} ر.س للمتدرب:</p>
                <dl className="flex w-full flex-col gap-[18px]">
                  <MoneyLine label="سعر الدورة للمتدرب" value={money2(EXAMPLE_PRICE)} />
                  <MoneyLine label={`عمولة المعهد ${formatNumber(inv.commissionPercent)}٪`} value={`− ${money2(orgFee)}`} tone="warning" />
                  <MoneyLine label={`عمولة المنصة ${formatNumber(platform)}٪ · قيمة تشغيلية مؤقتة وفق إعدادات المنصة`} value={`− ${money2(platformFee)}`} tone="warning" />
                  <div className="h-px w-full bg-border-divider" aria-hidden />
                  <MoneyLine label="صافي لك من كل متدرب" value={money2(net)} tone="success" big />
                </dl>
                <p className="flex w-full items-start gap-3 rounded-16 bg-state-info-bg px-[18px] py-4 type-body-lg text-state-info">
                  <Glyph icon={Info} size={20} className="mt-1 shrink-0" />
                  <span className="min-w-0 flex-1">
                    بيعك المباشر يعطيك {money2(direct)} من المتدرب نفسه. الفرق {formatNumber(Math.round(orgFee * 100) / 100)} ر.س هو ثمن أن المعهد يتولّى التسويق والقاعة وجذب المتدربين — قارن بعدد المتدربين الذي يجلبه لك.
                  </span>
                </p>
              </Card>

              <ToneCard tone="success" big>
                <h2 className="type-h2 text-state-success">ماذا يحدث بعد القبول؟</h2>
                <ul className="flex w-full flex-col gap-4">
                  <TileRow icon={BookOpen} title="يستطيع المعهد نشر برامجك" body={`${inv.scopeLabel} · باسمه وبموافقتك على كل دورة`} />
                  <TileRow icon={Users} title="يجلب لك متدربين" body="التسويق والقاعات والتسجيل عليه — أنت تدرّب فقط" />
                  <TileRow icon={CalendarDays} title="دوراته تظهر في تقويمك" body="ويُفحص التعارض تلقائيًا قبل أي جدولة" />
                  <TileRow icon={Hourglass} title="إيرادك يصلك من المنصة" body="لا من المعهد — بنفس دورة التسوية المعتادة" />
                  <TileRow icon={Landmark} title="يظهر المعهد في ملفك" body="كإشارة ثقة للجهات الأخرى" />
                </ul>
              </ToneCard>
            </>
          }
          aside={
            <>
              <Card big labelledBy="decision-title">
                <h2 id="decision-title" className="type-h2 text-text-primary">
                  قرارك
                </h2>
                {pending ? (
                  <>
                    <p className="type-body text-text-muted">لا شيء يُرسل قبل ضغطك. يمكنك التفاوض قبل القبول.</p>
                    <AcceptInvitationButton invitationId={inv.id} />
                    <p className="-mt-2 type-caption text-text-muted">تبدأ العلاقة فورًا</p>
                    <ActionButton
                      kind="conversation"
                      fields={{ orgId: inv.org.id, subject: `التفاوض على دعوة الارتباط · ${inv.org.name}` }}
                      className="inline-flex h-14 w-full cursor-pointer items-center justify-center rounded-12 border-[1.5px] border-border-default px-8 type-body-lg text-text-primary hover:bg-bg-brand-tint focus-ring"
                    >
                      تفاوض على الشروط
                    </ActionButton>
                    <p className="-mt-2 type-caption text-text-muted">اقترح عمولة أو نطاقًا مختلفًا</p>
                    <DeclineButton invitationId={inv.id} orgName={inv.org.name} className="inline-flex h-14 w-full cursor-pointer items-center justify-center rounded-12 px-8 type-body-lg text-text-brand hover:bg-bg-brand-tint focus-ring">
                      ارفض الدعوة
                    </DeclineButton>
                    <p className="-mt-2 type-caption text-text-muted">يُبلَّغ المعهد بلا سبب</p>
                  </>
                ) : (
                  <p className="type-body text-text-muted">
                    {STATUS_NOTE[inv.status]?.body} {inv.status === "expired" ? `انتهت في ${formatDate(inv.expiresAt)}.` : ""}
                  </p>
                )}
              </Card>
              <Card big labelledBy="cannot-title">
                <h2 id="cannot-title" className="type-h2 text-text-primary">
                  ما لا يستطيعه المعهد
                </h2>
                <ul className="flex w-full flex-col gap-[18px]">
                  {["نشر برامج خارج النطاق المتفق عليه", "تعديل محتوى برامجك", "منعك من البيع المباشر", "الاطلاع على إيراداتك من مصادر أخرى", "إنهاء دورة جارية دون موافقتك"].map((t) => (
                    <li key={t} className="flex w-full items-center gap-3 rounded-12 bg-state-success-bg px-3.5 py-[13px]">
                      <Glyph icon={Shield} size={20} className="shrink-0 text-state-success" />
                      <span className="min-w-0 flex-1 type-body text-text-secondary">{t}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </>
          }
        />
      </PageBody>
    </>
  );
}
