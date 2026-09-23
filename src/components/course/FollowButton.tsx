"use client";

import { useState, useTransition } from "react";
import { Check, Plus } from "lucide-react";
import { Button, type ButtonSize, type ButtonType } from "@/components/ui/Button";
import { Glyph } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { setFollow, type FollowTarget } from "@/lib/actions/follows";

const NOUN: Record<FollowTarget, string> = { trainer: "المدرب", organization: "الجهة", category: "التخصص" };
const EFFECT: Record<FollowTarget, string> = {
  trainer: "لن تصلك تنبيهات عند تقديمه دورات جديدة.",
  organization: "لن تصلك تنبيهات عند نشرها برامج جديدة أو فتح دورات.",
  category: "لن تظهر برامجه في «مقترحة لك» ولن تصلك تنبيهات بالجديد فيه.",
};

/**
 * Reusable «تابِع / إلغاء المتابعة» (TRN-FLW-01). Following is instant; unfollowing asks for confirmation (BR-U2).
 * `mode="unfollow"` renders only the text «إلغاء» button used in the المتابعات list.
 */
export function FollowButton({
  target,
  targetId,
  targetName,
  initialFollowing,
  mode = "toggle",
  size = "s",
  variant,
  className,
}: {
  target: FollowTarget;
  targetId: string;
  targetName: string;
  initialFollowing: boolean;
  mode?: "toggle" | "unfollow";
  size?: ButtonSize;
  variant?: ButtonType;
  className?: string;
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [confirm, setConfirm] = useState(false);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  const apply = (next: boolean) => {
    setFollowing(next);
    startTransition(async () => {
      const res = await setFollow(target, targetId, next);
      if (!res.ok) {
        setFollowing(!next);
        toast("error", res.message);
      } else {
        toast("success", next ? `تتابع الآن «${targetName}» — ستصلك تنبيهات بالجديد.` : `ألغيت متابعة «${targetName}».`);
      }
      setConfirm(false);
    });
  };

  const trigger =
    mode === "unfollow" ? (
      <Button size={size} variant={variant ?? "ghost"} loading={pending} onClick={() => setConfirm(true)} className={className} aria-label={`إلغاء متابعة ${targetName}`}>
        إلغاء
      </Button>
    ) : following ? (
      <Button
        size={size}
        variant={variant ?? "secondary"}
        loading={pending}
        onClick={() => setConfirm(true)}
        aria-pressed
        icon={<Glyph icon={Check} size={16} />}
        className={className}
      >
        تتابعه
      </Button>
    ) : (
      <Button size={size} variant={variant ?? "outline"} loading={pending} onClick={() => apply(true)} aria-pressed={false} icon={<Glyph icon={Plus} size={16} />} className={className}>
        تابِع
      </Button>
    );

  return (
    <>
      {trigger}
      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        size="s"
        title={`إلغاء متابعة ${NOUN[target]}؟`}
        footer={
          <>
            <Button size="s" variant="danger" loading={pending} onClick={() => apply(false)}>
              إلغاء المتابعة
            </Button>
            <Button size="s" variant="outline" onClick={() => setConfirm(false)}>
              تراجع
            </Button>
          </>
        }
      >
        ستتوقف عن متابعة «{targetName}». {EFFECT[target]} يمكنك المتابعة مجددًا في أي وقت.
      </Modal>
    </>
  );
}
