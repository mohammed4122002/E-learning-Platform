import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CircleCheck, Clock, FileText, Hourglass, Lock, MessagesSquare, Route, User } from "lucide-react";
import { PageBody, TopBar } from "@/components/layout/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { Glyph } from "@/components/ui/Icon";
import { Chip, DataCard, Notice, PathStep, SectionCard, StatusItemCard, SummaryRow } from "@/components/trainings/ui";
import { DisputeFairness, FreezeBanner } from "@/components/trainings/DisputeParts";
import { DisputeEvidencePanel } from "@/components/trainings/DisputeEvidencePanel";
import { ConfirmAction } from "@/components/trainings/ConfirmAction";
import { DismissButton } from "@/components/trainings/DismissButton";
import { requireTrainee } from "@/lib/auth";
import { getDispute } from "@/lib/data/money";
import { formatDate, formatDayMonth, formatPrice, formatRelative, formatTime, toArabicDigits } from "@/lib/format";
import { DISPUTE_REASON_LABEL, DISPUTE_STATUS, fileSize } from "@/lib/trainings";
import { withdrawDispute } from "../actions";

export const metadata: Metadata = { title: "النزاع المالي", description: "حالة النزاع ومرفقاته" };

const DAY = 864e5;
const at = (iso: string) => `${formatDayMonth(iso)} · ${formatTime(iso)}`;

