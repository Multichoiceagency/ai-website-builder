import { describe, it, expect } from 'vitest'
import type { Tx } from '../client.js'
import { encryptToken } from '../../lib/integrations/crypto.js'
import {
  listEnabledProviderKeys,
  upsertProviderKey,
} from '../repositories/ai-builder.js'

/**
 * Provider-key storage, verified without a database.
 *
 * These cover the two claims that matter and that a typecheck cannot prove:
 * a key never reaches a row as plaintext, and a row that no longer decrypts is
 * dropped rather than handed to the agent as an empty credential.
 *
 * `tx` is a postgres.js tagged template, so a plain function standing in for it
 * is enough to capture what would have been sent.
 */

interface FakeTx {
  tx: Tx
  /** Values interpolated into the statements, in order. */
  values: unknown[]
}

function fakeTx(rows: unknown[] = []): FakeTx {
  const values: unknown[] = []
  const fn = (_strings: TemplateStringsArray, ...args: unknown[]) => {
    values.push(...args)
    return Promise.resolve(rows)
  }
  return { tx: fn as unknown as Tx, values }
}

describe('provider keys are never stored in the clear', () => {
  it('sends ciphertext to the database, not the key', async () => {
    const secret = 'sk-test-abcdef123456789'
    const { tx, values } = fakeTx([{ id: 'row-1' }])

    await upsertProviderKey(tx, {
      tenantId: 't1',
      addedBy: 'u1',
      providerId: 'anthropic',
      providerName: 'Anthropic',
      apiKey: secret,
    })

    // The plaintext must appear nowhere in what would have been written.
    expect(values).not.toContain(secret)
    expect(JSON.stringify(values)).not.toContain(secret)

    // ...and what *is* written must be the versioned envelope.
    const stored = values.find(
      (value): value is string => typeof value === 'string' && value.startsWith('v1.'),
    )
    expect(stored).toBeDefined()
    expect(stored!.split('.')).toHaveLength(4)
  })
})

describe('reading provider keys back', () => {
  it('decrypts a stored key for the agent', async () => {
    const secret = 'sk-test-round-trip'
    const { tx } = fakeTx([
      {
        id: 'row-1',
        provider_id: 'anthropic',
        provider_name: 'Anthropic',
        api_key_enc: encryptToken(secret),
        base_url: null,
        models: null,
        enabled: true,
        is_custom: false,
        created_at: new Date(),
      },
    ])

    const keys = await listEnabledProviderKeys(tx, 't1')
    expect(keys).toHaveLength(1)
    expect(keys[0]!.api_key).toBe(secret)
  })

  it('skips a row that no longer decrypts instead of returning an empty key', async () => {
    // Happens after SESSION_SECRET rotation or a corrupt value. Returning the
    // row with a null key would send an empty Authorization header and produce
    // an opaque 401 from the provider; dropping it surfaces as "no provider
    // configured", which points at the real fix — re-enter the key.
    const { tx } = fakeTx([
      {
        id: 'row-1',
        provider_id: 'anthropic',
        provider_name: 'Anthropic',
        api_key_enc: 'v1.corrupt.corrupt.corrupt',
        base_url: null,
        models: null,
        enabled: true,
        is_custom: false,
        created_at: new Date(),
      },
    ])

    await expect(listEnabledProviderKeys(tx, 't1')).resolves.toEqual([])
  })
})
