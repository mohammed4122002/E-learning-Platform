import Image from "next/image";

type IconProps = {
  src: string;
  /** 16 or 20 — the two icon sizes used in the design. */
  size: 16 | 20;
  className?: string;
};

/** Renders an SVG icon exported from Figma (decorative: labels carry the meaning). */
export function Icon({ src, size, className }: IconProps) {
  return <Image src={src} alt="" width={size} height={size} className={`shrink-0 ${className ?? ""}`} />;
}
