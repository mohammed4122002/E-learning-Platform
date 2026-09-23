import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Payment gateway abstraction. Card data never reaches this server: a real gateway tokenises the card in the
 * browser (hosted fields / redirect) and confirms the payment through its webhook, which calls the
 * service-role-only RPC `settle_payment`.
 *
 * PAYMENT_PROVIDER:
 *  - "sandbox" (default in development): settles through the RPC `sandbox_settle_payment`, which the database
 *    refuses unless app_settings.payments_sandbox = true. Test card 4000 0000 0000 0002 simulates a decline.
 *  - any real gateway: not configured yet — see OPEN_QUESTIONS.md.
 */
export type PaymentOutcome = { ok: true } | { ok: false; code: string };

export async function processPayment(
  supabase: SupabaseClient<Database>,
  input: { paymentId: string; simulateDecline: boolean },
): Promise<PaymentOutcome> {
  const provider = process.env.PAYMENT_PROVIDER ?? "sandbox";
  if (provider !== "sandbox") return { ok: false, code: "payments_unavailable" };
  const { data, error } = await supabase.rpc("sandbox_settle_payment", { p_payment: input.paymentId, p_succeeded: !input.simulateDecline });
  if (error) return { ok: false, code: error.message };
  return data === "succeeded" ? { ok: true } : { ok: false, code: "card_declined" };
}
