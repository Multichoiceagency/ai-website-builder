import { businessProfileSchema, type BusinessProfile } from '@platform/schemas'

/**
 * The evaluation corpus.
 *
 * Five real-shaped business profiles, three Dutch and two English, across five
 * industries and three levels of discovery completeness. They are committed to
 * the repo rather than generated, because a benchmark whose inputs change
 * between runs measures nothing.
 *
 * Every fixture goes through `businessProfileSchema` at module load, so a
 * fixture that has drifted from the schema fails loudly at startup instead of
 * producing a run whose numbers quietly mean something else.
 *
 * Deliberate properties of the corpus, each of which a check downstream relies
 * on:
 *
 * - `sloopwerk-kramer` has a `foundedYear` and a review count. A model that
 *   writes "sinds 1974" is *correct*; one that writes "sinds 1968" is not, and
 *   only a corpus that contains a real year can tell those two apart.
 * - `zuiderlicht-fysio` has NO founded year, NO reviews and a thin
 *   description. It is the invented-fact trap: there is nothing here to
 *   support a number, so every number in the output is a finding.
 * - `northgate-legal` and `harbour-roast` carry `prohibitedWords`, which the
 *   system prompt promises to respect and which nothing in the platform
 *   currently verifies.
 * - `meridian-payroll` is the only profile with a long service list, so it is
 *   the one where a model has enough raw material to be specific and the
 *   deterministic composer's three-service truncation is visible.
 */

/** Shared defaults so each fixture below states only what makes it different. */
function profile(input: unknown): BusinessProfile {
  return businessProfileSchema.parse(input)
}

export interface EvalFixture {
  id: string
  /** One line describing what this fixture is here to expose. */
  purpose: string
  locale: string
  goal: string
  profile: BusinessProfile
}

const sloopwerkKramer = profile({
  company: {
    name: 'Sloopwerk Kramer',
    legalName: 'Sloopwerk Kramer B.V.',
    description:
      'Sloopwerk Kramer voert sloop- en asbestsaneringsprojecten uit in Noord-Holland. Het bedrijf werd in 1974 opgericht door Jan Kramer en wordt inmiddels geleid door de tweede generatie. We werken voor woningcorporaties, aannemers en particulieren. Alle asbestwerkzaamheden worden uitgevoerd onder SC-530 procescertificaat. Ons materieel bestaat uit zes sloopkranen en een eigen puinbreker, zodat we het meeste puin op locatie kunnen verwerken.',
    shortDescription: 'Sloop en asbestsanering in Noord-Holland, sinds 1974.',
    industry: 'contractor',
    categories: ['Sloopbedrijf', 'Asbestsanering'],
    foundedYear: 1974,
  },
  locations: [
    {
      label: 'Hoofdvestiging',
      street: 'Industrieweg 42',
      postalCode: '1704 AA',
      city: 'Heerhugowaard',
      region: 'Noord-Holland',
      country: 'Nederland',
      hours: [
        { day: 'mon', opens: '07:00', closes: '17:00' },
        { day: 'fri', opens: '07:00', closes: '16:00' },
        { day: 'sat', closed: true },
      ],
    },
  ],
  contact: {
    phone: '+31 72 574 2210',
    email: 'info@sloopwerkkramer.nl',
    website: 'https://www.sloopwerkkramer.nl',
  },
  services: [
    {
      name: 'Totaalsloop',
      description:
        'Volledige sloop van woningen, schuren en bedrijfspanden, inclusief afvoer en verwerking van het puin.',
      prominence: 0.9,
    },
    {
      name: 'Asbestsanering',
      description:
        'Inventarisatie en verwijdering van asbest onder SC-530 certificaat, met vrijgavemeting door een onafhankelijk laboratorium.',
      prominence: 0.85,
    },
    {
      name: 'Betonboren en zagen',
      description: 'Sparingen, doorvoeren en wandopeningen in beton, ook binnen bestaande bebouwing.',
      prominence: 0.6,
    },
    {
      name: 'Puinrecycling',
      description: 'Breken en keuren van puin op locatie tot gecertificeerd menggranulaat.',
      prominence: 0.5,
    },
  ],
  brand: {
    primaryColor: '#1f3a5f',
    colors: ['#1f3a5f', '#e8590c'],
    fonts: ['Barlow', 'Inter'],
    tone: 'professional',
    adjectives: ['nuchter', 'degelijk', 'ervaren'],
    audience: 'Woningcorporaties, aannemers en particuliere opdrachtgevers in Noord-Holland.',
    positioning: 'De sloper die aannemers bellen als het krap zit en het toch netjes moet.',
    prohibitedWords: [],
  },
  reviews: [
    { author: 'B. Visser', rating: 5, text: 'Netjes opgeleverd, geen gedoe.', source: 'google' },
    { author: 'Woonstichting Alkmaar', rating: 4, text: 'Prima communicatie tijdens het project.', source: 'google' },
    { author: 'M. de Groot', rating: 5, text: 'Snel geschakeld toen wij vastzaten.', source: 'google' },
  ],
  socials: [],
  media: [],
  locale: 'nl',
  sources: [{ source: 'website', reference: 'https://www.sloopwerkkramer.nl', confidence: 0.9 }],
  crawledUrls: ['https://www.sloopwerkkramer.nl', 'https://www.sloopwerkkramer.nl/diensten'],
  warnings: [],
})

