import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { Glyph } from "@/components/ui/Icon";
import { getCurrentUser, homePathFor } from "@/lib/auth";

/** Public help center frame (linked from the auth screens' «الدعم الفني») — no workspace sidebar. */
export default async function PublicHelpLayout({ children }: LayoutProps<"/help">) {
  const user = await getCurrentUser();
  return (
    <div className="flex min-h-dvh flex-col bg-bg-surface">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:start-2 focus:z-50 focus:rounded-12 focus:bg-bg-surface focus:p-3">
        تخطَّ إلى المحتوى
      </a>
      <header className="sticky top-0 z-20 flex h-[76px] w-full items-center gap-3 border-b border-border-divider bg-bg-surface px-4 sm:px-8">
        <Link href={user ? homePathFor(user) : "/login"} className="flex items-center gap-3 rounded-12 focus-ring">
          <span className="flex size-11 items-center justify-center rounded-12 bg-action-primary text-text-on-brand">
            <Glyph icon={GraduationCap} size={20} />
          </span>
          <span className="flex flex-col">
            <span className="type-title text-text-primary">بوابة التدريب</span>
            <span className="type-caption text-text-muted">مركز المساعدة</span>
          </span>
        </Link>
        <div className="flex-1" />
        {user ? (
          <ButtonLink href="/trainee/help" variant="secondary" size="s">
            مساحتي
          </ButtonLink>
        ) : (
          <>
            <ButtonLink href="/login?next=/trainee/help" variant="ghost" size="s" className="hidden sm:inline-flex">
              تسجيل الدخول
            </ButtonLink>
            <ButtonLink href="/register" size="s">
              إنشاء حساب
            </ButtonLink>
          </>
        )}
      </header>
      <main id="main" tabIndex={-1} className="mx-auto flex w-full max-w-[1160px] flex-1 flex-col gap-6 px-4 pt-8 pb-14 outline-none sm:px-6 lg:px-12">
        {children}
      </main>
    </div>
  );
}
