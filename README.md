# Server Action `redirect()` streams a foreign RSC payload behind Vercel Deployment Protection

This is a minimal reproduction for [vercel/next.js#90591](https://github.com/vercel/next.js/issues/90591) (`createRedirectRenderResult` fetch missing `redirect: "manual"`). It shows another real-world trigger of that bug: Vercel Deployment Protection on preview deployments.

## What happens

1. After `redirect()` in a Server Action, Next.js fetches the target page again on the server (`createRedirectRenderResult`).
2. On a protected Vercel preview, that internal request carries no credentials, because Vercel strips them before invoking the function.
3. Vercel answers with a 302 to `vercel.com/sso-api`, then a 307 to `vercel.com/login`, and the fetch follows the chain.
4. vercel.com is itself a Next.js app, so it answers with `text/x-component`.
5. Next.js copies vercel.com's response headers (`x-matched-path: /login.rsc` and vercel.com's own `x-nextjs-deployment-id`) and streams vercel.com's login page RSC payload as the result of the action.
6. The browser preloads vercel.com's client chunks from the app's own origin. This produces dozens of 404s and `Refused to execute script … because its MIME type ('') is not executable`.
7. The browser then falls back to a full page navigation to the target.

`proxy.js` emulates the protection locally, so no Vercel account is needed. It authenticates the visitor with a cookie, strips that cookie before the app sees the request, and redirects unauthenticated requests to https://vercel.com/login.

## Steps

```bash
npm install
npm run build
npm start
```

1. Open http://localhost:3000/__login. This sets the emulated credential and redirects to `/`.
2. Open DevTools (Console and Network) and click **Go**.

**Expected:** a soft navigation to `/target`, with nothing loaded from another app.

**Actual** (`next@16.5.0-canary.55`, also seen on a real protected Vercel preview with `next@16.4.6`):

- The Server Action response carries `x-matched-path: /login.rsc` and vercel.com's `x-nextjs-deployment-id`.
- 30 to 60 `/_next/static/immutable/chunks/*` requests return 404, and the console shows matching errors.
- The browser then does a full page reload of `/target`.

**Control:** with `NO_PROTECTION=1 npm start`, the navigation is soft and there are no errors.

## Fix check

Adding `redirect: "manual"` to that fetch, as in [vercel/next.js#90137](https://github.com/vercel/next.js/pull/90137) and [vercel/next.js#91127](https://github.com/vercel/next.js/pull/91127), removes every error. With `next@16.5.0-canary.55`:

```bash
sed -i.bak 's/fetch(i,{method:"GET",headers:n,next:{internal:1}})/fetch(i,{method:"GET",headers:n,redirect:"manual",next:{internal:1}})/' node_modules/next/dist/compiled/next-server/app-page-turbo.runtime.prod.js
npm start
```
