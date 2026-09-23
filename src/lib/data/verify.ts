import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type VerifiedCertificate = {
  code: string;
  status: "issued" | "revoked";
  traineeName: string;
  courseTitle: string;
  hours: number | null;
  issuedAt: string;
  revokedAt: string | null;
  issuer: string;
  trainerName: string | null;
};

/** PUB-VRF-02 · verify_certificate (granted to anon). Returns null when no certificate has this code. */
export const verifyCertificate = cache(async (code: string): Promise<VerifiedCertificate | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("verify_certificate", { p_code: code });
  if (error) throw new Error(`verify_failed:${error.code ?? ""}`);
  const row = data?.[0];
  if (!row) return null;
  return {
    code: row.code,
    status: row.status,
    traineeName: row.trainee_name,
    courseTitle: row.course_title,
    hours: row.hours,
    issuedAt: row.issued_at,
    revokedAt: row.revoked_at,
    issuer: row.issuer_name ?? "بوابة التدريب",
    trainerName: row.trainer_name,
  };
});
