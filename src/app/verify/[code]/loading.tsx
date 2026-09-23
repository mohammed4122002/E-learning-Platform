import { LoaderCircle } from "lucide-react";
import { Glyph } from "@/components/ui/Icon";
import { VerifyAside, VerifyCard, VerifyLayout } from "@/components/verify/VerifyLayout";

/** PUB-VRF · Loading (4139:1701). */
export default function Loading() {
  return (
    <VerifyLayout aside={<VerifyAside title="جارٍ التحقق" lines={["نتأكد الآن من صحة الرقم لدى سجل الشهادات."]} />}>
      <VerifyCard labelledBy="vl-title">
        <h1 id="vl-title" className="text-[30px] font-bold leading-[1.25] text-text-primary">
          التحقق من صحة شهادة
        </h1>
        <div role="status" aria-live="polite" className="flex flex-col gap-5">
          <div className="h-12 w-full animate-shimmer rounded-12 border-2 border-action-primary" />
          <div className="flex h-14 w-full items-center justify-center gap-2 rounded-12 bg-bg-disabled type-body-lg text-text-disabled">
            <Glyph icon={LoaderCircle} size={20} className="animate-[tg-spin_0.9s_linear_infinite]" />
            جارٍ التحقق...
          </div>
          <p className="type-caption text-text-muted">يرجى الانتظار</p>
        </div>
      </VerifyCard>
    </VerifyLayout>
  );
}
