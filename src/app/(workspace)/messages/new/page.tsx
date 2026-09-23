import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TopBar, PageBody } from "@/components/layout/TopBar";
import { Breadcrumb } from "@/components/ui/Navigation";
import { NewConversationForm } from "@/components/messages/NewConversationForm";
import { requireUser } from "@/lib/auth";
import { getCourseForMessage } from "@/lib/data/messages";

export const metadata: Metadata = { title: "محادثة جديدة", description: "راسل فريق الدورة" };

/** GEN-MSG-01 · محادثة جديدة من صفحة دورة (/messages/new?course=<slug>). */
export default async function NewConversationPage({ searchParams }: PageProps<"/messages/new">) {
  const sp = await searchParams;
  const slug = typeof sp.course === "string" ? sp.course : "";
  await requireUser(`/messages/new?course=${encodeURIComponent(slug)}`);
  const course = await getCourseForMessage(slug);
  if (!course) notFound();
  return (
    <>
      <TopBar title="المحادثات" subtitle="محادثة جديدة" />
      <PageBody className="max-w-3xl gap-6">
        <Breadcrumb items={[{ label: "المحادثات", href: "/messages" }, { label: "محادثة جديدة" }]} />
        <NewConversationForm course={course} />
      </PageBody>
    </>
  );
}
