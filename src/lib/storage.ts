import { env } from "@/lib/env";

/** Public URL of an object in a public bucket (avatars, course-covers). */
export function publicStorageUrl(bucket: "avatars" | "course-covers", path: string): string {
  return `${env.supabaseUrl}/storage/v1/object/public/${bucket}/${path.split("/").map(encodeURIComponent).join("/")}`;
}

/** Course covers may be bundled Figma exports ("/assets/…") or uploaded files in the course-covers bucket. */
export function coverUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return path.startsWith("/") ? path : publicStorageUrl("course-covers", path);
}

export function avatarUrl(path: string | null | undefined): string | null {
  return path ? publicStorageUrl("avatars", path) : null;
}
