import Image from "next/image";
import type { LucideIcon } from "lucide-react";

/*
 * The Figma icon library ("Icon / …", DS page) is Lucide. Geometry is identical; the stroke width follows
 * the Figma variables Icon/Stroke 16 = 1.25, 20 = 1.4, 24 = 1.5, 32 = 1.75 (absolute, i.e. in px).
 */
const STROKE = { 16: 1.25, 20: 1.4, 24: 1.5, 32: 1.75 } as const;

type GlyphProps = {
  icon: LucideIcon;
  size?: keyof typeof STROKE;
  className?: string;
  /** Pass a label only when the icon is the sole content of its control. */
  label?: string;
};

/** Monochrome icon coloured with currentColor — set the colour with a text-* token class. */
export function Glyph({ icon: LucideGlyph, size = 20, className, label }: GlyphProps) {
  return (
    <LucideGlyph
      size={size}
      strokeWidth={STROKE[size]}
      absoluteStrokeWidth
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
      className={`shrink-0 ${className ?? ""}`}
    />
  );
}

type IconProps = {
  src: string;
  /** 16 or 20 — the two icon sizes used in the design. */
  size: 16 | 20;
  className?: string;
};

/** Renders a multi-colour SVG exported from Figma (decorative: labels carry the meaning). */
export function Icon({ src, size, className }: IconProps) {
  return <Image src={src} alt="" width={size} height={size} className={`shrink-0 ${className ?? ""}`} />;
}