/** TRN-DSP-01 · النزاع المالي — مفتوح / قيد المراجعة (183:9533) with TRN-DSP-02 attachment states (4153:*). */
export default async function DisputePage(props: PageProps<"/trainee/disputes/[id]">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const user = await requireTrainee(`/trainee/disputes/${id}`);
  const d = await getDispute(user.id, id);
  if (!d) notFound();

  const s = d.subject;
  const amount = s.refund?.amount ?? s.amount;
  const money = formatPrice(amount, s.currency);
  const active = d.status === "open" || d.status === "under_review";
  const deadline = new Date(new Date(d.createdAt).getTime() + 7 * DAY);
  const status = DISPUTE_STATUS[d.status];
  const withdrawn = d.resolution === "withdrawn_by_trainee";
  const sent = sp.sent === "1";

  return (
    <>
      <TopBar title="النزاع المالي" subtitle={active ? "قيد المراجعة المستقلة" : withdrawn ? "سحبت النزاع" : status.label} />
      <PageBody className="gap-6">
        {sent && (
          <>
            <Notice tone="success" title="أُرسل نزاعك">
              <p>وصل نزاعك{d.attachments.length ? " مع مرفقاته" : ""} إلى فريق المراجعة، وجُمّد المبلغ آليًا.</p>
            </Notice>
            <DataCard
              title="تفاصيل النزاع والمرفقات"
              rows={[
                { label: "رقم النزاع", value: d.ref },
                { label: "وقت الإرسال", value: `${formatDayMonth(d.createdAt)} · ${formatTime(d.createdAt)}` },
                { label: "المرفقات", value: d.attachments.length === 0 ? "لا توجد مرفقات" : d.attachments.length === 1 ? "مرفق واحد" : `${toArabicDigits(d.attachments.length)} مرفقات` },
                { label: "الحالة", value: "قيد المراجعة", tone: "warning" },
              ]}
            />
            <div className="flex justify-end">
              <ButtonLink href="#dispute-path">تابع حالة النزاع</ButtonLink>
            </div>
          </>
        )}
        {!sent && active && d.attachments.length === 0 && (
          <DisputeEvidencePanel disputeId={d.id} disputeRef={d.ref} courseTitle={s.courseTitle} existing={0} backHref="/trainee/queue" />
        )}

        {active ? (
          <StatusItemCard
            tone="warning"
            icon={Hourglass}
            title="نزاعك قيد المراجعة المستقلة"
            badge={<Chip tone="warning" icon={Hourglass}>{`${s.refund ? `استرداد «${s.courseTitle}»` : s.courseTitle} · ${money} مجمّدة`}</Chip>}
            description={d.status === "open" ? "الخطوة ٢ من ٤ · إسناد لمراجع مستقل" : "الخطوة ٣ من ٤ · رد الجهة التدريبية"}
            facts={[
              { icon: Route, label: "المسؤول:", value: d.status === "open" ? "إدارة النزاعات" : "إدارة النزاعات + الجهة" },
              { icon: Clock, label: "التحديث المتوقع:", value: "خلال ٧ أيام عمل كحد أقصى" },
              { icon: User, label: "فُتح:", value: formatRelative(d.createdAt) },
            ]}
            refCode={d.ref}
            footerChip={<Chip tone="warning" icon={Clock}>{`قُدّم ${formatRelative(d.createdAt)}`}</Chip>}
            actions={
              <>
                <ButtonLink href="/trainee/queue" variant="outline" className="min-w-[120px]">
                  تتبّع الطلب
                </ButtonLink>
                <DismissButton itemKey={`dispute:${d.id}`} mode="snooze" />
              </>
            }
          />
        ) : (
          <StatusItemCard
            tone={d.status === "resolved" ? "success" : "neutral"}
            icon={CircleCheck}
            title={withdrawn ? "سحبت النزاع" : d.status === "resolved" ? "حُسم النزاع" : "أُغلق النزاع"}
            badge={<Chip tone={d.status === "resolved" ? "success" : "neutral"}>{status.label}</Chip>}
            description={withdrawn ? "أُغلق النزاع بطلبك قبل صدور القرار." : (d.resolution ?? "صدر القرار النهائي في نزاعك.")}
            facts={[{ icon: Clock, label: "آخر تحديث:", value: formatRelative(d.updatedAt) }]}
            refCode={d.ref}
            actions={<ButtonLink href="/trainee/queue" variant="outline">بانتظار إجرائي</ButtonLink>}
          />
        )}

        {active && <FreezeBanner amount={amount} currency={s.currency} frozen />}

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="flex min-w-0 flex-col gap-6">
            <SectionCard title="مسار النزاع" id="dispute-path">
              <ol className="flex flex-col gap-4">
                <PathStep icon={Lock} state="done" title="جُمّد المبلغ آليًا" caption={`${at(d.createdAt)} — لحظة فتح النزاع`} />
                <PathStep
                  icon={CircleCheck}
                  state={d.status === "open" ? "current" : "done"}
                  title={d.status === "open" ? "يُسند لمراجع مستقل" : "أُسند لمراجع مستقل"}
                  caption={d.status === "open" ? "خلال ٢٤ ساعة عمل — مراجع لم يشارك في القرار الأول" : "مراجع لم يشارك في القرار الأول"}
                />
                <PathStep
                  icon={MessagesSquare}
                  state={d.status === "under_review" ? "current" : active ? "todo" : "done"}
                  title="بانتظار رد الجهة التدريبية"
                  caption="٣ أيام عمل للرد"
                />
                <PathStep
                  icon={active ? Hourglass : CircleCheck}
                  state={active ? "todo" : d.status === "resolved" ? "current-success" : "done"}
                  title="القرار النهائي"
                  caption={active ? "يصدر بموافقة مسؤول النزاعات والمعتمد المالي معًا" : (d.resolution && !withdrawn ? d.resolution : at(d.updatedAt))}
                />
              </ol>
            </SectionCard>
            <SectionCard title="ما قدّمته" id="submitted-title">
              <p className="type-body text-text-secondary">
                <span className="text-text-muted">{DISPUTE_REASON_LABEL[d.reason] ?? "سبب آخر"} — </span>«{d.details}»
              </p>
              {d.attachments.length > 0 && (
                <ul className="flex flex-col gap-3">
                  {d.attachments.map((f) => (
                    <li key={f.id} className="flex items-center gap-3 rounded-12 bg-bg-page px-3.5 py-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-8 bg-state-error-bg text-state-error">
                        <Glyph icon={FileText} size={20} />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="truncate type-subtitle text-text-primary">{f.name}</span>
                        <span className="type-caption text-text-muted">
                          {fileSize(f.size)} · رُفع {formatDayMonth(f.createdAt)}
                        </span>
                      </span>
                      {f.url && (
                        <a href={f.url} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 w-[120px] shrink-0 items-center justify-center rounded-12 border-[1.5px] border-border-default type-small text-text-primary hover:bg-bg-brand-tint focus-ring">
                          عرض
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
            {active && d.attachments.length > 0 && d.attachments.length < 5 && (
              <section aria-label="إضافة مرفقات" className="flex flex-col gap-4">
                <DisputeEvidencePanel disputeId={d.id} disputeRef={d.ref} courseTitle={s.courseTitle} existing={d.attachments.length} backHref="/trainee/queue" />
              </section>
            )}
            <DisputeFairness />
          </div>
          <aside aria-label="تفاصيل النزاع" className="flex flex-col gap-5">
            <SectionCard title="تفاصيل النزاع" id="details-title">
              <dl className="flex flex-col gap-4">
                <SummaryRow label="رقم النزاع" value={<span dir="ltr" className="font-mono text-[14px]">{d.ref}</span>} />
                <SummaryRow label="الحالة" value={withdrawn ? "مسحوب" : status.label} valueClass={active ? "text-state-warning" : "text-text-muted"} />
                <div className="flex items-center gap-3">
                  <dt className="min-w-0 flex-1 type-title text-text-secondary">{active ? "المبلغ المجمّد" : "المبلغ"}</dt>
                  <dd className="whitespace-nowrap type-h3 text-state-info">{money}</dd>
                </div>
                <SummaryRow label="فُتح في" value={formatDate(d.createdAt)} />
                {active && <SummaryRow label="أقصى مدة للقرار" value={formatDate(deadline)} valueClass="text-state-warning" />}
              </dl>
            </SectionCard>
            {active && (
              <ConfirmAction
                label="اسحب النزاع"
                variant="outline"
                size="l"
                fullWidth
                title="سحب النزاع؟"
                body="يُغلق النزاع نهائيًا ويبقى قرار الاسترداد السابق نافذًا. لا يمكن إعادة فتح النزاع نفسه."
                confirmLabel="نعم، اسحب النزاع"
                destructive
                action={withdrawDispute.bind(null, d.id)}
              />
            )}
            <ButtonLink href="/trainee/help" variant="text" fullWidth>
              تواصل مع الدعم
            </ButtonLink>
          </aside>
        </div>
      </PageBody>
    </>
  );
}
