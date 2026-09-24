"use client";

import { useEffect } from "react";
import { CircleX } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Feedback";

export default function ProgramPageError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="flex flex-1 items-start px-4 pt-10 pb-14 sm:px-14">
      <EmptyState
        icon={CircleX}
        tone="error"
        title="تعذّر تحميل صفحة البرنامج"
        description="حدث خطأ أثناء جلب البيانات. تحقّق من اتصالك ثم أعد المحاولة، وإن تكرر تواصل مع الدعم."
        action={
          <>
            <Button onClick={() => retry()}>أعد المحاولة</Button>
            <ButtonLink href="/trainer/programs" variant="outline">
              العودة إلى برامجي
            </ButtonLink>
          </>
        }
      />
    </main>
  );
}
