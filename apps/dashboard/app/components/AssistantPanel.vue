<script setup lang="ts">
import { computed, nextTick, ref, watch, type Component } from 'vue'
import { ArrowUp, ChevronDown, FilePlus2, Globe, Mic, Plus, Search, Sparkles, Square } from '@lucide/vue'
import type { Section, Site, Theme } from '@platform/schemas'
import { themeFromSeed } from '@platform/theming'
import {
  DESIGN_WIZARD_STEPS,
  fontPairFromTypeAnswer,
  formatWizardBrief,
  seedFromPaletteAnswer,
  wantsGuidedDesign,
  type WizardAnswers,
} from '../utils/assistantWizard'

/**
 * AI assistant — tools + Lovable-style A–Z design questionnaire.
 * Guided flow collects palette / type / tone before generation or theme apply.
 */
const api = useApi()
const route = useRoute()
const activeSiteId = useActiveSiteId()
const { appendToDefaultPage } = useAppendBlocksToPage()

interface CatalogueHit {
  kind: 'block' | 'template'
  id: string
  name: string
  category: string
  collection: string
  score?: number
}

const props = withDefaults(
  defineProps<{
    closable?: boolean
    /** AI Freeform — no Motionsites / registry catalogue. */
    freeformMode?: boolean
    /** Selected layout-canvas context for modify actions. */
    layoutContext?: {
      sectionId?: string
      selectedNodeId?: string
      selectedNode?: unknown
    } | null
    /** Prefill the composer (e.g. Edit with AI). */
    draftMessage?: string
    /** Increment to auto-send the current draft (Prompt in Place). */
    sendNonce?: number
    /**
     * Set by the editor so section changes join its undo history — a direct
     * PATCH loses to the next save of the editor's stale sections. Return the
     * same array reference to mean nothing changed.
     */
    applySections?: ((transform: (sections: Section[]) => Section[]) => { applied: boolean }) | null
  }>(),
  {
    closable: false,
    freeformMode: false,
    layoutContext: null,
    draftMessage: '',
    sendNonce: 0,
    applySections: null,
  },
)
const emit = defineEmits<{
  close: []
  'insert-catalogue': [hit: CatalogueHit]
  /** Live canvas should adopt this theme after an assist width/layout action. */
  'theme-updated': [theme: Theme]
  'insert-layout-canvas': []
  'layout-action': [
    action:
      | { type: 'replaceLayoutRoot'; sectionId: string; root: Record<string, unknown> }
      | {
          type: 'patchLayoutNode'
          sectionId: string
          nodeId: string
          patch?: Record<string, unknown>
          styles?: Record<string, unknown>
          stylesHover?: Record<string, unknown>
        }
      | { type: 'replaceLayoutSubtree'; sectionId: string; nodeId: string; node: Record<string, unknown> },
  ]
}>()

type AssistActionPayload =
  | { type: 'setContentWidth'; width: 'full' | 'content' | 'wide' | '1280' | '1440' | '1600' | number }
  | { type: 'setPageLayout'; maxWidth: 'full' | 'content' | 'wide' | '1280' | '1440' | '1600' | number }
  | { type: 'setHeaderLogo'; url: string }
  | { type: 'setHeaderLogoSize'; size: 'sm' | 'md' | 'lg' | 'xl' }
  | { type: 'insertBlock'; blockId: string }
  | { type: 'insertLayoutCanvas'; title?: string }
  | { type: 'replaceLayoutRoot'; sectionId: string; root: Record<string, unknown> }
  | {
      type: 'patchLayoutNode'
      sectionId: string
      nodeId: string
      patch?: Record<string, unknown>
      styles?: Record<string, unknown>
      stylesHover?: Record<string, unknown>
    }
  | { type: 'replaceLayoutSubtree'; sectionId: string; nodeId: string; node: Record<string, unknown> }
  | { type: 'patchSectionProps'; sectionId: string; props: Record<string, unknown> }

function friendlyAssistError(error: unknown): string {
  if (!(error instanceof ApiError)) return 'That did not work. Try one of the actions below.'
  if (/JSON|Unexpected token|is not valid JSON|SyntaxError/i.test(error.message)) {
    return 'The assistant returned an unreadable reply. Please try again.'
  }
  return `That did not work: ${error.message}`
}

