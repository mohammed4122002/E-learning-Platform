import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { toBidTerms, type BidStatus, type BidTerms, type NegotiationStatus, type TermChanges } from "@/lib/trainer-bids";

/*
 * TRR-BID-01…05 read models. Everything is read as the signed-in trainer through security-definer read functions
 * (trainer_opportunities, trainer_bids, trainer_bid_stats, bid_negotiation_history) that only ever return the
 * caller's own data; the match score and competitor counts are computed in the database.
 */

export type Opportunity = {
  id: string;
  organizationName: string;
  title: string;
  summary: string;
  field: string;
  audience: string | null;
  seats: number;
  mode: "in_person" | "live_remote";
  city: string | null;
  venue: string | null;
  venueArea: string | null;
  startsOn: string;
  endsOn: string;
  days: number;
  hoursPerDay: number | null;
  budgetMin: number;
  budgetMax: number;
  bidsCloseAt: string;
  status: string;
  publishedAt: string | null;
  score: number;
  scoreSpecialty: number;
  scoreRating: number;
  scoreAvailability: number;
  scoreLocation: number;
  conflict: { kind: string; title: string; from: string; to: string } | null;
  myBidId: string | null;
  myBidStatus: BidStatus | null;
  otherBids: number;
};

type OppRow = {
  id: string;
  organization_name: string;
  title: string;
  summary: string;
  field: string;
  audience: string | null;
  seats: number;
  mode: string;
  city: string | null;
  venue: string | null;
  venue_area: string | null;
  starts_on: string;
  ends_on: string;
  days: number;
  hours_per_day: number | null;
  budget_min: number;
  budget_max: number;
  bids_close_at: string;
  status: string;
  published_at: string | null;
  score: number;
  score_specialty: number;
  score_rating: number;
  score_availability: number;
  score_location: number;
  conflict_kind: string | null;
  conflict_title: string | null;
  conflict_from: string | null;
  conflict_to: string | null;
  my_bid_id: string | null;
  my_bid_status: string | null;
  other_bids: number;
};

function toOpportunity(r: OppRow): Opportunity {
  return {
    id: r.id,
    organizationName: r.organization_name,
    title: r.title,
    summary: r.summary,
    field: r.field,
    audience: r.audience,
    seats: r.seats,
    mode: r.mode === "live_remote" ? "live_remote" : "in_person",
    city: r.city,
    venue: r.venue,
    venueArea: r.venue_area,
    startsOn: r.starts_on,
    endsOn: r.ends_on,
    days: r.days,
    hoursPerDay: r.hours_per_day === null ? null : Number(r.hours_per_day),
    budgetMin: Number(r.budget_min),
    budgetMax: Number(r.budget_max),
    bidsCloseAt: r.bids_close_at,
    status: r.status,
    publishedAt: r.published_at,
    score: r.score,
    scoreSpecialty: r.score_specialty,
    scoreRating: r.score_rating,
    scoreAvailability: r.score_availability,
    scoreLocation: r.score_location,
    conflict:
      r.conflict_kind && r.conflict_from && r.conflict_to
        ? { kind: r.conflict_kind, title: r.conflict_title ?? "", from: r.conflict_from, to: r.conflict_to }
        : null,
    myBidId: r.my_bid_id,
    myBidStatus: (r.my_bid_status as BidStatus | null) ?? null,
    otherBids: r.other_bids,
  };
}

/** Open requests with the caller's match score, newest deadline data first (TRR-BID-01, dashboard). */
export const listOpportunities = cache(async (): Promise<Opportunity[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("trainer_opportunities");
  if (error) throw new Error(error.message);
  return ((data ?? []) as OppRow[]).map(toOpportunity);
});

/** One request the caller may bid on (open) or has bid on (TRR-BID-02). */
export const getOpportunity = cache(async (id: string): Promise<Opportunity | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("trainer_opportunities", { p_request: id });
  if (error) throw new Error(error.message);
  const row = ((data ?? []) as OppRow[])[0];
  return row ? toOpportunity(row) : null;
});

