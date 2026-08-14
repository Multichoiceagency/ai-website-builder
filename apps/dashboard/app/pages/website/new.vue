<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import type { GenerationResult, Page, Site, StoreBuildPlan, StoreBuildResult } from '@platform/schemas'
import { Globe, ImagePlus, ShoppingBag, Sparkles } from '@lucide/vue'

/**
 * Lovable-style create — one page, one question, one action.
 * Personas + audit: docs/ux-personas-create.md
 * Post-audit fixes: Dutch UI, plain CTA, focus/contrast, retry, session persist.
 */

definePageMeta({ layout: 'default' })

const api = useApi()
const route = useRoute()
const activeSiteId = useActiveSiteId()

type BuildKind = 'website' | 'webshop'

const STORAGE_KEY = 'platform:create-draft'

const prompt = ref('')
const kind = ref<BuildKind>('website')
const language = ref<'nl' | 'en'>('nl')
const blankName = ref('')
const showBlank = ref(false)
const busy = ref(false)
const error = ref('')
const phase = ref('')
const building = ref(false)
const buildingStartedAt = ref(0)
const showSlowHint = ref(false)
const textareaEl = ref<HTMLTextAreaElement | null>(null)
const sourceUrl = ref('')
const screenshotUrl = ref('')
const screenshotName = ref('')
const { upload: uploadMedia, busy: screenshotBusy } = useMediaUpload()

const isMac = computed(() => {
  if (!import.meta.client) return true
  return /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent)
})

const t = computed(() => {
  if (language.value === 'en') {
    return {
      kicker: 'Start here',
      title: 'What do you want to build?',
      subtitle: 'Type your idea. We make the website or webshop for you.',
      website: 'Website',
      webshop: 'Webshop',
      kindHelp: 'Website = info pages. Webshop = sell products.',
      langHelp: 'Language of your site',
      placeholderWebsite: 'Example: A bakery in Amsterdam. Fresh bread, cakes, contact form…',
      placeholderShop: 'Example: I sell handmade candles. Soft look, euro prices…',
      fromUrl: 'Or recreate a site from a URL',
      fromUrlPh: 'https://example.com',
      fromShot: 'Or a screenshot',
      fromShotBusy: 'Uploading screenshot…',
      needMore: 'Write a bit more about your idea (a short sentence is enough).',
      buildWebsite: 'Make my website',
      buildShop: 'Make my webshop',
      working: 'Working…',
      examples: 'Or try an example',
      blankLink: 'Want a blank page instead?',
      blankCta: 'Start empty',
      blankTitle: 'Empty website',
      blankSubtitle: 'Just a name. You add the rest later.',
      blankName: 'Website name',
      blankNamePh: 'Example: Sunny Bakery',
      blankSubmit: 'Make empty website',
      back: '← Back',
      wait: 'This usually takes about a minute.',
      waitSlow: 'Still working — keep this page open.',
      retry: 'Try again',
      editLater: 'You can change everything later.',
      errShort: 'Write a bit more — what should we make?',
      errName: 'Type a name first.',
      errGeneric: 'Something went wrong. Check your connection and try again.',
      errOffline: 'You appear to be offline. Check your connection and try again.',
      phasesWebsite: ['Reading your idea…', 'Writing pages…', 'Almost done…'],
      phasesShop: ['Reading your idea…', 'Making products…', 'Building the shop…', 'Almost done…'],
      openingWebsite: 'Opening your website…',
      openingShop: 'Opening your shop…',
      blankPhase: 'Making empty website…',
    }
  }
  return {
    kicker: 'Begin hier',
    title: 'Wat wil je maken?',
    subtitle: 'Typ je idee. Wij maken de website of webshop voor je.',
    website: 'Website',
    webshop: 'Webshop',
    kindHelp: 'Website = informatie. Webshop = producten verkopen.',
    langHelp: 'Taal van je website',
      placeholderWebsite: 'Voorbeeld: Bakkerij in Amsterdam. Vers brood, taarten, contactformulier…',
      placeholderShop: 'Voorbeeld: Ik verkoop handgemaakte kaarsen. Rustige look, prijzen in euro…',
      fromUrl: 'Of maak na van een website-URL',
      fromUrlPh: 'https://voorbeeld.nl',
      fromShot: 'Of een screenshot',
      fromShotBusy: 'Screenshot uploaden…',
    needMore: 'Schrijf nog een zin over je idee (een korte zin is genoeg).',
    buildWebsite: 'Maak mijn website',
    buildShop: 'Maak mijn webshop',
    working: 'Bezig…',
    examples: 'Of kies een voorbeeld',
    blankLink: 'Liever een lege pagina?',
    blankCta: 'Begin leeg',
    blankTitle: 'Lege website',
    blankSubtitle: 'Alleen een naam. De rest vul je later in.',
    blankName: 'Naam van de website',
    blankNamePh: 'Voorbeeld: Bakkerij Zonneschijn',
    blankSubmit: 'Maak lege website',
    back: '← Terug',
    wait: 'Dit duurt meestal ongeveer een minuut.',
    waitSlow: 'Nog bezig — laat dit scherm open.',
    retry: 'Opnieuw proberen',
    editLater: 'Je kunt alles later nog aanpassen.',
    errShort: 'Schrijf nog een zin — wat moeten we maken?',
    errName: 'Typ eerst een naam.',
    errGeneric: 'Er ging iets mis. Controleer je internet en probeer opnieuw.',
    errOffline: 'Je lijkt offline. Controleer je internet en probeer opnieuw.',
    phasesWebsite: ['Je idee lezen…', 'Pagina’s schrijven…', 'Bijna klaar…'],
    phasesShop: ['Je idee lezen…', 'Producten maken…', 'Webshop bouwen…', 'Bijna klaar…'],
    openingWebsite: 'Je website openen…',
    openingShop: 'Je webshop openen…',
    blankPhase: 'Lege website maken…',
  }
})

