<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { BusinessProfile, DiscoveryResult, GenerationResult, SiteTemplate } from '@platform/schemas'

/**
 * Connect your business → we read it → we build the website (§80, §81).
 *
 * Discovery and generation are two visible steps with a review in between,
 * because the user must be able to correct what we found *before* a site is
 * built on it. Between the review and the build sits an optional starting
 * point: a template contributes a style direction and a preferred section
 * recipe, and nothing else — no markup, no assets (ADR-0003). "Let the platform
 * choose" stays the default, so the flow is unchanged for anyone who has no
 * opinion about the design.
 *
 * Progress is phrased as business phases, never as implementation detail.
 */
definePageMeta({ layout: 'default' })

const api = useApi()
const route = useRoute()
const config = useRuntimeConfig()
const activeSiteId = useActiveSiteId()
const { busy: connectingGoogle, error: connectGoogleError, connect: startGoogleConnect } = useGoogleConnect()

type Step = 'input' | 'discovering' | 'review' | 'template' | 'generating' | 'done'

const step = ref<Step>('input')
const website = ref('')
const businessName = ref('')
const city = ref('')
const locale = ref('nl')
const style = ref<'auto' | 'minimal' | 'modern' | 'premium' | 'bold' | 'editorial'>('auto')
const publishNow = ref(false)
/** Logo for the client dashboard sidebar — personalises chrome after onboard. */
const dashboardLogoUrl = ref('')

const profile = ref<BusinessProfile | null>(null)
const discovery = ref<DiscoveryResult | null>(null)
const generated = ref<GenerationResult | null>(null)
const error = ref('')
const phase = ref('')
const googleCallbackStatus = ref('')

const { data: capabilities, refresh: refreshCapabilities } = await useAsyncData('capabilities', () =>
  api.get<{
    copyProviders: { id: string; available: boolean }[]
    integrations: {
      id: string
      name: string
      connected: boolean
      available: boolean
      reason: string
    }[]
  }>('/api/v1/onboarding/capabilities'),
)

const copyModel = computed(
  () => capabilities.value?.copyProviders.find((provider) => provider.available)?.id ?? 'none',
)
const google = computed(() => capabilities.value?.integrations.find((entry) => entry.id === 'google_business_profile'))

const canDiscover = computed(() => Boolean(website.value.trim() || businessName.value.trim()))

// region Starting point

const templateId = ref<string | null>(null)
const chosenTemplate = ref<SiteTemplate | null>(null)

/**
 * Adopt a template. It contributes two things and nothing else: the style
 * direction, and a preferred section per role. Both are preferences — the
 * performance budget the style earns still decides what may actually be
 * placed, so a heavy template degrades rather than overriding the budget.
 */
async function adoptTemplate(id: string | null) {
  templateId.value = id
  if (!id) {
    chosenTemplate.value = null
    return
  }

  try {
    const detail = await api.get<{ template: SiteTemplate }>(`/api/v1/templates/${id}`)
    chosenTemplate.value = detail.template
    style.value = detail.template.style[0] ?? 'modern'
  } catch {
    // A template that cannot be read is not worth blocking a build over.
    chosenTemplate.value = null
    templateId.value = null
  }
}

// Arriving from the template store with a choice already made, or returning
// from the Google OAuth callback (`?google=connected` / an error token).
onMounted(() => {
  const preselected = route.query.template
  if (typeof preselected === 'string' && preselected) void adoptTemplate(preselected)

  const googleStatus = route.query.google
  if (typeof googleStatus === 'string' && googleStatus) {
    googleCallbackStatus.value = googleStatus
    if (googleStatus === 'connected') void refreshCapabilities()
  }
})

async function connectGoogle() {
  await startGoogleConnect('/onboarding')
}

// endregion

/**
 * Style is a picture, so it is picked from pictures. Hints are deliberately
 * two or three words — a tile is a glance, not a paragraph.
 */
