"use client";

import { useEffect } from "react";
import { CircleX } from "lucide-react";
import { TopBar, PageBody } from "@/components/layout/TopBar";
import { EmptyState } from "@/components/ui/Feedback";
import { Button, ButtonLink } from "@/components/ui/Button";

/** Shared error boundary body for the discovery routes: Arabic message, retry, and a way back to discovery. */
export function RouteError({ error, retry, title, subtitle }: { error: Error & { digest?: string }; retry: () => void; title: string; subtitle: string }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <>
      <TopBar title={title} subtitle={subtitle} />
      <PageBody>
        <EmptyState
          icon={CircleX}
          tone="error"
          title="تعذّر تحميل الصفحة"
          description="حدث خطأ أثناء جلب البيانات. تحقّق من اتصالك ثم أعد المحاولة، وإن تكرر تواصل مع الدعم."
          action={
            <>
              <Button onClick={() => retry()}>أعد المحاولة</Button>
              <ButtonLink href="/trainee/discover" variant="outline">
                العودة إلى الاكتشاف
              </ButtonLink>
            </>
          }
        />
      </PageBody>
    </>
  );
}