const EXAMPLES = computed(() => {
  if (language.value === 'en') {
    return [
      {
        label: 'Bakery website',
        kind: 'website' as const,
        prompt:
          'A friendly bakery in Amsterdam called Sunny Bakery. Fresh bread, cakes, and coffee. Warm photos, opening hours, and a contact form.',
      },
      {
        label: 'Hair salon',
        kind: 'website' as const,
        prompt:
          'Website for Luna Hair Studio in Rotterdam. Cuts, color, and bridal. Book an appointment, show prices, Instagram feel.',
      },
      {
        label: 'Sell candles',
        kind: 'webshop' as const,
        prompt:
          'Webshop for handmade soy candles. Soft modern look, bestsellers, free shipping over €50, prices in euro.',
      },
      {
        label: 'Plumber',
        kind: 'website' as const,
        prompt:
          'Simple website for Van Dijk Plumbing in Utrecht. Emergency call button, services list, service area, reviews.',
      },
    ]
  }
  return [
    {
      label: 'Bakkerij',
      kind: 'website' as const,
      prompt:
        'Vriendelijke bakkerij in Amsterdam genaamd Bakkerij Zonneschijn. Vers brood, taarten en koffie. Openingstijden en contactformulier.',
    },
    {
      label: 'Kapsalon',
      kind: 'website' as const,
      prompt:
        'Website voor Luna Hair Studio in Rotterdam. Knippen, kleuren en bruidsstyling. Afspraak maken, prijzen tonen.',
    },
    {
      label: 'Kaarsen verkopen',
      kind: 'webshop' as const,
      prompt:
        'Webshop voor handgemaakte sojakaarsen. Zachte moderne look, bestsellers, gratis verzending vanaf €50, prijzen in euro.',
    },
    {
      label: 'Loodgieter',
      kind: 'website' as const,
      prompt:
        'Eenvoudige website voor Van Dijk Loodgieterij in Utrecht. Spoedknop, diensten, werkgebied en reviews.',
    },
  ]
})

function slugFor(value: string): string {
  return (
    value
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || (kind.value === 'webshop' ? 'shop' : 'website')
  )
}

