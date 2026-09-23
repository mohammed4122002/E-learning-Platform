"use server";

import { getCurrentUser } from "@/lib/auth";
import { getSuggestions, type Suggestion } from "@/lib/data/discover";
import { toArabicError } from "@/lib/errors";
import { suggestSchema } from "@/lib/validation/discover";

export type SuggestResult = { status: "success"; items: Suggestion[] } | { status: "error"; message: string };

/** Nav / Search Overlay typeahead (read-only). */
export async function searchSuggestions(q: string): Promise<SuggestResult> {
  const parsed = suggestSchema.safeParse(q);
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? toArabicError({ code: "invalid_input" }) };
  if (!(await getCurrentUser())) return { status: "error", message: toArabicError({ code: "not_authenticated" }) };
  try {
    return { status: "success", items: await getSuggestions(parsed.data) };
  } catch {
    return { status: "error", message: toArabicError({ code: "network" }) };
  }
}
