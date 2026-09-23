"use client";

import { useState, useTransition } from "react";
import { Bell, BellRing } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Glyph } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { Alert } from "@/components/ui/Feedback";
import { useToast } from "@/components/ui/Toast";
import { followProgramOwner, joinWaitlist, type ActionResult } from "@/app/(workspace)/trainee/programs/[slug]/actions";

/** Confirmation dialog (BR-U2) shared by the state-changing buttons of TRN-DSC-03. */
function useConfirmedAction() {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const run = (fn: () => Promise<ActionResult>) =>
    startTransition(async () => {
      const res = await fn();
      if (res.status === "success") {
        toast("success", res.message);
        setOpen(false);
      } else {
        setError(res.message);
      }
    });
  return {
    open,
    pending,
    error,
    show: () => {
      setError(null);
      setOpen(true);
    },
    close: () => setOpen(false),
    run,
  };
}

/** Full course → "انضم لقائمة الانتظار" (join_waitlist RPC). */
export function WaitlistButton({ courseId, programSlug, dates }: { courseId: string; programSlug: string; dates: string }) {
  const a = useConfirmedAction();
  return (
    <>
      <Button variant="outline" size="m" className="w-full sm:w-auto sm:min-w-[120px]" onClick={a.show}>
        انضم لقائمة الانتظار
      </Button>
      <Modal
        open={a.open}
        onClose={a.close}
        title="الانضمام لقائمة الانتظار"
        footer={
          <>
            <Button size="s" loading={a.pending} onClick={() => a.run(() => joinWaitlist(courseId, programSlug))}>
              انضم للقائمة
            </Button>
            <Button size="s" variant="outline" onClick={a.close} disabled={a.pending}>
              تراجع
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          {a.error && <Alert tone="error" title={a.error} />}
          <p>
            اكتملت مقاعد دورة {dates}. عند شغور مقعد نُرسل لك دعوة، ولك مهلة محددة لقبولها قبل انتقالها للتالي في الترتيب. لن يُخصم أي مبلغ الآن.
          </p>
        </div>
      </Modal>
    </>
  );
}

/** Empty program (111:2553) → "نبّهني عند فتح دورة": follows the program's provider/trainer (follows table). */
export function NotifyButton({ programSlug, targetName, following }: { programSlug: string; targetName: string; following: boolean }) {
  const a = useConfirmedAction();
  if (following) {
    return (
      <Button variant="secondary" disabled icon={<Glyph icon={BellRing} size={20} />}>
        التنبيه مفعّل
      </Button>
    );
  }
  return (
    <>
      <Button onClick={a.show} icon={<Glyph icon={Bell} size={20} />}>
        نبّهني عند فتح دورة
      </Button>
      <Modal
        open={a.open}
        onClose={a.close}
        title="تفعيل التنبيه"
        footer={
          <>
            <Button size="s" loading={a.pending} onClick={() => a.run(() => followProgramOwner(programSlug))}>
              فعّل التنبيه
            </Button>
            <Button size="s" variant="outline" onClick={a.close} disabled={a.pending}>
              تراجع
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          {a.error && <Alert tone="error" title={a.error} />}
          <p>ستتابع «{targetName}» وتصلك إشعارات عند فتح دورات جديدة لهذا البرنامج. يمكنك إلغاء المتابعة في أي وقت من صفحة «المتابعات».</p>
        </div>
      </Modal>
    </>
  );
}
