/**
 * "تذكّرني على هذا الجهاز" (PUB-AUT-02). When the user opts out, the auth cookies are written as
 * browser-session cookies (no Max-Age/Expires), so closing the browser signs them out.
 */
export const REMEMBER_COOKIE = "tg-remember";

type CookieOptions = { maxAge?: number; expires?: Date; [key: string]: unknown };

export function sessionCookieOptions<T extends CookieOptions>(options: T, remember: boolean): T {
  if (remember) return options;
  const rest = { ...options };
  delete rest.maxAge;
  delete rest.expires;
  return rest;
}