const STYLES: { value: string; label: string; icon: string; hint: string }[] = [
  { value: 'auto', label: 'Choose for me', icon: 'style-auto', hint: 'From your brand' },
  { value: 'modern', label: 'Modern', icon: 'style-modern', hint: 'Clean, generous' },
  { value: 'minimal', label: 'Minimal', icon: 'style-minimal', hint: 'Quiet, typographic' },
  { value: 'premium', label: 'Premium', icon: 'style-premium', hint: 'Warm, restrained' },
  { value: 'bold', label: 'Bold', icon: 'style-bold', hint: 'High contrast' },
  { value: 'editorial', label: 'Editorial', icon: 'style-editorial', hint: 'Magazine rhythm' },
]

function setStyle(value: string | string[]) {
  if (typeof value === 'string') style.value = value as typeof style.value
}

/**
 * Phase labels advance on a timer while the request is in flight. They describe
 * work that is genuinely happening — the request really is crawling, parsing
 * and planning — rather than faking a progress bar over an instant call.
 */
function runPhases(labels: string[], done: () => boolean) {
  let index = 0
  phase.value = labels[0]!
  const timer = setInterval(() => {
    if (done() || index >= labels.length - 1) {
      clearInterval(timer)
      return
    }
    index += 1
    phase.value = labels[index]!
  }, 900)
  return () => clearInterval(timer)
}

async function discover() {
  error.value = ''
  step.value = 'discovering'

  let finished = false
  const stop = runPhases(
    ['Reading your website', 'Understanding your business', 'Finding your services', 'Analyzing your brand'],
    () => finished,
  )

  try {
    const result = await api.post<DiscoveryResult>('/api/v1/onboarding/discover', {
      website: website.value.trim() || undefined,
      businessName: businessName.value.trim() || undefined,
      city: city.value.trim() || undefined,
      locale: locale.value,
      socialUrls: [],
      maxPages: 8,
    })

    discovery.value = result
    profile.value = result.profile
    if (businessName.value.trim()) profile.value.company.name = businessName.value.trim()
    if (result.profile.brand.logo && !dashboardLogoUrl.value) {
      dashboardLogoUrl.value = result.profile.brand.logo
    }
    step.value = 'review'
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'Could not read that business.'
    step.value = 'input'
  } finally {
    finished = true
    stop()
  }
}

