import type { Metadata } from "next";
import { VerifyForm } from "@/components/verify/VerifyForm";

export const metadata: Metadata = {
  title: "التحقق من صحة شهادة",
  description: "تحقّق من أي شهادة صادرة عن بوابة التدريب برقمها المرجعي — دون تسجيل دخول.",
  alternates: { canonical: "/verify" },
  openGraph: { title: "التحقق من صحة شهادة · بوابة التدريب", description: "أدخل رقم الشهادة للتأكد من صدورها عبر بوابة التدريب.", url: "/verify" },
};

/** PUB-VRF-01 · التحقق العام من الشهادة — Default (4139:1586). */
export default async function VerifyPage({ searchParams }: PageProps<"/verify">) {
  const sp = await searchParams;
  return <VerifyForm initial={typeof sp.code === "string" ? sp.code.slice(0, 40) : ""} />;
}
