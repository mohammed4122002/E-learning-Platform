import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CircleAlert } from "lucide-react";
import { PageBody, TopBar } from "@/components/layout/TopBar";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Feedback";
import { requireTrainer } from "@/lib/auth";
import { toArabicError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "إنشاء العقد" };

/**
 * /trainer/contracts/new?source=bid&id=<bidId> — «أكمل التعاقد» of an accepted bid: creates the contract from the
 * agreed terms (start_bid_contract, idempotent) and opens it for review (TRR-CTR-01).
 */
export default async function NewContractPage({ searchParams }: PageProps<"/trainer/contracts/new">) {
  const sp = await searchParams;
  const source = typeof sp.source === "string" ? sp.source : "";
  const bidId = typeof sp.id === "string" ? sp.id : "";
  await requireTrainer(`/trainer/contracts/new?source=${encodeURIComponent(source)}&id=${encodeURIComponent(bidId)}`);
  let message = toArabicError({ code: "not_found" });
  if (source === "bid" && /^[0-9a-f-]{36}$/i.test(bidId)) {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("start_bid_contract", { p_bid: bidId });
    if (!error && data) redirect(`/trainer/contracts/${data}`);
    message = toArabicError(error);
  }
  return (
    <>
      <TopBar title="إنشاء العقد" subtitle="من عرض مقبول" />
      <PageBody>
        <EmptyState
          tone="error"
          icon={CircleAlert}
          title="تعذّر إنشاء العقد"
          description={message}
          action={
            <ButtonLink href="/trainer/bids" variant="outline">
              العودة إلى عروضي
            </ButtonLink>
          }
        />
      </PageBody>
    </>
  );
}
