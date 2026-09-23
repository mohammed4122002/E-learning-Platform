"use client";

import { PageBody } from "@/components/layout/TopBar";
import { Alert } from "@/components/ui/Feedback";
import { Button } from "@/components/ui/Button";

export default function CheckoutError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <PageBody className="gap-4">
      <Alert tone="error" title="تعذّر تحميل صفحة التسجيل">
        لم يُخصم أي مبلغ بسبب هذا الخطأ. أعد المحاولة، وإن تكرر تواصل مع الدعم.
      </Alert>
      <Button onClick={reset} className="self-start">
        إعادة المحاولة
      </Button>
    </PageBody>
  );
}
