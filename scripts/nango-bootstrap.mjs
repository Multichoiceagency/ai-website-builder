#!/usr/bin/env node
/**
 * Bootstrap Nango integrations for every connector in our catalog.
 *
 * Prerequisites:
 *   pnpm infra:nango
 *   NANGO_SECRET_KEY set (from Nango UI → Environment Settings → API Keys)
 *
 * Creates integration shells (unique_key = catalog nango id). OAuth client
 * credentials are attached when matching env vars exist (e.g. Google).
 *
 * Usage:
 *   node --env-file-if-exists=.env --env-file-if-exists=.env.local scripts/nango-bootstrap.mjs
 */

import { Nango } from '@nangohq/node'

const HOST = process.env.NANGO_HOST || 'http://localhost:3003'
const SECRET = process.env.NANGO_SECRET_KEY?.trim()

/** Must stay aligned with CONNECTOR_CATALOG in nango.ts */
const INTEGRATIONS = [
  { unique_key: process.env.NANGO_GOOGLE_INTEGRATION_ID || 'google', provider: 'google', display_name: 'Google' },
  { unique_key: 'slack', provider: 'slack', display_name: 'Slack' },
  { unique_key: 'stripe', provider: 'stripe', display_name: 'Stripe' },
  { unique_key: 'shopify', provider: 'shopify', display_name: 'Shopify' },
  { unique_key: 'hubspot', provider: 'hubspot', display_name: 'HubSpot' },
  { unique_key: 'facebook', provider: 'facebook', display_name: 'Meta' },
  { unique_key: 'mailchimp', provider: 'mailchimp', display_name: 'Mailchimp' },
  { unique_key: 'notion', provider: 'notion', display_name: 'Notion' },
  { unique_key: 'airtable', provider: 'airtable', display_name: 'Airtable' },
  { unique_key: 'linkedin', provider: 'linkedin', display_name: 'LinkedIn' },
  { unique_key: 'salesforce', provider: 'salesforce', display_name: 'Salesforce' },
  { unique_key: 'intercom', provider: 'intercom', display_name: 'Intercom' },
  { unique_key: 'zendesk', provider: 'zendesk', display_name: 'Zendesk' },
  { unique_key: 'pipedrive', provider: 'pipedrive', display_name: 'Pipedrive' },
  { unique_key: 'klaviyo', provider: 'klaviyo', display_name: 'Klaviyo' },
  { unique_key: 'google-calendar', provider: 'google-calendar', display_name: 'Google Calendar' },
  { unique_key: 'google-mail', provider: 'google-mail', display_name: 'Gmail' },
  { unique_key: 'whatsapp-business', provider: 'whatsapp-business', display_name: 'WhatsApp Business' },
  { unique_key: 'tiktok-ads', provider: 'tiktok-ads', display_name: 'TikTok Ads' },
  { unique_key: 'twitter', provider: 'twitter', display_name: 'X (Twitter)' },
]

function credentialsFor(provider) {
  if (provider === 'google' || provider === 'google-calendar' || provider === 'google-mail') {
    const id = process.env.GOOGLE_CLIENT_ID?.trim()
    const secret = process.env.GOOGLE_CLIENT_SECRET?.trim()
    if (id && secret && !id.includes('your-client')) {
      return { type: 'OAUTH2', oauth_client_id: id, oauth_client_secret: secret }
    }
  }
  return undefined
}

async function main() {
  if (!SECRET) {
    console.error('NANGO_SECRET_KEY is missing. Open http://localhost:3003 → Environment Settings → copy the secret key into .env / .env.local, then re-run.')
    process.exit(1)
  }

  const nango = new Nango({ secretKey: SECRET, host: HOST })

  let existing = new Set()
  try {
    const listed = await nango.listIntegrations()
    existing = new Set((listed.configs ?? []).map((entry) => entry.unique_key))
    console.log(`Nango reachable at ${HOST} — ${existing.size} integration(s) already present`)
  } catch (error) {
    console.error('Could not list integrations:', error instanceof Error ? error.message : error)
    process.exit(1)
  }

  const results = []
  for (const entry of INTEGRATIONS) {
    if (existing.has(entry.unique_key)) {
      results.push({ key: entry.unique_key, status: 'exists' })
      continue
    }
    const credentials = credentialsFor(entry.provider)
    try {
      await nango.createIntegration({
        provider: entry.provider,
        unique_key: entry.unique_key,
        display_name: entry.display_name,
        ...(credentials ? { credentials } : {}),
      })
      results.push({
        key: entry.unique_key,
        status: credentials ? 'created_with_oauth' : 'created_shell',
      })
    } catch (error) {
      results.push({
        key: entry.unique_key,
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  for (const row of results) {
    const extra = row.error ? ` — ${row.error}` : ''
    console.log(`${row.status.padEnd(20)} ${row.key}${extra}`)
  }

  const failed = results.filter((row) => row.status === 'error')
  if (failed.length) {
    console.error(`\n${failed.length} integration(s) failed. Provider ids must exist in Nango providers.yaml; shells without OAuth still need client credentials in the Nango UI before Connect works.`)
    process.exitCode = 2
  } else {
    console.log('\nDone. Add OAuth client credentials in the Nango UI for any “created_shell” rows, set webhook to http://localhost:4000/api/v1/integrations/nango/webhook, restart core-api.')
  }
}

main()
