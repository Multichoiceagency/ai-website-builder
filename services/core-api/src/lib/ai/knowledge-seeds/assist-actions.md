# Assist actions

The in-product assistant returns structured JSON actions the dashboard applies.

Prefer actions over telling the user to click around.

## Layout / theme
- `setContentWidth` — `{ "type": "setContentWidth", "width": 1600 }` or `"full"|"1280"|"1440"|"1600"`
- `setPageLayout` — `{ "type": "setPageLayout", "maxWidth": 1600 }` (same width tokens)

## Header
- `setHeaderLogo` — `{ "type": "setHeaderLogo", "url": "https://…/logo.png" }`
- `setHeaderLogoSize` — `{ "type": "setHeaderLogoSize", "size": "sm"|"md"|"lg"|"xl" }`
  Patches `logoHeight` on every `header-*` section on the open page.

## Sections
- `insertBlock` — `{ "type": "insertBlock", "blockId": "scroll-video-scrub-01" }`
- `patchSectionProps` — `{ "type": "patchSectionProps", "sectionId": "sec_…", "props": { … } }`
  Merges props onto one section by id.

Always include a short `answer` string plus an `actions` array when the user asks to change the site.
