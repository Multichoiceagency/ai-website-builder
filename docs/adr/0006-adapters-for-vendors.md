# ADR-0006 — Every vendor lives behind an adapter

**Status:** accepted

## Context

The platform depends on Medusa (commerce), Google/Meta (ads), Stripe/Mollie
(payments), OpenAI/Anthropic/Google (AI), an OAuth broker (Nango or equivalent),
and object storage. Each of these will change — some because we outgrow them,
some because they change under us.

The failure mode is not "we picked the wrong vendor". It is "the vendor's data
model reached the UI", at which point replacing it is a rewrite.

## Decision

Each capability is defined as a platform-owned interface. Vendors implement it.
Callers depend only on the interface and on platform-owned types.

```ts
interface AdsProvider {
  listAccounts(ctx: TenantContext): Promise<AdAccount[]>
  listCampaigns(ctx: TenantContext, accountId: string): Promise<Campaign[]>
  createCampaign(ctx: TenantContext, draft: CampaignDraft): Promise<Campaign>
  getMetrics(ctx: TenantContext, q: MetricsQuery): Promise<MetricSeries>
}
```

`Campaign`, `CampaignDraft` and `MetricSeries` come from `packages/schemas` and
are ours. `GoogleAdsProvider` maps Google's shapes into them; nothing outside
that adapter knows Google's field names.

This is why the dashboard builds one `CampaignTable` rather than
`GoogleAdsTable` + `MetaAdsTable` + `TikTokAdsTable`.

Enforcement: a vendor SDK may be imported by exactly one package. CI greps for
vendor package names outside their adapter.

## Consequences

- Medusa is the commerce implementation, not the platform's foundation. Swapping
  it means writing one adapter, not migrating the product.
- Adapters must sometimes emulate capabilities a vendor lacks; that cost is
  explicit and contained.
- Cost: an extra mapping layer on every call. Worth it — it is also where we put
  retries, rate limiting, token refresh and per-tenant credentials.
