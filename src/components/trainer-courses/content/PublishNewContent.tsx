"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Choice";
import { useToast } from "@/components/ui/Toast";
import { pluralAr, toArabicDigits } from "@/lib/format";
import { publishNewContent } from "@/app/(trainer)/trainer/courses/actions";

/** TRR-CRS-08 «النشر» card: acknowledge the recalculation, then release the draft lessons (BR-L10). */
export function PublishNewContentCard({ courseId, lessonIds, affected }: { courseId: string; lessonIds: string[]; affected: number }) {
  const [ack, setAck] = useState(affected === 0);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();
  return (
    <section className="flex flex-col gap-5 rounded-22 border border-border-default bg-bg-card p-5 shadow-card sm:p-7">
      <h2 className="type-h3 text-text-primary">النشر</h2>
      {affected > 0 && (
        <Checkbox checked={ack} onChange={(e) => setAck(e.target.checked)}>
          أفهم أن نسب {pluralAr(affected, ["متدرب واحد", "متدربَين", "متدربين", "متدربًا"])} ستُعاد
        </Checkbox>
      )}
      <Button
        size="l"
        fullWidth
        disabled={!ack || lessonIds.length === 0}
        loading={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            const res = await publishNewContent(courseId, lessonIds, ack);
            if (!res.ok) return setError(res.error);
            toast("success", `نُشر المحتوى الجديد وأُبلغ ${toArabicDigits(res.data?.count ?? 0)} مشتريًا.`);
            router.push(`/trainer/courses/${courseId}/content`);
            router.refresh();
          })
        }
      >
        انشر المحتوى الجديد
      </Button>
      <ButtonLink href={`/trainer/courses/${courseId}/content`} size="l" variant="outline" fullWidth>
        احفظ كمسودة
      </ButtonLink>
      <p className="type-caption text-text-muted">المسودة لا يراها المشترون ولا تؤثّر على نسبهم.</p>
      {error && (
        <p role="alert" className="type-caption text-state-error">
          {error}
        </p>
      )}
    </section>
  );
}
