<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import type {
  BusinessProfile,
  DiscoveryResult,
  GenerationResult,
  OnboardingFunnelStep,
  ProductIntent,
} from '@platform/schemas'
import OnboardShell from '../components/onboarding/OnboardShell.vue'
import OnboardAccount from '../components/onboarding/OnboardAccount.vue'
import OnboardIntent from '../components/onboarding/OnboardIntent.vue'
import OnboardConnect from '../components/onboarding/OnboardConnect.vue'
import OnboardSelectBusiness from '../components/onboarding/OnboardSelectBusiness.vue'
import type { BusinessLocationOption } from '../components/onboarding/OnboardSelectBusiness.vue'
import OnboardScan from '../components/onboarding/OnboardScan.vue'
import OnboardStyle from '../components/onboarding/OnboardStyle.vue'
import OnboardGenerate from '../components/onboarding/OnboardGenerate.vue'
import OnboardPreview from '../components/onboarding/OnboardPreview.vue'
import OnboardDomain from '../components/onboarding/OnboardDomain.vue'
import OnboardGoLive from '../components/onboarding/OnboardGoLive.vue'
import OnboardSeo from '../components/onboarding/OnboardSeo.vue'
import OnboardAds from '../components/onboarding/OnboardAds.vue'
import OnboardCommerce from '../components/onboarding/OnboardCommerce.vue'

/**
 * §80–85 onboarding funnel orchestrator.
 * Thin shell: progress persistence + step routing. Step UI lives under components/onboarding/.
 */
definePageMeta({ layout: 'blank' })

const api = useApi()
const route = useRoute()
const { progress, loading, error: progressError, load, patch, completeStep, skipLater } =
  useOnboardingFunnel()
const { busy: connectingGoogle, error: connectGoogleError, connect: startGoogleConnect } =
  useGoogleConnect()

const error = ref('')
const googleCallbackStatus = ref('')
const selectedLocationId = ref<string | null>(null)
const locations = ref<BusinessLocationOption[]>([])
const loadingLocations = ref(false)
const profile = ref<BusinessProfile | null>(null)
const discovery = ref<DiscoveryResult | null>(null)
const generated = ref<GenerationResult | null>(null)
const publishNow = ref(false)
const website = ref('')
const businessName = ref('')
const city = ref('')
const locale = ref('nl')
const style = ref<'auto' | 'minimal' | 'modern' | 'premium' | 'bold' | 'editorial'>('auto')
const templateId = ref<string | null>(null)
const productIntent = ref<ProductIntent | null>(null)
const connectMode = ref<'google' | 'manual' | null>(null)

const step = computed<OnboardingFunnelStep>(() => progress.value?.step ?? 'account')

const RAIL: OnboardingFunnelStep[] = ['account', 'intent', 'connect', 'scan', 'style', 'generate']

const STEP_COPY: Partial<Record<OnboardingFunnelStep, { title: string; description: string }>> = {
  account: {
    title: 'Your account',
    description: 'Confirm you are signed in, then we set up your first website.',
  },
  intent: {
    title: 'What are you building?',
    description: 'Website, store, or both — this shapes the rest of the funnel.',
  },
  connect: {
    title: 'Connect your business',
    description: 'Link Google Business Profile, or enter a website or name.',
  },
  select: {
    title: 'Select your business',
    description: 'Pick the location we should scan, or confirm the details you entered.',
  },
  scan: {
    title: 'AI scan',
    description: 'We read the business and show what we found before building anything.',
  },
  style: {
    title: 'Choose a style',
    description: 'Pick a direction, or let the platform choose from your brand.',
  },
  generate: {
    title: 'Building your website',
    description: 'Planning pages, writing copy, and preparing a preview.',
  },
  preview: {
    title: 'Preview',
    description: 'Look at the site before you connect a domain or go live.',
  },
  domain: {
    title: 'Connect a domain',
    description: 'Keep the preview URL, or add your own hostname.',
  },
  go_live: {
    title: 'Go live',
    description: 'Publish drafts when you are ready.',
  },
  seo: {
    title: 'SEO connections',
    description: 'Optional — connect search tools, or do this later.',
  },
  ads: {
    title: 'Ads',
    description: 'Optional — connect ad accounts to review performance.',
  },
  commerce: {
    title: 'Store setup',
    description: 'Import products or create them with AI.',
  },
  complete: {
    title: 'You are set',
    description: 'Your workspace is ready. Open the dashboard or keep editing.',
  },
}

