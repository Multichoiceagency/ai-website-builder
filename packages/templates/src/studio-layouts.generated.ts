/**
 * GENERATED — do not edit by hand.
 *
 * Produced by `packages/templates/scripts/import-studio-layouts.mjs`
 * from allowlisted local Studio marketing repos. Metadata + platform block
 * recipes only. No framework source or third-party asset URLs (ADR-0003).
 *
 * Regenerate with: pnpm --filter @platform/templates import:studio-layouts
 */
import type { TemplateCatalog } from '@platform/schemas'

export const STUDIO_LAYOUTS_CATALOG: TemplateCatalog = {
  "version": 1,
  "generatedAt": "2026-08-08T14:27:25.364Z",
  "source": "Studio layout recipes from allowlisted local marketing repos under Documents/GitHub. Metadata + platform block recipes only — no framework source or CDN URLs (ADR-0003).",
  "collections": [
    {
      "id": "landing",
      "label": "Landing pages",
      "description": "Whole-page starting points, hero through closing call to action.",
      "count": 6
    },
    {
      "id": "saas",
      "label": "SaaS & product",
      "description": "Product-led pages: dashboards, plans, feature proof.",
      "count": 1
    },
    {
      "id": "agency",
      "label": "Agency & portfolio",
      "description": "Studio and case-study work where the craft is the pitch.",
      "count": 1
    }
  ],
  "templates": [
    {
      "id": "studio-gardenluxveranda",
      "title": "Gardenlux Veranda",
      "collection": "landing",
      "category": "landing-page",
      "pageType": "landing",
      "style": [
        "premium",
        "modern"
      ],
      "industry": [
        "local",
        "*"
      ],
      "motionType": [
        "entrance",
        "scroll-reveal"
      ],
      "complexity": "moderate",
      "mobileSafe": true,
      "performanceClass": "B",
      "previewImage": "",
      "previewVideo": "",
      "islandReady": false,
      "isFree": true,
      "sourcePrompt": "Rebuild a full marketing landing page in the spirit of Studio reference “Gardenlux Veranda” (gardenluxveranda).\nWhole-page layout and hierarchy only — use platform blocks and theme tokens.\nDo not copy React/Next/Vue source, Tailwind class strings, or third-party assets. No external URLs.\n\nLocal outdoor-living retailer: product hero, proof bands, project gallery energy, and a strong quote CTA.\n\nObserved page chrome (prose only):\n· Nu 10% korting op alle veranda\\\n· Lamellendak, zonwering & schuifwanden – ontwerp en productie op maat\n\nSuggested section order (roles → platform blocks):\n1. header\n2. hero\n3. features\n4. stats\n5. gallery\n6. faq\n7. cta\n8. contact\n9. footer\n\nKeep one job per band, strong brand hierarchy in the first viewport, and a clear closing conversion.",
      "blockRecipe": [
        "header-liquid-glass-01",
        "hero-agency-proof-01",
        "features-bento-grid-01",
        "stats-meteor-panel-01",
        "gallery-tilt-cards-01",
        "faq-reveal-accordion-01",
        "cta-animated-border-01",
        "contact-details-01",
        "footer-simple-01"
      ]
    },
    {
      "id": "studio-maasstad-installaties",
      "title": "Maasstad Installaties (Spindler)",
      "collection": "landing",
      "category": "landing-page",
      "pageType": "landing",
      "style": [
        "modern",
        "bold"
      ],
      "industry": [
        "local",
        "*"
      ],
      "motionType": [
        "entrance",
        "scroll-reveal"
      ],
      "complexity": "moderate",
      "mobileSafe": true,
      "performanceClass": "B",
      "previewImage": "",
      "previewVideo": "",
      "islandReady": false,
      "isFree": true,
      "sourcePrompt": "Rebuild a full marketing landing page in the spirit of Studio reference “Maasstad Installaties (Spindler)” (maasstad-installaties).\nWhole-page layout and hierarchy only — use platform blocks and theme tokens.\nDo not copy React/Next/Vue source, Tailwind class strings, or third-party assets. No external URLs.\n\nInstallation / construction company homepage: disciplines, projects, stats, sustainability story, jobs.\n\nSuggested section order (roles → platform blocks):\n1. header\n2. hero\n3. logos\n4. features\n5. about\n6. stats\n7. gallery\n8. team\n9. cta\n10. footer\n\nKeep one job per band, strong brand hierarchy in the first viewport, and a clear closing conversion.",
      "blockRecipe": [
        "header-liquid-glass-01",
        "hero-asymmetric-01",
        "logos-orbit-01",
        "features-bento-grid-01",
        "about-scroll-story-01",
        "stats-counter-01",
        "gallery-compare-slider-01",
        "team-editorial-01",
        "cta-animated-border-01",
        "footer-simple-01"
      ]
    },
    {
      "id": "studio-mama-manolya",
      "title": "Mama Manolya Kapsalon",
      "collection": "landing",
      "category": "landing-page",
      "pageType": "landing",
      "style": [
        "premium",
        "editorial"
      ],
      "industry": [
        "local",
        "creative"
      ],
      "motionType": [
        "entrance",
        "scroll-reveal"
      ],
      "complexity": "moderate",
      "mobileSafe": true,
      "performanceClass": "B",
      "previewImage": "",
      "previewVideo": "",
      "islandReady": false,
      "isFree": true,
      "sourcePrompt": "Rebuild a full marketing landing page in the spirit of Studio reference “Mama Manolya Kapsalon” (mama-manolya).\nWhole-page layout and hierarchy only — use platform blocks and theme tokens.\nDo not copy React/Next/Vue source, Tailwind class strings, or third-party assets. No external URLs.\n\nSalon brand landing: cinematic hero, about, services, gallery, testimonials, booking/contact close.\n\nObserved page chrome (prose only):\n· Mama Manolya Kapsalon | Professionele Haarstyling in Den Haag\n· Mama Manolya Kapsalon biedt professionele haarstyling, knippen, kleuren en behandelingen in Den Haag. Maak nu een afspraak voor een nieuwe look!\n\nSuggested section order (roles → platform blocks):\n1. hero\n2. features\n3. about\n4. gallery\n5. testimonials\n6. cta\n7. contact\n\nKeep one job per band, strong brand hierarchy in the first viewport, and a clear closing conversion.",
      "blockRecipe": [
        "hero-centered-01",
        "features-bento-grid-01",
        "about-scroll-story-01",
        "gallery-tilt-cards-01",
        "testimonials-card-stack-01",
        "cta-animated-border-01",
        "contact-details-01"
      ]
    },
    {
      "id": "studio-fitbyemre",
      "title": "Fit by Emre",
      "collection": "landing",
      "category": "landing-page",
      "pageType": "landing",
      "style": [
        "bold",
        "modern"
      ],
      "industry": [
        "healthcare",
        "local"
      ],
      "motionType": [
        "entrance",
        "scroll-reveal"
      ],
      "complexity": "moderate",
      "mobileSafe": true,
      "performanceClass": "B",
      "previewImage": "",
      "previewVideo": "",
      "islandReady": false,
      "isFree": true,
      "sourcePrompt": "Rebuild a full marketing landing page in the spirit of Studio reference “Fit by Emre” (fitbyemre).\nWhole-page layout and hierarchy only — use platform blocks and theme tokens.\nDo not copy React/Next/Vue source, Tailwind class strings, or third-party assets. No external URLs.\n\nPersonal training studio: hero, services, stats, about, process, testimonials, intake CTA, contact.\n\nSuggested section order (roles → platform blocks):\n1. hero\n2. features\n3. about\n4. stats\n5. cta\n6. contact\n7. footer\n\nKeep one job per band, strong brand hierarchy in the first viewport, and a clear closing conversion.",
      "blockRecipe": [
        "hero-asymmetric-01",
        "features-bento-grid-01",
        "about-scroll-story-01",
        "stats-counter-01",
        "cta-banner-01",
        "contact-details-01",
        "footer-simple-01"
      ]
    },
    {
      "id": "studio-rijschool-zumrut-nextjs",
      "title": "Rijschool Zumrut",
      "collection": "landing",
      "category": "landing-page",
      "pageType": "landing",
      "style": [
        "modern",
        "bold"
      ],
      "industry": [
        "education",
        "local"
      ],
      "motionType": [
        "entrance",
        "scroll-reveal"
      ],
      "complexity": "moderate",
      "mobileSafe": true,
      "performanceClass": "B",
      "previewImage": "",
      "previewVideo": "",
      "islandReady": false,
      "isFree": true,
      "sourcePrompt": "Rebuild a full marketing landing page in the spirit of Studio reference “Rijschool Zumrut” (rijschool-zumrut-nextjs).\nWhole-page layout and hierarchy only — use platform blocks and theme tokens.\nDo not copy React/Next/Vue source, Tailwind class strings, or third-party assets. No external URLs.\n\nDriving-school marketing site: confident hero, packages/features, social proof, FAQ, enrolment CTA.\n\nSuggested section order (roles → platform blocks):\n1. header\n2. hero\n3. features\n4. testimonials\n5. pricing\n6. faq\n7. cta\n8. contact\n9. footer\n\nKeep one job per band, strong brand hierarchy in the first viewport, and a clear closing conversion.",
      "blockRecipe": [
        "header-liquid-glass-01",
        "hero-asymmetric-01",
        "features-bento-grid-01",
        "testimonials-card-stack-01",
        "pricing-toggle-01",
        "faq-reveal-accordion-01",
        "cta-animated-border-01",
        "contact-details-01",
        "footer-simple-01"
      ]
    },
    {
      "id": "studio-mc-agent-landing-page",
      "title": "MC Agent Landing",
      "collection": "saas",
      "category": "landing-page",
      "pageType": "landing",
      "style": [
        "modern",
        "minimal"
      ],
      "industry": [
        "saas",
        "*"
      ],
      "motionType": [
        "entrance",
        "scroll-reveal"
      ],
      "complexity": "moderate",
      "mobileSafe": true,
      "performanceClass": "B",
      "previewImage": "",
      "previewVideo": "",
      "islandReady": false,
      "isFree": true,
      "sourcePrompt": "Rebuild a full marketing landing page in the spirit of Studio reference “MC Agent Landing” (mc-agent-landing-page).\nWhole-page layout and hierarchy only — use platform blocks and theme tokens.\nDo not copy React/Next/Vue source, Tailwind class strings, or third-party assets. No external URLs.\n\nProduct landing: nav, hero, feature grid, showcase, testimonials, closing CTA, footer.\n\nSuggested section order (roles → platform blocks):\n1. header\n2. hero\n3. features\n4. gallery\n5. cta\n6. footer\n\nKeep one job per band, strong brand hierarchy in the first viewport, and a clear closing conversion.",
      "blockRecipe": [
        "header-liquid-glass-01",
        "hero-cover-statement-01",
        "features-grid-01",
        "gallery-compare-slider-01",
        "cta-animated-border-01",
        "footer-simple-01"
      ]
    },
    {
      "id": "studio-essmarketing-v0",
      "title": "ESS Marketing",
      "collection": "agency",
      "category": "landing-page",
      "pageType": "landing",
      "style": [
        "modern",
        "premium"
      ],
      "industry": [
        "agency",
        "*"
      ],
      "motionType": [
        "entrance",
        "scroll-reveal"
      ],
      "complexity": "moderate",
      "mobileSafe": true,
      "performanceClass": "B",
      "previewImage": "",
      "previewVideo": "",
      "islandReady": false,
      "isFree": true,
      "sourcePrompt": "Rebuild a full marketing landing page in the spirit of Studio reference “ESS Marketing” (essmarketing-v0).\nWhole-page layout and hierarchy only — use platform blocks and theme tokens.\nDo not copy React/Next/Vue source, Tailwind class strings, or third-party assets. No external URLs.\n\nAgency marketing homepage: framed hero, trust/services bento, featured cases, conversion close.\n\nSuggested section order (roles → platform blocks):\n1. hero\n2. features\n3. about\n4. gallery\n5. cta\n\nKeep one job per band, strong brand hierarchy in the first viewport, and a clear closing conversion.",
      "blockRecipe": [
        "hero-agency-proof-01",
        "features-bento-grid-01",
        "about-scroll-story-01",
        "gallery-tilt-cards-01",
        "cta-animated-border-01"
      ]
    },
    {
      "id": "studio-maanenzonwebsite",
      "title": "Maan & Zon Thuiszorg",
      "collection": "landing",
      "category": "landing-page",
      "pageType": "landing",
      "style": [
        "minimal",
        "modern"
      ],
      "industry": [
        "healthcare",
        "local"
      ],
      "motionType": [
        "entrance",
        "scroll-reveal"
      ],
      "complexity": "moderate",
      "mobileSafe": true,
      "performanceClass": "B",
      "previewImage": "",
      "previewVideo": "",
      "islandReady": false,
      "isFree": true,
      "sourcePrompt": "Rebuild a full marketing landing page in the spirit of Studio reference “Maan & Zon Thuiszorg” (maanenzonwebsite).\nWhole-page layout and hierarchy only — use platform blocks and theme tokens.\nDo not copy React/Next/Vue source, Tailwind class strings, or third-party assets. No external URLs.\n\nHome-care service site: banner hero, services, why-us, team, testimonials, contact.\n\nSuggested section order (roles → platform blocks):\n1. hero\n2. features\n3. about\n4. stats\n5. testimonials\n6. cta\n\nKeep one job per band, strong brand hierarchy in the first viewport, and a clear closing conversion.",
      "blockRecipe": [
        "hero-cover-statement-01",
        "features-grid-01",
        "about-scroll-story-01",
        "stats-counter-01",
        "testimonials-card-stack-01",
        "cta-animated-border-01"
      ]
    }
  ]
}