const zuiderlichtFysio = profile({
  company: {
    name: 'Zuiderlicht Fysiotherapie',
    legalName: '',
    description: 'Fysiotherapiepraktijk in Tilburg-Zuid. Behandeling op afspraak, ook aan huis.',
    shortDescription: 'Fysiotherapie in Tilburg-Zuid.',
    industry: 'healthcare',
    categories: ['Fysiotherapie'],
  },
  locations: [
    {
      label: '',
      street: 'Ringbaan Zuid 118',
      postalCode: '5021 LT',
      city: 'Tilburg',
      region: 'Noord-Brabant',
      country: 'Nederland',
      hours: [],
    },
  ],
  contact: { phone: '', email: 'praktijk@zuiderlicht-fysio.nl', website: 'https://zuiderlicht-fysio.nl' },
  services: [
    { name: 'Algemene fysiotherapie', description: '', prominence: 0.7 },
    { name: 'Fysiotherapie aan huis', description: '', prominence: 0.5 },
  ],
  brand: {
    primaryColor: '',
    colors: [],
    fonts: [],
    tone: 'reassuring',
    adjectives: [],
    audience: '',
    positioning: '',
    prohibitedWords: [],
  },
  reviews: [],
  socials: [],
  media: [],
  locale: 'nl',
  sources: [{ source: 'website', reference: 'https://zuiderlicht-fysio.nl', confidence: 0.4 }],
  crawledUrls: ['https://zuiderlicht-fysio.nl'],
  warnings: ['Geen openingstijden gevonden.', 'Geen telefoonnummer gevonden.'],
})

