import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { Glyph } from "@/components/ui/Icon";
import { getCurrentUser, homePathFor } from "@/lib/auth";

/** TRN-CRS-06 PUBLIC BAR: brand block + sign-in (or back to the workspace for signed-in users). */
export async function PublicBar({ subtitle }: { subtitle: string }) {
  const user = await getCurrentUser();
  return (
    <header className="flex w-full items-center gap-5 border-b border-border-divider bg-bg-surface px-4 py-5 sm:px-12">
      <Link href={user ? homePathFor(user) : "/login"} className="flex items-center gap-3 rounded-12 focus-ring">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-12 bg-action-primary text-text-on-brand">
          <Glyph icon={GraduationCap} size={20} />
        </span>
        <span className="flex flex-col gap-px">
          <span className="type-subtitle text-text-primary">بوابة التدريب</span>
          <span className="type-caption text-text-muted">{subtitle}</span>
        </span>
      </Link>
      <span className="flex-1" />
      {user ? (
        <ButtonLink href={homePathFor(user)} variant="outline">
          مساحتي
        </ButtonLink>
      ) : (
        <ButtonLink href="/login" variant="outline">
          تسجيل الدخول
        </ButtonLink>
      )}
    </header>
  );
}