/** Map assistant width tokens onto theme.contentWidth (+ optional custom px). */
function themeWidthPatch(width: string | number): {
  contentWidth: 'full' | '1280' | '1440' | '1600' | 'custom'
  contentWidthPx: number | null
} {
  if (width === 'full' || width === 'content' || width === 'wide') {
    return { contentWidth: 'full', contentWidthPx: null }
  }
  if (width === '1280' || width === 1280) return { contentWidth: '1280', contentWidthPx: null }
  if (width === '1440' || width === 1440) return { contentWidth: '1440', contentWidthPx: null }
  if (width === '1600' || width === 1600) return { contentWidth: '1600', contentWidthPx: null }
  const px = typeof width === 'number' ? width : Number(width)
  if (Number.isFinite(px) && px >= 320 && px <= 2400) {
    if (px === 1280 || px === 1440 || px === 1600) {
      return { contentWidth: String(px) as '1280' | '1440' | '1600', contentWidthPx: null }
    }
    return { contentWidth: 'custom', contentWidthPx: Math.round(px) }
  }
  return { contentWidth: '1600', contentWidthPx: null }
}

/** Section style.maxWidth token closest to the requested width. */
function sectionMaxWidthToken(
  width: 'full' | 'content' | 'wide' | '1280' | '1440' | '1600' | number,
): 'full' | 'content' | 'wide' | '1280' | '1440' | '1600' {
  if (width === 'full' || width === 'content' || width === 'wide') return width
  if (width === '1280' || width === '1440' || width === '1600') return width
  const px = typeof width === 'number' ? width : Number(width)
  if (px >= 1520) return '1600'
  if (px >= 1360) return '1440'
  if (px >= 1200) return '1280'
  if (px >= 900) return 'wide'
  return 'content'
}

/** `null` when there is no page open to change at all. */
async function patchSections(
  transform: (sections: Section[]) => Section[],
): Promise<{ applied: boolean } | null> {
  if (props.applySections) return props.applySections(transform)
  if (!currentPageId.value) return null
  const page = await api.get<{ sections: Section[] }>(`/api/v1/pages/${currentPageId.value}`)
  const next = transform(page.sections)
  if (next === page.sections) return { applied: false }
  await api.patch(`/api/v1/pages/${currentPageId.value}`, { sections: next })
  return { applied: true }
}

