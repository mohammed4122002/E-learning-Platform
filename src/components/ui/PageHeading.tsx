import type { ReactNode } from "react";

/** Page heading block used across TRN screens: Type/H1 (36 Bold, 1.2) + Type/Body Large text/secondary, gap 6. */
export function PageHeading({ title, description, id }: { title: ReactNode; description?: ReactNode; id?: string }) {
  return (
    <div className="flex w-full flex-col gap-1.5">
      <h2 id={id} className="text-[28px] leading-[1.2] font-bold text-text-primary sm:text-[36px]">
        {title}
      </h2>
      {description && <p className="type-body-lg text-text-secondary">{description}</p>}
    </div>
  );
}

/** Card with a Type/H3 title (Figma section cards: surface, 1px border/default, r16, p24, gap16, card shadow). */
export function SectionCard({
  title,
  titleId,
  aside,
  children,
  className,
  as: Tag = "section",
}: {
  title?: ReactNode;
  titleId?: string;
  aside?: ReactNode;
  children?: ReactNode;
  className?: string;
  as?: "section" | "div" | "aside";
}) {
  return (
    <Tag
      aria-labelledby={title && titleId ? titleId : undefined}
      className={`flex w-full min-w-0 flex-col gap-4 rounded-16 border border-border-default bg-bg-card p-5 shadow-card sm:p-6 ${className ?? ""}`}
    >
      {(title || aside) && (
        <div className="flex w-full items-center gap-3">
          {title && (
            <h3 id={titleId} className="min-w-0 flex-1 type-h3 text-text-primary">
              {title}
            </h3>
          )}
          {aside}
        </div>
      )}
      {children}
    </Tag>
  );
}
