import type { ReactNode } from "react";
import { PageBody, TopBar } from "@/components/layout/TopBar";
import { ContractBody } from "@/components/trainer-contracts/ContractBody";
import { Breadcrumb } from "@/components/ui/Navigation";
import type { ContractView } from "@/lib/data/trainer-contracts";

/** Page frame of TRR-CTR-01/02/03: top bar + breadcrumb (bid: 4265:2 «تصفّح الفرص › عروضي › التفاوض»), the state panel, the body. */
export function ContractFrame({ c, children }: { c: ContractView; children: ReactNode }) {
  const bid = c.sourceType === "bid";
  return (
    <>
      <TopBar title={bid ? "التفاوض على الشروط" : "عقد الارتباط"} subtitle={bid ? "اتُّفق على الشروط" : c.orgName} />
      <PageBody className="!gap-[26px] !pb-[60px]">
        <Breadcrumb
          items={
            bid
              ? [{ label: "تصفّح الفرص", href: "/trainer/opportunities" }, { label: "عروضي", href: "/trainer/bids" }, { label: "التفاوض" }]
              : [{ label: "ملفي المهني", href: "/trainer/profile" }, { label: "الارتباطات", href: "/trainer/affiliations" }, { label: "العقد" }]
          }
        />
        {children}
        <ContractBody c={c} />
      </PageBody>
    </>
  );
}
