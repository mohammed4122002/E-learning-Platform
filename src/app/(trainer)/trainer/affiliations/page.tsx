import type { Metadata } from "next";
import Link from "next/link";
import { CircleCheckBig, Clock, Info, Landmark, Network, TrendingUp, User } from "lucide-react";
import { PageBody, TopBar } from "@/components/layout/TopBar";
import { ActionButton, DeclineButton } from "@/components/trainer-affiliations/ActionButtons";
import { ActionRowLink, Card, Columns, InfoTile, ResultPanel, SmallPill } from "@/components/trainer-affiliations/parts";
import { Alert } from "@/components/ui/Feedback";
import { Glyph } from "@/components/ui/Icon";
import { Breadcrumb } from "@/components/ui/Navigation";
import { requireTrainer } from "@/lib/auth";
import { getTrainerAffiliations, type Affiliation, type Invitation } from "@/lib/data/trainer-affiliations";
import { formatDate, formatMonthYear, formatPrice, formatRating, pluralAr } from "@/lib/format";
import {
  affiliationStatsLine,
  affiliationsCount,
  affiliationsLead,
  commissionLabel,
  durationLabel,
  expiresInLabel,
  orgsCount,
} from "@/lib/trainer-affiliations";

export const metadata: Metadata = { title: "ارتباطاتي بالجهات التدريبية", description: "علاقاتك بالجهات التدريبية" };

const primaryBtn =
  "inline-flex h-14 w-full cursor-pointer items-center justify-center rounded-12 bg-action-primary px-8 type-body-lg text-text-on-brand shadow-[0_6px_18px_0_rgba(91,60,196,0.28)] hover:bg-action-primary-hover focus-ring sm:w-auto sm:min-w-[120px]";
const outlineBtn =
  "inline-flex h-14 w-full cursor-pointer items-center justify-center rounded-12 border-[1.5px] border-border-default px-8 type-body-lg text-text-primary hover:bg-bg-brand-tint focus-ring sm:w-auto sm:min-w-[183px]";
const ghostBtn = "inline-flex h-14 w-full cursor-pointer items-center justify-center rounded-12 px-8 type-body-lg text-text-brand hover:bg-bg-brand-tint focus-ring sm:w-[120px]";

/** «جهة موثَّقة · ٤٫٦ تقييم · ٣٤ مدربًا مرتبطًا · فرع صلالة» — only facts that exist. */
function orgLine(i: Invitation): string {
  const parts = [
    i.org.verified ? "جهة موثَّقة" : null,
    i.org.rating !== null ? `${formatRating(i.org.rating)} تقييم` : null,
    i.org.affiliatedTrainers > 0 ? pluralAr(i.org.affiliatedTrainers, ["مدرب واحد مرتبط", "مدربان مرتبطان", "مدربين مرتبطين", "مدربًا مرتبطًا"]) : null,
    i.executionScope,
  ].filter(Boolean);
  return parts.join(" · ");
}

function TermLine({ label, value, tone = "primary" }: { label: string; value: string; tone?: "primary" | "warning" | "success" }) {
  const c = tone === "warning" ? "text-state-warning" : tone === "success" ? "text-state-success" : "text-text-primary";
  return (
    <div className="flex w-full flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-3">
      <dt className="min-w-0 flex-1 type-body text-text-secondary">{label}</dt>
      <dd className={`type-subtitle ${c}`}>{value}</dd>
    </div>
  );
}

