import type { Metadata } from "next";
import { BadgeCheck } from "lucide-react";
import { Glyph } from "@/components/ui/Icon";
import { Alert } from "@/components/ui/Feedback";
import { safeNext } from "@/lib/auth";
import { formatNumericDate } from "@/lib/format";
import { TERMS_EFFECTIVE, TERMS_VERSION } from "./content";
import { TermsBody } from "./TermsBody";

export const metadata: Metadata = {
  title: "الشروط والأحكام",
  description: "شروط استخدام منصة بوابة التدريب وسياسة الخصوصية.",
  alternates: { canonical: "/terms" },
};

/** GEN-TRM-01 · عرض الشروط والموافقة (92:259). Public; #privacy anchors the privacy clause. */
export default async function TermsPage({ searchParams }: PageProps<"/terms">) {
  const sp = await searchParams;
  const next = safeNext(typeof sp.next === "string" ? sp.next : null, "");
  return (
    <main id="main" className="min-h-dvh bg-bg-page px-4 pt-12 pb-16 sm:pt-[62px]">
      <div className="mx-auto flex w-full max-w-[820px] flex-col items-center gap-6">
        <span className="flex size-16 items-center justify-center rounded-16 bg-action-primary text-text-on-brand shadow-hero">
          <Glyph icon={BadgeCheck} size={32} />
        </span>
        <div className="flex flex-col items-center gap-3 text-center">
          <h1 className="text-[34px] font-bold leading-[1.2] text-text-primary sm:text-[40px]">الشروط والأحكام</h1>
          <p className="type-body text-text-secondary">اقرأ الشروط قبل المتابعة. موافقتك تُسجَّل برقم النسخة والختم الزمني.</p>
        </div>
        {sp.error === "agree" && (
          <Alert tone="error" title="الموافقة مطلوبة">
            ضع علامة على «قرأت الشروط والأحكام» قبل المتابعة.
          </Alert>
        )}
        <article className="w-full overflow-hidden rounded-22 border border-border-default bg-bg-surface shadow-float">
          <header className="flex flex-wrap items-center justify-between gap-3 bg-bg-page px-5 py-6 sm:px-8">
            <p className="type-h4 text-text-primary">شروط استخدام منصة بوابة التدريب</p>
            <div className="flex flex-col gap-0.5 text-end">
              <span dir="ltr" className="type-caption text-text-brand">
                v {TERMS_VERSION}
              </span>
              <span className="type-caption text-text-muted">سارية منذ {formatNumericDate(TERMS_EFFECTIVE)}</span>
            </div>
          </header>
          <TermsBody next={next} />
        </article>
      </div>
    </main>
  );
}
