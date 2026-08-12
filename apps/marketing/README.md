# Marketing site (`@platform/marketing`)

Exact ditto.site clone of the Webtify marketing site (12 routes), imported from
`~/webtify-clone-fullsite`.

## Local

```bash
pnpm --filter @platform/marketing install   # from repo root (or pnpm install)
pnpm --filter @platform/marketing dev       # http://localhost:3456
```

## Routes

- `/` homepage
- `/abonnementen`, `/ai-agent`, `/affiliates`, `/automotive-website-laten-maken`
- blog / legal pages (AVG, voorwaarden, SEO FAQ, …)

## Deploy

Coolify compose service `marketing` (nginx serving `next export` output).
Map a public domain to container port **80**.
