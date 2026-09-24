"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ChevronLeft, FileText, Hourglass, MessagesSquare, Play, Plus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Glyph } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import { toArabicDigits } from "@/lib/format";
import { setSalesPaused } from "@/app/(trainer)/trainer/courses/actions";
import { NotifyModal } from "../course/NotifyModal";

/* Interactive bits of TRR-CRS-07: copy/share the sale link, the «إجراءات» card, retry. */

export function CopyLink({ url, label }: { url: string; label: string }) {
  const toast = useToast();
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          toast("success", "نُسخ رابط الدورة.");
        } catch {
          toast("error", "تعذّر النسخ — انسخ الرابط يدويًا.");
        }
      }}
      className="cursor-pointer rounded-8 type-caption text-text-brand hover:underline focus-ring"
    >
      {label}
    </button>
  );
}

/** «شارك رابط الدورة» / «شارك الآن»: the native share sheet when available, else copy. */
export function ShareLinkButton({ url, title, children, variant = "primary", size = "m", className }: { url: string; title: string; children: React.ReactNode; variant?: "primary" | "outline"; size?: "s" | "m" | "l"; className?: string }) {
  const toast = useToast();
  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={async () => {
        try {
          if (navigator.share) await navigator.share({ title, url });
          else {
            await navigator.clipboard.writeText(url);
            toast("success", "نُسخ رابط الدورة — الصقه حيث جمهورك.");
          }
        } catch {
          /* share sheet dismissed */
        }
      }}
    >
      {children}
    </Button>
  );
}

function ActionLinkRow({ icon, title, sub, href, onClick, disabled }: { icon: LucideIcon; title: string; sub: string; href?: string; onClick?: () => void; disabled?: boolean }) {
  const body = (
    <>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-12 bg-bg-surface text-text-brand">
        <Glyph icon={icon} size={20} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-start">
        <span className="type-subtitle text-text-primary">{title}</span>
        <span className="type-caption text-text-muted">{sub}</span>
      </span>
      <Glyph icon={ChevronLeft} size={16} className="text-text-muted" />
    </>
  );
  const cls = "flex w-full items-center gap-3 rounded-16 bg-bg-page px-4 py-3.5 focus-ring hover:bg-bg-brand-tint disabled:cursor-wait disabled:opacity-60";
  return href ? (
    // The CSV export is a route handler: prefetching it only produces a 400 RSC request.
    <Link href={href} prefetch={href.startsWith("/trainer/courses/export") ? false : undefined} className={cls}>
      {body}
    </Link>
  ) : (
    <button type="button" onClick={onClick} disabled={disabled} className={`cursor-pointer ${cls}`}>
      {body}
    </button>
  );
}

export function DashboardActions({ courseId, buyers, paused }: { courseId: string; buyers: number; paused: boolean }) {
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();
  return (
    <section className="flex flex-col gap-5 rounded-22 border border-border-default bg-bg-card p-5 shadow-card sm:p-7">
      <h2 className="type-h2 text-text-primary">إجراءات</h2>
      <ActionLinkRow icon={Plus} title="أضف درسًا جديدًا" sub={`يُشعر ${toArabicDigits(buyers)} مشتريًا ويُعيد نسبهم`} href={`/trainer/courses/${courseId}/content`} />
      <ActionLinkRow icon={MessagesSquare} title="راسل المشترين" sub="إعلان أو تذكير للجميع" onClick={() => setNotifyOpen(true)} disabled={buyers === 0} />
      <ActionLinkRow icon={FileText} title="صدّر قائمة المشترين" sub="Excel أو PDF" href={`/trainer/courses/export?ids=${courseId}`} />
      <ActionLinkRow
        icon={paused ? Play : Hourglass}
        title={paused ? "استأنف البيع" : "أوقف البيع مؤقتًا"}
        sub="المشترون الحاليون يحتفظون بوصولهم"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await setSalesPaused(courseId, !paused);
            if (!res.ok) return toast("error", res.error);
            toast("success", paused ? "استُؤنف البيع." : "أُوقف البيع مؤقتًا — المشترون الحاليون يحتفظون بوصولهم.");
            router.refresh();
          })
        }
      />
      <NotifyModal
        open={notifyOpen}
        onClose={() => setNotifyOpen(false)}
        courseIds={[courseId]}
        title="راسل المشترين"
        intro={`يصل الإعلان إلى ${toArabicDigits(buyers)} مشتريًا — داخل المنصة وبالبريد.`}
      />
    </section>
  );
}

export function RetryButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button size="l" loading={pending} onClick={() => start(() => router.refresh())}>
      أعد المحاولة
    </Button>
  );
}
