/**
 * Icon conventions for app chrome.
 *
 * Two libraries ship with the UI layer:
 * - `@lucide/vue` — primary outline set for navigation, editor chrome, actions
 * - `@heroicons/vue` — secondary set (outline/solid) when a filled or alternate
 *   glyph reads clearer (empty states, folder tiles, etc.)
 *
 * Import icons by name at the call site so unused glyphs tree-shake out. Prefer
 * `:stroke-width="ICON_STROKE"` and a Tailwind size class (`h-4 w-4`) over the
 * Lucide `size` prop so icons inherit colour via `currentColor` / parent text.
 *
 * Domain-specific glyphs (motion presets, style tiles, block field icons) stay
 * on `<UiIcon name="…">` — they are a curated path set, not a general library.
 *
 * Brand marks (Google "G", etc.) are dedicated components — never fake them
 * with a random Lucide glyph.
 */
export const ICON_STROKE = 1.75
