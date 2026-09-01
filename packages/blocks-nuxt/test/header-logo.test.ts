import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import HeaderLiquidGlass01 from '../components/Block/HeaderLiquidGlass01.vue'
import HeaderSimple01 from '../components/Block/HeaderSimple01.vue'

/**
 * A generated site puts its logo on its own row above the navigation, at a size
 * a visitor can read, with nothing drawn around it. These assertions are the
 * frame-free part of that: a card, pill, border or shadow around the brand mark
 * is the defect the stacked layout exists to avoid.
 */

const LOGO = 'https://cdn.test/wordmark.svg'
const FRAME_CLASS = /\b(bg-|border|rounded|shadow|ring-)/

const stacked = { brand: 'Webcare Studio', logo: LOGO, logoHeight: 'xl' as const, layout: 'stacked' as const }

describe.each([
  ['HeaderSimple01', HeaderSimple01],
  ['HeaderLiquidGlass01', HeaderLiquidGlass01],
])('%s stacked brand row', (_name, component) => {
  function render() {
    return mount(component, {
      props: { ...stacked, links: [{ label: 'Diensten', href: '/diensten' }], ctaLabel: 'Bel ons', ctaHref: '/contact' },
    })
  }

  it('draws no card, pill, border or shadow around the logo', () => {
    const anchor = render().get('a')

    expect(anchor.classes().join(' ')).not.toMatch(FRAME_CLASS)
  })

  it('keeps the image on its own full-width row', () => {
    const anchor = render().get('a')

    expect(anchor.classes()).toContain('w-full')
    expect(anchor.classes()).toContain('justify-center')
  })

  it('leaves a wide logo its aspect ratio at both breakpoints', () => {
    const image = render().get('img')
    const classes = image.classes()

    expect(classes).toContain('w-auto')
    expect(classes).toContain('object-contain')
    // 48px on phones, 64px from md — height drives the box, width follows.
    expect(classes).toContain('h-12')
    expect(classes).toContain('md:h-16')
    expect(image.attributes('width')).toBeUndefined()
    expect(image.attributes('height')).toBeUndefined()
  })
})

describe('HeaderSimple01 other layouts', () => {
  it('keeps the existing size for a published page that already used xl', () => {
    const image = mount(HeaderSimple01, {
      props: { brand: 'Webcare Studio', logo: LOGO, logoHeight: 'xl', layout: 'left' },
    }).get('img')

    expect(image.classes()).toContain('h-16')
    expect(image.classes()).not.toContain('md:h-16')
  })
})
