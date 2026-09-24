import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/*
 * TRR-AFL-01/02/03 · affiliations between the trainer and provider organizations.
 * Rows are read under RLS (trainer_id = auth.uid()); counts the trainer cannot see (other trainers of the org,
 * sales of the trainer's org courses) come from security-definer read models.
 */

export type AffiliationTerms = {
  commissionPercent: number;
  scopeLabel: string;
  exclusive: boolean;
  termMonths: number;
  renewable: boolean;
  noticeDays: number;
  executionScope: string | null;
};

export type OrgFacts = {
  id: string;
  name: string;
  city: string | null;
  verified: boolean;
  rating: number | null;
  ratingCount: number;
  affiliatedTrainers: number;
};

export type Invitation = AffiliationTerms & {
  id: string;
  status: "pending" | "accepted" | "declined" | "expired" | "withdrawn";
  expiresAt: string;
  createdAt: string;
  message: string | null;
  org: OrgFacts;
};

export type Affiliation = AffiliationTerms & {
  id: string;
  status: "active" | "ending" | "ended";
  startedAt: string;
  endRequestedAt: string | null;
  endEffectiveAt: string | null;
  endedAt: string | null;
  endedByParty: "trainer" | "organization" | null;
  org: OrgFacts;
  runningCourses: number;
  trainees: number;
  revenue: number;
};

type TermsRow = {
  commission_percent: number;
  scope_label: string;
  exclusive: boolean;
  term_months: number;
  renewable: boolean;
  notice_days: number;
  execution_scope: string | null;
};

const termsOf = (r: TermsRow): AffiliationTerms => ({
  commissionPercent: Number(r.commission_percent),
  scopeLabel: r.scope_label,
  exclusive: r.exclusive,
  termMonths: r.term_months,
  renewable: r.renewable,
  noticeDays: r.notice_days,
  executionScope: r.execution_scope,
});

type OrgRow = { id: string; name: string; city: string | null; verification_status: string } | null;

async function orgFacts(org: OrgRow): Promise<OrgFacts> {
  const supabase = await createClient();
  const base = { id: org?.id ?? "", name: org?.name ?? "جهة تدريبية", city: org?.city ?? null, verified: org?.verification_status === "verified" };
  if (!org) return { ...base, rating: null, ratingCount: 0, affiliatedTrainers: 0 };
  const { data } = await supabase.rpc("organization_public_stats", { p_org: org.id });
  const s = data?.[0];
  return { ...base, rating: s?.rating === null || s?.rating === undefined ? null : Number(s.rating), ratingCount: s?.rating_count ?? 0, affiliatedTrainers: s?.affiliated_trainers ?? 0 };
}

const ORG = "organization:organizations!inner(id, name, city, verification_status)";

/** Everything AFL-01 needs: pending invitations, live and ended affiliations. */
export const getTrainerAffiliations = cache(async (trainerId: string) => {
  const supabase = await createClient();
  // Expire invitations / finish notice periods before reading (also done by pg_cron every 15 minutes).
  await supabase.rpc("affiliations_housekeeping");
  const [inv, aff, stats] = await Promise.all([
    supabase
      .from("affiliation_invitations")
      .select(`id, status, expires_at, created_at, message, commission_percent, scope_label, exclusive, term_months, renewable, notice_days, execution_scope, ${ORG}`)
      .eq("trainer_id", trainerId)
      .eq("status", "pending")
      .order("expires_at", { ascending: true }),
    supabase
      .from("trainer_affiliations")
      .select(
        `id, status, started_at, end_requested_at, end_effective_at, ended_at, ended_by_party, commission_percent, scope_label, exclusive, term_months, renewable, notice_days, execution_scope, ${ORG}`,
      )
      .eq("trainer_id", trainerId)
      .order("started_at", { ascending: true }),
    supabase.rpc("my_affiliation_stats"),
  ]);
  if (inv.error) throw inv.error;
  if (aff.error) throw aff.error;
  if (stats.error) throw stats.error;
  const byId = new Map((stats.data ?? []).map((s) => [s.affiliation_id, s]));

  const invitations: Invitation[] = await Promise.all(
    (inv.data ?? []).map(async (r) => ({
      ...termsOf(r),
      id: r.id,
      status: r.status as Invitation["status"],
      expiresAt: r.expires_at,
      createdAt: r.created_at,
      message: r.message,
      org: await orgFacts(r.organization),
    })),
  );
  const affiliations: Affiliation[] = await Promise.all(
    (aff.data ?? []).map(async (r) => {
      const s = byId.get(r.id);
      return {
        ...termsOf(r),
        id: r.id,
        status: r.status as Affiliation["status"],
        startedAt: r.started_at,
        endRequestedAt: r.end_requested_at,
        endEffectiveAt: r.end_effective_at,
        endedAt: r.ended_at,
        endedByParty: r.ended_by_party as Affiliation["endedByParty"],
        org: await orgFacts(r.organization),
        runningCourses: s?.running_courses ?? 0,
        trainees: s?.trainees ?? 0,
        revenue: Number(s?.revenue ?? 0),
      };
    }),
  );
  return {
    invitations,
    live: affiliations.filter((a) => a.status !== "ended"),
    active: affiliations.filter((a) => a.status === "active"),
    all: affiliations,
  };
});

/** AFL-02 · one invitation of the trainer (any status, so a decided invitation can explain itself). */
export async function getInvitation(id: string, trainerId: string): Promise<Invitation | null> {
  const supabase = await createClient();
  await supabase.rpc("affiliations_housekeeping");
  const { data, error } = await supabase
    .from("affiliation_invitations")
    .select(`id, status, expires_at, created_at, message, commission_percent, scope_label, exclusive, term_months, renewable, notice_days, execution_scope, ${ORG}`)
    .eq("id", id)
    .eq("trainer_id", trainerId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    ...termsOf(data),
    id: data.id,
    status: data.status as Invitation["status"],
    expiresAt: data.expires_at,
    createdAt: data.created_at,
    message: data.message,
    org: await orgFacts(data.organization),
  };
}

/** AFL-03 · one affiliation of the trainer with its course stats. */
export async function getAffiliation(id: string, trainerId: string): Promise<Affiliation | null> {
  const { all } = await getTrainerAffiliations(trainerId);
  return all.find((a) => a.id === id) ?? null;
}
