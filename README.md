# Ghostworks

Portfolio + client-payments site for Ghostworks — a creative studio.

Follows the conventions in [`TECH_STACK.md`](./TECH_STACK.md). Read that first
if you're an agent or new contributor.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript** (strict)
- **Tailwind CSS v4** via `@tailwindcss/postcss` (no `tailwind.config.js`)
- **Clerk** — auth, sign-in / sign-up pages, account area, webhook user sync
- **Resend** + **Cloudflare Turnstile** — contact form (`/contact`)
- **Stripe** — client invoice payments (`/pay` → Stripe Checkout)
- **Vercel Blob** — CDN for project assets and remote-URL sync
- **Vercel Analytics** + **Speed Insights** — always on
- **framer-motion** + **lenis** — site-specific UX (smooth scroll, transitions)

## Development

```bash
npm install
cp .env.example .env.local   # fill in keys
npm run dev
```

Open <http://localhost:3000>.

## Environment

Every required key lives in [`.env.example`](./.env.example) with a comment.
Mirror any new key there when you add a new service. Local dev reads
`.env.local`; production / preview read from Vercel project settings.

## Deployment

Connect this repo to Vercel. `main` → production, every PR → preview URL. Add
all `.env.example` keys to **Vercel → Settings → Environment Variables** for
each environment.

After deploy, configure the webhooks:

- **Clerk** — point at `<APP_URL>/api/webhooks/clerk`, copy signing secret
  into `CLERK_WEBHOOK_SIGNING_SECRET`.
- **Stripe** — point at `<APP_URL>/api/webhooks/stripe`, subscribe to
  `checkout.session.completed` (and any others you care about), copy signing
  secret into `STRIPE_WEBHOOK_SECRET`.

## Adding Projects

See [CONTENT.md](./CONTENT.md). Project data currently lives in
`src/lib/projects.ts`; long-term, sync video / image assets into Vercel Blob
via `src/lib/blob-sync.ts` so the URLs are stable and CDN-served.

## Project Structure

```
src/
  app/
    api/
      contact/                  # Resend + Turnstile public form
      payments/checkout/        # creates Stripe Checkout sessions
      webhooks/clerk/           # Clerk user sync
      webhooks/stripe/          # Stripe payment events (source of truth)
    account/                    # Clerk-protected user area
    contact/                    # public contact page
    pay/                        # public client-invoice payment page
    sign-in/, sign-up/          # Clerk auth pages
    [slug]/                     # project detail pages
    layout.tsx, page.tsx, globals.css
  components/                   # UI (Header, HeroReel, ContactForm, PayForm, ...)
  lib/
    blob-sync.ts                # Vercel Blob helper
    projects.ts                 # portfolio data
    stripe.ts                   # Stripe client
    turnstile.ts                # Turnstile server-side verification
  middleware.ts                 # Clerk middleware (protects /account/**, /api/account/**)
```