async function applyAssistActions(actions: AssistActionPayload[] | undefined) {
  if (!actions?.length) return
  for (const action of actions) {
    try {
      if (action.type === 'setContentWidth' || action.type === 'setPageLayout') {
        if (!activeSiteId.value) {
          say('assistant', 'Select a site first, then ask again to set the page width.')
          continue
        }
        const rawWidth = action.type === 'setContentWidth' ? action.width : action.maxWidth
        const patch = themeWidthPatch(rawWidth)
        const site = await api.get<Site>(`/api/v1/sites/${activeSiteId.value}`)
        const nextTheme: Theme = { ...site.theme, ...patch }
        await api.patch(`/api/v1/sites/${activeSiteId.value}`, {
          theme: nextTheme,
        })
        emit('theme-updated', nextTheme)

        // Also tighten sections on the open page so the canvas updates immediately.
        const maxWidth = sectionMaxWidthToken(rawWidth)
        await patchSections((sections) =>
          sections.map((section) => ({
            ...section,
            style: {
              ...(section.style ?? {}),
              maxWidth: maxWidth === 'full' ? undefined : maxWidth,
            },
          })),
        )

        const label =
          patch.contentWidth === 'full'
            ? 'full width'
            : patch.contentWidth === 'custom'
              ? `${patch.contentWidthPx}px`
              : `${patch.contentWidth}px`
        say('assistant', `Page layout content width is now ${label}.`)
      } else if (action.type === 'setHeaderLogo') {
        const result = await patchSections((sections) =>
          sections.some((section) => section.block.startsWith('header-'))
            ? sections.map((section) =>
                section.block.startsWith('header-')
                  ? { ...section, props: { ...(section.props ?? {}), logo: action.url } }
                  : section,
              )
            : sections,
        )
        if (!result) say('assistant', 'Open a page in the editor, then ask again to set the header logo.')
        else if (!result.applied) say('assistant', 'No header section on this page yet. Insert a header block first.')
        else say('assistant', 'Header logo updated on this page.')
      } else if (action.type === 'setHeaderLogoSize') {
        const result = await patchSections((sections) =>
          sections.some((section) => section.block.startsWith('header-'))
            ? sections.map((section) =>
                section.block.startsWith('header-')
                  ? { ...section, props: { ...(section.props ?? {}), logoHeight: action.size } }
                  : section,
              )
            : sections,
        )
        if (!result) say('assistant', 'Open a page in the editor, then ask again to set the header logo size.')
        else if (!result.applied) say('assistant', 'No header section on this page yet. Insert a header block first.')
        else say('assistant', `Header logo size is now ${action.size}.`)
      } else if (action.type === 'patchSectionProps') {
        const result = await patchSections((sections) =>
          sections.some((section) => section.id === action.sectionId)
            ? sections.map((section) =>
                section.id === action.sectionId
                  ? { ...section, props: { ...(section.props ?? {}), ...action.props } }
                  : section,
              )
            : sections,
        )
        if (!result) say('assistant', 'Open a page in the editor, then ask again to update that section.')
        else if (!result.applied) say('assistant', `No section with id \`${action.sectionId}\` on this page.`)
        else say('assistant', `Updated props on section \`${action.sectionId}\`.`)
      } else if (action.type === 'insertLayoutCanvas') {
        emit('insert-layout-canvas')
        say('assistant', 'Added an Empty section (layout canvas).')
      } else if (
        action.type === 'replaceLayoutRoot' ||
        action.type === 'patchLayoutNode' ||
        action.type === 'replaceLayoutSubtree'
      ) {
        emit('layout-action', action)
        say(
          'assistant',
          action.type === 'replaceLayoutRoot'
            ? 'Applied a new artboard layout.'
            : action.type === 'patchLayoutNode'
              ? `Updated node \`${action.nodeId}\`.`
              : `Replaced subtree for \`${action.nodeId}\`.`,
        )
      } else if (action.type === 'insertBlock' && action.blockId) {
        if (props.freeformMode && action.blockId !== 'layout-canvas-01') {
          emit('insert-layout-canvas')
          say('assistant', 'Added an Empty section (layout canvas).')
        } else if (currentPageId.value) {
          emit('insert-catalogue', {
            kind: 'block',
            id: action.blockId,
            name: action.blockId,
            category: 'block',
            collection: 'core',
          })
          say('assistant', `Added \`${action.blockId}\` to the page.`)
        } else {
          const pageId = await appendToDefaultPage([action.blockId])
          if (pageId) say('assistant', `Added \`${action.blockId}\` to the page.`)
        }
      }
    } catch (error) {
      say('assistant', friendlyAssistError(error))
    }
  }
}

type Risk = 'low' | 'medium' | 'high'

interface AssistantTool {
  id: string
  label: string
  hint: string
  risk: Risk
  icon: Component
  available: () => boolean
  run: () => Promise<string>
}

interface Message {
  id: number
  role: 'user' | 'assistant'
  text: string
  /** Render interactive questionnaire under this bubble. */
  wizard?: boolean
  /** Show Lovable-style generation stage art. */
  generation?: boolean
  thinkingSeconds?: number | null
  generationPhase?: 'review' | 'structure' | 'theme' | 'build' | 'done'
  generationCaption?: string
  /** Catalogue rows the model can cite — one-click insert in the editor. */
  catalogueHits?: CatalogueHit[]
}

const messages = ref<Message[]>([])
const draft = ref('')
const busy = ref(false)
const confirming = ref<AssistantTool | null>(null)
const log = ref<HTMLElement | null>(null)

const wizardActive = ref(false)
const wizardGoal = ref('')
const pendingPlan = ref<string[]>([])
const composerMode = ref<'build' | 'chat'>('build')

watch(
  () => props.draftMessage,
  (value) => {
    if (value?.trim()) {
      draft.value = value
      composerMode.value = 'chat'
    }
  },
  { immediate: true },
)

watch(
  () => props.sendNonce,
  (value, previous) => {
    if (value && value !== previous && draft.value.trim()) void submit()
  },
)
const thinking = ref(false)

let nextId = 1