/** «دعوة ارتباط تنتظر قرارك» (282:6938). */
function InvitationCard({ inv }: { inv: Invitation }) {
  return (
    <section aria-labelledby={`inv-${inv.id}`} className="flex w-full flex-col items-start gap-4 rounded-16 border-2 border-state-warning bg-state-warning-bg px-5 pt-6 pb-[26px] sm:px-6">
      <div className="flex w-full flex-wrap items-center gap-3">
        <h2 id={`inv-${inv.id}`} className="min-w-0 flex-1 type-h3 text-state-warning">
          دعوة ارتباط تنتظر قرارك
        </h2>
        <SmallPill icon={Clock} tone="warning">
          {expiresInLabel(inv.expiresAt)}
        </SmallPill>
      </div>
      <div className="flex w-full items-center gap-3.5 rounded-12 bg-bg-surface px-4 py-3.5">
        <span className="flex size-[52px] shrink-0 items-center justify-center rounded-12 bg-bg-page text-text-brand">
          <Glyph icon={Landmark} size={20} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="type-title text-text-primary">{inv.org.name}</p>
          {orgLine(inv) && <p className="type-caption text-text-muted">{orgLine(inv)}</p>}
        </div>
      </div>
      <div className="flex w-full flex-col gap-2.5 rounded-12 bg-bg-surface px-4 pt-3.5 pb-4">
        <p className="type-subtitle text-text-primary">شروط الارتباط المقترحة</p>
        <dl className="flex flex-col gap-2.5">
          <TermLine label="عمولة الجهة" value={commissionLabel(inv.commissionPercent)} tone="warning" />
          <TermLine label="نطاق الارتباط" value={inv.scopeLabel} />
          <TermLine label="الحصرية" value={inv.exclusive ? "حصري — لا ارتباط بجهات أخرى طوال المدة" : "غير حصري — تبقى مرتبطًا بجهات أخرى"} tone={inv.exclusive ? "warning" : "success"} />
          <TermLine label="المدة" value={durationLabel(inv.termMonths, inv.renewable, inv.noticeDays)} />
          <TermLine label="من ينشر الدورة" value="الجهة · باسمها وتحت مسؤوليتها" />
          <TermLine label="اسمك كمدرب" value="يظهر في صفحة الدورة والشهادة" tone="success" />
        </dl>
      </div>
      <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Link href={`/trainer/affiliations/invitations/${inv.id}`} className={primaryBtn}>
          اقبل الارتباط
        </Link>
        <DeclineButton invitationId={inv.id} orgName={inv.org.name} className={ghostBtn}>
          ارفض
        </DeclineButton>
        <ActionButton kind="conversation" fields={{ orgId: inv.org.id, subject: `التفاوض على دعوة الارتباط · ${inv.org.name}` }} className={outlineBtn}>
          تفاوض على الشروط
        </ActionButton>
      </div>
      <p className="type-caption text-state-success">القبول لا يُلزمك بعدد دورات ولا يمنعك من البيع المباشر للأفراد.</p>
    </section>
  );
}

/** One row of «ارتباطات نشطة» (282:6996). */
function ActiveRow({ a }: { a: Affiliation }) {
  const since = a.status === "ending" && a.endEffectiveAt ? `يسري الإنهاء في ${formatDate(a.endEffectiveAt)}` : `ارتباط نشط · منذ ${formatMonthYear(a.startedAt)}`;
  return (
    <li className="flex w-full flex-col gap-2.5 rounded-12 bg-bg-page px-4 pt-4 pb-[18px]">
      <div className="flex w-full items-center gap-3.5">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-8 bg-bg-surface text-text-brand">
          <Glyph icon={Landmark} size={20} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
          <p className="type-title text-text-primary">{a.org.name}</p>
          <p className={`type-caption ${a.status === "ending" ? "text-state-warning" : "text-text-muted"}`}>{since}</p>
        </div>
        <Link
          href={`/trainer/affiliations/${a.id}/end`}
          className="inline-flex h-11 w-20 shrink-0 items-center justify-center rounded-12 type-small text-text-brand hover:bg-bg-brand-tint focus-ring sm:w-[120px]"
          aria-label={`إدارة الارتباط مع ${a.org.name}`}
        >
          إدارة
        </Link>
      </div>
      <div className="flex w-full items-center gap-2.5 rounded-8 bg-bg-surface px-3 py-2.5">
        <Glyph icon={TrendingUp} size={16} className="text-state-success" />
        <p className="min-w-0 flex-1 type-caption text-text-secondary">{affiliationStatsLine(a.runningCourses, a.trainees, formatPrice(Math.round(a.revenue)))}</p>
      </div>
    </li>
  );
}

