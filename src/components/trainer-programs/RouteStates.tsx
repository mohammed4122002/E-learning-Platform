"use client";

import { useEffect } from "react";
import { CircleX } from "lucide-react";
import { PageBody, TopBar } from "@/components/layout/TopBar";
import { Button, ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Feedback";

/** error.tsx body for the TRR-PRG routes: Arabic message, retry and a way back to «برامجي». */
export function ProgramsRouteError({ error, retry, title = "برامجي" }: { error: Error & { digest?: string }; retry: () => void; title?: string }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <>
      <TopBar title={title} subtitle="تعذّر التحميل" />
      <PageBody>
        <EmptyState
          icon={CircleX}
          tone="error"
          title="تعذّر تحميل الصفحة"
          description="حدث خطأ أثناء جلب بيانات البرنامج. تحقّق من اتصالك ثم أعد المحاولة، وإن تكرر تواصل مع الدعم."
          action={
            <>
              <Button onClick={() => retry()}>أعد المحاولة</Button>
              <ButtonLink href="/trainer/programs" variant="outline">
                العودة إلى برامجي
              </ButtonLink>
            </>
          }
        />
      </PageBody>
    </>
  );
}
