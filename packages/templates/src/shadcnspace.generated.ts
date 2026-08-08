/**
 * GENERATED — do not edit by hand.
 *
 * Produced by `packages/templates/scripts/import-shadcnspace.mjs` from the
 * Shadcn Space free block library. Metadata + platform block recipes only.
 * No third-party asset URLs or component source (ADR-0003).
 *
 * Regenerate with: pnpm --filter @platform/templates import:shadcnspace
 */
import type { TemplateCatalog } from '@platform/schemas'

export const SHADCNSPACE_CATALOG: TemplateCatalog = {
  "version": 1,
  "generatedAt": "2026-08-08T12:36:15.999Z",
  "source": "Shadcn Space free blocks (MIT). Metadata + platform block recipes only — no React/TSX or CDN URLs (ADR-0003).",
  "collections": [
    {
      "id": "hero",
      "label": "Hero sections",
      "description": "The first screen: one statement, one action.",
      "count": 3
    },
    {
      "id": "saas",
      "label": "SaaS & product",
      "description": "Product-led pages: dashboards, plans, feature proof.",
      "count": 16
    },
    {
      "id": "agency",
      "label": "Agency & portfolio",
      "description": "Studio and case-study work where the craft is the pitch.",
      "count": 2
    },
    {
      "id": "ecommerce",
      "label": "Commerce",
      "description": "Storefront-shaped pages: catalogue, product, category.",
      "count": 5
    },
    {
      "id": "features",
      "label": "Features & benefits",
      "description": "Explaining what the thing does, in bands.",
      "count": 5
    },
    {
      "id": "conversion",
      "label": "Conversion",
      "description": "Calls to action, pricing, sign-up and contact.",
      "count": 8
    },
    {
      "id": "proof",
      "label": "Social proof",
      "description": "Testimonials, ratings and numbers.",
      "count": 5
    },
    {
      "id": "story",
      "label": "Story & content",
      "description": "About, editorial, FAQ — the reading parts.",
      "count": 8
    },
    {
      "id": "interactive",
      "label": "Interactive",
      "description": "Carousels, tabs, marquees and cards that respond.",
      "count": 2
    },
    {
      "id": "footer",
      "label": "Footers",
      "description": "The last band: navigation, legal, contact.",
      "count": 2
    },
    {
      "id": "utility",
      "label": "Utility",
      "description": "Error pages and the small necessary screens.",
      "count": 15
    }
  ],
  "templates": [
    {
      "id": "shadcnspace-about-us-section-01",
      "title": "About Us 01 - Impact Metrics",
      "collection": "story",
      "category": "about-us-section",
      "pageType": "section",
      "style": [
        "bold"
      ],
      "industry": [
        "agency"
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
      "sourcePrompt": "Rebuild a marketing section in the spirit of Shadcn Space “About Us 01 - Impact Metrics”.\n\nA bold about us section combining value pillars, headline messaging, and performance counters, perfect for agencies or studios to highlight expertise, achievements, and credibility at a glance.\n\nFamily: about-us-section. Layout and hierarchy only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs.",
      "blockRecipe": [
        "about-scroll-story-01"
      ]
    },
    {
      "id": "shadcnspace-bento-grid-01",
      "title": "Bento Grid 01 - Customer Testimonials",
      "collection": "features",
      "category": "bento-grid",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
        "ecommerce"
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
      "sourcePrompt": "Rebuild a marketing section in the spirit of Shadcn Space “Bento Grid 01 - Customer Testimonials”.\n\nDiscover authentic feedback from satisfied customers who trust our components to build faster, streamline development workflows, and confidently launch scalable, production-ready applications.\n\nFamily: bento-grid. Layout and hierarchy only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs.",
      "blockRecipe": [
        "features-grid-01"
      ]
    },
    {
      "id": "shadcnspace-bio-link-01",
      "title": "Bio Link 01 - Founder Bio Link",
      "collection": "agency",
      "category": "bio-link",
      "pageType": "section",
      "style": [
        "minimal"
      ],
      "industry": [
        "ecommerce"
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
      "sourcePrompt": "Rebuild a marketing section in the spirit of Shadcn Space “Bio Link 01 - Founder Bio Link”.\n\nA clean founder-focused bio links layout with profile image, quick access buttons, social links, and CTA section, perfect for showcasing products and updates.\n\nFamily: bio-link. Layout and hierarchy only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs.",
      "blockRecipe": [
        "content-richtext-01"
      ]
    },
    {
      "id": "shadcnspace-blog-01",
      "title": "Blog 01 - Latest Blog & News Grid",
      "collection": "story",
      "category": "blog",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
        "agency",
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
      "sourcePrompt": "Rebuild a marketing section in the spirit of Shadcn Space “Blog 01 - Latest Blog & News Grid”.\n\nA modern blog section with featured posts, large thumbnails, publish dates, and headlines, ideal for sharing agency updates, design insights, and thought leadership to keep visitors engaged.\n\nFamily: blog. Layout and hierarchy only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs.",
      "blockRecipe": [
        "blog-card-grid-01"
      ]
    },
    {
      "id": "shadcnspace-chart-01",
      "title": "Chart 01 - Sales Performance Bar Chart",
      "collection": "saas",
      "category": "chart",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
        "saas",
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
      "sourcePrompt": "Rebuild a marketing section in the spirit of Shadcn Space “Chart 01 - Sales Performance Bar Chart”.\n\nAn interactive stacked bar chart displaying monthly earnings, profit, and expenses, ideal for admin dashboards to visualize financial trends, track growth, and support data-driven business decisions.\n\nFamily: chart. Layout and hierarchy only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs.",
      "blockRecipe": []
    },
    {
      "id": "shadcnspace-chart-02",
      "title": "Chart 02 - Earnings Pie Chart - Donut with Text",
      "collection": "saas",
      "category": "chart",
      "pageType": "section",
      "style": [
        "minimal"
      ],
      "industry": [
        "saas",
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
      "sourcePrompt": "Rebuild a marketing section in the spirit of Shadcn Space “Chart 02 - Earnings Pie Chart - Donut with Text”.\n\nA clean donut chart widget summarizing total earnings with source-wise breakdown, perfect for admin dashboards to compare revenue streams, monitor growth, and highlight performance insights.\n\nFamily: chart. Layout and hierarchy only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs.",
      "blockRecipe": []
    },
    {
      "id": "shadcnspace-chat-application-01",
      "title": "Chat 01 - Modern Chat User Interface",
      "collection": "saas",
      "category": "chat-application",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
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
      "sourcePrompt": "Rebuild a marketing section in the spirit of Shadcn Space “Chat 01 - Modern Chat User Interface”.\n\nA full-featured chat application shell with a searchable conversation list, message thread view, media and attachment sidebar, and a message composer, ideal for building messaging and support applications.\n\nFamily: chat-application. Layout and hierarchy only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs.",
      "blockRecipe": []
    },
    {
      "id": "shadcnspace-checkout-03",
      "title": "Checkout 03 - Tabbed Billing Checkout",
      "collection": "ecommerce",
      "category": "checkout",
      "pageType": "section",
      "style": [
        "minimal"
      ],
      "industry": [
        "saas",
        "ecommerce"
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
      "sourcePrompt": "Rebuild a marketing section in the spirit of Shadcn Space “Checkout 03 - Tabbed Billing Checkout”.\n\nA clean checkout interface with tab-based payment selection, subscription pricing details, and streamlined billing inputs for smooth transaction flows.\n\nFamily: checkout. Layout and hierarchy only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs.",
      "blockRecipe": []
    },
    {
      "id": "shadcnspace-contact-01",
      "title": "Contact 01 - Project Inquiry Contact Form",
      "collection": "conversion",
      "category": "contact",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
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
      "sourcePrompt": "Rebuild a marketing section in the spirit of Shadcn Space “Contact 01 - Project Inquiry Contact Form”.\n\nA conversion focused contact section with project inquiry form, contact details, and trust badges, ideal for agencies or freelancers to capture qualified leads and start meaningful client conversations.\n\nFamily: contact. Layout and hierarchy only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs.",
      "blockRecipe": [
        "contact-details-01"
      ]
    },
    {
      "id": "shadcnspace-cookie-consent-01",
      "title": "Cookie Consent 01 - Footer Consent Bar",
      "collection": "utility",
      "category": "cookie-consent",
      "pageType": "section",
      "style": [
        "minimal"
      ],
      "industry": [
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
      "sourcePrompt": "Rebuild a marketing section in the spirit of Shadcn Space “Cookie Consent 01 - Footer Consent Bar”.\n\nA minimal floating cookie consent banner with clear messaging, preference controls, and quick accept or reject actions.\n\nFamily: cookie-consent. Layout and hierarchy only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs.",
      "blockRecipe": []
    },
    {
      "id": "shadcnspace-cta-01",
      "title": "CTA 01 - Gradient Call-to-Action Banner",
      "collection": "conversion",
      "category": "cta",
      "pageType": "section",
      "style": [
        "minimal",
        "premium"
      ],
      "industry": [
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
      "sourcePrompt": "Rebuild a marketing section in the spirit of Shadcn Space “CTA 01 - Gradient Call-to-Action Banner”.\n\nA minimal full width CTA section with soft gradient background, persuasive headline, and primary action button, perfect for converting visitors into leads at the end of any page.\n\nFamily: cta. Layout and hierarchy only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs.",
      "blockRecipe": [
        "cta-animated-border-01"
      ]
    },
    {
      "id": "shadcnspace-cta-02",
      "title": "CTA 02 - Video Background CTA",
      "collection": "conversion",
      "category": "cta",
      "pageType": "section",
      "style": [
        "premium",
        "bold"
      ],
      "industry": [
        "*"
      ],
      "motionType": [
        "marquee",
        "text-effect"
      ],
      "complexity": "moderate",
      "mobileSafe": true,
      "performanceClass": "B",
      "previewImage": "",
      "previewVideo": "",
      "islandReady": false,
      "isFree": true,
      "sourcePrompt": "Rebuild a marketing section in the spirit of Shadcn Space “CTA 02 - Video Background CTA”.\n\nA high impact call-to-action section with autoplay background video, bold overlay headline, primary button, and rotating ticker text, perfect for luxury brands or real estate to capture attention instantly.\n\nFamily: cta. Layout and hierarchy only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs.",
      "blockRecipe": [
        "cta-animated-border-01"
      ]
    },
    {
      "id": "shadcnspace-dashboard-shell-01",
      "title": "Dashboard Shell 01 - Analytics Dashboard Shell",
      "collection": "saas",
      "category": "dashboard-shell",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
        "saas",
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
      "sourcePrompt": "Rebuild a marketing section in the spirit of Shadcn Space “Dashboard Shell 01 - Analytics Dashboard Shell”.\n\nA full featured admin dashboard layout with sidebar navigation, KPI cards, charts, tables, and widgets, perfect for building modern SaaS, CRM, or business analytics applications.\n\nFamily: dashboard-shell. Layout and hierarchy only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs.",
      "blockRecipe": []
    },
    {
      "id": "shadcnspace-datatable-01",
      "title": "Datatable 01 - Exportable Datatable",
      "collection": "saas",
      "category": "datatable",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
        "saas"
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
      "sourcePrompt": "Rebuild a marketing section in the spirit of Shadcn Space “Datatable 01 - Exportable Datatable”.\n\nA full-featured datatable/tanstack table with built-in one-click CSV export, letting users instantly download the current view as a spreadsheet — ideal for reporting dashboards and data-heavy admin panels.\n\nFamily: datatable. Layout and hierarchy only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs.",
      "blockRecipe": []
    },
    {
      "id": "shadcnspace-dialog-block-01",
      "title": "Dialog 01 - Newsletter Subscription Dialog",
      "collection": "utility",
      "category": "dialog-block",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
        "saas"
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
      "sourcePrompt": "Rebuild a marketing section in the spirit of Shadcn Space “Dialog 01 - Newsletter Subscription Dialog”.\n\nA modern modal popup for capturing newsletter signups with a friendly hero image, email field, opt-out checkbox, and clear call-to-action to boost conversions.\n\nFamily: dialog-block. Layout and hierarchy only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs.",
      "blockRecipe": []
    },
    {
      "id": "shadcnspace-download-01",
      "title": "Download 01 - Multi-Platform Download Grid",
      "collection": "conversion",
      "category": "download",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
        "saas"
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
      "sourcePrompt": "Rebuild a marketing section in the spirit of Shadcn Space “Download 01 - Multi-Platform Download Grid”.\n\nA structured platform showcase featuring dedicated download cards for every device, helping users quickly access applications and extensions.\n\nFamily: download. Layout and hierarchy only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs.",
      "blockRecipe": [
        "cta-animated-border-01"
      ]
    },
    {
      "id": "shadcnspace-empty-state-01",
      "title": "Empty State 01 - No Projects Yet",
      "collection": "utility",
      "category": "empty-state",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
        "saas"
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
      "sourcePrompt": "Rebuild a marketing section in the spirit of Shadcn Space “Empty State 01 - No Projects Yet”.\n\nA compact, bordered card empty state with a folder icon, heading, description, and a single primary call-to-action, ideal for project lists and dashboards before anything has been created.\n\nFamily: empty-state. Layout and hierarchy only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs.",
      "blockRecipe": []
    },
    {
      "id": "shadcnspace-empty-state-02",
      "title": "Empty State 02 - Invite Your Team",
      "collection": "utility",
      "category": "empty-state",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
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
      "sourcePrompt": "Rebuild a marketing section in the spirit of Shadcn Space “Empty State 02 - Invite Your Team”.\n\nA centered empty state with a custom illustration, heading, description, and two calls-to-action for inviting teammates or copying a shareable invite link, complete with an animated copy confirmation.\n\nFamily: empty-state. Layout and hierarchy only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs.",
      "blockRecipe": []
    },
    {
      "id": "shadcnspace-empty-state-06",
      "title": "Empty State 06 - Chart Data Empty State",
      "collection": "utility",
      "category": "empty-state",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
        "saas",
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
      "sourcePrompt": "Rebuild a marketing section in the spirit of Shadcn Space “Empty State 06 - Chart Data Empty State”.\n\nA simple card-based empty state with a chart-themed icon, title, description, and primary connection CTA button, perfect for dashboards before metric data sources are connected.\n\nFamily: empty-state. Layout and hierarchy only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs.",
      "blockRecipe": []
    },
    {
      "id": "shadcnspace-faq-01",
      "title": "FAQ 01 - Expandable FAQ Section",
      "collection": "story",
      "category": "faq",
      "pageType": "section",
      "style": [
        "minimal",
        "modern"
      ],
      "industry": [
        "saas"
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
      "sourcePrompt": "Rebuild a marketing section in the spirit of Shadcn Space “FAQ 01 - Expandable FAQ Section”.\n\nA clean accordion style FAQ section with expandable answers, ideal for agencies or SaaS sites to address common questions, reduce friction, and improve user confidence before conversion.\n\nFamily: faq. Layout and hierarchy only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs.",
      "blockRecipe": [
        "faq-accordion-01"
      ]
    },
    {
      "id": "shadcnspace-feature-01",
      "title": "Feature 01 - Feature with Testimonials",
      "collection": "features",
      "category": "feature",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
        "saas",
        "ecommerce"
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
      "sourcePrompt": "Rebuild a marketing section in the spirit of Shadcn Space “Feature 01 - Feature with Testimonials”.\n\nA trust focused feature section combining a highlighted customer testimonial with supporting benefit cards, perfect for product or SaaS pages to showcase social proof and reinforce key advantages.\n\nFamily: feature. Layout and hierarchy only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs.",
      "blockRecipe": [
        "features-grid-01"
      ]
    },
    {
      "id": "shadcnspace-feature-02",
      "title": "Feature 02 - Three Columns Feature with Icons",
      "collection": "features",
      "category": "feature",
      "pageType": "section",
      "style": [
        "minimal",
        "modern"
      ],
      "industry": [
        "saas",
        "ecommerce"
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
      "sourcePrompt": "Rebuild a marketing section in the spirit of Shadcn Space “Feature 02 - Three Columns Feature with Icons”.\n\nA clean three card feature grid with icons and concise copy, built for product or SaaS pages to communicate core benefits clearly while maintaining a developer friendly, scalable layout.\n\nFamily: feature. Layout and hierarchy only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs.",
      "blockRecipe": [
        "features-grid-01"
      ]
    },
    {
      "id": "shadcnspace-footer-01",
      "title": "Footer 01 - Agency Footer Layout",
      "collection": "footer",
      "category": "footer",
      "pageType": "section",
      "style": [
        "minimal",
        "modern"
      ],
      "industry": [
        "agency"
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
      "sourcePrompt": "Rebuild a marketing section in the spirit of Shadcn Space “Footer 01 - Agency Footer Layout”.\n\nA clean multi column footer with brand summary, sitemap links, legal pages, contact details, and social icons, perfect for agencies to provide clarity, trust, and easy navigation.\n\nFamily: footer. Layout and hierarchy only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs.",
      "blockRecipe": [
        "footer-simple-01"
      ]
    },
    {
      "id": "shadcnspace-footer-02",
      "title": "Footer 02 - Dark Conversion Footer",
      "collection": "footer",
      "category": "footer",
      "pageType": "section",
      "style": [
        "bold",
        "modern"
      ],
      "industry": [
        "saas"
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
      "sourcePrompt": "Rebuild a marketing section in the spirit of Shadcn Space “Footer 02 - Dark Conversion Footer”.\n\nA bold dark themed footer with newsletter signup, strong contact CTA, navigation links, and legal pages, ideal for real estate or SaaS websites to drive engagement at the page end.\n\nFamily: footer. Layout and hierarchy only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs.",
      "blockRecipe": [
        "footer-simple-01"
      ]
    },
    {
      "id": "shadcnspace-forgot-password-01",
      "title": "Forgot Password 01 - Forgot Your Password Page",
      "collection": "utility",
      "category": "forgot-password",
      "pageType": "section",
      "style": [
        "minimal"
      ],
      "industry": [
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
      "sourcePrompt": "Rebuild a marketing section in the spirit of Shadcn Space “Forgot Password 01 - Forgot Your Password Page”.\n\nA minimal password recovery page that lets users request a secure reset link via email, helping reduce friction and support issues in authentication flows.\n\nFamily: forgot-password. Layout and hierarchy only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs.",
      "blockRecipe": []
    },
    {
      "id": "shadcnspace-forms-01",
      "title": "Forms 01 - Edit Profile Form",
      "collection": "conversion",
      "category": "forms",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
        "saas"
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
      "sourcePrompt": "Rebuild a marketing section in the spirit of Shadcn Space “Forms 01 - Edit Profile Form”.\n\nA user-friendly profile editing form with avatar upload, personal details, privacy controls, and action toggles, perfect for managing account information inside modern SaaS dashboards.\n\nFamily: forms. Layout and hierarchy only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs.",
      "blockRecipe": [
        "contact-details-01"
      ]
    },
    {
      "id": "shadcnspace-gallery-01",
      "title": "Gallery 01 - Destination Gallery",
      "collection": "interactive",
      "category": "gallery",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
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
      "sourcePrompt": "Rebuild a marketing section in the spirit of Shadcn Space “Gallery 01 - Destination Gallery”.\n\nDiscover breathtaking locations and unforgettable experiences, from scenic hikes to coastal escapes—carefully curated to inspire your next journey and help you explore with confidence.\n\nFamily: gallery. Layout and hierarchy only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs.",
      "blockRecipe": [
        "gallery-compare-slider-01"
      ]
    },
    {
      "id": "shadcnspace-hero-01",
      "title": "Hero 01 - Agency Hero Section",
      "collection": "hero",
      "category": "hero",
      "pageType": "section",
      "style": [
        "modern",
        "minimal",
        "premium"
      ],
      "industry": [
        "saas",
        "creative",
        "agency"
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
      "sourcePrompt": "Rebuild a marketing section in the spirit of Shadcn Space “Hero 01 - Agency Hero Section”.\n\nClean agency hero section designed for SaaS and startup websites, featuring bold headline, gradient background, trust badges, client logos, and high converting CTAs for lead generation.\n\nFamily: hero. Layout and hierarchy only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs.",
      "blockRecipe": [
        "hero-cover-statement-01"
      ]
    },
    {
      "id": "shadcnspace-hero-02",
      "title": "Hero 02 - Real Estate Hero Section",
      "collection": "hero",
      "category": "hero",
      "pageType": "section",
      "style": [
        "premium"
      ],
      "industry": [
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
      "sourcePrompt": "Rebuild a marketing section in the spirit of Shadcn Space “Hero 02 - Real Estate Hero Section”.\n\nLuxury real estate hero section crafted for property listings, featuring immersive imagery, location highlight, key amenities, pricing details, and prominent Schedule a tour CTA for faster inquiries.\n\nFamily: hero. Layout and hierarchy only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs.",
      "blockRecipe": [
        "hero-centered-01"
      ]
    },
    {
      "id": "shadcnspace-hero-03",
      "title": "Hero 03 - Digital Agency Hero Section",
      "collection": "hero",
      "category": "hero",
      "pageType": "section",
      "style": [
        "editorial",
        "bold",
        "modern"
      ],
      "industry": [
        "agency"
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
      "sourcePrompt": "Rebuild a marketing section in the spirit of Shadcn Space “Hero 03 - Digital Agency Hero Section”.\n\nHigh-impact digital agency hero section with cinematic background video, bold typography, brand driven headline, and clear CTA, perfect for creative studios and performance-focused marketing websites.\n\nFamily: hero. Layout and hierarchy only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs.",
      "blockRecipe": [
        "hero-asymmetric-01"
      ]
    },
    {
      "id": "shadcnspace-kanban-application-01",
      "title": "Kanban 01 - Simple Task Board",
      "collection": "saas",
      "category": "kanban-application",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
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
      "sourcePrompt": "Rebuild a marketing section in the spirit of Shadcn Space “Kanban 01 - Simple Task Board”.\n\nA complete drag-and-drop kanban board with To Do, In Progress, and Done columns, task creation, deletion, and reordering across columns.\n\nFamily: kanban-application. Layout and hierarchy only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs.",
      "blockRecipe": []
    },
    {
      "id": "shadcnspace-login-01",
      "title": "Login 01 - Developer-Friendly Login Page",
      "collection": "utility",
      "category": "login",
      "pageType": "section",
      "style": [
        "modern",
        "minimal"
      ],
      "industry": [
        "saas",
        "ecommerce"
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
      "sourcePrompt": "Rebuild a marketing section in the spirit of Shadcn Space “Login 01 - Developer-Friendly Login Page”.\n\nA clean, secure login page with Google and GitHub authentication, remember-me support, and password recovery, built for modern SaaS products using shadcn UI.\n\nFamily: login. Layout and hierarchy only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs.",
      "blockRecipe": []
    },
    {
      "id": "shadcnspace-logo-cloud-01",
      "title": "Logo Cloud 01 - Trusted by Leading Companies",
      "collection": "proof",
      "category": "logo-cloud",
      "pageType": "section",
      "style": [
        "modern",
        "minimal",
        "bold"
      ],
      "industry": [
        "creative",
        "saas",
        "ecommerce"
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
      "sourcePrompt": "Rebuild a marketing section in the spirit of Shadcn Space “Logo Cloud 01 - Trusted by Leading Companies”.\n\nA clean logo collection highlighting affiliated brands and integrations, designed to build credibility, reinforce partnerships, and visually communicate trust within modern product or SaaS interfaces.\n\nFamily: logo-cloud. Layout and hierarchy only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs.",
      "blockRecipe": [
        "logos-orbit-01"
      ]
    },
    {
      "id": "shadcnspace-navbar-01",
      "title": "Navbar 01 - Minimal Agency Navbar",
      "collection": "interactive",
      "category": "navbar",
      "pageType": "section",
      "style": [
        "minimal",
        "modern"
      ],
      "industry": [
        "saas",
        "agency"
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
      "sourcePrompt": "Rebuild a marketing section in the spirit of Shadcn Space “Navbar 01 - Minimal Agency Navbar”.\n\nA clean top navigation bar with logo, page links, and standout CTA button, ideal for agency or SaaS websites to guide users and drive collaboration effortlessly.\n\nFamily: navbar. Layout and hierarchy only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs.",
      "blockRecipe": [
        "header-simple-01"
      ]
    },
    {
      "id": "shadcnspace-newsletter-01",
      "title": "Newsletter 01 - Newsletter Subscription CTA",
      "collection": "conversion",
      "category": "newsletter",
      "pageType": "section",
      "style": [
        "minimal",
        "bold"
      ],
      "industry": [
        "saas"
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
      "sourcePrompt": "Rebuild a marketing section in the spirit of Shadcn Space “Newsletter 01 - Newsletter Subscription CTA”.\n\nA minimal newsletter signup section with bold headline, social-proof subtext, and inline email form, ideal for capturing leads and growing your audience with a frictionless experience.\n\nFamily: newsletter. Layout and hierarchy only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs.",
      "blockRecipe": [
        "cta-banner-01"
      ]
    },
    {
      "id": "shadcnspace-portfolio-01",
      "title": "Portfolio 01 - Clean Portfolio Grid",
      "collection": "agency",
      "category": "portfolio",
      "pageType": "section",
      "style": [
        "minimal",
        "modern"
      ],
      "industry": [
        "portfolio",
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
      "sourcePrompt": "Rebuild a marketing section in the spirit of Shadcn Space “Portfolio 01 - Clean Portfolio Grid”.\n\nA modern portfolio section displaying featured projects with tags, visuals, and categories, ideal for agencies or freelancers to showcase real-world transformations, expertise, and design impact.\n\nFamily: portfolio. Layout and hierarchy only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs.",
      "blockRecipe": [
        "gallery-compare-slider-01"
      ]
    },
    {
      "id": "shadcnspace-pricing-01",
      "title": "Pricing 01 - Startup Pricing Plans",
      "collection": "conversion",
      "category": "pricing",
      "pageType": "section",
      "style": [
        "modern",
        "minimal"
      ],
      "industry": [
        "saas",
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
      "sourcePrompt": "Rebuild a marketing section in the spirit of Shadcn Space “Pricing 01 - Startup Pricing Plans”.\n\nA clean two tier pricing section with feature comparison, highlighted plans, and strong CTAs, suited for agencies, Startups & SaaS to convert visitors by clearly presenting value and monthly subscription options.\n\nFamily: pricing. Layout and hierarchy only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs.",
      "blockRecipe": [
        "pricing-toggle-01"
      ]
    },
    {
      "id": "shadcnspace-pricing-02",
      "title": "Pricing 02 - Scalable Pricing Table",
      "collection": "conversion",
      "category": "pricing",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
        "saas"
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
      "sourcePrompt": "Rebuild a marketing section in the spirit of Shadcn Space “Pricing 02 - Scalable Pricing Table”.\n\nA three tier pricing layout with a highlighted recommended plan, feature checklists, and clear CTAs, perfect for any website having pricing section to guide users toward the most valuable subscription option.\n\nFamily: pricing. Layout and hierarchy only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs.",
      "blockRecipe": [
        "pricing-toggle-01"
      ]
    },
    {
      "id": "shadcnspace-product-category-02",
      "title": "Product Category 02 - Horizontal List",
      "collection": "ecommerce",
      "category": "product-category",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
        "ecommerce"
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
      "sourcePrompt": "Rebuild a marketing section in the spirit of Shadcn Space “Product Category 02 - Horizontal List”.\n\nA horizontal category list displaying product groups with icons, item counts, and quick links, enabling users to scan categories quickly and navigate products efficiently.\n\nFamily: product-category. Layout and hierarchy only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs.",
      "blockRecipe": [
        "gallery-compare-slider-01"
      ]
    },
    {
      "id": "shadcnspace-product-category-04",
      "title": "Product Category 04 - Image Based",
      "collection": "ecommerce",
      "category": "product-category",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
        "ecommerce"
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
      "sourcePrompt": "Rebuild a marketing section in the spirit of Shadcn Space “Product Category 04 - Image Based”.\n\nA product category section built with image-driven cards and filters, enabling faster discovery through visuals and improving navigation across different product groups.\n\nFamily: product-category. Layout and hierarchy only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs.",
      "blockRecipe": [
        "gallery-compare-slider-01"
      ]
    },
    {
      "id": "shadcnspace-product-listing-01",
      "title": "Product Listing 01 - Multi Column Grid",
      "collection": "ecommerce",
      "category": "product-listing",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
        "ecommerce"
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
      "sourcePrompt": "Rebuild a marketing section in the spirit of Shadcn Space “Product Listing 01 - Multi Column Grid”.\n\nA multi-column layout featuring product cards with images, reviews, and pricing details, helping users scan, compare, and select products quickly.\n\nFamily: product-listing. Layout and hierarchy only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs.",
      "blockRecipe": [
        "gallery-compare-slider-01"
      ]
    },
    {
      "id": "shadcnspace-product-overview-04",
      "title": "Product Overview 04 - For Skincare Product",
      "collection": "ecommerce",
      "category": "product-overview",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
        "ecommerce"
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
      "sourcePrompt": "Rebuild a marketing section in the spirit of Shadcn Space “Product Overview 04 - For Skincare Product”.\n\nA structured skincare layout featuring image grid previews, descriptive content, pricing details, size selection, and collapsible sections for ingredients, shipping, and product overview information.\n\nFamily: product-overview. Layout and hierarchy only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs.",
      "blockRecipe": [
        "features-grid-01"
      ]
    },
    {
      "id": "shadcnspace-receipt-01",
      "title": "receipt 01 - Colorful Order Confirmation Receipt",
      "collection": "utility",
      "category": "receipt",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
        "ecommerce"
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
      "sourcePrompt": "Rebuild a marketing section in the spirit of Shadcn Space “receipt 01 - Colorful Order Confirmation Receipt”.\n\nA detailed order confirmation layout with product cards, order status, payment summary, delivery and billing addresses, discounts, taxes, final total, and estimated arrival details for ecommerce purchases.\n\nFamily: receipt. Layout and hierarchy only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs.",
      "blockRecipe": []
    },
    {
      "id": "shadcnspace-receipt-02",
      "title": "receipt 02 - Order Tracking Receipt",
      "collection": "utility",
      "category": "receipt",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
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
      "sourcePrompt": "Rebuild a marketing section in the spirit of Shadcn Space “receipt 02 - Order Tracking Receipt”.\n\nA split-screen order confirmation receipt with parcel contents, shipping and billing details on one side, and a receipt overview with shipping journal and tracking actions on the other.\n\nFamily: receipt. Layout and hierarchy only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs.",
      "blockRecipe": []
    },
    {
      "id": "shadcnspace-receipt-03",
      "title": "receipt 03 - Compact Printable Receipt",
      "collection": "utility",
      "category": "receipt",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
        "ecommerce",
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
      "sourcePrompt": "Rebuild a marketing section in the spirit of Shadcn Space “receipt 03 - Compact Printable Receipt”.\n\nA compact receipt design with order summary, product details, subtotal, shipping, tax, total amount, shipping address, payment information, tracking number, and shipment tracking for quick reference.\n\nFamily: receipt. Layout and hierarchy only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs.",
      "blockRecipe": []
    },
    {
      "id": "shadcnspace-receipt-04",
      "title": "receipt 04 - Complete Order Status Receipt",
      "collection": "utility",
      "category": "receipt",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
        "ecommerce"
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
      "sourcePrompt": "Rebuild a marketing section in the spirit of Shadcn Space “receipt 04 - Complete Order Status Receipt”.\n\nA full order summary with payment status, order journey, shipment tracking, billing and shipping details, itemized products, totals, and actions for tracking, reordering, returns, and customer support.\n\nFamily: receipt. Layout and hierarchy only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs.",
      "blockRecipe": []
    },
    {
      "id": "shadcnspace-register-01",
      "title": "Register 01 - Simple & Secure Signup Page",
      "collection": "utility",
      "category": "register",
      "pageType": "section",
      "style": [
        "minimal",
        "modern"
      ],
      "industry": [
        "saas"
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
      "sourcePrompt": "Rebuild a marketing section in the spirit of Shadcn Space “Register 01 - Simple & Secure Signup Page”.\n\nA streamlined signup page with Google and GitHub authentication, clean form fields, and conversion-focused layout, perfect for SaaS onboarding built with shadcn UI.\n\nFamily: register. Layout and hierarchy only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs.",
      "blockRecipe": []
    },
    {
      "id": "shadcnspace-services-01",
      "title": "Services 01 - Creative Services Overview",
      "collection": "features",
      "category": "services",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
        "agency",
        "portfolio",
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
      "sourcePrompt": "Rebuild a marketing section in the spirit of Shadcn Space “Services 01 - Creative Services Overview”.\n\nA colorful services section with icon cards and dual CTAs, perfect for agencies to present core offerings, guide visitors to portfolios, and drive collaboration with clear next steps.\n\nFamily: services. Layout and hierarchy only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs.",
      "blockRecipe": [
        "features-grid-01"
      ]
    },
    {
      "id": "shadcnspace-services-02",
      "title": "Services 02 - Dark Services Animated Block",
      "collection": "features",
      "category": "services",
      "pageType": "section",
      "style": [
        "premium",
        "bold",
        "modern"
      ],
      "industry": [
        "agency",
        "local"
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
      "sourcePrompt": "Rebuild a marketing section in the spirit of Shadcn Space “Services 02 - Dark Services Animated Block”.\n\nA premium dark mode services section with interactive list, visual preview, and detailed descriptions, ideal for creative agencies to showcase capabilities while maintaining a bold, modern brand presence.\n\nFamily: services. Layout and hierarchy only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs.",
      "blockRecipe": [
        "features-bento-grid-01"
      ]
    },
    {
      "id": "shadcnspace-sidebar-01",
      "title": "Sidebar 01 - Admin Dashboard Sidebar",
      "collection": "saas",
      "category": "sidebar",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
        "saas"
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
      "sourcePrompt": "Rebuild a marketing section in the spirit of Shadcn Space “Sidebar 01 - Admin Dashboard Sidebar”.\n\nA collapsible sidebar navigation with grouped menus, icons, and upgrade CTA, perfect for admin dashboards to organize pages, widgets, and apps while keeping workflows fast and intuitive.\n\nFamily: sidebar. Layout and hierarchy only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs.",
      "blockRecipe": []
    },
    {
      "id": "shadcnspace-sidebar-06",
      "title": "Sidebar 06 - Card Layout Admin Dashboard Sidebar",
      "collection": "saas",
      "category": "sidebar",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
        "saas"
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
      "sourcePrompt": "Rebuild a marketing section in the spirit of Shadcn Space “Sidebar 06 - Card Layout Admin Dashboard Sidebar”.\n\nA responsive admin sidebar paired with a modern card-based dashboard layout. Features grouped navigation, icons, and collapsible menus, making it ideal for SaaS platforms, analytics dashboards, CRM systems, and enterprise applications.\n\nFamily: sidebar. Layout and hierarchy only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs.",
      "blockRecipe": []
    },
    {
      "id": "shadcnspace-statistics-01",
      "title": "Statistics 01 - KPI Summary Cards",
      "collection": "proof",
      "category": "statistics",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
        "saas"
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
      "sourcePrompt": "Rebuild a marketing section in the spirit of Shadcn Space “Statistics 01 - KPI Summary Cards”.\n\nA compact statistics section with KPI cards highlighting earnings, expenses, weekly sales, and orders, ideal for admin dashboards to surface key business metrics at a glance.\n\nFamily: statistics. Layout and hierarchy only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs.",
      "blockRecipe": [
        "stats-counter-01"
      ]
    },
    {
      "id": "shadcnspace-statistics-02",
      "title": "Statistics 02 - Business Metrics Bar",
      "collection": "proof",
      "category": "statistics",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
        "saas"
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
      "sourcePrompt": "Rebuild a marketing section in the spirit of Shadcn Space “Statistics 02 - Business Metrics Bar”.\n\nA horizontal KPI bar displaying orders, sales, profit, and expenses with weekly change indicators, ideal for dashboards to monitor short-term performance and trends at a glance.\n\nFamily: statistics. Layout and hierarchy only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs.",
      "blockRecipe": [
        "stats-counter-01"
      ]
    },
    {
      "id": "shadcnspace-table-01",
      "title": "Table 01 - Project Management Table",
      "collection": "utility",
      "category": "table",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
        "saas"
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
      "sourcePrompt": "Rebuild a marketing section in the spirit of Shadcn Space “Table 01 - Project Management Table”.\n\nA sortable projects table with manager, team avatars, progress indicators, search, and pagination, ideal for admin dashboards to track project status and streamline team workflows efficiently.\n\nFamily: table. Layout and hierarchy only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs.",
      "blockRecipe": []
    },
    {
      "id": "shadcnspace-team-01",
      "title": "Team 01 - Creative Team Showcase",
      "collection": "story",
      "category": "team",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
        "saas",
        "agency",
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
      "sourcePrompt": "Rebuild a marketing section in the spirit of Shadcn Space “Team 01 - Creative Team Showcase”.\n\nA vibrant team section featuring profile cards with roles and social links, perfect for agencies or startups to humanize their brand, highlight talent, and build authentic connections.\n\nFamily: team. Layout and hierarchy only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs.",
      "blockRecipe": [
        "about-scroll-story-01"
      ]
    },
    {
      "id": "shadcnspace-team-02",
      "title": "Team 02 - Modern Team Grid",
      "collection": "story",
      "category": "team",
      "pageType": "section",
      "style": [
        "modern",
        "minimal"
      ],
      "industry": [
        "saas"
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
      "sourcePrompt": "Rebuild a marketing section in the spirit of Shadcn Space “Team 02 - Modern Team Grid”.\n\nA clean team grid with large profile cards, roles, and social icons, ideal for agencies or SaaS companies to introduce key members and strengthen brand authenticity.\n\nFamily: team. Layout and hierarchy only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs.",
      "blockRecipe": [
        "about-scroll-story-01"
      ]
    },
    {
      "id": "shadcnspace-testimonial-01",
      "title": "Testimonial 01 - Bento Grid Testimonials",
      "collection": "proof",
      "category": "testimonial",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
        "agency",
        "ecommerce"
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
      "sourcePrompt": "Rebuild a marketing section in the spirit of Shadcn Space “Testimonial 01 - Bento Grid Testimonials”.\n\nA multi card testimonial section combining customer quotes, imagery, and performance stats, ideal for showcasing social proof, building trust, and reinforcing brand credibility across product or agency websites.\n\nFamily: testimonial. Layout and hierarchy only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs.",
      "blockRecipe": [
        "testimonials-card-stack-01"
      ]
    },
    {
      "id": "shadcnspace-testimonial-02",
      "title": "Testimonial 02 - Testimonial Slider Showcase",
      "collection": "proof",
      "category": "testimonial",
      "pageType": "section",
      "style": [
        "minimal"
      ],
      "industry": [
        "creative"
      ],
      "motionType": [
        "carousel"
      ],
      "complexity": "moderate",
      "mobileSafe": true,
      "performanceClass": "B",
      "previewImage": "",
      "previewVideo": "",
      "islandReady": false,
      "isFree": true,
      "sourcePrompt": "Rebuild a marketing section in the spirit of Shadcn Space “Testimonial 02 - Testimonial Slider Showcase”.\n\nA clean testimonial slider with customer photo, detailed quote, navigation controls, and partner logos—perfect for highlighting success stories and building instant trust on landing pages.\n\nFamily: testimonial. Layout and hierarchy only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs.",
      "blockRecipe": [
        "testimonials-grid-01"
      ]
    },
    {
      "id": "shadcnspace-timeline-01",
      "title": "Timeline 01 - Vertical Progress Timeline",
      "collection": "story",
      "category": "timeline",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
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
      "sourcePrompt": "Rebuild a marketing section in the spirit of Shadcn Space “Timeline 01 - Vertical Progress Timeline”.\n\nA modern two-column timeline featuring alternating content blocks, visual storytelling elements, and chronological progression—designed to highlight growth and achievements.\n\nFamily: timeline. Layout and hierarchy only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs.",
      "blockRecipe": [
        "content-text-generate-01"
      ]
    },
    {
      "id": "shadcnspace-timeline-02",
      "title": "Timeline 02 - Interactive Timeline",
      "collection": "story",
      "category": "timeline",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
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
      "sourcePrompt": "Rebuild a marketing section in the spirit of Shadcn Space “Timeline 02 - Interactive Timeline”.\n\nAn engaging timeline layout featuring key milestones, chronological progression, and supporting visuals, crafted to communicate company evolution effectively.\n\nFamily: timeline. Layout and hierarchy only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs.",
      "blockRecipe": [
        "content-text-generate-01"
      ]
    },
    {
      "id": "shadcnspace-timeline-03",
      "title": "Timeline 03 - Horizontal Journey Timeline",
      "collection": "story",
      "category": "timeline",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
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
      "sourcePrompt": "Rebuild a marketing section in the spirit of Shadcn Space “Timeline 03 - Horizontal Journey Timeline”.\n\nA visually structured timeline layout highlighting key milestones, supporting content, and rich imagery, helping users explore progress year by year.\n\nFamily: timeline. Layout and hierarchy only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs.",
      "blockRecipe": [
        "content-text-generate-01"
      ]
    },
    {
      "id": "shadcnspace-topbar-01",
      "title": "Topbar 01 - Simple Navigation Topbar",
      "collection": "saas",
      "category": "topbar",
      "pageType": "section",
      "style": [
        "minimal",
        "modern"
      ],
      "industry": [
        "saas"
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
      "sourcePrompt": "Rebuild a marketing section in the spirit of Shadcn Space “Topbar 01 - Simple Navigation Topbar”.\n\nClean navigation topbar with brand logo, navigation menu, notifications, language switcher, and user profile. Ideal for admin panels, SaaS platforms, internal tools, and business applications.\n\nFamily: topbar. Layout and hierarchy only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs.",
      "blockRecipe": []
    },
    {
      "id": "shadcnspace-topbar-02",
      "title": "Topbar 02 - Navigation Mega Menu Topbar",
      "collection": "saas",
      "category": "topbar",
      "pageType": "section",
      "style": [
        "minimal"
      ],
      "industry": [
        "saas",
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
      "sourcePrompt": "Rebuild a marketing section in the spirit of Shadcn Space “Topbar 02 - Navigation Mega Menu Topbar”.\n\nMulti level topbar with categorized navigation, quick access links, notifications, and user profile in a clean horizontal layout. Ideal for documentation sites, design systems, developer platforms, and large web applications.\n\nFamily: topbar. Layout and hierarchy only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs.",
      "blockRecipe": []
    },
    {
      "id": "shadcnspace-topbar-03",
      "title": "Topbar 03 - Login Action Topbar",
      "collection": "saas",
      "category": "topbar",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
        "saas",
        "ecommerce"
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
      "sourcePrompt": "Rebuild a marketing section in the spirit of Shadcn Space “Topbar 03 - Login Action Topbar”.\n\nNavigation topbar with primary links, login action, notifications, and user profile for quick access. Ideal for SaaS products, documentation portals, developer tools, and web applications.\n\nFamily: topbar. Layout and hierarchy only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs.",
      "blockRecipe": []
    },
    {
      "id": "shadcnspace-topbar-04",
      "title": "Topbar 04 - Centered Navigation Topbar",
      "collection": "saas",
      "category": "topbar",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
        "saas",
        "ecommerce"
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
      "sourcePrompt": "Rebuild a marketing section in the spirit of Shadcn Space “Topbar 04 - Centered Navigation Topbar”.\n\nCentered navigation topbar with brand logo, quick access links, notifications, and profile actions. Ideal for SaaS products, documentation websites, and modern web applications.\n\nFamily: topbar. Layout and hierarchy only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs.",
      "blockRecipe": []
    },
    {
      "id": "shadcnspace-topbar-05",
      "title": "Topbar 05 - Sidebar Integrated Topbar",
      "collection": "saas",
      "category": "topbar",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
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
      "sourcePrompt": "Rebuild a marketing section in the spirit of Shadcn Space “Topbar 05 - Sidebar Integrated Topbar”.\n\nTopbar paired with a collapsible sidebar, combining primary navigation, quick actions, notifications, and user controls in a unified workspace layout.\n\nFamily: topbar. Layout and hierarchy only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs.",
      "blockRecipe": []
    },
    {
      "id": "shadcnspace-topbar-06",
      "title": "Topbar 06 - Search Focused Topbar",
      "collection": "saas",
      "category": "topbar",
      "pageType": "section",
      "style": [
        "minimal"
      ],
      "industry": [
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
      "sourcePrompt": "Rebuild a marketing section in the spirit of Shadcn Space “Topbar 06 - Search Focused Topbar”.\n\nClean topbar with a prominent search bar, sidebar toggle, notifications, and profile actions for faster navigation and content discovery.\n\nFamily: topbar. Layout and hierarchy only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs.",
      "blockRecipe": []
    },
    {
      "id": "shadcnspace-two-factor-authentication-01",
      "title": "Two Factor Authentication 01 - Dashboard Two-Factor Verification",
      "collection": "utility",
      "category": "two-factor-authentication",
      "pageType": "section",
      "style": [
        "minimal"
      ],
      "industry": [
        "saas",
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
      "sourcePrompt": "Rebuild a marketing section in the spirit of Shadcn Space “Two Factor Authentication 01 - Dashboard Two-Factor Verification”.\n\nA clean authentication screen where users enter a verification code, designed to add extra security while keeping the process simple and smooth.\n\nFamily: two-factor-authentication. Layout and hierarchy only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs.",
      "blockRecipe": []
    },
    {
      "id": "shadcnspace-verify-email-01",
      "title": "Verify Email 01 - Email Verification Page",
      "collection": "utility",
      "category": "verify-email",
      "pageType": "section",
      "style": [
        "minimal"
      ],
      "industry": [
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
      "sourcePrompt": "Rebuild a marketing section in the spirit of Shadcn Space “Verify Email 01 - Email Verification Page”.\n\nA clean email verification screen that confirms account activation, guides users to check their inbox, and offers resend functionality for a smooth onboarding experience.\n\nFamily: verify-email. Layout and hierarchy only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs.",
      "blockRecipe": []
    },
    {
      "id": "shadcnspace-widget-01",
      "title": "Widget 01 - Analytics Overview Widget",
      "collection": "saas",
      "category": "widget",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
        "saas"
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
      "sourcePrompt": "Rebuild a marketing section in the spirit of Shadcn Space “Widget 01 - Analytics Overview Widget”.\n\nA compact analytics widget displaying earnings and expenses with growth indicators, perfect for admin dashboards to provide quick financial insights without overwhelming the interface.\n\nFamily: widget. Layout and hierarchy only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs.",
      "blockRecipe": []
    },
    {
      "id": "shadcnspace-widget-02",
      "title": "Widget 02 - Sales by Country Widget",
      "collection": "saas",
      "category": "widget",
      "pageType": "section",
      "style": [
        "modern"
      ],
      "industry": [
        "saas"
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
      "sourcePrompt": "Rebuild a marketing section in the spirit of Shadcn Space “Widget 02 - Sales by Country Widget”.\n\nA ranked country wise sales widget with flags, revenue values, and growth indicators, ideal for dashboards to monitor geographic performance and spot emerging market trends quickly.\n\nFamily: widget. Layout and hierarchy only — use platform blocks and theme tokens.\n\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs.",
      "blockRecipe": []
    }
  ]
}
