import {
  DASHBOARD_BRANDING_KEYS,
  type UpdateWhiteLabelInput,
  type WhiteLabelSettings,
} from '@platform/schemas'

/**
 * Apply a partial update.
 *
 * `undefined` means "leave it alone"; an explicit `null` clears the field. That
 * distinction only survives in TypeScript — pushed into SQL both arrive as the
 * same NULL parameter — so the merge happens here, before anything is written.
 */
export function mergeWhiteLabelSettings(
  current: WhiteLabelSettings,
  patch: UpdateWhiteLabelInput,
): WhiteLabelSettings {
  return {
    brandName: patch.brandName !== undefined ? patch.brandName : current.brandName,
    logoUrl: patch.logoUrl !== undefined ? patch.logoUrl : current.logoUrl,
    faviconUrl: patch.faviconUrl !== undefined ? patch.faviconUrl : current.faviconUrl,
    colorPrimary: patch.colorPrimary ?? current.colorPrimary,
    colorAccent: patch.colorAccent ?? current.colorAccent,
    colorSurface: patch.colorSurface ?? current.colorSurface,
    colorSurfaceAlt: patch.colorSurfaceAlt ?? current.colorSurfaceAlt,
    colorText: patch.colorText ?? current.colorText,
    fontHeading: patch.fontHeading ?? current.fontHeading,
    fontBody: patch.fontBody ?? current.fontBody,
    customDomain: patch.customDomain !== undefined ? patch.customDomain : current.customDomain,
    hidePlatformBranding: patch.hidePlatformBranding ?? current.hidePlatformBranding,
    supportEmail: patch.supportEmail !== undefined ? patch.supportEmail : current.supportEmail,
    updatedAt: current.updatedAt,
  }
}

/** True when the patch only touches dashboard chrome (logo, colours, fonts). */
export function isDashboardBrandingOnly(patch: UpdateWhiteLabelInput): boolean {
  return Object.keys(patch).every((key) =>
    (DASHBOARD_BRANDING_KEYS as readonly string[]).includes(key),
  )
}
