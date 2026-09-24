"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui/Field";

/** URL-driven sort dropdown (Figma «Form / Select · Dropdown», 240px). */
export function SortSelect({
  value,
  param = "sort",
  options = [
    { value: "soonest", label: "الأقرب موعدًا" },
    { value: "newest", label: "الأحدث إنشاءً" },
    { value: "title", label: "حسب الاسم" },
  ],
  label = "ترتيب الدورات",
}: {
  value: string;
  param?: string;
  options?: { value: string; label: string }[];
  label?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  return (
    <div className="w-full sm:w-[240px]">
      <label className="sr-only" htmlFor={`sort-${param}`}>
        {label}
      </label>
      <Select
        id={`sort-${param}`}
        value={value}
        options={options}
        onChange={(e) => {
          const next = new URLSearchParams(params.toString());
          next.set(param, e.target.value);
          next.delete("page");
          router.replace(`${pathname}?${next.toString()}`, { scroll: false });
        }}
      />
    </div>
  );
}
