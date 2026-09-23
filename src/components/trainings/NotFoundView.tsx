import { SearchX } from "lucide-react";
import { PageBody, TopBar } from "@/components/layout/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Feedback";

/** not-found.tsx body for missing or foreign records (they are indistinguishable by design). */
export function NotFoundView({ title, heading, description, href, cta }: { title: string; heading: string; description: string; href: string; cta: string }) {
  return (
    <>
      <TopBar title={title} />
      <PageBody>
        <EmptyState icon={SearchX} title={heading} description={description} action={<ButtonLink href={href}>{cta}</ButtonLink>} />
      </PageBody>
    </>
  );
}