const bakkerijVanElst = profile({
  company: {
    name: 'Bakkerij van Elst',
    legalName: 'Bakkerij van Elst VOF',
    description:
      'Ambachtelijke bakkerij in het centrum van Zutphen. We bakken elke ochtend vanaf half vijf, met desem dat we zelf onderhouden. Naast brood maken we banket op bestelling: taarten, gebak en het Zutphense krentenbrood waar de winkel om bekendstaat. De winkel heeft een leestafel met koffie.',
    shortDescription: 'Ambachtelijk brood en banket uit Zutphen.',
    industry: 'restaurant',
    categories: ['Bakkerij', 'Banketbakkerij'],
  },
  locations: [
    {
      label: 'Winkel',
      street: 'Beukerstraat 17',
      postalCode: '7201 LE',
      city: 'Zutphen',
      region: 'Gelderland',
      country: 'Nederland',
      hours: [
        { day: 'tue', opens: '08:00', closes: '17:30' },
        { day: 'sat', opens: '08:00', closes: '16:00' },
        { day: 'sun', closed: true },
        { day: 'mon', closed: true },
      ],
    },
  ],
  contact: { phone: '+31 575 512 990', email: 'winkel@bakkerijvanelst.nl', website: 'https://bakkerijvanelst.nl' },
  services: [
    { name: 'Desembrood', description: 'Dagelijks vers, met eigen desem.', prominence: 0.9 },
    { name: 'Taarten op bestelling', description: 'Voor verjaardagen en bruiloften, minimaal drie dagen vooruit.', prominence: 0.7 },
    { name: 'Krentenbrood', description: 'Het Zutphense krentenbrood, ook met amandelspijs.', prominence: 0.8 },
  ],
  brand: {
    primaryColor: '#7c4a21',
    colors: ['#7c4a21', '#e9d8c3'],
    fonts: ['Fraunces', 'Inter'],
    tone: 'friendly',
    adjectives: ['ambachtelijk', 'warm', 'lokaal'],
    audience: 'Inwoners van Zutphen en dagjesmensen in de binnenstad.',
    positioning: 'De bakker waar mensen omlopen voor het brood.',
    prohibitedWords: ['artisanaal', 'beleving'],
  },
  reviews: [{ author: 'H. Nijhof', rating: 5, text: 'Beste krentenbrood van de stad.', source: 'google' }],
  socials: [],
  media: [],
  locale: 'nl',
  sources: [{ source: 'google_business_profile', confidence: 0.8 }],
  crawledUrls: ['https://bakkerijvanelst.nl'],
  warnings: [],
})

const northgateLegal = profile({
  company: {
    name: 'Northgate Legal',
    legalName: 'Northgate Legal LLP',
    description:
      'Northgate Legal is an employment law practice in Leeds acting for employers. We advise on contracts, restructures, TUPE transfers and tribunal defence. The practice is four solicitors and two paralegals, which means the person who takes your call is the person who handles the matter. We publish fixed fees for the work that can be priced.',
    shortDescription: 'Employment law for employers, Leeds.',
    industry: 'legal',
    categories: ['Employment law', 'Solicitors'],
    foundedYear: 2011,
  },
  locations: [
    {
      label: 'Office',
      street: '14 Park Row',
      postalCode: 'LS1 5HD',
      city: 'Leeds',
      region: 'West Yorkshire',
      country: 'United Kingdom',
      hours: [{ day: 'mon', opens: '09:00', closes: '17:30' }],
    },
  ],
  contact: { phone: '+44 113 210 4400', email: 'hello@northgatelegal.co.uk', website: 'https://northgatelegal.co.uk' },
  services: [
    { name: 'Tribunal defence', description: 'Representation for employers at employment tribunal.', prominence: 0.9 },
    { name: 'Contracts and handbooks', description: 'Drafting and reviewing employment documentation.', prominence: 0.7 },
    { name: 'Restructures and redundancy', description: 'Process design and consultation support.', prominence: 0.8 },
    { name: 'TUPE transfers', description: 'Advice on transfers of undertakings, both sides of a deal.', prominence: 0.6 },
  ],
  brand: {
    primaryColor: '#12304a',
    colors: ['#12304a'],
    fonts: ['Source Serif 4', 'Inter'],
    tone: 'professional',
    adjectives: ['direct', 'commercial', 'unfussy'],
    audience: 'HR directors and owner-managers of businesses with 20 to 500 staff.',
    positioning: 'Employment advice that tells you the commercial answer, not just the legal one.',
    prohibitedWords: ['bespoke', 'solutions', 'passionate'],
  },
  reviews: [
    { author: 'Operations Director, manufacturing', rating: 5, text: 'Clear advice under time pressure.', source: 'google' },
    { author: 'A. Whitfield', rating: 5, text: 'Fixed fee was honoured exactly.', source: 'google' },
  ],
  socials: [],
  media: [],
  locale: 'en',
  sources: [{ source: 'website', reference: 'https://northgatelegal.co.uk', confidence: 0.85 }],
  crawledUrls: ['https://northgatelegal.co.uk', 'https://northgatelegal.co.uk/fees'],
  warnings: [],
})