export type TrainerBid = {
  id: string;
  reference: string;
  requestId: string;
  requestTitle: string;
  organizationName: string;
  status: BidStatus;
  programId: string | null;
  programTitle: string | null;
  price: number | null;
  hours: number | null;
  days: number | null;
  startsOn: string | null;
  endsOn: string | null;
  message: string | null;
  attachmentName: string | null;
  submittedAt: string | null;
  decidedAt: string | null;
  decisionReason: string | null;
  decisionComment: string | null;
  decisionNotes: { tone: "success" | "warning"; title: string; body: string }[];
  withdrawnAt: string | null;
  withdrawReason: string | null;
  withdrawnAfterAccept: boolean;
  contractDueAt: string | null;
  contractPaused: boolean;
  contractedAt: string | null;
  original: BidTerms;
  terms: BidTerms;
  agreed: boolean;
  budgetMin: number;
  budgetMax: number;
  requestDays: number;
  requestStartsOn: string;
  requestEndsOn: string;
  bidsCloseAt: string;
  otherBids: number;
  negotiationStatus: NegotiationStatus | null;
  updatedAt: string;
};

type BidRow = {
  id: string;
  reference: string;
  request_id: string;
  request_title: string;
  organization_name: string;
  status: string;
  program_id: string | null;
  program_title: string | null;
  price: number | null;
  hours: number | null;
  days: number | null;
  starts_on: string | null;
  ends_on: string | null;
  payment_terms: string | null;
  message: string | null;
  attachment_name: string | null;
  submitted_at: string | null;
  decided_at: string | null;
  decision_reason: string | null;
  decision_comment: string | null;
  decision_notes: unknown;
  withdrawn_at: string | null;
  withdraw_reason: string | null;
  withdrawn_after_accept: boolean;
  contract_due_at: string | null;
  contract_paused_at: string | null;
  contracted_at: string | null;
  agreed_terms: unknown;
  effective_terms: unknown;
  budget_min: number;
  budget_max: number;
  request_days: number;
  request_starts_on: string;
  request_ends_on: string;
  bids_close_at: string;
  other_bids: number;
  negotiation_status: string | null;
  updated_at: string;
};

function toBid(r: BidRow): TrainerBid {
  const notes = Array.isArray(r.decision_notes) ? (r.decision_notes as TrainerBid["decisionNotes"]) : [];
  return {
    id: r.id,
    reference: r.reference,
    requestId: r.request_id,
    requestTitle: r.request_title,
    organizationName: r.organization_name,
    status: r.status as BidStatus,
    programId: r.program_id,
    programTitle: r.program_title,
    price: r.price === null ? null : Number(r.price),
    hours: r.hours === null ? null : Number(r.hours),
    days: r.days,
    startsOn: r.starts_on,
    endsOn: r.ends_on,
    message: r.message,
    attachmentName: r.attachment_name,
    submittedAt: r.submitted_at,
    decidedAt: r.decided_at,
    decisionReason: r.decision_reason,
    decisionComment: r.decision_comment,
    decisionNotes: notes.filter((n) => n && typeof n.title === "string"),
    withdrawnAt: r.withdrawn_at,
    withdrawReason: r.withdraw_reason,
    withdrawnAfterAccept: r.withdrawn_after_accept,
    contractDueAt: r.contract_due_at,
    contractPaused: Boolean(r.contract_paused_at),
    contractedAt: r.contracted_at,
    original: toBidTerms({ price: r.price, days: r.days, hours: r.hours, starts_on: r.starts_on, ends_on: r.ends_on, payment_terms: r.payment_terms }),
    terms: toBidTerms(r.effective_terms),
    agreed: Boolean(r.agreed_terms),
    budgetMin: Number(r.budget_min),
    budgetMax: Number(r.budget_max),
    requestDays: r.request_days,
    requestStartsOn: r.request_starts_on,
    requestEndsOn: r.request_ends_on,
    bidsCloseAt: r.bids_close_at,
    otherBids: r.other_bids,
    negotiationStatus: (r.negotiation_status as NegotiationStatus | null) ?? null,
    updatedAt: r.updated_at,
  };
}

export const listTrainerBids = cache(async (): Promise<TrainerBid[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("trainer_bids");
  if (error) throw new Error(error.message);
  return ((data ?? []) as BidRow[]).map(toBid);
});

export const getTrainerBid = cache(async (id: string): Promise<TrainerBid | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("trainer_bids", { p_bid: id });
  if (error) throw new Error(error.message);
  const row = ((data ?? []) as BidRow[])[0];
  return row ? toBid(row) : null;
});

