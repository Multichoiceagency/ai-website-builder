# ADR-0009 — Opaque server-side sessions in httpOnly cookies

**Status:** accepted

## Context

The dashboard is a first-party browser app. It needs sign-out to work
immediately, roles to change without waiting for a token to expire, and it must
never expose OAuth refresh tokens to JavaScript.

Self-contained JWTs make revocation a separate problem and push us toward short
TTLs plus a refresh endpoint — more moving parts for no benefit when the client
is our own browser app talking to our own API.

## Decision

- Login issues a 256-bit random token. The database stores only its SHA-256
  hash, so a database read does not yield usable sessions.
- The token is set as an `httpOnly`, `sameSite=lax`, `path=/` cookie; `secure` in
  every non-development environment.
- Every request looks the session up and loads the user and memberships. Roles
  and revocation therefore take effect on the next request.
- Passwords use `scrypt` from `node:crypto` (N=2^15) with a per-user salt and a
  timing-safe comparison. No native module, no supply-chain surface for the most
  security-critical dependency in the system.
- Third-party OAuth tokens are stored encrypted, server-side, and are never sent
  to the browser under any circumstance.

Machine clients (apps, public API) do **not** use sessions — they use scoped API
keys and OAuth, which is a separate mechanism with its own scopes (ADR to follow
in Phase 7).

Login with Google and *connecting* Google business services are separate flows
with separate consent; authenticating a user never implies permission to call
Ads or Business Profile APIs on their behalf.

## Consequences

- Instant revocation, instant permission changes, no refresh-token dance.
- One database read per request. Cheap, and cacheable in Redis behind the same
  interface if it ever shows up in a profile.
- Cost: sessions are stateful, so the session store is a dependency of every
  request. Accepted — it is the same Postgres we already require.
