import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type WorkspaceKind = Database["public"]["Enums"]["workspace_kind"];

export type CurrentUser = {
  id: string;
  email: string;
  fullName: string;
  avatarPath: string | null;
  identityStatus: Database["public"]["Enums"]["review_status"] | null;
  workspaces: { kind: WorkspaceKind; organizationId: string | null; isDefault: boolean }[];
};

/** The signed-in user (validated JWT) with profile and workspaces, or null. Cached per request. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (!claims?.sub) return null;

  const [{ data: profile }, { data: workspaces }] = await Promise.all([
    supabase.from("profiles").select("full_name, avatar_path, identity_status").eq("id", claims.sub).maybeSingle(),
    supabase.from("user_workspaces").select("kind, organization_id, is_default").eq("user_id", claims.sub),
  ]);

  return {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : "",
    fullName: profile?.full_name ?? "",
    avatarPath: profile?.avatar_path ?? null,
    identityStatus: profile?.identity_status ?? null,
    workspaces: (workspaces ?? []).map((w) => ({
      kind: w.kind,
      organizationId: w.organization_id,
      isDefault: w.is_default,
    })),
  };
});

/** Use at the top of protected pages; the proxy already redirects, this is the authoritative check. */
export async function requireUser(next?: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  return user;
}

/** Requires the trainee workspace; users without one pick a workspace first (PUB-CTX-01). */
export async function requireTrainee(next?: string): Promise<CurrentUser> {
  const user = await requireUser(next);
  if (!user.workspaces.some((w) => w.kind === "trainee")) redirect("/select-workspace");
  return user;
}

export async function requireTrainer(next?: string): Promise<CurrentUser> {
  const user = await requireUser(next);
  if (!user.workspaces.some((w) => w.kind === "trainer")) redirect("/select-workspace");
  return user;
}

/** Last workspace area the user visited (set by proxy.ts), used by the shared screens' shell. */
export const WORKSPACE_COOKIE = "tg-ws";

/** Path of the home page of the user's default workspace. */
export function homePathFor(user: CurrentUser): string {
  const ws = user.workspaces.find((w) => w.isDefault) ?? user.workspaces[0];
  if (!ws) return "/select-workspace";
  if (ws.kind === "trainee") return "/trainee";
  if (ws.kind === "trainer") return "/trainer";
  // Other workspaces ship in later waves (see IMPLEMENTATION_PLAN.md).
  return `/workspace/${ws.kind}`;
}

/** Only allow same-origin relative redirects. */
export function safeNext(next: FormDataEntryValue | string | null | undefined, fallback = "/"): string {
  const value = typeof next === "string" ? next : "";
  return value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\") ? value : fallback;
}