function guessName(text: string): string {
  const called = text.match(/(?:called|genaamd|voor)\s+([A-ZÁÉÍÓÚÄÖÜ][\w'’&\- ]{1,40})/i)
  if (called?.[1]) return called[1].trim().slice(0, 80)
  const first = text.split(/[.!\n]/)[0]?.trim()
  if (first && first.length <= 48) return first.slice(0, 80)
  return kind.value === 'webshop' ? (language.value === 'nl' ? 'Mijn webshop' : 'My shop') : language.value === 'nl' ? 'Mijn website' : 'My website'
}

const canBuild = computed(
  () =>
    prompt.value.trim().length >= 8 ||
    /^https?:\/\//i.test(sourceUrl.value.trim()) ||
    Boolean(screenshotUrl.value),
)
const canBlank = computed(() => blankName.value.trim().length >= 1)
const buildLabel = computed(() => (kind.value === 'webshop' ? t.value.buildShop : t.value.buildWebsite))
const placeholder = computed(() =>
  kind.value === 'webshop' ? t.value.placeholderShop : t.value.placeholderWebsite,
)

function persistDraft() {
  if (!import.meta.client) return
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ prompt: prompt.value, kind: kind.value, language: language.value }),
    )
  } catch {
    /* ignore */
  }
}

function restoreDraft() {
  if (!import.meta.client) return
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const data = JSON.parse(raw) as { prompt?: string; kind?: BuildKind; language?: 'nl' | 'en' }
    if (data.prompt && !prompt.value) prompt.value = data.prompt
    if (data.kind === 'website' || data.kind === 'webshop') kind.value = data.kind
    if (data.language === 'nl' || data.language === 'en') language.value = data.language
  } catch {
    /* ignore */
  }
}

watch([prompt, kind, language], () => persistDraft(), { deep: true })

watch(
  () => route.query.mode,
  (value) => {
    if (value === 'shop' || value === 'ecommerce' || value === 'webshop') kind.value = 'webshop'
    if (value === 'manual' || value === 'blank') showBlank.value = true
  },
  { immediate: true },
)

const freeformAi = computed(() => route.query.mode === 'ai')

watch(
  () => route.query.blank,
  (value) => {
    if (value === '1' || value === 'true') showBlank.value = true
  },
  { immediate: true },
)

watch(
  () => route.query.website,
  (value) => {
    if (typeof value === 'string' && value.trim()) {
      sourceUrl.value = value.trim()
      if (!prompt.value.trim()) prompt.value = `Build a website based on ${value.trim()}`
    }
  },
  { immediate: true },
)

function composePrompt(): string {
  let text = prompt.value.trim()
  const url = sourceUrl.value.trim()
  if (url) {
    text = text ? `${text}\n\nWebsite: ${url}` : `Build a website based on ${url}`
  }
  if (screenshotUrl.value) {
    text = `${text}\n\nRecreate this screenshot as closely as possible: ${screenshotUrl.value}`
  }
  return text.trim().slice(0, 4000)
}

async function onScreenshot(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  error.value = ''
  const [asset] = await uploadMedia([file], { folder: 'create' })
  if (!asset?.url) {
    error.value = t.value.errGeneric
    return
  }
  screenshotUrl.value = asset.url
  screenshotName.value = file.name
}

let slowTimer: ReturnType<typeof setTimeout> | undefined

onMounted(() => {
  restoreDraft()
  void nextTick(() => {
    if (!showBlank.value) textareaEl.value?.focus()
  })
})

onUnmounted(() => {
  if (slowTimer) clearTimeout(slowTimer)
})

function applyExample(example: { label: string; prompt: string; kind: BuildKind }) {
  kind.value = example.kind
  prompt.value = example.prompt
  error.value = ''
  showBlank.value = false
  void nextTick(() => textareaEl.value?.focus())
}

function openBlank() {
  showBlank.value = true
  error.value = ''
}

function closeBlank() {
  showBlank.value = false
  error.value = ''
  void nextTick(() => textareaEl.value?.focus())
}

function friendlyError(caught: unknown): string {
  if (!import.meta.client) return t.value.errGeneric
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return t.value.errOffline
  if (caught instanceof ApiError) {
    const msg = caught.message.toLowerCase()
    if (msg.includes('network') || msg.includes('fetch') || msg.includes('timeout')) {
      return t.value.errOffline
    }
    // Keep short API messages if they are already plain; otherwise generic.
    if (caught.message.length <= 120 && !/[_{}]|sql|uuid|stack/i.test(caught.message)) {
      return caught.message
    }
  }
  return t.value.errGeneric
}

async function ensureEcommerceSite(name: string): Promise<string> {
  const sites = await api.get<Site[]>('/api/v1/sites')
  const existing = sites.find((site) => site.kind === 'ecommerce')
  if (existing) {
    activeSiteId.value = existing.id
    return existing.id
  }
  const site = await api.post<Site>('/api/v1/sites', {
    name,
    slug: slugFor(name),
    locale: language.value,
    kind: 'ecommerce',
  })
  activeSiteId.value = site.id
  return site.id
}