function DifferenceCard() {
  return (
    <Card>
      <h2 className="type-h3 text-text-primary">ما الفرق؟</h2>
      <InfoTile icon={User} title="بيع مباشر" titleTone="brand" body="تنشر باسمك · عمولة المنصة ١٠٪ · قيمة تشغيلية مؤقتة وفق إعدادات المنصة · تدير كل شيء بنفسك." />
      <InfoTile icon={Landmark} iconTone="success" title="عبر جهة مرتبطة" titleTone="success" body="تنشر الجهة باسمها · عمولتها + عمولة المنصة · تتولّى التسويق والقاعات." />
    </Card>
  );
}

function EndCard({ active }: { active: Affiliation[] }) {
  const href = active.length === 1 ? `/trainer/affiliations/${active[0].id}/end` : "#active";
  return (
    <Card>
      <h2 className="type-h3 text-text-primary">إنهاء ارتباط</h2>
      <p className="type-body text-text-secondary">بإشعار ٣٠ يومًا. الدورات الجارية تُستكمل حتى نهايتها — لا تتأثر ولا تُلغى.</p>
      {active.length > 0 && (
        <Link href={href} className="inline-flex h-12 w-full items-center justify-center rounded-12 border-[1.5px] border-border-default px-6 type-button text-text-primary hover:bg-bg-brand-tint focus-ring">
          أنهِ ارتباطًا
        </Link>
      )}
    </Card>
  );
}

