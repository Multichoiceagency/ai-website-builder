/**
 * GENERATED — do not edit by hand.
 *
 * Produced by `packages/assets/scripts/import-library-demos.mjs`. Layout
 * arrangements only: no markup, no CSS, no component source, no third-party
 * asset URLs. Every `block` below is an id in our own registry, so a preset
 * renders entirely from code in this repository (ADR-0003).
 *
 * Regenerate with: pnpm --filter @platform/assets import:library-demos
 */
import type { AssetCatalog } from '@platform/schemas'

export const ASSET_CATALOG: AssetCatalog = {
  "version": 1,
  "generatedAt": "1970-01-01T00:00:00.000Z",
  "sources": [
    {
      "library": "platform",
      "url": "",
      "licence": "platform-owned",
      "importable": true,
      "attribution": "",
      "notes": "Arrangements authored for this platform from our own registry blocks. No third party is involved, so there is nothing to clear and nothing to attribute.",
      "evidenceUrl": "",
      "copyrightNotice": "",
      "noticeReadAt": "",
      "install": {
        "method": "none",
        "command": "",
        "docsUrl": "",
        "referenceDir": "",
        "cloneUrl": ""
      }
    },
    {
      "library": "shadcn/ui",
      "url": "https://ui.shadcn.com",
      "licence": "mit",
      "importable": true,
      "attribution": "",
      "notes": "CLEARED. MIT verified from the repository LICENSE. Built on an explicit copy-into-your-project model. Scope: the whole public catalogue; there is no paid tier to separate. CLEARED BUT UNUSED: no preset in the catalogue derives from this source today. The clearance stands for future work; it is not a record that anything was taken.",
      "evidenceUrl": "https://raw.githubusercontent.com/shadcn-ui/ui/main/LICENSE.md",
      "copyrightNotice": "Copyright (c) 2023 shadcn",
      "noticeReadAt": "reference/shadcn-ui/LICENSE.md",
      "install": {
        "method": "npx",
        "command": "npx shadcn@latest add",
        "docsUrl": "https://ui.shadcn.com/docs/cli",
        "referenceDir": "reference/shadcn-ui",
        "cloneUrl": "https://github.com/shadcn-ui/ui.git"
      }
    },
    {
      "library": "Magic UI",
      "url": "https://magicui.design",
      "licence": "mit",
      "importable": true,
      "attribution": "",
      "notes": "CLEARED, FREE REPO ONLY. MIT verified from the LICENSE in magicuidesign/magicui. Magic UI Pro is a separate paid product (templates and premium components) that is NOT in the MIT repository and is out of scope — never derive from a Pro component. ACTIVE: free registry UI + docs recipes import via `pnpm --filter @platform/templates import:magicui` (layout recipes / rebuild briefs only — ADR-0003). Asset presets regenerate with `import:library-demos` after that script writes `magicui-demos.generated.json`.",
      "evidenceUrl": "https://github.com/magicuidesign/magicui/blob/main/LICENSE.md",
      "copyrightNotice": "Copyright (c) Magic UI",
      "noticeReadAt": "reference/magicui/LICENSE.md",
      "install": {
        "method": "npx",
        "command": "pnpm --filter @platform/templates import:magicui",
        "docsUrl": "https://magicui.design/docs/installation",
        "referenceDir": "reference/magicui",
        "cloneUrl": "https://github.com/magicuidesign/magicui.git"
      }
    },
    {
      "library": "Vengeance UI",
      "url": "https://github.com/Ashutoshx7/VengeanceUI",
      "licence": "mit",
      "importable": true,
      "attribution": "",
      "notes": "CLEARED. MIT verified from the LICENSE in Ashutoshx7/VengeanceUI. PINNED to that repository specifically: the name is duplicated across mirrors and several domains claim it, so a lookup by name is not sufficient identification. CLEARED BUT UNUSED: no preset in the catalogue derives from this source today. The clearance stands for future work; it is not a record that anything was taken.",
      "evidenceUrl": "https://github.com/Ashutoshx7/VengeanceUI/blob/main/LICENSE",
      "copyrightNotice": "Copyright (c) 2025-2026 Ashutoshx7",
      "noticeReadAt": "reference/vengeance-ui/LICENSE",
      "install": {
        "method": "git-clone",
        "command": "pnpm --filter @platform/assets pull -- \"Vengeance UI\"",
        "docsUrl": "https://github.com/Ashutoshx7/VengeanceUI",
        "referenceDir": "reference/vengeance-ui",
        "cloneUrl": "https://github.com/Ashutoshx7/VengeanceUI.git"
      }
    },
    {
      "library": "HyperUI",
      "url": "https://hyperui.dev",
      "licence": "mit",
      "importable": true,
      "attribution": "",
      "notes": "CLEARED. MIT verified from the LICENSE in markmead/hyperui. Note the commonly cited hyperui-dev/hyperui is a 404; markmead/hyperui is the real repository. CLEARED BUT UNUSED: no preset in the catalogue derives from this source today. The clearance stands for future work; it is not a record that anything was taken.",
      "evidenceUrl": "https://github.com/markmead/hyperui/blob/main/LICENSE",
      "copyrightNotice": "Copyright (c) Mark Mead",
      "noticeReadAt": "reference/hyperui/LICENSE",
      "install": {
        "method": "git-clone",
        "command": "pnpm --filter @platform/assets pull -- HyperUI",
        "docsUrl": "https://hyperui.dev",
        "referenceDir": "reference/hyperui",
        "cloneUrl": "https://github.com/markmead/hyperui.git"
      }
    },
    {
      "library": "Flowbite",
      "url": "https://flowbite.com",
      "licence": "mit",
      "importable": true,
      "attribution": "",
      "notes": "CLEARED, FREE REPO ONLY. MIT verified by reading LICENSE.md in the themesberg/flowbite clone. The copyright holder is Bergside Inc., NOT 'Themesberg' — the GitHub org and the copyright holder are different entities and only the latter is legally operative. THIS ENTRY COVERS themesberg/flowbite ONLY: the Vue bindings (flowbite-vue) are a separate repository with a different copyright holder and have their own entry. Flowbite Pro and Flowbite Blocks are sold separately, are NOT covered by this MIT licence, and are out of scope. CLEARED BUT UNUSED: no preset in the catalogue derives from this source today.",
      "evidenceUrl": "https://github.com/themesberg/flowbite/blob/main/LICENSE.md",
      "copyrightNotice": "Copyright (c) 2023 Bergside Inc.",
      "noticeReadAt": "reference/flowbite/LICENSE.md",
      "install": {
        "method": "git-clone",
        "command": "pnpm --filter @platform/assets pull -- Flowbite",
        "docsUrl": "https://flowbite.com/docs/getting-started/quickstart/",
        "referenceDir": "reference/flowbite",
        "cloneUrl": "https://github.com/themesberg/flowbite.git"
      }
    },
    {
      "library": "Aceternity UI",
      "url": "https://ui.aceternity.com",
      "licence": "proprietary",
      "importable": false,
      "attribution": "",
      "notes": "REFUSED. NOT MIT — search results and secondary sites widely repeat that claim and it is false; the primary licence page contradicts it. Ships a custom 'Aceternity License' that prohibits creating 'themes, templates, or derivative products to sell on any marketplace'. We are a website builder that ships layouts to paying customers, which lands squarely in that clause. No official public source repository exists either. Do not derive, do not proxy, do not import at runtime.",
      "evidenceUrl": "https://ui.aceternity.com/licence",
      "copyrightNotice": "",
      "noticeReadAt": "",
      "install": {
        "method": "none",
        "command": "",
        "docsUrl": "https://ui.aceternity.com/licence",
        "referenceDir": "",
        "cloneUrl": ""
      }
    },
    {
      "library": "Skiper UI",
      "url": "https://skiper-ui.com",
      "licence": "unknown",
      "importable": false,
      "attribution": "",
      "notes": "REFUSED. No LICENSE file, no named licence, no official repository — the GitHub hits are third-party clones. The site states only 'free to use and modify' with mandatory attribution, which is a terms-of-use blurb rather than a licence grant. Worse, the author states most components are 'recreations of existing designs', so the chain of title is unclear upstream of them too: even their permission would not settle whose design it is.",
      "evidenceUrl": "https://skiper-ui.com/docs/quick-start",
      "copyrightNotice": "",
      "noticeReadAt": "",
      "install": {
        "method": "none",
        "command": "",
        "docsUrl": "https://skiper-ui.com/docs/quick-start",
        "referenceDir": "",
        "cloneUrl": ""
      }
    },
    {
      "library": "Preline UI",
      "url": "https://preline.co",
      "licence": "unknown",
      "importable": false,
      "attribution": "",
      "notes": "REFUSED PENDING LEGAL. Dual-licensed MIT + 'Preline UI Fair Use License'. GitHub classifies the repository as NOASSERTION, not plain MIT. The Fair Use terms forbid use in 'any product or service that directly competes with Preline UI'. Ours plausibly does, so this is a commercial judgement rather than an engineering one. Recorded as unknown because the effective permission is unresolved, not because no licence was found.",
      "evidenceUrl": "https://github.com/htmlstreamofficial/preline/blob/main/LICENSE",
      "copyrightNotice": "",
      "noticeReadAt": "",
      "install": {
        "method": "none",
        "command": "",
        "docsUrl": "https://preline.co",
        "referenceDir": "",
        "cloneUrl": ""
      }
    },
    {
      "library": "flowbite-vue",
      "url": "https://github.com/themesberg/flowbite-vue",
      "licence": "mit",
      "importable": true,
      "copyrightNotice": "Copyright (c) 2022 Themesberg (Crafty Dwarf LLC) company@themesberg.com",
      "noticeReadAt": "node_modules/flowbite-vue/LICENSE.md (flowbite-vue@0.4.0)",
      "attribution": "",
      "notes": "CLEARED. A SEPARATE REPOSITORY from themesberg/flowbite, with a different copyright holder — Crafty Dwarf LLC here, Bergside Inc. there. Read from the installed package's own LICENSE.md rather than inferred from the sibling repo or the npm summary. Installed as a root devDependency; nothing in apps/, packages/ or services/ imports it. CLEARED BUT UNUSED: no preset derives from it today.",
      "evidenceUrl": "https://github.com/themesberg/flowbite-vue",
      "install": {
        "method": "npx",
        "command": "pnpm add -wD flowbite-vue",
        "docsUrl": "https://flowbite-vue.com",
        "referenceDir": "",
        "cloneUrl": "https://github.com/themesberg/flowbite-vue.git"
      }
    },
    {
      "library": "shadcn-vue",
      "url": "https://github.com/unovue/shadcn-vue",
      "licence": "mit",
      "importable": true,
      "copyrightNotice": "Copyright (c) 2023 unovue",
      "noticeReadAt": "node_modules/shadcn-vue/LICENSE (shadcn-vue@2.8.1)",
      "attribution": "",
      "notes": "CLEARED. The Vue port of shadcn/ui, and a DIFFERENT copyright holder from the React original (unovue, not shadcn) — the port is not covered by the upstream entry. Read from the installed package's own LICENSE. It is a CLI that fetches components on demand rather than shipping them. CLEARED BUT UNUSED: no preset derives from it today.",
      "evidenceUrl": "https://github.com/unovue/shadcn-vue",
      "install": {
        "method": "npx",
        "command": "npx shadcn-vue@latest add",
        "docsUrl": "https://www.shadcn-vue.com/docs/cli",
        "referenceDir": "reference/shadcn-vue",
        "cloneUrl": "https://github.com/unovue/shadcn-vue.git"
      }
    },
    {
      "library": "Shadcn Space",
      "url": "https://shadcnspace.com",
      "licence": "mit",
      "importable": true,
      "attribution": "",
      "notes": "CLEARED, FREE ONLY. MIT verified from github.com/shadcnspace/shadcnspace LICENSE (Copyright (c) 2026 Shadcn Space). Scope: free blocks + public component examples from a local library checkout (`shadcnspace-library` / `shadcnspace-components`), plus full free landing-page briefs from a local templates scrape (`~/Documents/shadcnspace-templates`). Pro-locked registry items (manifest `proLocked` / `pro-forbidden.json`) are OUT OF SCOPE — never import. Importer takes layout recipes only (ADR-0003): no React/TSX, shared/ui primitives, or CDN assets into CMS pages. Templates: `pnpm --filter @platform/templates import:shadcnspace` and `import:shadcnspace-landings`. Asset presets: regenerate via `import:library-demos` after those scripts write `shadcnspace-*-demos.generated.json`.",
      "evidenceUrl": "https://raw.githubusercontent.com/shadcnspace/shadcnspace/main/LICENSE",
      "copyrightNotice": "Copyright (c) 2026 Shadcn Space",
      "noticeReadAt": "https://raw.githubusercontent.com/shadcnspace/shadcnspace/main/LICENSE",
      "install": {
        "method": "git-clone",
        "command": "pnpm --filter @platform/templates import:shadcnspace",
        "docsUrl": "https://shadcnspace.com",
        "referenceDir": "",
        "cloneUrl": "https://github.com/shadcnspace/shadcnspace.git"
      }
    },
    {
      "library": "Nuxt UI",
      "url": "https://ui.nuxt.com",
      "licence": "mit",
      "importable": true,
      "copyrightNotice": "Copyright (c) 2023 Nuxt",
      "noticeReadAt": "https://github.com/nuxt/ui/blob/v4/LICENSE.md",
      "attribution": "",
      "notes": "CLEARED. MIT verified from nuxt/ui LICENSE.md (v4). Free and open-source. Reference / inspiration only — do not add @nuxt/ui as a shipped dependency of customer pages (ADR-0003 / UI-LIBRARIES). CLEARED FOR LAYOUT RECIPES AND FIRST-PARTY PORTS.",
      "evidenceUrl": "https://github.com/nuxt/ui/blob/v4/LICENSE.md",
      "install": {
        "method": "npx",
        "command": "npx nuxi@latest module add ui",
        "docsUrl": "https://ui.nuxt.com/docs/getting-started/installation/nuxt",
        "referenceDir": "reference/nuxt-ui",
        "cloneUrl": "https://github.com/nuxt/ui.git"
      }
    }
  ],
  "presets": [
    {
      "id": "hero-with-proof",
      "tier": "platform",
      "name": "Hero with logo proof",
      "description": "A split hero followed immediately by a customer logo strip — the fastest way to make a first screen credible.",
      "collection": "hero",
      "tags": [
        "hero",
        "proof",
        "light"
      ],
      "sections": [
        {
          "id": "sec_hero-with-proof_0",
          "block": "hero-split-01",
          "props": {
            "eyebrow": "",
            "headline": "A headline that says what you do",
            "subheadline": "One or two sentences explaining who you help and why they should call you.",
            "primaryLabel": "Request a quote",
            "primaryHref": "/contact",
            "secondaryLabel": "",
            "secondaryHref": "",
            "image": "",
            "imageAlt": ""
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "load",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_hero-with-proof_1",
          "block": "logos-strip-01",
          "props": {
            "heading": "Trusted by",
            "items": [
              {
                "name": "Client one",
                "image": ""
              },
              {
                "name": "Client two",
                "image": ""
              },
              {
                "name": "Client three",
                "image": ""
              }
            ]
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "B",
      "thumbnail": "",
      "licence": "platform-owned",
      "attribution": "",
      "source": {
        "library": "",
        "demo": "",
        "url": "",
        "derivation": "none"
      },
      "fingerprint": "02e3542cdfbb1319a7b5fd4a803eab770d6b55a0",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "hero-aurora-stats",
      "tier": "platform",
      "name": "Aurora hero with numbers",
      "description": "A luminous hero over a band of headline figures. Heavier than the split hero — pick it when the first screen is doing the selling.",
      "collection": "hero",
      "tags": [
        "hero",
        "dark",
        "stats"
      ],
      "sections": [
        {
          "id": "sec_hero-aurora-stats_0",
          "block": "hero-aurora-01",
          "props": {
            "eyebrow": "",
            "headline": "Software that feels inevitable",
            "subheadline": "One sentence that explains the product without explaining the industry.",
            "primaryLabel": "Get started",
            "primaryHref": "/contact",
            "secondaryLabel": "",
            "secondaryHref": "",
            "image": "",
            "video": "",
            "imageAlt": "",
            "intensity": "subtle"
          },
          "motion": {
            "preset": "hero-reveal",
            "trigger": "load",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_hero-aurora-stats_1",
          "block": "stats-band-01",
          "props": {
            "items": [
              {
                "value": "15+",
                "label": "Years in business"
              },
              {
                "value": "2 500",
                "label": "Jobs completed"
              },
              {
                "value": "4.9",
                "label": "Average rating"
              }
            ]
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "C",
      "thumbnail": "",
      "licence": "platform-owned",
      "attribution": "",
      "source": {
        "library": "",
        "demo": "",
        "url": "",
        "derivation": "none"
      },
      "fingerprint": "6860cd94d85e1ae7fee39aa6402551118045e9a0",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "page-shell",
      "tier": "platform",
      "name": "Header and footer shell",
      "description": "Navigation and footer with nothing between them — the two sections every page needs, ready for content.",
      "collection": "navigation",
      "tags": [
        "header",
        "footer",
        "shell"
      ],
      "sections": [
        {
          "id": "sec_page-shell_0",
          "block": "header-simple-01",
          "props": {
            "brand": "Your business",
            "logo": "",
            "links": [
              {
                "label": "Services",
                "href": "/services"
              },
              {
                "label": "About",
                "href": "/about"
              },
              {
                "label": "Contact",
                "href": "/contact"
              }
            ],
            "ctaLabel": "Request a quote",
            "ctaHref": "/contact",
            "sticky": true
          },
          "motion": {
            "preset": "none",
            "trigger": "none",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_page-shell_1",
          "block": "footer-simple-01",
          "props": {
            "brand": "Your business",
            "tagline": "",
            "phone": "",
            "email": "",
            "address": "",
            "links": [
              {
                "label": "Privacy",
                "href": "/privacy"
              },
              {
                "label": "Terms",
                "href": "/terms"
              }
            ],
            "legal": ""
          },
          "motion": {
            "preset": "none",
            "trigger": "none",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "A",
      "thumbnail": "",
      "licence": "platform-owned",
      "attribution": "",
      "source": {
        "library": "",
        "demo": "",
        "url": "",
        "derivation": "none"
      },
      "fingerprint": "1fc48dce5e09a50f05366c58727143990331867a",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "feature-trio",
      "tier": "platform",
      "name": "Feature grid with spotlight",
      "description": "A three-up grid of capabilities, then one of them expanded. Breadth first, then depth on the one that matters.",
      "collection": "features",
      "tags": [
        "features",
        "grid",
        "light"
      ],
      "sections": [
        {
          "id": "sec_feature-trio_0",
          "block": "features-grid-01",
          "props": {
            "eyebrow": "",
            "heading": "Why clients choose us",
            "intro": "",
            "items": [
              {
                "icon": "clock",
                "title": "Available 24/7",
                "description": "Call us any time, we pick up."
              },
              {
                "icon": "shield",
                "title": "Fully insured",
                "description": "Certified and covered work."
              },
              {
                "icon": "star",
                "title": "Rated 4.9",
                "description": "Based on verified customer reviews."
              }
            ]
          },
          "motion": {
            "preset": "stagger-children",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_feature-trio_1",
          "block": "feature-spotlight-01",
          "props": {
            "heading": "What you get",
            "items": [
              {
                "title": "Fast to start",
                "description": "Live in a day, not a quarter."
              },
              {
                "title": "Built to last",
                "description": "Maintained, monitored, supported."
              },
              {
                "title": "Priced clearly",
                "description": "One number, agreed up front."
              }
            ]
          },
          "motion": {
            "preset": "stagger-children",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "B",
      "thumbnail": "",
      "licence": "platform-owned",
      "attribution": "",
      "source": {
        "library": "",
        "demo": "",
        "url": "",
        "derivation": "none"
      },
      "fingerprint": "dc1406fd6d5023dcf1d4bb0bf6a5de2ae4380aa1",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "sticky-feature-story",
      "tier": "platform",
      "name": "Sticky feature story",
      "description": "Scroll-pinned feature stack closing on a call to action. Cinematic pacing; costs more to render than a grid.",
      "collection": "features",
      "tags": [
        "features",
        "scroll",
        "sticky"
      ],
      "sections": [
        {
          "id": "sec_sticky-feature-story_0",
          "block": "features-sticky-stack-01",
          "props": {
            "heading": "How the work goes",
            "intro": "",
            "items": [
              {
                "icon": "phone",
                "title": "We talk first",
                "description": "Twenty minutes to understand the job properly."
              },
              {
                "icon": "wrench",
                "title": "We plan the work",
                "description": "A written scope, a date and a fixed price."
              },
              {
                "icon": "check",
                "title": "We finish it",
                "description": "Delivered, tested and handed over — not \"nearly done\"."
              }
            ]
          },
          "motion": {
            "preset": "none",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_sticky-feature-story_1",
          "block": "cta-banner-01",
          "props": {
            "heading": "Need help today?",
            "body": "Call us and speak to someone who can actually come out.",
            "ctaLabel": "Request a quote",
            "ctaHref": "/contact",
            "tone": "primary"
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "C",
      "thumbnail": "",
      "licence": "platform-owned",
      "attribution": "",
      "source": {
        "library": "",
        "demo": "",
        "url": "",
        "derivation": "none"
      },
      "fingerprint": "6844c7d7cedc21aa56760689ba5a5ff454f42d43",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "social-proof-stack",
      "tier": "platform",
      "name": "Social proof stack",
      "description": "Testimonials, then logos, then the numbers. Three kinds of evidence in the order people find them convincing.",
      "collection": "proof",
      "tags": [
        "testimonials",
        "logos",
        "stats"
      ],
      "sections": [
        {
          "id": "sec_social-proof-stack_0",
          "block": "testimonials-grid-01",
          "props": {
            "heading": "What customers say",
            "items": [
              {
                "quote": "Fast, friendly and the price was exactly as quoted.",
                "author": "A. de Vries",
                "role": "Rotterdam",
                "rating": 5
              },
              {
                "quote": "Fixed the problem the same afternoon.",
                "author": "M. Jansen",
                "role": "Schiedam",
                "rating": 5
              }
            ]
          },
          "motion": {
            "preset": "stagger-children",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_social-proof-stack_1",
          "block": "logos-strip-01",
          "props": {
            "heading": "Trusted by",
            "items": [
              {
                "name": "Client one",
                "image": ""
              },
              {
                "name": "Client two",
                "image": ""
              },
              {
                "name": "Client three",
                "image": ""
              }
            ]
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_social-proof-stack_2",
          "block": "stats-band-01",
          "props": {
            "items": [
              {
                "value": "15+",
                "label": "Years in business"
              },
              {
                "value": "2 500",
                "label": "Jobs completed"
              },
              {
                "value": "4.9",
                "label": "Average rating"
              }
            ]
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "A",
      "thumbnail": "",
      "licence": "platform-owned",
      "attribution": "",
      "source": {
        "library": "",
        "demo": "",
        "url": "",
        "derivation": "none"
      },
      "fingerprint": "2f6b8c34284e4985a3347ed2e48ee9c3040122b8",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "proof-in-motion",
      "tier": "platform",
      "name": "Proof in motion",
      "description": "A testimonial marquee over counting figures. Reads as momentum rather than as a list.",
      "collection": "proof",
      "tags": [
        "testimonials",
        "marquee",
        "stats"
      ],
      "sections": [
        {
          "id": "sec_proof-in-motion_0",
          "block": "testimonials-marquee-01",
          "props": {
            "heading": "What customers say",
            "speed": "slow",
            "items": [
              {
                "quote": "Turned up when they said, finished when they said.",
                "author": "A. de Vries",
                "role": "Rotterdam",
                "rating": 5
              },
              {
                "quote": "The quote was the price. That alone is worth it.",
                "author": "M. Jansen",
                "role": "Schiedam",
                "rating": 5
              },
              {
                "quote": "Tidy, quiet and gone by four.",
                "author": "S. Bakker",
                "role": "Delft",
                "rating": 5
              },
              {
                "quote": "Explained the options without selling me the expensive one.",
                "author": "R. Visser",
                "role": "Vlaardingen",
                "rating": 5
              }
            ]
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_proof-in-motion_1",
          "block": "stats-counter-01",
          "props": {
            "items": [
              {
                "value": 15,
                "suffix": "+",
                "label": "Years in business"
              },
              {
                "value": 2500,
                "suffix": "",
                "label": "Jobs completed"
              },
              {
                "value": 49,
                "suffix": "",
                "label": "Average rating ×10"
              }
            ]
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "B",
      "thumbnail": "",
      "licence": "platform-owned",
      "attribution": "",
      "source": {
        "library": "",
        "demo": "",
        "url": "",
        "derivation": "none"
      },
      "fingerprint": "1dd3a13347422fe4d2bb58bd1bc3238e226a704f",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "pricing-with-faq",
      "tier": "platform",
      "name": "Pricing with FAQ",
      "description": "A monthly/annual pricing table with the objections answered directly beneath it, where they get read.",
      "collection": "pricing",
      "tags": [
        "pricing",
        "faq",
        "conversion"
      ],
      "sections": [
        {
          "id": "sec_pricing-with-faq_0",
          "block": "pricing-toggle-01",
          "props": {
            "heading": "Simple pricing",
            "intro": "",
            "monthlyLabel": "Monthly",
            "yearlyLabel": "Yearly",
            "yearlyNote": "Two months free",
            "items": [
              {
                "name": "Starter",
                "monthlyPrice": "€49",
                "yearlyPrice": "€490",
                "period": "/month",
                "description": "For a single site that needs to look after itself.",
                "featureList": "One website\nHosting and backups\nE-mail support",
                "ctaLabel": "Choose Starter",
                "ctaHref": "/contact",
                "featured": false
              },
              {
                "name": "Growth",
                "monthlyPrice": "€149",
                "yearlyPrice": "€1490",
                "period": "/month",
                "description": "For a business that markets as well as it delivers.",
                "featureList": "Everything in Starter\nSEO and analytics\nMonthly content changes\nPriority support",
                "ctaLabel": "Choose Growth",
                "ctaHref": "/contact",
                "featured": true
              },
              {
                "name": "Scale",
                "monthlyPrice": "€399",
                "yearlyPrice": "€3990",
                "period": "/month",
                "description": "For multiple brands, shops or locations.",
                "featureList": "Everything in Growth\nMultiple sites\nCommerce and CRM\nNamed contact",
                "ctaLabel": "Talk to us",
                "ctaHref": "/contact",
                "featured": false
              }
            ]
          },
          "motion": {
            "preset": "stagger-children",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_pricing-with-faq_1",
          "block": "faq-accordion-01",
          "props": {
            "heading": "Frequently asked questions",
            "items": [
              {
                "question": "How quickly can you come out?",
                "answer": "Usually the same day."
              },
              {
                "question": "What does it cost?",
                "answer": "We quote up front, with no call-out fee."
              }
            ]
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "B",
      "thumbnail": "",
      "licence": "platform-owned",
      "attribution": "",
      "source": {
        "library": "",
        "demo": "",
        "url": "",
        "derivation": "none"
      },
      "fingerprint": "547b7982af53adcbccc89b70a8400d39eaa61fd6",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "closing-cta",
      "tier": "platform",
      "name": "Closing call to action",
      "description": "A high-contrast final ask, then the footer. The end of a landing page.",
      "collection": "conversion",
      "tags": [
        "cta",
        "footer",
        "conversion"
      ],
      "sections": [
        {
          "id": "sec_closing-cta_0",
          "block": "cta-high-contrast-01",
          "props": {
            "heading": "Need help today?",
            "body": "Call us and speak to someone who can actually come out.",
            "ctaLabel": "Request a quote",
            "ctaHref": "/contact",
            "tone": "primary",
            "kicker": ""
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_closing-cta_1",
          "block": "footer-simple-01",
          "props": {
            "brand": "Your business",
            "tagline": "",
            "phone": "",
            "email": "",
            "address": "",
            "links": [
              {
                "label": "Privacy",
                "href": "/privacy"
              },
              {
                "label": "Terms",
                "href": "/terms"
              }
            ],
            "legal": ""
          },
          "motion": {
            "preset": "none",
            "trigger": "none",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "A",
      "thumbnail": "",
      "licence": "platform-owned",
      "attribution": "",
      "source": {
        "library": "",
        "demo": "",
        "url": "",
        "derivation": "none"
      },
      "fingerprint": "0ca64ada64c0937ffe8279642d0739a9134cafde",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "contact-close",
      "tier": "platform",
      "name": "Contact and footer",
      "description": "Contact details above the footer, for pages that end in a conversation rather than a purchase.",
      "collection": "conversion",
      "tags": [
        "contact",
        "footer"
      ],
      "sections": [
        {
          "id": "sec_contact-close_0",
          "block": "contact-details-01",
          "props": {
            "heading": "Get in touch",
            "intro": "",
            "phone": "",
            "email": "",
            "street": "",
            "postalCode": "",
            "city": "",
            "hours": "Monday–Friday 08:00–18:00\nSaturday 09:00–13:00",
            "showMap": true
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_contact-close_1",
          "block": "footer-simple-01",
          "props": {
            "brand": "Your business",
            "tagline": "",
            "phone": "",
            "email": "",
            "address": "",
            "links": [
              {
                "label": "Privacy",
                "href": "/privacy"
              },
              {
                "label": "Terms",
                "href": "/terms"
              }
            ],
            "legal": ""
          },
          "motion": {
            "preset": "none",
            "trigger": "none",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "A",
      "thumbnail": "",
      "licence": "platform-owned",
      "attribution": "",
      "source": {
        "library": "",
        "demo": "",
        "url": "",
        "derivation": "none"
      },
      "fingerprint": "46e33229110896903787df1bb0e63ba26b81692d",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "editorial-story",
      "tier": "platform",
      "name": "Editorial story",
      "description": "A manifesto statement leading into a scroll-told story. For about pages that are meant to be read, not skimmed.",
      "collection": "content",
      "tags": [
        "about",
        "editorial",
        "scroll"
      ],
      "sections": [
        {
          "id": "sec_editorial-story_0",
          "block": "content-manifesto-01",
          "props": {
            "heading": "",
            "body": "We would rather ship one thing that works than five that demo well.",
            "attribution": "",
            "tone": "dark"
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_editorial-story_1",
          "block": "about-scroll-story-01",
          "props": {
            "heading": "How we got here",
            "image": "",
            "imageAlt": "",
            "items": [
              {
                "year": "2014",
                "title": "Two of us and a van",
                "description": "One town, word of mouth, no website."
              },
              {
                "year": "2019",
                "title": "A proper workshop",
                "description": "Room to prefabricate meant shorter jobs on site."
              },
              {
                "year": "2024",
                "title": "Twelve people",
                "description": "Same standard of work, more of it, still local."
              }
            ]
          },
          "motion": {
            "preset": "none",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "C",
      "thumbnail": "",
      "licence": "platform-owned",
      "attribution": "",
      "source": {
        "library": "",
        "demo": "",
        "url": "",
        "derivation": "none"
      },
      "fingerprint": "d044d24692aefd2d29bca6ecc7a8600b2fa55ca2",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "team-and-words",
      "tier": "platform",
      "name": "Team and prose",
      "description": "An editorial team index followed by a rich-text block. Who we are, then what we think.",
      "collection": "content",
      "tags": [
        "team",
        "about",
        "content"
      ],
      "sections": [
        {
          "id": "sec_team-and-words_0",
          "block": "team-editorial-01",
          "props": {
            "heading": "The people who do the work",
            "intro": "",
            "items": [
              {
                "name": "A. de Vries",
                "role": "Founder",
                "image": "",
                "imageAlt": ""
              },
              {
                "name": "M. Jansen",
                "role": "Lead engineer",
                "image": "",
                "imageAlt": ""
              },
              {
                "name": "S. Bakker",
                "role": "Design",
                "image": "",
                "imageAlt": ""
              }
            ]
          },
          "motion": {
            "preset": "stagger-children",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_team-and-words_1",
          "block": "content-richtext-01",
          "props": {
            "heading": "",
            "body": "Write about your business here."
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "A",
      "thumbnail": "",
      "licence": "platform-owned",
      "attribution": "",
      "source": {
        "library": "",
        "demo": "",
        "url": "",
        "derivation": "none"
      },
      "fingerprint": "d555ecfeade877d7c1bd60d063144dc17d89f93a",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "docs-page-shell",
      "tier": "platform",
      "name": "Documentation page shell",
      "description": "Navigation, a long-form prose column, footer. The shape a documentation or changelog page wants.",
      "collection": "navigation",
      "tags": [
        "docs",
        "content",
        "shell"
      ],
      "sections": [
        {
          "id": "sec_docs-page-shell_0",
          "block": "header-simple-01",
          "props": {
            "brand": "Your business",
            "logo": "",
            "links": [
              {
                "label": "Services",
                "href": "/services"
              },
              {
                "label": "About",
                "href": "/about"
              },
              {
                "label": "Contact",
                "href": "/contact"
              }
            ],
            "ctaLabel": "Request a quote",
            "ctaHref": "/contact",
            "sticky": true
          },
          "motion": {
            "preset": "none",
            "trigger": "none",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_docs-page-shell_1",
          "block": "content-richtext-01",
          "props": {
            "heading": "",
            "body": "Write about your business here."
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_docs-page-shell_2",
          "block": "footer-simple-01",
          "props": {
            "brand": "Your business",
            "tagline": "",
            "phone": "",
            "email": "",
            "address": "",
            "links": [
              {
                "label": "Privacy",
                "href": "/privacy"
              },
              {
                "label": "Terms",
                "href": "/terms"
              }
            ],
            "legal": ""
          },
          "motion": {
            "preset": "none",
            "trigger": "none",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "A",
      "thumbnail": "",
      "licence": "platform-owned",
      "attribution": "",
      "source": {
        "library": "",
        "demo": "",
        "url": "",
        "derivation": "none"
      },
      "fingerprint": "6605b98b9d3b56924715ec7da8020d2cbeae2fff",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "clean-hero-close",
      "tier": "platform",
      "name": "Clean hero and close",
      "description": "A centred hero, customer logos, then the ask. Light, unfussy, and every section class A.",
      "collection": "hero",
      "tags": [
        "hero",
        "light",
        "conversion"
      ],
      "sections": [
        {
          "id": "sec_clean-hero-close_0",
          "block": "hero-centered-01",
          "props": {
            "eyebrow": "",
            "headline": "A headline that says what you do",
            "subheadline": "One or two sentences explaining who you help and why they should call you.",
            "primaryLabel": "Request a quote",
            "primaryHref": "/contact",
            "secondaryLabel": "",
            "secondaryHref": "",
            "align": "center"
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "load",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_clean-hero-close_1",
          "block": "logos-strip-01",
          "props": {
            "heading": "Trusted by",
            "items": [
              {
                "name": "Client one",
                "image": ""
              },
              {
                "name": "Client two",
                "image": ""
              },
              {
                "name": "Client three",
                "image": ""
              }
            ]
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_clean-hero-close_2",
          "block": "cta-banner-01",
          "props": {
            "heading": "Need help today?",
            "body": "Call us and speak to someone who can actually come out.",
            "ctaLabel": "Request a quote",
            "ctaHref": "/contact",
            "tone": "primary"
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "A",
      "thumbnail": "",
      "licence": "platform-owned",
      "attribution": "",
      "source": {
        "library": "",
        "demo": "",
        "url": "",
        "derivation": "none"
      },
      "fingerprint": "01f7d32bf4ab1b4e01174e1935a5b43c184605ef",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "feature-proof-run",
      "tier": "platform",
      "name": "Features, numbers, voices",
      "description": "Capability grid, the figures that back it, then customers saying it. Evidence in three registers.",
      "collection": "features",
      "tags": [
        "features",
        "stats",
        "testimonials"
      ],
      "sections": [
        {
          "id": "sec_feature-proof-run_0",
          "block": "features-grid-01",
          "props": {
            "eyebrow": "",
            "heading": "Why clients choose us",
            "intro": "",
            "items": [
              {
                "icon": "clock",
                "title": "Available 24/7",
                "description": "Call us any time, we pick up."
              },
              {
                "icon": "shield",
                "title": "Fully insured",
                "description": "Certified and covered work."
              },
              {
                "icon": "star",
                "title": "Rated 4.9",
                "description": "Based on verified customer reviews."
              }
            ]
          },
          "motion": {
            "preset": "stagger-children",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_feature-proof-run_1",
          "block": "stats-band-01",
          "props": {
            "items": [
              {
                "value": "15+",
                "label": "Years in business"
              },
              {
                "value": "2 500",
                "label": "Jobs completed"
              },
              {
                "value": "4.9",
                "label": "Average rating"
              }
            ]
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_feature-proof-run_2",
          "block": "testimonials-grid-01",
          "props": {
            "heading": "What customers say",
            "items": [
              {
                "quote": "Fast, friendly and the price was exactly as quoted.",
                "author": "A. de Vries",
                "role": "Rotterdam",
                "rating": 5
              },
              {
                "quote": "Fixed the problem the same afternoon.",
                "author": "M. Jansen",
                "role": "Schiedam",
                "rating": 5
              }
            ]
          },
          "motion": {
            "preset": "stagger-children",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "A",
      "thumbnail": "",
      "licence": "platform-owned",
      "attribution": "",
      "source": {
        "library": "",
        "demo": "",
        "url": "",
        "derivation": "none"
      },
      "fingerprint": "5786b3825e05a8214945aad40271851b0395bd2e",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "pricing-page-run",
      "tier": "platform",
      "name": "Pricing page run",
      "description": "Plans, the objections, then the ask. The whole back half of a pricing page.",
      "collection": "pricing",
      "tags": [
        "pricing",
        "faq",
        "conversion"
      ],
      "sections": [
        {
          "id": "sec_pricing-page-run_0",
          "block": "pricing-toggle-01",
          "props": {
            "heading": "Simple pricing",
            "intro": "",
            "monthlyLabel": "Monthly",
            "yearlyLabel": "Yearly",
            "yearlyNote": "Two months free",
            "items": [
              {
                "name": "Starter",
                "monthlyPrice": "€49",
                "yearlyPrice": "€490",
                "period": "/month",
                "description": "For a single site that needs to look after itself.",
                "featureList": "One website\nHosting and backups\nE-mail support",
                "ctaLabel": "Choose Starter",
                "ctaHref": "/contact",
                "featured": false
              },
              {
                "name": "Growth",
                "monthlyPrice": "€149",
                "yearlyPrice": "€1490",
                "period": "/month",
                "description": "For a business that markets as well as it delivers.",
                "featureList": "Everything in Starter\nSEO and analytics\nMonthly content changes\nPriority support",
                "ctaLabel": "Choose Growth",
                "ctaHref": "/contact",
                "featured": true
              },
              {
                "name": "Scale",
                "monthlyPrice": "€399",
                "yearlyPrice": "€3990",
                "period": "/month",
                "description": "For multiple brands, shops or locations.",
                "featureList": "Everything in Growth\nMultiple sites\nCommerce and CRM\nNamed contact",
                "ctaLabel": "Talk to us",
                "ctaHref": "/contact",
                "featured": false
              }
            ]
          },
          "motion": {
            "preset": "stagger-children",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_pricing-page-run_1",
          "block": "faq-accordion-01",
          "props": {
            "heading": "Frequently asked questions",
            "items": [
              {
                "question": "How quickly can you come out?",
                "answer": "Usually the same day."
              },
              {
                "question": "What does it cost?",
                "answer": "We quote up front, with no call-out fee."
              }
            ]
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_pricing-page-run_2",
          "block": "cta-banner-01",
          "props": {
            "heading": "Need help today?",
            "body": "Call us and speak to someone who can actually come out.",
            "ctaLabel": "Request a quote",
            "ctaHref": "/contact",
            "tone": "primary"
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "B",
      "thumbnail": "",
      "licence": "platform-owned",
      "attribution": "",
      "source": {
        "library": "",
        "demo": "",
        "url": "",
        "derivation": "none"
      },
      "fingerprint": "e8fa08d211a1b9bddbfb82fcc9e8016f4e74051e",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "saas-hero-run",
      "tier": "platform",
      "name": "SaaS hero run",
      "description": "Split hero, logo proof, feature grid. The opening three screens of a product site.",
      "collection": "hero",
      "tags": [
        "hero",
        "saas",
        "features"
      ],
      "sections": [
        {
          "id": "sec_saas-hero-run_0",
          "block": "hero-split-01",
          "props": {
            "eyebrow": "",
            "headline": "A headline that says what you do",
            "subheadline": "One or two sentences explaining who you help and why they should call you.",
            "primaryLabel": "Request a quote",
            "primaryHref": "/contact",
            "secondaryLabel": "",
            "secondaryHref": "",
            "image": "",
            "imageAlt": ""
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "load",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_saas-hero-run_1",
          "block": "logos-strip-01",
          "props": {
            "heading": "Trusted by",
            "items": [
              {
                "name": "Client one",
                "image": ""
              },
              {
                "name": "Client two",
                "image": ""
              },
              {
                "name": "Client three",
                "image": ""
              }
            ]
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_saas-hero-run_2",
          "block": "features-grid-01",
          "props": {
            "eyebrow": "",
            "heading": "Why clients choose us",
            "intro": "",
            "items": [
              {
                "icon": "clock",
                "title": "Available 24/7",
                "description": "Call us any time, we pick up."
              },
              {
                "icon": "shield",
                "title": "Fully insured",
                "description": "Certified and covered work."
              },
              {
                "icon": "star",
                "title": "Rated 4.9",
                "description": "Based on verified customer reviews."
              }
            ]
          },
          "motion": {
            "preset": "stagger-children",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "B",
      "thumbnail": "",
      "licence": "platform-owned",
      "attribution": "",
      "source": {
        "library": "",
        "demo": "",
        "url": "",
        "derivation": "none"
      },
      "fingerprint": "6dd0cdfda788b4d43b68e39b1c30afda014f4789",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "team-and-contact",
      "tier": "platform",
      "name": "Team and contact",
      "description": "Who you would be working with, then how to reach them. An about page that ends usefully.",
      "collection": "content",
      "tags": [
        "team",
        "contact",
        "about"
      ],
      "sections": [
        {
          "id": "sec_team-and-contact_0",
          "block": "team-editorial-01",
          "props": {
            "heading": "The people who do the work",
            "intro": "",
            "items": [
              {
                "name": "A. de Vries",
                "role": "Founder",
                "image": "",
                "imageAlt": ""
              },
              {
                "name": "M. Jansen",
                "role": "Lead engineer",
                "image": "",
                "imageAlt": ""
              },
              {
                "name": "S. Bakker",
                "role": "Design",
                "image": "",
                "imageAlt": ""
              }
            ]
          },
          "motion": {
            "preset": "stagger-children",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_team-and-contact_1",
          "block": "contact-details-01",
          "props": {
            "heading": "Get in touch",
            "intro": "",
            "phone": "",
            "email": "",
            "street": "",
            "postalCode": "",
            "city": "",
            "hours": "Monday–Friday 08:00–18:00\nSaturday 09:00–13:00",
            "showMap": true
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "A",
      "thumbnail": "",
      "licence": "platform-owned",
      "attribution": "",
      "source": {
        "library": "",
        "demo": "",
        "url": "",
        "derivation": "none"
      },
      "fingerprint": "5ea7d8da52138bbb305ae55003e69891ada693a6",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "kinetic-hero-marquee",
      "tier": "platform",
      "name": "Kinetic hero with marquee",
      "description": "Type that arrives in motion over a continuous marquee. Reads as momentum from the first screen.",
      "collection": "hero",
      "tags": [
        "hero",
        "motion",
        "marquee"
      ],
      "sections": [
        {
          "id": "sec_kinetic-hero-marquee_0",
          "block": "hero-kinetic-01",
          "props": {
            "eyebrow": "",
            "headline": "Built for the work you actually do",
            "subheadline": "One sentence that earns the next scroll.",
            "primaryLabel": "Get started",
            "primaryHref": "/contact",
            "intensity": "subtle"
          },
          "motion": {
            "preset": "hero-reveal",
            "trigger": "load",
            "delay": 0,
            "stagger": 0.06,
            "once": true
          }
        },
        {
          "id": "sec_kinetic-hero-marquee_1",
          "block": "marquee-strip-01",
          "props": {
            "items": "Reliable, Local, Insured, Same-day, Fixed pricing",
            "speed": "medium"
          },
          "motion": {
            "preset": "fade-in",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "C",
      "thumbnail": "",
      "licence": "platform-owned",
      "attribution": "",
      "source": {
        "library": "",
        "demo": "",
        "url": "",
        "derivation": "none"
      },
      "fingerprint": "775bbb3eb37e327f384377689c79dfd9c2d4855a",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "beam-steps-numbers",
      "tier": "platform",
      "name": "Connected steps with counters",
      "description": "A beam-linked process sequence closing on figures that count up. For explaining how something works.",
      "collection": "features",
      "tags": [
        "process",
        "motion",
        "stats"
      ],
      "sections": [
        {
          "id": "sec_beam-steps-numbers_0",
          "block": "features-beam-steps-01",
          "props": {
            "heading": "From first call to handover",
            "intro": "",
            "items": [
              {
                "icon": "phone",
                "title": "First call",
                "description": "We listen before we quote."
              },
              {
                "icon": "wrench",
                "title": "Build",
                "description": "One team, one plan, dates you can hold us to."
              },
              {
                "icon": "check",
                "title": "Handover",
                "description": "Documented, tested and yours."
              }
            ]
          },
          "motion": {
            "preset": "none",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_beam-steps-numbers_1",
          "block": "stats-counter-01",
          "props": {
            "items": [
              {
                "value": 15,
                "suffix": "+",
                "label": "Years in business"
              },
              {
                "value": 2500,
                "suffix": "",
                "label": "Jobs completed"
              },
              {
                "value": 49,
                "suffix": "",
                "label": "Average rating ×10"
              }
            ]
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "C",
      "thumbnail": "",
      "licence": "platform-owned",
      "attribution": "",
      "source": {
        "library": "",
        "demo": "",
        "url": "",
        "derivation": "none"
      },
      "fingerprint": "4a51c2a25366567b350023349ca16f0506deb4ae",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "text-reveal-close",
      "tier": "platform",
      "name": "Text reveal close",
      "description": "Copy that generates as it enters, landing on a glowing-border call to action.",
      "collection": "conversion",
      "tags": [
        "text-effect",
        "motion",
        "cta"
      ],
      "sections": [
        {
          "id": "sec_text-reveal-close_0",
          "block": "content-text-generate-01",
          "props": {
            "heading": "",
            "body": "Every part of this platform exists because a customer asked for it twice. Nothing here is a demo.",
            "speed": "medium"
          },
          "motion": {
            "preset": "none",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_text-reveal-close_1",
          "block": "cta-animated-border-01",
          "props": {
            "heading": "Need help today?",
            "body": "Call us and speak to someone who can actually come out.",
            "ctaLabel": "Request a quote",
            "ctaHref": "/contact",
            "tone": "primary",
            "secondaryLabel": "",
            "secondaryHref": ""
          },
          "motion": {
            "preset": "scale-in",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "B",
      "thumbnail": "",
      "licence": "platform-owned",
      "attribution": "",
      "source": {
        "library": "",
        "demo": "",
        "url": "",
        "derivation": "none"
      },
      "fingerprint": "b1f568144c99dc19f43b1322501ad6efddf50ff8",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "brutalist-hero-grid",
      "tier": "platform",
      "name": "Brutalist hero and grid",
      "description": "Oversized type over a hard-ruled grid. Loud, and cheap to render — type at scale is not an effect.",
      "collection": "hero",
      "tags": [
        "hero",
        "brutalist",
        "editorial"
      ],
      "sections": [
        {
          "id": "sec_brutalist-hero-grid_0",
          "block": "hero-oversized-type-01",
          "props": {
            "eyebrow": "",
            "headline": "Make it obvious",
            "subheadline": "A studio for companies that would rather be understood than admired.",
            "primaryLabel": "Start a project",
            "primaryHref": "/contact",
            "meta": "Rotterdam — since 2014"
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "load",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_brutalist-hero-grid_1",
          "block": "features-brutalist-grid-01",
          "props": {
            "heading": "What you get",
            "intro": "",
            "items": [
              {
                "icon": "bolt",
                "title": "Fast",
                "description": "Loads before your customer decides to leave."
              },
              {
                "icon": "shield",
                "title": "Solid",
                "description": "Backed up, monitored and patched without being asked."
              },
              {
                "icon": "chart",
                "title": "Measured",
                "description": "Every euro spent is traceable to something that happened."
              },
              {
                "icon": "phone",
                "title": "Answered",
                "description": "A person, in your timezone, who knows your account."
              }
            ]
          },
          "motion": {
            "preset": "stagger-children",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "B",
      "thumbnail": "",
      "licence": "platform-owned",
      "attribution": "",
      "source": {
        "library": "",
        "demo": "",
        "url": "",
        "derivation": "none"
      },
      "fingerprint": "eb22343e9b89344990ea9a10422ec33b2e58f372",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "editorial-index-close",
      "tier": "platform",
      "name": "Editorial index and close",
      "description": "A typeset index of services ending in a high-contrast ask. For studios and agencies.",
      "collection": "content",
      "tags": [
        "services",
        "editorial",
        "cta"
      ],
      "sections": [
        {
          "id": "sec_editorial-index-close_0",
          "block": "services-editorial-index-01",
          "props": {
            "heading": "What we do",
            "intro": "",
            "items": [
              {
                "title": "Strategy",
                "description": "Deciding what to build before anyone builds it.",
                "href": "",
                "linkLabel": "Read more"
              },
              {
                "title": "Design",
                "description": "Interfaces that look like the company behind them.",
                "href": "",
                "linkLabel": "Read more"
              },
              {
                "title": "Engineering",
                "description": "Software that still works in three years.",
                "href": "",
                "linkLabel": "Read more"
              }
            ]
          },
          "motion": {
            "preset": "stagger-children",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_editorial-index-close_1",
          "block": "cta-high-contrast-01",
          "props": {
            "heading": "Need help today?",
            "body": "Call us and speak to someone who can actually come out.",
            "ctaLabel": "Request a quote",
            "ctaHref": "/contact",
            "tone": "primary",
            "kicker": ""
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "B",
      "thumbnail": "",
      "licence": "platform-owned",
      "attribution": "",
      "source": {
        "library": "",
        "demo": "",
        "url": "",
        "derivation": "none"
      },
      "fingerprint": "c881a656dcc7dc9d008b3918ee72307f82c8fc62",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "bento-capability-board",
      "tier": "platform",
      "name": "Bento capability board",
      "description": "A mixed-size grid of capabilities over a logo strip. Visually ambitious and still class A — the span pattern is static CSS.",
      "collection": "features",
      "tags": [
        "bento",
        "grid",
        "features",
        "light"
      ],
      "sections": [
        {
          "id": "sec_bento-capability-board_0",
          "block": "features-bento-grid-01",
          "props": {
            "heading": "Everything in one place",
            "intro": "Each panel is a capability. The bigger ones are the ones customers ask about first.",
            "items": [
              {
                "title": "One place for the work",
                "description": "Quotes, jobs, invoices and the history behind them.",
                "size": "wide"
              },
              {
                "title": "Live availability",
                "description": "The calendar customers actually see.",
                "size": "normal"
              },
              {
                "title": "Paid faster",
                "description": "Invoices that chase themselves.",
                "size": "normal"
              },
              {
                "title": "Built for a phone",
                "description": "Because that is where the job happens.",
                "size": "tall"
              },
              {
                "title": "Nothing to install",
                "description": "It runs in a browser and updates itself.",
                "size": "normal"
              }
            ]
          },
          "motion": {
            "preset": "stagger-children",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_bento-capability-board_1",
          "block": "logos-strip-01",
          "props": {
            "heading": "Trusted by",
            "items": [
              {
                "name": "Client one",
                "image": ""
              },
              {
                "name": "Client two",
                "image": ""
              },
              {
                "name": "Client three",
                "image": ""
              }
            ]
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "A",
      "thumbnail": "",
      "licence": "platform-owned",
      "attribution": "",
      "source": {
        "library": "",
        "demo": "",
        "url": "",
        "derivation": "none"
      },
      "fingerprint": "eac8169a18e9fba5fa4113045701da575311542e",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "hyperui-hero-cta-band",
      "tier": "platform",
      "name": "HyperUI — hero with CTA band",
      "description": "Layout idea from HyperUI's marketing hero family: centred hero, then a primary call-to-action band. Renders entirely from our registry blocks.",
      "collection": "hero",
      "tags": [
        "hero",
        "cta",
        "hyperui",
        "light"
      ],
      "sections": [
        {
          "id": "sec_hyperui-hero-cta-band_0",
          "block": "hero-centered-01",
          "props": {
            "eyebrow": "",
            "headline": "A headline that says what you do",
            "subheadline": "One or two sentences explaining who you help and why they should call you.",
            "primaryLabel": "Request a quote",
            "primaryHref": "/contact",
            "secondaryLabel": "",
            "secondaryHref": "",
            "align": "center"
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "load",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_hyperui-hero-cta-band_1",
          "block": "cta-banner-01",
          "props": {
            "heading": "Need help today?",
            "body": "Call us and speak to someone who can actually come out.",
            "ctaLabel": "Request a quote",
            "ctaHref": "/contact",
            "tone": "primary"
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "A",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from HyperUI. Copyright (c) Mark Mead Licensed under the MIT License.",
      "source": {
        "library": "HyperUI",
        "demo": "marketing/sections/hero",
        "url": "https://hyperui.dev",
        "derivation": "layout-observed"
      },
      "fingerprint": "9e289fa893192607e8a6779a007a12b99a7f0dfc",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "hyperui-feature-grid-faq",
      "tier": "platform",
      "name": "HyperUI — features into FAQ",
      "description": "HyperUI-style features grid closing on an accordion of objections. Our blocks, their arrangement.",
      "collection": "features",
      "tags": [
        "features",
        "faq",
        "hyperui"
      ],
      "sections": [
        {
          "id": "sec_hyperui-feature-grid-faq_0",
          "block": "features-grid-01",
          "props": {
            "eyebrow": "",
            "heading": "Why clients choose us",
            "intro": "",
            "items": [
              {
                "icon": "clock",
                "title": "Available 24/7",
                "description": "Call us any time, we pick up."
              },
              {
                "icon": "shield",
                "title": "Fully insured",
                "description": "Certified and covered work."
              },
              {
                "icon": "star",
                "title": "Rated 4.9",
                "description": "Based on verified customer reviews."
              }
            ]
          },
          "motion": {
            "preset": "stagger-children",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_hyperui-feature-grid-faq_1",
          "block": "faq-accordion-01",
          "props": {
            "heading": "Frequently asked questions",
            "items": [
              {
                "question": "How quickly can you come out?",
                "answer": "Usually the same day."
              },
              {
                "question": "What does it cost?",
                "answer": "We quote up front, with no call-out fee."
              }
            ]
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "A",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from HyperUI. Copyright (c) Mark Mead Licensed under the MIT License.",
      "source": {
        "library": "HyperUI",
        "demo": "marketing/sections/features",
        "url": "https://hyperui.dev",
        "derivation": "layout-observed"
      },
      "fingerprint": "a596cdaca2ce104fb9ce7ceaded38f5dd97d8b00",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "hyperui-pricing-close",
      "tier": "platform",
      "name": "HyperUI — pricing close",
      "description": "Pricing table then a high-contrast ask — the HyperUI landing-page close pattern, expressed as our blocks.",
      "collection": "pricing",
      "tags": [
        "pricing",
        "cta",
        "hyperui"
      ],
      "sections": [
        {
          "id": "sec_hyperui-pricing-close_0",
          "block": "pricing-toggle-01",
          "props": {
            "heading": "Simple pricing",
            "intro": "",
            "monthlyLabel": "Monthly",
            "yearlyLabel": "Yearly",
            "yearlyNote": "Two months free",
            "items": [
              {
                "name": "Starter",
                "monthlyPrice": "€49",
                "yearlyPrice": "€490",
                "period": "/month",
                "description": "For a single site that needs to look after itself.",
                "featureList": "One website\nHosting and backups\nE-mail support",
                "ctaLabel": "Choose Starter",
                "ctaHref": "/contact",
                "featured": false
              },
              {
                "name": "Growth",
                "monthlyPrice": "€149",
                "yearlyPrice": "€1490",
                "period": "/month",
                "description": "For a business that markets as well as it delivers.",
                "featureList": "Everything in Starter\nSEO and analytics\nMonthly content changes\nPriority support",
                "ctaLabel": "Choose Growth",
                "ctaHref": "/contact",
                "featured": true
              },
              {
                "name": "Scale",
                "monthlyPrice": "€399",
                "yearlyPrice": "€3990",
                "period": "/month",
                "description": "For multiple brands, shops or locations.",
                "featureList": "Everything in Growth\nMultiple sites\nCommerce and CRM\nNamed contact",
                "ctaLabel": "Talk to us",
                "ctaHref": "/contact",
                "featured": false
              }
            ]
          },
          "motion": {
            "preset": "stagger-children",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_hyperui-pricing-close_1",
          "block": "cta-high-contrast-01",
          "props": {
            "heading": "Need help today?",
            "body": "Call us and speak to someone who can actually come out.",
            "ctaLabel": "Request a quote",
            "ctaHref": "/contact",
            "tone": "primary",
            "kicker": ""
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "B",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from HyperUI. Copyright (c) Mark Mead Licensed under the MIT License.",
      "source": {
        "library": "HyperUI",
        "demo": "marketing/sections/pricing",
        "url": "https://hyperui.dev",
        "derivation": "layout-observed"
      },
      "fingerprint": "a04eb1b8a946629172ffdcfe770cf15f151d7b6c",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "flowbite-header-hero-footer",
      "tier": "platform",
      "name": "Flowbite — page shell with hero",
      "description": "Header, split hero, footer — the Flowbite marketing shell shape. MIT layout idea only; all markup is ours.",
      "collection": "navigation",
      "tags": [
        "header",
        "hero",
        "footer",
        "flowbite"
      ],
      "sections": [
        {
          "id": "sec_flowbite-header-hero-footer_0",
          "block": "header-simple-01",
          "props": {
            "brand": "Your business",
            "logo": "",
            "links": [
              {
                "label": "Services",
                "href": "/services"
              },
              {
                "label": "About",
                "href": "/about"
              },
              {
                "label": "Contact",
                "href": "/contact"
              }
            ],
            "ctaLabel": "Request a quote",
            "ctaHref": "/contact",
            "sticky": true
          },
          "motion": {
            "preset": "none",
            "trigger": "none",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_flowbite-header-hero-footer_1",
          "block": "hero-split-01",
          "props": {
            "eyebrow": "",
            "headline": "A headline that says what you do",
            "subheadline": "One or two sentences explaining who you help and why they should call you.",
            "primaryLabel": "Request a quote",
            "primaryHref": "/contact",
            "secondaryLabel": "",
            "secondaryHref": "",
            "image": "",
            "imageAlt": ""
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "load",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_flowbite-header-hero-footer_2",
          "block": "footer-simple-01",
          "props": {
            "brand": "Your business",
            "tagline": "",
            "phone": "",
            "email": "",
            "address": "",
            "links": [
              {
                "label": "Privacy",
                "href": "/privacy"
              },
              {
                "label": "Terms",
                "href": "/terms"
              }
            ],
            "legal": ""
          },
          "motion": {
            "preset": "none",
            "trigger": "none",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "B",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Flowbite. Copyright (c) 2023 Bergside Inc. Licensed under the MIT License.",
      "source": {
        "library": "Flowbite",
        "demo": "marketing/hero",
        "url": "https://flowbite.com",
        "derivation": "layout-observed"
      },
      "fingerprint": "fab98698a286bde1472e8db23d3782e39ec83084",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "flowbite-stats-testimonials",
      "tier": "platform",
      "name": "Flowbite — stats and testimonials",
      "description": "Numbers then quotes — Flowbite's social-proof stack as our registry sections.",
      "collection": "proof",
      "tags": [
        "stats",
        "testimonials",
        "flowbite"
      ],
      "sections": [
        {
          "id": "sec_flowbite-stats-testimonials_0",
          "block": "stats-band-01",
          "props": {
            "items": [
              {
                "value": "15+",
                "label": "Years in business"
              },
              {
                "value": "2 500",
                "label": "Jobs completed"
              },
              {
                "value": "4.9",
                "label": "Average rating"
              }
            ]
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_flowbite-stats-testimonials_1",
          "block": "testimonials-grid-01",
          "props": {
            "heading": "What customers say",
            "items": [
              {
                "quote": "Fast, friendly and the price was exactly as quoted.",
                "author": "A. de Vries",
                "role": "Rotterdam",
                "rating": 5
              },
              {
                "quote": "Fixed the problem the same afternoon.",
                "author": "M. Jansen",
                "role": "Schiedam",
                "rating": 5
              }
            ]
          },
          "motion": {
            "preset": "stagger-children",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "A",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Flowbite. Copyright (c) 2023 Bergside Inc. Licensed under the MIT License.",
      "source": {
        "library": "Flowbite",
        "demo": "marketing/social-proof",
        "url": "https://flowbite.com",
        "derivation": "layout-observed"
      },
      "fingerprint": "a262e413a3420a84fe88183d2fd315d6477523d7",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "shadcn-feature-spotlight",
      "tier": "platform",
      "name": "shadcn — feature spotlight",
      "description": "A feature grid with one capability expanded. Arrangement inspired by shadcn blocks; rendered by our components.",
      "collection": "features",
      "tags": [
        "features",
        "spotlight",
        "shadcn"
      ],
      "sections": [
        {
          "id": "sec_shadcn-feature-spotlight_0",
          "block": "features-grid-01",
          "props": {
            "eyebrow": "",
            "heading": "Why clients choose us",
            "intro": "",
            "items": [
              {
                "icon": "clock",
                "title": "Available 24/7",
                "description": "Call us any time, we pick up."
              },
              {
                "icon": "shield",
                "title": "Fully insured",
                "description": "Certified and covered work."
              },
              {
                "icon": "star",
                "title": "Rated 4.9",
                "description": "Based on verified customer reviews."
              }
            ]
          },
          "motion": {
            "preset": "stagger-children",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_shadcn-feature-spotlight_1",
          "block": "feature-spotlight-01",
          "props": {
            "heading": "What you get",
            "items": [
              {
                "title": "Fast to start",
                "description": "Live in a day, not a quarter."
              },
              {
                "title": "Built to last",
                "description": "Maintained, monitored, supported."
              },
              {
                "title": "Priced clearly",
                "description": "One number, agreed up front."
              }
            ]
          },
          "motion": {
            "preset": "stagger-children",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "B",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from shadcn/ui. Copyright (c) 2023 shadcn Licensed under the MIT License.",
      "source": {
        "library": "shadcn/ui",
        "demo": "blocks/feature-section",
        "url": "https://ui.shadcn.com",
        "derivation": "layout-observed"
      },
      "fingerprint": "dc1406fd6d5023dcf1d4bb0bf6a5de2ae4380aa1",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "magicui-motion-proof",
      "tier": "platform",
      "name": "Magic UI — proof in motion",
      "description": "Marquee testimonials over counting stats — the Magic UI free-repo motion-proof idea, via our motion-capable blocks.",
      "collection": "proof",
      "tags": [
        "marquee",
        "stats",
        "magicui"
      ],
      "sections": [
        {
          "id": "sec_magicui-motion-proof_0",
          "block": "testimonials-marquee-01",
          "props": {
            "heading": "What customers say",
            "speed": "slow",
            "items": [
              {
                "quote": "Turned up when they said, finished when they said.",
                "author": "A. de Vries",
                "role": "Rotterdam",
                "rating": 5
              },
              {
                "quote": "The quote was the price. That alone is worth it.",
                "author": "M. Jansen",
                "role": "Schiedam",
                "rating": 5
              },
              {
                "quote": "Tidy, quiet and gone by four.",
                "author": "S. Bakker",
                "role": "Delft",
                "rating": 5
              },
              {
                "quote": "Explained the options without selling me the expensive one.",
                "author": "R. Visser",
                "role": "Vlaardingen",
                "rating": 5
              }
            ]
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_magicui-motion-proof_1",
          "block": "stats-counter-01",
          "props": {
            "items": [
              {
                "value": 15,
                "suffix": "+",
                "label": "Years in business"
              },
              {
                "value": 2500,
                "suffix": "",
                "label": "Jobs completed"
              },
              {
                "value": 49,
                "suffix": "",
                "label": "Average rating ×10"
              }
            ]
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "B",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Magic UI. Copyright (c) Magic UI Licensed under the MIT License.",
      "source": {
        "library": "Magic UI",
        "demo": "components/marquee",
        "url": "https://magicui.design",
        "derivation": "layout-observed"
      },
      "fingerprint": "1dd3a13347422fe4d2bb58bd1bc3238e226a704f",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "vengeance-aurora-close",
      "tier": "platform",
      "name": "Vengeance — aurora hero close",
      "description": "Luminous hero into a closing CTA. Layout cue from Vengeance UI; our aurora and CTA blocks do the work.",
      "collection": "hero",
      "tags": [
        "hero",
        "aurora",
        "cta",
        "vengeance"
      ],
      "sections": [
        {
          "id": "sec_vengeance-aurora-close_0",
          "block": "hero-aurora-01",
          "props": {
            "eyebrow": "",
            "headline": "Software that feels inevitable",
            "subheadline": "One sentence that explains the product without explaining the industry.",
            "primaryLabel": "Get started",
            "primaryHref": "/contact",
            "secondaryLabel": "",
            "secondaryHref": "",
            "image": "",
            "video": "",
            "imageAlt": "",
            "intensity": "subtle"
          },
          "motion": {
            "preset": "hero-reveal",
            "trigger": "load",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_vengeance-aurora-close_1",
          "block": "cta-animated-border-01",
          "props": {
            "heading": "Need help today?",
            "body": "Call us and speak to someone who can actually come out.",
            "ctaLabel": "Request a quote",
            "ctaHref": "/contact",
            "tone": "primary",
            "secondaryLabel": "",
            "secondaryHref": ""
          },
          "motion": {
            "preset": "scale-in",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "C",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Vengeance UI. Copyright (c) 2025-2026 Ashutoshx7 Licensed under the MIT License.",
      "source": {
        "library": "Vengeance UI",
        "demo": "hero-aurora",
        "url": "https://github.com/Ashutoshx7/VengeanceUI",
        "derivation": "layout-observed"
      },
      "fingerprint": "5a1d5d51c571b4b234f7c9438b729d5c3b72478d",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "hyperui-agency-proof-strip",
      "tier": "platform",
      "name": "HyperUI — agency hero with logos",
      "description": "Agency-style opener with social proof and a logo strip. Layout cue from HyperUI marketing heroes; our agency-proof and logos blocks.",
      "collection": "hero",
      "tags": [
        "hero",
        "proof",
        "logos",
        "hyperui"
      ],
      "sections": [
        {
          "id": "sec_hyperui-agency-proof-strip_0",
          "block": "hero-agency-proof-01",
          "props": {
            "eyebrow": "",
            "headline": "Building bold brands with",
            "headlineAccent": "thoughtful design",
            "subheadline": "We help small startups tackle the world’s biggest challenges with tailored solutions that grow with them.",
            "primaryLabel": "Get Started",
            "primaryHref": "/contact",
            "trustLabel": "Trusted by 1000+ clients",
            "ratingLabel": "5.0",
            "avatars": [
              {
                "name": "A",
                "image": ""
              },
              {
                "name": "B",
                "image": ""
              },
              {
                "name": "C",
                "image": ""
              },
              {
                "name": "D",
                "image": ""
              }
            ],
            "logos": [
              {
                "name": "Northwind",
                "image": ""
              },
              {
                "name": "Acme",
                "image": ""
              },
              {
                "name": "Globex",
                "image": ""
              },
              {
                "name": "Initech",
                "image": ""
              },
              {
                "name": "Umbrella",
                "image": ""
              }
            ]
          },
          "motion": {
            "preset": "hero-reveal",
            "trigger": "load",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_hyperui-agency-proof-strip_1",
          "block": "logos-strip-01",
          "props": {
            "heading": "Trusted by",
            "items": [
              {
                "name": "Client one",
                "image": ""
              },
              {
                "name": "Client two",
                "image": ""
              },
              {
                "name": "Client three",
                "image": ""
              }
            ]
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "A",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from HyperUI. Copyright (c) Mark Mead Licensed under the MIT License.",
      "source": {
        "library": "HyperUI",
        "demo": "marketing/sections/hero",
        "url": "https://hyperui.dev",
        "derivation": "layout-observed"
      },
      "fingerprint": "c24f820f52cae1547fc66259d553680e4f61d1b3",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "hyperui-property-cover",
      "tier": "platform",
      "name": "HyperUI — property cover close",
      "description": "Full-bleed property hero into a contact close. Arrangement inspired by HyperUI cover heroes.",
      "collection": "hero",
      "tags": [
        "hero",
        "property",
        "hyperui"
      ],
      "sections": [
        {
          "id": "sec_hyperui-property-cover_0",
          "block": "hero-property-01",
          "props": {
            "headline": "Space Residence",
            "primaryLabel": "Schedule a tour",
            "primaryHref": "/contact",
            "image": "",
            "imageAlt": "Exterior of the residence",
            "facts": [
              {
                "icon": "home",
                "label": "Bedrooms",
                "value": "3"
              },
              {
                "icon": "building",
                "label": "Bathrooms",
                "value": "2"
              },
              {
                "icon": "car",
                "label": "Parking",
                "value": "Included"
              },
              {
                "icon": "credit-card",
                "label": "Price",
                "value": "$4,750,000"
              }
            ]
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "load",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_hyperui-property-cover_1",
          "block": "contact-details-01",
          "props": {
            "heading": "Get in touch",
            "intro": "",
            "phone": "",
            "email": "",
            "street": "",
            "postalCode": "",
            "city": "",
            "hours": "Monday–Friday 08:00–18:00\nSaturday 09:00–13:00",
            "showMap": true
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_hyperui-property-cover_2",
          "block": "footer-simple-01",
          "props": {
            "brand": "Your business",
            "tagline": "",
            "phone": "",
            "email": "",
            "address": "",
            "links": [
              {
                "label": "Privacy",
                "href": "/privacy"
              },
              {
                "label": "Terms",
                "href": "/terms"
              }
            ],
            "legal": ""
          },
          "motion": {
            "preset": "none",
            "trigger": "none",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "B",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from HyperUI. Copyright (c) Mark Mead Licensed under the MIT License.",
      "source": {
        "library": "HyperUI",
        "demo": "marketing/sections/hero",
        "url": "https://hyperui.dev",
        "derivation": "layout-observed"
      },
      "fingerprint": "aad19a09e95ac90a7edcf01f54a21fc01cbd5a15",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "nuxt-ui-saas-landing",
      "tier": "platform",
      "name": "Nuxt UI — SaaS landing shell",
      "description": "Header, product-preview hero, feature grid, pricing, FAQ, footer — a Nuxt UI docs-style marketing arrangement rendered by our blocks.",
      "collection": "hero",
      "tags": [
        "saas",
        "landing",
        "nuxt-ui"
      ],
      "sections": [
        {
          "id": "sec_nuxt-ui-saas-landing_0",
          "block": "header-simple-01",
          "props": {
            "brand": "Your business",
            "logo": "",
            "links": [
              {
                "label": "Services",
                "href": "/services"
              },
              {
                "label": "About",
                "href": "/about"
              },
              {
                "label": "Contact",
                "href": "/contact"
              }
            ],
            "ctaLabel": "Request a quote",
            "ctaHref": "/contact",
            "sticky": true
          },
          "motion": {
            "preset": "none",
            "trigger": "none",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_nuxt-ui-saas-landing_1",
          "block": "hero-saas-preview-01",
          "props": {
            "eyebrow": "Now in public beta",
            "headline": "Ship your next site before lunch",
            "subheadline": "Describe the business once. We plan the pages, write the copy, and leave you an editor that stays out of the way.",
            "primaryLabel": "Start free",
            "primaryHref": "/signup",
            "secondaryLabel": "See how it works",
            "secondaryHref": "/demo",
            "previewImage": "",
            "previewAlt": "Product preview",
            "previewCaption": "Live editor preview"
          },
          "motion": {
            "preset": "stagger-children",
            "trigger": "load",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_nuxt-ui-saas-landing_2",
          "block": "features-grid-01",
          "props": {
            "eyebrow": "",
            "heading": "Why clients choose us",
            "intro": "",
            "items": [
              {
                "icon": "clock",
                "title": "Available 24/7",
                "description": "Call us any time, we pick up."
              },
              {
                "icon": "shield",
                "title": "Fully insured",
                "description": "Certified and covered work."
              },
              {
                "icon": "star",
                "title": "Rated 4.9",
                "description": "Based on verified customer reviews."
              }
            ]
          },
          "motion": {
            "preset": "stagger-children",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_nuxt-ui-saas-landing_3",
          "block": "pricing-toggle-01",
          "props": {
            "heading": "Simple pricing",
            "intro": "",
            "monthlyLabel": "Monthly",
            "yearlyLabel": "Yearly",
            "yearlyNote": "Two months free",
            "items": [
              {
                "name": "Starter",
                "monthlyPrice": "€49",
                "yearlyPrice": "€490",
                "period": "/month",
                "description": "For a single site that needs to look after itself.",
                "featureList": "One website\nHosting and backups\nE-mail support",
                "ctaLabel": "Choose Starter",
                "ctaHref": "/contact",
                "featured": false
              },
              {
                "name": "Growth",
                "monthlyPrice": "€149",
                "yearlyPrice": "€1490",
                "period": "/month",
                "description": "For a business that markets as well as it delivers.",
                "featureList": "Everything in Starter\nSEO and analytics\nMonthly content changes\nPriority support",
                "ctaLabel": "Choose Growth",
                "ctaHref": "/contact",
                "featured": true
              },
              {
                "name": "Scale",
                "monthlyPrice": "€399",
                "yearlyPrice": "€3990",
                "period": "/month",
                "description": "For multiple brands, shops or locations.",
                "featureList": "Everything in Growth\nMultiple sites\nCommerce and CRM\nNamed contact",
                "ctaLabel": "Talk to us",
                "ctaHref": "/contact",
                "featured": false
              }
            ]
          },
          "motion": {
            "preset": "stagger-children",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_nuxt-ui-saas-landing_4",
          "block": "faq-accordion-01",
          "props": {
            "heading": "Frequently asked questions",
            "items": [
              {
                "question": "How quickly can you come out?",
                "answer": "Usually the same day."
              },
              {
                "question": "What does it cost?",
                "answer": "We quote up front, with no call-out fee."
              }
            ]
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_nuxt-ui-saas-landing_5",
          "block": "footer-simple-01",
          "props": {
            "brand": "Your business",
            "tagline": "",
            "phone": "",
            "email": "",
            "address": "",
            "links": [
              {
                "label": "Privacy",
                "href": "/privacy"
              },
              {
                "label": "Terms",
                "href": "/terms"
              }
            ],
            "legal": ""
          },
          "motion": {
            "preset": "none",
            "trigger": "none",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "B",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Nuxt UI. Copyright (c) 2023 Nuxt Licensed under the MIT License.",
      "source": {
        "library": "Nuxt UI",
        "demo": "docs/getting-started",
        "url": "https://ui.nuxt.com",
        "derivation": "layout-observed"
      },
      "fingerprint": "6d2dda5f4f1821265ce260490d111b983415a333",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "nuxt-ui-agency-dark",
      "tier": "platform",
      "name": "Nuxt UI — dark agency opener",
      "description": "Dark portrait hero into glow feature cards and a lit CTA. Layout vocabulary from Nuxt UI marketing examples; our spotlight blocks.",
      "collection": "hero",
      "tags": [
        "hero",
        "dark",
        "agency",
        "nuxt-ui"
      ],
      "sections": [
        {
          "id": "sec_nuxt-ui-agency-dark_0",
          "block": "hero-portrait-01",
          "props": {
            "brandMark": "Studio",
            "eyebrow": "Digital agency",
            "headline": "Design that earns attention",
            "subheadline": "Strategy, identity and product — built to convert without shouting.",
            "primaryLabel": "View work",
            "primaryHref": "/work",
            "image": "",
            "imageAlt": "Portrait"
          },
          "motion": {
            "preset": "hero-reveal",
            "trigger": "load",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_nuxt-ui-agency-dark_1",
          "block": "features-glow-cards-01",
          "props": {
            "heading": "Built for the details",
            "intro": "",
            "items": [
              {
                "icon": "bolt",
                "title": "Instant",
                "description": "Every page rendered ahead of time and served from the edge."
              },
              {
                "icon": "shield",
                "title": "Guarded",
                "description": "Isolated per customer, audited on every change."
              },
              {
                "icon": "sparkles",
                "title": "Considered",
                "description": "Designed to a system, not assembled from a template."
              }
            ]
          },
          "motion": {
            "preset": "stagger-children",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_nuxt-ui-agency-dark_2",
          "block": "cta-animated-border-01",
          "props": {
            "heading": "Need help today?",
            "body": "Call us and speak to someone who can actually come out.",
            "ctaLabel": "Request a quote",
            "ctaHref": "/contact",
            "tone": "primary",
            "secondaryLabel": "",
            "secondaryHref": ""
          },
          "motion": {
            "preset": "scale-in",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "B",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Nuxt UI. Copyright (c) 2023 Nuxt Licensed under the MIT License.",
      "source": {
        "library": "Nuxt UI",
        "demo": "components",
        "url": "https://ui.nuxt.com",
        "derivation": "layout-observed"
      },
      "fingerprint": "38196fa01e3f3d1d3f882ad618d53dd3ed534cfc",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "shadcn-cover-statement",
      "tier": "platform",
      "name": "shadcn — cover statement",
      "description": "Quiet centred cover hero into a feature trio. Arrangement inspired by shadcn blocks.",
      "collection": "hero",
      "tags": [
        "hero",
        "minimal",
        "shadcn"
      ],
      "sections": [
        {
          "id": "sec_shadcn-cover-statement_0",
          "block": "hero-cover-statement-01",
          "props": {
            "eyebrow": "Introducing",
            "headline": "A calmer way to build the web",
            "subheadline": "One workspace for the site, the content and the growth work — without a stack of plugins.",
            "primaryLabel": "Get started",
            "primaryHref": "/contact",
            "secondaryLabel": "Browse examples",
            "secondaryHref": "/templates",
            "image": "",
            "video": "",
            "imageAlt": ""
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "load",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_shadcn-cover-statement_1",
          "block": "features-grid-01",
          "props": {
            "eyebrow": "",
            "heading": "Why clients choose us",
            "intro": "",
            "items": [
              {
                "icon": "clock",
                "title": "Available 24/7",
                "description": "Call us any time, we pick up."
              },
              {
                "icon": "shield",
                "title": "Fully insured",
                "description": "Certified and covered work."
              },
              {
                "icon": "star",
                "title": "Rated 4.9",
                "description": "Based on verified customer reviews."
              }
            ]
          },
          "motion": {
            "preset": "stagger-children",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "A",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from shadcn/ui. Copyright (c) 2023 shadcn Licensed under the MIT License.",
      "source": {
        "library": "shadcn/ui",
        "demo": "blocks/hero",
        "url": "https://ui.shadcn.com",
        "derivation": "layout-observed"
      },
      "fingerprint": "3bff0eb3fa2536ae39ad62eda3ec54209570b32f",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "shadcn-vue-asymmetric",
      "tier": "platform",
      "name": "shadcn-vue — asymmetric editorial",
      "description": "Asymmetric overlap hero into editorial services index. Vue-port catalogue arrangement via our editorial blocks.",
      "collection": "hero",
      "tags": [
        "hero",
        "editorial",
        "shadcn-vue"
      ],
      "sections": [
        {
          "id": "sec_shadcn-vue-asymmetric_0",
          "block": "hero-asymmetric-01",
          "props": {
            "eyebrow": "Selected work",
            "headline": "Make the first screen unforgettable",
            "subheadline": "A single composition: brand, one line, one action, one image that does the talking.",
            "primaryLabel": "Book a call",
            "primaryHref": "/contact",
            "image": "",
            "imageAlt": "Featured project"
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "load",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_shadcn-vue-asymmetric_1",
          "block": "services-editorial-index-01",
          "props": {
            "heading": "What we do",
            "intro": "",
            "items": [
              {
                "title": "Strategy",
                "description": "Deciding what to build before anyone builds it.",
                "href": "",
                "linkLabel": "Read more"
              },
              {
                "title": "Design",
                "description": "Interfaces that look like the company behind them.",
                "href": "",
                "linkLabel": "Read more"
              },
              {
                "title": "Engineering",
                "description": "Software that still works in three years.",
                "href": "",
                "linkLabel": "Read more"
              }
            ]
          },
          "motion": {
            "preset": "stagger-children",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_shadcn-vue-asymmetric_2",
          "block": "cta-high-contrast-01",
          "props": {
            "heading": "Need help today?",
            "body": "Call us and speak to someone who can actually come out.",
            "ctaLabel": "Request a quote",
            "ctaHref": "/contact",
            "tone": "primary",
            "kicker": ""
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "B",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from shadcn-vue. Copyright (c) 2023 unovue Licensed under the MIT License.",
      "source": {
        "library": "shadcn-vue",
        "demo": "blocks",
        "url": "https://github.com/unovue/shadcn-vue",
        "derivation": "layout-observed"
      },
      "fingerprint": "6e2514c8f8c05b01707fe17255d4d1836c2d1f34",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "platform-agency-landing",
      "tier": "platform",
      "name": "Agency landing with proof",
      "description": "Agency hero, logos, features, testimonials, closing CTA — the default agency first page.",
      "collection": "hero",
      "tags": [
        "agency",
        "hero",
        "proof"
      ],
      "sections": [
        {
          "id": "sec_platform-agency-landing_0",
          "block": "header-simple-01",
          "props": {
            "brand": "Your business",
            "logo": "",
            "links": [
              {
                "label": "Services",
                "href": "/services"
              },
              {
                "label": "About",
                "href": "/about"
              },
              {
                "label": "Contact",
                "href": "/contact"
              }
            ],
            "ctaLabel": "Request a quote",
            "ctaHref": "/contact",
            "sticky": true
          },
          "motion": {
            "preset": "none",
            "trigger": "none",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_platform-agency-landing_1",
          "block": "hero-agency-proof-01",
          "props": {
            "eyebrow": "",
            "headline": "Building bold brands with",
            "headlineAccent": "thoughtful design",
            "subheadline": "We help small startups tackle the world’s biggest challenges with tailored solutions that grow with them.",
            "primaryLabel": "Get Started",
            "primaryHref": "/contact",
            "trustLabel": "Trusted by 1000+ clients",
            "ratingLabel": "5.0",
            "avatars": [
              {
                "name": "A",
                "image": ""
              },
              {
                "name": "B",
                "image": ""
              },
              {
                "name": "C",
                "image": ""
              },
              {
                "name": "D",
                "image": ""
              }
            ],
            "logos": [
              {
                "name": "Northwind",
                "image": ""
              },
              {
                "name": "Acme",
                "image": ""
              },
              {
                "name": "Globex",
                "image": ""
              },
              {
                "name": "Initech",
                "image": ""
              },
              {
                "name": "Umbrella",
                "image": ""
              }
            ]
          },
          "motion": {
            "preset": "hero-reveal",
            "trigger": "load",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_platform-agency-landing_2",
          "block": "logos-strip-01",
          "props": {
            "heading": "Trusted by",
            "items": [
              {
                "name": "Client one",
                "image": ""
              },
              {
                "name": "Client two",
                "image": ""
              },
              {
                "name": "Client three",
                "image": ""
              }
            ]
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_platform-agency-landing_3",
          "block": "features-grid-01",
          "props": {
            "eyebrow": "",
            "heading": "Why clients choose us",
            "intro": "",
            "items": [
              {
                "icon": "clock",
                "title": "Available 24/7",
                "description": "Call us any time, we pick up."
              },
              {
                "icon": "shield",
                "title": "Fully insured",
                "description": "Certified and covered work."
              },
              {
                "icon": "star",
                "title": "Rated 4.9",
                "description": "Based on verified customer reviews."
              }
            ]
          },
          "motion": {
            "preset": "stagger-children",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_platform-agency-landing_4",
          "block": "testimonials-grid-01",
          "props": {
            "heading": "What customers say",
            "items": [
              {
                "quote": "Fast, friendly and the price was exactly as quoted.",
                "author": "A. de Vries",
                "role": "Rotterdam",
                "rating": 5
              },
              {
                "quote": "Fixed the problem the same afternoon.",
                "author": "M. Jansen",
                "role": "Schiedam",
                "rating": 5
              }
            ]
          },
          "motion": {
            "preset": "stagger-children",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_platform-agency-landing_5",
          "block": "cta-banner-01",
          "props": {
            "heading": "Need help today?",
            "body": "Call us and speak to someone who can actually come out.",
            "ctaLabel": "Request a quote",
            "ctaHref": "/contact",
            "tone": "primary"
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_platform-agency-landing_6",
          "block": "footer-simple-01",
          "props": {
            "brand": "Your business",
            "tagline": "",
            "phone": "",
            "email": "",
            "address": "",
            "links": [
              {
                "label": "Privacy",
                "href": "/privacy"
              },
              {
                "label": "Terms",
                "href": "/terms"
              }
            ],
            "legal": ""
          },
          "motion": {
            "preset": "none",
            "trigger": "none",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "A",
      "thumbnail": "",
      "licence": "platform-owned",
      "attribution": "",
      "source": {
        "library": "",
        "demo": "",
        "url": "",
        "derivation": "none"
      },
      "fingerprint": "5a38290bfbb397d40dc5921185610b42981e7557",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "flowbite-centred-hero-proof",
      "tier": "platform",
      "name": "Flowbite — centred hero with proof",
      "description": "Centred hero, logo strip, then CTA — Flowbite's classic marketing hero stack as our blocks.",
      "collection": "hero",
      "tags": [
        "hero",
        "logos",
        "cta",
        "flowbite",
        "landing"
      ],
      "sections": [
        {
          "id": "sec_flowbite-centred-hero-proof_0",
          "block": "hero-centered-01",
          "props": {
            "eyebrow": "",
            "headline": "A headline that says what you do",
            "subheadline": "One or two sentences explaining who you help and why they should call you.",
            "primaryLabel": "Request a quote",
            "primaryHref": "/contact",
            "secondaryLabel": "",
            "secondaryHref": "",
            "align": "center"
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "load",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_flowbite-centred-hero-proof_1",
          "block": "logos-strip-01",
          "props": {
            "heading": "Trusted by",
            "items": [
              {
                "name": "Client one",
                "image": ""
              },
              {
                "name": "Client two",
                "image": ""
              },
              {
                "name": "Client three",
                "image": ""
              }
            ]
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_flowbite-centred-hero-proof_2",
          "block": "cta-banner-01",
          "props": {
            "heading": "Need help today?",
            "body": "Call us and speak to someone who can actually come out.",
            "ctaLabel": "Request a quote",
            "ctaHref": "/contact",
            "tone": "primary"
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "A",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Flowbite. Copyright (c) 2023 Bergside Inc. Licensed under the MIT License.",
      "source": {
        "library": "Flowbite",
        "demo": "marketing/hero",
        "url": "https://flowbite.com",
        "derivation": "layout-observed"
      },
      "fingerprint": "01f7d32bf4ab1b4e01174e1935a5b43c184605ef",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "flowbite-saas-landing",
      "tier": "platform",
      "name": "Flowbite — full SaaS landing",
      "description": "Header through footer: split hero, logos, features, stats, pricing, FAQ, CTA. Full free Flowbite marketing shape — our registry only.",
      "collection": "hero",
      "tags": [
        "landing",
        "saas",
        "flowbite",
        "full-page"
      ],
      "sections": [
        {
          "id": "sec_flowbite-saas-landing_0",
          "block": "header-simple-01",
          "props": {
            "brand": "Your business",
            "logo": "",
            "links": [
              {
                "label": "Services",
                "href": "/services"
              },
              {
                "label": "About",
                "href": "/about"
              },
              {
                "label": "Contact",
                "href": "/contact"
              }
            ],
            "ctaLabel": "Request a quote",
            "ctaHref": "/contact",
            "sticky": true
          },
          "motion": {
            "preset": "none",
            "trigger": "none",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_flowbite-saas-landing_1",
          "block": "hero-split-01",
          "props": {
            "eyebrow": "",
            "headline": "A headline that says what you do",
            "subheadline": "One or two sentences explaining who you help and why they should call you.",
            "primaryLabel": "Request a quote",
            "primaryHref": "/contact",
            "secondaryLabel": "",
            "secondaryHref": "",
            "image": "",
            "imageAlt": ""
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "load",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_flowbite-saas-landing_2",
          "block": "logos-strip-01",
          "props": {
            "heading": "Trusted by",
            "items": [
              {
                "name": "Client one",
                "image": ""
              },
              {
                "name": "Client two",
                "image": ""
              },
              {
                "name": "Client three",
                "image": ""
              }
            ]
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_flowbite-saas-landing_3",
          "block": "features-grid-01",
          "props": {
            "eyebrow": "",
            "heading": "Why clients choose us",
            "intro": "",
            "items": [
              {
                "icon": "clock",
                "title": "Available 24/7",
                "description": "Call us any time, we pick up."
              },
              {
                "icon": "shield",
                "title": "Fully insured",
                "description": "Certified and covered work."
              },
              {
                "icon": "star",
                "title": "Rated 4.9",
                "description": "Based on verified customer reviews."
              }
            ]
          },
          "motion": {
            "preset": "stagger-children",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_flowbite-saas-landing_4",
          "block": "stats-band-01",
          "props": {
            "items": [
              {
                "value": "15+",
                "label": "Years in business"
              },
              {
                "value": "2 500",
                "label": "Jobs completed"
              },
              {
                "value": "4.9",
                "label": "Average rating"
              }
            ]
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_flowbite-saas-landing_5",
          "block": "pricing-toggle-01",
          "props": {
            "heading": "Simple pricing",
            "intro": "",
            "monthlyLabel": "Monthly",
            "yearlyLabel": "Yearly",
            "yearlyNote": "Two months free",
            "items": [
              {
                "name": "Starter",
                "monthlyPrice": "€49",
                "yearlyPrice": "€490",
                "period": "/month",
                "description": "For a single site that needs to look after itself.",
                "featureList": "One website\nHosting and backups\nE-mail support",
                "ctaLabel": "Choose Starter",
                "ctaHref": "/contact",
                "featured": false
              },
              {
                "name": "Growth",
                "monthlyPrice": "€149",
                "yearlyPrice": "€1490",
                "period": "/month",
                "description": "For a business that markets as well as it delivers.",
                "featureList": "Everything in Starter\nSEO and analytics\nMonthly content changes\nPriority support",
                "ctaLabel": "Choose Growth",
                "ctaHref": "/contact",
                "featured": true
              },
              {
                "name": "Scale",
                "monthlyPrice": "€399",
                "yearlyPrice": "€3990",
                "period": "/month",
                "description": "For multiple brands, shops or locations.",
                "featureList": "Everything in Growth\nMultiple sites\nCommerce and CRM\nNamed contact",
                "ctaLabel": "Talk to us",
                "ctaHref": "/contact",
                "featured": false
              }
            ]
          },
          "motion": {
            "preset": "stagger-children",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_flowbite-saas-landing_6",
          "block": "faq-accordion-01",
          "props": {
            "heading": "Frequently asked questions",
            "items": [
              {
                "question": "How quickly can you come out?",
                "answer": "Usually the same day."
              },
              {
                "question": "What does it cost?",
                "answer": "We quote up front, with no call-out fee."
              }
            ]
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_flowbite-saas-landing_7",
          "block": "cta-banner-01",
          "props": {
            "heading": "Need help today?",
            "body": "Call us and speak to someone who can actually come out.",
            "ctaLabel": "Request a quote",
            "ctaHref": "/contact",
            "tone": "primary"
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_flowbite-saas-landing_8",
          "block": "footer-simple-01",
          "props": {
            "brand": "Your business",
            "tagline": "",
            "phone": "",
            "email": "",
            "address": "",
            "links": [
              {
                "label": "Privacy",
                "href": "/privacy"
              },
              {
                "label": "Terms",
                "href": "/terms"
              }
            ],
            "legal": ""
          },
          "motion": {
            "preset": "none",
            "trigger": "none",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "B",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Flowbite. Copyright (c) 2023 Bergside Inc. Licensed under the MIT License.",
      "source": {
        "library": "Flowbite",
        "demo": "marketing",
        "url": "https://flowbite.com",
        "derivation": "layout-observed"
      },
      "fingerprint": "627f49152bd3c5065dc01ba3af7f53647a181791",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "flowbite-features-pricing",
      "tier": "platform",
      "name": "Flowbite — features into pricing",
      "description": "Feature grid, spotlight, pricing toggle — Flowbite product-page mid-run via our blocks.",
      "collection": "features",
      "tags": [
        "features",
        "pricing",
        "flowbite"
      ],
      "sections": [
        {
          "id": "sec_flowbite-features-pricing_0",
          "block": "features-grid-01",
          "props": {
            "eyebrow": "",
            "heading": "Why clients choose us",
            "intro": "",
            "items": [
              {
                "icon": "clock",
                "title": "Available 24/7",
                "description": "Call us any time, we pick up."
              },
              {
                "icon": "shield",
                "title": "Fully insured",
                "description": "Certified and covered work."
              },
              {
                "icon": "star",
                "title": "Rated 4.9",
                "description": "Based on verified customer reviews."
              }
            ]
          },
          "motion": {
            "preset": "stagger-children",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_flowbite-features-pricing_1",
          "block": "feature-spotlight-01",
          "props": {
            "heading": "What you get",
            "items": [
              {
                "title": "Fast to start",
                "description": "Live in a day, not a quarter."
              },
              {
                "title": "Built to last",
                "description": "Maintained, monitored, supported."
              },
              {
                "title": "Priced clearly",
                "description": "One number, agreed up front."
              }
            ]
          },
          "motion": {
            "preset": "stagger-children",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_flowbite-features-pricing_2",
          "block": "pricing-toggle-01",
          "props": {
            "heading": "Simple pricing",
            "intro": "",
            "monthlyLabel": "Monthly",
            "yearlyLabel": "Yearly",
            "yearlyNote": "Two months free",
            "items": [
              {
                "name": "Starter",
                "monthlyPrice": "€49",
                "yearlyPrice": "€490",
                "period": "/month",
                "description": "For a single site that needs to look after itself.",
                "featureList": "One website\nHosting and backups\nE-mail support",
                "ctaLabel": "Choose Starter",
                "ctaHref": "/contact",
                "featured": false
              },
              {
                "name": "Growth",
                "monthlyPrice": "€149",
                "yearlyPrice": "€1490",
                "period": "/month",
                "description": "For a business that markets as well as it delivers.",
                "featureList": "Everything in Starter\nSEO and analytics\nMonthly content changes\nPriority support",
                "ctaLabel": "Choose Growth",
                "ctaHref": "/contact",
                "featured": true
              },
              {
                "name": "Scale",
                "monthlyPrice": "€399",
                "yearlyPrice": "€3990",
                "period": "/month",
                "description": "For multiple brands, shops or locations.",
                "featureList": "Everything in Growth\nMultiple sites\nCommerce and CRM\nNamed contact",
                "ctaLabel": "Talk to us",
                "ctaHref": "/contact",
                "featured": false
              }
            ]
          },
          "motion": {
            "preset": "stagger-children",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "B",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Flowbite. Copyright (c) 2023 Bergside Inc. Licensed under the MIT License.",
      "source": {
        "library": "Flowbite",
        "demo": "marketing/features",
        "url": "https://flowbite.com",
        "derivation": "layout-observed"
      },
      "fingerprint": "f615e252b1f200f1361b599880ed0adfce40002e",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "hyperui-full-landing",
      "tier": "platform",
      "name": "HyperUI — full marketing landing",
      "description": "Complete HyperUI-style landing: header, centred hero, features, testimonials, pricing, FAQ, CTA, footer.",
      "collection": "hero",
      "tags": [
        "landing",
        "hyperui",
        "full-page"
      ],
      "sections": [
        {
          "id": "sec_hyperui-full-landing_0",
          "block": "header-simple-01",
          "props": {
            "brand": "Your business",
            "logo": "",
            "links": [
              {
                "label": "Services",
                "href": "/services"
              },
              {
                "label": "About",
                "href": "/about"
              },
              {
                "label": "Contact",
                "href": "/contact"
              }
            ],
            "ctaLabel": "Request a quote",
            "ctaHref": "/contact",
            "sticky": true
          },
          "motion": {
            "preset": "none",
            "trigger": "none",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_hyperui-full-landing_1",
          "block": "hero-centered-01",
          "props": {
            "eyebrow": "",
            "headline": "A headline that says what you do",
            "subheadline": "One or two sentences explaining who you help and why they should call you.",
            "primaryLabel": "Request a quote",
            "primaryHref": "/contact",
            "secondaryLabel": "",
            "secondaryHref": "",
            "align": "center"
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "load",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_hyperui-full-landing_2",
          "block": "features-grid-01",
          "props": {
            "eyebrow": "",
            "heading": "Why clients choose us",
            "intro": "",
            "items": [
              {
                "icon": "clock",
                "title": "Available 24/7",
                "description": "Call us any time, we pick up."
              },
              {
                "icon": "shield",
                "title": "Fully insured",
                "description": "Certified and covered work."
              },
              {
                "icon": "star",
                "title": "Rated 4.9",
                "description": "Based on verified customer reviews."
              }
            ]
          },
          "motion": {
            "preset": "stagger-children",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_hyperui-full-landing_3",
          "block": "testimonials-grid-01",
          "props": {
            "heading": "What customers say",
            "items": [
              {
                "quote": "Fast, friendly and the price was exactly as quoted.",
                "author": "A. de Vries",
                "role": "Rotterdam",
                "rating": 5
              },
              {
                "quote": "Fixed the problem the same afternoon.",
                "author": "M. Jansen",
                "role": "Schiedam",
                "rating": 5
              }
            ]
          },
          "motion": {
            "preset": "stagger-children",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_hyperui-full-landing_4",
          "block": "pricing-toggle-01",
          "props": {
            "heading": "Simple pricing",
            "intro": "",
            "monthlyLabel": "Monthly",
            "yearlyLabel": "Yearly",
            "yearlyNote": "Two months free",
            "items": [
              {
                "name": "Starter",
                "monthlyPrice": "€49",
                "yearlyPrice": "€490",
                "period": "/month",
                "description": "For a single site that needs to look after itself.",
                "featureList": "One website\nHosting and backups\nE-mail support",
                "ctaLabel": "Choose Starter",
                "ctaHref": "/contact",
                "featured": false
              },
              {
                "name": "Growth",
                "monthlyPrice": "€149",
                "yearlyPrice": "€1490",
                "period": "/month",
                "description": "For a business that markets as well as it delivers.",
                "featureList": "Everything in Starter\nSEO and analytics\nMonthly content changes\nPriority support",
                "ctaLabel": "Choose Growth",
                "ctaHref": "/contact",
                "featured": true
              },
              {
                "name": "Scale",
                "monthlyPrice": "€399",
                "yearlyPrice": "€3990",
                "period": "/month",
                "description": "For multiple brands, shops or locations.",
                "featureList": "Everything in Growth\nMultiple sites\nCommerce and CRM\nNamed contact",
                "ctaLabel": "Talk to us",
                "ctaHref": "/contact",
                "featured": false
              }
            ]
          },
          "motion": {
            "preset": "stagger-children",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_hyperui-full-landing_5",
          "block": "faq-accordion-01",
          "props": {
            "heading": "Frequently asked questions",
            "items": [
              {
                "question": "How quickly can you come out?",
                "answer": "Usually the same day."
              },
              {
                "question": "What does it cost?",
                "answer": "We quote up front, with no call-out fee."
              }
            ]
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_hyperui-full-landing_6",
          "block": "cta-high-contrast-01",
          "props": {
            "heading": "Need help today?",
            "body": "Call us and speak to someone who can actually come out.",
            "ctaLabel": "Request a quote",
            "ctaHref": "/contact",
            "tone": "primary",
            "kicker": ""
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_hyperui-full-landing_7",
          "block": "footer-simple-01",
          "props": {
            "brand": "Your business",
            "tagline": "",
            "phone": "",
            "email": "",
            "address": "",
            "links": [
              {
                "label": "Privacy",
                "href": "/privacy"
              },
              {
                "label": "Terms",
                "href": "/terms"
              }
            ],
            "legal": ""
          },
          "motion": {
            "preset": "none",
            "trigger": "none",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "B",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from HyperUI. Copyright (c) Mark Mead Licensed under the MIT License.",
      "source": {
        "library": "HyperUI",
        "demo": "marketing",
        "url": "https://hyperui.dev",
        "derivation": "layout-observed"
      },
      "fingerprint": "3419820da7930f28ce0db293d185a67e74ca5241",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "magicui-landing-motion",
      "tier": "platform",
      "name": "Magic UI — motion landing (free)",
      "description": "Kinetic hero, marquee proof, beam steps, animated CTA — free Magic UI motion vocabulary only; Pro components never used.",
      "collection": "hero",
      "tags": [
        "landing",
        "motion",
        "magicui",
        "full-page"
      ],
      "sections": [
        {
          "id": "sec_magicui-landing-motion_0",
          "block": "header-simple-01",
          "props": {
            "brand": "Your business",
            "logo": "",
            "links": [
              {
                "label": "Services",
                "href": "/services"
              },
              {
                "label": "About",
                "href": "/about"
              },
              {
                "label": "Contact",
                "href": "/contact"
              }
            ],
            "ctaLabel": "Request a quote",
            "ctaHref": "/contact",
            "sticky": true
          },
          "motion": {
            "preset": "none",
            "trigger": "none",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_magicui-landing-motion_1",
          "block": "hero-kinetic-01",
          "props": {
            "eyebrow": "",
            "headline": "Built for the work you actually do",
            "subheadline": "One sentence that earns the next scroll.",
            "primaryLabel": "Get started",
            "primaryHref": "/contact",
            "intensity": "subtle"
          },
          "motion": {
            "preset": "hero-reveal",
            "trigger": "load",
            "delay": 0,
            "stagger": 0.06,
            "once": true
          }
        },
        {
          "id": "sec_magicui-landing-motion_2",
          "block": "marquee-strip-01",
          "props": {
            "items": "Reliable, Local, Insured, Same-day, Fixed pricing",
            "speed": "medium"
          },
          "motion": {
            "preset": "fade-in",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_magicui-landing-motion_3",
          "block": "features-beam-steps-01",
          "props": {
            "heading": "From first call to handover",
            "intro": "",
            "items": [
              {
                "icon": "phone",
                "title": "First call",
                "description": "We listen before we quote."
              },
              {
                "icon": "wrench",
                "title": "Build",
                "description": "One team, one plan, dates you can hold us to."
              },
              {
                "icon": "check",
                "title": "Handover",
                "description": "Documented, tested and yours."
              }
            ]
          },
          "motion": {
            "preset": "none",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_magicui-landing-motion_4",
          "block": "testimonials-marquee-01",
          "props": {
            "heading": "What customers say",
            "speed": "slow",
            "items": [
              {
                "quote": "Turned up when they said, finished when they said.",
                "author": "A. de Vries",
                "role": "Rotterdam",
                "rating": 5
              },
              {
                "quote": "The quote was the price. That alone is worth it.",
                "author": "M. Jansen",
                "role": "Schiedam",
                "rating": 5
              },
              {
                "quote": "Tidy, quiet and gone by four.",
                "author": "S. Bakker",
                "role": "Delft",
                "rating": 5
              },
              {
                "quote": "Explained the options without selling me the expensive one.",
                "author": "R. Visser",
                "role": "Vlaardingen",
                "rating": 5
              }
            ]
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_magicui-landing-motion_5",
          "block": "cta-animated-border-01",
          "props": {
            "heading": "Need help today?",
            "body": "Call us and speak to someone who can actually come out.",
            "ctaLabel": "Request a quote",
            "ctaHref": "/contact",
            "tone": "primary",
            "secondaryLabel": "",
            "secondaryHref": ""
          },
          "motion": {
            "preset": "scale-in",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_magicui-landing-motion_6",
          "block": "footer-simple-01",
          "props": {
            "brand": "Your business",
            "tagline": "",
            "phone": "",
            "email": "",
            "address": "",
            "links": [
              {
                "label": "Privacy",
                "href": "/privacy"
              },
              {
                "label": "Terms",
                "href": "/terms"
              }
            ],
            "legal": ""
          },
          "motion": {
            "preset": "none",
            "trigger": "none",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "C",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Magic UI. Copyright (c) Magic UI Licensed under the MIT License.",
      "source": {
        "library": "Magic UI",
        "demo": "components",
        "url": "https://magicui.design",
        "derivation": "layout-observed"
      },
      "fingerprint": "3774d44773fbe11ac8802e9125be506c92ab909b",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "shadcn-saas-landing",
      "tier": "platform",
      "name": "shadcn — SaaS landing run",
      "description": "Cover statement, feature spotlight, pricing, FAQ, close — shadcn blocks arrangement as our sections.",
      "collection": "hero",
      "tags": [
        "landing",
        "saas",
        "shadcn",
        "full-page"
      ],
      "sections": [
        {
          "id": "sec_shadcn-saas-landing_0",
          "block": "header-simple-01",
          "props": {
            "brand": "Your business",
            "logo": "",
            "links": [
              {
                "label": "Services",
                "href": "/services"
              },
              {
                "label": "About",
                "href": "/about"
              },
              {
                "label": "Contact",
                "href": "/contact"
              }
            ],
            "ctaLabel": "Request a quote",
            "ctaHref": "/contact",
            "sticky": true
          },
          "motion": {
            "preset": "none",
            "trigger": "none",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_shadcn-saas-landing_1",
          "block": "hero-cover-statement-01",
          "props": {
            "eyebrow": "Introducing",
            "headline": "A calmer way to build the web",
            "subheadline": "One workspace for the site, the content and the growth work — without a stack of plugins.",
            "primaryLabel": "Get started",
            "primaryHref": "/contact",
            "secondaryLabel": "Browse examples",
            "secondaryHref": "/templates",
            "image": "",
            "video": "",
            "imageAlt": ""
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "load",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_shadcn-saas-landing_2",
          "block": "features-grid-01",
          "props": {
            "eyebrow": "",
            "heading": "Why clients choose us",
            "intro": "",
            "items": [
              {
                "icon": "clock",
                "title": "Available 24/7",
                "description": "Call us any time, we pick up."
              },
              {
                "icon": "shield",
                "title": "Fully insured",
                "description": "Certified and covered work."
              },
              {
                "icon": "star",
                "title": "Rated 4.9",
                "description": "Based on verified customer reviews."
              }
            ]
          },
          "motion": {
            "preset": "stagger-children",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_shadcn-saas-landing_3",
          "block": "feature-spotlight-01",
          "props": {
            "heading": "What you get",
            "items": [
              {
                "title": "Fast to start",
                "description": "Live in a day, not a quarter."
              },
              {
                "title": "Built to last",
                "description": "Maintained, monitored, supported."
              },
              {
                "title": "Priced clearly",
                "description": "One number, agreed up front."
              }
            ]
          },
          "motion": {
            "preset": "stagger-children",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_shadcn-saas-landing_4",
          "block": "pricing-toggle-01",
          "props": {
            "heading": "Simple pricing",
            "intro": "",
            "monthlyLabel": "Monthly",
            "yearlyLabel": "Yearly",
            "yearlyNote": "Two months free",
            "items": [
              {
                "name": "Starter",
                "monthlyPrice": "€49",
                "yearlyPrice": "€490",
                "period": "/month",
                "description": "For a single site that needs to look after itself.",
                "featureList": "One website\nHosting and backups\nE-mail support",
                "ctaLabel": "Choose Starter",
                "ctaHref": "/contact",
                "featured": false
              },
              {
                "name": "Growth",
                "monthlyPrice": "€149",
                "yearlyPrice": "€1490",
                "period": "/month",
                "description": "For a business that markets as well as it delivers.",
                "featureList": "Everything in Starter\nSEO and analytics\nMonthly content changes\nPriority support",
                "ctaLabel": "Choose Growth",
                "ctaHref": "/contact",
                "featured": true
              },
              {
                "name": "Scale",
                "monthlyPrice": "€399",
                "yearlyPrice": "€3990",
                "period": "/month",
                "description": "For multiple brands, shops or locations.",
                "featureList": "Everything in Growth\nMultiple sites\nCommerce and CRM\nNamed contact",
                "ctaLabel": "Talk to us",
                "ctaHref": "/contact",
                "featured": false
              }
            ]
          },
          "motion": {
            "preset": "stagger-children",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_shadcn-saas-landing_5",
          "block": "faq-accordion-01",
          "props": {
            "heading": "Frequently asked questions",
            "items": [
              {
                "question": "How quickly can you come out?",
                "answer": "Usually the same day."
              },
              {
                "question": "What does it cost?",
                "answer": "We quote up front, with no call-out fee."
              }
            ]
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_shadcn-saas-landing_6",
          "block": "cta-banner-01",
          "props": {
            "heading": "Need help today?",
            "body": "Call us and speak to someone who can actually come out.",
            "ctaLabel": "Request a quote",
            "ctaHref": "/contact",
            "tone": "primary"
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_shadcn-saas-landing_7",
          "block": "footer-simple-01",
          "props": {
            "brand": "Your business",
            "tagline": "",
            "phone": "",
            "email": "",
            "address": "",
            "links": [
              {
                "label": "Privacy",
                "href": "/privacy"
              },
              {
                "label": "Terms",
                "href": "/terms"
              }
            ],
            "legal": ""
          },
          "motion": {
            "preset": "none",
            "trigger": "none",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "B",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from shadcn/ui. Copyright (c) 2023 shadcn Licensed under the MIT License.",
      "source": {
        "library": "shadcn/ui",
        "demo": "blocks",
        "url": "https://ui.shadcn.com",
        "derivation": "layout-observed"
      },
      "fingerprint": "1425c828d9c0517931de61ae895b10cfe1cf98ac",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "nuxt-ui-marketing-landing",
      "tier": "platform",
      "name": "Nuxt UI — marketing landing",
      "description": "SaaS preview hero, bento features, social proof, pricing, contact close — Nuxt UI marketing template shape.",
      "collection": "hero",
      "tags": [
        "landing",
        "nuxt-ui",
        "full-page"
      ],
      "sections": [
        {
          "id": "sec_nuxt-ui-marketing-landing_0",
          "block": "header-simple-01",
          "props": {
            "brand": "Your business",
            "logo": "",
            "links": [
              {
                "label": "Services",
                "href": "/services"
              },
              {
                "label": "About",
                "href": "/about"
              },
              {
                "label": "Contact",
                "href": "/contact"
              }
            ],
            "ctaLabel": "Request a quote",
            "ctaHref": "/contact",
            "sticky": true
          },
          "motion": {
            "preset": "none",
            "trigger": "none",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_nuxt-ui-marketing-landing_1",
          "block": "hero-saas-preview-01",
          "props": {
            "eyebrow": "Now in public beta",
            "headline": "Ship your next site before lunch",
            "subheadline": "Describe the business once. We plan the pages, write the copy, and leave you an editor that stays out of the way.",
            "primaryLabel": "Start free",
            "primaryHref": "/signup",
            "secondaryLabel": "See how it works",
            "secondaryHref": "/demo",
            "previewImage": "",
            "previewAlt": "Product preview",
            "previewCaption": "Live editor preview"
          },
          "motion": {
            "preset": "stagger-children",
            "trigger": "load",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_nuxt-ui-marketing-landing_2",
          "block": "features-bento-grid-01",
          "props": {
            "heading": "Everything in one place",
            "intro": "Each panel is a capability. The bigger ones are the ones customers ask about first.",
            "items": [
              {
                "title": "One place for the work",
                "description": "Quotes, jobs, invoices and the history behind them.",
                "size": "wide"
              },
              {
                "title": "Live availability",
                "description": "The calendar customers actually see.",
                "size": "normal"
              },
              {
                "title": "Paid faster",
                "description": "Invoices that chase themselves.",
                "size": "normal"
              },
              {
                "title": "Built for a phone",
                "description": "Because that is where the job happens.",
                "size": "tall"
              },
              {
                "title": "Nothing to install",
                "description": "It runs in a browser and updates itself.",
                "size": "normal"
              }
            ]
          },
          "motion": {
            "preset": "stagger-children",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_nuxt-ui-marketing-landing_3",
          "block": "logos-strip-01",
          "props": {
            "heading": "Trusted by",
            "items": [
              {
                "name": "Client one",
                "image": ""
              },
              {
                "name": "Client two",
                "image": ""
              },
              {
                "name": "Client three",
                "image": ""
              }
            ]
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_nuxt-ui-marketing-landing_4",
          "block": "testimonials-grid-01",
          "props": {
            "heading": "What customers say",
            "items": [
              {
                "quote": "Fast, friendly and the price was exactly as quoted.",
                "author": "A. de Vries",
                "role": "Rotterdam",
                "rating": 5
              },
              {
                "quote": "Fixed the problem the same afternoon.",
                "author": "M. Jansen",
                "role": "Schiedam",
                "rating": 5
              }
            ]
          },
          "motion": {
            "preset": "stagger-children",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_nuxt-ui-marketing-landing_5",
          "block": "pricing-toggle-01",
          "props": {
            "heading": "Simple pricing",
            "intro": "",
            "monthlyLabel": "Monthly",
            "yearlyLabel": "Yearly",
            "yearlyNote": "Two months free",
            "items": [
              {
                "name": "Starter",
                "monthlyPrice": "€49",
                "yearlyPrice": "€490",
                "period": "/month",
                "description": "For a single site that needs to look after itself.",
                "featureList": "One website\nHosting and backups\nE-mail support",
                "ctaLabel": "Choose Starter",
                "ctaHref": "/contact",
                "featured": false
              },
              {
                "name": "Growth",
                "monthlyPrice": "€149",
                "yearlyPrice": "€1490",
                "period": "/month",
                "description": "For a business that markets as well as it delivers.",
                "featureList": "Everything in Starter\nSEO and analytics\nMonthly content changes\nPriority support",
                "ctaLabel": "Choose Growth",
                "ctaHref": "/contact",
                "featured": true
              },
              {
                "name": "Scale",
                "monthlyPrice": "€399",
                "yearlyPrice": "€3990",
                "period": "/month",
                "description": "For multiple brands, shops or locations.",
                "featureList": "Everything in Growth\nMultiple sites\nCommerce and CRM\nNamed contact",
                "ctaLabel": "Talk to us",
                "ctaHref": "/contact",
                "featured": false
              }
            ]
          },
          "motion": {
            "preset": "stagger-children",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_nuxt-ui-marketing-landing_6",
          "block": "contact-details-01",
          "props": {
            "heading": "Get in touch",
            "intro": "",
            "phone": "",
            "email": "",
            "street": "",
            "postalCode": "",
            "city": "",
            "hours": "Monday–Friday 08:00–18:00\nSaturday 09:00–13:00",
            "showMap": true
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_nuxt-ui-marketing-landing_7",
          "block": "footer-simple-01",
          "props": {
            "brand": "Your business",
            "tagline": "",
            "phone": "",
            "email": "",
            "address": "",
            "links": [
              {
                "label": "Privacy",
                "href": "/privacy"
              },
              {
                "label": "Terms",
                "href": "/terms"
              }
            ],
            "legal": ""
          },
          "motion": {
            "preset": "none",
            "trigger": "none",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "B",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Nuxt UI. Copyright (c) 2023 Nuxt Licensed under the MIT License.",
      "source": {
        "library": "Nuxt UI",
        "demo": "templates",
        "url": "https://ui.nuxt.com",
        "derivation": "layout-observed"
      },
      "fingerprint": "1e58a4000945e2457e9152e2b917b6c718d9eb3c",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "mu-magic-card",
      "tier": "platform",
      "name": "Magic UI — Magic Card",
      "description": "A spotlight effect that follows your mouse cursor and highlights borders on hover.",
      "collection": "features",
      "tags": [
        "magic-card",
        "magic-ui",
        "free"
      ],
      "sections": [
        {
          "id": "sec_mu-magic-card_0",
          "block": "features-grid-01",
          "props": {
            "eyebrow": "",
            "heading": "Why clients choose us",
            "intro": "",
            "items": [
              {
                "icon": "clock",
                "title": "Available 24/7",
                "description": "Call us any time, we pick up."
              },
              {
                "icon": "shield",
                "title": "Fully insured",
                "description": "Certified and covered work."
              },
              {
                "icon": "star",
                "title": "Rated 4.9",
                "description": "Based on verified customer reviews."
              }
            ]
          },
          "motion": {
            "preset": "stagger-children",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "A",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Magic UI. Copyright (c) Magic UI Licensed under the MIT License.",
      "source": {
        "library": "Magic UI",
        "demo": "magic-card",
        "url": "https://magicui.design",
        "derivation": "layout-observed"
      },
      "fingerprint": "9a9e7e30f84726bba1fb46ba508a70350e5b224c",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "mu-android",
      "tier": "platform",
      "name": "Magic UI — Android",
      "description": "A mockup of an Android device.",
      "collection": "content",
      "tags": [
        "android",
        "magic-ui",
        "free"
      ],
      "sections": [
        {
          "id": "sec_mu-android_0",
          "block": "gallery-compare-slider-01",
          "props": {
            "heading": "Before and after",
            "intro": "",
            "beforeImage": "",
            "beforeAlt": "",
            "beforeLabel": "Before",
            "afterImage": "",
            "afterAlt": "",
            "afterLabel": "After"
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "B",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Magic UI. Copyright (c) Magic UI Licensed under the MIT License.",
      "source": {
        "library": "Magic UI",
        "demo": "android",
        "url": "https://magicui.design",
        "derivation": "layout-observed"
      },
      "fingerprint": "3854f39839554863421c9a8260ebe11d34e75504",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "mu-warp-background",
      "tier": "platform",
      "name": "Magic UI — Warp Background",
      "description": "A card with a time warping background effect.",
      "collection": "hero",
      "tags": [
        "warp-background",
        "magic-ui",
        "free"
      ],
      "sections": [
        {
          "id": "sec_mu-warp-background_0",
          "block": "hero-agency-proof-01",
          "props": {
            "eyebrow": "",
            "headline": "Building bold brands with",
            "headlineAccent": "thoughtful design",
            "subheadline": "We help small startups tackle the world’s biggest challenges with tailored solutions that grow with them.",
            "primaryLabel": "Get Started",
            "primaryHref": "/contact",
            "trustLabel": "Trusted by 1000+ clients",
            "ratingLabel": "5.0",
            "avatars": [
              {
                "name": "A",
                "image": ""
              },
              {
                "name": "B",
                "image": ""
              },
              {
                "name": "C",
                "image": ""
              },
              {
                "name": "D",
                "image": ""
              }
            ],
            "logos": [
              {
                "name": "Northwind",
                "image": ""
              },
              {
                "name": "Acme",
                "image": ""
              },
              {
                "name": "Globex",
                "image": ""
              },
              {
                "name": "Initech",
                "image": ""
              },
              {
                "name": "Umbrella",
                "image": ""
              }
            ]
          },
          "motion": {
            "preset": "hero-reveal",
            "trigger": "load",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "A",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Magic UI. Copyright (c) Magic UI Licensed under the MIT License.",
      "source": {
        "library": "Magic UI",
        "demo": "warp-background",
        "url": "https://magicui.design",
        "derivation": "layout-observed"
      },
      "fingerprint": "d3efd63a51b0a9b3758a39906eb2b379a242777e",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "mu-line-shadow-text",
      "tier": "platform",
      "name": "Magic UI — Line Shadow Text",
      "description": "A text component with a moving line shadow.",
      "collection": "hero",
      "tags": [
        "line-shadow-text",
        "magic-ui",
        "free"
      ],
      "sections": [
        {
          "id": "sec_mu-line-shadow-text_0",
          "block": "hero-asymmetric-01",
          "props": {
            "eyebrow": "Selected work",
            "headline": "Make the first screen unforgettable",
            "subheadline": "A single composition: brand, one line, one action, one image that does the talking.",
            "primaryLabel": "Book a call",
            "primaryHref": "/contact",
            "image": "",
            "imageAlt": "Featured project"
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "load",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "B",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Magic UI. Copyright (c) Magic UI Licensed under the MIT License.",
      "source": {
        "library": "Magic UI",
        "demo": "line-shadow-text",
        "url": "https://magicui.design",
        "derivation": "layout-observed"
      },
      "fingerprint": "0c3919472a2a8136f01b86c1c0ede3a03ac607eb",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "mu-aurora-text",
      "tier": "platform",
      "name": "Magic UI — Aurora Text",
      "description": "A beautiful aurora text effect",
      "collection": "hero",
      "tags": [
        "aurora-text",
        "magic-ui",
        "free"
      ],
      "sections": [
        {
          "id": "sec_mu-aurora-text_0",
          "block": "hero-asymmetric-01",
          "props": {
            "eyebrow": "Selected work",
            "headline": "Make the first screen unforgettable",
            "subheadline": "A single composition: brand, one line, one action, one image that does the talking.",
            "primaryLabel": "Book a call",
            "primaryHref": "/contact",
            "image": "",
            "imageAlt": "Featured project"
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "load",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "B",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Magic UI. Copyright (c) Magic UI Licensed under the MIT License.",
      "source": {
        "library": "Magic UI",
        "demo": "aurora-text",
        "url": "https://magicui.design",
        "derivation": "layout-observed"
      },
      "fingerprint": "0c3919472a2a8136f01b86c1c0ede3a03ac607eb",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "mu-morphing-text",
      "tier": "platform",
      "name": "Magic UI — Morphing Text",
      "description": "A dynamic text morphing component for Magic UI.",
      "collection": "hero",
      "tags": [
        "morphing-text",
        "magic-ui",
        "free"
      ],
      "sections": [
        {
          "id": "sec_mu-morphing-text_0",
          "block": "hero-asymmetric-01",
          "props": {
            "eyebrow": "Selected work",
            "headline": "Make the first screen unforgettable",
            "subheadline": "A single composition: brand, one line, one action, one image that does the talking.",
            "primaryLabel": "Book a call",
            "primaryHref": "/contact",
            "image": "",
            "imageAlt": "Featured project"
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "load",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "B",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Magic UI. Copyright (c) Magic UI Licensed under the MIT License.",
      "source": {
        "library": "Magic UI",
        "demo": "morphing-text",
        "url": "https://magicui.design",
        "derivation": "layout-observed"
      },
      "fingerprint": "0c3919472a2a8136f01b86c1c0ede3a03ac607eb",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "mu-scroll-progress",
      "tier": "platform",
      "name": "Magic UI — Scroll Progress",
      "description": "Animated Scroll Progress for your pages",
      "collection": "content",
      "tags": [
        "scroll-progress",
        "magic-ui",
        "free"
      ],
      "sections": [
        {
          "id": "sec_mu-scroll-progress_0",
          "block": "content-text-generate-01",
          "props": {
            "heading": "",
            "body": "Every part of this platform exists because a customer asked for it twice. Nothing here is a demo.",
            "speed": "medium"
          },
          "motion": {
            "preset": "none",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "B",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Magic UI. Copyright (c) Magic UI Licensed under the MIT License.",
      "source": {
        "library": "Magic UI",
        "demo": "scroll-progress",
        "url": "https://magicui.design",
        "derivation": "layout-observed"
      },
      "fingerprint": "7c1477df7f686e9661847a456b4c683c66de29a3",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "mu-lens",
      "tier": "platform",
      "name": "Magic UI — Lens",
      "description": "A interactive component that enables zooming into images, videos and other elements.",
      "collection": "content",
      "tags": [
        "lens",
        "magic-ui",
        "free"
      ],
      "sections": [
        {
          "id": "sec_mu-lens_0",
          "block": "gallery-compare-slider-01",
          "props": {
            "heading": "Before and after",
            "intro": "",
            "beforeImage": "",
            "beforeAlt": "",
            "beforeLabel": "Before",
            "afterImage": "",
            "afterAlt": "",
            "afterLabel": "After"
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "B",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Magic UI. Copyright (c) Magic UI Licensed under the MIT License.",
      "source": {
        "library": "Magic UI",
        "demo": "lens",
        "url": "https://magicui.design",
        "derivation": "layout-observed"
      },
      "fingerprint": "3854f39839554863421c9a8260ebe11d34e75504",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "mu-progressive-blur",
      "tier": "platform",
      "name": "Magic UI — Progressive Blur",
      "description": "The Progressive Blur component adds a smooth blur gradient effect to scrollable content, indicating more content below or above.",
      "collection": "content",
      "tags": [
        "progressive-blur",
        "magic-ui",
        "free"
      ],
      "sections": [
        {
          "id": "sec_mu-progressive-blur_0",
          "block": "content-text-generate-01",
          "props": {
            "heading": "",
            "body": "Every part of this platform exists because a customer asked for it twice. Nothing here is a demo.",
            "speed": "medium"
          },
          "motion": {
            "preset": "none",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "B",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Magic UI. Copyright (c) Magic UI Licensed under the MIT License.",
      "source": {
        "library": "Magic UI",
        "demo": "progressive-blur",
        "url": "https://magicui.design",
        "derivation": "layout-observed"
      },
      "fingerprint": "7c1477df7f686e9661847a456b4c683c66de29a3",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "mu-neon-gradient-card",
      "tier": "platform",
      "name": "Magic UI — Neon Gradient Card",
      "description": "A beautiful neon card effect",
      "collection": "features",
      "tags": [
        "neon-gradient-card",
        "magic-ui",
        "free"
      ],
      "sections": [
        {
          "id": "sec_mu-neon-gradient-card_0",
          "block": "features-grid-01",
          "props": {
            "eyebrow": "",
            "heading": "Why clients choose us",
            "intro": "",
            "items": [
              {
                "icon": "clock",
                "title": "Available 24/7",
                "description": "Call us any time, we pick up."
              },
              {
                "icon": "shield",
                "title": "Fully insured",
                "description": "Certified and covered work."
              },
              {
                "icon": "star",
                "title": "Rated 4.9",
                "description": "Based on verified customer reviews."
              }
            ]
          },
          "motion": {
            "preset": "stagger-children",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "A",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Magic UI. Copyright (c) Magic UI Licensed under the MIT License.",
      "source": {
        "library": "Magic UI",
        "demo": "neon-gradient-card",
        "url": "https://magicui.design",
        "derivation": "layout-observed"
      },
      "fingerprint": "9a9e7e30f84726bba1fb46ba508a70350e5b224c",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "mu-meteors",
      "tier": "platform",
      "name": "Magic UI — Meteors",
      "description": "A meteor shower effect.",
      "collection": "hero",
      "tags": [
        "meteors",
        "magic-ui",
        "free"
      ],
      "sections": [
        {
          "id": "sec_mu-meteors_0",
          "block": "hero-agency-proof-01",
          "props": {
            "eyebrow": "",
            "headline": "Building bold brands with",
            "headlineAccent": "thoughtful design",
            "subheadline": "We help small startups tackle the world’s biggest challenges with tailored solutions that grow with them.",
            "primaryLabel": "Get Started",
            "primaryHref": "/contact",
            "trustLabel": "Trusted by 1000+ clients",
            "ratingLabel": "5.0",
            "avatars": [
              {
                "name": "A",
                "image": ""
              },
              {
                "name": "B",
                "image": ""
              },
              {
                "name": "C",
                "image": ""
              },
              {
                "name": "D",
                "image": ""
              }
            ],
            "logos": [
              {
                "name": "Northwind",
                "image": ""
              },
              {
                "name": "Acme",
                "image": ""
              },
              {
                "name": "Globex",
                "image": ""
              },
              {
                "name": "Initech",
                "image": ""
              },
              {
                "name": "Umbrella",
                "image": ""
              }
            ]
          },
          "motion": {
            "preset": "hero-reveal",
            "trigger": "load",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "A",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Magic UI. Copyright (c) Magic UI Licensed under the MIT License.",
      "source": {
        "library": "Magic UI",
        "demo": "meteors",
        "url": "https://magicui.design",
        "derivation": "layout-observed"
      },
      "fingerprint": "d3efd63a51b0a9b3758a39906eb2b379a242777e",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "mu-grid-pattern",
      "tier": "platform",
      "name": "Magic UI — Grid Pattern",
      "description": "A background grid pattern made with SVGs, fully customizable using Tailwind CSS.",
      "collection": "hero",
      "tags": [
        "grid-pattern",
        "magic-ui",
        "free"
      ],
      "sections": [
        {
          "id": "sec_mu-grid-pattern_0",
          "block": "hero-cover-statement-01",
          "props": {
            "eyebrow": "Introducing",
            "headline": "A calmer way to build the web",
            "subheadline": "One workspace for the site, the content and the growth work — without a stack of plugins.",
            "primaryLabel": "Get started",
            "primaryHref": "/contact",
            "secondaryLabel": "Browse examples",
            "secondaryHref": "/templates",
            "image": "",
            "video": "",
            "imageAlt": ""
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "load",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "A",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Magic UI. Copyright (c) Magic UI Licensed under the MIT License.",
      "source": {
        "library": "Magic UI",
        "demo": "grid-pattern",
        "url": "https://magicui.design",
        "derivation": "layout-observed"
      },
      "fingerprint": "2c6df622e8eb3c23a353a39ca22b72eda43d5cc6",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "mu-striped-pattern",
      "tier": "platform",
      "name": "Magic UI — Striped Pattern",
      "description": "A background striped pattern made with SVGs, fully customizable using Tailwind CSS.",
      "collection": "hero",
      "tags": [
        "striped-pattern",
        "magic-ui",
        "free"
      ],
      "sections": [
        {
          "id": "sec_mu-striped-pattern_0",
          "block": "hero-cover-statement-01",
          "props": {
            "eyebrow": "Introducing",
            "headline": "A calmer way to build the web",
            "subheadline": "One workspace for the site, the content and the growth work — without a stack of plugins.",
            "primaryLabel": "Get started",
            "primaryHref": "/contact",
            "secondaryLabel": "Browse examples",
            "secondaryHref": "/templates",
            "image": "",
            "video": "",
            "imageAlt": ""
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "load",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "A",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Magic UI. Copyright (c) Magic UI Licensed under the MIT License.",
      "source": {
        "library": "Magic UI",
        "demo": "striped-pattern",
        "url": "https://magicui.design",
        "derivation": "layout-observed"
      },
      "fingerprint": "2c6df622e8eb3c23a353a39ca22b72eda43d5cc6",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "mu-interactive-grid-pattern",
      "tier": "platform",
      "name": "Magic UI — Interactive Grid Pattern",
      "description": "A interactive background grid pattern made with SVGs, fully customizable using Tailwind CSS.",
      "collection": "hero",
      "tags": [
        "interactive-grid-pattern",
        "magic-ui",
        "free"
      ],
      "sections": [
        {
          "id": "sec_mu-interactive-grid-pattern_0",
          "block": "hero-cover-statement-01",
          "props": {
            "eyebrow": "Introducing",
            "headline": "A calmer way to build the web",
            "subheadline": "One workspace for the site, the content and the growth work — without a stack of plugins.",
            "primaryLabel": "Get started",
            "primaryHref": "/contact",
            "secondaryLabel": "Browse examples",
            "secondaryHref": "/templates",
            "image": "",
            "video": "",
            "imageAlt": ""
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "load",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "A",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Magic UI. Copyright (c) Magic UI Licensed under the MIT License.",
      "source": {
        "library": "Magic UI",
        "demo": "interactive-grid-pattern",
        "url": "https://magicui.design",
        "derivation": "layout-observed"
      },
      "fingerprint": "2c6df622e8eb3c23a353a39ca22b72eda43d5cc6",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "mu-dot-pattern",
      "tier": "platform",
      "name": "Magic UI — Dot Pattern",
      "description": "A background dot pattern made with SVGs, fully customizable using Tailwind CSS.",
      "collection": "hero",
      "tags": [
        "dot-pattern",
        "magic-ui",
        "free"
      ],
      "sections": [
        {
          "id": "sec_mu-dot-pattern_0",
          "block": "hero-cover-statement-01",
          "props": {
            "eyebrow": "Introducing",
            "headline": "A calmer way to build the web",
            "subheadline": "One workspace for the site, the content and the growth work — without a stack of plugins.",
            "primaryLabel": "Get started",
            "primaryHref": "/contact",
            "secondaryLabel": "Browse examples",
            "secondaryHref": "/templates",
            "image": "",
            "video": "",
            "imageAlt": ""
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "load",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "A",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Magic UI. Copyright (c) Magic UI Licensed under the MIT License.",
      "source": {
        "library": "Magic UI",
        "demo": "dot-pattern",
        "url": "https://magicui.design",
        "derivation": "layout-observed"
      },
      "fingerprint": "2c6df622e8eb3c23a353a39ca22b72eda43d5cc6",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "mu-flickering-grid",
      "tier": "platform",
      "name": "Magic UI — Flickering Grid",
      "description": "A flickering grid background made with SVGs, fully customizable using Tailwind CSS.",
      "collection": "hero",
      "tags": [
        "flickering-grid",
        "magic-ui",
        "free"
      ],
      "sections": [
        {
          "id": "sec_mu-flickering-grid_0",
          "block": "hero-cover-statement-01",
          "props": {
            "eyebrow": "Introducing",
            "headline": "A calmer way to build the web",
            "subheadline": "One workspace for the site, the content and the growth work — without a stack of plugins.",
            "primaryLabel": "Get started",
            "primaryHref": "/contact",
            "secondaryLabel": "Browse examples",
            "secondaryHref": "/templates",
            "image": "",
            "video": "",
            "imageAlt": ""
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "load",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "A",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Magic UI. Copyright (c) Magic UI Licensed under the MIT License.",
      "source": {
        "library": "Magic UI",
        "demo": "flickering-grid",
        "url": "https://magicui.design",
        "derivation": "layout-observed"
      },
      "fingerprint": "2c6df622e8eb3c23a353a39ca22b72eda43d5cc6",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "mu-hero-video-dialog",
      "tier": "platform",
      "name": "Magic UI — Hero Video Dialog",
      "description": "A hero video dialog component.",
      "collection": "hero",
      "tags": [
        "hero-video-dialog",
        "magic-ui",
        "free"
      ],
      "sections": [
        {
          "id": "sec_mu-hero-video-dialog_0",
          "block": "hero-agency-proof-01",
          "props": {
            "eyebrow": "",
            "headline": "Building bold brands with",
            "headlineAccent": "thoughtful design",
            "subheadline": "We help small startups tackle the world’s biggest challenges with tailored solutions that grow with them.",
            "primaryLabel": "Get Started",
            "primaryHref": "/contact",
            "trustLabel": "Trusted by 1000+ clients",
            "ratingLabel": "5.0",
            "avatars": [
              {
                "name": "A",
                "image": ""
              },
              {
                "name": "B",
                "image": ""
              },
              {
                "name": "C",
                "image": ""
              },
              {
                "name": "D",
                "image": ""
              }
            ],
            "logos": [
              {
                "name": "Northwind",
                "image": ""
              },
              {
                "name": "Acme",
                "image": ""
              },
              {
                "name": "Globex",
                "image": ""
              },
              {
                "name": "Initech",
                "image": ""
              },
              {
                "name": "Umbrella",
                "image": ""
              }
            ]
          },
          "motion": {
            "preset": "hero-reveal",
            "trigger": "load",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "A",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Magic UI. Copyright (c) Magic UI Licensed under the MIT License.",
      "source": {
        "library": "Magic UI",
        "demo": "hero-video-dialog",
        "url": "https://magicui.design",
        "derivation": "layout-observed"
      },
      "fingerprint": "d3efd63a51b0a9b3758a39906eb2b379a242777e",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "mu-code-comparison",
      "tier": "platform",
      "name": "Magic UI — Code Comparison",
      "description": "A component which compares two code snippets.",
      "collection": "utility",
      "tags": [
        "code-comparison",
        "magic-ui",
        "free"
      ],
      "sections": [
        {
          "id": "sec_mu-code-comparison_0",
          "block": "content-text-generate-01",
          "props": {
            "heading": "",
            "body": "Every part of this platform exists because a customer asked for it twice. Nothing here is a demo.",
            "speed": "medium"
          },
          "motion": {
            "preset": "none",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "B",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Magic UI. Copyright (c) Magic UI Licensed under the MIT License.",
      "source": {
        "library": "Magic UI",
        "demo": "code-comparison",
        "url": "https://magicui.design",
        "derivation": "layout-observed"
      },
      "fingerprint": "7c1477df7f686e9661847a456b4c683c66de29a3",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "mu-script-copy-btn",
      "tier": "platform",
      "name": "Magic UI — Script Copy Button",
      "description": "Copy code to clipboard",
      "collection": "utility",
      "tags": [
        "script-copy-btn",
        "magic-ui",
        "free"
      ],
      "sections": [
        {
          "id": "sec_mu-script-copy-btn_0",
          "block": "content-text-generate-01",
          "props": {
            "heading": "",
            "body": "Every part of this platform exists because a customer asked for it twice. Nothing here is a demo.",
            "speed": "medium"
          },
          "motion": {
            "preset": "none",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "B",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Magic UI. Copyright (c) Magic UI Licensed under the MIT License.",
      "source": {
        "library": "Magic UI",
        "demo": "script-copy-btn",
        "url": "https://magicui.design",
        "derivation": "layout-observed"
      },
      "fingerprint": "7c1477df7f686e9661847a456b4c683c66de29a3",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "mu-marquee",
      "tier": "platform",
      "name": "Magic UI — Marquee",
      "description": "An infinite scrolling component that can be used to display text, images, or videos.",
      "collection": "proof",
      "tags": [
        "marquee",
        "magic-ui",
        "free"
      ],
      "sections": [
        {
          "id": "sec_mu-marquee_0",
          "block": "logos-orbit-01",
          "props": {
            "heading": "Trusted by teams like yours",
            "subheading": "",
            "items": [
              {
                "name": "Client one",
                "image": ""
              },
              {
                "name": "Client two",
                "image": ""
              },
              {
                "name": "Client three",
                "image": ""
              },
              {
                "name": "Client four",
                "image": ""
              },
              {
                "name": "Client five",
                "image": ""
              },
              {
                "name": "Client six",
                "image": ""
              }
            ]
          },
          "motion": {
            "preset": "scale-in",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "B",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Magic UI. Copyright (c) Magic UI Licensed under the MIT License.",
      "source": {
        "library": "Magic UI",
        "demo": "marquee",
        "url": "https://magicui.design",
        "derivation": "layout-observed"
      },
      "fingerprint": "10e33176b34356f5386f62880d0a07ffb4ed2cb2",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "mu-glyph-matrix",
      "tier": "platform",
      "name": "Magic UI — Glyph Matrix",
      "description": "An animated grid of subtly shifting glyphs with fade effect and theme support.",
      "collection": "hero",
      "tags": [
        "glyph-matrix",
        "magic-ui",
        "free"
      ],
      "sections": [
        {
          "id": "sec_mu-glyph-matrix_0",
          "block": "hero-cover-statement-01",
          "props": {
            "eyebrow": "Introducing",
            "headline": "A calmer way to build the web",
            "subheadline": "One workspace for the site, the content and the growth work — without a stack of plugins.",
            "primaryLabel": "Get started",
            "primaryHref": "/contact",
            "secondaryLabel": "Browse examples",
            "secondaryHref": "/templates",
            "image": "",
            "video": "",
            "imageAlt": ""
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "load",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "A",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Magic UI. Copyright (c) Magic UI Licensed under the MIT License.",
      "source": {
        "library": "Magic UI",
        "demo": "glyph-matrix",
        "url": "https://magicui.design",
        "derivation": "layout-observed"
      },
      "fingerprint": "2c6df622e8eb3c23a353a39ca22b72eda43d5cc6",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "mu-globe",
      "tier": "platform",
      "name": "Magic UI — Globe",
      "description": "An autorotating, interactive, and highly performant globe made using WebGL.",
      "collection": "features",
      "tags": [
        "globe",
        "magic-ui",
        "free"
      ],
      "sections": [
        {
          "id": "sec_mu-globe_0",
          "block": "features-grid-01",
          "props": {
            "eyebrow": "",
            "heading": "Why clients choose us",
            "intro": "",
            "items": [
              {
                "icon": "clock",
                "title": "Available 24/7",
                "description": "Call us any time, we pick up."
              },
              {
                "icon": "shield",
                "title": "Fully insured",
                "description": "Certified and covered work."
              },
              {
                "icon": "star",
                "title": "Rated 4.9",
                "description": "Based on verified customer reviews."
              }
            ]
          },
          "motion": {
            "preset": "stagger-children",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "A",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Magic UI. Copyright (c) Magic UI Licensed under the MIT License.",
      "source": {
        "library": "Magic UI",
        "demo": "globe",
        "url": "https://magicui.design",
        "derivation": "layout-observed"
      },
      "fingerprint": "9a9e7e30f84726bba1fb46ba508a70350e5b224c",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "mu-shimmer-button",
      "tier": "platform",
      "name": "Magic UI — Shimmer Button",
      "description": "A button with a shimmering light which travels around the perimeter.",
      "collection": "conversion",
      "tags": [
        "shimmer-button",
        "magic-ui",
        "free"
      ],
      "sections": [
        {
          "id": "sec_mu-shimmer-button_0",
          "block": "cta-animated-border-01",
          "props": {
            "heading": "Need help today?",
            "body": "Call us and speak to someone who can actually come out.",
            "ctaLabel": "Request a quote",
            "ctaHref": "/contact",
            "tone": "primary",
            "secondaryLabel": "",
            "secondaryHref": ""
          },
          "motion": {
            "preset": "scale-in",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "B",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Magic UI. Copyright (c) Magic UI Licensed under the MIT License.",
      "source": {
        "library": "Magic UI",
        "demo": "shimmer-button",
        "url": "https://magicui.design",
        "derivation": "layout-observed"
      },
      "fingerprint": "42a792ba7945cc4d465959cc3313be77c0eab2de",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "mu-tweet-card",
      "tier": "platform",
      "name": "Magic UI — Tweet Card",
      "description": "A card that displays a tweet with the author's name, handle, and profile picture.",
      "collection": "proof",
      "tags": [
        "tweet-card",
        "magic-ui",
        "free"
      ],
      "sections": [
        {
          "id": "sec_mu-tweet-card_0",
          "block": "logos-orbit-01",
          "props": {
            "heading": "Trusted by teams like yours",
            "subheading": "",
            "items": [
              {
                "name": "Client one",
                "image": ""
              },
              {
                "name": "Client two",
                "image": ""
              },
              {
                "name": "Client three",
                "image": ""
              },
              {
                "name": "Client four",
                "image": ""
              },
              {
                "name": "Client five",
                "image": ""
              },
              {
                "name": "Client six",
                "image": ""
              }
            ]
          },
          "motion": {
            "preset": "scale-in",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "B",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Magic UI. Copyright (c) Magic UI Licensed under the MIT License.",
      "source": {
        "library": "Magic UI",
        "demo": "tweet-card",
        "url": "https://magicui.design",
        "derivation": "layout-observed"
      },
      "fingerprint": "10e33176b34356f5386f62880d0a07ffb4ed2cb2",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "mu-client-tweet-card",
      "tier": "platform",
      "name": "Magic UI — Client Tweet Card",
      "description": "A client-side version of the tweet card that displays a tweet with the author's name, handle, and profile picture.",
      "collection": "proof",
      "tags": [
        "client-tweet-card",
        "magic-ui",
        "free"
      ],
      "sections": [
        {
          "id": "sec_mu-client-tweet-card_0",
          "block": "logos-orbit-01",
          "props": {
            "heading": "Trusted by teams like yours",
            "subheading": "",
            "items": [
              {
                "name": "Client one",
                "image": ""
              },
              {
                "name": "Client two",
                "image": ""
              },
              {
                "name": "Client three",
                "image": ""
              },
              {
                "name": "Client four",
                "image": ""
              },
              {
                "name": "Client five",
                "image": ""
              },
              {
                "name": "Client six",
                "image": ""
              }
            ]
          },
          "motion": {
            "preset": "scale-in",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "B",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Magic UI. Copyright (c) Magic UI Licensed under the MIT License.",
      "source": {
        "library": "Magic UI",
        "demo": "client-tweet-card",
        "url": "https://magicui.design",
        "derivation": "layout-observed"
      },
      "fingerprint": "10e33176b34356f5386f62880d0a07ffb4ed2cb2",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "mu-bento-grid",
      "tier": "platform",
      "name": "Magic UI — Bento Grid",
      "description": "Bento grid is a layout used to showcase the features of a product in a simple and elegant way.",
      "collection": "features",
      "tags": [
        "bento-grid",
        "magic-ui",
        "free"
      ],
      "sections": [
        {
          "id": "sec_mu-bento-grid_0",
          "block": "features-bento-grid-01",
          "props": {
            "heading": "Everything in one place",
            "intro": "Each panel is a capability. The bigger ones are the ones customers ask about first.",
            "items": [
              {
                "title": "One place for the work",
                "description": "Quotes, jobs, invoices and the history behind them.",
                "size": "wide"
              },
              {
                "title": "Live availability",
                "description": "The calendar customers actually see.",
                "size": "normal"
              },
              {
                "title": "Paid faster",
                "description": "Invoices that chase themselves.",
                "size": "normal"
              },
              {
                "title": "Built for a phone",
                "description": "Because that is where the job happens.",
                "size": "tall"
              },
              {
                "title": "Nothing to install",
                "description": "It runs in a browser and updates itself.",
                "size": "normal"
              }
            ]
          },
          "motion": {
            "preset": "stagger-children",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "A",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Magic UI. Copyright (c) Magic UI Licensed under the MIT License.",
      "source": {
        "library": "Magic UI",
        "demo": "bento-grid",
        "url": "https://magicui.design",
        "derivation": "layout-observed"
      },
      "fingerprint": "bec76f9524e5021c01aff0c31c85cbe21a95ab19",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "mu-particles",
      "tier": "platform",
      "name": "Magic UI — Particles",
      "description": "Particles are a fun way to add some visual flair to your website. They can be used to create a sense of depth, movement, and interactivity.",
      "collection": "hero",
      "tags": [
        "particles",
        "magic-ui",
        "free"
      ],
      "sections": [
        {
          "id": "sec_mu-particles_0",
          "block": "hero-agency-proof-01",
          "props": {
            "eyebrow": "",
            "headline": "Building bold brands with",
            "headlineAccent": "thoughtful design",
            "subheadline": "We help small startups tackle the world’s biggest challenges with tailored solutions that grow with them.",
            "primaryLabel": "Get Started",
            "primaryHref": "/contact",
            "trustLabel": "Trusted by 1000+ clients",
            "ratingLabel": "5.0",
            "avatars": [
              {
                "name": "A",
                "image": ""
              },
              {
                "name": "B",
                "image": ""
              },
              {
                "name": "C",
                "image": ""
              },
              {
                "name": "D",
                "image": ""
              }
            ],
            "logos": [
              {
                "name": "Northwind",
                "image": ""
              },
              {
                "name": "Acme",
                "image": ""
              },
              {
                "name": "Globex",
                "image": ""
              },
              {
                "name": "Initech",
                "image": ""
              },
              {
                "name": "Umbrella",
                "image": ""
              }
            ]
          },
          "motion": {
            "preset": "hero-reveal",
            "trigger": "load",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "A",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Magic UI. Copyright (c) Magic UI Licensed under the MIT License.",
      "source": {
        "library": "Magic UI",
        "demo": "particles",
        "url": "https://magicui.design",
        "derivation": "layout-observed"
      },
      "fingerprint": "d3efd63a51b0a9b3758a39906eb2b379a242777e",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "mu-number-ticker",
      "tier": "platform",
      "name": "Magic UI — Number Ticker",
      "description": "Animate numbers to count up or down to a target number",
      "collection": "proof",
      "tags": [
        "number-ticker",
        "magic-ui",
        "free"
      ],
      "sections": [
        {
          "id": "sec_mu-number-ticker_0",
          "block": "stats-counter-01",
          "props": {
            "items": [
              {
                "value": 15,
                "suffix": "+",
                "label": "Years in business"
              },
              {
                "value": 2500,
                "suffix": "",
                "label": "Jobs completed"
              },
              {
                "value": 49,
                "suffix": "",
                "label": "Average rating ×10"
              }
            ]
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "B",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Magic UI. Copyright (c) Magic UI Licensed under the MIT License.",
      "source": {
        "library": "Magic UI",
        "demo": "number-ticker",
        "url": "https://magicui.design",
        "derivation": "layout-observed"
      },
      "fingerprint": "e0832f3b7d071c26d2801579cf6833b49c2caf0f",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "mu-ripple",
      "tier": "platform",
      "name": "Magic UI — Ripple",
      "description": "An animated ripple effect typically used behind elements to emphasize them.",
      "collection": "hero",
      "tags": [
        "ripple",
        "magic-ui",
        "free"
      ],
      "sections": [
        {
          "id": "sec_mu-ripple_0",
          "block": "hero-cover-statement-01",
          "props": {
            "eyebrow": "Introducing",
            "headline": "A calmer way to build the web",
            "subheadline": "One workspace for the site, the content and the growth work — without a stack of plugins.",
            "primaryLabel": "Get started",
            "primaryHref": "/contact",
            "secondaryLabel": "Browse examples",
            "secondaryHref": "/templates",
            "image": "",
            "video": "",
            "imageAlt": ""
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "load",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "A",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Magic UI. Copyright (c) Magic UI Licensed under the MIT License.",
      "source": {
        "library": "Magic UI",
        "demo": "ripple",
        "url": "https://magicui.design",
        "derivation": "layout-observed"
      },
      "fingerprint": "2c6df622e8eb3c23a353a39ca22b72eda43d5cc6",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "mu-retro-grid",
      "tier": "platform",
      "name": "Magic UI — Retro Grid",
      "description": "An animated scrolling retro grid effect",
      "collection": "hero",
      "tags": [
        "retro-grid",
        "magic-ui",
        "free"
      ],
      "sections": [
        {
          "id": "sec_mu-retro-grid_0",
          "block": "hero-cover-statement-01",
          "props": {
            "eyebrow": "Introducing",
            "headline": "A calmer way to build the web",
            "subheadline": "One workspace for the site, the content and the growth work — without a stack of plugins.",
            "primaryLabel": "Get started",
            "primaryHref": "/contact",
            "secondaryLabel": "Browse examples",
            "secondaryHref": "/templates",
            "image": "",
            "video": "",
            "imageAlt": ""
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "load",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "A",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Magic UI. Copyright (c) Magic UI Licensed under the MIT License.",
      "source": {
        "library": "Magic UI",
        "demo": "retro-grid",
        "url": "https://magicui.design",
        "derivation": "layout-observed"
      },
      "fingerprint": "2c6df622e8eb3c23a353a39ca22b72eda43d5cc6",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "mu-animated-list",
      "tier": "platform",
      "name": "Magic UI — Animated List",
      "description": "A list that animates each item in sequence with a delay. Used to showcase notifications or events on your landing page.",
      "collection": "content",
      "tags": [
        "animated-list",
        "magic-ui",
        "free"
      ],
      "sections": [
        {
          "id": "sec_mu-animated-list_0",
          "block": "content-text-generate-01",
          "props": {
            "heading": "",
            "body": "Every part of this platform exists because a customer asked for it twice. Nothing here is a demo.",
            "speed": "medium"
          },
          "motion": {
            "preset": "none",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "B",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Magic UI. Copyright (c) Magic UI Licensed under the MIT License.",
      "source": {
        "library": "Magic UI",
        "demo": "animated-list",
        "url": "https://magicui.design",
        "derivation": "layout-observed"
      },
      "fingerprint": "7c1477df7f686e9661847a456b4c683c66de29a3",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "mu-animated-shiny-text",
      "tier": "platform",
      "name": "Magic UI — Animated Shiny Text",
      "description": "A light glare effect which pans across text making it appear as if it is shimmering.",
      "collection": "hero",
      "tags": [
        "animated-shiny-text",
        "magic-ui",
        "free"
      ],
      "sections": [
        {
          "id": "sec_mu-animated-shiny-text_0",
          "block": "hero-asymmetric-01",
          "props": {
            "eyebrow": "Selected work",
            "headline": "Make the first screen unforgettable",
            "subheadline": "A single composition: brand, one line, one action, one image that does the talking.",
            "primaryLabel": "Book a call",
            "primaryHref": "/contact",
            "image": "",
            "imageAlt": "Featured project"
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "load",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "B",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Magic UI. Copyright (c) Magic UI Licensed under the MIT License.",
      "source": {
        "library": "Magic UI",
        "demo": "animated-shiny-text",
        "url": "https://magicui.design",
        "derivation": "layout-observed"
      },
      "fingerprint": "0c3919472a2a8136f01b86c1c0ede3a03ac607eb",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "mu-animated-grid-pattern",
      "tier": "platform",
      "name": "Magic UI — Animated Grid Pattern",
      "description": "A animated background grid pattern made with SVGs, fully customizable using Tailwind CSS.",
      "collection": "hero",
      "tags": [
        "animated-grid-pattern",
        "magic-ui",
        "free"
      ],
      "sections": [
        {
          "id": "sec_mu-animated-grid-pattern_0",
          "block": "hero-cover-statement-01",
          "props": {
            "eyebrow": "Introducing",
            "headline": "A calmer way to build the web",
            "subheadline": "One workspace for the site, the content and the growth work — without a stack of plugins.",
            "primaryLabel": "Get started",
            "primaryHref": "/contact",
            "secondaryLabel": "Browse examples",
            "secondaryHref": "/templates",
            "image": "",
            "video": "",
            "imageAlt": ""
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "load",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "A",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Magic UI. Copyright (c) Magic UI Licensed under the MIT License.",
      "source": {
        "library": "Magic UI",
        "demo": "animated-grid-pattern",
        "url": "https://magicui.design",
        "derivation": "layout-observed"
      },
      "fingerprint": "2c6df622e8eb3c23a353a39ca22b72eda43d5cc6",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "mu-border-beam",
      "tier": "platform",
      "name": "Magic UI — Border Beam",
      "description": "An animated beam of light which travels along the border of its container.",
      "collection": "features",
      "tags": [
        "border-beam",
        "magic-ui",
        "free"
      ],
      "sections": [
        {
          "id": "sec_mu-border-beam_0",
          "block": "features-grid-01",
          "props": {
            "eyebrow": "",
            "heading": "Why clients choose us",
            "intro": "",
            "items": [
              {
                "icon": "clock",
                "title": "Available 24/7",
                "description": "Call us any time, we pick up."
              },
              {
                "icon": "shield",
                "title": "Fully insured",
                "description": "Certified and covered work."
              },
              {
                "icon": "star",
                "title": "Rated 4.9",
                "description": "Based on verified customer reviews."
              }
            ]
          },
          "motion": {
            "preset": "stagger-children",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "A",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Magic UI. Copyright (c) Magic UI Licensed under the MIT License.",
      "source": {
        "library": "Magic UI",
        "demo": "border-beam",
        "url": "https://magicui.design",
        "derivation": "layout-observed"
      },
      "fingerprint": "9a9e7e30f84726bba1fb46ba508a70350e5b224c",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "mu-animated-beam",
      "tier": "platform",
      "name": "Magic UI — Animated Beam",
      "description": "An animated beam of light which travels along a path. Useful for showcasing the integration features of a website.",
      "collection": "features",
      "tags": [
        "animated-beam",
        "magic-ui",
        "free"
      ],
      "sections": [
        {
          "id": "sec_mu-animated-beam_0",
          "block": "features-grid-01",
          "props": {
            "eyebrow": "",
            "heading": "Why clients choose us",
            "intro": "",
            "items": [
              {
                "icon": "clock",
                "title": "Available 24/7",
                "description": "Call us any time, we pick up."
              },
              {
                "icon": "shield",
                "title": "Fully insured",
                "description": "Certified and covered work."
              },
              {
                "icon": "star",
                "title": "Rated 4.9",
                "description": "Based on verified customer reviews."
              }
            ]
          },
          "motion": {
            "preset": "stagger-children",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "A",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Magic UI. Copyright (c) Magic UI Licensed under the MIT License.",
      "source": {
        "library": "Magic UI",
        "demo": "animated-beam",
        "url": "https://magicui.design",
        "derivation": "layout-observed"
      },
      "fingerprint": "9a9e7e30f84726bba1fb46ba508a70350e5b224c",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "mu-text-reveal",
      "tier": "platform",
      "name": "Magic UI — Text Reveal",
      "description": "Fade in text as you scroll down the page.",
      "collection": "hero",
      "tags": [
        "text-reveal",
        "magic-ui",
        "free"
      ],
      "sections": [
        {
          "id": "sec_mu-text-reveal_0",
          "block": "hero-asymmetric-01",
          "props": {
            "eyebrow": "Selected work",
            "headline": "Make the first screen unforgettable",
            "subheadline": "A single composition: brand, one line, one action, one image that does the talking.",
            "primaryLabel": "Book a call",
            "primaryHref": "/contact",
            "image": "",
            "imageAlt": "Featured project"
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "load",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "B",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Magic UI. Copyright (c) Magic UI Licensed under the MIT License.",
      "source": {
        "library": "Magic UI",
        "demo": "text-reveal",
        "url": "https://magicui.design",
        "derivation": "layout-observed"
      },
      "fingerprint": "0c3919472a2a8136f01b86c1c0ede3a03ac607eb",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "mu-hyper-text",
      "tier": "platform",
      "name": "Magic UI — Hyper Text",
      "description": "A text animation that scrambles letters before revealing the final text.",
      "collection": "hero",
      "tags": [
        "hyper-text",
        "magic-ui",
        "free"
      ],
      "sections": [
        {
          "id": "sec_mu-hyper-text_0",
          "block": "hero-asymmetric-01",
          "props": {
            "eyebrow": "Selected work",
            "headline": "Make the first screen unforgettable",
            "subheadline": "A single composition: brand, one line, one action, one image that does the talking.",
            "primaryLabel": "Book a call",
            "primaryHref": "/contact",
            "image": "",
            "imageAlt": "Featured project"
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "load",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "B",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Magic UI. Copyright (c) Magic UI Licensed under the MIT License.",
      "source": {
        "library": "Magic UI",
        "demo": "hyper-text",
        "url": "https://magicui.design",
        "derivation": "layout-observed"
      },
      "fingerprint": "0c3919472a2a8136f01b86c1c0ede3a03ac607eb",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "mu-animated-gradient-text",
      "tier": "platform",
      "name": "Magic UI — Animated Gradient Text",
      "description": "An animated gradient background which transitions between colors for text.",
      "collection": "hero",
      "tags": [
        "animated-gradient-text",
        "magic-ui",
        "free"
      ],
      "sections": [
        {
          "id": "sec_mu-animated-gradient-text_0",
          "block": "hero-asymmetric-01",
          "props": {
            "eyebrow": "Selected work",
            "headline": "Make the first screen unforgettable",
            "subheadline": "A single composition: brand, one line, one action, one image that does the talking.",
            "primaryLabel": "Book a call",
            "primaryHref": "/contact",
            "image": "",
            "imageAlt": "Featured project"
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "load",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "B",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Magic UI. Copyright (c) Magic UI Licensed under the MIT License.",
      "source": {
        "library": "Magic UI",
        "demo": "animated-gradient-text",
        "url": "https://magicui.design",
        "derivation": "layout-observed"
      },
      "fingerprint": "0c3919472a2a8136f01b86c1c0ede3a03ac607eb",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "mu-orbiting-circles",
      "tier": "platform",
      "name": "Magic UI — Orbiting Circles",
      "description": "A collection of circles which move in orbit along a circular path",
      "collection": "features",
      "tags": [
        "orbiting-circles",
        "magic-ui",
        "free"
      ],
      "sections": [
        {
          "id": "sec_mu-orbiting-circles_0",
          "block": "features-grid-01",
          "props": {
            "eyebrow": "",
            "heading": "Why clients choose us",
            "intro": "",
            "items": [
              {
                "icon": "clock",
                "title": "Available 24/7",
                "description": "Call us any time, we pick up."
              },
              {
                "icon": "shield",
                "title": "Fully insured",
                "description": "Certified and covered work."
              },
              {
                "icon": "star",
                "title": "Rated 4.9",
                "description": "Based on verified customer reviews."
              }
            ]
          },
          "motion": {
            "preset": "stagger-children",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "A",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Magic UI. Copyright (c) Magic UI Licensed under the MIT License.",
      "source": {
        "library": "Magic UI",
        "demo": "orbiting-circles",
        "url": "https://magicui.design",
        "derivation": "layout-observed"
      },
      "fingerprint": "9a9e7e30f84726bba1fb46ba508a70350e5b224c",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "mu-dock",
      "tier": "platform",
      "name": "Magic UI — Dock",
      "description": "An implementation of the MacOS dock using react + tailwindcss + motion",
      "collection": "navigation",
      "tags": [
        "dock",
        "magic-ui",
        "free"
      ],
      "sections": [
        {
          "id": "sec_mu-dock_0",
          "block": "header-liquid-glass-01",
          "props": {
            "brand": "Wanderful",
            "trademark": true,
            "links": [
              {
                "label": "JOURNEY",
                "href": "#journey"
              },
              {
                "label": "BENEFITS",
                "href": "#benefits"
              },
              {
                "label": "JOURNAL",
                "href": "#journal"
              },
              {
                "label": "GUIDEBOOK",
                "href": "#guidebook"
              }
            ],
            "ctaLabel": "GET ROAMING",
            "ctaHref": "#plan"
          },
          "motion": {
            "preset": "none",
            "trigger": "none",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "B",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Magic UI. Copyright (c) Magic UI Licensed under the MIT License.",
      "source": {
        "library": "Magic UI",
        "demo": "dock",
        "url": "https://magicui.design",
        "derivation": "layout-observed"
      },
      "fingerprint": "eba36ef076bf83775da7b2f2787a8d8157b13b34",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "mu-word-rotate",
      "tier": "platform",
      "name": "Magic UI — Word Rotate",
      "description": "A vertical rotation of words",
      "collection": "hero",
      "tags": [
        "word-rotate",
        "magic-ui",
        "free"
      ],
      "sections": [
        {
          "id": "sec_mu-word-rotate_0",
          "block": "hero-cover-statement-01",
          "props": {
            "eyebrow": "Introducing",
            "headline": "A calmer way to build the web",
            "subheadline": "One workspace for the site, the content and the growth work — without a stack of plugins.",
            "primaryLabel": "Get started",
            "primaryHref": "/contact",
            "secondaryLabel": "Browse examples",
            "secondaryHref": "/templates",
            "image": "",
            "video": "",
            "imageAlt": ""
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "load",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "A",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Magic UI. Copyright (c) Magic UI Licensed under the MIT License.",
      "source": {
        "library": "Magic UI",
        "demo": "word-rotate",
        "url": "https://magicui.design",
        "derivation": "layout-observed"
      },
      "fingerprint": "2c6df622e8eb3c23a353a39ca22b72eda43d5cc6",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "mu-avatar-circles",
      "tier": "platform",
      "name": "Magic UI — Avatar Circles",
      "description": "Overlapping circles of avatars.",
      "collection": "proof",
      "tags": [
        "avatar-circles",
        "magic-ui",
        "free"
      ],
      "sections": [
        {
          "id": "sec_mu-avatar-circles_0",
          "block": "logos-orbit-01",
          "props": {
            "heading": "Trusted by teams like yours",
            "subheading": "",
            "items": [
              {
                "name": "Client one",
                "image": ""
              },
              {
                "name": "Client two",
                "image": ""
              },
              {
                "name": "Client three",
                "image": ""
              },
              {
                "name": "Client four",
                "image": ""
              },
              {
                "name": "Client five",
                "image": ""
              },
              {
                "name": "Client six",
                "image": ""
              }
            ]
          },
          "motion": {
            "preset": "scale-in",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "B",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Magic UI. Copyright (c) Magic UI Licensed under the MIT License.",
      "source": {
        "library": "Magic UI",
        "demo": "avatar-circles",
        "url": "https://magicui.design",
        "derivation": "layout-observed"
      },
      "fingerprint": "10e33176b34356f5386f62880d0a07ffb4ed2cb2",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "mu-typing-animation",
      "tier": "platform",
      "name": "Magic UI — Typing Animation",
      "description": "Characters appearing in typed animation",
      "collection": "hero",
      "tags": [
        "typing-animation",
        "magic-ui",
        "free"
      ],
      "sections": [
        {
          "id": "sec_mu-typing-animation_0",
          "block": "hero-cover-statement-01",
          "props": {
            "eyebrow": "Introducing",
            "headline": "A calmer way to build the web",
            "subheadline": "One workspace for the site, the content and the growth work — without a stack of plugins.",
            "primaryLabel": "Get started",
            "primaryHref": "/contact",
            "secondaryLabel": "Browse examples",
            "secondaryHref": "/templates",
            "image": "",
            "video": "",
            "imageAlt": ""
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "load",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "A",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Magic UI. Copyright (c) Magic UI Licensed under the MIT License.",
      "source": {
        "library": "Magic UI",
        "demo": "typing-animation",
        "url": "https://magicui.design",
        "derivation": "layout-observed"
      },
      "fingerprint": "2c6df622e8eb3c23a353a39ca22b72eda43d5cc6",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "mu-sparkles-text",
      "tier": "platform",
      "name": "Magic UI — Sparkles Text",
      "description": "A dynamic text that generates continuous sparkles with smooth transitions, perfect for highlighting text with animated stars.",
      "collection": "hero",
      "tags": [
        "sparkles-text",
        "magic-ui",
        "free"
      ],
      "sections": [
        {
          "id": "sec_mu-sparkles-text_0",
          "block": "hero-asymmetric-01",
          "props": {
            "eyebrow": "Selected work",
            "headline": "Make the first screen unforgettable",
            "subheadline": "A single composition: brand, one line, one action, one image that does the talking.",
            "primaryLabel": "Book a call",
            "primaryHref": "/contact",
            "image": "",
            "imageAlt": "Featured project"
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "load",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "B",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Magic UI. Copyright (c) Magic UI Licensed under the MIT License.",
      "source": {
        "library": "Magic UI",
        "demo": "sparkles-text",
        "url": "https://magicui.design",
        "derivation": "layout-observed"
      },
      "fingerprint": "0c3919472a2a8136f01b86c1c0ede3a03ac607eb",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "mu-spinning-text",
      "tier": "platform",
      "name": "Magic UI — Spinning Text",
      "description": "The Spinning Text component animates text in a circular motion with customizable speed, direction, color, and transitions for dynamic and engaging effects.",
      "collection": "hero",
      "tags": [
        "spinning-text",
        "magic-ui",
        "free"
      ],
      "sections": [
        {
          "id": "sec_mu-spinning-text_0",
          "block": "hero-asymmetric-01",
          "props": {
            "eyebrow": "Selected work",
            "headline": "Make the first screen unforgettable",
            "subheadline": "A single composition: brand, one line, one action, one image that does the talking.",
            "primaryLabel": "Book a call",
            "primaryHref": "/contact",
            "image": "",
            "imageAlt": "Featured project"
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "load",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "B",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Magic UI. Copyright (c) Magic UI Licensed under the MIT License.",
      "source": {
        "library": "Magic UI",
        "demo": "spinning-text",
        "url": "https://magicui.design",
        "derivation": "layout-observed"
      },
      "fingerprint": "0c3919472a2a8136f01b86c1c0ede3a03ac607eb",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "mu-flip-text",
      "tier": "platform",
      "name": "Magic UI — Flip Text",
      "description": "Text flipping character animation",
      "collection": "hero",
      "tags": [
        "flip-text",
        "magic-ui",
        "free"
      ],
      "sections": [
        {
          "id": "sec_mu-flip-text_0",
          "block": "hero-asymmetric-01",
          "props": {
            "eyebrow": "Selected work",
            "headline": "Make the first screen unforgettable",
            "subheadline": "A single composition: brand, one line, one action, one image that does the talking.",
            "primaryLabel": "Book a call",
            "primaryHref": "/contact",
            "image": "",
            "imageAlt": "Featured project"
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "load",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "B",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Magic UI. Copyright (c) Magic UI Licensed under the MIT License.",
      "source": {
        "library": "Magic UI",
        "demo": "flip-text",
        "url": "https://magicui.design",
        "derivation": "layout-observed"
      },
      "fingerprint": "0c3919472a2a8136f01b86c1c0ede3a03ac607eb",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "mu-comic-text",
      "tier": "platform",
      "name": "Magic UI — Comic Text",
      "description": "Comic text animation",
      "collection": "hero",
      "tags": [
        "comic-text",
        "magic-ui",
        "free"
      ],
      "sections": [
        {
          "id": "sec_mu-comic-text_0",
          "block": "hero-asymmetric-01",
          "props": {
            "eyebrow": "Selected work",
            "headline": "Make the first screen unforgettable",
            "subheadline": "A single composition: brand, one line, one action, one image that does the talking.",
            "primaryLabel": "Book a call",
            "primaryHref": "/contact",
            "image": "",
            "imageAlt": "Featured project"
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "load",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "B",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Magic UI. Copyright (c) Magic UI Licensed under the MIT License.",
      "source": {
        "library": "Magic UI",
        "demo": "comic-text",
        "url": "https://magicui.design",
        "derivation": "layout-observed"
      },
      "fingerprint": "0c3919472a2a8136f01b86c1c0ede3a03ac607eb",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "mu-icon-cloud",
      "tier": "platform",
      "name": "Magic UI — Icon Cloud",
      "description": "An interactive 3D tag cloud component",
      "collection": "features",
      "tags": [
        "icon-cloud",
        "magic-ui",
        "free"
      ],
      "sections": [
        {
          "id": "sec_mu-icon-cloud_0",
          "block": "features-grid-01",
          "props": {
            "eyebrow": "",
            "heading": "Why clients choose us",
            "intro": "",
            "items": [
              {
                "icon": "clock",
                "title": "Available 24/7",
                "description": "Call us any time, we pick up."
              },
              {
                "icon": "shield",
                "title": "Fully insured",
                "description": "Certified and covered work."
              },
              {
                "icon": "star",
                "title": "Rated 4.9",
                "description": "Based on verified customer reviews."
              }
            ]
          },
          "motion": {
            "preset": "stagger-children",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "A",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Magic UI. Copyright (c) Magic UI Licensed under the MIT License.",
      "source": {
        "library": "Magic UI",
        "demo": "icon-cloud",
        "url": "https://magicui.design",
        "derivation": "layout-observed"
      },
      "fingerprint": "9a9e7e30f84726bba1fb46ba508a70350e5b224c",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "mu-text-animate",
      "tier": "platform",
      "name": "Magic UI — Text Animate",
      "description": "A text animation component that animates text using a variety of different animations.",
      "collection": "hero",
      "tags": [
        "text-animate",
        "magic-ui",
        "free"
      ],
      "sections": [
        {
          "id": "sec_mu-text-animate_0",
          "block": "hero-asymmetric-01",
          "props": {
            "eyebrow": "Selected work",
            "headline": "Make the first screen unforgettable",
            "subheadline": "A single composition: brand, one line, one action, one image that does the talking.",
            "primaryLabel": "Book a call",
            "primaryHref": "/contact",
            "image": "",
            "imageAlt": "Featured project"
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "load",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "B",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Magic UI. Copyright (c) Magic UI Licensed under the MIT License.",
      "source": {
        "library": "Magic UI",
        "demo": "text-animate",
        "url": "https://magicui.design",
        "derivation": "layout-observed"
      },
      "fingerprint": "0c3919472a2a8136f01b86c1c0ede3a03ac607eb",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "mu-scroll-based-velocity",
      "tier": "platform",
      "name": "Magic UI — Scroll Based Velocity",
      "description": "Scrolling text whose speed changes based on scroll speed",
      "collection": "hero",
      "tags": [
        "scroll-based-velocity",
        "magic-ui",
        "free"
      ],
      "sections": [
        {
          "id": "sec_mu-scroll-based-velocity_0",
          "block": "hero-cover-statement-01",
          "props": {
            "eyebrow": "Introducing",
            "headline": "A calmer way to build the web",
            "subheadline": "One workspace for the site, the content and the growth work — without a stack of plugins.",
            "primaryLabel": "Get started",
            "primaryHref": "/contact",
            "secondaryLabel": "Browse examples",
            "secondaryHref": "/templates",
            "image": "",
            "video": "",
            "imageAlt": ""
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "load",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "A",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Magic UI. Copyright (c) Magic UI Licensed under the MIT License.",
      "source": {
        "library": "Magic UI",
        "demo": "scroll-based-velocity",
        "url": "https://magicui.design",
        "derivation": "layout-observed"
      },
      "fingerprint": "2c6df622e8eb3c23a353a39ca22b72eda43d5cc6",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "mu-scratch-to-reveal",
      "tier": "platform",
      "name": "Magic UI — Scratch To Reveal",
      "description": "The ScratchToReveal component creates an interactive scratch-off effect with customizable dimensions and animations, revealing hidden content beneath.",
      "collection": "hero",
      "tags": [
        "scratch-to-reveal",
        "magic-ui",
        "free"
      ],
      "sections": [
        {
          "id": "sec_mu-scratch-to-reveal_0",
          "block": "hero-cover-statement-01",
          "props": {
            "eyebrow": "Introducing",
            "headline": "A calmer way to build the web",
            "subheadline": "One workspace for the site, the content and the growth work — without a stack of plugins.",
            "primaryLabel": "Get started",
            "primaryHref": "/contact",
            "secondaryLabel": "Browse examples",
            "secondaryHref": "/templates",
            "image": "",
            "video": "",
            "imageAlt": ""
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "load",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "A",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Magic UI. Copyright (c) Magic UI Licensed under the MIT License.",
      "source": {
        "library": "Magic UI",
        "demo": "scratch-to-reveal",
        "url": "https://magicui.design",
        "derivation": "layout-observed"
      },
      "fingerprint": "2c6df622e8eb3c23a353a39ca22b72eda43d5cc6",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "mu-shiny-button",
      "tier": "platform",
      "name": "Magic UI — Shiny Button",
      "description": "A shiny button component with dynamic styles in the dark mode or light mode.",
      "collection": "conversion",
      "tags": [
        "shiny-button",
        "magic-ui",
        "free"
      ],
      "sections": [
        {
          "id": "sec_mu-shiny-button_0",
          "block": "cta-animated-border-01",
          "props": {
            "heading": "Need help today?",
            "body": "Call us and speak to someone who can actually come out.",
            "ctaLabel": "Request a quote",
            "ctaHref": "/contact",
            "tone": "primary",
            "secondaryLabel": "",
            "secondaryHref": ""
          },
          "motion": {
            "preset": "scale-in",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "B",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Magic UI. Copyright (c) Magic UI Licensed under the MIT License.",
      "source": {
        "library": "Magic UI",
        "demo": "shiny-button",
        "url": "https://magicui.design",
        "derivation": "layout-observed"
      },
      "fingerprint": "42a792ba7945cc4d465959cc3313be77c0eab2de",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "mu-box-reveal",
      "tier": "platform",
      "name": "Magic UI — Box Reveal Animation",
      "description": "Sliding box animation that reveals text behind it.",
      "collection": "hero",
      "tags": [
        "box-reveal",
        "magic-ui",
        "free"
      ],
      "sections": [
        {
          "id": "sec_mu-box-reveal_0",
          "block": "hero-cover-statement-01",
          "props": {
            "eyebrow": "Introducing",
            "headline": "A calmer way to build the web",
            "subheadline": "One workspace for the site, the content and the growth work — without a stack of plugins.",
            "primaryLabel": "Get started",
            "primaryHref": "/contact",
            "secondaryLabel": "Browse examples",
            "secondaryHref": "/templates",
            "image": "",
            "video": "",
            "imageAlt": ""
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "load",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "A",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Magic UI. Copyright (c) Magic UI Licensed under the MIT License.",
      "source": {
        "library": "Magic UI",
        "demo": "box-reveal",
        "url": "https://magicui.design",
        "derivation": "layout-observed"
      },
      "fingerprint": "2c6df622e8eb3c23a353a39ca22b72eda43d5cc6",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "mu-shine-border",
      "tier": "platform",
      "name": "Magic UI — Shine Border",
      "description": "Shine border is an animated background border effect.",
      "collection": "features",
      "tags": [
        "shine-border",
        "magic-ui",
        "free"
      ],
      "sections": [
        {
          "id": "sec_mu-shine-border_0",
          "block": "features-grid-01",
          "props": {
            "eyebrow": "",
            "heading": "Why clients choose us",
            "intro": "",
            "items": [
              {
                "icon": "clock",
                "title": "Available 24/7",
                "description": "Call us any time, we pick up."
              },
              {
                "icon": "shield",
                "title": "Fully insured",
                "description": "Certified and covered work."
              },
              {
                "icon": "star",
                "title": "Rated 4.9",
                "description": "Based on verified customer reviews."
              }
            ]
          },
          "motion": {
            "preset": "stagger-children",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "A",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Magic UI. Copyright (c) Magic UI Licensed under the MIT License.",
      "source": {
        "library": "Magic UI",
        "demo": "shine-border",
        "url": "https://magicui.design",
        "derivation": "layout-observed"
      },
      "fingerprint": "9a9e7e30f84726bba1fb46ba508a70350e5b224c",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "mu-animated-circular-progress-bar",
      "tier": "platform",
      "name": "Magic UI — Animated Circular Progress Bar",
      "description": "Animated Circular Progress Bar is a component that displays a circular gauge with a percentage value.",
      "collection": "proof",
      "tags": [
        "animated-circular-progress-bar",
        "magic-ui",
        "free"
      ],
      "sections": [
        {
          "id": "sec_mu-animated-circular-progress-bar_0",
          "block": "stats-counter-01",
          "props": {
            "items": [
              {
                "value": 15,
                "suffix": "+",
                "label": "Years in business"
              },
              {
                "value": 2500,
                "suffix": "",
                "label": "Jobs completed"
              },
              {
                "value": 49,
                "suffix": "",
                "label": "Average rating ×10"
              }
            ]
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "B",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Magic UI. Copyright (c) Magic UI Licensed under the MIT License.",
      "source": {
        "library": "Magic UI",
        "demo": "animated-circular-progress-bar",
        "url": "https://magicui.design",
        "derivation": "layout-observed"
      },
      "fingerprint": "e0832f3b7d071c26d2801579cf6833b49c2caf0f",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "mu-pulsating-button",
      "tier": "platform",
      "name": "Magic UI — Pulsating Button",
      "description": "An animated pulsating button useful for capturing attention of users.",
      "collection": "conversion",
      "tags": [
        "pulsating-button",
        "magic-ui",
        "free"
      ],
      "sections": [
        {
          "id": "sec_mu-pulsating-button_0",
          "block": "cta-animated-border-01",
          "props": {
            "heading": "Need help today?",
            "body": "Call us and speak to someone who can actually come out.",
            "ctaLabel": "Request a quote",
            "ctaHref": "/contact",
            "tone": "primary",
            "secondaryLabel": "",
            "secondaryHref": ""
          },
          "motion": {
            "preset": "scale-in",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "B",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Magic UI. Copyright (c) Magic UI Licensed under the MIT License.",
      "source": {
        "library": "Magic UI",
        "demo": "pulsating-button",
        "url": "https://magicui.design",
        "derivation": "layout-observed"
      },
      "fingerprint": "42a792ba7945cc4d465959cc3313be77c0eab2de",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "mu-ripple-button",
      "tier": "platform",
      "name": "Magic UI — Ripple Button",
      "description": "An animated button with ripple useful for user engagement.",
      "collection": "conversion",
      "tags": [
        "ripple-button",
        "magic-ui",
        "free"
      ],
      "sections": [
        {
          "id": "sec_mu-ripple-button_0",
          "block": "cta-animated-border-01",
          "props": {
            "heading": "Need help today?",
            "body": "Call us and speak to someone who can actually come out.",
            "ctaLabel": "Request a quote",
            "ctaHref": "/contact",
            "tone": "primary",
            "secondaryLabel": "",
            "secondaryHref": ""
          },
          "motion": {
            "preset": "scale-in",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "B",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Magic UI. Copyright (c) Magic UI Licensed under the MIT License.",
      "source": {
        "library": "Magic UI",
        "demo": "ripple-button",
        "url": "https://magicui.design",
        "derivation": "layout-observed"
      },
      "fingerprint": "42a792ba7945cc4d465959cc3313be77c0eab2de",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "mu-file-tree",
      "tier": "platform",
      "name": "Magic UI — File Tree",
      "description": "A component used to showcase the folder and file structure of a directory.",
      "collection": "utility",
      "tags": [
        "file-tree",
        "magic-ui",
        "free"
      ],
      "sections": [
        {
          "id": "sec_mu-file-tree_0",
          "block": "content-text-generate-01",
          "props": {
            "heading": "",
            "body": "Every part of this platform exists because a customer asked for it twice. Nothing here is a demo.",
            "speed": "medium"
          },
          "motion": {
            "preset": "none",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "B",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Magic UI. Copyright (c) Magic UI Licensed under the MIT License.",
      "source": {
        "library": "Magic UI",
        "demo": "file-tree",
        "url": "https://magicui.design",
        "derivation": "layout-observed"
      },
      "fingerprint": "7c1477df7f686e9661847a456b4c683c66de29a3",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "mu-blur-fade",
      "tier": "platform",
      "name": "Magic UI — Blur Fade",
      "description": "Blur fade in and out animation. Used to smoothly fade in and out content.",
      "collection": "content",
      "tags": [
        "blur-fade",
        "magic-ui",
        "free"
      ],
      "sections": [
        {
          "id": "sec_mu-blur-fade_0",
          "block": "content-text-generate-01",
          "props": {
            "heading": "",
            "body": "Every part of this platform exists because a customer asked for it twice. Nothing here is a demo.",
            "speed": "medium"
          },
          "motion": {
            "preset": "none",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "B",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Magic UI. Copyright (c) Magic UI Licensed under the MIT License.",
      "source": {
        "library": "Magic UI",
        "demo": "blur-fade",
        "url": "https://magicui.design",
        "derivation": "layout-observed"
      },
      "fingerprint": "7c1477df7f686e9661847a456b4c683c66de29a3",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "mu-safari",
      "tier": "platform",
      "name": "Magic UI — Safari",
      "description": "A safari browser mockup to showcase your website.",
      "collection": "content",
      "tags": [
        "safari",
        "magic-ui",
        "free"
      ],
      "sections": [
        {
          "id": "sec_mu-safari_0",
          "block": "gallery-compare-slider-01",
          "props": {
            "heading": "Before and after",
            "intro": "",
            "beforeImage": "",
            "beforeAlt": "",
            "beforeLabel": "Before",
            "afterImage": "",
            "afterAlt": "",
            "afterLabel": "After"
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "B",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Magic UI. Copyright (c) Magic UI Licensed under the MIT License.",
      "source": {
        "library": "Magic UI",
        "demo": "safari",
        "url": "https://magicui.design",
        "derivation": "layout-observed"
      },
      "fingerprint": "3854f39839554863421c9a8260ebe11d34e75504",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "mu-iphone-15-pro",
      "tier": "platform",
      "name": "Magic UI — iPhone 15 Pro",
      "description": "A mockup of the iPhone 15 Pro",
      "collection": "content",
      "tags": [
        "iphone-15-pro",
        "magic-ui",
        "free"
      ],
      "sections": [
        {
          "id": "sec_mu-iphone-15-pro_0",
          "block": "gallery-compare-slider-01",
          "props": {
            "heading": "Before and after",
            "intro": "",
            "beforeImage": "",
            "beforeAlt": "",
            "beforeLabel": "Before",
            "afterImage": "",
            "afterAlt": "",
            "afterLabel": "After"
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "B",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Magic UI. Copyright (c) Magic UI Licensed under the MIT License.",
      "source": {
        "library": "Magic UI",
        "demo": "iphone-15-pro",
        "url": "https://magicui.design",
        "derivation": "layout-observed"
      },
      "fingerprint": "3854f39839554863421c9a8260ebe11d34e75504",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "mu-rainbow-button",
      "tier": "platform",
      "name": "Magic UI — Rainbow Button",
      "description": "An animated button with a rainbow effect.",
      "collection": "conversion",
      "tags": [
        "rainbow-button",
        "magic-ui",
        "free"
      ],
      "sections": [
        {
          "id": "sec_mu-rainbow-button_0",
          "block": "cta-animated-border-01",
          "props": {
            "heading": "Need help today?",
            "body": "Call us and speak to someone who can actually come out.",
            "ctaLabel": "Request a quote",
            "ctaHref": "/contact",
            "tone": "primary",
            "secondaryLabel": "",
            "secondaryHref": ""
          },
          "motion": {
            "preset": "scale-in",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "B",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Magic UI. Copyright (c) Magic UI Licensed under the MIT License.",
      "source": {
        "library": "Magic UI",
        "demo": "rainbow-button",
        "url": "https://magicui.design",
        "derivation": "layout-observed"
      },
      "fingerprint": "42a792ba7945cc4d465959cc3313be77c0eab2de",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "mu-interactive-hover-button",
      "tier": "platform",
      "name": "Magic UI — interactive-hover-button",
      "description": "Layout derived from Magic UI interactive-hover-button.",
      "collection": "conversion",
      "tags": [
        "interactive-hover-button",
        "magic-ui",
        "free"
      ],
      "sections": [
        {
          "id": "sec_mu-interactive-hover-button_0",
          "block": "cta-animated-border-01",
          "props": {
            "heading": "Need help today?",
            "body": "Call us and speak to someone who can actually come out.",
            "ctaLabel": "Request a quote",
            "ctaHref": "/contact",
            "tone": "primary",
            "secondaryLabel": "",
            "secondaryHref": ""
          },
          "motion": {
            "preset": "scale-in",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "B",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Magic UI. Copyright (c) Magic UI Licensed under the MIT License.",
      "source": {
        "library": "Magic UI",
        "demo": "interactive-hover-button",
        "url": "https://magicui.design",
        "derivation": "layout-observed"
      },
      "fingerprint": "42a792ba7945cc4d465959cc3313be77c0eab2de",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "mu-terminal",
      "tier": "platform",
      "name": "Magic UI — Terminal",
      "description": "A terminal component",
      "collection": "utility",
      "tags": [
        "terminal",
        "magic-ui",
        "free"
      ],
      "sections": [
        {
          "id": "sec_mu-terminal_0",
          "block": "content-text-generate-01",
          "props": {
            "heading": "",
            "body": "Every part of this platform exists because a customer asked for it twice. Nothing here is a demo.",
            "speed": "medium"
          },
          "motion": {
            "preset": "none",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "B",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Magic UI. Copyright (c) Magic UI Licensed under the MIT License.",
      "source": {
        "library": "Magic UI",
        "demo": "terminal",
        "url": "https://magicui.design",
        "derivation": "layout-observed"
      },
      "fingerprint": "7c1477df7f686e9661847a456b4c683c66de29a3",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "mu-video-text",
      "tier": "platform",
      "name": "Magic UI — Video Text",
      "description": "A component that displays text with a video playing in the background.",
      "collection": "content",
      "tags": [
        "video-text",
        "magic-ui",
        "free"
      ],
      "sections": [
        {
          "id": "sec_mu-video-text_0",
          "block": "gallery-compare-slider-01",
          "props": {
            "heading": "Before and after",
            "intro": "",
            "beforeImage": "",
            "beforeAlt": "",
            "beforeLabel": "Before",
            "afterImage": "",
            "afterAlt": "",
            "afterLabel": "After"
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "B",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Magic UI. Copyright (c) Magic UI Licensed under the MIT License.",
      "source": {
        "library": "Magic UI",
        "demo": "video-text",
        "url": "https://magicui.design",
        "derivation": "layout-observed"
      },
      "fingerprint": "3854f39839554863421c9a8260ebe11d34e75504",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "mu-pixel-image",
      "tier": "platform",
      "name": "Magic UI — Pixel Image",
      "description": "A component that displays an image with a pixelated effect, creating a retro aesthetic.",
      "collection": "content",
      "tags": [
        "pixel-image",
        "magic-ui",
        "free"
      ],
      "sections": [
        {
          "id": "sec_mu-pixel-image_0",
          "block": "gallery-compare-slider-01",
          "props": {
            "heading": "Before and after",
            "intro": "",
            "beforeImage": "",
            "beforeAlt": "",
            "beforeLabel": "Before",
            "afterImage": "",
            "afterAlt": "",
            "afterLabel": "After"
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "B",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Magic UI. Copyright (c) Magic UI Licensed under the MIT License.",
      "source": {
        "library": "Magic UI",
        "demo": "pixel-image",
        "url": "https://magicui.design",
        "derivation": "layout-observed"
      },
      "fingerprint": "3854f39839554863421c9a8260ebe11d34e75504",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "mu-highlighter",
      "tier": "platform",
      "name": "Magic UI — Highlighter",
      "description": "A text highlighter that mimics the effect of a human-drawn marker stroke.",
      "collection": "hero",
      "tags": [
        "highlighter",
        "magic-ui",
        "free"
      ],
      "sections": [
        {
          "id": "sec_mu-highlighter_0",
          "block": "hero-cover-statement-01",
          "props": {
            "eyebrow": "Introducing",
            "headline": "A calmer way to build the web",
            "subheadline": "One workspace for the site, the content and the growth work — without a stack of plugins.",
            "primaryLabel": "Get started",
            "primaryHref": "/contact",
            "secondaryLabel": "Browse examples",
            "secondaryHref": "/templates",
            "image": "",
            "video": "",
            "imageAlt": ""
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "load",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "A",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Magic UI. Copyright (c) Magic UI Licensed under the MIT License.",
      "source": {
        "library": "Magic UI",
        "demo": "highlighter",
        "url": "https://magicui.design",
        "derivation": "layout-observed"
      },
      "fingerprint": "2c6df622e8eb3c23a353a39ca22b72eda43d5cc6",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "mu-arc-timeline",
      "tier": "platform",
      "name": "Magic UI — Arc Timeline",
      "description": "A curved timeline that elegantly visualizes key milestones, perfect for Web3 and AI roadmaps.",
      "collection": "content",
      "tags": [
        "arc-timeline",
        "magic-ui",
        "free"
      ],
      "sections": [
        {
          "id": "sec_mu-arc-timeline_0",
          "block": "content-text-generate-01",
          "props": {
            "heading": "",
            "body": "Every part of this platform exists because a customer asked for it twice. Nothing here is a demo.",
            "speed": "medium"
          },
          "motion": {
            "preset": "none",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "B",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Magic UI. Copyright (c) Magic UI Licensed under the MIT License.",
      "source": {
        "library": "Magic UI",
        "demo": "arc-timeline",
        "url": "https://magicui.design",
        "derivation": "layout-observed"
      },
      "fingerprint": "7c1477df7f686e9661847a456b4c683c66de29a3",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "mu-grid-beams",
      "tier": "platform",
      "name": "Magic UI — Grid Beams",
      "description": "A dynamic grid background with animated light beams rays and grid patterns.",
      "collection": "content",
      "tags": [
        "grid-beams",
        "magic-ui",
        "free"
      ],
      "sections": [
        {
          "id": "sec_mu-grid-beams_0",
          "block": "content-text-generate-01",
          "props": {
            "heading": "",
            "body": "Every part of this platform exists because a customer asked for it twice. Nothing here is a demo.",
            "speed": "medium"
          },
          "motion": {
            "preset": "none",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "B",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Magic UI. Copyright (c) Magic UI Licensed under the MIT License.",
      "source": {
        "library": "Magic UI",
        "demo": "grid-beams",
        "url": "https://magicui.design",
        "derivation": "layout-observed"
      },
      "fingerprint": "7c1477df7f686e9661847a456b4c683c66de29a3",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "mu-recipe-hero-depth",
      "tier": "platform",
      "name": "Magic UI — Hero with visual depth",
      "description": "Hero with animated background depth, blur-fade headline entrance, and one primary CTA. Keep at most two high-motion effects.",
      "collection": "hero",
      "tags": [
        "recipe",
        "magic-ui",
        "free",
        "warp-background",
        "blur-fade",
        "shiny-button"
      ],
      "sections": [
        {
          "id": "sec_mu-recipe-hero-depth_0",
          "block": "hero-agency-proof-01",
          "props": {
            "eyebrow": "",
            "headline": "Building bold brands with",
            "headlineAccent": "thoughtful design",
            "subheadline": "We help small startups tackle the world’s biggest challenges with tailored solutions that grow with them.",
            "primaryLabel": "Get Started",
            "primaryHref": "/contact",
            "trustLabel": "Trusted by 1000+ clients",
            "ratingLabel": "5.0",
            "avatars": [
              {
                "name": "A",
                "image": ""
              },
              {
                "name": "B",
                "image": ""
              },
              {
                "name": "C",
                "image": ""
              },
              {
                "name": "D",
                "image": ""
              }
            ],
            "logos": [
              {
                "name": "Northwind",
                "image": ""
              },
              {
                "name": "Acme",
                "image": ""
              },
              {
                "name": "Globex",
                "image": ""
              },
              {
                "name": "Initech",
                "image": ""
              },
              {
                "name": "Umbrella",
                "image": ""
              }
            ]
          },
          "motion": {
            "preset": "hero-reveal",
            "trigger": "load",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "A",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Magic UI. Copyright (c) Magic UI Licensed under the MIT License.",
      "source": {
        "library": "Magic UI",
        "demo": "recipe-hero-depth",
        "url": "https://magicui.design",
        "derivation": "layout-adapted"
      },
      "fingerprint": "d3efd63a51b0a9b3758a39906eb2b379a242777e",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "mu-recipe-trust-marquee",
      "tier": "platform",
      "name": "Magic UI — Testimonial and logo trust rail",
      "description": "Social proof as a horizontal marquee with optional avatar clusters. Pause on hover/focus; keep copy short.",
      "collection": "proof",
      "tags": [
        "recipe",
        "magic-ui",
        "free",
        "marquee",
        "avatar-circles"
      ],
      "sections": [
        {
          "id": "sec_mu-recipe-trust-marquee_0",
          "block": "logos-orbit-01",
          "props": {
            "heading": "Trusted by teams like yours",
            "subheading": "",
            "items": [
              {
                "name": "Client one",
                "image": ""
              },
              {
                "name": "Client two",
                "image": ""
              },
              {
                "name": "Client three",
                "image": ""
              },
              {
                "name": "Client four",
                "image": ""
              },
              {
                "name": "Client five",
                "image": ""
              },
              {
                "name": "Client six",
                "image": ""
              }
            ]
          },
          "motion": {
            "preset": "scale-in",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "B",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Magic UI. Copyright (c) Magic UI Licensed under the MIT License.",
      "source": {
        "library": "Magic UI",
        "demo": "recipe-trust-marquee",
        "url": "https://magicui.design",
        "derivation": "layout-adapted"
      },
      "fingerprint": "10e33176b34356f5386f62880d0a07ffb4ed2cb2",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "mu-recipe-feature-bento",
      "tier": "platform",
      "name": "Magic UI — Feature grid with motion highlights",
      "description": "Bento feature grid with motion emphasis on one or two cards only. Short, scannable card copy.",
      "collection": "features",
      "tags": [
        "recipe",
        "magic-ui",
        "free",
        "bento-grid",
        "text-animate"
      ],
      "sections": [
        {
          "id": "sec_mu-recipe-feature-bento_0",
          "block": "features-bento-grid-01",
          "props": {
            "heading": "Everything in one place",
            "intro": "Each panel is a capability. The bigger ones are the ones customers ask about first.",
            "items": [
              {
                "title": "One place for the work",
                "description": "Quotes, jobs, invoices and the history behind them.",
                "size": "wide"
              },
              {
                "title": "Live availability",
                "description": "The calendar customers actually see.",
                "size": "normal"
              },
              {
                "title": "Paid faster",
                "description": "Invoices that chase themselves.",
                "size": "normal"
              },
              {
                "title": "Built for a phone",
                "description": "Because that is where the job happens.",
                "size": "tall"
              },
              {
                "title": "Nothing to install",
                "description": "It runs in a browser and updates itself.",
                "size": "normal"
              }
            ]
          },
          "motion": {
            "preset": "stagger-children",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "A",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Magic UI. Copyright (c) Magic UI Licensed under the MIT License.",
      "source": {
        "library": "Magic UI",
        "demo": "recipe-feature-bento",
        "url": "https://magicui.design",
        "derivation": "layout-adapted"
      },
      "fingerprint": "bec76f9524e5021c01aff0c31c85cbe21a95ab19",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "ss-about-us-section-01",
      "tier": "platform",
      "name": "About Us 01 - Impact Metrics",
      "description": "A bold about us section combining value pillars, headline messaging, and performance counters, perfect for agencies or studios to highlight expertise, achievements, and credibility at a glance.",
      "collection": "content",
      "tags": [
        "about-us-section",
        "shadcn-space",
        "free"
      ],
      "sections": [
        {
          "id": "sec_ss-about-us-section-01_0",
          "block": "about-scroll-story-01",
          "props": {
            "heading": "How we got here",
            "image": "",
            "imageAlt": "",
            "items": [
              {
                "year": "2014",
                "title": "Two of us and a van",
                "description": "One town, word of mouth, no website."
              },
              {
                "year": "2019",
                "title": "A proper workshop",
                "description": "Room to prefabricate meant shorter jobs on site."
              },
              {
                "year": "2024",
                "title": "Twelve people",
                "description": "Same standard of work, more of it, still local."
              }
            ]
          },
          "motion": {
            "preset": "none",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "C",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Shadcn Space. Copyright (c) 2026 Shadcn Space Licensed under the MIT License.",
      "source": {
        "library": "Shadcn Space",
        "demo": "about-us-section-01",
        "url": "https://shadcnspace.com",
        "derivation": "layout-observed"
      },
      "fingerprint": "2915455178cfe70ea72d1ca7d73502947a0d0bdd",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "ss-bento-grid-01",
      "tier": "platform",
      "name": "Bento Grid 01 - Customer Testimonials",
      "description": "Discover authentic feedback from satisfied customers who trust our components to build faster, streamline development workflows, and confidently launch scalable, production-ready applications.",
      "collection": "features",
      "tags": [
        "bento-grid",
        "shadcn-space",
        "free"
      ],
      "sections": [
        {
          "id": "sec_ss-bento-grid-01_0",
          "block": "features-grid-01",
          "props": {
            "eyebrow": "",
            "heading": "Why clients choose us",
            "intro": "",
            "items": [
              {
                "icon": "clock",
                "title": "Available 24/7",
                "description": "Call us any time, we pick up."
              },
              {
                "icon": "shield",
                "title": "Fully insured",
                "description": "Certified and covered work."
              },
              {
                "icon": "star",
                "title": "Rated 4.9",
                "description": "Based on verified customer reviews."
              }
            ]
          },
          "motion": {
            "preset": "stagger-children",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "A",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Shadcn Space. Copyright (c) 2026 Shadcn Space Licensed under the MIT License.",
      "source": {
        "library": "Shadcn Space",
        "demo": "bento-grid-01",
        "url": "https://shadcnspace.com",
        "derivation": "layout-observed"
      },
      "fingerprint": "9a9e7e30f84726bba1fb46ba508a70350e5b224c",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "ss-bio-link-01",
      "tier": "platform",
      "name": "Bio Link 01 - Founder Bio Link",
      "description": "A clean founder-focused bio links layout with profile image, quick access buttons, social links, and CTA section, perfect for showcasing products and updates.",
      "collection": "features",
      "tags": [
        "bio-link",
        "shadcn-space",
        "free"
      ],
      "sections": [
        {
          "id": "sec_ss-bio-link-01_0",
          "block": "content-richtext-01",
          "props": {
            "heading": "",
            "body": "Write about your business here."
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "A",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Shadcn Space. Copyright (c) 2026 Shadcn Space Licensed under the MIT License.",
      "source": {
        "library": "Shadcn Space",
        "demo": "bio-link-01",
        "url": "https://shadcnspace.com",
        "derivation": "layout-observed"
      },
      "fingerprint": "4e2fbf5a8489b97da888f7e426327fbf47eea886",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "ss-blog-01",
      "tier": "platform",
      "name": "Blog 01 - Latest Blog & News Grid",
      "description": "A modern blog section with featured posts, large thumbnails, publish dates, and headlines, ideal for sharing agency updates, design insights, and thought leadership to keep visitors engaged.",
      "collection": "content",
      "tags": [
        "blog",
        "shadcn-space",
        "free"
      ],
      "sections": [
        {
          "id": "sec_ss-blog-01_0",
          "block": "blog-card-grid-01",
          "props": {
            "heading": "From the blog",
            "intro": "",
            "items": [
              {
                "title": "What a quote should actually contain",
                "excerpt": "Six things to check before you accept a price for building work.",
                "category": "Guides",
                "date": "",
                "readingTime": "4 min",
                "image": "",
                "imageAlt": "",
                "href": ""
              },
              {
                "title": "Why we stopped offering the cheapest option",
                "excerpt": "And what we offer instead, which costs less over five years.",
                "category": "Opinion",
                "date": "",
                "readingTime": "6 min",
                "image": "",
                "imageAlt": "",
                "href": ""
              },
              {
                "title": "A week on site, hour by hour",
                "excerpt": "What actually happens between the survey and the handover.",
                "category": "Behind the scenes",
                "date": "",
                "readingTime": "8 min",
                "image": "",
                "imageAlt": "",
                "href": ""
              }
            ]
          },
          "motion": {
            "preset": "stagger-children",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "A",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Shadcn Space. Copyright (c) 2026 Shadcn Space Licensed under the MIT License.",
      "source": {
        "library": "Shadcn Space",
        "demo": "blog-01",
        "url": "https://shadcnspace.com",
        "derivation": "layout-observed"
      },
      "fingerprint": "5e10f71d963d2a0e3cfbd24b6409b58c31b0b9a1",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "ss-contact-01",
      "tier": "platform",
      "name": "Contact 01 - Project Inquiry Contact Form",
      "description": "A conversion focused contact section with project inquiry form, contact details, and trust badges, ideal for agencies or freelancers to capture qualified leads and start meaningful client conversations.",
      "collection": "conversion",
      "tags": [
        "contact",
        "shadcn-space",
        "free"
      ],
      "sections": [
        {
          "id": "sec_ss-contact-01_0",
          "block": "contact-details-01",
          "props": {
            "heading": "Get in touch",
            "intro": "",
            "phone": "",
            "email": "",
            "street": "",
            "postalCode": "",
            "city": "",
            "hours": "Monday–Friday 08:00–18:00\nSaturday 09:00–13:00",
            "showMap": true
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "A",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Shadcn Space. Copyright (c) 2026 Shadcn Space Licensed under the MIT License.",
      "source": {
        "library": "Shadcn Space",
        "demo": "contact-01",
        "url": "https://shadcnspace.com",
        "derivation": "layout-observed"
      },
      "fingerprint": "99bd400683ce47cde194f6f4f2f50693f21cb992",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "ss-cta-01",
      "tier": "platform",
      "name": "CTA 01 - Gradient Call-to-Action Banner",
      "description": "A minimal full width CTA section with soft gradient background, persuasive headline, and primary action button, perfect for converting visitors into leads at the end of any page.",
      "collection": "conversion",
      "tags": [
        "cta",
        "shadcn-space",
        "free"
      ],
      "sections": [
        {
          "id": "sec_ss-cta-01_0",
          "block": "cta-animated-border-01",
          "props": {
            "heading": "Need help today?",
            "body": "Call us and speak to someone who can actually come out.",
            "ctaLabel": "Request a quote",
            "ctaHref": "/contact",
            "tone": "primary",
            "secondaryLabel": "",
            "secondaryHref": ""
          },
          "motion": {
            "preset": "scale-in",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "B",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Shadcn Space. Copyright (c) 2026 Shadcn Space Licensed under the MIT License.",
      "source": {
        "library": "Shadcn Space",
        "demo": "cta-01",
        "url": "https://shadcnspace.com",
        "derivation": "layout-observed"
      },
      "fingerprint": "42a792ba7945cc4d465959cc3313be77c0eab2de",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "ss-cta-02",
      "tier": "platform",
      "name": "CTA 02 - Video Background CTA",
      "description": "A high impact call-to-action section with autoplay background video, bold overlay headline, primary button, and rotating ticker text, perfect for luxury brands or real estate to capture attention instantly.",
      "collection": "conversion",
      "tags": [
        "cta",
        "shadcn-space",
        "free"
      ],
      "sections": [
        {
          "id": "sec_ss-cta-02_0",
          "block": "cta-animated-border-01",
          "props": {
            "heading": "Need help today?",
            "body": "Call us and speak to someone who can actually come out.",
            "ctaLabel": "Request a quote",
            "ctaHref": "/contact",
            "tone": "primary",
            "secondaryLabel": "",
            "secondaryHref": ""
          },
          "motion": {
            "preset": "scale-in",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "B",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Shadcn Space. Copyright (c) 2026 Shadcn Space Licensed under the MIT License.",
      "source": {
        "library": "Shadcn Space",
        "demo": "cta-02",
        "url": "https://shadcnspace.com",
        "derivation": "layout-observed"
      },
      "fingerprint": "42a792ba7945cc4d465959cc3313be77c0eab2de",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "ss-download-01",
      "tier": "platform",
      "name": "Download 01 - Multi-Platform Download Grid",
      "description": "A structured platform showcase featuring dedicated download cards for every device, helping users quickly access applications and extensions.",
      "collection": "conversion",
      "tags": [
        "download",
        "shadcn-space",
        "free"
      ],
      "sections": [
        {
          "id": "sec_ss-download-01_0",
          "block": "cta-animated-border-01",
          "props": {
            "heading": "Need help today?",
            "body": "Call us and speak to someone who can actually come out.",
            "ctaLabel": "Request a quote",
            "ctaHref": "/contact",
            "tone": "primary",
            "secondaryLabel": "",
            "secondaryHref": ""
          },
          "motion": {
            "preset": "scale-in",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "B",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Shadcn Space. Copyright (c) 2026 Shadcn Space Licensed under the MIT License.",
      "source": {
        "library": "Shadcn Space",
        "demo": "download-01",
        "url": "https://shadcnspace.com",
        "derivation": "layout-observed"
      },
      "fingerprint": "42a792ba7945cc4d465959cc3313be77c0eab2de",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "ss-faq-01",
      "tier": "platform",
      "name": "FAQ 01 - Expandable FAQ Section",
      "description": "A clean accordion style FAQ section with expandable answers, ideal for agencies or SaaS sites to address common questions, reduce friction, and improve user confidence before conversion.",
      "collection": "content",
      "tags": [
        "faq",
        "shadcn-space",
        "free"
      ],
      "sections": [
        {
          "id": "sec_ss-faq-01_0",
          "block": "faq-accordion-01",
          "props": {
            "heading": "Frequently asked questions",
            "items": [
              {
                "question": "How quickly can you come out?",
                "answer": "Usually the same day."
              },
              {
                "question": "What does it cost?",
                "answer": "We quote up front, with no call-out fee."
              }
            ]
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "A",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Shadcn Space. Copyright (c) 2026 Shadcn Space Licensed under the MIT License.",
      "source": {
        "library": "Shadcn Space",
        "demo": "faq-01",
        "url": "https://shadcnspace.com",
        "derivation": "layout-observed"
      },
      "fingerprint": "ed431d8580b9e75affb002832a789f98a353a501",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "ss-feature-01",
      "tier": "platform",
      "name": "Feature 01 - Feature with Testimonials",
      "description": "A trust focused feature section combining a highlighted customer testimonial with supporting benefit cards, perfect for product or SaaS pages to showcase social proof and reinforce key advantages.",
      "collection": "features",
      "tags": [
        "feature",
        "shadcn-space",
        "free"
      ],
      "sections": [
        {
          "id": "sec_ss-feature-01_0",
          "block": "features-grid-01",
          "props": {
            "eyebrow": "",
            "heading": "Why clients choose us",
            "intro": "",
            "items": [
              {
                "icon": "clock",
                "title": "Available 24/7",
                "description": "Call us any time, we pick up."
              },
              {
                "icon": "shield",
                "title": "Fully insured",
                "description": "Certified and covered work."
              },
              {
                "icon": "star",
                "title": "Rated 4.9",
                "description": "Based on verified customer reviews."
              }
            ]
          },
          "motion": {
            "preset": "stagger-children",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "A",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Shadcn Space. Copyright (c) 2026 Shadcn Space Licensed under the MIT License.",
      "source": {
        "library": "Shadcn Space",
        "demo": "feature-01",
        "url": "https://shadcnspace.com",
        "derivation": "layout-observed"
      },
      "fingerprint": "9a9e7e30f84726bba1fb46ba508a70350e5b224c",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "ss-feature-02",
      "tier": "platform",
      "name": "Feature 02 - Three Columns Feature with Icons",
      "description": "A clean three card feature grid with icons and concise copy, built for product or SaaS pages to communicate core benefits clearly while maintaining a developer friendly, scalable layout.",
      "collection": "features",
      "tags": [
        "feature",
        "shadcn-space",
        "free"
      ],
      "sections": [
        {
          "id": "sec_ss-feature-02_0",
          "block": "features-grid-01",
          "props": {
            "eyebrow": "",
            "heading": "Why clients choose us",
            "intro": "",
            "items": [
              {
                "icon": "clock",
                "title": "Available 24/7",
                "description": "Call us any time, we pick up."
              },
              {
                "icon": "shield",
                "title": "Fully insured",
                "description": "Certified and covered work."
              },
              {
                "icon": "star",
                "title": "Rated 4.9",
                "description": "Based on verified customer reviews."
              }
            ]
          },
          "motion": {
            "preset": "stagger-children",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "A",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Shadcn Space. Copyright (c) 2026 Shadcn Space Licensed under the MIT License.",
      "source": {
        "library": "Shadcn Space",
        "demo": "feature-02",
        "url": "https://shadcnspace.com",
        "derivation": "layout-observed"
      },
      "fingerprint": "9a9e7e30f84726bba1fb46ba508a70350e5b224c",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "ss-footer-01",
      "tier": "platform",
      "name": "Footer 01 - Agency Footer Layout",
      "description": "A clean multi column footer with brand summary, sitemap links, legal pages, contact details, and social icons, perfect for agencies to provide clarity, trust, and easy navigation.",
      "collection": "footer",
      "tags": [
        "footer",
        "shadcn-space",
        "free"
      ],
      "sections": [
        {
          "id": "sec_ss-footer-01_0",
          "block": "footer-simple-01",
          "props": {
            "brand": "Your business",
            "tagline": "",
            "phone": "",
            "email": "",
            "address": "",
            "links": [
              {
                "label": "Privacy",
                "href": "/privacy"
              },
              {
                "label": "Terms",
                "href": "/terms"
              }
            ],
            "legal": ""
          },
          "motion": {
            "preset": "none",
            "trigger": "none",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "A",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Shadcn Space. Copyright (c) 2026 Shadcn Space Licensed under the MIT License.",
      "source": {
        "library": "Shadcn Space",
        "demo": "footer-01",
        "url": "https://shadcnspace.com",
        "derivation": "layout-observed"
      },
      "fingerprint": "1108486030113cd579d2e22e9779ce0b839f4a3c",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "ss-footer-02",
      "tier": "platform",
      "name": "Footer 02 - Dark Conversion Footer",
      "description": "A bold dark themed footer with newsletter signup, strong contact CTA, navigation links, and legal pages, ideal for real estate or SaaS websites to drive engagement at the page end.",
      "collection": "footer",
      "tags": [
        "footer",
        "shadcn-space",
        "free"
      ],
      "sections": [
        {
          "id": "sec_ss-footer-02_0",
          "block": "footer-simple-01",
          "props": {
            "brand": "Your business",
            "tagline": "",
            "phone": "",
            "email": "",
            "address": "",
            "links": [
              {
                "label": "Privacy",
                "href": "/privacy"
              },
              {
                "label": "Terms",
                "href": "/terms"
              }
            ],
            "legal": ""
          },
          "motion": {
            "preset": "none",
            "trigger": "none",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "A",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Shadcn Space. Copyright (c) 2026 Shadcn Space Licensed under the MIT License.",
      "source": {
        "library": "Shadcn Space",
        "demo": "footer-02",
        "url": "https://shadcnspace.com",
        "derivation": "layout-observed"
      },
      "fingerprint": "1108486030113cd579d2e22e9779ce0b839f4a3c",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "ss-forms-01",
      "tier": "platform",
      "name": "Forms 01 - Edit Profile Form",
      "description": "A user-friendly profile editing form with avatar upload, personal details, privacy controls, and action toggles, perfect for managing account information inside modern SaaS dashboards.",
      "collection": "conversion",
      "tags": [
        "forms",
        "shadcn-space",
        "free"
      ],
      "sections": [
        {
          "id": "sec_ss-forms-01_0",
          "block": "contact-details-01",
          "props": {
            "heading": "Get in touch",
            "intro": "",
            "phone": "",
            "email": "",
            "street": "",
            "postalCode": "",
            "city": "",
            "hours": "Monday–Friday 08:00–18:00\nSaturday 09:00–13:00",
            "showMap": true
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "A",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Shadcn Space. Copyright (c) 2026 Shadcn Space Licensed under the MIT License.",
      "source": {
        "library": "Shadcn Space",
        "demo": "forms-01",
        "url": "https://shadcnspace.com",
        "derivation": "layout-observed"
      },
      "fingerprint": "99bd400683ce47cde194f6f4f2f50693f21cb992",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "ss-gallery-01",
      "tier": "platform",
      "name": "Gallery 01 - Destination Gallery",
      "description": "Discover breathtaking locations and unforgettable experiences, from scenic hikes to coastal escapes—carefully curated to inspire your next journey and help you explore with confidence.",
      "collection": "content",
      "tags": [
        "gallery",
        "shadcn-space",
        "free"
      ],
      "sections": [
        {
          "id": "sec_ss-gallery-01_0",
          "block": "gallery-compare-slider-01",
          "props": {
            "heading": "Before and after",
            "intro": "",
            "beforeImage": "",
            "beforeAlt": "",
            "beforeLabel": "Before",
            "afterImage": "",
            "afterAlt": "",
            "afterLabel": "After"
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "B",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Shadcn Space. Copyright (c) 2026 Shadcn Space Licensed under the MIT License.",
      "source": {
        "library": "Shadcn Space",
        "demo": "gallery-01",
        "url": "https://shadcnspace.com",
        "derivation": "layout-observed"
      },
      "fingerprint": "3854f39839554863421c9a8260ebe11d34e75504",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "ss-hero-01",
      "tier": "platform",
      "name": "Hero 01 - Agency Hero Section",
      "description": "Clean agency hero section designed for SaaS and startup websites, featuring bold headline, gradient background, trust badges, client logos, and high converting CTAs for lead generation.",
      "collection": "hero",
      "tags": [
        "hero",
        "shadcn-space",
        "free"
      ],
      "sections": [
        {
          "id": "sec_ss-hero-01_0",
          "block": "hero-cover-statement-01",
          "props": {
            "eyebrow": "Introducing",
            "headline": "A calmer way to build the web",
            "subheadline": "One workspace for the site, the content and the growth work — without a stack of plugins.",
            "primaryLabel": "Get started",
            "primaryHref": "/contact",
            "secondaryLabel": "Browse examples",
            "secondaryHref": "/templates",
            "image": "",
            "video": "",
            "imageAlt": ""
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "load",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "A",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Shadcn Space. Copyright (c) 2026 Shadcn Space Licensed under the MIT License.",
      "source": {
        "library": "Shadcn Space",
        "demo": "hero-01",
        "url": "https://shadcnspace.com",
        "derivation": "layout-observed"
      },
      "fingerprint": "2c6df622e8eb3c23a353a39ca22b72eda43d5cc6",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "ss-hero-02",
      "tier": "platform",
      "name": "Hero 02 - Real Estate Hero Section",
      "description": "Luxury real estate hero section crafted for property listings, featuring immersive imagery, location highlight, key amenities, pricing details, and prominent Schedule a tour CTA for faster inquiries.",
      "collection": "hero",
      "tags": [
        "hero",
        "shadcn-space",
        "free"
      ],
      "sections": [
        {
          "id": "sec_ss-hero-02_0",
          "block": "hero-centered-01",
          "props": {
            "eyebrow": "",
            "headline": "A headline that says what you do",
            "subheadline": "One or two sentences explaining who you help and why they should call you.",
            "primaryLabel": "Request a quote",
            "primaryHref": "/contact",
            "secondaryLabel": "",
            "secondaryHref": "",
            "align": "center"
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "load",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "A",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Shadcn Space. Copyright (c) 2026 Shadcn Space Licensed under the MIT License.",
      "source": {
        "library": "Shadcn Space",
        "demo": "hero-02",
        "url": "https://shadcnspace.com",
        "derivation": "layout-observed"
      },
      "fingerprint": "cbb86064f14ea011d60240eaaf8a597fa06ed470",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "ss-hero-03",
      "tier": "platform",
      "name": "Hero 03 - Digital Agency Hero Section",
      "description": "High-impact digital agency hero section with cinematic background video, bold typography, brand driven headline, and clear CTA, perfect for creative studios and performance-focused marketing websites.",
      "collection": "hero",
      "tags": [
        "hero",
        "shadcn-space",
        "free"
      ],
      "sections": [
        {
          "id": "sec_ss-hero-03_0",
          "block": "hero-asymmetric-01",
          "props": {
            "eyebrow": "Selected work",
            "headline": "Make the first screen unforgettable",
            "subheadline": "A single composition: brand, one line, one action, one image that does the talking.",
            "primaryLabel": "Book a call",
            "primaryHref": "/contact",
            "image": "",
            "imageAlt": "Featured project"
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "load",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "B",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Shadcn Space. Copyright (c) 2026 Shadcn Space Licensed under the MIT License.",
      "source": {
        "library": "Shadcn Space",
        "demo": "hero-03",
        "url": "https://shadcnspace.com",
        "derivation": "layout-observed"
      },
      "fingerprint": "0c3919472a2a8136f01b86c1c0ede3a03ac607eb",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "ss-logo-cloud-01",
      "tier": "platform",
      "name": "Logo Cloud 01 - Trusted by Leading Companies",
      "description": "A clean logo collection highlighting affiliated brands and integrations, designed to build credibility, reinforce partnerships, and visually communicate trust within modern product or SaaS interfaces.",
      "collection": "proof",
      "tags": [
        "logo-cloud",
        "shadcn-space",
        "free"
      ],
      "sections": [
        {
          "id": "sec_ss-logo-cloud-01_0",
          "block": "logos-orbit-01",
          "props": {
            "heading": "Trusted by teams like yours",
            "subheading": "",
            "items": [
              {
                "name": "Client one",
                "image": ""
              },
              {
                "name": "Client two",
                "image": ""
              },
              {
                "name": "Client three",
                "image": ""
              },
              {
                "name": "Client four",
                "image": ""
              },
              {
                "name": "Client five",
                "image": ""
              },
              {
                "name": "Client six",
                "image": ""
              }
            ]
          },
          "motion": {
            "preset": "scale-in",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "B",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Shadcn Space. Copyright (c) 2026 Shadcn Space Licensed under the MIT License.",
      "source": {
        "library": "Shadcn Space",
        "demo": "logo-cloud-01",
        "url": "https://shadcnspace.com",
        "derivation": "layout-observed"
      },
      "fingerprint": "10e33176b34356f5386f62880d0a07ffb4ed2cb2",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "ss-navbar-01",
      "tier": "platform",
      "name": "Navbar 01 - Minimal Agency Navbar",
      "description": "A clean top navigation bar with logo, page links, and standout CTA button, ideal for agency or SaaS websites to guide users and drive collaboration effortlessly.",
      "collection": "navigation",
      "tags": [
        "navbar",
        "shadcn-space",
        "free"
      ],
      "sections": [
        {
          "id": "sec_ss-navbar-01_0",
          "block": "header-simple-01",
          "props": {
            "brand": "Your business",
            "logo": "",
            "links": [
              {
                "label": "Services",
                "href": "/services"
              },
              {
                "label": "About",
                "href": "/about"
              },
              {
                "label": "Contact",
                "href": "/contact"
              }
            ],
            "ctaLabel": "Request a quote",
            "ctaHref": "/contact",
            "sticky": true
          },
          "motion": {
            "preset": "none",
            "trigger": "none",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "A",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Shadcn Space. Copyright (c) 2026 Shadcn Space Licensed under the MIT License.",
      "source": {
        "library": "Shadcn Space",
        "demo": "navbar-01",
        "url": "https://shadcnspace.com",
        "derivation": "layout-observed"
      },
      "fingerprint": "066db7f7bed00a4036d8fc05b3888356f15c4d5b",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "ss-newsletter-01",
      "tier": "platform",
      "name": "Newsletter 01 - Newsletter Subscription CTA",
      "description": "A minimal newsletter signup section with bold headline, social-proof subtext, and inline email form, ideal for capturing leads and growing your audience with a frictionless experience.",
      "collection": "conversion",
      "tags": [
        "newsletter",
        "shadcn-space",
        "free"
      ],
      "sections": [
        {
          "id": "sec_ss-newsletter-01_0",
          "block": "cta-banner-01",
          "props": {
            "heading": "Need help today?",
            "body": "Call us and speak to someone who can actually come out.",
            "ctaLabel": "Request a quote",
            "ctaHref": "/contact",
            "tone": "primary"
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "A",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Shadcn Space. Copyright (c) 2026 Shadcn Space Licensed under the MIT License.",
      "source": {
        "library": "Shadcn Space",
        "demo": "newsletter-01",
        "url": "https://shadcnspace.com",
        "derivation": "layout-observed"
      },
      "fingerprint": "8dfe62bba98013da2551b271a3b11188b39c70a7",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "ss-portfolio-01",
      "tier": "platform",
      "name": "Portfolio 01 - Clean Portfolio Grid",
      "description": "A modern portfolio section displaying featured projects with tags, visuals, and categories, ideal for agencies or freelancers to showcase real-world transformations, expertise, and design impact.",
      "collection": "features",
      "tags": [
        "portfolio",
        "shadcn-space",
        "free"
      ],
      "sections": [
        {
          "id": "sec_ss-portfolio-01_0",
          "block": "gallery-compare-slider-01",
          "props": {
            "heading": "Before and after",
            "intro": "",
            "beforeImage": "",
            "beforeAlt": "",
            "beforeLabel": "Before",
            "afterImage": "",
            "afterAlt": "",
            "afterLabel": "After"
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "B",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Shadcn Space. Copyright (c) 2026 Shadcn Space Licensed under the MIT License.",
      "source": {
        "library": "Shadcn Space",
        "demo": "portfolio-01",
        "url": "https://shadcnspace.com",
        "derivation": "layout-observed"
      },
      "fingerprint": "3854f39839554863421c9a8260ebe11d34e75504",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "ss-pricing-01",
      "tier": "platform",
      "name": "Pricing 01 - Startup Pricing Plans",
      "description": "A clean two tier pricing section with feature comparison, highlighted plans, and strong CTAs, suited for agencies, Startups & SaaS to convert visitors by clearly presenting value and monthly subscription options.",
      "collection": "pricing",
      "tags": [
        "pricing",
        "shadcn-space",
        "free"
      ],
      "sections": [
        {
          "id": "sec_ss-pricing-01_0",
          "block": "pricing-toggle-01",
          "props": {
            "heading": "Simple pricing",
            "intro": "",
            "monthlyLabel": "Monthly",
            "yearlyLabel": "Yearly",
            "yearlyNote": "Two months free",
            "items": [
              {
                "name": "Starter",
                "monthlyPrice": "€49",
                "yearlyPrice": "€490",
                "period": "/month",
                "description": "For a single site that needs to look after itself.",
                "featureList": "One website\nHosting and backups\nE-mail support",
                "ctaLabel": "Choose Starter",
                "ctaHref": "/contact",
                "featured": false
              },
              {
                "name": "Growth",
                "monthlyPrice": "€149",
                "yearlyPrice": "€1490",
                "period": "/month",
                "description": "For a business that markets as well as it delivers.",
                "featureList": "Everything in Starter\nSEO and analytics\nMonthly content changes\nPriority support",
                "ctaLabel": "Choose Growth",
                "ctaHref": "/contact",
                "featured": true
              },
              {
                "name": "Scale",
                "monthlyPrice": "€399",
                "yearlyPrice": "€3990",
                "period": "/month",
                "description": "For multiple brands, shops or locations.",
                "featureList": "Everything in Growth\nMultiple sites\nCommerce and CRM\nNamed contact",
                "ctaLabel": "Talk to us",
                "ctaHref": "/contact",
                "featured": false
              }
            ]
          },
          "motion": {
            "preset": "stagger-children",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "B",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Shadcn Space. Copyright (c) 2026 Shadcn Space Licensed under the MIT License.",
      "source": {
        "library": "Shadcn Space",
        "demo": "pricing-01",
        "url": "https://shadcnspace.com",
        "derivation": "layout-observed"
      },
      "fingerprint": "b72b1692baab195f3e889abc27316029849fba1e",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "ss-pricing-02",
      "tier": "platform",
      "name": "Pricing 02 - Scalable Pricing Table",
      "description": "A three tier pricing layout with a highlighted recommended plan, feature checklists, and clear CTAs, perfect for any website having pricing section to guide users toward the most valuable subscription option.",
      "collection": "pricing",
      "tags": [
        "pricing",
        "shadcn-space",
        "free"
      ],
      "sections": [
        {
          "id": "sec_ss-pricing-02_0",
          "block": "pricing-toggle-01",
          "props": {
            "heading": "Simple pricing",
            "intro": "",
            "monthlyLabel": "Monthly",
            "yearlyLabel": "Yearly",
            "yearlyNote": "Two months free",
            "items": [
              {
                "name": "Starter",
                "monthlyPrice": "€49",
                "yearlyPrice": "€490",
                "period": "/month",
                "description": "For a single site that needs to look after itself.",
                "featureList": "One website\nHosting and backups\nE-mail support",
                "ctaLabel": "Choose Starter",
                "ctaHref": "/contact",
                "featured": false
              },
              {
                "name": "Growth",
                "monthlyPrice": "€149",
                "yearlyPrice": "€1490",
                "period": "/month",
                "description": "For a business that markets as well as it delivers.",
                "featureList": "Everything in Starter\nSEO and analytics\nMonthly content changes\nPriority support",
                "ctaLabel": "Choose Growth",
                "ctaHref": "/contact",
                "featured": true
              },
              {
                "name": "Scale",
                "monthlyPrice": "€399",
                "yearlyPrice": "€3990",
                "period": "/month",
                "description": "For multiple brands, shops or locations.",
                "featureList": "Everything in Growth\nMultiple sites\nCommerce and CRM\nNamed contact",
                "ctaLabel": "Talk to us",
                "ctaHref": "/contact",
                "featured": false
              }
            ]
          },
          "motion": {
            "preset": "stagger-children",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "B",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Shadcn Space. Copyright (c) 2026 Shadcn Space Licensed under the MIT License.",
      "source": {
        "library": "Shadcn Space",
        "demo": "pricing-02",
        "url": "https://shadcnspace.com",
        "derivation": "layout-observed"
      },
      "fingerprint": "b72b1692baab195f3e889abc27316029849fba1e",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "ss-product-category-02",
      "tier": "platform",
      "name": "Product Category 02 - Horizontal List",
      "description": "A horizontal category list displaying product groups with icons, item counts, and quick links, enabling users to scan categories quickly and navigate products efficiently.",
      "collection": "conversion",
      "tags": [
        "product-category",
        "shadcn-space",
        "free"
      ],
      "sections": [
        {
          "id": "sec_ss-product-category-02_0",
          "block": "gallery-compare-slider-01",
          "props": {
            "heading": "Before and after",
            "intro": "",
            "beforeImage": "",
            "beforeAlt": "",
            "beforeLabel": "Before",
            "afterImage": "",
            "afterAlt": "",
            "afterLabel": "After"
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "B",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Shadcn Space. Copyright (c) 2026 Shadcn Space Licensed under the MIT License.",
      "source": {
        "library": "Shadcn Space",
        "demo": "product-category-02",
        "url": "https://shadcnspace.com",
        "derivation": "layout-observed"
      },
      "fingerprint": "3854f39839554863421c9a8260ebe11d34e75504",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "ss-product-category-04",
      "tier": "platform",
      "name": "Product Category 04 - Image Based",
      "description": "A product category section built with image-driven cards and filters, enabling faster discovery through visuals and improving navigation across different product groups.",
      "collection": "conversion",
      "tags": [
        "product-category",
        "shadcn-space",
        "free"
      ],
      "sections": [
        {
          "id": "sec_ss-product-category-04_0",
          "block": "gallery-compare-slider-01",
          "props": {
            "heading": "Before and after",
            "intro": "",
            "beforeImage": "",
            "beforeAlt": "",
            "beforeLabel": "Before",
            "afterImage": "",
            "afterAlt": "",
            "afterLabel": "After"
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "B",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Shadcn Space. Copyright (c) 2026 Shadcn Space Licensed under the MIT License.",
      "source": {
        "library": "Shadcn Space",
        "demo": "product-category-04",
        "url": "https://shadcnspace.com",
        "derivation": "layout-observed"
      },
      "fingerprint": "3854f39839554863421c9a8260ebe11d34e75504",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "ss-product-listing-01",
      "tier": "platform",
      "name": "Product Listing 01 - Multi Column Grid",
      "description": "A multi-column layout featuring product cards with images, reviews, and pricing details, helping users scan, compare, and select products quickly.",
      "collection": "conversion",
      "tags": [
        "product-listing",
        "shadcn-space",
        "free"
      ],
      "sections": [
        {
          "id": "sec_ss-product-listing-01_0",
          "block": "gallery-compare-slider-01",
          "props": {
            "heading": "Before and after",
            "intro": "",
            "beforeImage": "",
            "beforeAlt": "",
            "beforeLabel": "Before",
            "afterImage": "",
            "afterAlt": "",
            "afterLabel": "After"
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "B",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Shadcn Space. Copyright (c) 2026 Shadcn Space Licensed under the MIT License.",
      "source": {
        "library": "Shadcn Space",
        "demo": "product-listing-01",
        "url": "https://shadcnspace.com",
        "derivation": "layout-observed"
      },
      "fingerprint": "3854f39839554863421c9a8260ebe11d34e75504",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "ss-product-overview-04",
      "tier": "platform",
      "name": "Product Overview 04 - For Skincare Product",
      "description": "A structured skincare layout featuring image grid previews, descriptive content, pricing details, size selection, and collapsible sections for ingredients, shipping, and product overview information.",
      "collection": "conversion",
      "tags": [
        "product-overview",
        "shadcn-space",
        "free"
      ],
      "sections": [
        {
          "id": "sec_ss-product-overview-04_0",
          "block": "features-grid-01",
          "props": {
            "eyebrow": "",
            "heading": "Why clients choose us",
            "intro": "",
            "items": [
              {
                "icon": "clock",
                "title": "Available 24/7",
                "description": "Call us any time, we pick up."
              },
              {
                "icon": "shield",
                "title": "Fully insured",
                "description": "Certified and covered work."
              },
              {
                "icon": "star",
                "title": "Rated 4.9",
                "description": "Based on verified customer reviews."
              }
            ]
          },
          "motion": {
            "preset": "stagger-children",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "A",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Shadcn Space. Copyright (c) 2026 Shadcn Space Licensed under the MIT License.",
      "source": {
        "library": "Shadcn Space",
        "demo": "product-overview-04",
        "url": "https://shadcnspace.com",
        "derivation": "layout-observed"
      },
      "fingerprint": "9a9e7e30f84726bba1fb46ba508a70350e5b224c",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "ss-services-01",
      "tier": "platform",
      "name": "Services 01 - Creative Services Overview",
      "description": "A colorful services section with icon cards and dual CTAs, perfect for agencies to present core offerings, guide visitors to portfolios, and drive collaboration with clear next steps.",
      "collection": "features",
      "tags": [
        "services",
        "shadcn-space",
        "free"
      ],
      "sections": [
        {
          "id": "sec_ss-services-01_0",
          "block": "features-grid-01",
          "props": {
            "eyebrow": "",
            "heading": "Why clients choose us",
            "intro": "",
            "items": [
              {
                "icon": "clock",
                "title": "Available 24/7",
                "description": "Call us any time, we pick up."
              },
              {
                "icon": "shield",
                "title": "Fully insured",
                "description": "Certified and covered work."
              },
              {
                "icon": "star",
                "title": "Rated 4.9",
                "description": "Based on verified customer reviews."
              }
            ]
          },
          "motion": {
            "preset": "stagger-children",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "A",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Shadcn Space. Copyright (c) 2026 Shadcn Space Licensed under the MIT License.",
      "source": {
        "library": "Shadcn Space",
        "demo": "services-01",
        "url": "https://shadcnspace.com",
        "derivation": "layout-observed"
      },
      "fingerprint": "9a9e7e30f84726bba1fb46ba508a70350e5b224c",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "ss-services-02",
      "tier": "platform",
      "name": "Services 02 - Dark Services Animated Block",
      "description": "A premium dark mode services section with interactive list, visual preview, and detailed descriptions, ideal for creative agencies to showcase capabilities while maintaining a bold, modern brand presence.",
      "collection": "features",
      "tags": [
        "services",
        "shadcn-space",
        "free"
      ],
      "sections": [
        {
          "id": "sec_ss-services-02_0",
          "block": "features-bento-grid-01",
          "props": {
            "heading": "Everything in one place",
            "intro": "Each panel is a capability. The bigger ones are the ones customers ask about first.",
            "items": [
              {
                "title": "One place for the work",
                "description": "Quotes, jobs, invoices and the history behind them.",
                "size": "wide"
              },
              {
                "title": "Live availability",
                "description": "The calendar customers actually see.",
                "size": "normal"
              },
              {
                "title": "Paid faster",
                "description": "Invoices that chase themselves.",
                "size": "normal"
              },
              {
                "title": "Built for a phone",
                "description": "Because that is where the job happens.",
                "size": "tall"
              },
              {
                "title": "Nothing to install",
                "description": "It runs in a browser and updates itself.",
                "size": "normal"
              }
            ]
          },
          "motion": {
            "preset": "stagger-children",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "A",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Shadcn Space. Copyright (c) 2026 Shadcn Space Licensed under the MIT License.",
      "source": {
        "library": "Shadcn Space",
        "demo": "services-02",
        "url": "https://shadcnspace.com",
        "derivation": "layout-observed"
      },
      "fingerprint": "bec76f9524e5021c01aff0c31c85cbe21a95ab19",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "ss-statistics-01",
      "tier": "platform",
      "name": "Statistics 01 - KPI Summary Cards",
      "description": "A compact statistics section with KPI cards highlighting earnings, expenses, weekly sales, and orders, ideal for admin dashboards to surface key business metrics at a glance.",
      "collection": "proof",
      "tags": [
        "statistics",
        "shadcn-space",
        "free"
      ],
      "sections": [
        {
          "id": "sec_ss-statistics-01_0",
          "block": "stats-counter-01",
          "props": {
            "items": [
              {
                "value": 15,
                "suffix": "+",
                "label": "Years in business"
              },
              {
                "value": 2500,
                "suffix": "",
                "label": "Jobs completed"
              },
              {
                "value": 49,
                "suffix": "",
                "label": "Average rating ×10"
              }
            ]
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "B",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Shadcn Space. Copyright (c) 2026 Shadcn Space Licensed under the MIT License.",
      "source": {
        "library": "Shadcn Space",
        "demo": "statistics-01",
        "url": "https://shadcnspace.com",
        "derivation": "layout-observed"
      },
      "fingerprint": "e0832f3b7d071c26d2801579cf6833b49c2caf0f",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "ss-statistics-02",
      "tier": "platform",
      "name": "Statistics 02 - Business Metrics Bar",
      "description": "A horizontal KPI bar displaying orders, sales, profit, and expenses with weekly change indicators, ideal for dashboards to monitor short-term performance and trends at a glance.",
      "collection": "proof",
      "tags": [
        "statistics",
        "shadcn-space",
        "free"
      ],
      "sections": [
        {
          "id": "sec_ss-statistics-02_0",
          "block": "stats-counter-01",
          "props": {
            "items": [
              {
                "value": 15,
                "suffix": "+",
                "label": "Years in business"
              },
              {
                "value": 2500,
                "suffix": "",
                "label": "Jobs completed"
              },
              {
                "value": 49,
                "suffix": "",
                "label": "Average rating ×10"
              }
            ]
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "B",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Shadcn Space. Copyright (c) 2026 Shadcn Space Licensed under the MIT License.",
      "source": {
        "library": "Shadcn Space",
        "demo": "statistics-02",
        "url": "https://shadcnspace.com",
        "derivation": "layout-observed"
      },
      "fingerprint": "e0832f3b7d071c26d2801579cf6833b49c2caf0f",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "ss-team-01",
      "tier": "platform",
      "name": "Team 01 - Creative Team Showcase",
      "description": "A vibrant team section featuring profile cards with roles and social links, perfect for agencies or startups to humanize their brand, highlight talent, and build authentic connections.",
      "collection": "content",
      "tags": [
        "team",
        "shadcn-space",
        "free"
      ],
      "sections": [
        {
          "id": "sec_ss-team-01_0",
          "block": "about-scroll-story-01",
          "props": {
            "heading": "How we got here",
            "image": "",
            "imageAlt": "",
            "items": [
              {
                "year": "2014",
                "title": "Two of us and a van",
                "description": "One town, word of mouth, no website."
              },
              {
                "year": "2019",
                "title": "A proper workshop",
                "description": "Room to prefabricate meant shorter jobs on site."
              },
              {
                "year": "2024",
                "title": "Twelve people",
                "description": "Same standard of work, more of it, still local."
              }
            ]
          },
          "motion": {
            "preset": "none",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "C",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Shadcn Space. Copyright (c) 2026 Shadcn Space Licensed under the MIT License.",
      "source": {
        "library": "Shadcn Space",
        "demo": "team-01",
        "url": "https://shadcnspace.com",
        "derivation": "layout-observed"
      },
      "fingerprint": "2915455178cfe70ea72d1ca7d73502947a0d0bdd",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "ss-team-02",
      "tier": "platform",
      "name": "Team 02 - Modern Team Grid",
      "description": "A clean team grid with large profile cards, roles, and social icons, ideal for agencies or SaaS companies to introduce key members and strengthen brand authenticity.",
      "collection": "content",
      "tags": [
        "team",
        "shadcn-space",
        "free"
      ],
      "sections": [
        {
          "id": "sec_ss-team-02_0",
          "block": "about-scroll-story-01",
          "props": {
            "heading": "How we got here",
            "image": "",
            "imageAlt": "",
            "items": [
              {
                "year": "2014",
                "title": "Two of us and a van",
                "description": "One town, word of mouth, no website."
              },
              {
                "year": "2019",
                "title": "A proper workshop",
                "description": "Room to prefabricate meant shorter jobs on site."
              },
              {
                "year": "2024",
                "title": "Twelve people",
                "description": "Same standard of work, more of it, still local."
              }
            ]
          },
          "motion": {
            "preset": "none",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "C",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Shadcn Space. Copyright (c) 2026 Shadcn Space Licensed under the MIT License.",
      "source": {
        "library": "Shadcn Space",
        "demo": "team-02",
        "url": "https://shadcnspace.com",
        "derivation": "layout-observed"
      },
      "fingerprint": "2915455178cfe70ea72d1ca7d73502947a0d0bdd",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "ss-testimonial-01",
      "tier": "platform",
      "name": "Testimonial 01 - Bento Grid Testimonials",
      "description": "A multi card testimonial section combining customer quotes, imagery, and performance stats, ideal for showcasing social proof, building trust, and reinforcing brand credibility across product or agency websites.",
      "collection": "proof",
      "tags": [
        "testimonial",
        "shadcn-space",
        "free"
      ],
      "sections": [
        {
          "id": "sec_ss-testimonial-01_0",
          "block": "testimonials-card-stack-01",
          "props": {
            "heading": "In their words",
            "items": [
              {
                "quote": "They found the actual problem instead of replacing the whole unit.",
                "author": "K. Mulder",
                "role": "Rotterdam",
                "rating": 5
              },
              {
                "quote": "Second job we have given them. There will be a third.",
                "author": "J. Willems",
                "role": "Capelle",
                "rating": 5
              },
              {
                "quote": "Sent photos every day while we were away.",
                "author": "P. de Groot",
                "role": "Delft",
                "rating": 5
              }
            ]
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "B",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Shadcn Space. Copyright (c) 2026 Shadcn Space Licensed under the MIT License.",
      "source": {
        "library": "Shadcn Space",
        "demo": "testimonial-01",
        "url": "https://shadcnspace.com",
        "derivation": "layout-observed"
      },
      "fingerprint": "b8e4fb1a9b7bbcbb7272ce20b1fbd4f9ca01344e",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "ss-testimonial-02",
      "tier": "platform",
      "name": "Testimonial 02 - Testimonial Slider Showcase",
      "description": "A clean testimonial slider with customer photo, detailed quote, navigation controls, and partner logos—perfect for highlighting success stories and building instant trust on landing pages.",
      "collection": "proof",
      "tags": [
        "testimonial",
        "shadcn-space",
        "free"
      ],
      "sections": [
        {
          "id": "sec_ss-testimonial-02_0",
          "block": "testimonials-grid-01",
          "props": {
            "heading": "What customers say",
            "items": [
              {
                "quote": "Fast, friendly and the price was exactly as quoted.",
                "author": "A. de Vries",
                "role": "Rotterdam",
                "rating": 5
              },
              {
                "quote": "Fixed the problem the same afternoon.",
                "author": "M. Jansen",
                "role": "Schiedam",
                "rating": 5
              }
            ]
          },
          "motion": {
            "preset": "stagger-children",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "A",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Shadcn Space. Copyright (c) 2026 Shadcn Space Licensed under the MIT License.",
      "source": {
        "library": "Shadcn Space",
        "demo": "testimonial-02",
        "url": "https://shadcnspace.com",
        "derivation": "layout-observed"
      },
      "fingerprint": "e3c9c959d63f2686623c4f0bd625bf4865f1ebad",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "ss-timeline-01",
      "tier": "platform",
      "name": "Timeline 01 - Vertical Progress Timeline",
      "description": "A modern two-column timeline featuring alternating content blocks, visual storytelling elements, and chronological progression—designed to highlight growth and achievements.",
      "collection": "content",
      "tags": [
        "timeline",
        "shadcn-space",
        "free"
      ],
      "sections": [
        {
          "id": "sec_ss-timeline-01_0",
          "block": "content-text-generate-01",
          "props": {
            "heading": "",
            "body": "Every part of this platform exists because a customer asked for it twice. Nothing here is a demo.",
            "speed": "medium"
          },
          "motion": {
            "preset": "none",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "B",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Shadcn Space. Copyright (c) 2026 Shadcn Space Licensed under the MIT License.",
      "source": {
        "library": "Shadcn Space",
        "demo": "timeline-01",
        "url": "https://shadcnspace.com",
        "derivation": "layout-observed"
      },
      "fingerprint": "7c1477df7f686e9661847a456b4c683c66de29a3",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "ss-timeline-02",
      "tier": "platform",
      "name": "Timeline 02 - Interactive Timeline",
      "description": "An engaging timeline layout featuring key milestones, chronological progression, and supporting visuals, crafted to communicate company evolution effectively.",
      "collection": "content",
      "tags": [
        "timeline",
        "shadcn-space",
        "free"
      ],
      "sections": [
        {
          "id": "sec_ss-timeline-02_0",
          "block": "content-text-generate-01",
          "props": {
            "heading": "",
            "body": "Every part of this platform exists because a customer asked for it twice. Nothing here is a demo.",
            "speed": "medium"
          },
          "motion": {
            "preset": "none",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "B",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Shadcn Space. Copyright (c) 2026 Shadcn Space Licensed under the MIT License.",
      "source": {
        "library": "Shadcn Space",
        "demo": "timeline-02",
        "url": "https://shadcnspace.com",
        "derivation": "layout-observed"
      },
      "fingerprint": "7c1477df7f686e9661847a456b4c683c66de29a3",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "ss-timeline-03",
      "tier": "platform",
      "name": "Timeline 03 - Horizontal Journey Timeline",
      "description": "A visually structured timeline layout highlighting key milestones, supporting content, and rich imagery, helping users explore progress year by year.",
      "collection": "content",
      "tags": [
        "timeline",
        "shadcn-space",
        "free"
      ],
      "sections": [
        {
          "id": "sec_ss-timeline-03_0",
          "block": "content-text-generate-01",
          "props": {
            "heading": "",
            "body": "Every part of this platform exists because a customer asked for it twice. Nothing here is a demo.",
            "speed": "medium"
          },
          "motion": {
            "preset": "none",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "B",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Shadcn Space. Copyright (c) 2026 Shadcn Space Licensed under the MIT License.",
      "source": {
        "library": "Shadcn Space",
        "demo": "timeline-03",
        "url": "https://shadcnspace.com",
        "derivation": "layout-observed"
      },
      "fingerprint": "7c1477df7f686e9661847a456b4c683c66de29a3",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "ss-landing-atomist",
      "tier": "platform",
      "name": "Atomist - SaaS Landing Page Template (Next.js & Astro)",
      "description": "Atomist is a modern SaaS landing page template built with Next.js & Astro, Tailwind CSS, TypeScript, and shadcn/ui. Fast, minimal, and optimized for conversions.",
      "collection": "conversion",
      "tags": [
        "atomist",
        "landing",
        "shadcn-space",
        "free",
        "full-page"
      ],
      "sections": [
        {
          "id": "sec_ss-landing-atomist_0",
          "block": "hero-cover-statement-01",
          "props": {
            "eyebrow": "Introducing",
            "headline": "A calmer way to build the web",
            "subheadline": "One workspace for the site, the content and the growth work — without a stack of plugins.",
            "primaryLabel": "Get started",
            "primaryHref": "/contact",
            "secondaryLabel": "Browse examples",
            "secondaryHref": "/templates",
            "image": "",
            "video": "",
            "imageAlt": ""
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "load",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_ss-landing-atomist_1",
          "block": "features-grid-01",
          "props": {
            "eyebrow": "",
            "heading": "Why clients choose us",
            "intro": "",
            "items": [
              {
                "icon": "clock",
                "title": "Available 24/7",
                "description": "Call us any time, we pick up."
              },
              {
                "icon": "shield",
                "title": "Fully insured",
                "description": "Certified and covered work."
              },
              {
                "icon": "star",
                "title": "Rated 4.9",
                "description": "Based on verified customer reviews."
              }
            ]
          },
          "motion": {
            "preset": "stagger-children",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_ss-landing-atomist_2",
          "block": "stats-counter-01",
          "props": {
            "items": [
              {
                "value": 15,
                "suffix": "+",
                "label": "Years in business"
              },
              {
                "value": 2500,
                "suffix": "",
                "label": "Jobs completed"
              },
              {
                "value": 49,
                "suffix": "",
                "label": "Average rating ×10"
              }
            ]
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_ss-landing-atomist_3",
          "block": "pricing-toggle-01",
          "props": {
            "heading": "Simple pricing",
            "intro": "",
            "monthlyLabel": "Monthly",
            "yearlyLabel": "Yearly",
            "yearlyNote": "Two months free",
            "items": [
              {
                "name": "Starter",
                "monthlyPrice": "€49",
                "yearlyPrice": "€490",
                "period": "/month",
                "description": "For a single site that needs to look after itself.",
                "featureList": "One website\nHosting and backups\nE-mail support",
                "ctaLabel": "Choose Starter",
                "ctaHref": "/contact",
                "featured": false
              },
              {
                "name": "Growth",
                "monthlyPrice": "€149",
                "yearlyPrice": "€1490",
                "period": "/month",
                "description": "For a business that markets as well as it delivers.",
                "featureList": "Everything in Starter\nSEO and analytics\nMonthly content changes\nPriority support",
                "ctaLabel": "Choose Growth",
                "ctaHref": "/contact",
                "featured": true
              },
              {
                "name": "Scale",
                "monthlyPrice": "€399",
                "yearlyPrice": "€3990",
                "period": "/month",
                "description": "For multiple brands, shops or locations.",
                "featureList": "Everything in Growth\nMultiple sites\nCommerce and CRM\nNamed contact",
                "ctaLabel": "Talk to us",
                "ctaHref": "/contact",
                "featured": false
              }
            ]
          },
          "motion": {
            "preset": "stagger-children",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_ss-landing-atomist_4",
          "block": "testimonials-card-stack-01",
          "props": {
            "heading": "In their words",
            "items": [
              {
                "quote": "They found the actual problem instead of replacing the whole unit.",
                "author": "K. Mulder",
                "role": "Rotterdam",
                "rating": 5
              },
              {
                "quote": "Second job we have given them. There will be a third.",
                "author": "J. Willems",
                "role": "Capelle",
                "rating": 5
              },
              {
                "quote": "Sent photos every day while we were away.",
                "author": "P. de Groot",
                "role": "Delft",
                "rating": 5
              }
            ]
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_ss-landing-atomist_5",
          "block": "faq-accordion-01",
          "props": {
            "heading": "Frequently asked questions",
            "items": [
              {
                "question": "How quickly can you come out?",
                "answer": "Usually the same day."
              },
              {
                "question": "What does it cost?",
                "answer": "We quote up front, with no call-out fee."
              }
            ]
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_ss-landing-atomist_6",
          "block": "cta-animated-border-01",
          "props": {
            "heading": "Need help today?",
            "body": "Call us and speak to someone who can actually come out.",
            "ctaLabel": "Request a quote",
            "ctaHref": "/contact",
            "tone": "primary",
            "secondaryLabel": "",
            "secondaryHref": ""
          },
          "motion": {
            "preset": "scale-in",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "B",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Shadcn Space. Copyright (c) 2026 Shadcn Space Licensed under the MIT License.",
      "source": {
        "library": "Shadcn Space",
        "demo": "landing-atomist",
        "url": "https://shadcnspace.com",
        "derivation": "layout-observed"
      },
      "fingerprint": "138ed444cbbcd2f7344df7323caab98dde542ec0",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "ss-landing-awake",
      "tier": "platform",
      "name": "Awake – Agency & Portfolio Template (Next.js & Astro)",
      "description": "Modern agency and portfolio template available in both Next.js and Astro versions. Built with Tailwind CSS and shadcn/ui. Fast, clean, and SEO-ready.",
      "collection": "conversion",
      "tags": [
        "awake",
        "landing",
        "shadcn-space",
        "free",
        "full-page"
      ],
      "sections": [
        {
          "id": "sec_ss-landing-awake_0",
          "block": "hero-cover-statement-01",
          "props": {
            "eyebrow": "Introducing",
            "headline": "A calmer way to build the web",
            "subheadline": "One workspace for the site, the content and the growth work — without a stack of plugins.",
            "primaryLabel": "Get started",
            "primaryHref": "/contact",
            "secondaryLabel": "Browse examples",
            "secondaryHref": "/templates",
            "image": "",
            "video": "",
            "imageAlt": ""
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "load",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_ss-landing-awake_1",
          "block": "features-grid-01",
          "props": {
            "eyebrow": "",
            "heading": "Why clients choose us",
            "intro": "",
            "items": [
              {
                "icon": "clock",
                "title": "Available 24/7",
                "description": "Call us any time, we pick up."
              },
              {
                "icon": "shield",
                "title": "Fully insured",
                "description": "Certified and covered work."
              },
              {
                "icon": "star",
                "title": "Rated 4.9",
                "description": "Based on verified customer reviews."
              }
            ]
          },
          "motion": {
            "preset": "stagger-children",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_ss-landing-awake_2",
          "block": "gallery-compare-slider-01",
          "props": {
            "heading": "Before and after",
            "intro": "",
            "beforeImage": "",
            "beforeAlt": "",
            "beforeLabel": "Before",
            "afterImage": "",
            "afterAlt": "",
            "afterLabel": "After"
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_ss-landing-awake_3",
          "block": "testimonials-card-stack-01",
          "props": {
            "heading": "In their words",
            "items": [
              {
                "quote": "They found the actual problem instead of replacing the whole unit.",
                "author": "K. Mulder",
                "role": "Rotterdam",
                "rating": 5
              },
              {
                "quote": "Second job we have given them. There will be a third.",
                "author": "J. Willems",
                "role": "Capelle",
                "rating": 5
              },
              {
                "quote": "Sent photos every day while we were away.",
                "author": "P. de Groot",
                "role": "Delft",
                "rating": 5
              }
            ]
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_ss-landing-awake_4",
          "block": "about-scroll-story-01",
          "props": {
            "heading": "How we got here",
            "image": "",
            "imageAlt": "",
            "items": [
              {
                "year": "2014",
                "title": "Two of us and a van",
                "description": "One town, word of mouth, no website."
              },
              {
                "year": "2019",
                "title": "A proper workshop",
                "description": "Room to prefabricate meant shorter jobs on site."
              },
              {
                "year": "2024",
                "title": "Twelve people",
                "description": "Same standard of work, more of it, still local."
              }
            ]
          },
          "motion": {
            "preset": "none",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_ss-landing-awake_5",
          "block": "cta-animated-border-01",
          "props": {
            "heading": "Need help today?",
            "body": "Call us and speak to someone who can actually come out.",
            "ctaLabel": "Request a quote",
            "ctaHref": "/contact",
            "tone": "primary",
            "secondaryLabel": "",
            "secondaryHref": ""
          },
          "motion": {
            "preset": "scale-in",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_ss-landing-awake_6",
          "block": "contact-details-01",
          "props": {
            "heading": "Get in touch",
            "intro": "",
            "phone": "",
            "email": "",
            "street": "",
            "postalCode": "",
            "city": "",
            "hours": "Monday–Friday 08:00–18:00\nSaturday 09:00–13:00",
            "showMap": true
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "C",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Shadcn Space. Copyright (c) 2026 Shadcn Space Licensed under the MIT License.",
      "source": {
        "library": "Shadcn Space",
        "demo": "landing-awake",
        "url": "https://shadcnspace.com",
        "derivation": "layout-observed"
      },
      "fingerprint": "0515eceb87e4cd8807a61909ea8cafd61355fd9f",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "ss-landing-crypgo",
      "tier": "platform",
      "name": "Crypgo - Shadcn UI Crypto Landing Page Template ( Next.js & Astro )",
      "description": "Free Crypgo landing page template available in Next.js and Astro versions. Built with Shadcn UI and Tailwind - developer-friendly, responsive, SEO optimized, and ready to customize for crypto, SaaS & Web3 projects.",
      "collection": "conversion",
      "tags": [
        "crypgo",
        "landing",
        "shadcn-space",
        "free",
        "full-page"
      ],
      "sections": [
        {
          "id": "sec_ss-landing-crypgo_0",
          "block": "hero-asymmetric-01",
          "props": {
            "eyebrow": "Selected work",
            "headline": "Make the first screen unforgettable",
            "subheadline": "A single composition: brand, one line, one action, one image that does the talking.",
            "primaryLabel": "Book a call",
            "primaryHref": "/contact",
            "image": "",
            "imageAlt": "Featured project"
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "load",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_ss-landing-crypgo_1",
          "block": "features-bento-grid-01",
          "props": {
            "heading": "Everything in one place",
            "intro": "Each panel is a capability. The bigger ones are the ones customers ask about first.",
            "items": [
              {
                "title": "One place for the work",
                "description": "Quotes, jobs, invoices and the history behind them.",
                "size": "wide"
              },
              {
                "title": "Live availability",
                "description": "The calendar customers actually see.",
                "size": "normal"
              },
              {
                "title": "Paid faster",
                "description": "Invoices that chase themselves.",
                "size": "normal"
              },
              {
                "title": "Built for a phone",
                "description": "Because that is where the job happens.",
                "size": "tall"
              },
              {
                "title": "Nothing to install",
                "description": "It runs in a browser and updates itself.",
                "size": "normal"
              }
            ]
          },
          "motion": {
            "preset": "stagger-children",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_ss-landing-crypgo_2",
          "block": "stats-counter-01",
          "props": {
            "items": [
              {
                "value": 15,
                "suffix": "+",
                "label": "Years in business"
              },
              {
                "value": 2500,
                "suffix": "",
                "label": "Jobs completed"
              },
              {
                "value": 49,
                "suffix": "",
                "label": "Average rating ×10"
              }
            ]
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_ss-landing-crypgo_3",
          "block": "testimonials-card-stack-01",
          "props": {
            "heading": "In their words",
            "items": [
              {
                "quote": "They found the actual problem instead of replacing the whole unit.",
                "author": "K. Mulder",
                "role": "Rotterdam",
                "rating": 5
              },
              {
                "quote": "Second job we have given them. There will be a third.",
                "author": "J. Willems",
                "role": "Capelle",
                "rating": 5
              },
              {
                "quote": "Sent photos every day while we were away.",
                "author": "P. de Groot",
                "role": "Delft",
                "rating": 5
              }
            ]
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_ss-landing-crypgo_4",
          "block": "pricing-toggle-01",
          "props": {
            "heading": "Simple pricing",
            "intro": "",
            "monthlyLabel": "Monthly",
            "yearlyLabel": "Yearly",
            "yearlyNote": "Two months free",
            "items": [
              {
                "name": "Starter",
                "monthlyPrice": "€49",
                "yearlyPrice": "€490",
                "period": "/month",
                "description": "For a single site that needs to look after itself.",
                "featureList": "One website\nHosting and backups\nE-mail support",
                "ctaLabel": "Choose Starter",
                "ctaHref": "/contact",
                "featured": false
              },
              {
                "name": "Growth",
                "monthlyPrice": "€149",
                "yearlyPrice": "€1490",
                "period": "/month",
                "description": "For a business that markets as well as it delivers.",
                "featureList": "Everything in Starter\nSEO and analytics\nMonthly content changes\nPriority support",
                "ctaLabel": "Choose Growth",
                "ctaHref": "/contact",
                "featured": true
              },
              {
                "name": "Scale",
                "monthlyPrice": "€399",
                "yearlyPrice": "€3990",
                "period": "/month",
                "description": "For multiple brands, shops or locations.",
                "featureList": "Everything in Growth\nMultiple sites\nCommerce and CRM\nNamed contact",
                "ctaLabel": "Talk to us",
                "ctaHref": "/contact",
                "featured": false
              }
            ]
          },
          "motion": {
            "preset": "stagger-children",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_ss-landing-crypgo_5",
          "block": "cta-banner-01",
          "props": {
            "heading": "Need help today?",
            "body": "Call us and speak to someone who can actually come out.",
            "ctaLabel": "Request a quote",
            "ctaHref": "/contact",
            "tone": "primary"
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "B",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Shadcn Space. Copyright (c) 2026 Shadcn Space Licensed under the MIT License.",
      "source": {
        "library": "Shadcn Space",
        "demo": "landing-crypgo",
        "url": "https://shadcnspace.com",
        "derivation": "layout-observed"
      },
      "fingerprint": "8b3e432124715c029fd1f84b4dad12a4ae5714e5",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "ss-landing-digital-arc",
      "tier": "platform",
      "name": "Digital Arc – Creative Agency & Portfolio (Next.js & Astro)",
      "description": "Creative agency and portfolio template available in both Next.js and Astro versions. Fast, responsive, and perfect for design studios or freelance portfolios.",
      "collection": "conversion",
      "tags": [
        "digital-arc",
        "landing",
        "shadcn-space",
        "free",
        "full-page"
      ],
      "sections": [
        {
          "id": "sec_ss-landing-digital-arc_0",
          "block": "hero-split-screen-01",
          "props": {
            "eyebrow": "",
            "headline": "A headline that says what you do",
            "subheadline": "One or two sentences explaining who you help and why they should call you.",
            "primaryLabel": "Request a quote",
            "primaryHref": "/contact",
            "secondaryLabel": "",
            "secondaryHref": "",
            "image": "",
            "imageAlt": ""
          },
          "motion": {
            "preset": "fade-in",
            "trigger": "load",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_ss-landing-digital-arc_1",
          "block": "gallery-tilt-cards-01",
          "props": {
            "heading": "Selected work",
            "intro": "",
            "items": [
              {
                "title": "Northbound",
                "caption": "Brand and site",
                "image": "",
                "imageAlt": "",
                "href": ""
              },
              {
                "title": "Harbour Co.",
                "caption": "Commerce",
                "image": "",
                "imageAlt": "",
                "href": ""
              },
              {
                "title": "Kade 12",
                "caption": "Campaign",
                "image": "",
                "imageAlt": "",
                "href": ""
              }
            ]
          },
          "motion": {
            "preset": "stagger-children",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_ss-landing-digital-arc_2",
          "block": "features-bento-grid-01",
          "props": {
            "heading": "Everything in one place",
            "intro": "Each panel is a capability. The bigger ones are the ones customers ask about first.",
            "items": [
              {
                "title": "One place for the work",
                "description": "Quotes, jobs, invoices and the history behind them.",
                "size": "wide"
              },
              {
                "title": "Live availability",
                "description": "The calendar customers actually see.",
                "size": "normal"
              },
              {
                "title": "Paid faster",
                "description": "Invoices that chase themselves.",
                "size": "normal"
              },
              {
                "title": "Built for a phone",
                "description": "Because that is where the job happens.",
                "size": "tall"
              },
              {
                "title": "Nothing to install",
                "description": "It runs in a browser and updates itself.",
                "size": "normal"
              }
            ]
          },
          "motion": {
            "preset": "stagger-children",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_ss-landing-digital-arc_3",
          "block": "testimonials-card-stack-01",
          "props": {
            "heading": "In their words",
            "items": [
              {
                "quote": "They found the actual problem instead of replacing the whole unit.",
                "author": "K. Mulder",
                "role": "Rotterdam",
                "rating": 5
              },
              {
                "quote": "Second job we have given them. There will be a third.",
                "author": "J. Willems",
                "role": "Capelle",
                "rating": 5
              },
              {
                "quote": "Sent photos every day while we were away.",
                "author": "P. de Groot",
                "role": "Delft",
                "rating": 5
              }
            ]
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_ss-landing-digital-arc_4",
          "block": "cta-animated-border-01",
          "props": {
            "heading": "Need help today?",
            "body": "Call us and speak to someone who can actually come out.",
            "ctaLabel": "Request a quote",
            "ctaHref": "/contact",
            "tone": "primary",
            "secondaryLabel": "",
            "secondaryHref": ""
          },
          "motion": {
            "preset": "scale-in",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_ss-landing-digital-arc_5",
          "block": "contact-details-01",
          "props": {
            "heading": "Get in touch",
            "intro": "",
            "phone": "",
            "email": "",
            "street": "",
            "postalCode": "",
            "city": "",
            "hours": "Monday–Friday 08:00–18:00\nSaturday 09:00–13:00",
            "showMap": true
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "B",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Shadcn Space. Copyright (c) 2026 Shadcn Space Licensed under the MIT License.",
      "source": {
        "library": "Shadcn Space",
        "demo": "landing-digital-arc",
        "url": "https://shadcnspace.com",
        "derivation": "layout-observed"
      },
      "fingerprint": "bb3822fb8ff83fc4294daccd45025cf66e104827",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "ss-landing-gleamer",
      "tier": "platform",
      "name": "Gleamer – Next.js Cleaning Service Website Template",
      "description": "Gleamer is a professional Next.js cleaning website template with Tailwind CSS, TypeScript, and reusable components. Fast, responsive, and easy to customize.",
      "collection": "conversion",
      "tags": [
        "gleamer",
        "landing",
        "shadcn-space",
        "free",
        "full-page"
      ],
      "sections": [
        {
          "id": "sec_ss-landing-gleamer_0",
          "block": "hero-cover-statement-01",
          "props": {
            "eyebrow": "Introducing",
            "headline": "A calmer way to build the web",
            "subheadline": "One workspace for the site, the content and the growth work — without a stack of plugins.",
            "primaryLabel": "Get started",
            "primaryHref": "/contact",
            "secondaryLabel": "Browse examples",
            "secondaryHref": "/templates",
            "image": "",
            "video": "",
            "imageAlt": ""
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "load",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_ss-landing-gleamer_1",
          "block": "features-grid-01",
          "props": {
            "eyebrow": "",
            "heading": "Why clients choose us",
            "intro": "",
            "items": [
              {
                "icon": "clock",
                "title": "Available 24/7",
                "description": "Call us any time, we pick up."
              },
              {
                "icon": "shield",
                "title": "Fully insured",
                "description": "Certified and covered work."
              },
              {
                "icon": "star",
                "title": "Rated 4.9",
                "description": "Based on verified customer reviews."
              }
            ]
          },
          "motion": {
            "preset": "stagger-children",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_ss-landing-gleamer_2",
          "block": "about-scroll-story-01",
          "props": {
            "heading": "How we got here",
            "image": "",
            "imageAlt": "",
            "items": [
              {
                "year": "2014",
                "title": "Two of us and a van",
                "description": "One town, word of mouth, no website."
              },
              {
                "year": "2019",
                "title": "A proper workshop",
                "description": "Room to prefabricate meant shorter jobs on site."
              },
              {
                "year": "2024",
                "title": "Twelve people",
                "description": "Same standard of work, more of it, still local."
              }
            ]
          },
          "motion": {
            "preset": "none",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_ss-landing-gleamer_3",
          "block": "testimonials-card-stack-01",
          "props": {
            "heading": "In their words",
            "items": [
              {
                "quote": "They found the actual problem instead of replacing the whole unit.",
                "author": "K. Mulder",
                "role": "Rotterdam",
                "rating": 5
              },
              {
                "quote": "Second job we have given them. There will be a third.",
                "author": "J. Willems",
                "role": "Capelle",
                "rating": 5
              },
              {
                "quote": "Sent photos every day while we were away.",
                "author": "P. de Groot",
                "role": "Delft",
                "rating": 5
              }
            ]
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_ss-landing-gleamer_4",
          "block": "faq-reveal-accordion-01",
          "props": {
            "heading": "Frequently asked questions",
            "intro": "",
            "items": [
              {
                "question": "How quickly can you come out?",
                "answer": "Usually the same day, and always within two working days."
              },
              {
                "question": "What does it cost?",
                "answer": "We quote up front, in writing, with no call-out fee."
              },
              {
                "question": "Do you guarantee the work?",
                "answer": "Two years on labour, and we come back if something moves."
              }
            ]
          },
          "motion": {
            "preset": "stagger-children",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_ss-landing-gleamer_5",
          "block": "cta-animated-border-01",
          "props": {
            "heading": "Need help today?",
            "body": "Call us and speak to someone who can actually come out.",
            "ctaLabel": "Request a quote",
            "ctaHref": "/contact",
            "tone": "primary",
            "secondaryLabel": "",
            "secondaryHref": ""
          },
          "motion": {
            "preset": "scale-in",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_ss-landing-gleamer_6",
          "block": "contact-details-01",
          "props": {
            "heading": "Get in touch",
            "intro": "",
            "phone": "",
            "email": "",
            "street": "",
            "postalCode": "",
            "city": "",
            "hours": "Monday–Friday 08:00–18:00\nSaturday 09:00–13:00",
            "showMap": true
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "C",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Shadcn Space. Copyright (c) 2026 Shadcn Space Licensed under the MIT License.",
      "source": {
        "library": "Shadcn Space",
        "demo": "landing-gleamer",
        "url": "https://shadcnspace.com",
        "derivation": "layout-observed"
      },
      "fingerprint": "88a2ecf59164ac7e2d844607544e13d8ec884879",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "ss-landing-homely",
      "tier": "platform",
      "name": "Homely – Next.js Real Estate Website Template",
      "description": "Modern real estate website template built with Next.js, Tailwind CSS, and shadcn/ui. Fast, scalable, SEO-ready, and fully customizable.",
      "collection": "conversion",
      "tags": [
        "homely",
        "landing",
        "shadcn-space",
        "free",
        "full-page"
      ],
      "sections": [
        {
          "id": "sec_ss-landing-homely_0",
          "block": "hero-agency-proof-01",
          "props": {
            "eyebrow": "",
            "headline": "Building bold brands with",
            "headlineAccent": "thoughtful design",
            "subheadline": "We help small startups tackle the world’s biggest challenges with tailored solutions that grow with them.",
            "primaryLabel": "Get Started",
            "primaryHref": "/contact",
            "trustLabel": "Trusted by 1000+ clients",
            "ratingLabel": "5.0",
            "avatars": [
              {
                "name": "A",
                "image": ""
              },
              {
                "name": "B",
                "image": ""
              },
              {
                "name": "C",
                "image": ""
              },
              {
                "name": "D",
                "image": ""
              }
            ],
            "logos": [
              {
                "name": "Northwind",
                "image": ""
              },
              {
                "name": "Acme",
                "image": ""
              },
              {
                "name": "Globex",
                "image": ""
              },
              {
                "name": "Initech",
                "image": ""
              },
              {
                "name": "Umbrella",
                "image": ""
              }
            ]
          },
          "motion": {
            "preset": "hero-reveal",
            "trigger": "load",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_ss-landing-homely_1",
          "block": "gallery-tilt-cards-01",
          "props": {
            "heading": "Selected work",
            "intro": "",
            "items": [
              {
                "title": "Northbound",
                "caption": "Brand and site",
                "image": "",
                "imageAlt": "",
                "href": ""
              },
              {
                "title": "Harbour Co.",
                "caption": "Commerce",
                "image": "",
                "imageAlt": "",
                "href": ""
              },
              {
                "title": "Kade 12",
                "caption": "Campaign",
                "image": "",
                "imageAlt": "",
                "href": ""
              }
            ]
          },
          "motion": {
            "preset": "stagger-children",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_ss-landing-homely_2",
          "block": "features-bento-grid-01",
          "props": {
            "heading": "Everything in one place",
            "intro": "Each panel is a capability. The bigger ones are the ones customers ask about first.",
            "items": [
              {
                "title": "One place for the work",
                "description": "Quotes, jobs, invoices and the history behind them.",
                "size": "wide"
              },
              {
                "title": "Live availability",
                "description": "The calendar customers actually see.",
                "size": "normal"
              },
              {
                "title": "Paid faster",
                "description": "Invoices that chase themselves.",
                "size": "normal"
              },
              {
                "title": "Built for a phone",
                "description": "Because that is where the job happens.",
                "size": "tall"
              },
              {
                "title": "Nothing to install",
                "description": "It runs in a browser and updates itself.",
                "size": "normal"
              }
            ]
          },
          "motion": {
            "preset": "stagger-children",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_ss-landing-homely_3",
          "block": "testimonials-card-stack-01",
          "props": {
            "heading": "In their words",
            "items": [
              {
                "quote": "They found the actual problem instead of replacing the whole unit.",
                "author": "K. Mulder",
                "role": "Rotterdam",
                "rating": 5
              },
              {
                "quote": "Second job we have given them. There will be a third.",
                "author": "J. Willems",
                "role": "Capelle",
                "rating": 5
              },
              {
                "quote": "Sent photos every day while we were away.",
                "author": "P. de Groot",
                "role": "Delft",
                "rating": 5
              }
            ]
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_ss-landing-homely_4",
          "block": "faq-reveal-accordion-01",
          "props": {
            "heading": "Frequently asked questions",
            "intro": "",
            "items": [
              {
                "question": "How quickly can you come out?",
                "answer": "Usually the same day, and always within two working days."
              },
              {
                "question": "What does it cost?",
                "answer": "We quote up front, in writing, with no call-out fee."
              },
              {
                "question": "Do you guarantee the work?",
                "answer": "Two years on labour, and we come back if something moves."
              }
            ]
          },
          "motion": {
            "preset": "stagger-children",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_ss-landing-homely_5",
          "block": "cta-animated-border-01",
          "props": {
            "heading": "Need help today?",
            "body": "Call us and speak to someone who can actually come out.",
            "ctaLabel": "Request a quote",
            "ctaHref": "/contact",
            "tone": "primary",
            "secondaryLabel": "",
            "secondaryHref": ""
          },
          "motion": {
            "preset": "scale-in",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_ss-landing-homely_6",
          "block": "contact-details-01",
          "props": {
            "heading": "Get in touch",
            "intro": "",
            "phone": "",
            "email": "",
            "street": "",
            "postalCode": "",
            "city": "",
            "hours": "Monday–Friday 08:00–18:00\nSaturday 09:00–13:00",
            "showMap": true
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "B",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Shadcn Space. Copyright (c) 2026 Shadcn Space Licensed under the MIT License.",
      "source": {
        "library": "Shadcn Space",
        "demo": "landing-homely",
        "url": "https://shadcnspace.com",
        "derivation": "layout-observed"
      },
      "fingerprint": "9d3408bc8c414e672d6b174ebd1f7f51dd90ed98",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "ss-landing-resume",
      "tier": "platform",
      "name": "Resume - Shadcn UI Resume and Portfolio Template",
      "description": "Free Resume NextJS Template with Tailwind CSS and Shadcn UI - modern, responsive, fast, and easy to personalize for your online professional profile.",
      "collection": "conversion",
      "tags": [
        "resume",
        "landing",
        "shadcn-space",
        "free",
        "full-page"
      ],
      "sections": [
        {
          "id": "sec_ss-landing-resume_0",
          "block": "hero-cover-statement-01",
          "props": {
            "eyebrow": "Introducing",
            "headline": "A calmer way to build the web",
            "subheadline": "One workspace for the site, the content and the growth work — without a stack of plugins.",
            "primaryLabel": "Get started",
            "primaryHref": "/contact",
            "secondaryLabel": "Browse examples",
            "secondaryHref": "/templates",
            "image": "",
            "video": "",
            "imageAlt": ""
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "load",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_ss-landing-resume_1",
          "block": "about-scroll-story-01",
          "props": {
            "heading": "How we got here",
            "image": "",
            "imageAlt": "",
            "items": [
              {
                "year": "2014",
                "title": "Two of us and a van",
                "description": "One town, word of mouth, no website."
              },
              {
                "year": "2019",
                "title": "A proper workshop",
                "description": "Room to prefabricate meant shorter jobs on site."
              },
              {
                "year": "2024",
                "title": "Twelve people",
                "description": "Same standard of work, more of it, still local."
              }
            ]
          },
          "motion": {
            "preset": "none",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_ss-landing-resume_2",
          "block": "features-grid-01",
          "props": {
            "eyebrow": "",
            "heading": "Why clients choose us",
            "intro": "",
            "items": [
              {
                "icon": "clock",
                "title": "Available 24/7",
                "description": "Call us any time, we pick up."
              },
              {
                "icon": "shield",
                "title": "Fully insured",
                "description": "Certified and covered work."
              },
              {
                "icon": "star",
                "title": "Rated 4.9",
                "description": "Based on verified customer reviews."
              }
            ]
          },
          "motion": {
            "preset": "stagger-children",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_ss-landing-resume_3",
          "block": "gallery-compare-slider-01",
          "props": {
            "heading": "Before and after",
            "intro": "",
            "beforeImage": "",
            "beforeAlt": "",
            "beforeLabel": "Before",
            "afterImage": "",
            "afterAlt": "",
            "afterLabel": "After"
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_ss-landing-resume_4",
          "block": "cta-animated-border-01",
          "props": {
            "heading": "Need help today?",
            "body": "Call us and speak to someone who can actually come out.",
            "ctaLabel": "Request a quote",
            "ctaHref": "/contact",
            "tone": "primary",
            "secondaryLabel": "",
            "secondaryHref": ""
          },
          "motion": {
            "preset": "scale-in",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "C",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Shadcn Space. Copyright (c) 2026 Shadcn Space Licensed under the MIT License.",
      "source": {
        "library": "Shadcn Space",
        "demo": "landing-resume",
        "url": "https://shadcnspace.com",
        "derivation": "layout-observed"
      },
      "fingerprint": "c0ef661dfc68e31c0ea2b15b74cbdd62c78f2389",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "ss-landing-saazio",
      "tier": "platform",
      "name": "Saazio - Next.js SaaS Template Built with React, Shadcn UI & Tailwind CSS",
      "description": "Explore Saazio, a responsive SaaS template built with Next.js, React, Tailwind CSS, TypeScript, and shadcn/ui. Perfect for startups, AI tools, software products, and SaaS businesses.",
      "collection": "conversion",
      "tags": [
        "saazio",
        "landing",
        "shadcn-space",
        "free",
        "full-page"
      ],
      "sections": [
        {
          "id": "sec_ss-landing-saazio_0",
          "block": "hero-cover-statement-01",
          "props": {
            "eyebrow": "Introducing",
            "headline": "A calmer way to build the web",
            "subheadline": "One workspace for the site, the content and the growth work — without a stack of plugins.",
            "primaryLabel": "Get started",
            "primaryHref": "/contact",
            "secondaryLabel": "Browse examples",
            "secondaryHref": "/templates",
            "image": "",
            "video": "",
            "imageAlt": ""
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "load",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_ss-landing-saazio_1",
          "block": "features-grid-01",
          "props": {
            "eyebrow": "",
            "heading": "Why clients choose us",
            "intro": "",
            "items": [
              {
                "icon": "clock",
                "title": "Available 24/7",
                "description": "Call us any time, we pick up."
              },
              {
                "icon": "shield",
                "title": "Fully insured",
                "description": "Certified and covered work."
              },
              {
                "icon": "star",
                "title": "Rated 4.9",
                "description": "Based on verified customer reviews."
              }
            ]
          },
          "motion": {
            "preset": "stagger-children",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_ss-landing-saazio_2",
          "block": "about-scroll-story-01",
          "props": {
            "heading": "How we got here",
            "image": "",
            "imageAlt": "",
            "items": [
              {
                "year": "2014",
                "title": "Two of us and a van",
                "description": "One town, word of mouth, no website."
              },
              {
                "year": "2019",
                "title": "A proper workshop",
                "description": "Room to prefabricate meant shorter jobs on site."
              },
              {
                "year": "2024",
                "title": "Twelve people",
                "description": "Same standard of work, more of it, still local."
              }
            ]
          },
          "motion": {
            "preset": "none",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_ss-landing-saazio_3",
          "block": "testimonials-card-stack-01",
          "props": {
            "heading": "In their words",
            "items": [
              {
                "quote": "They found the actual problem instead of replacing the whole unit.",
                "author": "K. Mulder",
                "role": "Rotterdam",
                "rating": 5
              },
              {
                "quote": "Second job we have given them. There will be a third.",
                "author": "J. Willems",
                "role": "Capelle",
                "rating": 5
              },
              {
                "quote": "Sent photos every day while we were away.",
                "author": "P. de Groot",
                "role": "Delft",
                "rating": 5
              }
            ]
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_ss-landing-saazio_4",
          "block": "cta-animated-border-01",
          "props": {
            "heading": "Need help today?",
            "body": "Call us and speak to someone who can actually come out.",
            "ctaLabel": "Request a quote",
            "ctaHref": "/contact",
            "tone": "primary",
            "secondaryLabel": "",
            "secondaryHref": ""
          },
          "motion": {
            "preset": "scale-in",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_ss-landing-saazio_5",
          "block": "contact-details-01",
          "props": {
            "heading": "Get in touch",
            "intro": "",
            "phone": "",
            "email": "",
            "street": "",
            "postalCode": "",
            "city": "",
            "hours": "Monday–Friday 08:00–18:00\nSaturday 09:00–13:00",
            "showMap": true
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "C",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Shadcn Space. Copyright (c) 2026 Shadcn Space Licensed under the MIT License.",
      "source": {
        "library": "Shadcn Space",
        "demo": "landing-saazio",
        "url": "https://shadcnspace.com",
        "derivation": "layout-observed"
      },
      "fingerprint": "320289b464b871e7e40b12623ec9ff3d04a188a0",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "ss-landing-studiova",
      "tier": "platform",
      "name": "Studiova – Creative Agency Template (Next.js & Astro)",
      "description": "Creative agency template available in both Next.js and Astro versions. Built with Tailwind CSS and shadcn/ui. Fast, modern, and developer-friendly.",
      "collection": "conversion",
      "tags": [
        "studiova",
        "landing",
        "shadcn-space",
        "free",
        "full-page"
      ],
      "sections": [
        {
          "id": "sec_ss-landing-studiova_0",
          "block": "hero-agency-proof-01",
          "props": {
            "eyebrow": "",
            "headline": "Building bold brands with",
            "headlineAccent": "thoughtful design",
            "subheadline": "We help small startups tackle the world’s biggest challenges with tailored solutions that grow with them.",
            "primaryLabel": "Get Started",
            "primaryHref": "/contact",
            "trustLabel": "Trusted by 1000+ clients",
            "ratingLabel": "5.0",
            "avatars": [
              {
                "name": "A",
                "image": ""
              },
              {
                "name": "B",
                "image": ""
              },
              {
                "name": "C",
                "image": ""
              },
              {
                "name": "D",
                "image": ""
              }
            ],
            "logos": [
              {
                "name": "Northwind",
                "image": ""
              },
              {
                "name": "Acme",
                "image": ""
              },
              {
                "name": "Globex",
                "image": ""
              },
              {
                "name": "Initech",
                "image": ""
              },
              {
                "name": "Umbrella",
                "image": ""
              }
            ]
          },
          "motion": {
            "preset": "hero-reveal",
            "trigger": "load",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_ss-landing-studiova_1",
          "block": "gallery-tilt-cards-01",
          "props": {
            "heading": "Selected work",
            "intro": "",
            "items": [
              {
                "title": "Northbound",
                "caption": "Brand and site",
                "image": "",
                "imageAlt": "",
                "href": ""
              },
              {
                "title": "Harbour Co.",
                "caption": "Commerce",
                "image": "",
                "imageAlt": "",
                "href": ""
              },
              {
                "title": "Kade 12",
                "caption": "Campaign",
                "image": "",
                "imageAlt": "",
                "href": ""
              }
            ]
          },
          "motion": {
            "preset": "stagger-children",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_ss-landing-studiova_2",
          "block": "features-bento-grid-01",
          "props": {
            "heading": "Everything in one place",
            "intro": "Each panel is a capability. The bigger ones are the ones customers ask about first.",
            "items": [
              {
                "title": "One place for the work",
                "description": "Quotes, jobs, invoices and the history behind them.",
                "size": "wide"
              },
              {
                "title": "Live availability",
                "description": "The calendar customers actually see.",
                "size": "normal"
              },
              {
                "title": "Paid faster",
                "description": "Invoices that chase themselves.",
                "size": "normal"
              },
              {
                "title": "Built for a phone",
                "description": "Because that is where the job happens.",
                "size": "tall"
              },
              {
                "title": "Nothing to install",
                "description": "It runs in a browser and updates itself.",
                "size": "normal"
              }
            ]
          },
          "motion": {
            "preset": "stagger-children",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_ss-landing-studiova_3",
          "block": "testimonials-card-stack-01",
          "props": {
            "heading": "In their words",
            "items": [
              {
                "quote": "They found the actual problem instead of replacing the whole unit.",
                "author": "K. Mulder",
                "role": "Rotterdam",
                "rating": 5
              },
              {
                "quote": "Second job we have given them. There will be a third.",
                "author": "J. Willems",
                "role": "Capelle",
                "rating": 5
              },
              {
                "quote": "Sent photos every day while we were away.",
                "author": "P. de Groot",
                "role": "Delft",
                "rating": 5
              }
            ]
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_ss-landing-studiova_4",
          "block": "cta-animated-border-01",
          "props": {
            "heading": "Need help today?",
            "body": "Call us and speak to someone who can actually come out.",
            "ctaLabel": "Request a quote",
            "ctaHref": "/contact",
            "tone": "primary",
            "secondaryLabel": "",
            "secondaryHref": ""
          },
          "motion": {
            "preset": "scale-in",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_ss-landing-studiova_5",
          "block": "contact-details-01",
          "props": {
            "heading": "Get in touch",
            "intro": "",
            "phone": "",
            "email": "",
            "street": "",
            "postalCode": "",
            "city": "",
            "hours": "Monday–Friday 08:00–18:00\nSaturday 09:00–13:00",
            "showMap": true
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "B",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Shadcn Space. Copyright (c) 2026 Shadcn Space Licensed under the MIT License.",
      "source": {
        "library": "Shadcn Space",
        "demo": "landing-studiova",
        "url": "https://shadcnspace.com",
        "derivation": "layout-observed"
      },
      "fingerprint": "875779e9b792978267ba74577e1d76c899370d7d",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    },
    {
      "id": "ss-landing-typefolio",
      "tier": "platform",
      "name": "Typefolio - Shadcn UI Personal Portfolio Template",
      "description": "Free Typefolio NextJS portfolio template built with Shadcn UI & Tailwind CSS - clean, minimal, SEO-friendly, and perfect for developers, designers & creatives.",
      "collection": "conversion",
      "tags": [
        "typefolio",
        "landing",
        "shadcn-space",
        "free",
        "full-page"
      ],
      "sections": [
        {
          "id": "sec_ss-landing-typefolio_0",
          "block": "hero-centered-01",
          "props": {
            "eyebrow": "",
            "headline": "A headline that says what you do",
            "subheadline": "One or two sentences explaining who you help and why they should call you.",
            "primaryLabel": "Request a quote",
            "primaryHref": "/contact",
            "secondaryLabel": "",
            "secondaryHref": "",
            "align": "center"
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "load",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_ss-landing-typefolio_1",
          "block": "about-scroll-story-01",
          "props": {
            "heading": "How we got here",
            "image": "",
            "imageAlt": "",
            "items": [
              {
                "year": "2014",
                "title": "Two of us and a van",
                "description": "One town, word of mouth, no website."
              },
              {
                "year": "2019",
                "title": "A proper workshop",
                "description": "Room to prefabricate meant shorter jobs on site."
              },
              {
                "year": "2024",
                "title": "Twelve people",
                "description": "Same standard of work, more of it, still local."
              }
            ]
          },
          "motion": {
            "preset": "none",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_ss-landing-typefolio_2",
          "block": "gallery-compare-slider-01",
          "props": {
            "heading": "Before and after",
            "intro": "",
            "beforeImage": "",
            "beforeAlt": "",
            "beforeLabel": "Before",
            "afterImage": "",
            "afterAlt": "",
            "afterLabel": "After"
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_ss-landing-typefolio_3",
          "block": "features-brutalist-grid-01",
          "props": {
            "heading": "What you get",
            "intro": "",
            "items": [
              {
                "icon": "bolt",
                "title": "Fast",
                "description": "Loads before your customer decides to leave."
              },
              {
                "icon": "shield",
                "title": "Solid",
                "description": "Backed up, monitored and patched without being asked."
              },
              {
                "icon": "chart",
                "title": "Measured",
                "description": "Every euro spent is traceable to something that happened."
              },
              {
                "icon": "phone",
                "title": "Answered",
                "description": "A person, in your timezone, who knows your account."
              }
            ]
          },
          "motion": {
            "preset": "stagger-children",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        },
        {
          "id": "sec_ss-landing-typefolio_4",
          "block": "cta-high-contrast-01",
          "props": {
            "heading": "Need help today?",
            "body": "Call us and speak to someone who can actually come out.",
            "ctaLabel": "Request a quote",
            "ctaHref": "/contact",
            "tone": "primary",
            "kicker": ""
          },
          "motion": {
            "preset": "fade-up",
            "trigger": "viewport",
            "delay": 0,
            "stagger": 0.08,
            "once": true
          }
        }
      ],
      "performanceClass": "C",
      "thumbnail": "",
      "licence": "mit",
      "attribution": "Layout derived from Shadcn Space. Copyright (c) 2026 Shadcn Space Licensed under the MIT License.",
      "source": {
        "library": "Shadcn Space",
        "demo": "landing-typefolio",
        "url": "https://shadcnspace.com",
        "derivation": "layout-observed"
      },
      "fingerprint": "7f67b131a7ca4e28da3bcadf135b178674119d0d",
      "createdBy": "importer",
      "createdAt": "1970-01-01T00:00:00.000Z",
      "updatedAt": "1970-01-01T00:00:00.000Z"
    }
  ]
}