async function build() {
  error.value = ''
  if (!canBuild.value) {
    error.value = t.value.errShort
    return
  }

  busy.value = true
  building.value = true
  buildingStartedAt.value = Date.now()
  showSlowHint.value = false
  if (slowTimer) clearTimeout(slowTimer)
  slowTimer = setTimeout(() => {
    showSlowHint.value = true
  }, 10_000)

  const text = composePrompt()
  if (text.length < 8) {
    error.value = t.value.errShort
    return
  }
  const name = guessName(text)
  const phases = kind.value === 'webshop' ? t.value.phasesShop : t.value.phasesWebsite
  phase.value = phases[0]!
  let i = 0
  const timer = setInterval(() => {
    i = Math.min(i + 1, phases.length - 1)
    phase.value = phases[i]!
  }, 1400)

  try {
    if (kind.value === 'webshop') {
      const siteId = await ensureEcommerceSite(name)
      const response = await api.post<{ plan: StoreBuildPlan; result: StoreBuildResult }>(
        '/api/v1/commerce/store/build',
        {
          prompt: text,
          siteId,
          currency: 'EUR',
          locale: language.value,
          productCount: 6,
          themePreset: 'editorial-ink',
          updateHome: true,
          publish: true,
        },
        { timeoutMs: 90_000 },
      )
      const homeId = response.result.pageIds.at(-1)
      phase.value = t.value.openingShop
      try {
        sessionStorage.removeItem(STORAGE_KEY)
      } catch {
        /* ignore */
      }
      await navigateTo(homeId ? `/pages/${homeId}` : '/commerce/products')
      return
    }

    const created = await api.post<GenerationResult>(
      '/api/v1/onboarding/generate-from-prompt',
      {
        prompt: text,
        locale: language.value,
        style: 'auto',
        publish: false,
        siteName: name,
        freeform: freeformAi.value,
      },
      { timeoutMs: 90_000 },
    )
    activeSiteId.value = created.siteId
    phase.value = t.value.openingWebsite
    try {
      sessionStorage.removeItem(STORAGE_KEY)
    } catch {
      /* ignore */
    }
    await navigateTo(
      freeformAi.value
        ? `/pages/${created.homePageId}?mode=ai`
        : `/pages/${created.homePageId}`,
    )
  } catch (caught) {
    error.value = friendlyError(caught)
    building.value = false
  } finally {
    clearInterval(timer)
    if (slowTimer) clearTimeout(slowTimer)
    busy.value = false
  }
}

async function createBlank() {
  error.value = ''
  if (!canBlank.value) {
    error.value = t.value.errName
    return
  }
  busy.value = true
  building.value = true
  phase.value = t.value.blankPhase
  try {
    const site = await api.post<Site>('/api/v1/sites', {
      name: blankName.value.trim(),
      slug: slugFor(blankName.value),
      locale: language.value,
      kind: 'website',
    })
    activeSiteId.value = site.id
    const page = await api.post<Page>(`/api/v1/sites/${site.id}/pages`, {
      title: 'Home',
      path: '/',
    })
    await navigateTo(`/pages/${page.id}`)
  } catch (caught) {
    error.value = friendlyError(caught)
    building.value = false
  } finally {
    busy.value = false
  }
}

function onKeydown(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
    event.preventDefault()
    if (showBlank.value) void createBlank()
    else void build()
  }
}
</script>

