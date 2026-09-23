"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Link2, Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Glyph } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { Alert } from "@/components/ui/Feedback";
import { useToast } from "@/components/ui/Toast";
import { SectionCard } from "./bits";
import { setProfileVisibility } from "@/app/(workspace)/trainee/profile/actions";

const HIDDEN = [
  { title: "مدفوعاتك وفواتيرك", caption: "لا يمكن جعلها عامة إطلاقًا" },
  { title: "درجاتك ونتائجك", caption: "خاصة افتراضيًا" },
  { title: "دوراتك المنسحب منها", caption: "لا تظهر في أي سجل مشارَك" },
  { title: "بريدك وهاتفك", caption: "بيانات حساب لا ملف مهني" },
];

/** TRN-PRF-01 · الملف العام (معاينة) — owner-only side cards: hidden data + sharing controls. */
export function PreviewAside({ publicUrl, isPublic }: { publicUrl: string; isPublic: boolean }) {
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const display = publicUrl.replace(/^https?:\/\//, "");

  const change = (next: boolean) =>
    start(async () => {
      const res = await setProfileVisibility(next);
      if (res.status === "error") {
        setError(res.message ?? null);
        return;
      }
      setConfirm(false);
      toast("success", res.message ?? "تم");
      router.refresh();
    });

  return (
    <>
      <SectionCard title="مخفي في هذه المعاينة" titleId="hidden-title">
        <ul className="flex flex-col gap-4">
          {HIDDEN.map((h) => (
            <li key={h.title} className="flex items-center gap-3 rounded-12 bg-bg-page px-3 py-[11px]">
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <p className="type-small text-text-primary">{h.title}</p>
                <p className="type-caption text-text-muted">{h.caption}</p>
              </div>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-8 bg-state-success-bg text-state-success">
                <Glyph icon={Lock} size={16} />
              </span>
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard title="مشاركة الملف" titleId="share-title">
        <div className="flex min-w-0 items-center gap-2.5 rounded-12 bg-bg-page px-3.5 py-2.5">
          <Glyph icon={Link2} size={16} className="text-text-muted" />
          <span dir="ltr" className="min-w-0 flex-1 truncate text-start font-mono text-[14px] leading-normal text-text-brand">
            {display}
          </span>
        </div>
        {isPublic ? (
          <>
            <Button
              fullWidth
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(publicUrl);
                  toast("success", "نُسخ رابط ملفك");
                } catch {
                  toast("error", "تعذّر النسخ. انسخ الرابط يدويًا.");
                }
              }}
            >
              نسخ الرابط
            </Button>
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(publicUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-12 items-center justify-center rounded-12 type-button text-text-primary inner-stroke istroke-w-[1.5px] istroke-c-border-default hover:bg-bg-brand-tint focus-ring"
            >
              شارك على لينكدإن
            </a>
            <button type="button" onClick={() => setConfirm(true)} className="cursor-pointer self-center rounded-8 py-2 type-subtitle text-text-brand hover:underline focus-ring">
              أوقف مشاركة الملف
            </button>
          </>
        ) : (
          <>
            <p className="type-small text-text-secondary">ملفك خاص الآن — الرابط لا يعمل إلا لك. فعّل المشاركة ليصل إليه أي شخص يملك الرابط.</p>
            <Button fullWidth loading={pending} onClick={() => change(true)}>
              فعّل مشاركة الملف
            </Button>
          </>
        )}
      </SectionCard>

      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title="إيقاف مشاركة الملف؟"
        size="s"
        footer={
          <>
            <Button variant="danger" size="s" loading={pending} onClick={() => change(false)}>
              أوقف المشاركة
            </Button>
            <Button variant="outline" size="s" onClick={() => setConfirm(false)}>
              تراجع
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p>سيتوقف رابط ملفك عن العمل لأي شخص غيرك، وتختفي نبذتك وخبراتك وشهاداتك من العرض العام. روابط التحقق من الشهادات تبقى تعمل.</p>
          {error && <Alert tone="error" title="تعذّر الحفظ">{error}</Alert>}
        </div>
      </Modal>
    </>
  );
}