const shellTitle = computed(() => STEP_COPY[step.value]?.title ?? 'Onboarding')
const shellDescription = computed(() => STEP_COPY[step.value]?.description ?? '')
const combinedError = computed(() => error.value || progressError.value || connectGoogleError.value)

const { data: capabilities, refresh: refreshCapabilities } = await useAsyncData(
  'onboarding:capabilities',
  () =>
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

const google = computed(() =>
  capabilities.value?.integrations.find((entry) => entry.id === 'google_business_profile'),
)

const showCommerce = computed(
  () => productIntent.value === 'store' || productIntent.value === 'both',
)

function hydrateFromProgress() {
  const p = progress.value
  if (!p) return
  website.value = p.website || website.value
  businessName.value = p.businessName || businessName.value
  city.value = p.city || city.value
  locale.value = p.locale || locale.value
  style.value = p.style || style.value
  templateId.value = p.templateId
  productIntent.value = p.productIntent
  connectMode.value = p.connectMode
}

async function go(from: OnboardingFunnelStep, to: OnboardingFunnelStep, extra = {}) {
  error.value = ''
  await completeStep(from, to, extra)
}

async function skip(from: OnboardingFunnelStep, to: OnboardingFunnelStep) {
  error.value = ''
  await skipLater(from, to)
}

async function onAccountContinue() {
  await go('account', 'intent')
}

async function onIntentContinue(intent: ProductIntent) {
  productIntent.value = intent
  await go('intent', 'connect', { productIntent: intent })
}

async function connectGoogle() {
  connectMode.value = 'google'
  await patch({ connectMode: 'google' })
  await startGoogleConnect('/onboarding?google=connected')
}

async function onConnectContinue() {
  const mode = connectMode.value ?? (google.value?.connected ? 'google' : 'manual')
  connectMode.value = mode
  await go('connect', 'select', {
    connectMode: mode,
    website: website.value.trim(),
    businessName: businessName.value.trim(),
    city: city.value.trim(),
    locale: locale.value,
  })
  if (mode === 'google') await loadLocations()
}

async function loadLocations() {
  loadingLocations.value = true
  try {
    const fresh = await api
      .get<{ locations: { externalId: string; label: string; payload?: Record<string, unknown> }[] }>(
        '/api/v1/integrations/google/business-locations',
      )
      .catch(() => null)
    const cached = fresh
      ? null
      : await api
          .get<{ locations: { externalId: string; label: string; payload?: Record<string, unknown> }[] }>(
            '/api/v1/integrations/google/locations',
          )
          .catch(() => null)
    const list = fresh?.locations ?? cached?.locations ?? []
    locations.value = list.map((entry) => {
      const payload = entry.payload as
        | { storefrontAddress?: { addressLines?: string[] }; title?: string }
        | undefined
      return {
        externalId: entry.externalId,
        label: entry.label || payload?.title || entry.externalId,
        address: payload?.storefrontAddress?.addressLines?.join(', ') ?? '',
      }
    })
    if (locations.value.length === 1) selectedLocationId.value = locations.value[0]!.externalId
  } finally {
    loadingLocations.value = false
  }
}

async function onSelectContinue() {
  const selected = locations.value.find((l) => l.externalId === selectedLocationId.value)
  if (selected && !businessName.value.trim()) businessName.value = selected.label
  await go('select', 'scan', {
    businessName: businessName.value.trim(),
    website: website.value.trim(),
    city: city.value.trim(),
  })
}

async function onScanContinue() {
  const next: OnboardingFunnelStep = showCommerce.value ? 'commerce' : 'style'
  await go('scan', next)
}

async function onCommerceBeforeStyle() {
  await go('commerce', 'style')
}

async function onStyleContinue() {
  await go('style', 'generate', {
    style: style.value,
    templateId: templateId.value,
  })
}

async function onGenerateDone(result: GenerationResult) {
  generated.value = result
  await go('generate', 'preview', { siteId: result.siteId })
}

function onGenerateFailed(message: string) {
  error.value = message
  void patch({ step: 'style' })
}

async function onPreviewContinue() {
  await go('preview', 'domain')
}

async function onDomainContinue() {
  await go('domain', 'go_live')
}

async function onDomainSkip() {
  await skip('domain', 'go_live')
}

async function onGoLiveContinue() {
  await go('go_live', 'seo')
}

async function onSeoContinue() {
  await go('seo', 'ads')
}

async function onSeoSkip() {
  await skip('seo', 'ads')
}

async function onAdsContinue() {
  const next: OnboardingFunnelStep =
    showCommerce.value && !progress.value?.completedSteps.includes('commerce') ? 'commerce' : 'complete'
  await go('ads', next)
}

async function onAdsSkip() {
  const next: OnboardingFunnelStep =
    showCommerce.value && !progress.value?.completedSteps.includes('commerce') ? 'commerce' : 'complete'
  await skip('ads', next)
}

async function onCommerceAfterAds() {
  await go('commerce', 'complete')
}

async function onCommerceSkip() {
  // Mid-funnel commerce (before style) vs post-ads commerce.
  if (!(progress.value?.completedSteps ?? []).includes('style')) {
    await skip('commerce', 'style')
    return
  }
  await skip('commerce', 'complete')
}

watch(
  () => progress.value,
  () => hydrateFromProgress(),
  { immediate: true },
)

onMounted(async () => {
  await load()
  hydrateFromProgress()

  const preselected = route.query.template
  if (typeof preselected === 'string' && preselected) templateId.value = preselected

  const fromAssistant = route.query.website
  if (typeof fromAssistant === 'string' && fromAssistant.trim()) {
    website.value = fromAssistant.trim()
  }

  const googleStatus = route.query.google
  if (typeof googleStatus === 'string' && googleStatus) {
    googleCallbackStatus.value = googleStatus
    if (googleStatus === 'connected') {
      await refreshCapabilities()
      connectMode.value = 'google'
      await patch({ connectMode: 'google' })
      if (step.value === 'connect' || step.value === 'account' || step.value === 'intent') {
        // Stay on connect/select so the user can pick a location.
        if (step.value === 'connect') await onConnectContinue()
      }
    }
  }

  // Skip account confirmation when already signed in and still on first step.
  if (step.value === 'account' && useSession().value) {
    if (!(progress.value?.completedSteps ?? []).includes('account')) {
      await go('account', 'intent')
    }
  }
})
</script>

<template>
  <OnboardShell
    :step="step"
    :title="shellTitle"
    :description="shellDescription"
    :error="combinedError"
    :rail="RAIL"
    :show-back="['select', 'scan', 'style'].includes(step)"
    :show-skip="['domain', 'seo', 'ads', 'commerce'].includes(step)"
    @back="
      step === 'select'
        ? patch({ step: 'connect' })
        : step === 'scan'
          ? patch({ step: 'select' })
          : step === 'style'
            ? patch({ step: showCommerce ? 'commerce' : 'scan' })
            : undefined
    "
    @skip="
      step === 'domain'
        ? onDomainSkip()
        : step === 'seo'
          ? onSeoSkip()
          : step === 'ads'
            ? onAdsSkip()
            : step === 'commerce'
              ? onCommerceSkip()
              : undefined
    "
  >
    <div v-if="loading" class="rounded-xl border border-line bg-raised px-5 py-14 text-center">
      <span class="mx-auto mb-3 block h-7 w-7 animate-spin rounded-full border-2 border-line border-t-brand" />
      <p class="text-sm text-soft">Loading your progress…</p>
    </div>

    <OnboardAccount v-else-if="step === 'account'" @continue="onAccountContinue" />

    <OnboardIntent
      v-else-if="step === 'intent'"
      v-model="productIntent"
      @continue="onIntentContinue"
    />

    <OnboardConnect
      v-else-if="step === 'connect'"
      v-model:website="website"
      v-model:business-name="businessName"
      v-model:city="city"
      v-model:locale="locale"
      v-model:connect-mode="connectMode"
      :google-connected="google?.connected"
      :google-available="google?.available"
      :google-reason="google?.reason"
      :google-callback-status="googleCallbackStatus"
      @connect-google="connectGoogle"
      @continue="onConnectContinue"
    />

    <OnboardSelectBusiness
      v-else-if="step === 'select'"
      v-model:selected-id="selectedLocationId"
      :connect-mode="connectMode"
      :locations="locations"
      :loading-locations="loadingLocations"
      :website="website"
      :business-name="businessName"
      :city="city"
      @continue="onSelectContinue"
      @refresh-locations="loadLocations"
    />

    <OnboardScan
      v-else-if="step === 'scan'"
      v-model:profile="profile"
      v-model:discovery="discovery"
      :website="website"
      :business-name="businessName"
      :city="city"
      :locale="locale"
      @continue="onScanContinue"
      @back="patch({ step: 'select' })"
    />

    <OnboardCommerce
      v-else-if="step === 'commerce' && !progress?.completedSteps.includes('style')"
      @continue="onCommerceBeforeStyle"
      @skip="onCommerceBeforeStyle"
    />

    <OnboardStyle
      v-else-if="step === 'style'"
      v-model:style="style"
      v-model:template-id="templateId"
      v-model:publish-now="publishNow"
      @continue="onStyleContinue"
      @back="patch({ step: showCommerce ? 'commerce' : 'scan' })"
    />

    <OnboardGenerate
      v-else-if="step === 'generate'"
      :profile="profile"
      :style="style"
      :template-id="templateId"
      :publish-now="publishNow"
      @done="onGenerateDone"
      @failed="onGenerateFailed"
    />

    <OnboardPreview
      v-else-if="step === 'preview'"
      :generated="generated"
      @continue="onPreviewContinue"
    />

    <OnboardDomain
      v-else-if="step === 'domain'"
      :site-id="progress?.siteId ?? generated?.siteId ?? null"
      :preview-hostname="generated?.previewHostname"
      @continue="onDomainContinue"
      @skip="onDomainSkip"
    />

    <OnboardGoLive
      v-else-if="step === 'go_live'"
      :generated="generated"
      :site-id="progress?.siteId ?? generated?.siteId ?? null"
      @continue="onGoLiveContinue"
    />

    <OnboardSeo v-else-if="step === 'seo'" @continue="onSeoContinue" @skip="onSeoSkip" />

    <OnboardAds v-else-if="step === 'ads'" @continue="onAdsContinue" @skip="onAdsSkip" />

    <OnboardCommerce
      v-else-if="step === 'commerce'"
      @continue="onCommerceAfterAds"
      @skip="onCommerceAfterAds"
    />

    <div v-else-if="step === 'complete'" class="rounded-xl border border-line bg-raised p-6 shadow-card">
      <h2 class="text-heading font-semibold text-ink">All set</h2>
      <p class="mt-2 text-sm text-soft">
        Your onboarding funnel is complete. Open the dashboard or keep editing your site.
      </p>
      <div class="mt-5 flex flex-wrap gap-2">
        <UiButton variant="primary" to="/" arrow>Go to dashboard</UiButton>
        <UiButton
          v-if="generated?.homePageId || progress?.siteId"
          :to="generated?.homePageId ? `/pages/${generated.homePageId}` : `/sites/${progress?.siteId}`"
        >
          Open site
        </UiButton>
      </div>
    </div>
  </OnboardShell>
</template>
