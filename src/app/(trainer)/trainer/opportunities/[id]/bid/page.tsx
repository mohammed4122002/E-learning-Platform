import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PageBody, TopBar } from "@/components/layout/TopBar";
import { Breadcrumb } from "@/components/ui/Navigation";
import { BidForm } from "@/components/trainer-bids/BidForm";
import { RequestCard, RequestHero } from "@/components/trainer-bids/RequestParts";
import { requireTrainer } from "@/lib/auth";
import { getCommissionPercent, getDraftBid, getOpportunity, listPublishedPrograms } from "@/lib/data/trainer-bids";

export const metadata: Metadata = { title: "تقديم عرض", description: "قدّم عرضًا تدريبيًا على طلب جهة" };

const UUID = /^[0-9a-f-]{36}$/i;

function isOpenForBids(o: { status: string; bidsCloseAt: string }): boolean {
  return o.status === "open" && new Date(o.bidsCloseAt).getTime() > Date.now();
}

/** TRR-BID-02 · تقديم عرض تدريبي (303:9392). */
export default async function BidPage({ params }: PageProps<"/trainer/opportunities/[id]/bid">) {
  const { id } = await params;
  const user = await requireTrainer(`/trainer/opportunities/${id}/bid`);
  if (!UUID.test(id)) notFound();
  const opp = await getOpportunity(id);
  if (!opp) notFound();
  // A submitted offer cannot be edited here — it is followed from «عروضي».
  if (opp.myBidStatus && opp.myBidStatus !== "draft") redirect("/trainer/bids");
  if (!isOpenForBids(opp)) redirect("/trainer/opportunities");

  const [programs, draft, commission] = await Promise.all([listPublishedPrograms(user.id), getDraftBid(id, user.id), getCommissionPercent()]);

  return (
    <>
      <TopBar title="تقديم عرض" subtitle={opp.organizationName} />
      <PageBody className="gap-6">
        <Breadcrumb
          items={[
            { label: "تصفّح الفرص", href: "/trainer/opportunities" },
            { label: opp.organizationName, href: `/trainer/opportunities?q=${encodeURIComponent(opp.organizationName)}&f=all` },
            { label: "تقديم عرض" },
          ]}
        />
        <RequestHero o={opp} />
        <BidForm
          requestId={opp.id}
          requestCard={<RequestCard o={opp} />}
          programs={programs}
          draft={{
            programId: draft?.program_id ?? "",
            price: draft?.price != null ? String(Number(draft.price)) : "",
            hours: draft?.hours != null ? String(Number(draft.hours)) : "",
            message: draft?.message ?? "",
            attachmentPath: draft?.attachment_path ?? "",
            attachmentName: draft?.attachment_name ?? "",
          }}
          commissionPercent={commission}
          otherBids={opp.otherBids}
        />
      </PageBody>
    </>
  );
}
