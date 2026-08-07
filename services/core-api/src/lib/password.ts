import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto'

/** `promisify` cannot pick the options-bearing overload, so wrap it directly. */
function scryptAsync(
  password: string,
  salt: Buffer,
  keylen: number,
  options: ScryptOptions,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keylen, options, (error, derivedKey) => {
      if (error) reject(error)
      else resolve(derivedKey)
    })
  })
}

/**
 * scrypt from `node:crypto` — no native dependency, so the most
 * security-critical primitive in the system has no supply-chain surface.
 *
 * N=2^15, r=8, p=1 is the interactive-login profile: ~100ms and 32 MiB per
 * hash, which is expensive enough to make offline cracking painful.
 */
const COST = 2 ** 15
const BLOCK_SIZE = 8
const PARALLELISM = 1
const KEY_LENGTH = 64
const SALT_LENGTH = 16
const MAX_MEMORY = 128 * COST * BLOCK_SIZE * 2

const PREFIX = 'scrypt'

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH)
  const derived = await scryptAsync(password, salt, KEY_LENGTH, {
    N: COST,
    r: BLOCK_SIZE,
    p: PARALLELISM,
    maxmem: MAX_MEMORY,
  })

  return [
    PREFIX,
    COST,
    BLOCK_SIZE,
    PARALLELISM,
    salt.toString('base64url'),
    derived.toString('base64url'),
  ].join('$')
}

/**
 * Constant-time verification. Returns false rather than throwing on a malformed
 * stored value, so a corrupt row is a failed login and not a 500.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$')
  if (parts.length !== 6 || parts[0] !== PREFIX) return false

  const cost = Number(parts[1])
  const blockSize = Number(parts[2])
  const parallelism = Number(parts[3])
  if (!Number.isInteger(cost) || !Number.isInteger(blockSize) || !Number.isInteger(parallelism)) {
    return false
  }

  const salt = Buffer.from(parts[4]!, 'base64url')
  const expected = Buffer.from(parts[5]!, 'base64url')

  const derived = await scryptAsync(password, salt, expected.length, {
    N: cost,
    r: blockSize,
    p: parallelism,
    maxmem: 128 * cost * blockSize * 2,
  })

  return derived.length === expected.length && timingSafeEqual(derived, expected)
}
