# igorpimenta-www-lang-router

Cloudflare Worker: redirects first-time visitors from Brazil (`request.cf.country
=== 'BR'`) landing on `/` to `/pt-br/`. Sits in front of CloudFront on the
`igorpimenta.com` zone — see `src/index.js` for why the geo check has to
happen here and not at CloudFront.

## Deploy

```
cd worker
npx wrangler deploy
```

Not currently wired into the site's CI workflow (`.github/workflows/deploy.yml`)
— it changes rarely and deploying it is a separate blast radius from the
site content, so for now it's a manual step from this directory.
