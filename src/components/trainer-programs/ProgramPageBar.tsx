import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { CopyLinkButton } from "@/components/trainer-programs/CopyLinkButton";
import { ButtonLink } from "@/components/ui/Button";
import { Glyph } from "@/components/ui/Icon";

/** Slim bar of the program page preview (447:23369 / 450:23832): brand block + «حرّر البرنامج» + «اخرج من المعاينة». */
export function ProgramPageBar({ editHref, editLabel = "حرّر البرنامج", editDisabled, hideEdit, shareUrl, exitHref = "/trainer/programs" }: { editHref: string; editLabel?: string; editDisabled?: boolean; hideEdit?: boolean; shareUrl?: string; exitHref?: string }) {
  return (
    <header className="flex w-full flex-wrap items-center gap-3 border-b border-border-divider bg-bg-surface px-4 py-5 sm:gap-5 sm:px-14">
      <Link href="/trainer" className="flex items-center gap-3 rounded-12 focus-ring">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-12 bg-action-primary text-text-on-brand">
          <Glyph icon={GraduationCap} size={20} />
        </span>
        <span className="flex flex-col gap-px">
          <span className="type-subtitle text-text-primary">بوابة التدريب</span>
          <span className="type-caption text-text-muted">صفحة برنامج</span>
        </span>
      </Link>
      <span className="flex-1" />
      {shareUrl && (
        <div className="max-sm:hidden">
          <CopyLinkButton url={shareUrl} label="شارك الرابط" compact />
        </div>
      )}
      {!hideEdit && (
        <ButtonLink href={editHref} variant="outline" size="s" disabled={editDisabled}>
          {editLabel}
        </ButtonLink>
      )}
      <ButtonLink href={exitHref} size="s">
        اخرج من المعاينة
      </ButtonLink>
    </header>
  );
}
