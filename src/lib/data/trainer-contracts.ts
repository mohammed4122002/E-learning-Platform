import "server-only";
import { createClient } from "@/lib/supabase/server";

/*
 * TRR-CTR-01/02/03 · trainer contracts. The terms of a version are an immutable JSON document (see DATABASE.md
 * «Contract terms»): either formatted strings (affiliation contracts written by the organization) or raw values
 * (price numbers, ISO dates) produced by start_bid_contract. `normalizeTerms` turns both into display rows.
 */

export type ContractStatus = "draft" | "sent" | "signed_by_trainer" | "active" | "terminated" | "expired";

export type TermValue = string | number | (string | null)[] | null;
export type RawTermItem = { key?: string; label: string; negotiable: boolean; original?: TermValue; agreed?: TermValue; note?: string };
export type HistoryEntry = { actor: "trainer" | "organization"; kind?: "proposal" | "counter" | "accept"; text: string; at: string };

export type ContractTerms = {
  scope?: string;
  value?: number | null;
  value_label?: string;
  original_value?: number | null;
  currency?: string;
  duration?: string;
  days?: number | null;
  hours?: number | null;
  dates?: string;
  starts_on?: string | null;
  ends_on?: string | null;
  terms_source?: string;
  negotiation_log?: string;
  platform_commission_percent?: number;
  hero?: { badge?: string; summary?: string } | null;
  items?: RawTermItem[];
  history?: HistoryEntry[];
};

export type Signature = { party: "trainer" | "organization"; typedName: string; signedAt: string; documentHash: string };

export type ContractView = {
  id: string;
  number: string;
  status: ContractStatus;
  title: string;
  sourceType: "affiliation" | "bid";
  sourceId: string;
  sourceRef: string | null;
  orgId: string;
  orgName: string;
  trainerName: string;
  version: number;
  documentHash: string;
  terms: ContractTerms;
  signDeadline: string | null;
  sentAt: string | null;
  trainerSignedAt: string | null;
  activatedAt: string | null;
  terminatedAt: string | null;
  terminationReason: string | null;
  expiredAt: string | null;
  signatures: Signature[];
};

export async function getContract(id: string, trainerId: string): Promise<ContractView | null> {
  const supabase = await createClient();
  await supabase.rpc("contracts_housekeeping");
  const { data: c, error } = await supabase
    .from("trainer_contracts")
    .select(
      "id, number, status, title, source_type, source_id, source_ref, current_version, sign_deadline, sent_at, trainer_signed_at, activated_at, terminated_at, termination_reason, expired_at, organization:organizations!inner(id, name)",
    )
    .eq("id", id)
    .eq("trainer_id", trainerId)
    .neq("status", "draft")
    .maybeSingle();
  if (error) throw error;
  if (!c) return null;
  const [v, sigs, me] = await Promise.all([
    supabase.from("trainer_contract_versions").select("version, terms, document_hash").eq("contract_id", c.id).eq("version", c.current_version).maybeSingle(),
    supabase.from("trainer_contract_signatures").select("party, typed_name, signed_at, document_hash, version_id").eq("contract_id", c.id).order("signed_at"),
    supabase.from("profiles").select("full_name").eq("id", trainerId).maybeSingle(),
  ]);
  if (v.error) throw v.error;
  if (!v.data) return null;
  return {
    id: c.id,
    number: c.number,
    status: c.status as ContractStatus,
    title: c.title,
    sourceType: c.source_type as ContractView["sourceType"],
    sourceId: c.source_id,
    sourceRef: c.source_ref,
    orgId: c.organization.id,
    orgName: c.organization.name,
    trainerName: me.data?.full_name ?? "",
    version: v.data.version,
    documentHash: v.data.document_hash,
    terms: (v.data.terms ?? {}) as ContractTerms,
    signDeadline: c.sign_deadline,
    sentAt: c.sent_at,
    trainerSignedAt: c.trainer_signed_at,
    activatedAt: c.activated_at,
    terminatedAt: c.terminated_at,
    terminationReason: c.termination_reason,
    expiredAt: c.expired_at,
    signatures: (sigs.data ?? []).map((s) => ({ party: s.party as Signature["party"], typedName: s.typed_name, signedAt: s.signed_at, documentHash: s.document_hash })),
  };
}