function say(role: Message['role'], text: string, extra?: Partial<Message>) {
  messages.value = [...messages.value, { id: nextId++, role, text, ...extra }]
  void nextTick(() => log.value?.scrollTo({ top: log.value.scrollHeight, behavior: 'smooth' }))
}

function patchLastAssistant(patch: Partial<Message>) {
  for (let i = messages.value.length - 1; i >= 0; i -= 1) {
    const message = messages.value[i]
    if (message?.role === 'assistant') {
      messages.value[i] = { ...message, ...patch }
      break
    }
  }
}

const currentPageId = computed(() =>
  route.path.startsWith('/pages/') ? (route.params.pageId as string) : null,
)

const TOOLS: AssistantTool[] = [
  {
    id: 'create_page',
    label: 'Add a page',
    hint: 'Creates a draft page on the current website',
    risk: 'medium',
    icon: FilePlus2,
    available: () => Boolean(activeSiteId.value),
    async run() {
      const page = await api.post<{ id: string; title: string }>(
        `/api/v1/sites/${activeSiteId.value}/pages`,
        { title: 'New page', path: `/page-${Date.now().toString(36).slice(-4)}` },
      )
      await navigateTo(`/pages/${page.id}`)
      return `Created "${page.title}" as a draft and opened it. Nothing is public until you publish.`
    },
  },
  {
    id: 'publish_page',
    label: 'Publish this page',
    hint: 'Makes the current draft live',
    risk: 'medium',
    icon: ArrowUp,
    available: () => Boolean(currentPageId.value),
    async run() {
      const page = await api.post<{ title: string; path: string }>(
        `/api/v1/pages/${currentPageId.value}/publish`,
      )
      return `Published "${page.title}". It is live at ${page.path}.`
    },
  },
  {
    id: 'review_quality',
    label: 'Review this website',
    hint: 'Checks pages for SEO and content gaps',
    risk: 'low',
    icon: Search,
    available: () => Boolean(activeSiteId.value),
    async run() {
      const pages = await api.get<
        {
          title: string
          path: string
          status: string
          hasUnpublishedChanges: boolean
          sectionCount: number
        }[]
      >(`/api/v1/sites/${activeSiteId.value}/pages`)

      const findings: string[] = []
      const drafts = pages.filter((page) => page.status === 'draft')
      const stale = pages.filter((page) => page.status === 'published' && page.hasUnpublishedChanges)
      const thin = pages.filter((page) => page.sectionCount < 3)

      if (drafts.length)
        findings.push(`${drafts.length} page(s) never published: ${drafts.map((p) => p.path).join(', ')}`)
      if (stale.length)
        findings.push(
          `${stale.length} page(s) edited but not republished: ${stale.map((p) => p.path).join(', ')}`,
        )
      if (thin.length)
        findings.push(
          `${thin.length} page(s) look thin (under 3 sections): ${thin.map((p) => p.path).join(', ')}`,
        )

      return findings.length
        ? `I checked ${pages.length} pages:\n\n• ${findings.join('\n• ')}`
        : `I checked ${pages.length} pages and found nothing to flag. Everything is published and has real content.`
    },
  },
  {
    id: 'build_website',
    label: 'Make a website with AI',
    hint: 'Opens the simple website builder',
    risk: 'low',
    icon: Globe,
    available: () => true,
    async run() {
      await navigateTo('/website/new?mode=ai')
      return 'Opened Make website. Write what your business does, then tap Make my website.'
    },
  },
]

const availableTools = computed(() => TOOLS.filter((tool) => tool.available()))

function startWizard(goal: string) {
  wizardGoal.value = goal
  composerMode.value = 'build'
  pendingPlan.value = [
    'Collect design choices',
    'Apply theme (if a site is selected)',
    'Open builder / draft structure',
  ]
  busy.value = true
  thinking.value = true
  say('assistant', '', {
    generation: true,
    thinkingSeconds: null,
    generationPhase: 'review',
    generationCaption: 'Reviewing design and structure options.',
  })

  void (async () => {
    await new Promise((resolve) => setTimeout(resolve, 2200))
    const seconds = 3
    thinking.value = false
    patchLastAssistant({
      text: 'I’ll build a polished landing page for you. First, a few quick design choices to make it feel right.',
      thinkingSeconds: seconds,
      generation: true,
      generationPhase: 'review',
      generationCaption: 'Reviewing design and structure options.',
      wizard: true,
    })
    wizardActive.value = true
    busy.value = false
    void nextTick(() => log.value?.scrollTo({ top: log.value.scrollHeight, behavior: 'smooth' }))
  })()
}