const meridianPayroll = profile({
  company: {
    name: 'Meridian Payroll',
    legalName: 'Meridian Payroll Services Ltd',
    description:
      'Meridian Payroll runs payroll for small and mid-sized employers across the UK. We take on the whole cycle: starters and leavers, RTI submissions, pension auto-enrolment, statutory pay and year end. Clients send us changes however suits them, including a spreadsheet or an email, and we do the rest. Every client has a named payroll administrator and a named backup, so nothing stops when someone is on leave.',
    shortDescription: 'Outsourced payroll for UK employers.',
    industry: 'accounting',
    categories: ['Payroll bureau', 'Bookkeeping'],
  },
  locations: [
    {
      label: 'Head office',
      street: 'Unit 6, Waterside Court',
      postalCode: 'BS1 6UZ',
      city: 'Bristol',
      region: 'Bristol',
      country: 'United Kingdom',
      hours: [{ day: 'mon', opens: '08:30', closes: '17:00' }],
    },
  ],
  contact: { phone: '+44 117 456 0900', email: 'team@meridianpayroll.co.uk', website: 'https://meridianpayroll.co.uk' },
  services: [
    { name: 'Weekly and monthly payroll', description: 'Full processing cycle with payslips and reports.', prominence: 0.95 },
    { name: 'RTI submissions', description: 'FPS and EPS filed to HMRC on time, every period.', prominence: 0.8 },
    { name: 'Pension auto-enrolment', description: 'Assessment, uploads and re-enrolment handled for you.', prominence: 0.8 },
    { name: 'Statutory pay', description: 'Sick, maternity, paternity and shared parental pay calculated correctly.', prominence: 0.6 },
    { name: 'Year end', description: 'P60s, P11Ds and the final submission for the tax year.', prominence: 0.7 },
    { name: 'Payroll takeover', description: 'Migration from your current provider mid-year, including parallel runs.', prominence: 0.75 },
    { name: 'CIS returns', description: 'Subcontractor verification and monthly CIS returns.', prominence: 0.5 },
  ],
  brand: {
    primaryColor: '#0f5257',
    colors: ['#0f5257', '#f2a541'],
    fonts: ['Inter'],
    tone: 'reassuring',
    adjectives: ['dependable', 'plain-spoken', 'responsive'],
    audience: 'Finance managers and business owners with 5 to 250 employees.',
    positioning: 'Payroll that a finance manager stops having to think about.',
    prohibitedWords: ['revolutionise', 'game-changing'],
  },
  reviews: [
    { author: 'Finance Manager, care sector', rating: 5, text: 'Three years, never a late submission.', source: 'google' },
    { author: 'J. Adeyemi', rating: 4, text: 'Took over our payroll mid-year without a hitch.', source: 'google' },
  ],
  socials: [],
  media: [],
  locale: 'en',
  sources: [{ source: 'website', reference: 'https://meridianpayroll.co.uk', confidence: 0.8 }],
  crawledUrls: ['https://meridianpayroll.co.uk'],
  warnings: [],
})

export const EVAL_FIXTURES: EvalFixture[] = [
  {
    id: 'sloopwerk-kramer',
    purpose: 'Rich NL profile with a real founded year — separates a correct number from an invented one.',
    locale: 'nl',
    goal: 'home',
    profile: sloopwerkKramer,
  },
  {
    id: 'zuiderlicht-fysio',
    purpose: 'Sparse NL profile with no year, no reviews, no phone — every number in the output is a finding.',
    locale: 'nl',
    goal: 'home',
    profile: zuiderlichtFysio,
  },
  {
    id: 'bakkerij-van-elst',
    purpose: 'NL retail with brand prohibited words the system prompt promises to respect.',
    locale: 'nl',
    goal: 'home',
    profile: bakkerijVanElst,
  },
  {
    id: 'northgate-legal',
    purpose: 'EN professional services, regulated sector, prohibited words, real founded year.',
    locale: 'en',
    goal: 'home',
    profile: northgateLegal,
  },
  {
    id: 'meridian-payroll',
    purpose: 'EN B2B with seven services — the most raw material available to be specific with.',
    locale: 'en',
    goal: 'home',
    profile: meridianPayroll,
  },
]
