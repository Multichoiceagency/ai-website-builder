/**
 * Development seed: one workspace with a published three-page site, so a fresh
 * clone has something real to open in both the dashboard and the storefront.
 *
 * Idempotent — running it twice leaves the same data.
 */
import { createSection } from '@platform/blocks'
import { themeSchema, type Section } from '@platform/schemas'
import { closeDatabase, withTenant, withoutTenant } from './db/client.js'
import { insertPage, publishPage } from './db/repositories/pages.js'
import { upsertNavigation } from './db/repositories/navigation.js'
import { insertDomain, insertSite } from './db/repositories/sites.js'
import { insertMembership, insertOrganization, insertTenant } from './db/repositories/tenants.js'
import { findUserByEmail, insertUser } from './db/repositories/users.js'
import { hashPassword } from './lib/password.js'

const DEMO_EMAIL = 'demo@platform.local'
const DEMO_PASSWORD = 'demo-password-1234'
const BUSINESS = 'Van Dijk Loodgieters'

function homePage(): Section[] {
  return [
    createSection('header-simple-01', {
      brand: BUSINESS,
      links: [
        { label: 'Diensten', href: '/diensten' },
        { label: 'Contact', href: '/contact' },
      ],
      ctaLabel: 'Bel 010 123 4567',
      ctaHref: 'tel:0101234567',
    }),
    createSection('hero-split-01', {
      eyebrow: 'Loodgieter in Rotterdam',
      headline: 'Lekkage? Wij staan er vandaag nog.',
      subheadline:
        'Van spoedreparatie tot complete badkamerinstallatie. Vakwerk met vaste prijzen en geen voorrijkosten.',
      primaryLabel: 'Vraag een offerte aan',
      primaryHref: '/contact',
      secondaryLabel: 'Bekijk onze diensten',
      secondaryHref: '/diensten',
      imageAlt: 'Monteur aan het werk',
    }),
    createSection('stats-band-01', {
      items: [
        { value: '15+', label: 'Jaar ervaring' },
        { value: '2 500', label: 'Klussen geklaard' },
        { value: '4,9', label: 'Gemiddelde beoordeling' },
      ],
    }),
    createSection('features-grid-01', {
      heading: 'Waarom klanten voor ons kiezen',
      items: [
        { icon: 'clock', title: '24/7 bereikbaar', description: 'Ook s avonds en in het weekend.' },
        { icon: 'shield', title: 'Volledig verzekerd', description: 'Gecertificeerd en gegarandeerd werk.' },
        { icon: 'star', title: 'Vaste prijzen', description: 'Vooraf duidelijk, geen verrassingen.' },
      ],
    }),
    createSection('testimonials-grid-01', {
      heading: 'Wat klanten zeggen',
      items: [
        { quote: 'Binnen een uur ter plaatse en netjes gewerkt.', author: 'A. de Vries', role: 'Rotterdam', rating: 5 },
        { quote: 'Eerlijke prijs en goed uitgelegd wat er mis was.', author: 'M. Jansen', role: 'Schiedam', rating: 5 },
      ],
    }),
    createSection('cta-banner-01', {
      heading: 'Vandaag nog een monteur nodig?',
      body: 'Bel ons of vraag online een offerte aan. U krijgt binnen een uur antwoord.',
      ctaLabel: 'Vraag een offerte aan',
      ctaHref: '/contact',
    }),
    createSection('footer-simple-01', {
      brand: BUSINESS,
      tagline: 'Loodgieterswerk in Rotterdam en omstreken.',
      phone: '010 123 4567',
      email: 'info@vandijkloodgieters.nl',
      address: 'Coolsingel 1, 3011 AD Rotterdam',
      legal: `© ${new Date().getFullYear()} ${BUSINESS}. Alle rechten voorbehouden.`,
    }),
  ]
}

function servicesPage(): Section[] {
  return [
    createSection('header-simple-01', {
      brand: BUSINESS,
      links: [
        { label: 'Diensten', href: '/diensten' },
        { label: 'Contact', href: '/contact' },
      ],
      ctaLabel: 'Bel 010 123 4567',
      ctaHref: 'tel:0101234567',
    }),
    createSection('hero-centered-01', {
      eyebrow: 'Diensten',
      headline: 'Alles wat met water te maken heeft',
      subheadline: 'Van een druppelende kraan tot een complete badkamer.',
      primaryLabel: 'Vraag een offerte aan',
      primaryHref: '/contact',
      secondaryLabel: '',
    }),
    createSection('services-list-01', {
      heading: 'Onze diensten',
      items: [
        { title: 'Spoedreparatie', description: 'Lekkage of verstopping? Wij komen dezelfde dag.', href: '/contact', linkLabel: 'Bel direct' },
        { title: 'Badkamerrenovatie', description: 'Ontwerp, installatie en afwerking, volledig verzorgd.', href: '/contact', linkLabel: 'Plan een gesprek' },
        { title: 'CV-onderhoud', description: 'Jaarlijkse controle zodat u niet in de kou staat.', href: '/contact', linkLabel: 'Maak een afspraak' },
      ],
    }),
    createSection('faq-accordion-01', {
      heading: 'Veelgestelde vragen',
      items: [
        { question: 'Hoe snel kunt u komen?', answer: 'Bij spoed meestal binnen twee uur, altijd dezelfde dag.' },
        { question: 'Wat kost een bezoek?', answer: 'Wij rekenen geen voorrijkosten en geven vooraf een vaste prijs.' },
      ],
    }),
    createSection('footer-simple-01', {
      brand: BUSINESS,
      phone: '010 123 4567',
      email: 'info@vandijkloodgieters.nl',
      legal: `© ${new Date().getFullYear()} ${BUSINESS}.`,
    }),
  ]
}

