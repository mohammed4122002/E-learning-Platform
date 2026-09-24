import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { BellRing, CircleAlert, Info, Lock, Users } from "lucide-react";
import { CourseFiles, InheritedMaterials } from "@/components/trainer-courses/course/CourseFilesBoard";
import { Glyph } from "@/components/ui/Icon";
import { requireTrainer } from "@/lib/auth";
import { getCourseFiles, inheritedMaterials } from "@/lib/data/trainer-course-page";
import { getCourseHeader } from "@/lib/data/trainer-courses";

export const metadata: Metadata = { title: "ملفات الدورة", description: "مواد البرنامج الموروثة ومواد هذه الدورة" };

const WHO: { icon: LucideIcon; text: string; tone: string }[] = [
  { icon: Users, text: "المسجّلون في هذه الدورة فقط", tone: "text-state-success" },
  { icon: Lock, text: "لا تظهر لمتدربي دوراتك الأخرى", tone: "text-state-success" },
  { icon: BellRing, text: "يصلهم إشعار عند نشر ملف جديد", tone: "text-text-brand" },
  { icon: CircleAlert, text: "المسودة لا يراها أحد حتى تنشرها", tone: "text-state-warning" },
];

/** TRR-CRS-05 · صفحة الدورة · ٣ الملفات (335:12950). */
export default async function CourseFilesPage({ params }: PageProps<"/trainer/courses/[id]/files">) {
  const { id } = await params;
  await requireTrainer(`/trainer/courses/${id}/files`);
  const course = await getCourseHeader(id);
  if (!course) notFound();
  const files = await getCourseFiles(id);
  const units = inheritedMaterials(course.snapshot);

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <p className="flex items-start gap-3 rounded-16 bg-state-info-bg px-[18px] pt-4 pb-[18px] type-body-lg text-state-info">
          <Glyph icon={Info} size={20} className="mt-1" />
          <span className="flex-1">مواد البرنامج موحّدة في كل دوراتك منه. ما تضيفه هنا مواد خاصة بهذه الدورة فقط — مثل حالة عملية لجهة معيّنة أو ملف تصحيح.</span>
        </p>
        <InheritedMaterials courseId={id} units={units} />
        <CourseFiles courseId={id} files={files} canPublish />
      </div>
      <aside className="flex w-full shrink-0 flex-col gap-5 lg:w-[400px]">
        <section className="flex flex-col gap-[18px] rounded-22 border border-border-default bg-bg-card p-5 shadow-card sm:p-[26px]">
          <h2 className="type-h2 text-text-primary">من يرى الملفات؟</h2>
          {WHO.map((w) => (
            <p key={w.text} className="flex items-center gap-3 rounded-12 bg-bg-page px-3.5 py-[13px] type-body text-text-primary">
              <Glyph icon={w.icon} size={20} className={w.tone} />
              <span className="flex-1">{w.text}</span>
            </p>
          ))}
        </section>
      </aside>
    </div>
  );
}
