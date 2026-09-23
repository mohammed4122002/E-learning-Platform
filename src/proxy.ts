import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { REMEMBER_COOKIE, sessionCookieOptions } from "@/lib/supabase/cookies";

/** Routes that need a signed-in user. Everything else (auth pages, course pages, verification) is public. */
const PROTECTED = ["/trainee", "/account", "/notifications", "/messages", "/onboarding", "/select-workspace", "/checkout"];
/** Auth pages a signed-in user should not see again. */
const GUEST_ONLY = ["/login", "/register"];

/**
 * Refreshes the Supabase session cookie on every navigation (Server Components cannot write cookies)
 * and performs the coarse auth redirects. Fine-grained authorization lives in RLS and in each page.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const remember = request.cookies.get(REMEMBER_COOKIE)?.value !== "0";

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet, headers) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, sessionCookieOptions(options, remember)),
          );
          Object.entries(headers ?? {}).forEach(([key, value]) => response.headers.set(key, value));
        },
      },
    },
  );

  // getClaims() validates the JWT; do not put code between client creation and this call.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);
  const { pathname, search } = request.nextUrl;

  const redirect = (to: string) => {
    const res = NextResponse.redirect(new URL(to, request.url));
    response.cookies.getAll().forEach((c) => res.cookies.set(c));
    return res;
  };

  if (!signedIn && PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return redirect(`/login?next=${encodeURIComponent(pathname + search)}`);
  }
  if (signedIn && GUEST_ONLY.includes(pathname)) {
    const next = request.nextUrl.searchParams.get("next");
    return redirect(next && next.startsWith("/") && !next.startsWith("//") ? next : "/");
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|assets/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
