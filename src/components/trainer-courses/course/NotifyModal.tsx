"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { toArabicDigits } from "@/lib/format";
import { notifyTrainees } from "@/app/(trainer)/trainer/courses/actions";

/** «راسل المسجّلين» / «أرسل تنبيهًا للمسجّلين»: in-app + email notice to every current trainee of the courses. */
export function NotifyModal({ open, onClose, courseIds, title, intro }: { open: boolean; onClose: () => void; courseIds: string[]; title: string; intro: string }) {
  const [heading, setHeading] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const toast = useToast();
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button
            loading={pending}
            disabled={heading.trim().length < 3}
            onClick={() =>
              start(async () => {
                setError(null);
                const res = await notifyTrainees(courseIds, heading, body);
                if (!res.ok) return setError(res.error);
                onClose();
                setHeading("");
                setBody("");
                toast("success", `أُرسل التنبيه إلى ${toArabicDigits(res.data?.count ?? 0)} متدربًا.`);
              })
            }
          >
            أرسل
          </Button>
          <Button variant="outline" onClick={onClose}>
            إلغاء
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p>{intro}</p>
        <Input label="عنوان التنبيه" value={heading} onChange={(e) => setHeading(e.target.value)} maxLength={120} required />
        <Textarea label="نص التنبيه" value={body} onChange={(e) => setBody(e.target.value)} maxLength={1000} rows={4} />
        {error && (
          <p role="alert" className="type-caption text-state-error">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
