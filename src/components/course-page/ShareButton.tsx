"use client";

import { Share2 } from "lucide-react";
import { Glyph } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";

/** "شارك الدورة": native share sheet where available, otherwise copies the link. */
export function ShareButton({ title, url }: { title: string; url: string }) {
  const toast = useToast();
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          if (navigator.share) await navigator.share({ title, url });
          else {
            await navigator.clipboard.writeText(url);
            toast("success", "نُسخ رابط الدورة");
          }
        } catch {
          /* dismissed */
        }
      }}
      className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-12 type-button text-text-brand hover:bg-bg-brand-tint focus-ring"
    >
      <Glyph icon={Share2} size={20} />
      شارك الدورة
    </button>
  );
}
