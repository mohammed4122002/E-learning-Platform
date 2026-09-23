import { existsSync } from "node:fs";
import path from "node:path";

const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp"] as const;

/**
 * Resolves an extension-less public path (e.g. "/assets/images/continue-design")
 * to the file that exists on disk, or null when the asset has not been exported
 * from Figma yet (see scripts/fetch-figma-covers.mjs).
 */
export function resolvePublicImage(basePath: string): string | null {
  for (const ext of IMAGE_EXTENSIONS) {
    const candidate = `${basePath}.${ext}`;
    if (existsSync(path.join(process.cwd(), "public", candidate))) return candidate;
  }
  return null;
}
