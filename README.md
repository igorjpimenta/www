# www

Personal site for Igor Pimenta, AI engineer and technical product manager.

Astro + Tailwind CSS v4 + TypeScript — same stack as [nyxen-ai/www](https://github.com/nyxen-ai/www).
Served from a private S3 bucket behind CloudFront, with Cloudflare proxying
`igorpimenta.com` in front.

## Local development

```
npm install
npm run dev
```

## Build

```
npm run build
```

Outputs static files to `dist/`.

## Deploy

Deploys run automatically on push to `main` via GitHub Actions
(`.github/workflows/deploy.yml`): build, sync `dist/` to S3, invalidate
CloudFront, purge the Cloudflare edge cache. Config (bucket name,
distribution id, Cloudflare zone/token) lives in SSM Parameter Store under
`/igorpimenta-www/prod/`, fetched at deploy time via a GitHub OIDC role
scoped to this repo's `main` branch.
