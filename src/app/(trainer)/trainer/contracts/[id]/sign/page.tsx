import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ContractFrame } from "@/components/trainer-contracts/ContractFrame";
import { SignFlow } from "@/components/trainer-contracts/SignFlow";
import { requireTrainer } from "@/lib/auth";
import { getContract } from "@/lib/data/trainer-contracts";
import { valueText2 } from "@/lib/trainer-contracts";

export const metadata: Metadata = { title: "التوقيع الإلكتروني" };

/** TRR-CTR-02 · توقيع عقد المدرب إلكترونياً — signing 4265:479 · in progress 4265:859. */
export default async function SignContractPage({ params }: PageProps<"/trainer/contracts/[id]/sign">) {
  const { id } = await params;
  const user = await requireTrainer(`/trainer/contracts/${id}/sign`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const c = await getContract(id, user.id);
  if (!c) notFound();
  // Only a contract waiting for the trainer's signature can be signed; every other state is shown on the contract page.
  if (c.status !== "sent") redirect(`/trainer/contracts/${c.id}`);
  return (
    <ContractFrame c={c}>
      <SignFlow
        contractId={c.id}
        version={c.version}
        refLabel={c.sourceType === "bid" ? "رقم العرض" : "مرجع الارتباط"}
        sourceRef={c.sourceRef}
        valueText={valueText2(c.terms)}
        trainerName={c.trainerName}
        orgName={c.orgName}
        backHref={`/trainer/contracts/${c.id}`}
      />
    </ContractFrame>
  );
}
