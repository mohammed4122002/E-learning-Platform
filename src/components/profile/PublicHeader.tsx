import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { Glyph } from "@/components/ui/Icon";

/** Minimal brand bar for public pages outside the workspace (/u/[id], /verify). */
export function PublicHeader({ children }: { children?: React.ReactNode }) {
  return (
    <header className="border-b border-border-divider bg-bg-surface">
      <div className="mx-auto flex h-[72px] w-full max-w-[1160px] items-center gap-3 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-3 rounded-12 focus-ring">
          <span className="flex size-11 items-center justify-center rounded-12 bg-action-primary text-text-on-brand">
            <Glyph icon={GraduationCap} size={20} />
          </span>
          <span className="type-title text-text-primary">بوابة التدريب</span>
        </Link>
        <div className="ms-auto flex items-center gap-3">{children}</div>
      </div>
    </header>
  );
}
