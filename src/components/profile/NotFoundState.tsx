import type { LucideIcon } from "lucide-react";
import { SearchX } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Feedback";

/** Body of the `not-found.tsx` files in this area (missing or foreign records). */
export function NotFoundState({
  title,
  description,
  href,
  label,
  icon = SearchX,
}: {
  title: string;
  description: string;
  href: string;
  label: string;
  icon?: LucideIcon;
}) {
  return (
    <main id="main" className="flex flex-1 items-start justify-center px-4 pt-16 pb-14 sm:px-6 lg:px-12">
      <EmptyState icon={icon} title={title} description={description} action={<ButtonLink href={href}>{label}</ButtonLink>} className="max-w-xl" />
    </main>
  );
}