async function applyThemeFromAnswers(answers: WizardAnswers) {
  if (!activeSiteId.value) return null
  const palette = typeof answers.palette === 'string' ? answers.palette : ''
  if (!palette) return null

  const site = await api.get<Site>(`/api/v1/sites/${activeSiteId.value}`)
  const seed = seedFromPaletteAnswer(palette)
  let theme: Theme = themeFromSeed(site.theme, seed, site.theme.mode)
  const typeId = typeof answers.type === 'string' ? answers.type : 'clean-sans'
  const fonts = fontPairFromTypeAnswer(typeId)
  theme = { ...theme, fontHeading: fonts.heading, fontBody: fonts.body, presetId: null }
  await api.patch(`/api/v1/sites/${activeSiteId.value}`, { theme })
  return seed
}

async function finishWizard(answers: WizardAnswers) {
  wizardActive.value = false
  messages.value = messages.value.map((message) =>
    message.wizard ? { ...message, wizard: false } : message,
  )

  busy.value = true
  patchLastAssistant({
    generation: true,
    generationPhase: 'structure',
    generationCaption: 'Designing landing page structure',
  })
  say('assistant', 'Got it — designing from your answers…', {
    generation: true,
    generationPhase: 'theme',
    generationCaption: 'Applying colour and type',
  })

  try {
    patchLastAssistant({ generationPhase: 'theme' })
    const seed = await applyThemeFromAnswers(answers)
    const brief = formatWizardBrief(wizardGoal.value, answers)
    let modelNote = ''

    patchLastAssistant({ generationPhase: 'build', generationCaption: 'Building your page' })

    try {
      const result = await api.post<{ answer: string; model: string }>('/api/v1/ai/assist', {
        message: brief.slice(0, 990),
        includeCatalogue: !props.freeformMode,
        freeformMode: props.freeformMode,
        layoutContext: props.freeformMode ? props.layoutContext ?? undefined : undefined,
      })
      modelNote = result.answer
    } catch {
      modelNote =
        'Answers locked in. Next I’ll open the builder so we can generate from your brand and structure.'
    }

    messages.value = messages.value.slice(0, -1)
    const themeLine = seed
      ? `Theme updated on the active site (seed ${seed}). `
      : activeSiteId.value
        ? ''
        : 'No site selected yet — theme will apply after generation. '
    say('assistant', `${themeLine}${modelNote}`, {
      generation: true,
      generationPhase: 'done',
      generationCaption: 'Ready to continue',
      thinkingSeconds: null,
    })

    const source =
      typeof answers.source === 'string' && /^https?:\/\//i.test(answers.source.trim())
        ? answers.source.trim()
        : ''
    const goal = typeof answers.goal === 'string' ? answers.goal : 'landing'

    if (source || goal === 'multipage' || goal === 'shop' || !activeSiteId.value) {
      await navigateTo({
        path: '/website/new',
        query: {
          mode: 'ai',
          ...(source ? { website: source } : {}),
          goal,
          tone: typeof answers.tone === 'string' ? answers.tone : undefined,
          audience: typeof answers.audience === 'string' ? answers.audience : undefined,
        },
      })
      say('assistant', 'Opened Make website. Check your text, then tap Make my website.')
    } else if (activeSiteId.value) {
      await navigateTo('/website/templates')
      say(
        'assistant',
        'Theme is set. Open Templates to add a section — or say “make a website” for the AI builder.',
      )
    }
  } catch (error) {
    messages.value = messages.value.slice(0, -1)
    say(
      'assistant',
      error instanceof ApiError ? `That did not work: ${error.message}` : 'That did not work.',
    )
  } finally {
    busy.value = false
    pendingPlan.value = []
  }
}

function skipWizard() {
  wizardActive.value = false
  messages.value = messages.value.map((message) =>
    message.wizard ? { ...message, wizard: false } : message,
  )
  say('assistant', 'Skipped the questionnaire. Tell me what to do, or pick an action below.')
  void navigateTo('/website/new?mode=ai')
}

