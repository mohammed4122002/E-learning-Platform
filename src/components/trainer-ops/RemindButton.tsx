"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { remindAssignment } from "@/lib/actions/trainer-ops";

/** «ذكّرها» (444:22796): notifies a trainee who has not submitted the assignment yet. */
export function RemindButton({ courseId, assignmentId, traineeId, name, disabled }: { courseId: string; assignmentId: string; traineeId: string; name: string; disabled?: boolean }) {
  const [pending, start] = useTransition();
  const toast = useToast();
  return (
    <Button
      variant="outline"
      size="m"
      fullWidth
      className="bg-bg-surface"
      loading={pending}
      disabled={disabled || pending}
      aria-label={`ذكّر ${name} بالتسليم`}
      onClick={() =>
        start(async () => {
          const res = await remindAssignment(courseId, assignmentId, traineeId);
          toast(res.ok ? "success" : "error", res.ok ? `أُرسل تذكير إلى ${name}.` : res.message);
        })
      }
    >
      ذكّرها
    </Button>
  );
}
