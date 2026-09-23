import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Lock } from "lucide-react";
import { TopBar, PageBody } from "@/components/layout/TopBar";
import { Breadcrumb } from "@/components/ui/Navigation";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Feedback";
import { QuizRunner } from "@/components/learning/QuizRunner";
import { QuizResult } from "@/components/learning/QuizResult";
import { requireTrainee } from "@/lib/auth";
import { getAttemptReview, getQuizPage } from "@/lib/data/learning";
import { countPendingAssignments } from "@/lib/data/assignments";
import { pluralAr } from "@/lib/format";
import { moduleLabel } from "@/lib/learning";

export async function generateMetadata(props: PageProps<"/trainee/learn/quiz/[quizId]">): Promise<Metadata> {
  const { quizId } = await props.params;
  const user = await requireTrainee();
  const page = await getQuizPage(user.id, quizId);
  return { title: page ? page.quiz.title : "الاختبار" };
}

/** TRN-LRN-04 · الاختبار — Figma 191:10076 (جارية) · 191:10306 (نتيجة ناجحة) + failing result. */
export default async function QuizPage(props: PageProps<"/trainee/learn/quiz/[quizId]">) {
  const { quizId } = await props.params;
  const search = await props.searchParams;
  const user = await requireTrainee(`/trainee/learn/quiz/${quizId}`);
  const page = await getQuizPage(user.id, quizId);
  if (!page) notFound();

  const attemptParam = typeof search.attempt === "string" ? search.attempt : null;
  const retake = search.retake === "1";
  const crumbs = [
    { label: "ملف التدريب", href: "/trainee/trainings" },
    { label: page.courseTitle, href: `/trainee/learn/${page.enrollmentId}` },
    { label: page.quiz.title },
  ];
  const subtitle = page.module ? `${moduleLabel(page.module.position)} — ${page.module.title}` : page.courseTitle;

  // Which attempt to show: the requested one, else the latest (unless the trainee chose to retake).
  const shownIdx = attemptParam ? page.attempts.findIndex((a) => a.id === attemptParam) : retake && !page.passed && page.attemptsLeft > 0 ? -1 : 0;
  if (attemptParam && shownIdx === -1) notFound();
  const shown = page.attempts[shownIdx] ?? null;

  if (shown) {
    const [review, pendingAssignments] = await Promise.all([getAttemptReview(shown.id), countPendingAssignments(user.id, page.quiz.courseId)]);
    return (
      <>
        <TopBar title="نتيجة الاختبار" subtitle={subtitle} />
        <PageBody className="gap-[26px]">
          <Breadcrumb items={crumbs} />
          <QuizResult page={page} attempt={shown} attemptNo={page.attempts.length - shownIdx} review={review} pendingAssignments={pendingAssignments} />
        </PageBody>
      </>
    );
  }

  return (
    <>
      <TopBar title={page.quiz.title} subtitle={subtitle} />
      <PageBody className="gap-[26px]">
        <Breadcrumb items={crumbs} />
        {page.quiz.questions.length === 0 ? (
          <EmptyState icon={Lock} title="لم تُضف أسئلة هذا الاختبار بعد" description="سيصلك إشعار حين ينشره المدرب." />
        ) : page.lockedBy.length > 0 ? (
          <EmptyState
            icon={Lock}
            title="الاختبار مقفل حتى تُنهي دروس المحور"
            description={`تبقّى ${pluralAr(page.lockedBy.length, ["درس واحد", "درسان", "دروس", "درسًا"])}: ${page.lockedBy.map((l) => `«${l.title}»`).join("، ")}.`}
            action={<ButtonLink href={page.lockedBy[0].href}>تابع الدروس</ButtonLink>}
          />
        ) : (
          <QuizRunner
            quizId={page.quiz.id}
            title={page.quiz.title}
            passPercent={page.quiz.passPercent}
            timeLimitMinutes={page.quiz.timeLimitMinutes}
            attemptNo={page.attempts.length + 1}
            maxAttempts={page.quiz.maxAttempts}
            questions={page.quiz.questions}
          />
        )}
      </PageBody>
    </>
  );
}
