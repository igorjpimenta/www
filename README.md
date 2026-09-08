# www

Personal site for Igor Pimenta, AI engineer and technical product manager.

Astro + Tailwind CSS v4 + TypeScript — same stack as [nyxen-ai/www](https://github.com/nyxen-ai/www).

## Local development

```
npm install
npm run dev
```

## Build

```
npm run build
```

Outputs static files to `dist/`. Two pages: `/` (English) and `/pt-br/`
(Portuguese) — see [Internationalization](#internationalization) below.

## Architecture

The site is static (no server, no runtime backend) but the request path
has four hops, each doing a specific job:

```
Browser
  │
  ▼
Cloudflare  (DNS + edge proxy for igorpimenta.com)
  │  ├─ igorpimenta-www-lang-router Worker runs first — see below
  │  └─ then proxies through to origin, with its own edge cache in front
  ▼
CloudFront  (distribution E2JNE63DWZAMLV, ACM cert for both domains)
  │  serves cached assets; on a miss, pulls from the S3 origin via
  │  Origin Access Control — S3 itself is private and not reachable
  │  directly, only CloudFront can read it
  ▼
S3  (bucket igorpimenta-www-prod, private, SSE-AES256)
  the actual build output — index.html, /pt-br/index.html, /_astro/*
```

**Why two CDNs in front of one bucket, not just one?** `igorpimenta.com`
was already a Cloudflare-managed zone (DNS, nameservers) before this site
existed, and Cloudflare is where the geo-routing Worker has to live — it's
the only layer that sees the visitor's real IP/country, since everything
behind it only ever sees Cloudflare's edge IP. CloudFront is the actual
static-asset origin: private S3 bucket, OAC-only access, ACM-issued TLS.
Neither layer is redundant; each is doing the one thing the other can't.

### Deploy pipeline (site content)

Push to `main` → GitHub Actions (`.github/workflows/deploy.yml`):

1. `npm ci` && `npm run build` (Astro → `dist/`)
2. Assume `www-github-oidc-deploy` IAM role via GitHub OIDC — no long-lived
   AWS keys stored anywhere. Trust is scoped to *this exact repo's `main`
   branch*, nothing broader.
3. Fetch deploy config from SSM (`/igorpimenta-www/prod/*`): bucket name,
   CloudFront distribution ID, Cloudflare zone ID, and a Cloudflare API
   token (`SecureString`) scoped only to this zone's DNS-edit and
   cache-purge permissions.
4. `aws s3 sync dist/ s3://igorpimenta-www-prod --delete`
5. Invalidate the CloudFront distribution (`/*`)
6. Purge Cloudflare's edge cache — step 5 alone isn't enough, since
   Cloudflare holds its own independent cache in front of CloudFront that
   a CloudFront invalidation never touches.

> **OIDC gotcha, documented so it doesn't cost another debugging round:**
> GitHub's OIDC `sub` claim now embeds immutable owner/repo IDs —
> `repo:igorjpimenta@54811039/www@1360904270:ref:refs/heads/main`, not the
> plain `repo:igorjpimenta/www:ref:refs/heads/main` you'd expect from the
> docs. If the IAM role's trust policy ever needs to be recreated, print
> the real claim first (a workflow step hitting the
> `ACTIONS_ID_TOKEN_REQUEST_URL` endpoint and decoding the JWT payload) —
> don't hand-write the `sub` condition from memory.

### Geo-based language routing (separate deploy, separate blast radius)

`worker/` is a small Cloudflare Worker (`igorpimenta-www-lang-router`),
deployed independently via `wrangler deploy` from that directory — **not**
part of the GitHub Actions pipeline above, and **not** triggered by pushes
to `main`. It's attached as a Route on the `igorpimenta.com` zone (both
apex and `www`), so it runs before every request reaches CloudFront.

What it does: a first-time visitor from Brazil landing on `/` gets a 302
to `/pt-br/`, with a `lang_pref` cookie set so the choice sticks — manually
switching language once (via the nav link) isn't silently overridden by
geography on the next visit. Full detail in [`worker/README.md`](worker/README.md).

### Infrastructure reference

| Resource | Value |
|---|---|
| AWS account | `136468712354` (shared with Nyxen's own infra, this repo's IAM/S3/CloudFront resources are scoped to it only) |
| S3 bucket | `igorpimenta-www-prod`, private, no public access, no static-website config — CloudFront-only origin |
| CloudFront distribution | `E2JNE63DWZAMLV` (`d2yxc71brhen8m.cloudfront.net`) |
| IAM deploy role | `www-github-oidc-deploy`, trust-scoped to `igorjpimenta/www`'s `main` branch only |
| Cloudflare zone | `igorpimenta.com` (`795f2e8db6a7ff01cad565e614540585`) |
| SSM config path | `/igorpimenta-www/prod/{S3_BUCKET_NAME,CLOUDFRONT_DISTRIBUTION_ID,CF_ZONE_ID,CF_API_TOKEN}` |
| Cloudflare Worker | `igorpimenta-www-lang-router`, routes on `igorpimenta.com/*` and `www.igorpimenta.com/*` |

## Internationalization

Two static pages share the same components: `src/pages/index.astro` (`/`,
English) and `src/pages/pt-br/index.astro` (`/pt-br/`, Portuguese). All
copy lives in `src/i18n/locales/{en,pt-br}.json` — same file-per-locale
convention as nyxen-ai/www — and gets passed into components as props
(`t={en.hero}`, etc.) rather than hardcoded in the markup. There's no
client-side i18n runtime; both pages are fully static at build time.

Adding a section means adding the English strings to `en.json`, a real
(not machine-translated) Portuguese version to `pt-br.json`, and a `t`
prop on the component — not touching component markup itself.
