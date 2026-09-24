import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LayoutGrid } from "lucide-react";
import { AuthCenteredLayout } from "@/components/auth/AuthLayouts";
import { homePathFor, requireUser } from "@/lib/auth";
import { AVAILABLE_WORKSPACES } from "@/lib/workspaces";
import { WorkspaceForm } from "./WorkspaceForm";

export const metadata: Metadata = { title: "اختيار نوع المساحة", robots: { index: false } };

/** PUB-CTX-01 · اختيار نوع المساحة الأولى */
export default async function SelectWorkspacePage(props: PageProps<"/select-workspace">) {
  const sp = await props.searchParams;
  const user = await requireUser("/select-workspace");
  // `?add=1` reuses this screen to add another workspace (up to four); existing ones are not offered again.
  const adding = sp.add === "1";
  if (user.workspaces.length > 0 && !adding) redirect(homePathFor(user));
  const existing = new Set(user.workspaces.map((w) => w.kind as string));
  const available = AVAILABLE_WORKSPACES.filter((k) => !existing.has(k));
  return (
    <AuthCenteredLayout
      wide
      icon={LayoutGrid}
      title="كيف تريد استخدام المنصة؟"
      subtitle="اختر نوع مساحتك الأولى. يمكنك إضافة مساحات أخرى لاحقًا من «إدارة سياقاتي» — حتى أربع مساحات في آنٍ واحد."
    >
      <WorkspaceForm available={available} />
    </AuthCenteredLayout>
  );
}
