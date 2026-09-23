"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { withdrawReport } from "@/app/(workspace)/trainee/report/actions";

/** «اسحب البلاغ» (227:13921) — confirmation first (BR-U2). */
export function WithdrawReportButton({ id, reference }: { id: string; reference: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  return (
    <>
      <Button variant="outline" size="l" fullWidth onClick={() => setOpen(true)}>
        اسحب البلاغ
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        size="s"
        destructive
        title="سحب البلاغ؟"
        footer={
          <>
            <Button
              variant="danger"
              size="s"
              loading={pending}
              onClick={() =>
                startTransition(async () => {
                  const res = await withdrawReport(id);
                  setOpen(false);
                  toast(res.ok ? "success" : "error", res.ok ? `سُحب البلاغ ${reference}.` : (res.message ?? "تعذّر سحب البلاغ."));
                })
              }
            >
              اسحب البلاغ
            </Button>
            <Button variant="outline" size="s" onClick={() => setOpen(false)}>
              تراجع
            </Button>
          </>
        }
      >
        لن يُراجع البلاغ {reference} بعد سحبه، ويبقى في سجلك بحالة «مسحوب». يمكنك تقديم بلاغ جديد لاحقًا.
      </Modal>
    </>
  );
}
