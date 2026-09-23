"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ButtonLink } from "@/components/ui/Button";
import { toArabicDigits } from "@/lib/format";
import { DataCard, Notice, type NoticeTone } from "./ui";
import { DropZone, UploadList, useDisputeUploads } from "./DisputeUploads";

const attachmentsLabel = (n: number) => (n === 0 ? "لا توجد مرفقات" : n === 1 ? "مرفق واحد" : n === 2 ? "مرفقان" : `${toArabicDigits(n)} مرفقات`);

/**
 * TRN-DSP-02 · مرفقات النزاع — بلا مرفقات (4153:2) · جارٍ الرفع (4153:314) · تم الرفع (4153:575) · فشل الرفع (4153:840).
 * Files go to dispute-attachments/<uid>/<dispute>/… and are registered with add_dispute_attachment.
 */
export function DisputeEvidencePanel({ disputeId, disputeRef, courseTitle, existing, backHref }: { disputeId: string; disputeRef: string; courseTitle: string; existing: number; backHref: string }) {
  const uploads = useDisputeUploads(5);
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);
  const busy = uploads.items.some((i) => i.status === "uploading");
  const failed = uploads.items.some((i) => i.status === "failed");
  const done = uploads.items.filter((i) => i.status === "done").length;
  if (dismissed) return null;

  const onFiles = async (files: FileList) => {
    const added = uploads.add(files, existing);
    if (added.length === 0) return;
    await uploads.uploadAll(disputeId, added);
    router.refresh();
  };

  let tone: NoticeTone = "brand";
  let title = existing === 0 ? "نزاع بلا مرفقات" : "أضف مرفقات لنزاعك";
  let text = "يمكنك إرفاق دليل يدعم موقفك — إيصال أو محادثة أو صورة.";
  if (busy) {
    tone = "info";
    title = "جارٍ رفع المرفقات";
    text = "لا تغلق الصفحة حتى يكتمل الرفع.";
  } else if (failed) {
    tone = "error";
    title = "فشل رفع بعض الملفات";
    text = "تحقّق من اتصالك ثم أعد المحاولة. الملفات المرفوعة بنجاح محفوظة.";
  } else if (done > 0) {
    tone = "success";
    title = "تم رفع المرفقات";
    text = "أُضيفت الملفات إلى نزاعك وستظهر للمراجع المستقل.";
  }
  const total = existing;

  return (
    <>
      <Notice tone={tone} title={title}>
        <p aria-live="polite">{text}</p>
      </Notice>
      <DataCard
        title="تفاصيل النزاع والمرفقات"
        rows={[
          { label: "رقم النزاع", value: disputeRef },
          { label: "التسجيل", value: courseTitle },
          { label: "المرفقات", value: attachmentsLabel(total), tone: total > 0 ? "success" : undefined },
        ]}
      />
      <div className="flex flex-wrap justify-end gap-3">
        <ButtonLink href={backHref} variant="secondary">
          رجوع
        </ButtonLink>
        {existing === 0 && done === 0 && (
          <Button variant="secondary" onClick={() => setDismissed(true)}>
            أرسل بدون مرفقات
          </Button>
        )}
        <Button onClick={() => document.getElementById("evidence-drop")?.querySelector("input")?.click()} loading={busy}>
          أرفق دليلًا
        </Button>
      </div>
      <div id="evidence-drop" className="flex flex-col gap-3">
        <DropZone onFiles={(f) => void onFiles(f)} disabled={busy || existing >= 5} tone={done > 0 && !failed ? "success" : "brand"} />
        {uploads.rejected && (
          <p role="alert" className="type-caption text-state-error">
            {uploads.rejected}
          </p>
        )}
        <UploadList
          items={uploads.items}
          onRetry={async () => {
            await uploads.uploadAll(disputeId);
            router.refresh();
          }}
          onRemove={(i) => uploads.remove(i.key)}
        />
      </div>
    </>
  );
}
