import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { env } from "@/lib/env";
import { REMEMBER_COOKIE, sessionCookieOptions } from "@/lib/supabase/cookies";

/**
 * Per-request Supabase client for Server Components, Server Actions and Route Handlers.
 * It acts as the signed-in user, so every query is filtered by RLS.
 */
export async function createClient(options?: { remember?: boolean }) {
  const cookieStore = await cookies();
  const remember = options?.remember ?? cookieStore.get(REMEMBER_COOKIE)?.value !== "0";
  return createServerClient<Database>(env.supabaseUrl, env.supabaseKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, sessionCookieOptions(options, remember)),
          );
        } catch {
          // Server Components cannot write cookies; proxy.ts refreshes the session instead.
        }
      },
    },
  });
}
