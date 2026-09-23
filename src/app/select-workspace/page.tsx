import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LayoutGrid } from "lucide-react";
import { AuthCenteredLayout } from "@/components/auth/AuthLayouts";
import { homePathFor, requireUser } from "@/lib/auth";
import { AVAILABLE_WORKSPACES } from "@/lib/workspaces";
import { WorkspaceForm } from "./WorkspaceForm";

export const metadata: Metadata = { title: "اختيار نوع المساحة", robots: { index: false } };

/** PUB-CTX-01 · اختيار نوع المساحة الأولى */
export default async function SelectWorkspacePage() {
  const user = await requireUser("/select-workspace");
  if (user.workspaces.length > 0) redirect(homePathFor(user));
  return (
    <AuthCenteredLayout
      wide
      icon={LayoutGrid}
      title="كيف تريد استخدام المنصة؟"
      subtitle="اختر نوع مساحتك الأولى. يمكنك إضافة مساحات أخرى لاحقًا من «إدارة سياقاتي» — حتى أربع مساحات في آنٍ واحد."
    >
      <WorkspaceForm available={AVAILABLE_WORKSPACES} />
    </AuthCenteredLayout>
  );
}
