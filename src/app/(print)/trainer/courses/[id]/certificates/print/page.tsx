import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Feedback";
import { PrintControls } from "@/components/certificates/PrintControls";
import { CertificateSheet, PRINT_CSS, type SheetData } from "@/components/certificates/CertificateSheet";
import { requireTrainer } from "@/lib/auth";
import { getCourseCertificatesForPrint, verifyUrlFor } from "@/lib/data/certificates";
import { getManagedCourse, isUuid } from "@/lib/data/trainer-course";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "تنزيل الشهادات", robots: { index: false, follow: false } };

/**
 * «نزّل الشهادات PDF» (463:34994, 4256:724) and «نزّل الشهادة PDF» (4254:703): every issued certificate of the course
 * (or one enrollment, or the program completion certificates) as A4 sheets, one per page, through the print dialog.
 */
export default async function TrainerCertificatesPrint(props: PageProps<"/trainer/courses/[id]/certificates/print">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  await requireTrainer(`/trainer/courses/${id}/certificates/print`);
  const course = await getManagedCourse(id);
  const program = sp.kind === "program";
  const enrollment = typeof sp.enrollment === "string" && isUuid(sp.enrollment) ? sp.enrollment : null;
  const back = program ? `/trainer/courses/${course.id}/certificates/program` : `/trainer/courses/${course.id}/certificates/issue${enrollment ? `/${enrollment}` : ""}`;

  let sheets: (SheetData & { key: string })[] = [];
  if (program) {
    const supabase = await createClient();
    const { data: row } = await supabase.from("courses").select("program_version_id").eq("id", course.id).maybeSingle();
    if (row?.program_version_id) {
      const { data } = await supabase
        .from("program_certificates")
        .select("id, code, trainee_name, program_title, issued_at, status")
        .eq("program_version_id", row.program_version_id)
        .eq("status", "issued")
        .order("trainee_name");
      sheets = (data ?? []).map((g) => ({
        key: g.id,
        kindLabel: "شهادة إتمام برنامج",
        courseTitle: g.program_title,
        organizationName: course.organizationName,
        traineeName: g.trainee_name,
        issuedAt: g.issued_at,
        hours: null,
        trainerName: null,
        code: g.code,
        verifyUrl: verifyUrlFor(g.code),
      }));
    }
  } else {
    const list = await getCourseCertificatesForPrint(course.id, enrollment ? [enrollment] : undefined);
    sheets = list.map((c) => ({
      key: c.id,
      kindLabel: c.kindLabel,
      courseTitle: c.courseTitle,
      organizationName: c.organizationName,
      traineeName: c.traineeName,
      issuedAt: c.issuedAt,
      hours: c.hours,
      trainerName: c.trainerName,
      code: c.code,
      verifyUrl: c.verifyUrl,
    }));
  }

  if (sheets.length === 0) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-xl items-center px-4">
        <EmptyState title="لا شهادات صادرة بعد" description="تظهر الشهادات هنا بعد إصدارها من صفحة إصدار الشهادات." action={<ButtonLink href={back}>عد إلى الشهادات</ButtonLink>} />
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh flex-col items-center gap-6 bg-bg-page px-4 py-8 print:block print:bg-white print:p-0">
      <style>{PRINT_CSS}</style>
      <PrintControls backHref={back} backLabel="عد إلى الشهادات" />
      {sheets.map(({ key, ...c }) => (
        <CertificateSheet key={key} c={c} />
      ))}
    </main>
  );
}
