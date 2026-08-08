<script setup lang="ts">
import { getBlock, resolveRenderProps } from '@platform/blocks'
import { rendersConfigurableHeading, sectionStyleToCssVars, type Section } from '@platform/schemas'
import {
  BlockAboutScrollStory01,
  BlockContactDetails01,
  BlockContentManifesto01,
  BlockContentRichtext01,
  BlockContentScrollReveal01,
  BlockContentTextGenerate01,
  BlockCtaAnimatedBorder01,
  BlockCtaBanner01,
  BlockCtaHighContrast01,
  BlockFaqAccordion01,
  BlockFaqRevealAccordion01,
  BlockFeatureSpotlight01,
  BlockFeaturesBeamSteps01,
  BlockFeaturesBentoGrid01,
  BlockFeaturesBrutalistGrid01,
  BlockFeaturesGlowCards01,
  BlockFeaturesGrid01,
  BlockFeaturesStickyStack01,
  BlockFeaturesTabSwitcher01,
  BlockFooterSimple01,
  BlockGalleryCompareSlider01,
  BlockGalleryHorizontalScroll01,
  BlockGalleryPinnedSequence01,
  BlockGalleryTiltCards01,
  BlockHeaderSimple01,
  BlockHeaderLiquidGlass01,
  BlockHeroAurora01,
  BlockHeroAgencyProof01,
  BlockHeroAsymmetric01,
  BlockHeroCentered01,
  BlockHeroCoverStatement01,
  BlockHeroKinetic01,
  BlockHeroMaskReveal01,
  BlockHeroOversizedType01,
  BlockHeroPortrait01,
  BlockHeroProperty01,
  BlockHeroSaasPreview01,
  BlockHeroSplit01,
  BlockHeroSplitScreen01,
  BlockLayoutCanvas01,
  BlockLogosOrbit01,
  BlockLogosStrip01,
  BlockMarqueeStrip01,
  BlockMotionSection01,
  BlockPricingToggle01,
  BlockProductDetail01,
  BlockScrollVideoScrub01,
  BlockServicesEditorialIndex01,
  BlockServicesList01,
  BlockShopAnnouncement01,
  BlockShowcaseParallax01,
  BlockStatsBand01,
  BlockStatsCounter01,
  BlockStatsMeteorPanel01,
  BlockTeamEditorial01,
  BlockTestimonialsCardStack01,
  BlockTestimonialsGrid01,
  BlockTestimonialsMarquee01,
  // registry:imports:start
  BlockBlogCardGrid01,
  // registry:imports:end
} from '#components'

defineProps<{ sections: Section[] }>()

/**
 * Block id → Nuxt renderer. Explicit rather than resolved from a string so the
 * bundler can see every dependency and an id typo fails at build time.
 *
 * Grouped by collection to match `packages/blocks/src/collections`. A block
 * registered without an entry here fails `collections.test.ts` rather than
 * silently rendering nothing on a live page.
 */