/** 464:36572 · فارغة. */
function EmptyView() {
  return (
    <>
      <TopBar title="ارتباطاتي" subtitle="لا ارتباطات" />
      <PageBody className="!gap-[26px] !pb-[60px]">
        <Breadcrumb items={[{ label: "ملفي المهني", href: "/trainer/profile" }, { label: "ارتباطاتي" }]} />
        <Columns
          gap={26}
          asideWidth={400}
          main={
            <>
              <section className="flex w-full flex-col items-center gap-[18px] rounded-22 bg-bg-brand-tint px-5 pt-14 pb-[58px] text-center sm:px-12">
                <span className="flex size-24 items-center justify-center rounded-22 bg-bg-surface text-text-brand">
                  <Glyph icon={Network} size={32} />
                </span>
                <h1 className="text-[30px] leading-[1.15] font-bold text-text-primary sm:text-[38px]">لا ارتباطات مع جهات تدريبية</h1>
                <p className="type-h3 text-text-secondary">أنت تعمل مستقلًا الآن — وهذا خيار سليم. الارتباط بجهة يفتح لك دوراتها وجمهورها مقابل عمولة أو ترتيب متفق عليه.</p>
                <div className="flex w-full flex-col items-center justify-center gap-4 sm:flex-row">
                  <Link href="/trainer/opportunities" className="inline-flex h-14 w-full items-center justify-center rounded-12 bg-action-primary px-8 type-body-lg text-text-on-brand shadow-[0_6px_18px_0_rgba(91,60,196,0.28)] hover:bg-action-primary-hover focus-ring sm:w-[240px]">
                    تصفّح الجهات
                  </Link>
                  <Link href="/trainer/help?q=%D8%A7%D9%84%D8%A7%D8%B1%D8%AA%D8%A8%D8%A7%D8%B7" className="inline-flex h-14 w-full items-center justify-center rounded-12 border-[1.5px] border-border-default px-8 type-body-lg text-text-primary hover:bg-bg-surface focus-ring sm:w-[240px]">
                    كيف يعمل الارتباط؟
                  </Link>
                </div>
              </section>
              <section aria-labelledby="compare-title" className="flex w-full flex-col gap-5 rounded-22 border border-border-default bg-bg-card p-5 shadow-card sm:p-7">
                <h2 id="compare-title" className="type-h2 text-text-primary">
                  مستقل أم مرتبط بجهة؟
                </h2>
                <div className="flex w-full flex-col gap-4 sm:flex-row">
                  <div className="flex min-w-0 flex-1 flex-col gap-3 rounded-16 border-2 border-text-brand bg-action-primary-pressed px-[22px] pt-[22px] pb-6">
                    <p className="type-h3 text-border-divider">مرتبط بجهة</p>
                    <p className="type-caption text-bg-brand-tint">خيار إضافي</p>
                    {["تنفّذ دورات باسم الجهة", "الجهة تجلب المتدربين", "عمولة أو أجر متفق عليه", "الشهادة باسم الجهة واسمك"].map((t) => (
                      <p key={t} className="flex items-start gap-2.5 rounded-12 bg-bg-surface px-3.5 pt-3 pb-[13px] type-body text-text-primary">
                        <Glyph icon={CircleCheckBig} size={16} className="mt-1.5 shrink-0 text-text-brand" />
                        <span className="min-w-0 flex-1">{t}</span>
                      </p>
                    ))}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-3 rounded-16 border-2 border-state-success bg-state-success-bg px-[22px] pt-[22px] pb-6">
                    <p className="type-h3 text-state-success">مستقل</p>
                    <p className="type-caption text-text-muted">وضعك الحالي</p>
                    {["تنشر دوراتك باسمك", "تحتفظ بكل الإيراد بعد عمولة المنصة", "أنت من يجلب المتدربين", "ملكية كاملة لبرامجك"].map((t) => (
                      <p key={t} className="flex items-start gap-2.5 rounded-12 bg-bg-surface px-3.5 pt-3 pb-[13px] type-body text-text-primary">
                        <Glyph icon={CircleCheckBig} size={16} className="mt-1.5 shrink-0 text-state-success" />
                        <span className="min-w-0 flex-1">{t}</span>
                      </p>
                    ))}
                  </div>
                </div>
                <p className="flex w-full items-start gap-3 rounded-16 bg-state-info-bg px-[18px] pt-[15px] pb-4 type-body-lg text-state-info">
                  <Glyph icon={Info} size={24} className="mt-0.5 shrink-0" />
                  <span className="min-w-0 flex-1">يمكنك الجمع بينهما — دورات باسمك ودورات عبر جهة في الوقت نفسه.</span>
                </p>
              </section>
            </>
          }
          aside={
            <section aria-labelledby="incoming-title" className="flex w-full flex-col items-start gap-5 rounded-22 border border-border-default bg-bg-card p-5 shadow-card sm:p-7">
              <h2 id="incoming-title" className="type-h3 text-text-primary">
                دعوات واردة
              </h2>
              <p className="type-body text-text-secondary">لا دعوات حاليًا. الجهات تدعو المدربين بناءً على تخصصهم وتقييمهم.</p>
              <Link href="/trainer/profile/edit#vis-title" className="inline-flex h-12 w-full items-center justify-center rounded-12 border-[1.5px] border-border-default px-6 type-button text-text-primary hover:bg-bg-brand-tint focus-ring">
                اجعل ملفي أظهر للجهات
              </Link>
            </section>
          }
        />
      </PageBody>
    </>
  );
}

