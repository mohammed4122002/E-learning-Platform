import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicProfile } from "@/components/profile/PublicProfile";
import { PublicHeader } from "@/components/profile/PublicHeader";
import { getPublicProfile } from "@/lib/data/profile";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({ params }: PageProps<"/u/[id]">): Promise<Metadata> {
  const { id } = await params;
  const profile = await getPublicProfile(id);
  if (!profile) return { title: "ملف غير متاح", robots: { index: false } };
  const description = profile.headline ?? `الملف المهني لـ ${profile.fullName} على بوابة التدريب`;
  return {
    title: profile.fullName,
    description,
    alternates: { canonical: `/u/${profile.id}` },
    robots: profile.isPublic ? undefined : { index: false },
    openGraph: {
      type: "profile",
      title: `${profile.fullName} · بوابة التدريب`,
      description,
      url: `${env.siteUrl}/u/${profile.id}`,
      images: profile.avatarUrl ? [{ url: profile.avatarUrl, width: 512, height: 512, alt: profile.fullName }] : undefined,
    },
  };
}

/** TRN-PRF-01 · الملف العام (242:15479) — public, respects profiles.is_public and the owner's privacy flags. */
export default async function PublicProfilePage({ params }: PageProps<"/u/[id]">) {
  const { id } = await params;
  const profile = await getPublicProfile(id);
  if (!profile) notFound();
  // Feeds the trainer sidebar card's view count (one per visitor per day; the owner is not counted).
  await (await createClient()).rpc("record_profile_view", { p_profile: profile.id });
  return (
    <div className="min-h-dvh bg-bg-page">
      <PublicHeader>
        <Link href="/verify" className="rounded-8 type-subtitle text-text-brand hover:underline focus-ring">
          تحقّق من شهادة
        </Link>
      </PublicHeader>
      <main id="main" className="mx-auto flex w-full max-w-[1160px] flex-col gap-6 px-4 pt-8 pb-14 sm:px-6">
        {!profile.isPublic && (
          <p role="status" className="rounded-12 bg-state-warning-bg px-4 py-3 type-small text-state-warning">
            ملفك خاص — تراه أنت فقط. فعّل المشاركة من إعدادات الخصوصية ليصل إليه غيرك.
          </p>
        )}
        <PublicProfile profile={profile} headingLevel="h1" />
      </main>
    </div>
  );
}
