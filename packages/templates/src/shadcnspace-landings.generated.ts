/**
 * GENERATED — do not edit by hand.
 *
 * Produced by `packages/templates/scripts/import-shadcnspace-landings.mjs`
 * from the local Shadcn Space templates scrape (markdown briefs). Metadata +
 * platform block recipes only. No third-party asset URLs or component source
 * (ADR-0003).
 *
 * Regenerate with: pnpm --filter @platform/templates import:shadcnspace-landings
 */
import type { TemplateCatalog } from '@platform/schemas'

export const SHADCNSPACE_LANDINGS_CATALOG: TemplateCatalog = {
  "version": 1,
  "generatedAt": "2026-08-08T13:01:41.196Z",
  "source": "Shadcn Space free landing templates (shadcnspace.com/templates). Metadata + platform block recipes only — markdown sanitised, no React/TSX or CDN URLs (ADR-0003).",
  "collections": [
    {
      "id": "landing",
      "label": "Landing pages",
      "description": "Whole-page starting points, hero through closing call to action.",
      "count": 3
    },
    {
      "id": "saas",
      "label": "SaaS & product",
      "description": "Product-led pages: dashboards, plans, feature proof.",
      "count": 2
    },
    {
      "id": "agency",
      "label": "Agency & portfolio",
      "description": "Studio and case-study work where the craft is the pitch.",
      "count": 5
    }
  ],
  "templates": [
    {
      "id": "shadcnspace-landing-atomist",
      "title": "Atomist - SaaS Landing Page Template (Next.js & Astro)",
      "collection": "saas",
      "category": "landing-page",
      "pageType": "landing",
      "style": [
        "minimal",
        "modern"
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
      "sourcePrompt": "Rebuild a full marketing landing page in the spirit of Shadcn Space “Atomist - SaaS Landing Page Template (Next.js & Astro)”.\nWhole-page layout and hierarchy only — use platform blocks and theme tokens.\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs.\nLaunch high-converting SaaS landing pages faster with a clean, minimal template built for developers, founders, and product teams using Next.js and Astro versions with shadcn/ui.\n\n## SaaS Landing Page Template Built with shadcn/ui\n\n*   Conversion-focused sections:Includes essential SaaS blocks like hero, features, integrations, pricing, testimonials, FAQ, and call-to-action.\n\n*   Built for SaaS developers:Clean, modular architecture using Next.js and Astro, Tailwind CSS, and TypeScript for fast development and easy scaling.\n\n*   Responsive and modern UI:Carefully designed layouts that look great across all devices and screen sizes.\n\n*   Performance and SEO ready:Optimized structure for fast loading, accessibility, and search engine visibility.\n\n*   Easy to customize:Update product content, branding, and layout sections without breaking the component system.\n\n### Modern Technology Stack\n\nBuilt with the tools developers love and teams trust:\n\n*   Next.js v16 & Astro v6.1.4 with React v19 for scalable SaaS applications\n\n*   Tailwind CSS v4 for utility-first and flexible styling\n\n*   TypeScript for maintainable and type-safe development\n\n*   shadcn/ui + Base UI for accessible, consistent components\n\nCreated Apr 14, 2026\n\n### Tech Stack\n\nv6.1.4 v16.1.7 v19+v4.2.1 v4.0.8\n\n### Highlights\n\n*   Clean and minimal **SaaS landing page template**\n*   Includes sections for about, pricing, services, and blogs\n*   **Built with Next.js & Astro** and modern frontend stack\n*   **Tailwind CSS** for utility-first styling\n*   **shadcn/ui components** for consistent UI\n*   Fully responsive across all screen sizes\n*   SEO and performance optimized\n*   Easy to **customize content, layout, and branding**",
      "blockRecipe": [
        "hero-cover-statement-01",
        "features-grid-01",
        "stats-counter-01",
        "pricing-toggle-01",
        "testimonials-card-stack-01",
        "faq-accordion-01",
        "cta-animated-border-01"
      ]
    },
    {
      "id": "shadcnspace-landing-awake",
      "title": "Awake – Agency & Portfolio Template (Next.js & Astro)",
      "collection": "agency",
      "category": "landing-page",
      "pageType": "landing",
      "style": [
        "modern",
        "minimal"
      ],
      "industry": [
        "agency",
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
      "sourcePrompt": "Rebuild a full marketing landing page in the spirit of Shadcn Space “Awake – Agency & Portfolio Template (Next.js & Astro)”.\nWhole-page layout and hierarchy only — use platform blocks and theme tokens.\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs.\nLaunch your agency or portfolio website faster with a clean, production-ready template. Now available in separate Next.js and Astro versions built using shadcn/ui and Tailwind CSS.\n\n## Agency Landing Page Template Built with shadcn/ui\n\nAwake is a conversion-focused agency and portfolio template designed for startups, freelancers, studios, and SaaS teams. Available in both Next.js and Astro versions, it provides structured sections, reusable components, and a clean design system so developers can ship client projects faster. The codebase is scalable, SEO-ready, and optimized for performance from the start.\n\n*   Essential agency sections included :Hero, services, portfolio showcase, testimonials, about, CTA, and contact.\n\n*   Developer-friendly architecture:Modular components with scalable structure for both Next.js App Router and Astro.\n\n*   Responsive layout system :Carefully structured spacing, grids, and typography for all screen sizes.\n\n*   Performance-ready build :Optimized structure for fast loading and smooth rendering.\n\n*   Fully customizable codebase :just layout, branding, and content without breaking component logic.\n\n### Modern Technology Stack\n\nBuilt with the tools developers love and teams trust:\n\n*   Next.js v16 & Astro v6+with React v19 and TypeScript\n\n*   Tailwind CSS v4 for utility-first, scalable styling\n\n*   shadcn/ui + Base UI for accessible, consistent components\n\nCreated Mar 31, 2026\n\n### Tech Stack\n\nv6.1.4 v16.1.0 v19+v4.0.0 v3.5.1\n\n### Highlights\n\n*   Built for **agencies and freelancers**\n*   **Clean portfolio-focused** layout structure\n*   SEO-friendly and performance optimized\n*   **Component-based architecture** for easy scaling\n*   Mobile-first responsive design\n*   Easy deployment on platforms like **Vercel**\n*   **Designed for customization** without design lock-in",
      "blockRecipe": [
        "hero-cover-statement-01",
        "features-grid-01",
        "gallery-compare-slider-01",
        "testimonials-card-stack-01",
        "about-scroll-story-01",
        "cta-animated-border-01",
        "contact-details-01"
      ]
    },
    {
      "id": "shadcnspace-landing-crypgo",
      "title": "Crypgo - Shadcn UI Crypto Landing Page Template ( Next.js & Astro )",
      "collection": "landing",
      "category": "landing-page",
      "pageType": "landing",
      "style": [
        "bold",
        "modern"
      ],
      "industry": [
        "web3",
        "fintech",
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
      "sourcePrompt": "Rebuild a full marketing landing page in the spirit of Shadcn Space “Crypgo - Shadcn UI Crypto Landing Page Template ( Next.js & Astro )”.\nWhole-page layout and hierarchy only — use platform blocks and theme tokens.\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs.\nTransform your crypto business with Crypgo, available in both Next.js and Astro versions. Designed specifically for NFT startups, bitcoin trading platforms, blockchain consultancy and digital coin services.\n\n## Free Crypto Landing Page Template Built with Next.js, Astro & shadcn/ui\n\nCrypgo is a free landing page template available in both Next.js and Astro versions. Built for developers who need a fast, modern starting point for crypto, SaaS, or Web3 products. It follows a component-driven architecture with clean code practices, making it easy to understand, extend, and maintain in real-world production environments.\n\n*   Conversion-ready sections :Hero, token utility, roadmap, features, stats, FAQ, pricing, and footer - structured for crypto launches.\n\nFree template\n*   Built for developers :Clean folder structure, reusable components, and scalable layout using Next.js App Router or Astro.\n\n*   Responsive by default :Carefully tuned spacing, layout grids, and breakpoints across devices.\n\n*   SEO-first foundation :Semantic HTML, metadata-ready structure, and fast loading architecture.\n\n### Modern Technology Stack\n\nBuilt with the tools developers love and teams trust:\n\n*   Next.js v16 & Astro v6+with React v19 and TypeScript\n\n*   Tailwind CSS v4 for utility-first styling\n\n*   shadcn/ui + Base UI for accessible, consistent components\n\nCreated Mar 31, 2026\n\n### Tech Stack\n\nv6.1.4 v16.1.0 v19+v4.0.0 v3.5.1\n\n### Highlights\n\n*   **Next.js & Astro versions** offering server rendering and optimized performance\n*   **Styled using Tailwind CSS** for rapid and flexible UI development\n*   **Integrated Shadcn UI** components for accessibility and design consistency\n*   **Developer-friendly** folder structure and reusable components\n*   **Fully responsive** layout optimized for all screen sizes\n*   **SEO-ready** markup following modern best practices\n*   **Lightweight and fast** loading with minimal dependencies\n*   **Easy customization** for crypto, SaaS, and Web3 landing pages",
      "blockRecipe": [
        "hero-asymmetric-01",
        "features-bento-grid-01",
        "stats-counter-01",
        "testimonials-card-stack-01",
        "pricing-toggle-01",
        "cta-banner-01"
      ]
    },
    {
      "id": "shadcnspace-landing-digital-arc",
      "title": "Digital Arc – Creative Agency & Portfolio (Next.js & Astro)",
      "collection": "agency",
      "category": "landing-page",
      "pageType": "landing",
      "style": [
        "premium",
        "bold"
      ],
      "industry": [
        "agency",
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
      "sourcePrompt": "Rebuild a full marketing landing page in the spirit of Shadcn Space “Digital Arc – Creative Agency & Portfolio (Next.js & Astro)”.\nWhole-page layout and hierarchy only — use platform blocks and theme tokens.\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs.\n## Digital Arc - Shadcn Startup & Creative Agency Template\n\nDigital Arc is a modern, visually engaging template built to help agencies, studios, and creative professionals launch polished portfolio websites quickly.\n\n## Creative Agency Template (Next.js & Astro Versions)\n\nShowcase your services,projects, team, and brand story with a clean, responsive design that converts visitors into clients. Available in both Next.js and Astro versions,Digital Arc organizes key agency sections - from hero and services to projects and blogs - with clear visual hierarchy and performance-optimized code, making it ideal for agencies, design studios, freelancers, and consultants.\n\n*   Designed for visual storytelling :Hero, featured brands, project grids, testimonials, team, and blog.\n\n*   Professional layout system :Carefully spaced typography and grids for portfolios and services.\n\n*   Responsive across devices :Consistent UI on mobile, tablet, and desktop.\n\n*   SEO-friendly structure :Semantic sections and performance-focused code.\n\n*   Easy to adapt :Modify visuals, copy, and components without breaking structure.\n\n### Modern Technology Stack\n\nBuilt with the tools developers love and teams trust:\n\n*   Next.js v16 & Astro v6+with React v19 and TypeScript for production-grade structure\n\n*   Tailwind CSS v4 for utility-first and scalable styling\n\n*   shadcn/ui + Base UI for accessible, consistent components\n\n*   Semantic HTML & responsive layouts for SEO and accessibility\n\n*   Optimized images & modern bundling for performance\n\nCreated Mar 31, 2026\n\n### Tech Stack\n\nv6.0.2+v16.1.0 v19+v4.0.0 v3.5.1\n\n### Highlights\n\n*   **Clean and modern** agency website template\n*   **Showcase** services, projects, team, blog, and contact\n*   **Separate Next.js & Astro versions** built with a modern frontend stack\n*   **Tailwind CSS** for utility-first design flexibility\n*   **shadcn/ui** components for consistent UI/UX patterns\n*   **Fully responsive** across all screen sizes\n*   **SEO and performance** optimized out of the box\n*   **Easy to customize** visuals, content, and branding",
      "blockRecipe": [
        "hero-split-screen-01",
        "gallery-tilt-cards-01",
        "features-bento-grid-01",
        "testimonials-card-stack-01",
        "cta-animated-border-01",
        "contact-details-01"
      ]
    },
    {
      "id": "shadcnspace-landing-gleamer",
      "title": "Gleamer – Next.js Cleaning Service Website Template",
      "collection": "landing",
      "category": "landing-page",
      "pageType": "landing",
      "style": [
        "modern",
        "minimal"
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
      "sourcePrompt": "Rebuild a full marketing landing page in the spirit of Shadcn Space “Gleamer – Next.js Cleaning Service Website Template”.\nWhole-page layout and hierarchy only — use platform blocks and theme tokens.\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs.\n## Gleamer - Shadcn Cleaning Services Website Template\n\nLaunch a modern, professional cleaning business website quickly with a modular Next.js template built for performance and ease of development.\n\n## Next.js Cleaning Website Template Built with shadcn/ui\n\nGleamer is a purpose-built website template designed for cleaning services, maid businesses, and local service providers who want a strong online presence with minimal setup. It includes ready-made pages and components so developers can launch responsive, SEO-friendly sites fast.\n\n*   Modern service layouts :Prebuilt pages like Home, About, Services, Service Details, and Contact are ready to go.\n\n*   Developer-friendly codebase :Organized components and clean structure using Next.js, Tailwind CSS, and TypeScript.\n\n*   Responsive and accessible :Designed to look great on all screens with clean spacing and accessible UI components.\n\n*   Performance-first build :Optimized for fast loading and SEO with semantic markup and modular code.\n\n*   Customizable visuals :Easily change branding, colors, text, and layout sections without deep refactoring.\n\n### Modern Technology Stack\n\nBuilt with the tools developers love and teams trust:\n\n*   Next.js v16 with React v19 for modern, scalable rendering\n\n*   Tailwind CSS v4 for utility-first, scalable styling\n\n*   TypeScript for type safety and maintainability\n\n*   shadcn/ui + Base UI for accessible, consistent components\n\n*   Supabase for backend integrations (auth, data)\n\n*   Framer Motion for smooth UI transitions and animations\n\nCreated Feb 17, 2026\n\n### Tech Stack\n\nv16.1.0 v19+v4.0.0 v3.5.1\n\n### Highlights\n\n*   Professional **cleaning business website template**\n*   Prebuilt pages for **services, details, and contact**\n*   Responsive design on all device sizes\n*   **Light & dark mode support** included\n*   Built-in authentication (login/registration)\n*   SEO-focused and fast performance\n*   Modular UI ready for customization",
      "blockRecipe": [
        "hero-cover-statement-01",
        "features-grid-01",
        "about-scroll-story-01",
        "testimonials-card-stack-01",
        "faq-reveal-accordion-01",
        "cta-animated-border-01",
        "contact-details-01"
      ]
    },
    {
      "id": "shadcnspace-landing-homely",
      "title": "Homely – Next.js Real Estate Website Template",
      "collection": "landing",
      "category": "landing-page",
      "pageType": "landing",
      "style": [
        "modern",
        "premium"
      ],
      "industry": [
        "real_estate",
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
      "sourcePrompt": "Rebuild a full marketing landing page in the spirit of Shadcn Space “Homely – Next.js Real Estate Website Template”.\nWhole-page layout and hierarchy only — use platform blocks and theme tokens.\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs.\n## Homely - Shadcn Real Esate & Property Website Template\n\nHomely is a modern Next.js real estate website template designed for property listings, real estate agencies, and rental platforms.\n\n## Real Estate Website Template Built with shadcn/ui\n\nHomely is a professionally designed real estate website template built for property listings, agencies, brokers, and housing platforms. It provides a clean UI structure optimized for property showcasing, lead generation, and performance. Designed with developers in mind, the codebase is scalable, maintainable, and easy to extend.\n\n*   Property-focused sections :Hero search, featured listings, property grid, property details, testimonials, agents, FAQ, and contact forms.\n\n*   Developer-first architecture :Built using Next.js App Router with reusable components and a clean folder structure.\n\n*   Conversion-ready layout :Designed to support inquiries, property exploration, and user engagement.\n\n*   Responsive by default :Carefully tuned layouts for desktop, tablet, and mobile experiences.\n\n*   SEO-structured foundation :Semantic markup, optimized structure, and performance-driven rendering.\n\n### Modern Technology Stack\n\nBuilt with the tools developers love and teams trust:\n\n*   Next.js v16 with React v19 and TypeScript\n\n*   Tailwind CSS v4 for utility-first and consistent styling\n\n*   shadcn/ui + Base UI for accessible, consistent components\n\n*   Modular component architecture for easy scalability\n\n*   Optimized build setup for fast loading and deployment\n\nCreated Feb 17, 2026\n\n### Tech Stack\n\nv16.1.0 v19+v4.0.0 v3.5.1\n\n### Highlights\n\n*   Designed specifically for **real estate and property platforms**\n*   Includes **property listing** and detail page layouts\n*   Clean filtering and property grid structure\n*   **Agent profile** and **trust-building sections** included\n*   Lead capture and inquiry-ready forms\n*   SEO-focused and performance-optimized structure\n*   Fully responsive and mobile-optimized\n*   Easy to extend with **CMS or property APIs**\n*   Structured UI system using shadcn/ui components\n*   Modern UI suitable for agencies and marketplaces",
      "blockRecipe": [
        "hero-agency-proof-01",
        "gallery-tilt-cards-01",
        "features-bento-grid-01",
        "testimonials-card-stack-01",
        "faq-reveal-accordion-01",
        "cta-animated-border-01",
        "contact-details-01"
      ]
    },
    {
      "id": "shadcnspace-landing-resume",
      "title": "Resume - Shadcn UI Resume and Portfolio Template",
      "collection": "agency",
      "category": "landing-page",
      "pageType": "landing",
      "style": [
        "minimal",
        "modern"
      ],
      "industry": [
        "portfolio",
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
      "sourcePrompt": "Rebuild a full marketing landing page in the spirit of Shadcn Space “Resume - Shadcn UI Resume and Portfolio Template”.\nWhole-page layout and hierarchy only — use platform blocks and theme tokens.\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs.\nResume is a lightweight Next.js resume template created for individuals who want a simple, professional online presence.\n\n## Free Resume Template Built with shadcn/ui\n\nShowcase your skills, experience, and portfolio effortlessly with this free Resume NextJS Template built for developers, designers, and tech professionals. The template features a clean, modern layout tailored to highlight your professional story while maintaining performance and accessibility.\n\n*   Professional sections included :Hero intro, about, skills, experience, projects, education, and contact.\n\n*   Developer-first structure :Organized components and scalable layout using Next.js App Router.\n\n*   Responsive by default :Clean spacing and typography optimized across devices.\n\n*   Performance-focused :Lightweight structure with optimized rendering.\n\n*   Fully customizable :Modify layout, colors, and content without breaking structure.\n\n### Modern Technology Stack\n\nBuilt with the tools developers love and teams trust:\n\n*   Next.js v16 with React v19 and TypeScript\n\n*   Tailwind CSS v4 for utility-first, scalable styling\n\n*   shadcn/ui + Base UI for accessible, consistent components\n\nCreated Feb 17, 2026\n\n### Tech Stack\n\nv16.1.0 v19+v4.0.0 v3.5.1\n\n### Highlights\n\n*   Built with **Next.js** for optimized performance and SEO\n*   Styled using **Tailwind CSS** for utility-first design\n*   Includes **Shadcn UI** components for consistent UI/UX\n*   Modern resume layout with clear sections for skills and experience\n*   Fully responsive across all device sizes\n*   Lightning-fast loading and SEO-focused structure\n*   Easy to personalize content and visuals\n*   Ready to deploy on platforms like Vercel",
      "blockRecipe": [
        "hero-cover-statement-01",
        "about-scroll-story-01",
        "features-grid-01",
        "gallery-compare-slider-01",
        "cta-animated-border-01"
      ]
    },
    {
      "id": "shadcnspace-landing-saazio",
      "title": "Saazio - Next.js SaaS Template Built with React, Shadcn UI & Tailwind CSS",
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
      "sourcePrompt": "Rebuild a full marketing landing page in the spirit of Shadcn Space “Saazio - Next.js SaaS Template Built with React, Shadcn UI & Tailwind CSS”.\nWhole-page layout and hierarchy only — use platform blocks and theme tokens.\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs.\n## Saazio - Shadcn SaaS Product Website Template\n\nLaunch high-converting SaaS websites faster with Saazio, a clean and modern template built for developers, founders, startups, SaaS teams, AI tools, and software businesses.\n\n## SaaS Product Website Template Built with shadcn/ui\n\nSaazio is a modern template designed for SaaS apps, startups, software companies, AI tools,and digital product teams that want to launch faster with a polished online presence. Built using Next.js 16, React 19, Tailwind CSS 4, TypeScript, and shadcn/ui, Saazio provides clean, conversion focused blocks with production-ready pages and reusable components. Whether you're launching a new SaaS platform, showcasing product features, or growing your user base, Saazio gives developers a scalable foundation to build and customize with ease.\n\n*   Conversion focused SaaS sections:Includes hero, features, integrations, company story, blog, contact, and call-to-action sections designed to drive engagement and product adoption.\n\n*   Built for modern product teams:Clean architecture powered by Next.js App Router, React, TypeScript, and reusable shadcn/ui components for long-term scalability.\n\n*   Professional page collection:Comes with Homepage, About Us, Blog Listing, Blog Detail, Integrations, and Contact pages to support complete SaaS marketing websites.\n\n*   Responsive and accessible UI:Carefully crafted layouts, spacing, and typography ensure a seamless experience across desktop, tablet, and mobile devices.\n\n*   Customization-friendly structure:Easily update branding, content, colors, and layouts without disrupting the component architecture.\n\n### Modern Technology Stack\n\nBuilt with the tools that developers love and startup teams trust:\n\n*   Next.js v16.1.7 with React v19.2.4 for modern, scalable applications\n\n*   Tailwind CSS v4.2.1 for utility-first and maintainable styling\n\n*   TypeScript v5 for type-safe development and better maintainability\n\n*   shadcn/ui for accessible, reusable, and consistent UI components\n\n*   SEO-friendly architecture optimized for performance and discoverability\n\n*   Light & Dark Mode support for modern user experiences\n\nCreated Mar 17, 2026\n\nLast updated Jul 21, 2026\n\n### Tech Stack\n\nv7.1.1 v16.1.7 v19.2.4 v4.2.1 v4.1.0\n\n### Highlights\n\n*   Suitable for **SaaS platforms**, AI products, startups, and software businesses\n*   Includes Homepage, About, Blog, Integrations, and Contact pages\n*   **Fully responsive** across all screen sizes\n*   **Reusable components** architecture\n*   **SEO-optimized** and performance-focused structure\n*   **Developer-friendly** folder organization\n*   **Clean and maintainable** codebase\n*   **Easy customization** for branding and product content\n*   **Detailed documentation** and ongoing updates included",
      "blockRecipe": [
        "hero-cover-statement-01",
        "features-grid-01",
        "about-scroll-story-01",
        "testimonials-card-stack-01",
        "cta-animated-border-01",
        "contact-details-01"
      ]
    },
    {
      "id": "shadcnspace-landing-studiova",
      "title": "Studiova – Creative Agency Template (Next.js & Astro)",
      "collection": "agency",
      "category": "landing-page",
      "pageType": "landing",
      "style": [
        "premium",
        "modern"
      ],
      "industry": [
        "agency",
        "creative",
        "portfolio"
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
      "sourcePrompt": "Rebuild a full marketing landing page in the spirit of Shadcn Space “Studiova – Creative Agency Template (Next.js & Astro)”.\nWhole-page layout and hierarchy only — use platform blocks and theme tokens.\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs.\nLaunch your agency or creative studio website with a premium, production-ready Next.js template and Astro template built for performance and scalability.\n\n## Premium Studio Template Built with shadcn/ui\n\nStudiova is a professionally designed agency and portfolio template built for creative studios, freelancers, and digital teams. Available in separate Next.js and Astro versions, it provides a structured, conversion-focused layout using modern frontend architecture. Designed for developers who want clean code, flexibility, and long-term maintainability.\n\n*   Complete agency layout :Hero, services, projects, case studies, testimonials, pricing, blog, and contact sections included.\n\n*   Developer-friendly structure :Modular components with a scalable architecture that works with both Next.js App Router and Astro.\n\n*   Performance optimized :Fast rendering, optimized layout shifts, and SEO-ready structure.\n\n*   Responsive by default :Carefully tuned grids, spacing, and typography across all devices.\n\n*   Premium code quality :Clean folder structure with reusable UI patterns for long-term scalability.\n\n### Modern Technology Stack\n\nBuilt with the tools developers love and teams trust:\n\n*   Next.js v16 & Astro v6+with React v19 and TypeScript\n\n*   Tailwind CSS v4 for scalable, utility-first styling\n\n*   shadcn/ui + Base UI for accessible, consistent components\n\n*   Optimized routing & metadata handling for SEO performance\n\n*   Component-based architecture for easy scalability and reuse\n\nCreated Mar 31, 2026\n\n### Tech Stack\n\nv6.0.2+v16.1.0 v19+v4.0.0 v3.5.1\n\n### Highlights\n\n*   Built specifically for **agencies and creative portfolios**\n*   Conversion-focused layout for lead generation\n*   **SEO-optimized** structure with semantic markup\n*   Easily customizable **branding and content sections**\n*   Ready for production and faster deployment on platforms like **Vercel**",
      "blockRecipe": [
        "hero-agency-proof-01",
        "gallery-tilt-cards-01",
        "features-bento-grid-01",
        "testimonials-card-stack-01",
        "cta-animated-border-01",
        "contact-details-01"
      ]
    },
    {
      "id": "shadcnspace-landing-typefolio",
      "title": "Typefolio - Shadcn UI Personal Portfolio Template",
      "collection": "agency",
      "category": "landing-page",
      "pageType": "landing",
      "style": [
        "minimal",
        "editorial"
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
      "sourcePrompt": "Rebuild a full marketing landing page in the spirit of Shadcn Space “Typefolio - Shadcn UI Personal Portfolio Template”.\nWhole-page layout and hierarchy only — use platform blocks and theme tokens.\nDo not copy React/TSX, Tailwind class strings, or third-party assets. No external URLs.\nTypefolio is a modern personal portfolio template crafted for developers who want a sharp, distraction-free way to present their work, skills, and online presence.\n\n## Free Portfolio Template Built with shadcn/ui\n\nTypefolio is a sleek one-page portfolio template crafted with Next.js and Tailwind CSS to help developers, designers, and technologists present their work with clarity and professionalism. Its minimal architecture keeps your code lean while ensuring rapid performance and a clean visual hierarchy across sections.\n\n*   Structured portfolio sections :Hero, about, services, projects, testimonials, blog, contact, and footer - ready to deploy\n\n*   Developer-first architecture :App Router structure with reusable components and scalable folder organization.\n\n*   Responsive by default :Optimized typography, spacing, and layout across desktop, tablet, and mobile.\n\n*   SEO-ready foundation :Clean semantic markup, metadata support, and performance-focused structure.\n\n*   Easy customization :Modify components, colors, layouts, and content without touching complex logic.\n\n### Modern Technology Stack\n\nBuilt with the tools developers love and teams trust:\n\n*   Next.js v16 with React v19 and TypeScript\n\n*   Tailwind CSS v4 for utility-first styling\n\n*   shadcn/ui + Base UI for accessible, consistent components\n\n*   Optimized routing and layout structure for performance-first builds\n\nCreated Feb 17, 2026\n\n### Tech Stack\n\nv16.1.0 v19+v4.0.0 v3.5.1\n\n### Highlights\n\n*   One-page layout designed for personal portfolio showcases\n*   Built with **Next.js** for efficient navigation and performance\n*   Styled using **Tailwind CSS** for utility-first design flexibility\n*   Includes reusable components from **Shadcn UI**\n*   Lightning-fast loading and minimal bundle size\n*   Fully responsive across devices and viewports\n*   Clean, well-organized code for easy editing\n*   Ready for personal branding and digital CV sites",
      "blockRecipe": [
        "hero-centered-01",
        "about-scroll-story-01",
        "gallery-compare-slider-01",
        "features-brutalist-grid-01",
        "cta-high-contrast-01"
      ]
    }
  ]
}