/** TRR-AFL-01 · ارتباطاتي بالجهات — default 282:6818 · empty 464:36572 · created 4266:2 · ended 4266:363. */
export default async function AffiliationsPage({ searchParams }: PageProps<"/trainer/affiliations">) {
  const user = await requireTrainer("/trainer/affiliations");
  const sp = await searchParams;
  const { invitations, live, active, all } = await getTrainerAffiliations(user.id);
  const done = typeof sp.done === "string" ? sp.done : null;
  const doneId = typeof sp.id === "string" ? sp.id : null;
  const subject = doneId ? all.find((a) => a.id === doneId) : undefined;

  if (live.length === 0 && invitations.length === 0 && !(done && subject)) return <EmptyView />;

  return (
    <>
      <TopBar title="الارتباطات" subtitle="علاقاتك بالجهات التدريبية" />
      <PageBody className="!gap-6">
        <header className="flex w-full flex-col gap-1.5">
          <h1 className="text-[28px] leading-[1.2] font-bold text-text-primary sm:text-[36px]">ارتباطاتي بالجهات التدريبية</h1>
          <p className="type-body-lg text-text-secondary">{affiliationsLead(active.length, invitations.length)}</p>
        </header>

        {done === "accepted" && subject && (
          <>
            <ResultPanel
              tone="success"
              title="تم إنشاء الارتباط"
              intro={`قبلت دعوة ${subject.org.name}. أصبح الارتباط نشطًا.`}
              rows={[
                { label: "الجهة", value: subject.org.name },
                { label: "حالة الارتباط", value: subject.status === "active" ? "نشط" : "منتهٍ", tone: subject.status === "active" ? "success" : "muted" },
                { label: "الارتباطات النشطة", value: affiliationsCount(active.length), tone: "success" },
                { label: "العمولة المتفق عليها", value: "وفق شروط الدعوة" },
                { label: "الخطوة التالية", value: "ينفّذ المعهد برامجك باسمه" },
              ]}
            />
            <div className="flex w-full justify-start">
              <ActionRowLink href="/trainer/affiliations">العودة إلى ارتباطاتي</ActionRowLink>
            </div>
          </>
        )}
        {done === "ended" && subject && (
          <>
            <ResultPanel
              tone="neutral"
              title="أُنهي الارتباط"
              intro={`أُنهي ارتباطك مع ${subject.org.name}. لم يعد المعهد ينفّذ برامجك باسمه.`}
              rows={[
                { label: "الجهة", value: subject.org.name },
                {
                  label: "حالة الارتباط",
                  value: subject.status === "ending" && subject.endEffectiveAt ? `منتهٍ · يسري في ${formatDate(subject.endEffectiveAt)}` : "منتهٍ",
                  tone: "muted",
                },
                { label: "الارتباطات النشطة", value: affiliationsCount(active.length), tone: "warning" },
                { label: "الدورات الجارية", value: "تكمل وفق ما هو متفق عليه" },
              ]}
            />
            <div className="flex w-full justify-start">
              <ActionRowLink href="/trainer/affiliations">العودة إلى ارتباطاتي</ActionRowLink>
            </div>
          </>
        )}
        {done === "declined" && (
          <Alert tone="info" title="رفضت الدعوة">
            أُبلغت الجهة برفضك بلا سبب.
          </Alert>
        )}
        {done === "kept" && (
          <Alert tone="success" title="الارتباط مستمر">
            سحبت إشعار الإنهاء وأُبلغت الجهة.
          </Alert>
        )}

        <Columns
          main={
            <>
              {invitations.map((inv) => (
                <InvitationCard key={inv.id} inv={inv} />
              ))}
              {live.length > 0 && (
                <Card labelledBy="active-title">
                  <div id="active" className="flex w-full items-center gap-3">
                    <h2 id="active-title" className="min-w-0 flex-1 type-h3 text-text-primary">
                      ارتباطات نشطة
                    </h2>
                    <SmallPill icon={CircleCheckBig} tone="success" bg="success">
                      {orgsCount(live.length)}
                    </SmallPill>
                  </div>
                  <ul className="flex w-full flex-col gap-4">
                    {live.map((a) => (
                      <ActiveRow key={a.id} a={a} />
                    ))}
                  </ul>
                </Card>
              )}
            </>
          }
          aside={
            <>
              <DifferenceCard />
              <EndCard active={active} />
            </>
          }
        />
      </PageBody>
    </>
  );
}
