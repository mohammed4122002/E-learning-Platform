import type { Metadata } from "next";
import { BasicsForm } from "@/components/trainer-programs/BasicsForm";
import { EditorFrame } from "@/components/trainer-programs/EditorFrame";
import { requireTrainer } from "@/lib/auth";
import { listCategories } from "@/lib/data/trainer-programs";

export const metadata: Metadata = { title: "برنامج جديد" };

/** TRR-PRG-02 · ١ الأساسيات والغلاف for a program that does not exist yet (351:13808). */
export default async function NewProgramPage() {
  const user = await requireTrainer("/trainer/programs/new");
  const categories = await listCategories();
  return (
    <EditorFrame program={null} step={1} subtitle="برنامج جديد · مسودة">
      <BasicsForm
        categories={categories}
        userId={user.id}
        trainerName={user.fullName || user.email}
        initial={{
          id: null,
          title: "",
          summary: "",
          categoryId: "",
          skills: [],
          level: "beginner",
          hours: "",
          language: "ar",
          prerequisites: "",
          coverPath: "",
          price: null,
          updatedAt: null,
        }}
      />
    </EditorFrame>
  );
}
