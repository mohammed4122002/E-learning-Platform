"use client";

import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { VerifyAside, VerifyCard, VerifyLayout } from "@/components/verify/VerifyLayout";

/** PUB-VRF · تعذّر التحقق · Error (4139:2297). */
export default function VerifyError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <VerifyLayout aside={<VerifyAside title="خلل مؤقت" lines={["الخدمة غير متاحة حاليًا. حاول لاحقًا."]} />}>
      <VerifyCard labelledBy="ve-title">
        <h1 id="ve-title" className="text-[30px] font-bold leading-[1.25] text-state-error">
          تعذّر إتمام التحقق
        </h1>
        <p role="alert" className="type-small text-text-secondary">
          حدث خلل مؤقت أثناء التحقق. حاول مرة أخرى بعد قليل.
        </p>
        <Button size="l" fullWidth onClick={() => retry()}>
          أعد المحاولة
        </Button>
        <ButtonLink href="/trainee/help" variant="secondary" size="l" fullWidth>
          تواصل مع الدعم
        </ButtonLink>
      </VerifyCard>
    </VerifyLayout>
  );
}