/** Persist logo + discovered brand colours onto the workspace dashboard chrome. */
async function saveDashboardBranding() {
  if (!profile.value) return
  const primary =
    profile.value.brand.primaryColor ||
    profile.value.brand.colors.find((c) => /^#[0-9a-fA-F]{6}$/.test(c)) ||
    undefined
  const accent = profile.value.brand.colors.find((c) => c !== primary && /^#[0-9a-fA-F]{6}$/.test(c))
  const logo = dashboardLogoUrl.value.trim() || profile.value.brand.logo || null
  if (logo) profile.value.brand.logo = logo

  try {
    await api.put('/api/v1/agency/white-label', {
      brandName: profile.value.company.name || null,
      logoUrl: logo,
      ...(primary ? { colorPrimary: primary } : {}),
      ...(accent ? { colorAccent: accent } : {}),
    })
    await refreshNuxtData(`dashboard:branding:${useActiveTenantId().value ?? 'none'}`)
  } catch {
    // Branding must never block website generation.
  }
}

async function generate() {
  if (!profile.value) return

  error.value = ''
  step.value = 'generating'

  let finished = false
  const stop = runPhases(
    [
      'Planning your website',
      'Choosing your sections',
      'Writing your pages',
      'Optimizing for search',
      'Running quality checks',
      'Preparing your preview',
    ],
    () => finished,
  )

  try {
    await saveDashboardBranding()

    const result = await api.post<GenerationResult>('/api/v1/onboarding/generate', {
      profile: profile.value,
      siteName: profile.value.company.name,
      style: style.value,
      maxPerformanceClass: 'B',
      publish: publishNow.value,
      // Id only — the recipe is re-resolved against the registry server-side.
      templateId: templateId.value ?? undefined,
    })

    generated.value = result
    activeSiteId.value = result.siteId
    // Refresh the shell site list so the new site appears in the picker.
    await refreshNuxtData('shell:sites')

    // Drafts are not on the public storefront yet — land in the editor where
    // the real blocks render. That is the place to look before publishing.
    const editorPath = `/pages/${result.homePageId || result.pageIds[0]}`
    if (result.homePageId || result.pageIds[0]) {
      await navigateTo(editorPath)
      return
    }

    step.value = 'done'
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'Could not build the website.'
    step.value = 'template'
  } finally {
    finished = true
    stop()
  }
}

function removeService(index: number) {
  if (!profile.value) return
  profile.value.services = profile.value.services.filter((_, i) => i !== index)
}

const previewUrl = computed(() => {
  if (!generated.value) return ''
  // Prefer the hostname the API actually registered — client-side slugify of
  // the display name drifts when uniqueSlug appends `-2` for collisions.
  const host = generated.value.previewHostname || `${generated.value.siteSlug}.localhost`
  try {
    const base = new URL(config.public.storefrontUrl)
    return `${base.protocol}//${host}${base.port ? `:${base.port}` : ''}`
  } catch {
    return `http://${host}:3001`
  }
})

const editorUrl = computed(() =>
  generated.value ? `/pages/${generated.value.homePageId || generated.value.pageIds[0]}` : '',
)
</script>

<template>
  <div>
    <UiPageHeader
      title="Build a website"
      description="Give us the business and we read it, plan the site, and write the pages."
    />

    <p v-if="error" class="mb-5 rounded-lg bg-danger-soft px-3 py-2 text-[0.8125rem] text-danger" role="alert">
      {{ error }}
    </p>

    <!-- 1 — input --------------------------------------------------------- -->
    <div v-if="step === 'input'" class="grid gap-5 lg:grid-cols-[1.4fr_1fr] lg:items-start">
      <UiCard>
        <form class="flex flex-col gap-4" @submit.prevent="canDiscover && discover()">
          <UiField
            v-slot="{ id, describedBy }"
            label="Business website"
            help="The richest source. We read the pages, the structured data and the social links."
          >
            <UiInput :id="id" v-model="website" :described-by="describedBy" placeholder="vandijkloodgieters.nl" />
          </UiField>

          <div class="flex items-center gap-3 py-1">
            <span class="h-px flex-1 bg-line" />
            <span class="text-[0.75rem] text-faint">or, if there is no website yet</span>
            <span class="h-px flex-1 bg-line" />
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <UiField v-slot="{ id }" label="Business name">
              <UiInput :id="id" v-model="businessName" placeholder="Van Dijk Loodgieters" />
            </UiField>
            <UiField v-slot="{ id }" label="City">
              <UiInput :id="id" v-model="city" placeholder="Rotterdam" />
            </UiField>
          </div>

          <UiField v-slot="{ id }" label="Language">
            <UiSelect
              :id="id"
              v-model="locale"
              :options="[
                { label: 'Nederlands', value: 'nl' },
                { label: 'English', value: 'en' },
              ]"
            />
          </UiField>

          <UiButton type="submit" variant="primary" size="lg" :disabled="!canDiscover" arrow>Read this business</UiButton>
        </form>
      </UiCard>

      <div class="flex flex-col gap-3">
        <UiCard>
          <h2 class="mb-3 text-[0.8125rem] font-semibold uppercase tracking-[0.06em] text-faint">Connect a source</h2>

          <div class="flex items-start gap-3 rounded-lg border border-line p-3">
            <span class="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-md bg-sunken">
              <UiGoogleMark class="h-5 w-5" />
            </span>
            <div class="min-w-0">
              <p class="text-[0.8125rem] font-semibold text-ink">{{ google?.name }}</p>
              <p class="mt-0.5 text-[0.75rem] leading-relaxed text-soft">
                {{ google?.connected ? google.reason : google?.available ? 'Ready to connect.' : google?.reason }}
              </p>
              <UiBadge v-if="google?.connected" tone="positive" class="mt-2">Connected</UiBadge>
              <UiButton
                v-else-if="google?.available"
                size="sm"
                class="mt-2"
                :loading="connectingGoogle"
                @click="connectGoogle"
              >
                <UiGoogleMark class="h-3.5 w-3.5" />
                Connect Google
              </UiButton>
              <UiBadge v-else tone="warning" class="mt-2">Needs setup</UiBadge>
              <p
                v-if="connectGoogleError || (googleCallbackStatus && googleCallbackStatus !== 'connected')"
                class="mt-2 text-[0.75rem] text-danger"
                role="alert"
              >
                {{ connectGoogleError || `Google connection failed: ${googleCallbackStatus}` }}
              </p>
              <p v-else-if="googleCallbackStatus === 'connected'" class="mt-2 text-[0.75rem] text-positive" role="status">
                Google is connected.
              </p>
            </div>
          </div>

          <p class="mt-3 text-[0.75rem] leading-relaxed text-faint">
            Google Business Profile adds verified hours, reviews, categories and photos. Everything below works
            without it.
          </p>
        </UiCard>

        <UiCard>
          <h2 class="mb-2 text-[0.8125rem] font-semibold uppercase tracking-[0.06em] text-faint">Writing</h2>
          <p class="text-[0.8125rem] leading-relaxed text-soft">
            Copy is written by
            <strong class="text-ink">{{ copyModel }}</strong>.
            <span v-if="copyModel === 'deterministic-composer'">
              It only writes what we actually found — add an AI provider key for richer prose.
            </span>
          </p>
        </UiCard>
      </div>
    </div>

    <!-- 2 / 4 — working ---------------------------------------------------- -->
    <UiCard v-else-if="step === 'discovering' || step === 'generating'">
      <div class="flex flex-col items-center gap-4 py-14 text-center">
        <span class="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-brand" aria-hidden="true" />
        <p class="text-heading font-semibold text-ink" role="status" aria-live="polite">{{ phase }}…</p>
        <p class="max-w-sm text-[0.8125rem] text-soft">
          This usually takes a few seconds. We only read pages that allow automated access.
        </p>
      </div>
    </UiCard>

    <!-- 3 — review --------------------------------------------------------- -->
    <div v-else-if="step === 'review' && profile" class="grid gap-5 lg:grid-cols-[1.4fr_1fr] lg:items-start">
      <UiCard>
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-heading font-semibold text-ink">What we found</h2>
          <UiBadge tone="positive">{{ discovery?.pagesCrawled ?? 0 }} pages read</UiBadge>
        </div>

        <div class="flex flex-col gap-4">
          <UiField v-slot="{ id }" label="Business name">
            <UiInput :id="id" v-model="profile.company.name" />
          </UiField>

          <UiField v-slot="{ id, describedBy }" label="What the business does" help="This becomes your homepage intro.">
            <UiTextarea :id="id" v-model="profile.company.shortDescription" :described-by="describedBy" :rows="3" />
          </UiField>

          <div class="grid gap-4 sm:grid-cols-2">
            <UiField v-slot="{ id }" label="Phone">
              <UiInput :id="id" v-model="profile.contact.phone" />
            </UiField>
            <UiField v-slot="{ id }" label="E-mail">
              <UiInput :id="id" v-model="profile.contact.email" />
            </UiField>
          </div>

          <UiField
            v-slot="{ id, describedBy }"
            label="Dashboard logo"
            help="Shown in the sidebar of your workspace. Paste a URL to your logo (SVG or PNG)."
          >
            <UiInput
              :id="id"
              v-model="dashboardLogoUrl"
              :described-by="describedBy"
              placeholder="https://…/logo.svg"
            />
            <div
              v-if="dashboardLogoUrl.trim()"
              class="mt-3 flex items-center gap-3 rounded-lg border border-line bg-sunken px-3 py-2.5"
            >
              <img
                :src="dashboardLogoUrl.trim()"
                alt=""
                class="h-9 max-w-[9rem] object-contain"
              />
              <p class="text-[0.75rem] text-soft">Sidebar preview</p>
            </div>
          </UiField>

          <div>
            <p class="mb-2 text-[0.8125rem] font-medium text-soft">
              Services ({{ profile.services.length }}) — these become sections and their own pages
            </p>
            <ul v-if="profile.services.length" class="flex flex-col gap-1.5">
              <li
                v-for="(service, index) in profile.services"
                :key="index"
                class="flex items-center gap-2 rounded-lg border border-line px-3 py-2"
              >
                <span class="min-w-0 flex-1 truncate text-[0.8125rem] text-ink">{{ service.name }}</span>
                <button
                  type="button"
                  class="grid h-6 w-6 shrink-0 place-items-center rounded text-faint transition-colors hover:text-danger"
                  aria-label="Remove service"
                  @click="removeService(index)"
                >&times;</button>
              </li>
            </ul>
            <p v-else class="text-[0.8125rem] text-faint">None found — we will use a general layout.</p>
          </div>
        </div>
      </UiCard>

      <div class="flex flex-col gap-3">
        <UiCard>
          <h2 class="mb-3 text-[0.8125rem] font-semibold uppercase tracking-[0.06em] text-faint">Style</h2>

          <!-- The heading is the visible label; the legend repeats it for
               assistive tech, because a radio group needs a name of its own. -->
          <UiOptionGrid
            label="Style"
            hide-label
            size="md"
            :options="STYLES"
            :model-value="style"
            @update:model-value="setStyle"
          />
        </UiCard>

        <UiCard v-if="profile.brand.colors.length">
          <h2 class="mb-3 text-[0.8125rem] font-semibold uppercase tracking-[0.06em] text-faint">Brand colours found</h2>
          <div class="flex flex-wrap gap-1.5">
            <span
              v-for="color in profile.brand.colors.slice(0, 8)"
              :key="color"
              class="h-7 w-7 rounded-md border border-line"
              :style="{ backgroundColor: color }"
              :title="color"
            />
          </div>
          <p class="mt-3 text-[0.75rem] leading-relaxed text-faint">
            We only adopt a colour if white text on it passes contrast checks.
          </p>
        </UiCard>

        <UiCard v-if="profile.warnings.length">
          <h2 class="mb-2 text-[0.8125rem] font-semibold uppercase tracking-[0.06em] text-faint">Notes</h2>
          <ul class="flex flex-col gap-1.5">
            <li v-for="warning in profile.warnings.slice(0, 5)" :key="warning" class="text-[0.75rem] leading-relaxed text-soft">
              • {{ warning }}
            </li>
          </ul>
        </UiCard>

        <UiCard>
          <p class="text-[0.8125rem] leading-relaxed text-soft">
            Next you can pick a starting point — a look and a set of sections to build from — or let us choose one.
          </p>

          <div class="mt-4 flex gap-2">
            <UiButton @click="step = 'input'">Back</UiButton>
            <UiButton variant="primary" size="lg" class="flex-1" arrow @click="step = 'template'">
              Choose a starting point
            </UiButton>
          </div>
        </UiCard>
      </div>
    </div>

    <!-- 4 — starting point -------------------------------------------------- -->
    <div v-else-if="step === 'template'" class="grid gap-5">
      <UiCard>
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div class="min-w-0">
            <h2 class="text-heading font-semibold text-ink">Choose a starting point</h2>
            <p class="mt-1 max-w-2xl text-[0.8125rem] leading-relaxed text-soft">
              A starting point sets the look and which sections we reach for first. It never changes what your website
              says, and it can never make your site slower than its budget allows — anything too heavy quietly steps
              down to the best section that fits.
            </p>
          </div>

          <div v-if="chosenTemplate" class="flex shrink-0 items-center gap-2">
            <UiBadge tone="brand">{{ chosenTemplate.title }}</UiBadge>
            <UiBadge>{{ chosenTemplate.style[0] }}</UiBadge>
          </div>
          <UiBadge v-else>Platform's choice</UiBadge>
        </div>
      </UiCard>

      <UiCard :padded="false" class="p-5">
        <TemplatePicker
          :model-value="templateId"
          cache-key="onboarding-templates"
          max-performance-class="C"
          @update:model-value="adoptTemplate"
        />
      </UiCard>

      <UiCard>
        <div class="flex flex-wrap items-center justify-between gap-4">
          <label class="flex items-start gap-3">
            <UiSwitch v-model="publishNow" label="Publish immediately" />
            <span class="min-w-0">
              <span class="block text-[0.8125rem] font-medium text-ink">Publish immediately</span>
              <span class="block text-[0.75rem] leading-relaxed text-soft">
                Off by default. Look at it first, then publish.
              </span>
            </span>
          </label>

          <div class="flex gap-2">
            <UiButton @click="step = 'review'">Back</UiButton>
            <UiButton variant="primary" size="lg" arrow @click="generate">Build my website</UiButton>
          </div>
        </div>
      </UiCard>
    </div>

    <!-- 5 — done ----------------------------------------------------------- -->
    <div v-else-if="step === 'done' && generated" class="grid gap-5 lg:grid-cols-[1.4fr_1fr] lg:items-start">
      <UiCard>
        <div class="mb-4 flex items-center gap-2">
          <span class="grid h-7 w-7 place-items-center rounded-full bg-positive-soft text-positive" aria-hidden="true">✓</span>
          <h2 class="text-heading font-semibold text-ink">{{ generated.siteName }} is ready</h2>
        </div>

        <p class="mb-5 text-sm text-soft">
          {{ generated.pageIds.length }} pages, written by {{ generated.model }}.
          {{ generated.published ? 'They are live.' : 'They are drafts until you publish them.' }}
        </p>

        <ul class="flex flex-col divide-y divide-line border-y border-line">
          <li v-for="(page, index) in generated.plan.pages" :key="page.path" class="flex items-center gap-3 py-2.5">
            <span class="min-w-0 flex-1">
              <span class="block truncate text-[0.8125rem] font-medium text-ink">{{ page.title }}</span>
              <span class="block truncate text-[0.75rem] text-faint">{{ page.path }} · {{ page.blocks.length }} sections</span>
            </span>
            <UiButton size="sm" :to="`/pages/${generated.pageIds[index]}`">Edit</UiButton>
          </li>
        </ul>

        <div class="mt-5 flex flex-wrap gap-2">
          <UiButton variant="primary" :to="editorUrl">Open in editor</UiButton>
          <UiButton v-if="generated.published" :to="previewUrl" target="_blank" external>Open the website</UiButton>
          <UiButton :to="`/sites/${generated.siteId}`">Manage pages</UiButton>
        </div>
      </UiCard>

      <UiCard>
        <h2 class="mb-4 text-[0.8125rem] font-semibold uppercase tracking-[0.06em] text-faint">Quality check</h2>

        <div class="grid grid-cols-2 gap-3">
          <div v-for="(report, key) in generated.quality" :key="key" class="rounded-lg border border-line px-3 py-2.5">
            <p class="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-faint">{{ key }}</p>
            <p
              class="mt-1 text-[1.5rem] font-semibold leading-none tabular-nums"
              :class="report.score >= 90 ? 'text-positive' : report.score >= 70 ? 'text-warning' : 'text-danger'"
            >
              {{ report.score }}
            </p>
          </div>
        </div>

        <div class="mt-4 flex flex-col gap-1.5">
          <template v-for="(report, key) in generated.quality" :key="`issues-${key}`">
            <p v-for="issue in report.issues.slice(0, 3)" :key="issue" class="text-[0.75rem] leading-relaxed text-soft">
              • {{ issue }}
            </p>
          </template>
        </div>
      </UiCard>
    </div>
  </div>
</template>