export type BidStats = {
  total: number;
  accepted: number;
  pending: number;
  rejected: number;
  platformTotal: number;
  platformAccepted: number;
  reasons: Record<string, number>;
};

export const getBidStats = cache(async (): Promise<BidStats> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("trainer_bid_stats");
  if (error) throw new Error(error.message);
  const s = (data ?? {}) as Record<string, unknown>;
  return {
    total: Number(s.total ?? 0),
    accepted: Number(s.accepted ?? 0),
    pending: Number(s.pending ?? 0),
    rejected: Number(s.rejected ?? 0),
    platformTotal: Number(s.platform_total ?? 0),
    platformAccepted: Number(s.platform_accepted ?? 0),
    reasons: (s.reasons ?? {}) as Record<string, number>,
  };
});

export type NegotiationRound = {
  round: number;
  baseTerms: BidTerms;
  proposal: TermChanges;
  message: string | null;
  sentAt: string;
  respondBy: string;
  response: "accepted" | "countered" | "rejected" | "expired" | "withdrawn" | null;
  counter: TermChanges | null;
  responseReason: string | null;
  respondedAt: string | null;
};

export type Negotiation = {
  id: string;
  status: NegotiationStatus;
  round: number;
  draftTerms: TermChanges;
  draftMessage: string | null;
  respondBy: string | null;
  outcomeAt: string | null;
  outcomeBy: "trainer" | "org" | "system" | null;
  outcomeReason: string | null;
  agreedTerms: BidTerms | null;
  createdAt: string;
  rounds: NegotiationRound[];
};

type NegRow = {
  negotiation_id: string;
  status: string;
  round: number;
  draft_terms: unknown;
  draft_message: string | null;
  respond_by: string | null;
  outcome_at: string | null;
  outcome_by: string | null;
  outcome_reason: string | null;
  agreed_terms: unknown;
  created_at: string;
  rounds: unknown;
};

/** All negotiations of a bid, oldest first (the page works on the latest one). */
export const getNegotiations = cache(async (bidId: string): Promise<Negotiation[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("bid_negotiation_history", { p_bid: bidId });
  if (error) throw new Error(error.message);
  return ((data ?? []) as NegRow[]).map((n) => ({
    id: n.negotiation_id,
    status: n.status as NegotiationStatus,
    round: n.round,
    draftTerms: (n.draft_terms ?? {}) as TermChanges,
    draftMessage: n.draft_message,
    respondBy: n.respond_by,
    outcomeAt: n.outcome_at,
    outcomeBy: (n.outcome_by as Negotiation["outcomeBy"]) ?? null,
    outcomeReason: n.outcome_reason,
    agreedTerms: n.agreed_terms ? toBidTerms(n.agreed_terms) : null,
    createdAt: n.created_at,
    rounds: ((n.rounds ?? []) as Record<string, unknown>[]).map((x) => ({
      round: Number(x.round),
      baseTerms: toBidTerms(x.base_terms),
      proposal: (x.proposal ?? {}) as TermChanges,
      message: (x.message as string | null) ?? null,
      sentAt: String(x.sent_at),
      respondBy: String(x.respond_by),
      response: (x.response as NegotiationRound["response"]) ?? null,
      counter: (x.counter as TermChanges | null) ?? null,
      responseReason: (x.response_reason as string | null) ?? null,
      respondedAt: (x.responded_at as string | null) ?? null,
    })),
  }));
});

/** The trainer's published programs (the only ones an offer can be built on). */
export const listPublishedPrograms = cache(async (userId: string): Promise<{ id: string; title: string }[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("programs")
    .select("id, title")
    .eq("owner_id", userId)
    .eq("status", "published")
    .order("published_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
});

/** Draft offer the trainer saved on this request, if any (owner-only RLS). */
export const getDraftBid = cache(async (requestId: string, userId: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("training_bids")
    .select("id, status, program_id, price, hours, message, attachment_name, attachment_path")
    .eq("request_id", requestId)
    .eq("trainer_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
});

export const getCommissionPercent = cache(async (): Promise<number> => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("platform_commission_percent");
  return Number(data ?? 10);
});
