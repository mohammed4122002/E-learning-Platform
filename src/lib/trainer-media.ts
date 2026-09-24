import { env } from "@/lib/env";

/** Public URL of a file in the `trainer-media` bucket (portfolio images, CV) — shown on the public profile. */
export function trainerMediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return `${env.supabaseUrl}/storage/v1/object/public/trainer-media/${path.split("/").map(encodeURIComponent).join("/")}`;
}
