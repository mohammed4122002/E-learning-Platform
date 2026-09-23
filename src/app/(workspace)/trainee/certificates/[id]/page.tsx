import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { TopBar, PageBody } from "@/components/layout/TopBar";
import { IssuedCertificateView, PendingCertificateView } from "@/components/certificates/DetailViews";
import { requireTrainee } from "@/lib/auth";
import { getCertificateDetail } from "@/lib/data/certificates";

export async function generateMetadata({ params }: PageProps<"/trainee/certificates/[id]">): Promise<Metadata> {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return { title: "الشهادة غير موجودة" };
  const user = await requireTrainee(`/trainee/certificates/${id}`);
  const detail = await getCertificateDetail(user.id, id, user.fullName);
  if (!detail) return { title: "الشهادة غير موجودة" };
  const title = detail.kind === "pending" ? detail.pending.courseTitle : detail.certificate.courseTitle;
  return { title: `معاينة الشهادة — ${title}` };
}

/**
 * TRN-CRT-02 · معاينة الشهادة — Figma 205:11511 (متاحة للتنزيل) · 205:11723 (بانتظار استيفاء شرط) ·
 * 409:16323 (مسجّلة رسمياً — recorded course pending) · 4136:1405 (مسحوبة).
 * `id` is a certificate id; for a certificate that is not issued yet it is the trainee's enrollment id.
 */
export default async function CertificateDetailPage({ params }: PageProps<"/trainee/certificates/[id]">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const user = await requireTrainee(`/trainee/certificates/${id}`);
  const detail = await getCertificateDetail(user.id, id, user.fullName || user.email);
  if (!detail) notFound();

  const subtitle = detail.kind === "issued" ? "متاحة للتنزيل" : detail.kind === "revoked" ? "مسحوبة" : "بانتظار استيفاء الشروط";
  return (
    <>
      <TopBar title="معاينة الشهادة" subtitle={subtitle} />
      <PageBody className="gap-6">{detail.kind === "pending" ? <PendingCertificateView detail={detail} /> : <IssuedCertificateView detail={detail} />}</PageBody>
    </>
  );
}
