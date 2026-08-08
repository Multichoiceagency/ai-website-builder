/**
 * GENERATED — do not edit by hand.
 *
 * Produced by `packages/templates/scripts/import-magicui.mjs` from the
 * Magic UI free MIT registry. Metadata + platform block recipes only.
 * No third-party asset URLs or component source (ADR-0003). Pro excluded.
 *
 * Regenerate with: pnpm --filter @platform/templates import:magicui
 */
import type { TemplateCatalog } from '@platform/schemas'

export const MAGICUI_CATALOG: TemplateCatalog = {
  "version": 1,
  "generatedAt": "2026-08-08T12:15:55.355Z",
  "source": "Magic UI free MIT registry (magicuidesign/magicui). Metadata + platform block recipes only — no React/TSX or CDN URLs. Pro excluded (ADR-0003).",
  "collections": [
    {
      "id": "hero",
      "label": "Hero sections",
      "description": "The first screen: one statement, one action.",
      "count": 32
    },
    {
      "id": "saas",
      "label": "SaaS & product",
      "description": "Product-led pages: dashboards, plans, feature proof.",
      "count": 4
    },
    {
      "id": "features",
      "label": "Features & benefits",
      "description": "Explaining what the thing does, in bands.",
      "count": 10
    },
    {
      "id": "conversion",
      "label": "Conversion",
      "description": "Calls to action, pricing, sign-up and contact.",
      "count": 6
    },
    {
      "id": "proof",
      "label": "Social proof",
      "description": "Testimonials, ratings and numbers.",
      "count": 7
    },
    {
      "id": "interactive",
      "label": "Interactive",
      "description": "Carousels, tabs, marquees and cards that respond.",
      "count": 13
    },
    {
      "id": "utility",
      "label": "Utility",
      "description": "Error pages and the small necessary screens.",
      "count": 6
    }
  ],
  "templates": [
    {
      "id": "magicui-magic-card",
      "title": "Magic UI — Magic Card",
      "collection": "features",
      "category": "magic-card",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
        "saas",
        "*"
      ],
      "motionType": [
        "entrance",
        "hover"
      ],
      "complexity": "moderate",
      "mobileSafe": true,
      "performanceClass": "B",
      "previewImage": "",
      "previewVideo": "",
      "islandReady": false,
      "isFree": true,
      "sourcePrompt": "Rebuild a marketing section in the spirit of Magic UI “Magic Card”.\n\nA spotlight effect that follows your mouse cursor and highlights borders on hover.\n\nComponent: magic-card.\n\nLayout and motion character only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs. Magic UI Pro is out of scope.",
      "blockRecipe": [
        "features-grid-01"
      ]
    },
    {
      "id": "magicui-android",
      "title": "Magic UI — Android",
      "collection": "interactive",
      "category": "android",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
        "saas",
        "*"
      ],
      "motionType": [
        "entrance",
        "hover"
      ],
      "complexity": "moderate",
      "mobileSafe": true,
      "performanceClass": "B",
      "previewImage": "",
      "previewVideo": "",
      "islandReady": false,
      "isFree": true,
      "sourcePrompt": "Rebuild a marketing section in the spirit of Magic UI “Android”.\n\nA mockup of an Android device.\n\nComponent: android.\n\nLayout and motion character only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs. Magic UI Pro is out of scope.",
      "blockRecipe": [
        "gallery-compare-slider-01"
      ]
    },
    {
      "id": "magicui-warp-background",
      "title": "Magic UI — Warp Background",
      "collection": "hero",
      "category": "warp-background",
      "pageType": "section",
      "style": [
        "premium",
        "modern"
      ],
      "industry": [
        "saas",
        "*"
      ],
      "motionType": [
        "entrance",
        "particles"
      ],
      "complexity": "advanced",
      "mobileSafe": true,
      "performanceClass": "C",
      "previewImage": "",
      "previewVideo": "",
      "islandReady": false,
      "isFree": true,
      "sourcePrompt": "Rebuild a marketing section in the spirit of Magic UI “Warp Background”.\n\nA card with a time warping background effect.\n\nComponent: warp-background.\n\nLayout and motion character only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs. Magic UI Pro is out of scope.",
      "blockRecipe": [
        "hero-agency-proof-01"
      ]
    },
    {
      "id": "magicui-line-shadow-text",
      "title": "Magic UI — Line Shadow Text",
      "collection": "hero",
      "category": "line-shadow-text",
      "pageType": "section",
      "style": [
        "bold",
        "modern"
      ],
      "industry": [
        "saas",
        "*"
      ],
      "motionType": [
        "text-effect",
        "entrance"
      ],
      "complexity": "moderate",
      "mobileSafe": true,
      "performanceClass": "B",
      "previewImage": "",
      "previewVideo": "",
      "islandReady": false,
      "isFree": true,
      "sourcePrompt": "Rebuild a marketing section in the spirit of Magic UI “Line Shadow Text”.\n\nA text component with a moving line shadow.\n\nComponent: line-shadow-text.\n\nLayout and motion character only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs. Magic UI Pro is out of scope.",
      "blockRecipe": [
        "hero-asymmetric-01"
      ]
    },
    {
      "id": "magicui-aurora-text",
      "title": "Magic UI — Aurora Text",
      "collection": "hero",
      "category": "aurora-text",
      "pageType": "section",
      "style": [
        "bold",
        "modern"
      ],
      "industry": [
        "saas",
        "*"
      ],
      "motionType": [
        "text-effect",
        "entrance"
      ],
      "complexity": "moderate",
      "mobileSafe": true,
      "performanceClass": "B",
      "previewImage": "",
      "previewVideo": "",
      "islandReady": false,
      "isFree": true,
      "sourcePrompt": "Rebuild a marketing section in the spirit of Magic UI “Aurora Text”.\n\nA beautiful aurora text effect\n\nComponent: aurora-text.\n\nLayout and motion character only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs. Magic UI Pro is out of scope.",
      "blockRecipe": [
        "hero-asymmetric-01"
      ]
    },
    {
      "id": "magicui-morphing-text",
      "title": "Magic UI — Morphing Text",
      "collection": "hero",
      "category": "morphing-text",
      "pageType": "section",
      "style": [
        "bold",
        "modern"
      ],
      "industry": [
        "saas",
        "*"
      ],
      "motionType": [
        "text-effect",
        "entrance"
      ],
      "complexity": "moderate",
      "mobileSafe": true,
      "performanceClass": "B",
      "previewImage": "",
      "previewVideo": "",
      "islandReady": false,
      "isFree": true,
      "sourcePrompt": "Rebuild a marketing section in the spirit of Magic UI “Morphing Text”.\n\nA dynamic text morphing component for Magic UI.\n\nComponent: morphing-text.\n\nLayout and motion character only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs. Magic UI Pro is out of scope.",
      "blockRecipe": [
        "hero-asymmetric-01"
      ]
    },
    {
      "id": "magicui-scroll-progress",
      "title": "Magic UI — Scroll Progress",
      "collection": "interactive",
      "category": "scroll-progress",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
        "saas",
        "*"
      ],
      "motionType": [
        "scroll-reveal",
        "entrance"
      ],
      "complexity": "moderate",
      "mobileSafe": true,
      "performanceClass": "B",
      "previewImage": "",
      "previewVideo": "",
      "islandReady": false,
      "isFree": true,
      "sourcePrompt": "Rebuild a marketing section in the spirit of Magic UI “Scroll Progress”.\n\nAnimated Scroll Progress for your pages\n\nComponent: scroll-progress.\n\nLayout and motion character only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs. Magic UI Pro is out of scope.",
      "blockRecipe": [
        "content-text-generate-01"
      ]
    },
    {
      "id": "magicui-lens",
      "title": "Magic UI — Lens",
      "collection": "interactive",
      "category": "lens",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
        "saas",
        "*"
      ],
      "motionType": [
        "entrance",
        "hover"
      ],
      "complexity": "moderate",
      "mobileSafe": true,
      "performanceClass": "B",
      "previewImage": "",
      "previewVideo": "",
      "islandReady": false,
      "isFree": true,
      "sourcePrompt": "Rebuild a marketing section in the spirit of Magic UI “Lens”.\n\nA interactive component that enables zooming into images, videos and other elements.\n\nComponent: lens.\n\nLayout and motion character only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs. Magic UI Pro is out of scope.",
      "blockRecipe": [
        "gallery-compare-slider-01"
      ]
    },
    {
      "id": "magicui-pointer",
      "title": "Magic UI — Pointer",
      "collection": "utility",
      "category": "pointer",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
        "saas",
        "*"
      ],
      "motionType": [
        "hover"
      ],
      "complexity": "advanced",
      "mobileSafe": false,
      "performanceClass": "C",
      "previewImage": "",
      "previewVideo": "",
      "islandReady": false,
      "isFree": true,
      "sourcePrompt": "Rebuild a marketing section in the spirit of Magic UI “Pointer”.\n\nA component that displays a pointer when hovering over an element\n\nComponent: pointer.\n\nLayout and motion character only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs. Magic UI Pro is out of scope.",
      "blockRecipe": []
    },
    {
      "id": "magicui-smooth-cursor",
      "title": "Magic UI — smooth-cursor",
      "collection": "utility",
      "category": "smooth-cursor",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
        "saas",
        "*"
      ],
      "motionType": [
        "hover"
      ],
      "complexity": "advanced",
      "mobileSafe": false,
      "performanceClass": "C",
      "previewImage": "",
      "previewVideo": "",
      "islandReady": false,
      "isFree": true,
      "sourcePrompt": "Rebuild a marketing section in the spirit of Magic UI “smooth-cursor”.\n\nA customizable, physics-based smooth cursor animation component with spring animations and rotation effects\n\nComponent: smooth-cursor.\n\nLayout and motion character only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs. Magic UI Pro is out of scope.",
      "blockRecipe": []
    },
    {
      "id": "magicui-progressive-blur",
      "title": "Magic UI — Progressive Blur",
      "collection": "interactive",
      "category": "progressive-blur",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
        "saas",
        "*"
      ],
      "motionType": [
        "scroll-reveal",
        "entrance"
      ],
      "complexity": "moderate",
      "mobileSafe": true,
      "performanceClass": "B",
      "previewImage": "",
      "previewVideo": "",
      "islandReady": false,
      "isFree": true,
      "sourcePrompt": "Rebuild a marketing section in the spirit of Magic UI “Progressive Blur”.\n\nThe Progressive Blur component adds a smooth blur gradient effect to scrollable content, indicating more content below or above.\n\nComponent: progressive-blur.\n\nLayout and motion character only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs. Magic UI Pro is out of scope.",
      "blockRecipe": [
        "content-text-generate-01"
      ]
    },
    {
      "id": "magicui-neon-gradient-card",
      "title": "Magic UI — Neon Gradient Card",
      "collection": "features",
      "category": "neon-gradient-card",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
        "saas",
        "*"
      ],
      "motionType": [
        "entrance",
        "hover"
      ],
      "complexity": "moderate",
      "mobileSafe": true,
      "performanceClass": "B",
      "previewImage": "",
      "previewVideo": "",
      "islandReady": false,
      "isFree": true,
      "sourcePrompt": "Rebuild a marketing section in the spirit of Magic UI “Neon Gradient Card”.\n\nA beautiful neon card effect\n\nComponent: neon-gradient-card.\n\nLayout and motion character only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs. Magic UI Pro is out of scope.",
      "blockRecipe": [
        "features-grid-01"
      ]
    },
    {
      "id": "magicui-meteors",
      "title": "Magic UI — Meteors",
      "collection": "hero",
      "category": "meteors",
      "pageType": "section",
      "style": [
        "premium",
        "modern"
      ],
      "industry": [
        "saas",
        "*"
      ],
      "motionType": [
        "entrance",
        "particles"
      ],
      "complexity": "advanced",
      "mobileSafe": true,
      "performanceClass": "C",
      "previewImage": "",
      "previewVideo": "",
      "islandReady": false,
      "isFree": true,
      "sourcePrompt": "Rebuild a marketing section in the spirit of Magic UI “Meteors”.\n\nA meteor shower effect.\n\nComponent: meteors.\n\nLayout and motion character only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs. Magic UI Pro is out of scope.",
      "blockRecipe": [
        "hero-agency-proof-01"
      ]
    },
    {
      "id": "magicui-grid-pattern",
      "title": "Magic UI — Grid Pattern",
      "collection": "hero",
      "category": "grid-pattern",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
        "saas",
        "*"
      ],
      "motionType": [
        "entrance",
        "particles"
      ],
      "complexity": "advanced",
      "mobileSafe": true,
      "performanceClass": "C",
      "previewImage": "",
      "previewVideo": "",
      "islandReady": false,
      "isFree": true,
      "sourcePrompt": "Rebuild a marketing section in the spirit of Magic UI “Grid Pattern”.\n\nA background grid pattern made with SVGs, fully customizable using Tailwind CSS.\n\nComponent: grid-pattern.\n\nLayout and motion character only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs. Magic UI Pro is out of scope.",
      "blockRecipe": [
        "hero-cover-statement-01"
      ]
    },
    {
      "id": "magicui-striped-pattern",
      "title": "Magic UI — Striped Pattern",
      "collection": "hero",
      "category": "striped-pattern",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
        "saas",
        "*"
      ],
      "motionType": [
        "entrance",
        "particles"
      ],
      "complexity": "advanced",
      "mobileSafe": true,
      "performanceClass": "C",
      "previewImage": "",
      "previewVideo": "",
      "islandReady": false,
      "isFree": true,
      "sourcePrompt": "Rebuild a marketing section in the spirit of Magic UI “Striped Pattern”.\n\nA background striped pattern made with SVGs, fully customizable using Tailwind CSS.\n\nComponent: striped-pattern.\n\nLayout and motion character only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs. Magic UI Pro is out of scope.",
      "blockRecipe": [
        "hero-cover-statement-01"
      ]
    },
    {
      "id": "magicui-interactive-grid-pattern",
      "title": "Magic UI — Interactive Grid Pattern",
      "collection": "hero",
      "category": "interactive-grid-pattern",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
        "saas",
        "*"
      ],
      "motionType": [
        "entrance",
        "particles"
      ],
      "complexity": "advanced",
      "mobileSafe": true,
      "performanceClass": "C",
      "previewImage": "",
      "previewVideo": "",
      "islandReady": false,
      "isFree": true,
      "sourcePrompt": "Rebuild a marketing section in the spirit of Magic UI “Interactive Grid Pattern”.\n\nA interactive background grid pattern made with SVGs, fully customizable using Tailwind CSS.\n\nComponent: interactive-grid-pattern.\n\nLayout and motion character only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs. Magic UI Pro is out of scope.",
      "blockRecipe": [
        "hero-cover-statement-01"
      ]
    },
    {
      "id": "magicui-dot-pattern",
      "title": "Magic UI — Dot Pattern",
      "collection": "hero",
      "category": "dot-pattern",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
        "saas",
        "*"
      ],
      "motionType": [
        "entrance",
        "particles"
      ],
      "complexity": "advanced",
      "mobileSafe": true,
      "performanceClass": "C",
      "previewImage": "",
      "previewVideo": "",
      "islandReady": false,
      "isFree": true,
      "sourcePrompt": "Rebuild a marketing section in the spirit of Magic UI “Dot Pattern”.\n\nA background dot pattern made with SVGs, fully customizable using Tailwind CSS.\n\nComponent: dot-pattern.\n\nLayout and motion character only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs. Magic UI Pro is out of scope.",
      "blockRecipe": [
        "hero-cover-statement-01"
      ]
    },
    {
      "id": "magicui-flickering-grid",
      "title": "Magic UI — Flickering Grid",
      "collection": "hero",
      "category": "flickering-grid",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
        "saas",
        "*"
      ],
      "motionType": [
        "entrance",
        "particles"
      ],
      "complexity": "advanced",
      "mobileSafe": true,
      "performanceClass": "C",
      "previewImage": "",
      "previewVideo": "",
      "islandReady": false,
      "isFree": true,
      "sourcePrompt": "Rebuild a marketing section in the spirit of Magic UI “Flickering Grid”.\n\nA flickering grid background made with SVGs, fully customizable using Tailwind CSS.\n\nComponent: flickering-grid.\n\nLayout and motion character only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs. Magic UI Pro is out of scope.",
      "blockRecipe": [
        "hero-cover-statement-01"
      ]
    },
    {
      "id": "magicui-hero-video-dialog",
      "title": "Magic UI — Hero Video Dialog",
      "collection": "hero",
      "category": "hero-video-dialog",
      "pageType": "section",
      "style": [
        "premium",
        "modern"
      ],
      "industry": [
        "saas",
        "*"
      ],
      "motionType": [
        "entrance",
        "particles"
      ],
      "complexity": "advanced",
      "mobileSafe": true,
      "performanceClass": "C",
      "previewImage": "",
      "previewVideo": "",
      "islandReady": false,
      "isFree": true,
      "sourcePrompt": "Rebuild a marketing section in the spirit of Magic UI “Hero Video Dialog”.\n\nA hero video dialog component.\n\nComponent: hero-video-dialog.\n\nLayout and motion character only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs. Magic UI Pro is out of scope.",
      "blockRecipe": [
        "hero-agency-proof-01"
      ]
    },
    {
      "id": "magicui-code-comparison",
      "title": "Magic UI — Code Comparison",
      "collection": "saas",
      "category": "code-comparison",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
        "saas",
        "*"
      ],
      "motionType": [
        "entrance"
      ],
      "complexity": "moderate",
      "mobileSafe": true,
      "performanceClass": "B",
      "previewImage": "",
      "previewVideo": "",
      "islandReady": false,
      "isFree": true,
      "sourcePrompt": "Rebuild a marketing section in the spirit of Magic UI “Code Comparison”.\n\nA component which compares two code snippets.\n\nComponent: code-comparison.\n\nLayout and motion character only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs. Magic UI Pro is out of scope.",
      "blockRecipe": [
        "content-text-generate-01"
      ]
    },
    {
      "id": "magicui-script-copy-btn",
      "title": "Magic UI — Script Copy Button",
      "collection": "saas",
      "category": "script-copy-btn",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
        "saas",
        "*"
      ],
      "motionType": [
        "entrance"
      ],
      "complexity": "moderate",
      "mobileSafe": true,
      "performanceClass": "B",
      "previewImage": "",
      "previewVideo": "",
      "islandReady": false,
      "isFree": true,
      "sourcePrompt": "Rebuild a marketing section in the spirit of Magic UI “Script Copy Button”.\n\nCopy code to clipboard\n\nComponent: script-copy-btn.\n\nLayout and motion character only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs. Magic UI Pro is out of scope.",
      "blockRecipe": [
        "content-text-generate-01"
      ]
    },
    {
      "id": "magicui-marquee",
      "title": "Magic UI — Marquee",
      "collection": "proof",
      "category": "marquee",
      "pageType": "section",
      "style": [
        "premium",
        "modern"
      ],
      "industry": [
        "saas",
        "*"
      ],
      "motionType": [
        "marquee"
      ],
      "complexity": "moderate",
      "mobileSafe": true,
      "performanceClass": "B",
      "previewImage": "",
      "previewVideo": "",
      "islandReady": false,
      "isFree": true,
      "sourcePrompt": "Rebuild a marketing section in the spirit of Magic UI “Marquee”.\n\nAn infinite scrolling component that can be used to display text, images, or videos.\n\nComponent: marquee.\n\nLayout and motion character only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs. Magic UI Pro is out of scope.",
      "blockRecipe": [
        "logos-orbit-01"
      ]
    },
    {
      "id": "magicui-glyph-matrix",
      "title": "Magic UI — Glyph Matrix",
      "collection": "hero",
      "category": "glyph-matrix",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
        "saas",
        "*"
      ],
      "motionType": [
        "entrance",
        "particles"
      ],
      "complexity": "advanced",
      "mobileSafe": true,
      "performanceClass": "C",
      "previewImage": "",
      "previewVideo": "",
      "islandReady": false,
      "isFree": true,
      "sourcePrompt": "Rebuild a marketing section in the spirit of Magic UI “Glyph Matrix”.\n\nAn animated grid of subtly shifting glyphs with fade effect and theme support.\n\nComponent: glyph-matrix.\n\nLayout and motion character only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs. Magic UI Pro is out of scope.",
      "blockRecipe": [
        "hero-cover-statement-01"
      ]
    },
    {
      "id": "magicui-globe",
      "title": "Magic UI — Globe",
      "collection": "features",
      "category": "globe",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
        "saas",
        "*"
      ],
      "motionType": [
        "entrance",
        "hover"
      ],
      "complexity": "advanced",
      "mobileSafe": false,
      "performanceClass": "C",
      "previewImage": "",
      "previewVideo": "",
      "islandReady": false,
      "isFree": true,
      "sourcePrompt": "Rebuild a marketing section in the spirit of Magic UI “Globe”.\n\nAn autorotating, interactive, and highly performant globe made using WebGL.\n\nComponent: globe.\n\nLayout and motion character only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs. Magic UI Pro is out of scope.",
      "blockRecipe": [
        "features-grid-01"
      ]
    },
    {
      "id": "magicui-shimmer-button",
      "title": "Magic UI — Shimmer Button",
      "collection": "conversion",
      "category": "shimmer-button",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
        "saas",
        "*"
      ],
      "motionType": [
        "hover",
        "entrance"
      ],
      "complexity": "moderate",
      "mobileSafe": true,
      "performanceClass": "B",
      "previewImage": "",
      "previewVideo": "",
      "islandReady": false,
      "isFree": true,
      "sourcePrompt": "Rebuild a marketing section in the spirit of Magic UI “Shimmer Button”.\n\nA button with a shimmering light which travels around the perimeter.\n\nComponent: shimmer-button.\n\nLayout and motion character only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs. Magic UI Pro is out of scope.",
      "blockRecipe": [
        "cta-animated-border-01"
      ]
    },
    {
      "id": "magicui-tweet-card",
      "title": "Magic UI — Tweet Card",
      "collection": "proof",
      "category": "tweet-card",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
        "saas",
        "*"
      ],
      "motionType": [
        "marquee"
      ],
      "complexity": "moderate",
      "mobileSafe": true,
      "performanceClass": "B",
      "previewImage": "",
      "previewVideo": "",
      "islandReady": false,
      "isFree": true,
      "sourcePrompt": "Rebuild a marketing section in the spirit of Magic UI “Tweet Card”.\n\nA card that displays a tweet with the author's name, handle, and profile picture.\n\nComponent: tweet-card.\n\nLayout and motion character only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs. Magic UI Pro is out of scope.",
      "blockRecipe": [
        "logos-orbit-01"
      ]
    },
    {
      "id": "magicui-client-tweet-card",
      "title": "Magic UI — Client Tweet Card",
      "collection": "proof",
      "category": "client-tweet-card",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
        "saas",
        "*"
      ],
      "motionType": [
        "marquee"
      ],
      "complexity": "moderate",
      "mobileSafe": true,
      "performanceClass": "B",
      "previewImage": "",
      "previewVideo": "",
      "islandReady": false,
      "isFree": true,
      "sourcePrompt": "Rebuild a marketing section in the spirit of Magic UI “Client Tweet Card”.\n\nA client-side version of the tweet card that displays a tweet with the author's name, handle, and profile picture.\n\nComponent: client-tweet-card.\n\nLayout and motion character only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs. Magic UI Pro is out of scope.",
      "blockRecipe": [
        "logos-orbit-01"
      ]
    },
    {
      "id": "magicui-bento-grid",
      "title": "Magic UI — Bento Grid",
      "collection": "features",
      "category": "bento-grid",
      "pageType": "section",
      "style": [
        "premium",
        "modern"
      ],
      "industry": [
        "saas",
        "*"
      ],
      "motionType": [
        "entrance",
        "hover"
      ],
      "complexity": "moderate",
      "mobileSafe": true,
      "performanceClass": "B",
      "previewImage": "",
      "previewVideo": "",
      "islandReady": false,
      "isFree": true,
      "sourcePrompt": "Rebuild a marketing section in the spirit of Magic UI “Bento Grid”.\n\nBento grid is a layout used to showcase the features of a product in a simple and elegant way.\n\nComponent: bento-grid.\n\nLayout and motion character only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs. Magic UI Pro is out of scope.",
      "blockRecipe": [
        "features-bento-grid-01"
      ]
    },
    {
      "id": "magicui-particles",
      "title": "Magic UI — Particles",
      "collection": "hero",
      "category": "particles",
      "pageType": "section",
      "style": [
        "premium",
        "modern"
      ],
      "industry": [
        "saas",
        "*"
      ],
      "motionType": [
        "entrance",
        "particles"
      ],
      "complexity": "advanced",
      "mobileSafe": true,
      "performanceClass": "C",
      "previewImage": "",
      "previewVideo": "",
      "islandReady": false,
      "isFree": true,
      "sourcePrompt": "Rebuild a marketing section in the spirit of Magic UI “Particles”.\n\nParticles are a fun way to add some visual flair to your website. They can be used to create a sense of depth, movement, and interactivity.\n\nComponent: particles.\n\nLayout and motion character only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs. Magic UI Pro is out of scope.",
      "blockRecipe": [
        "hero-agency-proof-01"
      ]
    },
    {
      "id": "magicui-number-ticker",
      "title": "Magic UI — Number Ticker",
      "collection": "proof",
      "category": "number-ticker",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
        "saas",
        "*"
      ],
      "motionType": [
        "entrance",
        "text-effect"
      ],
      "complexity": "moderate",
      "mobileSafe": true,
      "performanceClass": "B",
      "previewImage": "",
      "previewVideo": "",
      "islandReady": false,
      "isFree": true,
      "sourcePrompt": "Rebuild a marketing section in the spirit of Magic UI “Number Ticker”.\n\nAnimate numbers to count up or down to a target number\n\nComponent: number-ticker.\n\nLayout and motion character only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs. Magic UI Pro is out of scope.",
      "blockRecipe": [
        "stats-counter-01"
      ]
    },
    {
      "id": "magicui-ripple",
      "title": "Magic UI — Ripple",
      "collection": "hero",
      "category": "ripple",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
        "saas",
        "*"
      ],
      "motionType": [
        "entrance",
        "particles"
      ],
      "complexity": "advanced",
      "mobileSafe": true,
      "performanceClass": "C",
      "previewImage": "",
      "previewVideo": "",
      "islandReady": false,
      "isFree": true,
      "sourcePrompt": "Rebuild a marketing section in the spirit of Magic UI “Ripple”.\n\nAn animated ripple effect typically used behind elements to emphasize them.\n\nComponent: ripple.\n\nLayout and motion character only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs. Magic UI Pro is out of scope.",
      "blockRecipe": [
        "hero-cover-statement-01"
      ]
    },
    {
      "id": "magicui-retro-grid",
      "title": "Magic UI — Retro Grid",
      "collection": "hero",
      "category": "retro-grid",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
        "saas",
        "*"
      ],
      "motionType": [
        "entrance",
        "particles"
      ],
      "complexity": "advanced",
      "mobileSafe": true,
      "performanceClass": "C",
      "previewImage": "",
      "previewVideo": "",
      "islandReady": false,
      "isFree": true,
      "sourcePrompt": "Rebuild a marketing section in the spirit of Magic UI “Retro Grid”.\n\nAn animated scrolling retro grid effect\n\nComponent: retro-grid.\n\nLayout and motion character only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs. Magic UI Pro is out of scope.",
      "blockRecipe": [
        "hero-cover-statement-01"
      ]
    },
    {
      "id": "magicui-animated-list",
      "title": "Magic UI — Animated List",
      "collection": "interactive",
      "category": "animated-list",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
        "saas",
        "*"
      ],
      "motionType": [
        "scroll-reveal",
        "entrance"
      ],
      "complexity": "moderate",
      "mobileSafe": true,
      "performanceClass": "B",
      "previewImage": "",
      "previewVideo": "",
      "islandReady": false,
      "isFree": true,
      "sourcePrompt": "Rebuild a marketing section in the spirit of Magic UI “Animated List”.\n\nA list that animates each item in sequence with a delay. Used to showcase notifications or events on your landing page.\n\nComponent: animated-list.\n\nLayout and motion character only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs. Magic UI Pro is out of scope.",
      "blockRecipe": [
        "content-text-generate-01"
      ]
    },
    {
      "id": "magicui-animated-shiny-text",
      "title": "Magic UI — Animated Shiny Text",
      "collection": "hero",
      "category": "animated-shiny-text",
      "pageType": "section",
      "style": [
        "bold",
        "modern"
      ],
      "industry": [
        "saas",
        "*"
      ],
      "motionType": [
        "text-effect",
        "entrance"
      ],
      "complexity": "moderate",
      "mobileSafe": true,
      "performanceClass": "B",
      "previewImage": "",
      "previewVideo": "",
      "islandReady": false,
      "isFree": true,
      "sourcePrompt": "Rebuild a marketing section in the spirit of Magic UI “Animated Shiny Text”.\n\nA light glare effect which pans across text making it appear as if it is shimmering.\n\nComponent: animated-shiny-text.\n\nLayout and motion character only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs. Magic UI Pro is out of scope.",
      "blockRecipe": [
        "hero-asymmetric-01"
      ]
    },
    {
      "id": "magicui-animated-grid-pattern",
      "title": "Magic UI — Animated Grid Pattern",
      "collection": "hero",
      "category": "animated-grid-pattern",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
        "saas",
        "*"
      ],
      "motionType": [
        "entrance",
        "particles"
      ],
      "complexity": "advanced",
      "mobileSafe": true,
      "performanceClass": "C",
      "previewImage": "",
      "previewVideo": "",
      "islandReady": false,
      "isFree": true,
      "sourcePrompt": "Rebuild a marketing section in the spirit of Magic UI “Animated Grid Pattern”.\n\nA animated background grid pattern made with SVGs, fully customizable using Tailwind CSS.\n\nComponent: animated-grid-pattern.\n\nLayout and motion character only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs. Magic UI Pro is out of scope.",
      "blockRecipe": [
        "hero-cover-statement-01"
      ]
    },
    {
      "id": "magicui-border-beam",
      "title": "Magic UI — Border Beam",
      "collection": "features",
      "category": "border-beam",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
        "saas",
        "*"
      ],
      "motionType": [
        "entrance",
        "hover"
      ],
      "complexity": "moderate",
      "mobileSafe": true,
      "performanceClass": "B",
      "previewImage": "",
      "previewVideo": "",
      "islandReady": false,
      "isFree": true,
      "sourcePrompt": "Rebuild a marketing section in the spirit of Magic UI “Border Beam”.\n\nAn animated beam of light which travels along the border of its container.\n\nComponent: border-beam.\n\nLayout and motion character only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs. Magic UI Pro is out of scope.",
      "blockRecipe": [
        "features-grid-01"
      ]
    },
    {
      "id": "magicui-animated-beam",
      "title": "Magic UI — Animated Beam",
      "collection": "features",
      "category": "animated-beam",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
        "saas",
        "*"
      ],
      "motionType": [
        "entrance",
        "hover"
      ],
      "complexity": "moderate",
      "mobileSafe": true,
      "performanceClass": "B",
      "previewImage": "",
      "previewVideo": "",
      "islandReady": false,
      "isFree": true,
      "sourcePrompt": "Rebuild a marketing section in the spirit of Magic UI “Animated Beam”.\n\nAn animated beam of light which travels along a path. Useful for showcasing the integration features of a website.\n\nComponent: animated-beam.\n\nLayout and motion character only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs. Magic UI Pro is out of scope.",
      "blockRecipe": [
        "features-grid-01"
      ]
    },
    {
      "id": "magicui-text-reveal",
      "title": "Magic UI — Text Reveal",
      "collection": "hero",
      "category": "text-reveal",
      "pageType": "section",
      "style": [
        "bold",
        "modern"
      ],
      "industry": [
        "saas",
        "*"
      ],
      "motionType": [
        "text-effect",
        "entrance"
      ],
      "complexity": "moderate",
      "mobileSafe": true,
      "performanceClass": "B",
      "previewImage": "",
      "previewVideo": "",
      "islandReady": false,
      "isFree": true,
      "sourcePrompt": "Rebuild a marketing section in the spirit of Magic UI “Text Reveal”.\n\nFade in text as you scroll down the page.\n\nComponent: text-reveal.\n\nLayout and motion character only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs. Magic UI Pro is out of scope.",
      "blockRecipe": [
        "hero-asymmetric-01"
      ]
    },
    {
      "id": "magicui-hyper-text",
      "title": "Magic UI — Hyper Text",
      "collection": "hero",
      "category": "hyper-text",
      "pageType": "section",
      "style": [
        "bold",
        "modern"
      ],
      "industry": [
        "saas",
        "*"
      ],
      "motionType": [
        "text-effect",
        "entrance"
      ],
      "complexity": "moderate",
      "mobileSafe": true,
      "performanceClass": "B",
      "previewImage": "",
      "previewVideo": "",
      "islandReady": false,
      "isFree": true,
      "sourcePrompt": "Rebuild a marketing section in the spirit of Magic UI “Hyper Text”.\n\nA text animation that scrambles letters before revealing the final text.\n\nComponent: hyper-text.\n\nLayout and motion character only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs. Magic UI Pro is out of scope.",
      "blockRecipe": [
        "hero-asymmetric-01"
      ]
    },
    {
      "id": "magicui-animated-gradient-text",
      "title": "Magic UI — Animated Gradient Text",
      "collection": "hero",
      "category": "animated-gradient-text",
      "pageType": "section",
      "style": [
        "bold",
        "modern"
      ],
      "industry": [
        "saas",
        "*"
      ],
      "motionType": [
        "text-effect",
        "entrance"
      ],
      "complexity": "moderate",
      "mobileSafe": true,
      "performanceClass": "B",
      "previewImage": "",
      "previewVideo": "",
      "islandReady": false,
      "isFree": true,
      "sourcePrompt": "Rebuild a marketing section in the spirit of Magic UI “Animated Gradient Text”.\n\nAn animated gradient background which transitions between colors for text.\n\nComponent: animated-gradient-text.\n\nLayout and motion character only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs. Magic UI Pro is out of scope.",
      "blockRecipe": [
        "hero-asymmetric-01"
      ]
    },
    {
      "id": "magicui-orbiting-circles",
      "title": "Magic UI — Orbiting Circles",
      "collection": "features",
      "category": "orbiting-circles",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
        "saas",
        "*"
      ],
      "motionType": [
        "entrance",
        "hover"
      ],
      "complexity": "advanced",
      "mobileSafe": true,
      "performanceClass": "C",
      "previewImage": "",
      "previewVideo": "",
      "islandReady": false,
      "isFree": true,
      "sourcePrompt": "Rebuild a marketing section in the spirit of Magic UI “Orbiting Circles”.\n\nA collection of circles which move in orbit along a circular path\n\nComponent: orbiting-circles.\n\nLayout and motion character only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs. Magic UI Pro is out of scope.",
      "blockRecipe": [
        "features-grid-01"
      ]
    },
    {
      "id": "magicui-dock",
      "title": "Magic UI — Dock",
      "collection": "interactive",
      "category": "dock",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
        "saas",
        "*"
      ],
      "motionType": [
        "hover"
      ],
      "complexity": "moderate",
      "mobileSafe": true,
      "performanceClass": "B",
      "previewImage": "",
      "previewVideo": "",
      "islandReady": false,
      "isFree": true,
      "sourcePrompt": "Rebuild a marketing section in the spirit of Magic UI “Dock”.\n\nAn implementation of the MacOS dock using react + tailwindcss + motion\n\nComponent: dock.\n\nLayout and motion character only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs. Magic UI Pro is out of scope.",
      "blockRecipe": [
        "header-liquid-glass-01"
      ]
    },
    {
      "id": "magicui-word-rotate",
      "title": "Magic UI — Word Rotate",
      "collection": "hero",
      "category": "word-rotate",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
        "saas",
        "*"
      ],
      "motionType": [
        "text-effect",
        "entrance"
      ],
      "complexity": "moderate",
      "mobileSafe": true,
      "performanceClass": "B",
      "previewImage": "",
      "previewVideo": "",
      "islandReady": false,
      "isFree": true,
      "sourcePrompt": "Rebuild a marketing section in the spirit of Magic UI “Word Rotate”.\n\nA vertical rotation of words\n\nComponent: word-rotate.\n\nLayout and motion character only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs. Magic UI Pro is out of scope.",
      "blockRecipe": [
        "hero-cover-statement-01"
      ]
    },
    {
      "id": "magicui-avatar-circles",
      "title": "Magic UI — Avatar Circles",
      "collection": "proof",
      "category": "avatar-circles",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
        "saas",
        "*"
      ],
      "motionType": [
        "marquee"
      ],
      "complexity": "moderate",
      "mobileSafe": true,
      "performanceClass": "B",
      "previewImage": "",
      "previewVideo": "",
      "islandReady": false,
      "isFree": true,
      "sourcePrompt": "Rebuild a marketing section in the spirit of Magic UI “Avatar Circles”.\n\nOverlapping circles of avatars.\n\nComponent: avatar-circles.\n\nLayout and motion character only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs. Magic UI Pro is out of scope.",
      "blockRecipe": [
        "logos-orbit-01"
      ]
    },
    {
      "id": "magicui-typing-animation",
      "title": "Magic UI — Typing Animation",
      "collection": "hero",
      "category": "typing-animation",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
        "saas",
        "*"
      ],
      "motionType": [
        "text-effect",
        "entrance"
      ],
      "complexity": "moderate",
      "mobileSafe": true,
      "performanceClass": "B",
      "previewImage": "",
      "previewVideo": "",
      "islandReady": false,
      "isFree": true,
      "sourcePrompt": "Rebuild a marketing section in the spirit of Magic UI “Typing Animation”.\n\nCharacters appearing in typed animation\n\nComponent: typing-animation.\n\nLayout and motion character only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs. Magic UI Pro is out of scope.",
      "blockRecipe": [
        "hero-cover-statement-01"
      ]
    },
    {
      "id": "magicui-sparkles-text",
      "title": "Magic UI — Sparkles Text",
      "collection": "hero",
      "category": "sparkles-text",
      "pageType": "section",
      "style": [
        "bold",
        "modern"
      ],
      "industry": [
        "saas",
        "*"
      ],
      "motionType": [
        "text-effect",
        "entrance"
      ],
      "complexity": "moderate",
      "mobileSafe": true,
      "performanceClass": "B",
      "previewImage": "",
      "previewVideo": "",
      "islandReady": false,
      "isFree": true,
      "sourcePrompt": "Rebuild a marketing section in the spirit of Magic UI “Sparkles Text”.\n\nA dynamic text that generates continuous sparkles with smooth transitions, perfect for highlighting text with animated stars.\n\nComponent: sparkles-text.\n\nLayout and motion character only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs. Magic UI Pro is out of scope.",
      "blockRecipe": [
        "hero-asymmetric-01"
      ]
    },
    {
      "id": "magicui-spinning-text",
      "title": "Magic UI — Spinning Text",
      "collection": "hero",
      "category": "spinning-text",
      "pageType": "section",
      "style": [
        "bold",
        "modern"
      ],
      "industry": [
        "saas",
        "*"
      ],
      "motionType": [
        "text-effect",
        "entrance"
      ],
      "complexity": "moderate",
      "mobileSafe": true,
      "performanceClass": "B",
      "previewImage": "",
      "previewVideo": "",
      "islandReady": false,
      "isFree": true,
      "sourcePrompt": "Rebuild a marketing section in the spirit of Magic UI “Spinning Text”.\n\nThe Spinning Text component animates text in a circular motion with customizable speed, direction, color, and transitions for dynamic and engaging effects.\n\nComponent: spinning-text.\n\nLayout and motion character only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs. Magic UI Pro is out of scope.",
      "blockRecipe": [
        "hero-asymmetric-01"
      ]
    },
    {
      "id": "magicui-flip-text",
      "title": "Magic UI — Flip Text",
      "collection": "hero",
      "category": "flip-text",
      "pageType": "section",
      "style": [
        "bold",
        "modern"
      ],
      "industry": [
        "saas",
        "*"
      ],
      "motionType": [
        "text-effect",
        "entrance"
      ],
      "complexity": "moderate",
      "mobileSafe": true,
      "performanceClass": "B",
      "previewImage": "",
      "previewVideo": "",
      "islandReady": false,
      "isFree": true,
      "sourcePrompt": "Rebuild a marketing section in the spirit of Magic UI “Flip Text”.\n\nText flipping character animation\n\nComponent: flip-text.\n\nLayout and motion character only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs. Magic UI Pro is out of scope.",
      "blockRecipe": [
        "hero-asymmetric-01"
      ]
    },
    {
      "id": "magicui-comic-text",
      "title": "Magic UI — Comic Text",
      "collection": "hero",
      "category": "comic-text",
      "pageType": "section",
      "style": [
        "bold",
        "modern"
      ],
      "industry": [
        "saas",
        "*"
      ],
      "motionType": [
        "text-effect",
        "entrance"
      ],
      "complexity": "moderate",
      "mobileSafe": true,
      "performanceClass": "B",
      "previewImage": "",
      "previewVideo": "",
      "islandReady": false,
      "isFree": true,
      "sourcePrompt": "Rebuild a marketing section in the spirit of Magic UI “Comic Text”.\n\nComic text animation\n\nComponent: comic-text.\n\nLayout and motion character only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs. Magic UI Pro is out of scope.",
      "blockRecipe": [
        "hero-asymmetric-01"
      ]
    },
    {
      "id": "magicui-icon-cloud",
      "title": "Magic UI — Icon Cloud",
      "collection": "features",
      "category": "icon-cloud",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
        "saas",
        "*"
      ],
      "motionType": [
        "entrance",
        "hover"
      ],
      "complexity": "advanced",
      "mobileSafe": true,
      "performanceClass": "C",
      "previewImage": "",
      "previewVideo": "",
      "islandReady": false,
      "isFree": true,
      "sourcePrompt": "Rebuild a marketing section in the spirit of Magic UI “Icon Cloud”.\n\nAn interactive 3D tag cloud component\n\nComponent: icon-cloud.\n\nLayout and motion character only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs. Magic UI Pro is out of scope.",
      "blockRecipe": [
        "features-grid-01"
      ]
    },
    {
      "id": "magicui-text-animate",
      "title": "Magic UI — Text Animate",
      "collection": "hero",
      "category": "text-animate",
      "pageType": "section",
      "style": [
        "bold",
        "modern"
      ],
      "industry": [
        "saas",
        "*"
      ],
      "motionType": [
        "text-effect",
        "entrance"
      ],
      "complexity": "moderate",
      "mobileSafe": true,
      "performanceClass": "B",
      "previewImage": "",
      "previewVideo": "",
      "islandReady": false,
      "isFree": true,
      "sourcePrompt": "Rebuild a marketing section in the spirit of Magic UI “Text Animate”.\n\nA text animation component that animates text using a variety of different animations.\n\nComponent: text-animate.\n\nLayout and motion character only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs. Magic UI Pro is out of scope.",
      "blockRecipe": [
        "hero-asymmetric-01"
      ]
    },
    {
      "id": "magicui-scroll-based-velocity",
      "title": "Magic UI — Scroll Based Velocity",
      "collection": "hero",
      "category": "scroll-based-velocity",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
        "saas",
        "*"
      ],
      "motionType": [
        "text-effect",
        "entrance"
      ],
      "complexity": "moderate",
      "mobileSafe": true,
      "performanceClass": "B",
      "previewImage": "",
      "previewVideo": "",
      "islandReady": false,
      "isFree": true,
      "sourcePrompt": "Rebuild a marketing section in the spirit of Magic UI “Scroll Based Velocity”.\n\nScrolling text whose speed changes based on scroll speed\n\nComponent: scroll-based-velocity.\n\nLayout and motion character only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs. Magic UI Pro is out of scope.",
      "blockRecipe": [
        "hero-cover-statement-01"
      ]
    },
    {
      "id": "magicui-scratch-to-reveal",
      "title": "Magic UI — Scratch To Reveal",
      "collection": "hero",
      "category": "scratch-to-reveal",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
        "saas",
        "*"
      ],
      "motionType": [
        "text-effect",
        "entrance"
      ],
      "complexity": "moderate",
      "mobileSafe": true,
      "performanceClass": "B",
      "previewImage": "",
      "previewVideo": "",
      "islandReady": false,
      "isFree": true,
      "sourcePrompt": "Rebuild a marketing section in the spirit of Magic UI “Scratch To Reveal”.\n\nThe ScratchToReveal component creates an interactive scratch-off effect with customizable dimensions and animations, revealing hidden content beneath.\n\nComponent: scratch-to-reveal.\n\nLayout and motion character only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs. Magic UI Pro is out of scope.",
      "blockRecipe": [
        "hero-cover-statement-01"
      ]
    },
    {
      "id": "magicui-shiny-button",
      "title": "Magic UI — Shiny Button",
      "collection": "conversion",
      "category": "shiny-button",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
        "saas",
        "*"
      ],
      "motionType": [
        "hover",
        "entrance"
      ],
      "complexity": "moderate",
      "mobileSafe": true,
      "performanceClass": "B",
      "previewImage": "",
      "previewVideo": "",
      "islandReady": false,
      "isFree": true,
      "sourcePrompt": "Rebuild a marketing section in the spirit of Magic UI “Shiny Button”.\n\nA shiny button component with dynamic styles in the dark mode or light mode.\n\nComponent: shiny-button.\n\nLayout and motion character only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs. Magic UI Pro is out of scope.",
      "blockRecipe": [
        "cta-animated-border-01"
      ]
    },
    {
      "id": "magicui-box-reveal",
      "title": "Magic UI — Box Reveal Animation",
      "collection": "hero",
      "category": "box-reveal",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
        "saas",
        "*"
      ],
      "motionType": [
        "text-effect",
        "entrance"
      ],
      "complexity": "moderate",
      "mobileSafe": true,
      "performanceClass": "B",
      "previewImage": "",
      "previewVideo": "",
      "islandReady": false,
      "isFree": true,
      "sourcePrompt": "Rebuild a marketing section in the spirit of Magic UI “Box Reveal Animation”.\n\nSliding box animation that reveals text behind it.\n\nComponent: box-reveal.\n\nLayout and motion character only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs. Magic UI Pro is out of scope.",
      "blockRecipe": [
        "hero-cover-statement-01"
      ]
    },
    {
      "id": "magicui-shine-border",
      "title": "Magic UI — Shine Border",
      "collection": "features",
      "category": "shine-border",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
        "saas",
        "*"
      ],
      "motionType": [
        "entrance",
        "hover"
      ],
      "complexity": "moderate",
      "mobileSafe": true,
      "performanceClass": "B",
      "previewImage": "",
      "previewVideo": "",
      "islandReady": false,
      "isFree": true,
      "sourcePrompt": "Rebuild a marketing section in the spirit of Magic UI “Shine Border”.\n\nShine border is an animated background border effect.\n\nComponent: shine-border.\n\nLayout and motion character only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs. Magic UI Pro is out of scope.",
      "blockRecipe": [
        "features-grid-01"
      ]
    },
    {
      "id": "magicui-animated-circular-progress-bar",
      "title": "Magic UI — Animated Circular Progress Bar",
      "collection": "proof",
      "category": "animated-circular-progress-bar",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
        "saas",
        "*"
      ],
      "motionType": [
        "entrance",
        "text-effect"
      ],
      "complexity": "moderate",
      "mobileSafe": true,
      "performanceClass": "B",
      "previewImage": "",
      "previewVideo": "",
      "islandReady": false,
      "isFree": true,
      "sourcePrompt": "Rebuild a marketing section in the spirit of Magic UI “Animated Circular Progress Bar”.\n\nAnimated Circular Progress Bar is a component that displays a circular gauge with a percentage value.\n\nComponent: animated-circular-progress-bar.\n\nLayout and motion character only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs. Magic UI Pro is out of scope.",
      "blockRecipe": [
        "stats-counter-01"
      ]
    },
    {
      "id": "magicui-confetti",
      "title": "Magic UI — Confetti",
      "collection": "utility",
      "category": "confetti",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
        "saas",
        "*"
      ],
      "motionType": [
        "hover"
      ],
      "complexity": "moderate",
      "mobileSafe": true,
      "performanceClass": "B",
      "previewImage": "",
      "previewVideo": "",
      "islandReady": false,
      "isFree": true,
      "sourcePrompt": "Rebuild a marketing section in the spirit of Magic UI “Confetti”.\n\nConfetti animations are best used to delight your users when something special happens\n\nComponent: confetti.\n\nLayout and motion character only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs. Magic UI Pro is out of scope.",
      "blockRecipe": []
    },
    {
      "id": "magicui-animated-subscribe-button",
      "title": "Magic UI — Animated Subscribe Button",
      "collection": "utility",
      "category": "animated-subscribe-button",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
        "saas",
        "*"
      ],
      "motionType": [
        "hover"
      ],
      "complexity": "moderate",
      "mobileSafe": true,
      "performanceClass": "B",
      "previewImage": "",
      "previewVideo": "",
      "islandReady": false,
      "isFree": true,
      "sourcePrompt": "Rebuild a marketing section in the spirit of Magic UI “Animated Subscribe Button”.\n\nAn animated subscribe button useful for showing a micro animation from intial to final result.\n\nComponent: animated-subscribe-button.\n\nLayout and motion character only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs. Magic UI Pro is out of scope.",
      "blockRecipe": []
    },
    {
      "id": "magicui-cool-mode",
      "title": "Magic UI — Cool Mode",
      "collection": "utility",
      "category": "cool-mode",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
        "saas",
        "*"
      ],
      "motionType": [
        "hover"
      ],
      "complexity": "moderate",
      "mobileSafe": true,
      "performanceClass": "B",
      "previewImage": "",
      "previewVideo": "",
      "islandReady": false,
      "isFree": true,
      "sourcePrompt": "Rebuild a marketing section in the spirit of Magic UI “Cool Mode”.\n\nCool mode effect for buttons, links, and other DOMs\n\nComponent: cool-mode.\n\nLayout and motion character only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs. Magic UI Pro is out of scope.",
      "blockRecipe": []
    },
    {
      "id": "magicui-pulsating-button",
      "title": "Magic UI — Pulsating Button",
      "collection": "conversion",
      "category": "pulsating-button",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
        "saas",
        "*"
      ],
      "motionType": [
        "hover",
        "entrance"
      ],
      "complexity": "moderate",
      "mobileSafe": true,
      "performanceClass": "B",
      "previewImage": "",
      "previewVideo": "",
      "islandReady": false,
      "isFree": true,
      "sourcePrompt": "Rebuild a marketing section in the spirit of Magic UI “Pulsating Button”.\n\nAn animated pulsating button useful for capturing attention of users.\n\nComponent: pulsating-button.\n\nLayout and motion character only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs. Magic UI Pro is out of scope.",
      "blockRecipe": [
        "cta-animated-border-01"
      ]
    },
    {
      "id": "magicui-ripple-button",
      "title": "Magic UI — Ripple Button",
      "collection": "conversion",
      "category": "ripple-button",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
        "saas",
        "*"
      ],
      "motionType": [
        "hover",
        "entrance"
      ],
      "complexity": "moderate",
      "mobileSafe": true,
      "performanceClass": "B",
      "previewImage": "",
      "previewVideo": "",
      "islandReady": false,
      "isFree": true,
      "sourcePrompt": "Rebuild a marketing section in the spirit of Magic UI “Ripple Button”.\n\nAn animated button with ripple useful for user engagement.\n\nComponent: ripple-button.\n\nLayout and motion character only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs. Magic UI Pro is out of scope.",
      "blockRecipe": [
        "cta-animated-border-01"
      ]
    },
    {
      "id": "magicui-file-tree",
      "title": "Magic UI — File Tree",
      "collection": "saas",
      "category": "file-tree",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
        "saas",
        "*"
      ],
      "motionType": [
        "entrance"
      ],
      "complexity": "moderate",
      "mobileSafe": true,
      "performanceClass": "B",
      "previewImage": "",
      "previewVideo": "",
      "islandReady": false,
      "isFree": true,
      "sourcePrompt": "Rebuild a marketing section in the spirit of Magic UI “File Tree”.\n\nA component used to showcase the folder and file structure of a directory.\n\nComponent: file-tree.\n\nLayout and motion character only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs. Magic UI Pro is out of scope.",
      "blockRecipe": [
        "content-text-generate-01"
      ]
    },
    {
      "id": "magicui-blur-fade",
      "title": "Magic UI — Blur Fade",
      "collection": "interactive",
      "category": "blur-fade",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
        "saas",
        "*"
      ],
      "motionType": [
        "scroll-reveal",
        "entrance"
      ],
      "complexity": "moderate",
      "mobileSafe": true,
      "performanceClass": "B",
      "previewImage": "",
      "previewVideo": "",
      "islandReady": false,
      "isFree": true,
      "sourcePrompt": "Rebuild a marketing section in the spirit of Magic UI “Blur Fade”.\n\nBlur fade in and out animation. Used to smoothly fade in and out content.\n\nComponent: blur-fade.\n\nLayout and motion character only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs. Magic UI Pro is out of scope.",
      "blockRecipe": [
        "content-text-generate-01"
      ]
    },
    {
      "id": "magicui-safari",
      "title": "Magic UI — Safari",
      "collection": "interactive",
      "category": "safari",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
        "saas",
        "*"
      ],
      "motionType": [
        "entrance",
        "hover"
      ],
      "complexity": "moderate",
      "mobileSafe": true,
      "performanceClass": "B",
      "previewImage": "",
      "previewVideo": "",
      "islandReady": false,
      "isFree": true,
      "sourcePrompt": "Rebuild a marketing section in the spirit of Magic UI “Safari”.\n\nA safari browser mockup to showcase your website.\n\nComponent: safari.\n\nLayout and motion character only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs. Magic UI Pro is out of scope.",
      "blockRecipe": [
        "gallery-compare-slider-01"
      ]
    },
    {
      "id": "magicui-iphone-15-pro",
      "title": "Magic UI — iPhone 15 Pro",
      "collection": "interactive",
      "category": "iphone-15-pro",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
        "saas",
        "*"
      ],
      "motionType": [
        "entrance",
        "hover"
      ],
      "complexity": "moderate",
      "mobileSafe": true,
      "performanceClass": "B",
      "previewImage": "",
      "previewVideo": "",
      "islandReady": false,
      "isFree": true,
      "sourcePrompt": "Rebuild a marketing section in the spirit of Magic UI “iPhone 15 Pro”.\n\nA mockup of the iPhone 15 Pro\n\nComponent: iphone-15-pro.\n\nLayout and motion character only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs. Magic UI Pro is out of scope.",
      "blockRecipe": [
        "gallery-compare-slider-01"
      ]
    },
    {
      "id": "magicui-rainbow-button",
      "title": "Magic UI — Rainbow Button",
      "collection": "conversion",
      "category": "rainbow-button",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
        "saas",
        "*"
      ],
      "motionType": [
        "hover",
        "entrance"
      ],
      "complexity": "moderate",
      "mobileSafe": true,
      "performanceClass": "B",
      "previewImage": "",
      "previewVideo": "",
      "islandReady": false,
      "isFree": true,
      "sourcePrompt": "Rebuild a marketing section in the spirit of Magic UI “Rainbow Button”.\n\nAn animated button with a rainbow effect.\n\nComponent: rainbow-button.\n\nLayout and motion character only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs. Magic UI Pro is out of scope.",
      "blockRecipe": [
        "cta-animated-border-01"
      ]
    },
    {
      "id": "magicui-interactive-hover-button",
      "title": "Magic UI — interactive-hover-button",
      "collection": "conversion",
      "category": "interactive-hover-button",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
        "saas",
        "*"
      ],
      "motionType": [
        "hover",
        "entrance"
      ],
      "complexity": "moderate",
      "mobileSafe": true,
      "performanceClass": "B",
      "previewImage": "",
      "previewVideo": "",
      "islandReady": false,
      "isFree": true,
      "sourcePrompt": "Rebuild a marketing section in the spirit of Magic UI “interactive-hover-button”.\n\nComponent: interactive-hover-button.\n\nLayout and motion character only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs. Magic UI Pro is out of scope.",
      "blockRecipe": [
        "cta-animated-border-01"
      ]
    },
    {
      "id": "magicui-terminal",
      "title": "Magic UI — Terminal",
      "collection": "saas",
      "category": "terminal",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
        "saas",
        "*"
      ],
      "motionType": [
        "entrance"
      ],
      "complexity": "moderate",
      "mobileSafe": true,
      "performanceClass": "B",
      "previewImage": "",
      "previewVideo": "",
      "islandReady": false,
      "isFree": true,
      "sourcePrompt": "Rebuild a marketing section in the spirit of Magic UI “Terminal”.\n\nA terminal component\n\nComponent: terminal.\n\nLayout and motion character only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs. Magic UI Pro is out of scope.",
      "blockRecipe": [
        "content-text-generate-01"
      ]
    },
    {
      "id": "magicui-video-text",
      "title": "Magic UI — Video Text",
      "collection": "interactive",
      "category": "video-text",
      "pageType": "section",
      "style": [
        "bold",
        "modern"
      ],
      "industry": [
        "saas",
        "*"
      ],
      "motionType": [
        "entrance",
        "hover"
      ],
      "complexity": "moderate",
      "mobileSafe": true,
      "performanceClass": "B",
      "previewImage": "",
      "previewVideo": "",
      "islandReady": false,
      "isFree": true,
      "sourcePrompt": "Rebuild a marketing section in the spirit of Magic UI “Video Text”.\n\nA component that displays text with a video playing in the background.\n\nComponent: video-text.\n\nLayout and motion character only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs. Magic UI Pro is out of scope.",
      "blockRecipe": [
        "gallery-compare-slider-01"
      ]
    },
    {
      "id": "magicui-pixel-image",
      "title": "Magic UI — Pixel Image",
      "collection": "interactive",
      "category": "pixel-image",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
        "saas",
        "*"
      ],
      "motionType": [
        "entrance",
        "hover"
      ],
      "complexity": "moderate",
      "mobileSafe": true,
      "performanceClass": "B",
      "previewImage": "",
      "previewVideo": "",
      "islandReady": false,
      "isFree": true,
      "sourcePrompt": "Rebuild a marketing section in the spirit of Magic UI “Pixel Image”.\n\nA component that displays an image with a pixelated effect, creating a retro aesthetic.\n\nComponent: pixel-image.\n\nLayout and motion character only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs. Magic UI Pro is out of scope.",
      "blockRecipe": [
        "gallery-compare-slider-01"
      ]
    },
    {
      "id": "magicui-highlighter",
      "title": "Magic UI — Highlighter",
      "collection": "hero",
      "category": "highlighter",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
        "saas",
        "*"
      ],
      "motionType": [
        "text-effect",
        "entrance"
      ],
      "complexity": "moderate",
      "mobileSafe": true,
      "performanceClass": "B",
      "previewImage": "",
      "previewVideo": "",
      "islandReady": false,
      "isFree": true,
      "sourcePrompt": "Rebuild a marketing section in the spirit of Magic UI “Highlighter”.\n\nA text highlighter that mimics the effect of a human-drawn marker stroke.\n\nComponent: highlighter.\n\nLayout and motion character only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs. Magic UI Pro is out of scope.",
      "blockRecipe": [
        "hero-cover-statement-01"
      ]
    },
    {
      "id": "magicui-arc-timeline",
      "title": "Magic UI — Arc Timeline",
      "collection": "interactive",
      "category": "arc-timeline",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
        "saas",
        "*"
      ],
      "motionType": [
        "scroll-reveal",
        "entrance"
      ],
      "complexity": "moderate",
      "mobileSafe": true,
      "performanceClass": "B",
      "previewImage": "",
      "previewVideo": "",
      "islandReady": false,
      "isFree": true,
      "sourcePrompt": "Rebuild a marketing section in the spirit of Magic UI “Arc Timeline”.\n\nA curved timeline that elegantly visualizes key milestones, perfect for Web3 and AI roadmaps.\n\nComponent: arc-timeline.\n\nLayout and motion character only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs. Magic UI Pro is out of scope.",
      "blockRecipe": [
        "content-text-generate-01"
      ]
    },
    {
      "id": "magicui-animated-theme-toggler",
      "title": "Magic UI — Theme Toggler",
      "collection": "utility",
      "category": "animated-theme-toggler",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
        "saas",
        "*"
      ],
      "motionType": [
        "hover"
      ],
      "complexity": "moderate",
      "mobileSafe": true,
      "performanceClass": "B",
      "previewImage": "",
      "previewVideo": "",
      "islandReady": false,
      "isFree": true,
      "sourcePrompt": "Rebuild a marketing section in the spirit of Magic UI “Theme Toggler”.\n\nA component for theme changing animation.\n\nComponent: animated-theme-toggler.\n\nLayout and motion character only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs. Magic UI Pro is out of scope.",
      "blockRecipe": []
    },
    {
      "id": "magicui-grid-beams",
      "title": "Magic UI — Grid Beams",
      "collection": "interactive",
      "category": "grid-beams",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
        "saas",
        "*"
      ],
      "motionType": [
        "scroll-reveal",
        "entrance"
      ],
      "complexity": "moderate",
      "mobileSafe": true,
      "performanceClass": "B",
      "previewImage": "",
      "previewVideo": "",
      "islandReady": false,
      "isFree": true,
      "sourcePrompt": "Rebuild a marketing section in the spirit of Magic UI “Grid Beams”.\n\nA dynamic grid background with animated light beams rays and grid patterns.\n\nComponent: grid-beams.\n\nLayout and motion character only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs. Magic UI Pro is out of scope.",
      "blockRecipe": [
        "content-text-generate-01"
      ]
    },
    {
      "id": "magicui-recipe-hero-depth",
      "title": "Magic UI — Hero with visual depth",
      "collection": "hero",
      "category": "recipe",
      "pageType": "section",
      "style": [
        "premium",
        "modern"
      ],
      "industry": [
        "saas",
        "*"
      ],
      "motionType": [
        "entrance",
        "scroll-reveal",
        "particles"
      ],
      "complexity": "advanced",
      "mobileSafe": true,
      "performanceClass": "C",
      "previewImage": "",
      "previewVideo": "",
      "islandReady": false,
      "isFree": true,
      "sourcePrompt": "Rebuild a marketing section in the spirit of Magic UI “Magic UI — Hero with visual depth”.\n\nHero with animated background depth, blur-fade headline entrance, and one primary CTA. Keep at most two high-motion effects.\n\nSuggested Magic UI stack (inspiration only): warp-background, blur-fade, shiny-button.\n\nLayout and motion character only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs. Magic UI Pro is out of scope.",
      "blockRecipe": [
        "hero-agency-proof-01"
      ]
    },
    {
      "id": "magicui-recipe-trust-marquee",
      "title": "Magic UI — Testimonial and logo trust rail",
      "collection": "proof",
      "category": "recipe",
      "pageType": "section",
      "style": [
        "premium",
        "modern"
      ],
      "industry": [
        "saas",
        "*"
      ],
      "motionType": [
        "marquee",
        "entrance"
      ],
      "complexity": "moderate",
      "mobileSafe": true,
      "performanceClass": "B",
      "previewImage": "",
      "previewVideo": "",
      "islandReady": false,
      "isFree": true,
      "sourcePrompt": "Rebuild a marketing section in the spirit of Magic UI “Magic UI — Testimonial and logo trust rail”.\n\nSocial proof as a horizontal marquee with optional avatar clusters. Pause on hover/focus; keep copy short.\n\nSuggested Magic UI stack (inspiration only): marquee, avatar-circles.\n\nLayout and motion character only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs. Magic UI Pro is out of scope.",
      "blockRecipe": [
        "logos-orbit-01"
      ]
    },
    {
      "id": "magicui-recipe-feature-bento",
      "title": "Magic UI — Feature grid with motion highlights",
      "collection": "features",
      "category": "recipe",
      "pageType": "section",
      "style": [
        "premium",
        "modern"
      ],
      "industry": [
        "saas",
        "*"
      ],
      "motionType": [
        "entrance",
        "hover",
        "text-effect"
      ],
      "complexity": "advanced",
      "mobileSafe": true,
      "performanceClass": "B",
      "previewImage": "",
      "previewVideo": "",
      "islandReady": false,
      "isFree": true,
      "sourcePrompt": "Rebuild a marketing section in the spirit of Magic UI “Magic UI — Feature grid with motion highlights”.\n\nBento feature grid with motion emphasis on one or two cards only. Short, scannable card copy.\n\nSuggested Magic UI stack (inspiration only): bento-grid, text-animate.\n\nLayout and motion character only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs. Magic UI Pro is out of scope.",
      "blockRecipe": [
        "features-bento-grid-01"
      ]
    }
  ]
}
