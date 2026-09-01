import { describe, expect, it } from 'vitest'
import type { WhiteLabelSettings } from '@platform/schemas'
import { brandingOverrides } from '../app/composables/useDashboardBranding'

/**
 * Every tenant row carries the old paper defaults. If those painted the root,
 * no tenant would ever see the design tokens — which is exactly what shipped.
 */

const stored: WhiteLabelSettings = {
  brandName: null, logoUrl: null, faviconUrl: null,
  colorPrimary: '#c2410c', colorAccent: '#0f766e',
  colorSurface: '#fafaf9', colorSurfaceAlt: '#ffffff', colorText: '#18181b',
  fontHeading: 'Figtree', fontBody: 'Rubik',
  customDomain: null, hidePlatformBranding: false, supportEmail: null, updatedAt: null,
}

describe('brandingOverrides', () => {
  it('paints nothing for a tenant who never changed the defaults', () => {
    expect(brandingOverrides(stored)).toEqual({})
  })

  it('overrides only what the tenant changed', () => {
    const vars = brandingOverrides({ ...stored, colorPrimary: '#0055FF' })

    expect(vars['--brand']).toBe('#0055FF')
    expect(vars['--paper']).toBeUndefined()
    expect(vars['--ink']).toBeUndefined()
  })

  it('keeps ink readable on a dark custom surface', () => {
    const vars = brandingOverrides({ ...stored, colorSurface: '#111111' })

    expect(vars['--paper']).toBe('#111111')
    // sunken lightens on a dark ground rather than going blacker
    expect(vars['--paper-sunken']).not.toBe('#111111')
  })
})
