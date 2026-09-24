"use client";

import Link from "next/link";
import { Ellipsis } from "lucide-react";
import { Glyph } from "@/components/ui/Icon";
import { useDisclosure } from "@/hooks/useDisclosure";

/** «⋯» of the roster rows (436:20169): 40px white square that opens a small list of links for that trainee. */
export function RowMenu({ label, items }: { label: string; items: { href: string; label: string }[] }) {
  const { open, toggle, setOpen, ref } = useDisclosure();
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={toggle}
        className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-8 bg-bg-surface text-text-primary focus-ring hover:bg-bg-brand-tint"
      >
        <Glyph icon={Ellipsis} size={20} />
      </button>
      {open && (
        <ul className="absolute end-0 top-[calc(100%+6px)] z-20 flex min-w-48 flex-col gap-1 rounded-12 border border-border-default bg-bg-surface p-1.5 shadow-float">
          {items.map((i) => (
            <li key={i.href}>
              <Link href={i.href} onClick={() => setOpen(false)} className="block rounded-8 px-3 py-2 type-small text-text-primary hover:bg-bg-brand-tint focus-ring">
                {i.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
