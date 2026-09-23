import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChevronRight, VideoOff } from "lucide-react";
import { PublicBar } from "@/components/course-page/PublicBar";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Feedback";
import { Glyph } from "@/components/ui/Icon";
import { getCoursePage } from "@/lib/data/course-page";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(props: PageProps<"/courses/[slug]/preview">): Promise<Metadata> {
  const { slug } = await props.params;
  const course = await getCoursePage(slug);
  return { title: course ? `معاينة: ${course.title}` : "معاينة الدورة", robots: { index: false } };
}

/** Free preview lesson of a course ("شاهد درس المعاينة مجانًا"). Media is served through a short-lived signed URL. */
export default async function CoursePreviewPage(props: PageProps<"/courses/[slug]/preview">) {
  const { slug } = await props.params;
  const course = await getCoursePage(slug);
  if (!course || !course.previewLessonId) notFound();
  const supabase = await createClient();
  const { data: lesson } = await supabase.from("lessons").select("id, title, media_path, kind").eq("id", course.previewLessonId).maybeSingle();
  if (!lesson) notFound();
  const signed = lesson.media_path ? await supabase.storage.from("lesson-media").createSignedUrl(lesson.media_path, 60 * 30) : null;

  return (
    <div className="flex min-h-dvh flex-col bg-bg-page">
      <PublicBar subtitle="معاينة مجانية" />
      <main id="main" className="mx-auto flex w-full max-w-[960px] flex-col gap-6 px-4 py-8 sm:px-8">
        <ButtonLink href={`/courses/${course.slug}`} variant="text" size="s" icon={<Glyph icon={ChevronRight} size={16} />} className="self-start px-0">
          العودة إلى صفحة الدورة
        </ButtonLink>
        <div className="flex flex-col gap-1">
          <p className="type-caption text-text-muted">{course.title}</p>
          <h1 className="type-h2 text-text-primary">{lesson.title}</h1>
        </div>
        {signed?.data?.signedUrl ? (
          <video controls playsInline preload="metadata" src={signed.data.signedUrl} className="aspect-video w-full rounded-16 bg-black" />
        ) : (
          <EmptyState icon={VideoOff} title="لم تُرفع مادة هذا الدرس بعد" description="سيتاح درس المعاينة هنا فور رفع المدرب للفيديو. يمكنك الاطلاع على محتوى الدورة والتسجيل من صفحتها." />
        )}
        <ButtonLink href={`/courses/${course.slug}`} size="l" className="self-center">
          {course.price === 0 ? "سجّل مجانًا" : "سجّل في الدورة"}
        </ButtonLink>
      </main>
    </div>
  );
}
