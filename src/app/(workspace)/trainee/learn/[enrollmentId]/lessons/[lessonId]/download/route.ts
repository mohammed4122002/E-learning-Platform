import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getCourseContent, lessonMediaUrl } from "@/lib/data/learning";
import { createClient } from "@/lib/supabase/server";

/**
 * File lessons: redirect to a short-lived signed URL of the private lesson-media object and record the
 * lesson as opened (BR-L11 — non-video lessons complete when opened).
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/trainee/learn/[enrollmentId]/lessons/[lessonId]/download">) {
  const { enrollmentId, lessonId } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(`/trainee/learn/${enrollmentId}`)}`, request.url));
  const content = await getCourseContent(user.id, enrollmentId);
  const lesson = content?.lessons.find((l) => l.id === lessonId);
  if (!content || content.ended || !lesson || lesson.kind === "quiz") return new NextResponse("غير موجود", { status: 404 });
  const url = await lessonMediaUrl(lesson.id, { download: lesson.title });
  if (!url) return NextResponse.redirect(new URL(lesson.href, request.url));
  const supabase = await createClient();
  await supabase.rpc("record_lesson_progress", { p_lesson: lesson.id, p_position: 0 });
  return NextResponse.redirect(url);
}
