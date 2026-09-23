"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Archive, Bell, Check, CircleAlert, Clock, Minus, Search, Trash2 } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Alert, EmptyState } from "@/components/ui/Feedback";
import { Glyph } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { Pagination } from "@/components/ui/Navigation";
import { useToast } from "@/components/ui/Toast";
import { NOTIFICATION_STYLE } from "@/components/layout/TopBar";
import { PageHeading, TileRow } from "@/components/profile/bits";
import { markAllNotificationsRead, markNotificationRead, markNotificationsRead } from "@/lib/actions/notifications";
import { archiveNotifications, deleteSelectedNotifications } from "@/app/(workspace)/notifications/actions";
import { toArabicDigits } from "@/lib/format";

export type CenterItem = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  unread: boolean;
  needsAction: boolean;
  timeLabel: string;
  group: "action" | "today" | "week" | "older";
};

type Chip = { key: string; label: string; href: string; count?: number };

const GROUP_LABEL = { action: "تحتاج إجراءك الآن", today: "اليوم", week: "هذا الأسبوع", older: "أقدم" } as const;
const fallbackStyle = { icon: Bell, tint: "bg-bg-brand-tint text-text-brand" };

function ctaFor(n: CenterItem): string | null {
  if (!n.link) return null;
  if (n.kind === "action_required") return n.link.includes("checkout") || n.title.includes("الدفع") ? "أكمل الدفع" : "أكمل الإجراء";
  if (n.kind === "waitlist_invite") return n.unread ? "اقبل المقعد" : null;
  if (n.kind === "certificate_issued") return "اعرض الشهادة";
  return null;
}

