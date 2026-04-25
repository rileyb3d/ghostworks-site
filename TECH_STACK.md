# rileyb3d Tech Stack

This is the canonical reference for the tech stack I use on `rileyb3d-site` and want to reuse on future sites. Hand this to a new agent chat at the start of any new project so it knows which services, patterns, and conventions to follow without re-deriving everything from scratch.

---

## TL;DR — the stack at a glance

| Layer | Tool | Why |
|---|---|---|
| Framework | **Next.js 15 (App Router) + React 19 + TypeScript (strict)** | SSR/SSG + server actions + API routes in one place |
| Hosting / CI | **Vercel** | Zero-config deploys from GitHub, edge runtime, preview URLs per PR |
| Source control | **GitHub — private repo** under `rileyb3d` org | Every site is private by default |
| Auth | **Clerk** (`@clerk/nextjs`) | Hosted sign-in, webhook → DB user sync, proxy support |
| Styling | **Tailwind CSS v4** via `@tailwindcss/postcss` | No `tailwind.config.js`; config lives in CSS |
| Transactional email | **Resend** | API-first, one-line send, same account for broadcasts |
| Payments | **Stripe** (+ `@stripe/stripe-js`, webhook) | Donations, sponsorships, subscriptions |
| File storage | **Vercel Blob** | Public CDN for user uploads, synced downloads, images |
| Key-value / analytics | **Upstash Redis** (REST) | Stats, counters, rate-limit-ish state — no SDK, just `fetch()` |
| CMS / content | **Notion** via `@notionhq/client` | Editable from mobile, sync-to-Blob at publish time |
| Images | **Next.js `<Image>` + `sharp`** | `remotePatterns` for Notion / Blob / S3 |
| i18n | **Custom build-time translator** (OpenAI) → `src/i18n/<locale>.json` | No runtime cost, hash-based incremental |
| Bot protection | **Cloudflare Turnstile** (`@marsidev/react-turnstile`) | Invisible captcha on public forms |
| Analytics | **Vercel Analytics + Speed Insights** | Drop-in, no cookie banner needed |
| Observability | Console logs → Vercel logs | Keep it simple; upgrade only if needed |
| Node | **>= 20** | Set in `package.json` `engines` |

---

## 1. Framework and language

- **Next.js 15 App Router** (`src/app/...`), not the legacy `pages/` router.
- **React 19**, **TypeScript 5.7+**, `"strict": true`.
- Path alias: `@/* → ./src/*`. Always import with `@/lib/...`, `@/components/...`, never relative `../../../`.
- Mix of server components (default) and `"use client"` components. API logic lives in `src/app/api/<route>/route.ts`, shared helpers in `src/lib/`.
- `runtime = "edge"` on routes that don't need Node APIs (contact form, lightweight lookups). Everything else runs on the Node runtime.

**New-site defaults:**
```
src/
  app/
    api/
    (public routes)
  components/
  hooks/
  lib/
  i18n/
  data/
scripts/
```

---

## 2. Hosting, CI, domains — Vercel + GitHub

- Every site is a **private GitHub repo** under the `rileyb3d` org. This one is `github.com/rileyb3d/rileyb3d-site.git`.
- The repo is connected to a Vercel project. `main` → production, every PR/branch → preview URL.
- Env vars live in **Vercel → Project → Settings → Environment Variables** (Production + Preview + Development). Local dev uses `.env.local`. Never commit secrets.
- Keep a `.env.example` at the repo root listing every required key with comments — that file is the contract for onboarding agents/humans.
- `prebuild` hook runs `node scripts/translate-static.mjs` so i18n JSON is up to date before every build.

---

## 3. Auth — Clerk

