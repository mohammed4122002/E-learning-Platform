import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, MessagesSquare, Shield } from "lucide-react";
import { TopBar, PageBody } from "@/components/layout/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Feedback";
import { Glyph } from "@/components/ui/Icon";
import { ConversationList } from "@/components/messages/ConversationList";
import { Thread } from "@/components/messages/Thread";
import { requireUser } from "@/lib/auth";
import { getConversation, listConversations } from "@/lib/data/messages";

export const metadata: Metadata = { title: "المحادثات", description: "مراسلاتك مع الجهات والمدربين والدعم" };

/** GEN-MSG-01 · المحادثات (235:14763): list + the selected conversation (defaults to the most recent). */
export default async function MessagesPage({ searchParams }: PageProps<"/messages">) {
  const user = await requireUser("/messages");
  const sp = await searchParams;
  const filter = sp.f === "support" || sp.f === "unread" ? sp.f : "all";
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 80) : "";
  const all = await listConversations(user.id);
  const now = new Date();

  const needle = q.toLowerCase();
  const items = all.filter(
    (c) =>
      (filter === "all" || (filter === "support" ? c.isSupport : c.unread)) &&
      (!needle || [c.name, c.subject, c.courseTitle ?? "", c.lastMessage ?? ""].some((s) => s.toLowerCase().includes(needle))),
  );
  const requested = typeof sp.c === "string" ? sp.c : null;
  const activeId = requested ?? items[0]?.id ?? null;
  const active = activeId ? await getConversation(activeId, user.id) : null;

  return (
    <>
      <TopBar title="المحادثات" subtitle="مراسلاتك مع الجهات والمدربين والدعم" />
      <PageBody className="gap-6">
        {all.length === 0 ? (
          <EmptyState
            icon={MessagesSquare}
            title="لا محادثات بعد"
            description="راسل الجهة أو المدرب من صفحة أي دورة سجّلت فيها — ستظهر محادثاتك هنا."
            action={<ButtonLink href="/trainee/trainings">اذهب إلى ملف التدريب</ButtonLink>}
          />
        ) : (
          <div className="grid min-h-[640px] grid-cols-1 overflow-hidden rounded-16 border border-border-default bg-bg-surface shadow-card lg:h-[calc(100dvh-230px)] lg:grid-cols-[372px_minmax(0,1fr)]">
            <div className={`min-h-0 overflow-y-auto border-border-default lg:border-e ${requested ? "max-lg:hidden" : ""}`}>
              <ConversationList items={items} activeId={activeId} filter={filter} q={q} counts={{ all: all.length, unread: all.filter((c) => c.unread).length }} now={now} />
            </div>
            <section aria-label="المحادثة المفتوحة" className={`flex min-h-0 flex-col ${requested ? "" : "max-lg:hidden"}`}>
              {requested && (
                <Link href="/messages" className="flex items-center gap-2 border-b border-border-divider px-5 py-3 type-subtitle text-text-brand focus-ring lg:hidden">
                  <Glyph icon={ChevronRight} size={16} />
                  كل المحادثات
                </Link>
              )}
              {active ? (
                <Thread key={active.id} c={active} variant="panel" now={now.toISOString()} />
              ) : (
                <div className="flex flex-1 items-center justify-center p-8">
                  <EmptyState icon={MessagesSquare} title={requested ? "المحادثة غير متاحة" : "اختر محادثة"} description={requested ? "ربما حُذفت أو لست طرفًا فيها." : "اختر محادثة من القائمة لعرض رسائلها."} />
                </div>
              )}
            </section>
          </div>
        )}
        <div className="flex items-start gap-3 rounded-16 bg-state-info-bg px-5 py-4">
          <Glyph icon={Shield} size={20} className="mt-0.5 text-state-info" />
          <p className="type-body text-state-info">تُراسل الجهات التي سجّلت لديها فقط. لا تُشارك بيانات بطاقتك أو رقمك الوطني في المحادثات — للأمور المالية استخدم مركز المساعدة.</p>
        </div>
      </PageBody>
    </>
  );
}
