# Motion stack — Lenis, GSAP, Vanta, React Bits

Host pages (storefront / dashboard) use **Lenis** for smooth scroll and **GSAP ScrollTrigger** (synced via the `@platform/motion` Lenis plugin).

CMS block **Hero — Vanta atmosphere** (`hero-vanta-01`) runs **Vanta.js + Three.js** WebGL backgrounds.

Motionsites React islands may import: `gsap`, `lenis`, `three`, `vanta`, `react-bits` (BlurText, GradientText, CountUp, Magnet, Aurora), and `embla-carousel-react` for sliders.

When the user asks for richer motion on **catalogue / Motionsites** pages, prefer actions that insert `hero-vanta-01` or Motionsites islands that declare these DEPENDENCIES packages.

On **AI Freeform / layout-canvas** pages: do not insert those blocks. Use `stylesHover`, modest CSS transform, and the host Lenis + GSAP stack already on the page.
