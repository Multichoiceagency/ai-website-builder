/**
 * Turn free text into a slug that satisfies `slugSchema`. Diacritics are
 * folded rather than dropped so "Bäckerei Müller" becomes `backerei-muller`
 * instead of `bckerei-mller`.
 */
export function slugify(input: string): string {
  const slug = input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
    .replace(/-+$/g, '')

  return slug.length >= 2 ? slug : `workspace-${Math.random().toString(36).slice(2, 8)}`
}

/** Append `-2`, `-3`, … until the slug is free. */
export async function uniqueSlug(base: string, taken: (candidate: string) => Promise<boolean>): Promise<string> {
  const root = slugify(base)
  if (!(await taken(root))) return root

  for (let suffix = 2; suffix < 100; suffix += 1) {
    const candidate = `${root.slice(0, 60)}-${suffix}`
    if (!(await taken(candidate))) return candidate
  }

  return `${root.slice(0, 55)}-${Math.random().toString(36).slice(2, 8)}`
}