async function execute(tool: AssistantTool) {
  confirming.value = null
  if (tool.id === 'build_website') {
    await tool.run()
    return
  }
  busy.value = true
  say('assistant', `Working on it — ${tool.label.toLowerCase()}…`)

  try {
    const result = await tool.run()
    messages.value = messages.value.slice(0, -1)
    if (result) say('assistant', result)
  } catch (error) {
    messages.value = messages.value.slice(0, -1)
    say(
      'assistant',
      error instanceof ApiError ? `That did not work: ${error.message}` : 'That did not work.',
    )
  } finally {
    busy.value = false
  }
}

function invoke(tool: AssistantTool) {
  say('user', tool.label)
  if (tool.id === 'build_website') {
    void execute(tool)
    return
  }
  if (tool.risk === 'low') void execute(tool)
  else confirming.value = tool
}

async function submit() {
  const text = draft.value.trim()
  if (!text || (busy.value && !wizardActive.value)) return

  draft.value = ''
  say('user', text)

  if (wizardActive.value) {
    say('assistant', 'Queued as a follow-up — I’ll apply that after the design questions.')
    return
  }

  if (composerMode.value === 'build' && wantsGuidedDesign(text)) {
    startWizard(text)
    return
  }

  if (wantsGuidedDesign(text)) {
    startWizard(text)
    return
  }

  const lower = text.toLowerCase()
  const matched = availableTools.value.find(
    (tool) =>
      tool.id.split('_').every((word) => lower.includes(word)) ||
      lower.includes(tool.label.toLowerCase()),
  )

  if (matched) {
    if (matched.risk === 'low') void execute(matched)
    else confirming.value = matched
    return
  }

  busy.value = true
  thinking.value = true
  say('assistant', '', { generation: true, generationPhase: 'review' })
  try {
    await new Promise((resolve) => setTimeout(resolve, 900))
    const result = await api.post<{
      answer: string
      model: string
      catalogueHits?: CatalogueHit[]
      actions?: AssistActionPayload[]
    }>('/api/v1/ai/assist', {
      message: text,
      includeCatalogue: !props.freeformMode,
      freeformMode: props.freeformMode,
      layoutContext: props.freeformMode ? props.layoutContext ?? undefined : undefined,
    })
    thinking.value = false
    messages.value = messages.value.slice(0, -1)
    say('assistant', result.answer, {
      thinkingSeconds: 1,
      catalogueHits: result.catalogueHits?.slice(0, 8) ?? [],
    })
    await applyAssistActions(result.actions as AssistActionPayload[] | undefined)
  } catch (error) {
    thinking.value = false
    messages.value = messages.value.slice(0, -1)
    if (error instanceof ApiError && (error.status === 503 || error.code === 'ai_unavailable')) {
      say(
        'assistant',
        'I can run the actions listed below right now. Understanding free-form questions needs a language model connected — add a Gemini or Anthropic key under Settings → AI.\n\nTip: say “create a landing page” and I’ll walk you through design choices A→Z.',
      )
    } else {
      say('assistant', friendlyAssistError(error))
    }
  } finally {
    busy.value = false
    thinking.value = false
  }
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col bg-[#fafafa]" aria-label="AI assistant">
    <header class="flex items-center justify-between border-b border-black/5 px-4 py-3">
      <div class="flex items-center gap-2">
        <span class="grid h-6 w-6 place-items-center rounded-md bg-ink text-paper" aria-hidden="true">
          <Sparkles class="h-3.5 w-3.5" :stroke-width="1.75" />
        </span>
        <p class="text-[0.8125rem] font-semibold text-ink">Assistant</p>
        <UiBadge tone="neutral">Build</UiBadge>
      </div>
      <button
        v-if="closable"
        type="button"
        class="grid h-7 w-7 place-items-center rounded-md text-faint transition-colors hover:bg-black/5 hover:text-ink"
        aria-label="Hide assistant"
        @click="emit('close')"
      >
        &times;
      </button>
    </header>

    <div ref="log" class="flex-1 overflow-y-auto px-4 py-4">
      <div v-if="!messages.length" class="pt-6 text-center">
        <p class="text-[0.9375rem] font-semibold text-ink">What should we build?</p>
        <p class="mx-auto mt-1.5 max-w-[16rem] text-[0.8125rem] leading-relaxed text-soft">
          <template v-if="freeformMode">
            Describe the page in plain language — I’ll only use freeform layout trees (Empty section), never Motionsites or registry components.
          </template>
          <template v-else>
            Say “create a landing page” — I’ll think, show a design preview, then ask choices A→Z.
          </template>
        </p>
        <UiButton
          class="mt-4"
          size="sm"
          variant="primary"
          :disabled="busy"
          @click="say('user', 'create a landing page'); startWizard('create a landing page')"
        >
          Create a landing page
        </UiButton>
      </div>

      <ul v-else class="flex flex-col gap-3">
        <li
          v-for="message in messages"
          :key="message.id"
          class="flex flex-col gap-2"
          :class="message.role === 'user' ? 'items-end' : 'items-start'"
        >
          <div
            v-if="message.text"
            class="max-w-[18rem] rounded-2xl px-3.5 py-2 text-[0.8125rem] leading-relaxed whitespace-pre-line"
            :class="message.role === 'user' ? 'bg-[#ececec] text-ink' : 'bg-transparent px-0 text-ink'"
          >
            <p
              v-if="message.role === 'assistant' && message.thinkingSeconds != null"
              class="mb-1.5 text-[0.75rem] text-faint"
            >
              Thought for {{ message.thinkingSeconds }}s
            </p>
            {{ message.text }}
          </div>

          <p
            v-else-if="message.role === 'assistant' && thinking"
            class="text-[0.75rem] text-faint"
          >
            Thinking…
          </p>

          <AssistantGenerationCard
            v-if="message.generation"
            :thinking-seconds="message.text ? null : message.thinkingSeconds"
            :phase="message.generationPhase || 'review'"
            :caption="message.generationCaption"
          />

          <AssistantWizardCard
            v-if="message.wizard && wizardActive"
            class="w-full max-w-[20rem]"
            :steps="DESIGN_WIZARD_STEPS"
            goal-label="landing page structure"
            @complete="finishWizard"
            @skip="skipWizard"
          />

          <div
            v-if="message.role === 'assistant' && message.catalogueHits?.length"
            class="flex w-full max-w-[20rem] flex-col gap-1.5"
          >
            <p class="text-[0.6875rem] font-medium uppercase tracking-[0.06em] text-faint">
              Insert from catalogue
            </p>
            <button
              v-for="hit in message.catalogueHits"
              :key="`${hit.kind}:${hit.id}`"
              type="button"
              class="flex items-start gap-2 rounded-xl border border-black/8 bg-white px-2.5 py-2 text-left transition-colors hover:border-brand hover:bg-brand-soft/40"
              :title="`Insert ${hit.kind} ${hit.id}`"
              @click="emit('insert-catalogue', hit)"
            >
              <span
                class="mt-0.5 shrink-0 rounded bg-sunken px-1.5 py-0.5 text-[0.625rem] uppercase tracking-wide text-soft"
              >{{ hit.kind }}</span>
              <span class="min-w-0">
                <span class="block truncate text-[0.8125rem] font-medium text-ink">{{ hit.name }}</span>
                <span class="block truncate text-[0.6875rem] text-faint">
                  {{ hit.id }} · {{ hit.category }}
                </span>
              </span>
            </button>
          </div>
        </li>
      </ul>

      <div
        v-if="wizardActive && pendingPlan.length"
        class="mt-3 max-w-[20rem] rounded-xl border border-black/8 bg-white px-3 py-2.5 shadow-sm"
      >
        <p class="text-[0.6875rem] font-medium text-ink">Waiting for answers</p>
        <p class="mt-0.5 text-[0.75rem] text-faint line-through">Designing landing page structure</p>
      </div>
    </div>

    <!-- Lovable-style composer -->
    <div class="border-t border-black/5 bg-white p-3">
      <div class="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
        <div class="flex items-center justify-between gap-2 border-b border-black/5 px-3 py-2">
          <button
            type="button"
            class="truncate text-left text-[0.6875rem] text-faint hover:text-ink"
            title="Reuse site theme, pages, and media from this workspace"
          >
            @ Reuse work from this workspace
          </button>
          <button
            type="button"
            class="shrink-0 text-[0.6875rem] font-medium text-soft hover:text-ink"
            @click="navigateTo('/website/media')"
          >
            Add reference
          </button>
        </div>

        <form class="px-3 pt-2" @submit.prevent="submit">
          <textarea
            v-model="draft"
            rows="2"
            :placeholder="wizardActive ? 'Queue follow-up…' : 'Tell the assistant what to do…'"
            aria-label="Ask the assistant"
            class="w-full resize-none bg-transparent text-[0.875rem] leading-relaxed text-ink outline-none placeholder:text-faint"
            :disabled="busy && !wizardActive"
            @keydown.meta.enter.prevent="submit"
            @keydown.ctrl.enter.prevent="submit"
          />
        </form>

        <div class="flex items-center gap-1.5 px-2 pb-2 pt-1">
          <button
            type="button"
            class="grid h-8 w-8 place-items-center rounded-lg text-faint hover:bg-black/5 hover:text-ink"
            aria-label="Add attachment"
            @click="navigateTo('/website/media')"
          >
            <Plus class="h-4 w-4" :stroke-width="1.75" />
          </button>

          <div class="relative ml-auto flex items-center gap-1">
            <div class="flex overflow-hidden rounded-xl border border-black/10">
              <button
                type="button"
                class="px-2.5 py-1.5 text-[0.75rem] font-semibold transition-colors"
                :class="composerMode === 'build' ? 'bg-ink text-paper' : 'bg-white text-soft hover:text-ink'"
                @click="composerMode = 'build'"
              >
                Build
              </button>
              <button
                type="button"
                class="border-l border-black/10 px-2 py-1.5 text-soft hover:bg-black/5 hover:text-ink"
                aria-label="Composer modes"
                @click="composerMode = composerMode === 'build' ? 'chat' : 'build'"
              >
                <ChevronDown class="h-3.5 w-3.5" :stroke-width="1.75" />
              </button>
            </div>

            <button
              type="button"
              class="grid h-8 w-8 place-items-center rounded-lg text-faint opacity-40"
              aria-label="Voice (coming soon)"
              disabled
            >
              <Mic class="h-4 w-4" :stroke-width="1.75" />
            </button>

            <button
              v-if="busy || thinking"
              type="button"
              class="grid h-8 w-8 place-items-center rounded-lg bg-ink text-paper"
              aria-label="Stop"
              @click="busy = false; thinking = false"
            >
              <Square class="h-3 w-3 fill-current" :stroke-width="1.75" />
            </button>
            <button
              v-else
              type="button"
              class="grid h-8 w-8 place-items-center rounded-lg bg-ink text-paper disabled:opacity-30"
              :disabled="!draft.trim() && !wizardActive"
              aria-label="Send"
              @click="submit"
            >
              <ArrowUp class="h-4 w-4" :stroke-width="2" />
            </button>
          </div>
        </div>
      </div>

      <ul v-if="!wizardActive && !messages.length" class="mt-2 flex flex-col gap-0.5">
        <li v-for="tool in availableTools" :key="tool.id">
          <button
            type="button"
            class="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[0.75rem] text-soft transition-colors hover:bg-black/5 hover:text-ink disabled:opacity-40"
            :disabled="busy"
            :title="tool.hint"
            @click="invoke(tool)"
          >
            <component :is="tool.icon" class="h-3.5 w-3.5 shrink-0" :stroke-width="1.75" aria-hidden="true" />
            {{ tool.label }}
          </button>
        </li>
      </ul>
    </div>

    <UiDialog
      :open="confirming !== null"
      title="Confirm this action"
      :description="confirming?.hint ?? ''"
      @update:open="confirming = null"
    >
      <p class="text-sm leading-relaxed text-soft">
        The assistant wants to <strong class="text-ink">{{ confirming?.label.toLowerCase() }}</strong>.
        This changes your workspace and will be recorded in the activity log.
      </p>
      <template #footer>
        <UiButton @click="confirming = null">Cancel</UiButton>
        <UiButton variant="primary" @click="confirming && execute(confirming)">Run it</UiButton>
      </template>
    </UiDialog>
  </div>
</template>
