import type { Metadata } from "next";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { BadgeCheck, CircleAlert, CircleCheckBig, CircleX, EyeOff, Hourglass, Info, MessagesSquare, Shield } from "lucide-react";
import { PageBody, TopBar } from "@/components/layout/TopBar";
import { Card, Columns, Hero, SmallPill, toneText } from "@/components/trainer-affiliations/parts";
import { ResponseForm } from "@/components/trainer-reports/ResponseForm";
import { Alert, EmptyState } from "@/components/ui/Feedback";
import { Glyph } from "@/components/ui/Icon";
import { requireTrainer } from "@/lib/auth";
import { getContentReports, type ContentReport } from "@/lib/data/trainer-reports";
import { formatRelative } from "@/lib/format";
import { REASON_SHORT, canAppeal, fixHref, historyLabel, hoursLeftLabel, needingLabel, needsReply, reportCode, reportPill, targetLabel } from "@/lib/trainer-reports";

export const metadata: Metadata = { title: "البلاغات على محتواي", description: "بلاغات على برامجك ودوراتك" };

const PILL_ICON: Record<string, LucideIcon> = { success: CircleCheckBig, warning: Hourglass, error: CircleX, info: Info, brand: BadgeCheck };
const PILL_BG: Record<string, "success" | "surface" | "brand"> = { success: "success", warning: "surface", error: "surface", info: "surface", brand: "brand" };

function Step({ icon, title, body, state }: { icon: LucideIcon; title: string; body: string; state: "done" | "current" | "todo" }) {
  const box = state === "current" ? "border-[1.5px] border-state-error bg-state-error-bg" : "bg-bg-page";
  const iconTone = state === "done" ? "text-state-success" : state === "current" ? "text-state-error" : "text-text-muted";
  return (
    <li className={`flex w-full items-start gap-2.5 rounded-12 px-3 py-[11px] ${box}`}>
      <span className={`flex size-9 shrink-0 items-center justify-center rounded-full bg-bg-surface ${iconTone}`}>
        <Glyph icon={icon} size={20} />
      </span>
      <span className={`flex min-w-0 flex-1 flex-col gap-0.5 ${state === "todo" ? "text-text-muted" : ""}`}>
        <span className={`type-small ${state === "todo" ? "" : "text-text-primary"}`}>{title}</span>
        <span className={`type-caption ${state === "todo" ? "" : "text-text-muted"}`}>{body}</span>
      </span>
    </li>
  );
}

/** «بلاغ يحتاج ردك خلال ٤٨ ساعة» (282:6602). */
function NeedsReplyCard({ r, userId }: { r: ContentReport; userId: string }) {
  return (
    <section aria-labelledby={`r-${r.id}`} className="flex w-full flex-col items-start gap-4 rounded-16 border-2 border-state-error bg-state-error-bg px-5 pt-6 pb-[26px] sm:px-6">
      <div className="flex w-full flex-wrap items-center gap-3">
        <h2 id={`r-${r.id}`} className="min-w-0 flex-1 type-h3 text-state-error">
          بلاغ يحتاج ردك خلال ٤٨ ساعة
        </h2>
        <p className="flex items-center gap-3 type-caption text-text-muted">
          <span>رقم البلاغ</span>
          <span className="font-mono" dir="ltr">
            {reportCode(r)}
          </span>
        </p>
      </div>
      <p className="type-caption text-text-muted">
        {targetLabel(r)} · التصنيف: {REASON_SHORT[r.reason] ?? REASON_SHORT.other} · وصل {formatRelative(r.createdAt)}
      </p>
      <div className="flex w-full flex-col gap-2 rounded-12 bg-bg-surface px-4 pt-3.5 pb-4">
        <p className="type-subtitle text-text-primary">نص الادعاء</p>
        <p className="type-body text-text-secondary">«{r.details ?? "—"}»</p>
        <p className="type-caption text-state-info">هوية المُبلِّغ لا تُكشف لك — كما لا تُكشف هويتك لو أبلغت عن غيرك.</p>
      </div>
      <ResponseForm reportId={r.id} userId={userId} fixHref={fixHref(r)} />
    </section>
  );
}

function PastRow({ r }: { r: ContentReport }) {
  const pill = reportPill(r);
  const appeal = canAppeal(r);
  return (
    <li className="flex w-full flex-col gap-3 rounded-12 bg-bg-page px-3.5 py-[13px] sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 flex-col gap-[3px] leading-[1.5]">
        <p className="type-subtitle text-text-primary">
          {r.targetType === "trainer" ? "ملفك المهني" : r.targetTitle} · {REASON_SHORT[r.reason] ?? REASON_SHORT.other}
        </p>
        <p className="type-caption text-text-muted">رقم البلاغ</p>
        <p className="font-mono text-[14px] text-text-muted" dir="ltr">
          <span className="block text-end">{reportCode(r)}</span>
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <SmallPill icon={PILL_ICON[pill.tone]} tone={pill.tone} bg={PILL_BG[pill.tone]}>
          {pill.label}
        </SmallPill>
        {appeal && (
          <Link href={`/trainer/reports/${r.id}/appeal`} className="inline-flex h-9 items-center rounded-12 px-3 type-small text-text-brand hover:bg-bg-brand-tint focus-ring">
            تظلّم على القرار
          </Link>
        )}
      </div>
    </li>
  );
}

