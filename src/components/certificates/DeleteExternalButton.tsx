"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { deleteExternalCertificate } from "@/app/(workspace)/trainee/certificates/external/actions";

/** «احذف الطلب» with a destructive confirmation (BR-U2). */
export function DeleteExternalButton({ id, title }: { id: string; title: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className="text-state-error">
        احذف الطلب
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        size="s"
        destructive
        title="حذف طلب الشهادة؟"
        footer={
          <>
            <Button
              variant="danger"
              size="s"
              loading={pending}
              onClick={() =>
                startTransition(async () => {
                  const res = await deleteExternalCertificate(id);
                  if (res && !res.ok) {
                    toast("error", res.message ?? "تعذّر حذف الطلب.");
                    setOpen(false);
                  }
                })
              }
            >
              احذف نهائيًا
            </Button>
            <Button variant="outline" size="s" onClick={() => setOpen(false)}>
              تراجع
            </Button>
          </>
        }
      >
        ستُحذف «{title}» وملفها المرفوع من ملفك، ولن تظهر في شهاداتك. يمكنك إضافتها من جديد لاحقًا.
      </Modal>
    </>
  );
}
