import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { BadgeCheck, CalendarDays, CircleAlert, CircleCheckBig, CircleX, Clock, FileText, Hourglass, Info } from "lucide-react";
import { PageBody, TopBar } from "@/components/layout/TopBar";
import { ActionRowLink, Card, Columns, Hero, HeroPill, toneText } from "@/components/trainer-affiliations/parts";
import { AppealFlow } from "@/components/trainer-reports/AppealFlow";
import { Alert } from "@/components/ui/Feedback";
import { Glyph } from "@/components/ui/Icon";
import { Breadcrumb } from "@/components/ui/Navigation";
import { requireTrainer } from "@/lib/auth";
import { getContentReports } from "@/lib/data/trainer-reports";
import { formatDate, formatDayMonth, formatTime } from "@/lib/format";
import { canAppeal, daysLeftLabel, fixHref, reportCode, reportPill, targetLabel } from "@/lib/trainer-reports";

export const metadata: Metadata = { title: "التظلّم على قرار البلاغ" };

function Step({ icon, title, body, state }: { icon: LucideIcon; title: string; body: string; state: "done" | "current" | "todo" }) {
  const box = state === "current" ? "border-[1.5px] border-state-warning bg-state-warning-bg" : "bg-bg-page";
  const iconTone = state === "done" ? "text-state-success" : state === "current" ? "text-state-warning" : "text-text-muted";
  return (
    <li className={`flex w-full items-start gap-3 rounded-12 px-3.5 py-[13px] ${box}`}>
      <span className={`flex size-10 shrink-0 items-center justify-center rounded-full bg-bg-surface ${iconTone}`}>
        <Glyph icon={icon} size={20} />
      </span>
      <span className={`flex min-w-0 flex-1 flex-col gap-0.5 leading-[1.5] ${state === "todo" ? "text-text-muted" : ""}`}>
        <span className={`type-subtitle ${state === "todo" ? "" : "text-text-primary"}`}>{title}</span>
        <span className={`type-caption ${state === "todo" ? "" : "text-text-muted"}`}>{body}</span>
      </span>
    </li>
  );
}