/** GEN-NOT-01 · مركز الإشعارات — Default (235:14479) and Selection (238:14778). */
export function NotificationCenter({
  items,
  chips,
  activeChip,
  q,
  totals,
  page,
  pageCount,
  hrefForPage,
  archived,
}: {
  items: CenterItem[];
  chips: Chip[];
  activeChip: string;
  q: string;
  totals: { all: number; unread: number };
  page: number;
  pageCount: number;
  hrefForPage: string;
  archived: boolean;
}) {
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();

  const groups = useMemo(() => {
    const order: CenterItem["group"][] = ["action", "today", "week", "older"];
    return order.map((g) => ({ key: g, items: items.filter((i) => i.group === g) })).filter((g) => g.items.length);
  }, [items]);

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const clear = () => {
    setSelected(new Set());
    setSelecting(false);
  };
  const ids = [...selected];
  const protectedCount = items.filter((i) => selected.has(i.id) && i.needsAction).length;

  const run = (fn: () => Promise<{ status: string; message?: string }>, after?: () => void) =>
    start(async () => {
      setError(null);
      const res = await fn();
      if (res.status === "error") {
        setError(res.message ?? null);
        return;
      }
      if (res.message) toast("success", res.message);
      after?.();
      clear();
      router.refresh();
    });

  const pageHref = (p: number) => `${hrefForPage}${hrefForPage.includes("?") ? "&" : "?"}page=${p}`;

  return (
    <>
      <PageHeading
        title="مركز الإشعارات"
        description={
          selecting
            ? `حدّدت ${toArabicDigits(selected.size)} ${selected.size === 1 ? "إشعارًا" : "إشعارات"}. يمكنك أرشفتها أو حذفها أو تعليمها كمقروءة دفعة واحدة.`
            : `${toArabicDigits(totals.unread)} غير مقروءة من ${toArabicDigits(totals.all)} إشعارًا. الإشعارات المرتبطة بمهلة تبقى في الأعلى حتى تنتهي منها.`
        }
      />

      {selecting ? (
        <div role="toolbar" aria-label="إجراءات الإشعارات المحددة" className="flex flex-wrap items-center gap-3 rounded-16 border-[1.5px] border-action-primary bg-bg-brand-tint px-4 py-4">
          <Button variant="secondary" size="s" disabled={!selected.size || pending} onClick={() => run(async () => (await markNotificationsRead(ids), { status: "success", message: "عُلّمت كمقروءة." }))}>
            تعليم كمقروء
          </Button>
          <Button variant="outline" size="s" className="bg-bg-surface" disabled={!selected.size || pending} onClick={() => run(() => archiveNotifications(ids, !archived))}>
            {archived ? "إلغاء الأرشفة" : "أرشفة"}
          </Button>
          <button type="button" disabled={!selected.size || pending} onClick={() => setConfirmDelete(true)} className="cursor-pointer rounded-8 px-2 py-2 type-subtitle text-text-brand hover:underline focus-ring disabled:cursor-not-allowed disabled:text-text-disabled">
            حذف
          </button>
          <button type="button" onClick={clear} className="cursor-pointer rounded-8 px-2 py-2 type-subtitle text-text-brand hover:underline focus-ring">
            إلغاء التحديد
          </button>
          <span className="flex items-center gap-2 type-small text-text-primary" aria-live="polite">
            <span className="flex size-5 items-center justify-center rounded-[6px] bg-action-primary text-text-on-brand">
              <Glyph icon={Minus} size={16} />
            </span>
            {toArabicDigits(selected.size)} محدَّدة من {toArabicDigits(items.length)} معروضة
          </span>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <form role="search" action="/notifications" className="relative flex-1">
              {activeChip !== "all" && <input type="hidden" name="filter" value={activeChip} />}
              {archived && <input type="hidden" name="archived" value="1" />}
              <label htmlFor="notif-q" className="sr-only">
                ابحث في إشعاراتك
              </label>
              <Glyph icon={Search} size={16} className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                id="notif-q"
                name="q"
                type="search"
                defaultValue={q}
                placeholder="ابحث في إشعاراتك — مثال: استرداد"
                className="h-12 w-full rounded-12 border-[1.5px] border-border-default bg-bg-surface ps-11 pe-4 type-body text-text-primary outline-none placeholder:text-text-muted focus:border-2 focus:border-action-primary"
              />
            </form>
            <div className="flex gap-3">
              {items.length > 0 && (
                <Button variant="outline" onClick={() => setSelecting(true)}>
                  تحديد
                </Button>
              )}
              {totals.unread > 0 && (
                <Button variant="outline" loading={pending} onClick={() => run(async () => (await markAllNotificationsRead(), { status: "success", message: "عُلّمت كل الإشعارات كمقروءة." }))}>
                  تعليم الكل كمقروء
                </Button>
              )}
            </div>
          </div>
          <nav aria-label="تصفية الإشعارات" className="flex flex-wrap gap-2.5">
            {chips.map((c) => {
              const active = c.key === activeChip;
              return (
                <Link
                  key={c.key}
                  href={c.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex h-9 items-center rounded-full px-3.5 type-small focus-ring ${
                    active ? "border-[1.5px] border-action-primary bg-bg-brand-tint font-bold text-text-brand" : "border border-border-default bg-bg-surface text-text-primary hover:bg-bg-page"
                  }`}
                >
                  {c.label}
                  {c.count !== undefined && ` · ${toArabicDigits(c.count)}`}
                </Link>
              );
            })}
          </nav>
        </div>
      )}

      {error && (
        <Alert tone="error" title="تعذّر تنفيذ الإجراء">
          {error}
        </Alert>
      )}

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-6">
          {archived && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-12 bg-bg-page px-4 py-3">
              <p className="type-small text-text-secondary">تعرض الإشعارات المؤرشفة.</p>
              <Link href="/notifications" className="rounded-8 type-subtitle text-text-brand hover:underline focus-ring">
                عد إلى كل الإشعارات
              </Link>
            </div>
          )}
          {items.length === 0 ? (
            <EmptyState
              icon={Bell}
              title={q ? "لا نتائج مطابقة" : archived ? "لا إشعارات مؤرشفة" : "لا توجد إشعارات هنا"}
              description={q ? `لم نجد إشعارات تطابق «${q}». جرّب كلمة أخرى أو امسح البحث.` : "ستظهر هنا تنبيهات دوراتك ومدفوعاتك وشهاداتك ورسائلك."}
              action={
                q || activeChip !== "all" ? (
                  <ButtonLink href="/notifications" variant="outline" size="s">
                    اعرض كل الإشعارات
                  </ButtonLink>
                ) : undefined
              }
            />
          ) : (
            groups.map((g) => (
              <section key={g.key} aria-labelledby={`grp-${g.key}`} className="flex flex-col gap-3">
                <h2 id={`grp-${g.key}`} className={selecting ? "sr-only" : "type-small text-text-secondary"}>
                  {GROUP_LABEL[g.key]}
                </h2>
                <ul className="flex flex-col gap-3">
                  {g.items.map((n) => {
                    const style = NOTIFICATION_STYLE[n.kind] ?? fallbackStyle;
                    const cta = ctaFor(n);
                    const isSelected = selected.has(n.id);
                    const highlighted = selecting ? isSelected : n.unread;
                    return (
                      <li
                        key={n.id}
                        className={`relative flex items-start gap-4 rounded-16 px-4 py-4 sm:px-5 ${
                          highlighted ? "border-[1.5px] border-action-primary bg-bg-brand-tint" : "border border-border-default bg-bg-surface"
                        }`}
                      >
                        <span className={`flex size-11 shrink-0 items-center justify-center rounded-12 ${style.tint}`}>
                          <Glyph icon={style.icon} size={20} />
                        </span>
                        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                            <h3 className="type-subtitle text-text-primary">
                              {n.link && !selecting ? (
                                <Link
                                  href={n.link}
                                  onClick={() => n.unread && void markNotificationRead(n.id)}
                                  className="rounded-8 hover:underline focus-ring"
                                >
                                  {n.title}
                                </Link>
                              ) : (
                                n.title
                              )}
                            </h3>
                            <span className="type-caption text-text-muted">{n.timeLabel}</span>
                          </div>
                          {n.body && <p className="type-body text-text-secondary">{n.body}</p>}
                          {n.unread && !selecting && <span className="sr-only">غير مقروء</span>}
                        </div>
                        {selecting ? (
                          <label className="flex size-11 shrink-0 cursor-pointer items-center justify-center">
                            <span className="sr-only">تحديد «{n.title}»</span>
                            <span className="relative flex size-[22px] items-center justify-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggle(n.id)}
                                className="peer absolute inset-0 cursor-pointer appearance-none rounded-[6px] border-[1.5px] border-border-default bg-bg-surface checked:border-0 checked:bg-action-primary focus-ring"
                              />
                              <Glyph icon={Check} size={16} className="pointer-events-none relative text-text-on-brand opacity-0 peer-checked:opacity-100" />
                            </span>
                          </label>
                        ) : cta ? (
                          <ButtonLink href={n.link!} size="s" className="shrink-0" onClick={() => n.unread && void markNotificationRead(n.id)}>
                            {cta}
                          </ButtonLink>
                        ) : n.unread ? (
                          <button
                            type="button"
                            onClick={() => run(async () => (await markNotificationRead(n.id), { status: "success" }))}
                            className="shrink-0 cursor-pointer rounded-8 px-2 py-1 type-caption text-text-brand hover:underline focus-ring"
                          >
                            تعليم كمقروء
                          </button>
                        ) : null}
                        {n.unread && !selecting && <span aria-hidden className="absolute top-1/2 -end-[5px] size-2.5 -translate-y-1/2 rounded-full bg-action-primary" />}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))
          )}
          <Pagination page={page} pageCount={pageCount} hrefFor={pageHref} />
        </div>

        <aside aria-label="عن الإشعارات" className="flex min-w-0 flex-col gap-6">
          {selecting ? (
            <section aria-labelledby="archive-help" className="flex flex-col gap-4 rounded-16 border border-border-default bg-bg-card p-5 shadow-card sm:p-6">
              <h2 id="archive-help" className="type-h3 text-text-primary">
                الأرشفة والحذف
              </h2>
              <TileRow icon={Archive} iconClass="text-text-secondary" title="الأرشفة" caption="يختفي من القائمة ويبقى في «المؤرشفة». الفعل المرتبط به يظل متاحًا من مصدره." />
              <TileRow icon={Trash2} iconClass="text-state-error" title="الحذف" caption="نهائي ولا يمكن التراجع. لا يُلغي الفعل نفسه — مهلة الدفع تبقى سارية حتى لو حذفت إشعارها." />
              <TileRow icon={CircleAlert} iconClass="text-state-warning" title="لا يمكن حذف ما يحتاج إجراءك" caption="الإشعارات ذات المهلة السارية محمية من الحذف حتى تنتهي منها." />
              <ButtonLink href={archived ? "/notifications" : "/notifications?archived=1"} variant="outline" fullWidth>
                {archived ? "عد إلى كل الإشعارات" : "اعرض الإشعارات المؤرشفة"}
              </ButtonLink>
            </section>
          ) : (
            <>
              <section aria-labelledby="control-title" className="flex flex-col gap-4 rounded-16 border border-border-default bg-bg-card p-5 shadow-card sm:p-6">
                <h2 id="control-title" className="type-h3 text-text-primary">
                  تحكّم بما يصلك
                </h2>
                <p className="type-body text-text-secondary">هذه الصفحة لقراءة إشعاراتك. لضبط ما يصلك وعبر أي قناة، اذهب إلى تفضيلات الإشعارات.</p>
                <ButtonLink href="/account/notifications" variant="outline" fullWidth>
                  تفضيلات الإشعارات
                </ButtonLink>
                {!archived && (
                  <Link href="/notifications?archived=1" className="self-center rounded-8 type-subtitle text-text-brand hover:underline focus-ring">
                    اعرض الإشعارات المؤرشفة
                  </Link>
                )}
              </section>
              <section aria-labelledby="order-title" className="flex flex-col gap-4 rounded-16 border border-border-default bg-bg-card p-5 shadow-card sm:p-6">
                <h2 id="order-title" className="type-h3 text-text-primary">
                  كيف نرتّب إشعاراتك
                </h2>
                <TileRow icon={CircleAlert} iconClass="text-state-error" title="ما يحتاج إجراءك أولًا" caption="يبقى في الأعلى حتى تنتهي منه أو تنتهي مهلته." />
                <TileRow icon={Clock} title="ثم الأحدث" caption="مجمّعة حسب اليوم والأسبوع." />
                <TileRow icon={Archive} iconClass="text-text-secondary" title="تُحفظ ٦ أشهر" caption="بعدها تُؤرشف تلقائيًا ويبقى الفعل متاحًا من مصدره." />
              </section>
            </>
          )}
        </aside>
      </div>

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={`حذف ${toArabicDigits(selected.size)} ${selected.size === 1 ? "إشعار" : "إشعارات"}؟`}
        size="s"
        destructive
        footer={
          <>
            <Button variant="danger" size="s" loading={pending} disabled={selected.size === protectedCount} onClick={() => run(() => deleteSelectedNotifications(ids), () => setConfirmDelete(false))}>
              احذف نهائيًا
            </Button>
            <Button variant="outline" size="s" onClick={() => setConfirmDelete(false)}>
              تراجع
            </Button>
          </>
        }
      >
        <p>
          الحذف نهائي ولا يمكن التراجع عنه، ولا يُلغي الفعل المرتبط بالإشعار.
          {protectedCount > 0 && ` ${toArabicDigits(protectedCount)} منها تحتاج إجراءك ولن تُحذف حتى تنتهي منها.`}
        </p>
      </Modal>
    </>
  );
}