/** TRR-RPT-01 · البلاغات على محتواي (282:6532). */
export default async function ReportsPage({ searchParams }: PageProps<"/trainer/reports">) {
  const user = await requireTrainer("/trainer/reports");
  const sp = await searchParams;
  const reports = await getContentReports();
  const open = reports.filter(needsReply);
  const past = reports.filter((r) => !needsReply(r));
  const dismissed = reports.filter((r) => r.decision?.outcome === "dismissed").length;
  const focus = open[0] ?? null;

  const rights: { icon: LucideIcon; text: string; tone: keyof typeof toneText }[] = [
    { icon: MessagesSquare, text: "لك حق الرد قبل أي قرار", tone: "success" },
    { icon: EyeOff, text: "هوية المبلِّغ لا تُكشف — وهويتك محمية أيضًا", tone: "brand" },
    { icon: CircleCheckBig, text: "دوراتك تعمل طبيعيًا أثناء المراجعة", tone: "success" },
    { icon: Hourglass, text: "لك حق التظلّم على القرار خلال ٧ أيام", tone: "brand" },
    { icon: CircleAlert, text: "ثلاثة بلاغات مثبَتة توقف النشر مؤقتًا", tone: "error" },
  ];

  return (
    <>
      <TopBar title="البلاغات" subtitle="بلاغات على برامجك ودوراتك" />
      <PageBody className="!gap-6">
        <Hero
          tone="warning"
          icon={Shield}
          tile={64}
          compact
          title="البلاغات على محتواك"
          pills={
            <>
              <SmallPill icon={CircleCheckBig} tone="success">
                {reports.length === 0 ? "لا بلاغات على محتواك" : historyLabel(reports.length, dismissed)}
              </SmallPill>
              {open.length > 0 && (
                <SmallPill icon={CircleAlert} tone="error">
                  {needingLabel(open.length)}
                </SmallPill>
              )}
            </>
          }
        >
          البلاغ ليس حكمًا. لك حق الرد والتوضيح قبل أي قرار، ولا يُتخذ إجراء ضدك قبل سماعك.
        </Hero>

        {sp.responded === "1" && (
          <Alert tone="success" title="وصل ردّك">
            يراجع فريق الامتثال ردّك خلال ٤٨ ساعة، ويصلك القرار مع سببه.
          </Alert>
        )}
        {sp.appealed === "1" && (
          <Alert tone="success" title="وصل تظلّمك">
            يراجعه مسؤول لم يشارك في القرار الأول خلال ٥ أيام عمل، وقراره نهائي.
          </Alert>
        )}

        <Columns
          main={
            <>
              {open.map((r) => (
                <NeedsReplyCard key={r.id} r={r} userId={user.id} />
              ))}
              {reports.length === 0 && (
                <EmptyState icon={CircleCheckBig} title="لا بلاغات على محتواك" description="حين يُبلِّغ أحد عن برنامج أو دورة لك، يظهر البلاغ هنا مع مهلة ردّك." />
              )}
              {past.length > 0 && (
                <Card labelledBy="past-title">
                  <h2 id="past-title" className="type-h3 text-text-primary">
                    بلاغات سابقة
                  </h2>
                  <ul className="flex w-full flex-col gap-4">
                    {past.map((r) => (
                      <PastRow key={r.id} r={r} />
                    ))}
                  </ul>
                </Card>
              )}
            </>
          }
          aside={
            <>
              <Card labelledBy="flow-title">
                <h2 id="flow-title" className="type-h3 text-text-primary">
                  مسار البلاغ
                </h2>
                <ol className="flex w-full flex-col gap-4">
                  <Step icon={CircleCheckBig} state="done" title="وصل البلاغ" body={focus ? formatRelative(focus.createdAt) : "يصلك إشعار فور وصوله"} />
                  <Step icon={MessagesSquare} state={focus ? "current" : "todo"} title="ردّك وتوضيحك" body={focus ? hoursLeftLabel(focus.responseDueAt) : "لديك ٤٨ ساعة"} />
                  <Step icon={Hourglass} state="todo" title="مراجعة فريق الامتثال" body="٤٨ ساعة بعد ردّك" />
                  <Step icon={BadgeCheck} state="todo" title="القرار النهائي" body="يصلك مع سببه" />
                </ol>
              </Card>
              <Card labelledBy="rights-title">
                <h2 id="rights-title" className="type-h3 text-text-primary">
                  حقوقك
                </h2>
                <ul className="flex w-full flex-col gap-4">
                  {rights.map((x) => (
                    <li key={x.text} className="flex w-full items-start gap-2.5 rounded-8 bg-bg-page px-3 py-2.5">
                      <Glyph icon={x.icon} size={16} className={`mt-1 shrink-0 ${toneText[x.tone]}`} />
                      <span className="min-w-0 flex-1 type-caption text-text-primary">{x.text}</span>
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