function contactPage(): Section[] {
  return [
    createSection('header-simple-01', {
      brand: BUSINESS,
      links: [
        { label: 'Diensten', href: '/diensten' },
        { label: 'Contact', href: '/contact' },
      ],
      ctaLabel: 'Bel 010 123 4567',
      ctaHref: 'tel:0101234567',
    }),
    createSection('hero-centered-01', {
      headline: 'Neem contact op',
      subheadline: 'Bel ons of stuur een bericht. U hoort dezelfde dag van ons.',
      primaryLabel: 'Bel 010 123 4567',
      primaryHref: 'tel:0101234567',
      secondaryLabel: '',
    }),
    createSection('contact-details-01', {
      heading: 'Contactgegevens',
      phone: '010 123 4567',
      email: 'info@vandijkloodgieters.nl',
      street: 'Coolsingel 1',
      postalCode: '3011 AD',
      city: 'Rotterdam',
      hours: 'Maandag–vrijdag 08:00–18:00\nZaterdag 09:00–13:00\nZondag alleen spoed',
    }),
    createSection('footer-simple-01', {
      brand: BUSINESS,
      phone: '010 123 4567',
      email: 'info@vandijkloodgieters.nl',
      legal: `© ${new Date().getFullYear()} ${BUSINESS}.`,
    }),
  ]
}

async function seed(): Promise<void> {
  const existing = await withoutTenant((tx) => findUserByEmail(tx, DEMO_EMAIL))
  if (existing) {
    console.log(`seed already applied — sign in as ${DEMO_EMAIL}`)
    return
  }

  const passwordHash = await hashPassword(DEMO_PASSWORD)

  const { tenantId } = await withoutTenant(async (tx) => {
    const organization = await insertOrganization(tx, { name: BUSINESS, slug: 'van-dijk-loodgieters' })
    const tenant = await insertTenant(tx, {
      organizationId: organization.id,
      name: BUSINESS,
      slug: 'van-dijk-loodgieters',
      plan: 'scale',
    })
    const user = await insertUser(tx, { email: DEMO_EMAIL, name: 'Demo Owner', passwordHash })
    await insertMembership(tx, { tenantId: tenant.id, userId: user.id, role: 'owner' })

    // Local development only: the demo account doubles as platform staff so the
    // admin console has someone to sign in as.
    await tx`INSERT INTO platform_admins (user_id, note) VALUES (${user.id}, 'seeded demo admin') ON CONFLICT DO NOTHING`

    return { tenantId: tenant.id }
  })

  await withTenant(tenantId, async (tx) => {
    const site = await insertSite(tx, {
      tenantId,
      name: BUSINESS,
      slug: 'hoofdsite',
      locale: 'nl',
      theme: themeSchema.parse({
        colorPrimary: '#0b5d8f',
        colorAccent: '#c2410c',
        colorSurfaceAlt: '#f1f5f9',
        radius: 'lg',
      }),
    })

    // Both hostnames are seeded so the storefront works at
    // http://localhost:3001 without any DNS or hosts-file setup.
    await insertDomain(tx, { tenantId, siteId: site.id, hostname: 'localhost', isPrimary: true, verified: true })
    await insertDomain(tx, {
      tenantId,
      siteId: site.id,
      hostname: 'demo.localhost',
      isPrimary: false,
      verified: true,
    })

    const pages = [
      { path: '/', title: 'Loodgieter in Rotterdam', sections: homePage(), description: 'Spoedservice, badkamers en CV-onderhoud in Rotterdam.' },
      { path: '/diensten', title: 'Diensten', sections: servicesPage(), description: 'Bekijk waar wij u mee kunnen helpen.' },
      { path: '/contact', title: 'Contact', sections: contactPage(), description: 'Bel of mail ons, u hoort dezelfde dag van ons.' },
    ]

    for (const page of pages) {
      const created = await insertPage(tx, {
        tenantId,
        siteId: site.id,
        path: page.path,
        title: page.title,
        seo: { title: `${page.title} | ${BUSINESS}`, description: page.description, noIndex: false },
        sections: page.sections,
      })
      await publishPage(tx, tenantId, created.id)
    }

    await upsertNavigation(tx, {
      tenantId,
      siteId: site.id,
      key: 'primary',
      items: [
        { label: 'Home', href: '/' },
        { label: 'Diensten', href: '/diensten' },
        { label: 'Contact', href: '/contact' },
      ],
    })
    await upsertNavigation(tx, {
      tenantId,
      siteId: site.id,
      key: 'footer',
      items: [
        { label: 'Privacy', href: '/privacy' },
        { label: 'Algemene voorwaarden', href: '/voorwaarden' },
      ],
    })
  })

  console.log('seed complete')
  console.log(`  dashboard login : ${DEMO_EMAIL} / ${DEMO_PASSWORD}`)
  console.log('  storefront      : http://localhost:3001')
  console.log('  admin console   : http://localhost:3002 (same account, platform staff)')
}

try {
  await seed()
} catch (error) {
  console.error('seed failed:', error instanceof Error ? error.message : error)
  process.exitCode = 1
} finally {
  await closeDatabase()
}