- Package: `@clerk/nextjs` (plus `@clerk/themes`, `@clerk/localizations` for styled, translated widgets).
- Root layout wraps the app in `<ClerkProvider>`.
- `src/middleware.ts` uses `clerkMiddleware` and **explicitly `auth.protect()`s** only the routes that need it (downloads, `/account/**`, write methods on `/api/projects`, etc.). Everything else stays public so GETs/feeds aren't gated.
- Sign-in / sign-up pages live at `src/app/sign-in/` and `src/app/sign-up/`.
- **Clerk webhook** at `src/app/api/webhooks/clerk/route.ts` syncs user create/update/delete into our own store (needed for profile fields, email prefs, etc.).
- Optional Clerk proxy: the middleware has a `/__clerk/*` rewrite block for custom-domain auth — only wire it up if you set `NEXT_PUBLIC_CLERK_PROXY_URL`.
- Required env:
  ```
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
  CLERK_SECRET_KEY=sk_...
  # optional
  NEXT_PUBLIC_APP_URL=https://yourdomain.com
  NEXT_PUBLIC_CLERK_PROXY_URL=
  CLERK_WEBHOOK_SIGNING_SECRET=whsec_...
  ```

**Rule of thumb:** Never gate an entire site with Clerk. Gate the specific routes that need identity.

---

## 4. Styling — Tailwind v4

- Tailwind v4 through **`@tailwindcss/postcss`** (see `postcss.config.mjs`). There is **no** `tailwind.config.js` — config goes inline in the global CSS with `@theme { ... }` if we need custom tokens.
- Dark-mode first. Favor utility classes; extract components only when a pattern repeats 3+ times.
- Icons: inline SVG or a small `@/components/icons` set, not a full icon package.

---

## 5. Email — Resend

- Package: `resend`.
- Transactional email from API routes (e.g. `src/app/api/contact/route.ts`) using a verified sending domain.
- Broadcasts are **scripted**, not in-app: `scripts/send-email.mjs` loads `.env.local`, pulls opted-in users, sends via Resend, supports `--test` mode that only emails me (`rileyb3d@gmail.com`).
- Store `email_opt_in` on the user record (wired up via the Clerk webhook) and always honor it.
- Required env:
  ```
  RESEND_API_KEY=re_...
  ```

---

## 6. Payments — Stripe

- Packages: `stripe` (server) + `@stripe/stripe-js` (client).
- Flows live under `src/app/api/donate`, `src/app/api/donations`, `src/app/api/sponsor`, and the webhook at `src/app/api/webhooks/stripe/route.ts`.
- Checkout Sessions for one-off donations, Subscriptions for recurring sponsor tiers. Webhook is the source of truth — never trust the client redirect.
- Required env:
  ```
  STRIPE_SECRET_KEY=sk_...
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
  STRIPE_WEBHOOK_SECRET=whsec_...
  ```

---

## 7. File storage — Vercel Blob

- Package: `@vercel/blob`. Token from **Vercel Dashboard → Storage → Blob**.
- Used for: user project uploads, synced tool icons/downloads from Notion, texture library files, anything we want on a CDN without standing up S3.
- Pattern (see `src/lib/blob-sync.ts`): stream remote URL → `put()` with `multipart: true`, `access: "public"`, `addRandomSuffix: false`. This means no in-memory size limit and stable URLs.
- `next.config.ts` must whitelist `*.blob.vercel-storage.com` under `images.remotePatterns`.
- Required env:
  ```
  BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
  ```

---

## 8. Key-value — Upstash Redis

- Used for lightweight stats (downloads, watches, revenue per month), counters, and anything else that wants a KV store.
- **We call the REST API directly** with `fetch()` — see `src/lib/stats.ts`. No SDK. Every call has a 3-second timeout so it can never hang a render.
- Only hit Redis when the env vars are present; degrade to "unknown / 0" otherwise so local dev and Preview builds don't explode.
- Required env:
  ```
  UPSTASH_REDIS_REST_URL=https://...upstash.io
  UPSTASH_REDIS_REST_TOKEN=...
  ```

---

## 9. CMS — Notion

- Package: `@notionhq/client`. See `NOTION_SETUP.md` for full onboarding steps.
- Databases I typically spin up per site:
  - `Tools` — downloads / add-ons grid
  - `Devlog` — blog posts
  - `Training` — course pages
