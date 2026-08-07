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
import type { AssetPreset, AssetSourceRegisterEntry } from '@platform/schemas'

/**
 * Copied from `packages/assets/src/catalog.generated.ts` by the same run of
 * the same importer. It exists because `@platform/core-api` cannot yet depend
 * on `@platform/assets`; delete it and import the package once it can.
 */
export const ASSET_PRESETS: AssetPreset[] = [
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
    "fingerprint": "30a8936ed5ead5d1f362ab44a38d87a7bc406c82",
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
    "fingerprint": "8c9060bbfcf63f1c010c1de114aa1b722bffc2af",
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
    "fingerprint": "4e58c3e4d1c70937a45eb1e6bb31be01bf14a480",
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
    "fingerprint": "cd1f630b0fd5d31011ad593133d72d7e49b8fbef",
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
  }
]

/** Full licence register — every library shown in the Assets panel, cleared or refused. */
export const ASSET_SOURCES: AssetSourceRegisterEntry[] = [
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
    "notes": "CLEARED, FREE REPO ONLY. MIT verified from the LICENSE in magicuidesign/magicui. Magic UI Pro is a separate paid product (templates and premium components) that is NOT in the MIT repository and is out of scope — never derive from a Pro component. CLEARED BUT UNUSED: no preset in the catalogue derives from this source today. The clearance stands for future work; it is not a record that anything was taken.",
    "evidenceUrl": "https://github.com/magicuidesign/magicui/blob/main/LICENSE.md",
    "copyrightNotice": "Copyright (c) Magic UI",
    "noticeReadAt": "reference/magicui/LICENSE.md",
    "install": {
      "method": "npx",
      "command": "npx shadcn@latest add @magicui/marquee",
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
]