<template>
  <div class="relative mx-auto flex min-h-[min(72vh,40rem)] max-w-2xl flex-col justify-center px-1 pb-24 pt-6 sm:pb-16">
    <div
      v-if="building"
      class="rounded-3xl border border-line bg-raised px-6 py-16 text-center shadow-sm"
      role="status"
      aria-live="polite"
    >
      <Sparkles class="mx-auto h-10 w-10 animate-pulse text-ink" aria-hidden="true" />
      <p class="mt-5 text-[1.35rem] font-semibold tracking-tight text-ink">{{ phase }}</p>
      <p class="mt-2 text-[1.05rem] text-soft">{{ showSlowHint ? t.waitSlow : t.wait }}</p>
      <p class="mt-3 text-[0.9375rem] text-soft">{{ t.editLater }}</p>
    </div>

    <template v-else-if="showBlank">
      <div class="text-center">
        <h1 class="text-[2rem] font-semibold tracking-[-0.03em] text-ink">{{ t.blankTitle }}</h1>
        <p class="mt-3 text-[1.05rem] text-soft">{{ t.blankSubtitle }}</p>
      </div>
      <form class="mt-8 flex flex-col gap-4" @submit.prevent="createBlank">
        <label class="block">
          <span class="mb-1.5 block text-[1rem] font-semibold text-ink">{{ t.blankName }}</span>
          <input
            v-model="blankName"
            type="text"
            class="w-full rounded-2xl border border-line bg-raised px-4 py-3.5 text-[1.1rem] text-ink outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
            :placeholder="t.blankNamePh"
            autofocus
            @keydown="onKeydown"
          />
        </label>
        <p
          v-if="error"
          class="rounded-2xl bg-danger-soft px-4 py-3 text-[1rem] font-medium text-danger"
          role="alert"
        >
          {{ error }}
        </p>
        <button
          type="submit"
          class="min-h-14 w-full rounded-2xl bg-ink px-5 py-4 text-[1.1rem] font-semibold text-paper focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 disabled:opacity-40"
          :disabled="busy || !canBlank"
        >
          {{ t.blankSubmit }}
        </button>
        <button
          type="button"
          class="min-h-12 py-2 text-[1rem] font-medium text-ink underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
          @click="closeBlank"
        >
          {{ t.back }}
        </button>
      </form>
    </template>

    <template v-else>
      <div class="text-center">
        <p class="text-[1rem] font-medium text-soft">{{ t.kicker }}</p>
        <h1 class="mt-2 text-[2rem] font-semibold tracking-[-0.03em] text-ink sm:text-[2.35rem]">
          {{ t.title }}
        </h1>
        <p class="mx-auto mt-3 max-w-md text-[1.05rem] leading-relaxed text-soft">
          {{ t.subtitle }}
        </p>
        <p class="mt-2 text-[0.9375rem] text-soft">{{ t.editLater }}</p>
      </div>

      <!-- Examples first for phone-first / low literacy -->
      <div class="mt-6">
        <p class="text-center text-[1rem] font-medium text-soft">{{ t.examples }}</p>
        <div class="mt-3 flex flex-wrap justify-center gap-2.5">
          <button
            v-for="example in EXAMPLES"
            :key="example.label"
            type="button"
            class="min-h-12 rounded-full border border-line-strong bg-raised px-4 py-2.5 text-[1rem] font-medium text-ink transition-colors hover:bg-sunken/50 focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
            @click="applyExample(example)"
          >
            {{ example.label }}
          </button>
        </div>
      </div>

      <div
        class="mt-6 rounded-[1.75rem] border border-line bg-raised p-2 shadow-[0_12px_40px_rgba(0,0,0,0.06)]"
      >
        <label class="sr-only" for="create-prompt">{{ t.title }}</label>
        <textarea
          id="create-prompt"
          ref="textareaEl"
          v-model="prompt"
          rows="5"
          class="w-full resize-none rounded-2xl border-0 bg-transparent px-4 py-3 text-[1.1rem] leading-relaxed text-ink outline-none placeholder:text-soft focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
          :placeholder="placeholder"
          aria-keyshortcuts="Meta+Enter Control+Enter"
          @keydown="onKeydown"
        />

        <div class="flex flex-wrap items-center gap-2 px-2 pb-1 pt-1">
          <div class="flex flex-wrap gap-2" role="radiogroup" :aria-label="t.kindHelp">
            <button
              type="button"
              role="radio"
              :aria-checked="kind === 'website'"
              class="inline-flex min-h-12 items-center gap-2 rounded-full px-4 py-2.5 text-[1rem] font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
              :class="
                kind === 'website'
                  ? 'bg-ink text-paper'
                  : 'border border-line-strong bg-raised text-ink hover:bg-sunken/40'
              "
              @click="kind = 'website'"
            >
              <Globe class="h-4 w-4" aria-hidden="true" />
              {{ t.website }}
            </button>
            <button
              type="button"
              role="radio"
              :aria-checked="kind === 'webshop'"
              class="inline-flex min-h-12 items-center gap-2 rounded-full px-4 py-2.5 text-[1rem] font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
              :class="
                kind === 'webshop'
                  ? 'bg-ink text-paper'
                  : 'border border-line-strong bg-raised text-ink hover:bg-sunken/40'
              "
              @click="kind = 'webshop'"
            >
              <ShoppingBag class="h-4 w-4" aria-hidden="true" />
              {{ t.webshop }}
            </button>
          </div>
          <div
            class="ml-auto flex min-h-12 items-center gap-1 rounded-full border border-line-strong bg-raised p-1"
            role="group"
            :aria-label="t.langHelp"
          >
            <button
              type="button"
              class="min-h-10 rounded-full px-3 py-2 text-[1rem] font-semibold focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
              :class="language === 'nl' ? 'bg-ink text-paper' : 'text-ink'"
              @click="language = 'nl'"
            >
              NL
            </button>
            <button
              type="button"
              class="min-h-10 rounded-full px-3 py-2 text-[1rem] font-semibold focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
              :class="language === 'en' ? 'bg-ink text-paper' : 'text-ink'"
              @click="language = 'en'"
            >
              EN
            </button>
          </div>
        </div>
        <p class="px-3 pb-2 text-[0.9375rem] text-soft">{{ t.kindHelp }}</p>

        <div class="flex flex-col gap-2 px-3 pb-3">
          <label class="block">
            <span class="mb-1 block text-[0.8125rem] font-medium text-soft">{{ t.fromUrl }}</span>
            <input
              v-model="sourceUrl"
              type="url"
              class="w-full rounded-xl border border-line bg-sunken/40 px-3 py-2.5 text-[1rem] text-ink outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
              :placeholder="t.fromUrlPh"
            />
          </label>
          <label class="inline-flex cursor-pointer items-center gap-2 text-[0.9375rem] font-medium text-ink">
            <input type="file" accept="image/*" class="sr-only" @change="onScreenshot" />
            <ImagePlus class="h-4 w-4" aria-hidden="true" />
            <span>{{ screenshotName || t.fromShot }}</span>
            <span v-if="screenshotBusy" class="text-soft">{{ t.fromShotBusy }}</span>
          </label>
        </div>

        <p v-if="!canBuild" class="px-3 pb-2 text-[0.9375rem] text-soft">{{ t.needMore }}</p>

        <!-- Desktop Build -->
        <div class="hidden items-center justify-between gap-3 px-2 pb-2 pt-1 sm:flex">
          <p class="text-[0.875rem] text-soft">
            <kbd class="rounded border border-line px-1.5 py-0.5 text-[0.75rem]">{{ isMac ? '⌘' : 'Ctrl' }}</kbd>
            +
            <kbd class="rounded border border-line px-1.5 py-0.5 text-[0.75rem]">Enter</kbd>
          </p>
          <button
            type="button"
            class="inline-flex min-h-12 min-w-[12rem] items-center justify-center gap-2 rounded-full bg-ink px-6 text-[1.05rem] font-semibold text-paper focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
            :disabled="busy"
            @click="build"
          >
            {{ busy ? t.working : buildLabel }}
          </button>
        </div>
      </div>

      <div
        v-if="error"
        class="mt-4 rounded-2xl bg-danger-soft px-4 py-3 text-center"
        role="alert"
      >
        <p class="text-[1rem] font-medium text-danger">{{ error }}</p>
        <button
          type="button"
          class="mt-3 min-h-12 rounded-full bg-ink px-5 text-[1rem] font-semibold text-paper focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
          @click="build"
        >
          {{ t.retry }}
        </button>
      </div>

      <p class="mt-8 text-center text-[1rem] text-soft">
        {{ t.blankLink }}
        <button
          type="button"
          class="font-semibold text-ink underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
          @click="openBlank"
        >
          {{ t.blankCta }}
        </button>
      </p>

      <!-- Sticky mobile Build -->
      <div
        class="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-raised/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md sm:hidden"
      >
        <button
          type="button"
          class="flex min-h-14 w-full items-center justify-center rounded-2xl bg-ink text-[1.1rem] font-semibold text-paper focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 disabled:opacity-40"
          :disabled="busy"
          @click="build"
        >
          {{ busy ? t.working : buildLabel }}
        </button>
      </div>
    </template>
  </div>
</template>
