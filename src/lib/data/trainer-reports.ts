import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/*
 * TRR-RPT-01/02 · reports on the trainer's content. Read through my_content_reports() (security definer): it returns
 * only reports whose target the caller owns and never the reporter's identity.
 */

export type ContentReport = {
  id: string;
  number: number;
  createdAt: string;
  targetType: "course" | "program" | "trainer";
  targetId: string;
  targetTitle: string;
  reason: string;
  details: string | null;
  status: string;
  responseDueAt: string;
  responseAt: string | null;
  responseAdmitted: boolean;
  decision: null | {
    id: string;
    outcome: "upheld" | "partially_upheld" | "dismissed";
    summary: string;
    violationRecorded: boolean;
    decidedAt: string;
    appealDeadline: string;
    acceptedAt: string | null;
  };
  appeal: null | { id: string; status: "pending" | "upheld" | "rejected"; submittedAt: string; decidedAt: string | null; note: string | null };
};

export const getContentReports = cache(async (): Promise<ContentReport[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_content_reports");
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    number: r.report_number,
    createdAt: r.created_at,
    targetType: r.target_type as ContentReport["targetType"],
    targetId: r.target_id,
    targetTitle: r.target_title ?? "",
    reason: r.reason,
    details: r.details,
    status: r.status,
    responseDueAt: r.response_due_at,
    responseAt: r.response_at,
    responseAdmitted: Boolean(r.response_admitted),
    decision: r.decision_id
      ? {
          id: r.decision_id,
          outcome: r.outcome as NonNullable<ContentReport["decision"]>["outcome"],
          summary: r.decision_summary ?? "",
          violationRecorded: Boolean(r.violation_recorded),
          decidedAt: r.decided_at!,
          appealDeadline: r.appeal_deadline!,
          acceptedAt: r.decision_accepted_at,
        }
      : null,
    appeal: r.appeal_id
      ? { id: r.appeal_id, status: r.appeal_status as NonNullable<ContentReport["appeal"]>["status"], submittedAt: r.appeal_submitted_at!, decidedAt: r.appeal_decided_at, note: r.appeal_note }
      : null,
  }));
});
