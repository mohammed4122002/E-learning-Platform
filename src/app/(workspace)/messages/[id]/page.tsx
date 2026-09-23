import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BookOpen, Download, FileSpreadsheet, FileText } from "lucide-react";
import { TopBar, PageBody } from "@/components/layout/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { Glyph } from "@/components/ui/Icon";
import { Breadcrumb } from "@/components/ui/Navigation";
import { Thread } from "@/components/messages/Thread";
import { ConversationActions } from "@/components/messages/ConversationActions";
import { requireUser } from "@/lib/auth";
import { getConversation } from "@/lib/data/messages";
import { formatDayMonth, formatRelative, pluralAr } from "@/lib/format";
import type { EnrollmentStatus } from "@/types/views";

function enrollmentLabel(status: EnrollmentStatus | null | undefined) {
  if (!status) return "لست مسجّلًا في هذه الدورة";
  if (status === "completed") return "أكملت الدورة";
  if (status === "confirmed" || status === "in_progress") return "أنت مسجَّل";
  if (status === "pending_payment" || status === "pending_provider") return "تسجيلك قيد الإتمام";
  return "لم تعد مسجّلًا";
}

export async function generateMetadata({ params }: PageProps<"/messages/[id]">): Promise<Metadata> {
  const { id } = await params;
  const user = await requireUser(`/messages/${id}`);
  const c = await getConversation(id, user.id);
  return { title: c ? `محادثة مع ${c.name}` : "المحادثة" };
}

/** GEN-MSG-02 · تفاصيل المحادثة والمرفقات (238:15038). */
export default async function ConversationPage({ params }: PageProps<"/messages/[id]">) {
  const { id } = await params;
  const user = await requireUser(`/messages/${id}`);
  const c = await getConversation(id, user.id);
  if (!c) notFound();
  const now = new Date();
  const attachments = c.messages.filter((m) => m.attachment).reverse();
  const status = c.course?.enrollmentStatus as EnrollmentStatus | null | undefined;

  return (
    <>
      <TopBar title="المحادثة" subtitle={c.name} />
      <PageBody className="gap-6">
        <Breadcrumb items={[{ label: "المحادثات", href: "/messages" }, { label: c.name }]} />
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section aria-label={`المحادثة مع ${c.name}`} className="flex min-h-[560px] flex-col overflow-hidden rounded-16 border border-border-default bg-bg-surface shadow-card lg:h-[calc(100dvh-240px)]">
            <Thread c={c} variant="page" now={now.toISOString()} />
          </section>

          <aside aria-label="سياق المحادثة والمرفقات" className="flex min-w-0 flex-col gap-6">
            {c.course && (
              <section aria-labelledby="ctx-title" className="flex flex-col gap-4 rounded-16 border border-border-default bg-bg-card p-5 shadow-card sm:p-6">
                <h2 id="ctx-title" className="type-h3 text-text-primary">
                  سياق المحادثة
                </h2>
                <div className="flex items-center gap-3 rounded-12 bg-bg-page px-4 py-3.5">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-8 bg-bg-brand-tint text-text-brand">
                    <Glyph icon={BookOpen} size={20} />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <p className="type-small text-text-primary">{c.course.title}</p>
                    <p className="type-caption text-text-muted">
                      {enrollmentLabel(status)}
                      {c.course.startsAt && ` · دورة ${formatDayMonth(c.course.startsAt)}`}
                    </p>
                  </div>
                </div>
                <ButtonLink href={status ? "/trainee/trainings" : `/courses/${c.course.slug}`} variant="outline" fullWidth>
                  {status ? "اعرض تسجيلي" : "اعرض البرنامج"}
                </ButtonLink>
              </section>
            )}

            <section aria-labelledby="att-title" className="flex flex-col gap-4 rounded-16 border border-border-default bg-bg-card p-5 shadow-card sm:p-6">
              <div className="flex items-center gap-3">
                <h2 id="att-title" className="flex-1 type-h3 text-text-primary">
                  المرفقات
                </h2>
                <span className="rounded-full bg-bg-brand-tint px-2.5 py-[3px] type-caption text-text-brand">
                  {attachments.length === 0 ? "لا ملفات" : pluralAr(attachments.length, ["ملف واحد", "ملفان", "ملفات", "ملفًا"])}
                </span>
              </div>
              {attachments.length === 0 ? (
                <p className="type-small text-text-muted">الملفات المرسلة في هذه المحادثة تظهر هنا.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {attachments.map((m) => {
                    const sheet = /\.(xlsx|csv)$/i.test(m.attachment!.name);
                    return (
                      <li key={m.id} className="flex items-center gap-3 rounded-12 bg-bg-page px-4 py-3">
                        <span className={`flex size-9 shrink-0 items-center justify-center rounded-8 bg-bg-surface ${sheet ? "text-state-success" : "text-state-error"}`}>
                          <Glyph icon={sheet ? FileSpreadsheet : FileText} size={20} />
                        </span>
                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <p dir="auto" className="truncate type-small text-text-primary">
                            {m.attachment!.name}
                          </p>
                          <p className="type-caption text-text-muted">{formatRelative(m.createdAt, now)}</p>
                        </div>
                        {m.attachment!.url && (
                          <a
                            href={m.attachment!.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`تنزيل ${m.attachment!.name}`}
                            className="flex size-9 shrink-0 items-center justify-center rounded-8 bg-bg-surface text-text-secondary focus-ring"
                          >
                            <Glyph icon={Download} size={16} />
                          </a>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <ConversationActions conversationId={c.id} muted={c.muted} />
          </aside>
        </div>
      </PageBody>
    </>
  );
}