const RENDERERS: Record<string, unknown> = {
  // core
  'header-simple-01': BlockHeaderSimple01,
  'header-liquid-glass-01': BlockHeaderLiquidGlass01,
  'hero-split-01': BlockHeroSplit01,
  'hero-centered-01': BlockHeroCentered01,
  'logos-strip-01': BlockLogosStrip01,
  'stats-band-01': BlockStatsBand01,
  'services-list-01': BlockServicesList01,
  'features-grid-01': BlockFeaturesGrid01,
  'content-richtext-01': BlockContentRichtext01,
  'layout-canvas-01': BlockLayoutCanvas01,
  'testimonials-grid-01': BlockTestimonialsGrid01,
  'faq-accordion-01': BlockFaqAccordion01,
  'cta-banner-01': BlockCtaBanner01,
  'contact-details-01': BlockContactDetails01,
  'footer-simple-01': BlockFooterSimple01,
  'hero-kinetic-01': BlockHeroKinetic01,
  'showcase-parallax-01': BlockShowcaseParallax01,
  'marquee-strip-01': BlockMarqueeStrip01,
  'feature-spotlight-01': BlockFeatureSpotlight01,
  'stats-counter-01': BlockStatsCounter01,

  // motion — scroll choreography
  'hero-mask-reveal-01': BlockHeroMaskReveal01,
  'content-scroll-reveal-01': BlockContentScrollReveal01,
  'features-sticky-stack-01': BlockFeaturesStickyStack01,
  'gallery-pinned-sequence-01': BlockGalleryPinnedSequence01,
  'gallery-horizontal-scroll-01': BlockGalleryHorizontalScroll01,
  'about-scroll-story-01': BlockAboutScrollStory01,
  'scroll-video-scrub-01': BlockScrollVideoScrub01,

  // showcase — marketing primitives
  'testimonials-marquee-01': BlockTestimonialsMarquee01,
  'testimonials-card-stack-01': BlockTestimonialsCardStack01,
  'logos-orbit-01': BlockLogosOrbit01,
  'gallery-compare-slider-01': BlockGalleryCompareSlider01,
  'faq-reveal-accordion-01': BlockFaqRevealAccordion01,
  'features-tab-switcher-01': BlockFeaturesTabSwitcher01,
  'pricing-toggle-01': BlockPricingToggle01,
  'features-bento-grid-01': BlockFeaturesBentoGrid01,
  'product-detail-01': BlockProductDetail01,
  'header-shop-announce-01': BlockShopAnnouncement01,
  'hero-agency-proof-01': BlockHeroAgencyProof01,
  'hero-property-01': BlockHeroProperty01,
  'hero-portrait-01': BlockHeroPortrait01,
  'hero-saas-preview-01': BlockHeroSaasPreview01,
  'hero-cover-statement-01': BlockHeroCoverStatement01,

  // editorial — bold typographic layout
  'hero-oversized-type-01': BlockHeroOversizedType01,
  'hero-split-screen-01': BlockHeroSplitScreen01,
  'hero-asymmetric-01': BlockHeroAsymmetric01,
  'features-brutalist-grid-01': BlockFeaturesBrutalistGrid01,
  'services-editorial-index-01': BlockServicesEditorialIndex01,
  'content-manifesto-01': BlockContentManifesto01,
  'cta-high-contrast-01': BlockCtaHighContrast01,
  'team-editorial-01': BlockTeamEditorial01,

  // spotlight — premium effects
  'hero-aurora-01': BlockHeroAurora01,
  'features-glow-cards-01': BlockFeaturesGlowCards01,
  'gallery-tilt-cards-01': BlockGalleryTiltCards01,
  'content-text-generate-01': BlockContentTextGenerate01,
  'features-beam-steps-01': BlockFeaturesBeamSteps01,
  'stats-meteor-panel-01': BlockStatsMeteorPanel01,
  'cta-animated-border-01': BlockCtaAnimatedBorder01,
  'motion-section-01': BlockMotionSection01,

  // vendored by `pnpm registry:add` — the anchors below are load-bearing
  // registry:renderers:start
  'blog-card-grid-01': BlockBlogCardGrid01,
  // registry:renderers:end
}

/**
 * Header and footer blocks render their own landmark element, so wrapping them
 * in a `<section>` would nest a banner inside a region.
 */
function wrapperFor(section: Section): string {
  const category = getBlock(section.block)?.category
  return category === 'header' || category === 'footer' ? 'div' : 'section'
}

/**
 * Per-section SEO, applied at render time.
 *
 * The anchor and the snippet flag belong on the wrapper — they describe the
 * region, not the block — so no block renderer has to know about them. The
 * heading level does have to reach the block, but only the blocks that accept
 * one (`HEADING_LEVEL_AWARE_BLOCKS`); passing it to any other block would land
 * on its root element as a stray attribute.
 */
function renderPropsFor(section: Section): Record<string, unknown> {
  const props = resolveRenderProps(section)
  const level = section.seo?.headingLevel

  return level && rendersConfigurableHeading(section.block) ? { ...props, headingLevel: level } : props
}

/** Per-breakpoint visibility: mobile < 768 ≤ tablet < 1024 ≤ desktop. */
function visibilityClass(section: Section): string {
  const visibility = section.visibility
  if (!visibility) return ''

  return [
    visibility.mobile === false ? 'max-md:hidden' : '',
    visibility.tablet === false ? 'md:max-lg:hidden' : '',
    visibility.desktop === false ? 'lg:hidden' : '',
  ]
    .filter(Boolean)
    .join(' ')
}

/**
 * Remap `--site-*` (and scale) on the wrapper so blocks inherit without edits.
 *
 * Motionsites islands stay full-bleed and fully animated — never inset them with
 * section padding / max-width; colour + type tokens still flow through.
 */
function styleVars(section: Section): Record<string, string> | undefined {
  const vars = sectionStyleToCssVars(section.style)
  if (section.block === 'motion-section-01') {
    delete vars['padding-block']
    delete vars['padding-inline']
    delete vars['max-width']
    delete vars['margin-inline']
    delete vars.width
  }
  return Object.keys(vars).length ? vars : undefined
}
</script>

<template>
  <template v-for="section in sections" :key="section.id">
    <MotionReveal
      v-if="RENDERERS[section.block]"
      :as="wrapperFor(section)"
      :motion="section.motion"
      :id="section.seo?.anchorId || undefined"
      :class="visibilityClass(section)"
      :vars="styleVars(section)"
      :data-block="section.block"
      :data-section-scale="section.style?.scale || 'md'"
      :data-nosnippet="section.seo?.noSnippet ? '' : undefined"
    >
      <component :is="RENDERERS[section.block]" v-bind="renderPropsFor(section)" />
    </MotionReveal>
  </template>
</template>
