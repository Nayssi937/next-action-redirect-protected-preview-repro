import { NextResponse } from "next/server";

// Emulates Vercel Deployment Protection ("Vercel Authentication") on a preview deployment:
// - the visitor is authenticated by a cookie (on Vercel: `_vercel_jwt`),
// - the platform strips that credential before the request reaches the app,
// - any unauthenticated request is redirected to https://vercel.com/login
//   (on Vercel: 302 to vercel.com/sso-api, then 307 to vercel.com/login).
// Set NO_PROTECTION=1 to disable the emulation (control run).
const COOKIE = "emulated_vercel_auth";

export function proxy(request) {
  if (process.env.NO_PROTECTION === "1") return NextResponse.next();

  if (request.nextUrl.pathname === "/__login") {
    const response = NextResponse.redirect(new URL("/", request.url));
    response.cookies.set(COOKIE, "1");
    return response;
  }

  if (request.cookies.get(COOKIE)?.value !== "1") {
    return NextResponse.redirect("https://vercel.com/login", 307);
  }

  const headers = new Headers(request.headers);
  const otherCookies = request.cookies.getAll().filter((cookie) => cookie.name !== COOKIE);
  if (otherCookies.length > 0) {
    headers.set("cookie", otherCookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; "));
  } else {
    headers.delete("cookie");
  }
  return NextResponse.next({ request: { headers } });
}

export const config = { matcher: ["/((?!_next/).*)"] };