/** TRR-RPT-02 · التظلّم على قرار (310:10595). */
export default async function AppealPage({ params }: PageProps<"/trainer/reports/[id]/appeal">) {
  const { id } = await params;
  const user = await requireTrainer(`/trainer/reports/${id}/appeal`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const r = (await getContentReports()).find((x) => x.id === id);
  if (!r || !r.decision) notFound();
  const d = r.decision;
  const open = canAppeal(r);
  const pill = reportPill(r);

  const decisionCard = (
    <Card big labelledBy="decision-title">
      <h2 id="decision-title" className="type-h2 text-text-primary">
        القرار الذي تتظلّم عليه
      </h2>
      <div className={`flex w-full flex-col gap-3 rounded-16 px-5 pt-[18px] pb-5 ${d.outcome === "dismissed" ? "bg-state-success-bg" : "bg-state-error-bg"}`}>
        <div className="flex w-full flex-wrap items-center gap-2.5">
          <span className={`inline-flex items-center gap-[7px] rounded-full bg-bg-surface px-3.5 py-[9px] type-subtitle ${d.outcome === "dismissed" ? "text-state-success" : "text-state-error"}`}>
            <Glyph icon={d.outcome === "dismissed" ? CircleCheckBig : CircleX} size={20} />
            {d.outcome === "dismissed" ? "أُغلق لصالحك" : d.outcome === "partially_upheld" ? "بلاغ مثبَت جزئيًا" : "بلاغ مثبَت"}
          </span>
          <span className="type-caption text-text-muted">رقم البلاغ</span>
          <span className="font-mono text-[14px] leading-[1.5] text-text-muted" dir="ltr">
            {reportCode(r)}
          </span>
        </div>
        <p className="type-title text-text-primary">{targetLabel(r)}</p>
        <p className="type-body-lg text-text-secondary">{d.summary}</p>
        <p className="type-caption text-text-muted">
          صدر في {formatDate(d.decidedAt)} · {formatTime(d.decidedAt)}
        </p>
      </div>
    </Card>
  );

  const flowCard = (
    <Card big labelledBy="aflow-title">
      <h2 id="aflow-title" className="type-h2 text-text-primary">
        مسار التظلّم
      </h2>
      <ol className="flex w-full flex-col gap-[18px]">
        <Step icon={CircleCheckBig} state="done" title="القرار الأول" body={formatDayMonth(d.decidedAt)} />
        <Step icon={FileText} state={open ? "current" : r.appeal ? "done" : "todo"} title="تقديم تظلّمك" body={open ? daysLeftLabel(d.appealDeadline) : r.appeal ? `قُدّم في ${formatDayMonth(r.appeal.submittedAt)}` : "انتهت المهلة"} />
        <Step icon={Hourglass} state={r.appeal?.status === "pending" ? "current" : r.appeal?.decidedAt ? "done" : "todo"} title="مراجعة مسؤول جديد" body="٥ أيام عمل · لم يشارك في القرار الأول" />
        <Step icon={BadgeCheck} state={r.appeal?.decidedAt ? "done" : "todo"} title="القرار النهائي" body="لا يقبل تظلّمًا ثانيًا" />
      </ol>
    </Card>
  );

  const duringCard = (
    <Card big labelledBy="during-title">
      <h2 id="during-title" className="type-h2 text-text-primary">
        أثناء التظلّم
      </h2>
      <ul className="flex w-full flex-col gap-[18px]">
        {(
          [
            { icon: CircleCheckBig, text: "دوراتك تعمل طبيعيًا", tone: "success" },
            { icon: Hourglass, text: "تُجمَّد المخالفة مؤقتًا", tone: "brand" },
            { icon: CalendarDays, text: "تتوقف مهلة تعديل الوصف", tone: "brand" },
            { icon: CircleAlert, text: "التظلّم المرفوض يبقي المخالفة", tone: "warning" },
          ] as { icon: LucideIcon; text: string; tone: keyof typeof toneText }[]
        ).map((x) => (
          <li key={x.text} className="flex w-full items-center gap-3 rounded-12 bg-bg-page px-3.5 py-[13px]">
            <Glyph icon={x.icon} size={20} className={`shrink-0 ${toneText[x.tone]}`} />
            <span className="min-w-0 flex-1 type-body text-text-primary">{x.text}</span>
          </li>
        ))}
      </ul>
    </Card>
  );

  return (
    <>
      <TopBar title="التظلّم" subtitle="مراجعة ثانية بقرار نهائي" />
      <PageBody className="!gap-6">
        <Breadcrumb items={[{ label: "مركز المساعدة", href: "/trainer/help" }, { label: "البلاغات", href: "/trainer/reports" }, { label: "تظلّم" }]} />
        <Hero
          tone="info"
          icon={Hourglass}
          tile={68}
          title="التظلّم على قرار البلاغ"
          pills={
            <>
              <HeroPill icon={Info} tone="info">
                مراجعة واحدة فقط
              </HeroPill>
              {open && (
                <HeroPill icon={Clock} tone="warning">
                  {daysLeftLabel(d.appealDeadline)} للتظلّم
                </HeroPill>
              )}
            </>
          }
        >
          يراجع طلبك مسؤول لم يشارك في القرار الأول. قراره نهائي ولا يقبل تظلّمًا ثانيًا — قدّم كل ما لديك الآن.
        </Hero>

        {open ? (
          <AppealFlow
            reportId={r.id}
            userId={user.id}
            fixHref={fixHref(r)}
            mainTop={decisionCard}
            asideTop={
              <>
                {flowCard}
                {duringCard}
              </>
            }
          />
        ) : (
          <>
            <Alert tone={r.appeal?.status === "upheld" || d.outcome === "dismissed" ? "success" : "info"} title={pill.label}>
              {r.appeal
                ? r.appeal.status === "pending"
                  ? "وصل تظلّمك ويراجعه مسؤول جديد. يصلك القرار النهائي مع سببه."
                  : (r.appeal.note ?? "صدر القرار النهائي في تظلّمك.")
                : d.outcome === "dismissed"
                  ? "أُغلق البلاغ لصالحك — لا يوجد ما تتظلّم عليه."
                  : d.acceptedAt
                    ? "قبلت هذا القرار، فلا يمكن التظلّم عليه."
                    : "انتهت مهلة التظلّم (٧ أيام من صدور القرار)."}
            </Alert>
            <Columns
              asideWidth={400}
              main={decisionCard}
              aside={
                <>
                  {flowCard}
                  <div className="flex">
                    <ActionRowLink href="/trainer/reports">العودة إلى البلاغات</ActionRowLink>
                  </div>
                </>
              }
            />
          </>
        )}
      </PageBody>
    </>
  );
}