- At publish time we **sync icons + download files into Vercel Blob** so we never serve expiring Notion URLs to users.
- Property names in Notion are treated as an API contract — don't rename columns without updating `src/lib/notion.ts`.
- Required env:
  ```
  NOTION_API_KEY=secret_...
  NOTION_TOOLS_DB_ID=...
  NOTION_DEVLOG_DB_ID=...
  NOTION_TRAINING_DB_ID=...
  ```

---

## 10. Internationalization

- Source of truth: `src/i18n/en.json`. Other locales (`de`, `es`, `fr`, `hi`, `zh`) are generated.
- `scripts/translate-static.mjs` hashes each string and only re-translates what changed (costs ~pennies per run). Runs automatically via the `prebuild` hook and can be run manually with `npm run translate`.
- Server: `getT()` in `src/lib/i18n.ts` reads the locale cookie `rileyb3d_locale`.
- Client: `useT()` hook backed by a `LocaleProvider`.
- Requires `OPENAI_API_KEY` **at build time** (not at runtime). If it's missing, the build still succeeds — it just skips new translations.

---

## 11. Forms, bots, misc

- **Cloudflare Turnstile** on any public-submit form (contact, networking signup). Package: `@marsidev/react-turnstile`. Server verifies token against `challenges.cloudflare.com/turnstile/v0/siteverify`. Env: `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`.
- **`sharp`** (devDependency) for any server-side image resizing/format conversion in scripts.
- **`matter-js`** is specific to this site (hero physics). Do **not** add it to new sites by default.
- **OpenAI SDK** is used for translation at build time and for any AI features (search, etc.). Not required for basic sites.
- **Vercel Analytics + Speed Insights** are always on — two lines in the root layout.

---

## 12. Conventions for agents working in these repos

1. **Read `.env.example` first.** It tells you what services are wired up.
2. **Never commit `.env.local`.** Mirror every new key into `.env.example` with a one-line comment.
3. **Put secrets only on the server.** If something needs `NEXT_PUBLIC_`, assume it's visible in the browser bundle.
4. **App Router only.** No `pages/` directory, no `getServerSideProps`.
5. **`@/` imports, always.** No `../../..`.
6. **Middleware is opt-in.** Add new protected paths to the `matcher` array and to the `auth.protect()` conditional — never blanket-protect.
7. **Fail soft.** External services (Upstash, Notion, Blob, Resend, OpenAI) should degrade gracefully when env vars are missing so preview deploys and local dev still boot.
8. **Sync-to-Blob when a remote URL might expire** (Notion files, S3 presigned URLs, etc.). The user should never hit an expired link.
9. **`prebuild` is sacred.** If you add a new generated artifact (sitemap, search index, translations), hook it here.
10. **Only use emojis in content if I explicitly ask.** Same for UI copy — keep it plain.

---

## 13. Starter checklist for a new rileyb3d site

When spinning up a new project, an agent should set up in this order:

1. `npx create-next-app@latest` — App Router, TypeScript, Tailwind, `src/` dir, `@/*` alias.
2. Create a **private GitHub repo** under `rileyb3d` and push.
3. Import into **Vercel**, link the repo, pick a production domain.
4. Add `@clerk/nextjs`, wire `<ClerkProvider>` in root layout, add `src/middleware.ts` scoped to whatever actually needs auth, create `sign-in` and `sign-up` pages.
5. Add `resend` and a `/api/contact` route with Turnstile verification.
6. Add `@vercel/analytics` + `@vercel/speed-insights` to root layout.
7. Add `@vercel/blob` if there's any user upload or remote-URL syncing.
8. Add `@upstash/redis` only if you need a KV store — default to "no" and revisit.
9. Add Notion CMS only if content needs non-dev editors.
10. Add the i18n scripts + `src/i18n/en.json` only if we're shipping multiple languages from day one.
11. Fill out `.env.example`, fill out `.env.local`, copy all keys into Vercel.
12. Drop this `TECH_STACK.md` at the repo root so the next agent has context.
