<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { createSection, getBlock, listBlockMetadata } from '@platform/blocks'
import {
  brandFromIslandId,
  detectExactIslandIntent,
  isMotionsitesCodegenBrief,
  MOTIONSITES_ISLAND_HEADER_BLOCK,
} from '@platform/templates'
import {
  applyTemplateMotionTypes,
  type Page,
  type PageSummary,
  type Section,
  type Seo,
  type SeoSettings,
  type Site,
  type TemplateMotionType,
  type Theme,
} from '@platform/schemas'
import { ArrowLeft, Monitor, PanelLeft, PanelRight, Redo2, Smartphone, Sparkles, Tablet, Undo2 } from '@lucide/vue'

/**
 * The canvas editor.
 *
 * Layers on the left, the live page in the middle, Agent and Style on the
 * right. The canvas renders the *real* blocks through the shared Nuxt layer, so
 * editing a field updates the actual page immediately — there is no preview
 * approximation to drift out of sync with the thing being published.
 */
definePageMeta({ layout: 'editor' })

const route = useRoute()
const api = useApi()
const can = useCan()
const config = useRuntimeConfig()
const activeSiteId = useActiveSiteId()

const pageId = computed(() => route.params.pageId as string)

const { data, refresh, error: loadError, status: loadStatus } = await useAsyncData(
  () => `editor:${pageId.value}`,
  async () => {
    const page = await api.get<Page>(`/api/v1/pages/${pageId.value}`)
    const [site, siblings, seoSettings] = await Promise.all([
      api.get<Site>(`/api/v1/sites/${page.siteId}`),
      api.get<PageSummary[]>(`/api/v1/sites/${page.siteId}/pages`),
      api.get<SeoSettings>(`/api/v1/seo/sites/${page.siteId}/settings`).catch(() => null),
    ])
    return { page, site, siblings, brandLogo: seoSettings?.business.logo?.trim() ?? '' }
  },
  { watch: [pageId] },
)

const brandLogo = computed(() => data.value?.brandLogo ?? '')

const sections = ref<Section[]>([])
const title = ref('')
const seo = ref<Seo>({ noIndex: false })
const selectedId = ref<string | null>(null)
const dirty = ref(false)
const saving = ref(false)
const publishing = ref(false)
const message = ref('')
const errorMessage = ref('')
const picking = ref(false)

const leftTab = ref<'pages' | 'layers'>('layers')
const rightTab = ref<'agent' | 'style'>('style')
/** Open by default so Layers + Properties are available as soon as the editor loads. */
const leftOpen = ref(true)
const rightOpen = ref(true)
const device = ref<'desktop' | 'tablet' | 'mobile'>('desktop')
const zoom = ref(70)

/** Classic layers/properties editor vs Lovable-style assistant + live preview. */
const { mode: builderMode, setMode: setBuilderMode } = useEditorBuilderMode()
const interactive = computed(() => builderMode.value === 'interactive')

/** Panel widths + open state persist per browser. */
const leftWidth = ref(256)
const rightWidth = ref(336)
/** Wider assistant column when interactive builder is on. */
const interactiveAssistantWidth = ref(400)

onMounted(() => {
  const stored = localStorage.getItem('editor:panels')
  if (!stored) return
  try {
    const parsed = JSON.parse(stored) as {
      left?: number
      right?: number
      leftOpen?: boolean
      rightOpen?: boolean
      interactiveAssistantWidth?: number
    }
    if (parsed.left) leftWidth.value = parsed.left
    if (parsed.right) rightWidth.value = parsed.right
    if (typeof parsed.leftOpen === 'boolean') leftOpen.value = parsed.leftOpen
    if (typeof parsed.rightOpen === 'boolean') rightOpen.value = parsed.rightOpen
    if (parsed.interactiveAssistantWidth) interactiveAssistantWidth.value = parsed.interactiveAssistantWidth
  } catch {
    // A corrupt value just means the defaults stand.
  }
})

watch(
  [leftWidth, rightWidth, leftOpen, rightOpen, interactiveAssistantWidth],
  ([left, right, leftIsOpen, rightIsOpen, assistantWidth]) => {
    localStorage.setItem(
      'editor:panels',
      JSON.stringify({
        left,
        right,
        leftOpen: leftIsOpen,
        rightOpen: rightIsOpen,
        interactiveAssistantWidth: assistantWidth,
      }),
    )
  },
)

watch(builderMode, (next) => {
  if (next === 'interactive') {
    // Assistant stays primary; properties open when a section is selected.
    leftOpen.value = true
    rightOpen.value = Boolean(selectedId.value)
    rightTab.value = selectedId.value ? 'style' : 'agent'
  } else {
    leftOpen.value = true
    rightOpen.value = true
    rightTab.value = 'style'
  }
}, { immediate: true })

const metadata = listBlockMetadata()

const styleTab = ref<'content' | 'design'>('content')
const history = useEditorHistory<Section[]>()

/** Snapshot before every mutation, so undo returns to the prior document. */
function mutate(next: Section[]) {
  history.commit(sections.value)
  sections.value = next
  markDirty()
}

/**
 * Change the document *without* opening a new undo entry.
 *
 * Only for the second half of a mutation the user already made — generated
 * copy landing on sections `mutate` has already snapshotted for. Inserting a
 * template and having its copy written is one act; undoing it must remove the
 * sections, not peel the words off and leave eight empty blocks behind.
 */
function amend(next: Section[]) {
  sections.value = next
}

watch(
  data,
  (value) => {
    if (!value) return
    sections.value = structuredClone(toRaw(value.page.sections))
    title.value = value.page.title
    seo.value = {
      title: value.page.seo.title,
      description: value.page.seo.description,
      ogImage: value.page.seo.ogImage,
      canonical: value.page.seo.canonical,
      noIndex: value.page.seo.noIndex ?? false,
    }
    activeSiteId.value = value.page.siteId

    const previous = selectedId.value
    selectedId.value = sections.value.some((section) => section.id === previous)
      ? previous
      : (sections.value[0]?.id ?? null)

    dirty.value = false
    history.reset()
  },
  { immediate: true },
)

const selected = computed(() => sections.value.find((section) => section.id === selectedId.value) ?? null)
const selectedIndex = computed(() => sections.value.findIndex((section) => section.id === selectedId.value))
const selectedBlock = computed(() =>
  selected.value ? (metadata.find((block) => block.id === selected.value!.block) ?? null) : null,
)

function labelFor(section: Section): string {
  return getBlock(section.block)?.name ?? section.block
}

function markDirty() {
  dirty.value = true
  message.value = ''
}

/**
 * Persist a theme patch immediately (site-wide design tokens / content width).
 * Updates the local site so the canvas reacts without a full reload.
 */
async function patchSiteTheme(next: Theme) {
  if (!data.value || !can('page:write')) return
  const previous = data.value.site.theme
  data.value = {
    ...data.value,
    site: { ...data.value.site, theme: next },
  }
  try {
    await api.patch(`/api/v1/sites/${data.value.site.id}`, { theme: next })
  } catch (error) {
    data.value = {
      ...data.value,
      site: { ...data.value.site, theme: previous },
    }
    errorMessage.value = error instanceof ApiError ? error.message : 'Could not update the theme.'
  }
}

/** Assistant already PATCHed — only sync the live editor canvas. */
function applyThemeLocal(next: Theme) {
  if (!data.value) return
  data.value = {
    ...data.value,
    site: { ...data.value.site, theme: next },
  }
}

function updateSelectedProps(props: Record<string, unknown>) {
  mutate(sections.value.map((section) => (section.id === selectedId.value ? { ...section, props } : section)))
}

/** Motion and visibility live beside props on the section, not inside them. */
function updateSelectedSection(patch: Partial<Section>) {
  mutate(sections.value.map((section) => (section.id === selectedId.value ? { ...section, ...patch } : section)))
}

/**
 * Live-region text for screen readers.
 *
 * Reordering is a change with no visual anchor for someone who cannot see the
 * canvas, so every move says where the section landed.
 */
const announcement = ref('')

function announce(text: string) {
  // Reassigning identical text does not re-announce, so clear it first.
  announcement.value = ''
  void nextTick(() => {
    announcement.value = text
  })
}

function reorder(from: number, to: number) {
  if (from === to || to < 0 || to >= sections.value.length) return
  const next = [...sections.value]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved!)
  mutate(next)
  announce(`${labelFor(moved!)} moved to position ${to + 1} of ${next.length}.`)
}

function move(index: number, delta: number) {
  reorder(index, index + delta)
}

/** Keyboard reordering for the section selected on the canvas. */
function moveSelected(delta: number) {
  const index = sections.value.findIndex((section) => section.id === selectedId.value)
  if (index === -1) return
  move(index, delta)
}

function remove(index: number) {
  const removed = sections.value[index]
  mutate(sections.value.filter((_, i) => i !== index))
  if (selectedId.value === removed?.id) selectedId.value = sections.value[0]?.id ?? null
}

/** Duplicate keeps the props but must not clone the id. */
function duplicate(index: number) {
  const original = sections.value[index]
  if (!original) return

  const copy = createSection(original.block, original.props)
  const next = [...sections.value]
  next.splice(index + 1, 0, { ...copy, motion: original.motion, visibility: original.visibility })
  mutate(next)
  selectedId.value = copy.id
}

/**
 * Insert a whole arrangement — a template recipe or a saved asset — as ONE
 * undo step. Section ids are reissued so inserting the same asset twice does
 * not produce colliding ids in the same document.
 *
 * `atIndex` places the run at a canvas drop position; omit to append.
 */
function insertSections(incoming: Section[], atIndex?: number) {
  if (!incoming.length) return

  // Exact islands pair with one system header — never stack duplicate headers.
  const hasHeader = sections.value.some((section) => {
    const meta = metadata.find((block) => block.id === section.block)
    return meta?.category === 'header'
  })
  const prepared = hasHeader
    ? incoming.filter((section) => metadata.find((block) => block.id === section.block)?.category !== 'header')
    : incoming
  if (!prepared.length) return

  const fresh = prepared.map((section) => ({
    ...createSection(section.block, section.props),
    motion: section.motion,
    visibility: section.visibility,
    seo: section.seo,
  }))
  const index =
    atIndex === undefined
      ? sections.value.length
      : Math.max(0, Math.min(atIndex, sections.value.length))
  const next = [...sections.value]
  next.splice(index, 0, ...fresh)
  mutate(next)
  // Prefer selecting the island (last of the run) when a header was prepended.
  const island = [...fresh].reverse().find((section) => section.block === 'motion-section-01')
  selectedId.value = island?.id ?? fresh[0]?.id ?? selectedId.value
  rightTab.value = 'style'
  styleTab.value = 'content'

  // Curated MotionSites React islands + shared glass header ship their own copy.
  const needsCopy = fresh.filter(
    (section) => section.block !== 'motion-section-01' && section.block !== 'header-liquid-glass-01',
  )
  if (needsCopy.length) void writeCopyFor(needsCopy)
}

/** Template/insert-panel payload: block ids only, so build the sections here. */
function insertBlockIds(
  payload: {
    blockIds: string[]
    source?: 'block' | 'template'
    templateId?: string
    motionTypes?: TemplateMotionType[]
  },
  atIndex?: number,
) {
  const built = payload.blockIds.map((blockId) => createSection(blockId))
  const types = payload.motionTypes
  insertSections(
    types?.length
      ? built.map((section) => ({
          ...section,
          motion: applyTemplateMotionTypes(section.motion, types),
        }))
      : built,
    atIndex,
  )
}

/**
 * One-click insert from assistant catalogue hits (block registry or template recipe).
 */
async function onInsertCatalogue(hit: {
  kind: 'block' | 'template'
  id: string
  name: string
}) {
  if (!can('page:write')) {
    errorMessage.value = 'You need edit access to insert sections.'
    return
  }
  errorMessage.value = ''
  try {
    if (hit.kind === 'block') {
      insertBlockIds({ blockIds: [hit.id], source: 'block' })
      message.value = `Inserted ${hit.name}.`
      return
    }

    const detail = await api.get<{
      template: { id: string; title: string; blockRecipe: string[]; motionType?: TemplateMotionType[] }
      blocks: { id: string }[]
    }>(`/api/v1/templates/${hit.id}`)
    const blockIds =
      detail.blocks?.map((block) => block.id).filter(Boolean) ??
      detail.template.blockRecipe ??
      []
    if (!blockIds.length) {
      errorMessage.value = `Template “${hit.name}” has no registry blocks to insert.`
      return
    }
    insertBlockIds({
      blockIds,
      source: 'template',
      templateId: detail.template.id,
      motionTypes: detail.template.motionType,
    })
    message.value = `Inserted template “${detail.template.title}”.`
  } catch (caught) {
    errorMessage.value =
      caught instanceof ApiError ? caught.message : `Could not insert “${hit.name}”.`
  }
}

function onLibraryDrop(
  payload: {
    kind: 'insert-block' | 'insert-template'
    blockIds: string[]
    templateId?: string
    motionTypes?: TemplateMotionType[]
  },
  index: number,
) {
  insertBlockIds(
    {
      blockIds: payload.blockIds,
      source: payload.kind === 'insert-template' ? 'template' : 'block',
      templateId: payload.templateId,
      motionTypes: payload.motionTypes,
    },
    index,
  )
  picking.value = false
}

// --- generated copy for freshly inserted sections ---------------------------

/** Sections whose copy / Motionsites island is being written. Drives the canvas veil. */
const generatingIds = ref<string[]>([])

/** Exact Motionsites reveal dwell — long enough to read the generating state. */
const MOTION_EXACT_REVEAL_MS = 1_600

interface GeneratedSection {
  blockId: string
  props: Record<string, unknown>
  generated: boolean
  reason?: string
}

/** A hung request must not leave a section shimmering for the rest of the session. */
const GENERATE_TIMEOUT_MS = 25_000
const MOTION_LIVE_TIMEOUT_MS = 120_000

function defaultsFor(blockId: string): Record<string, unknown> {
  return (metadata.find((block) => block.id === blockId)?.defaults ?? {}) as Record<string, unknown>
}

/**
 * Fill in what the user has not already decided.
 *
 * A field still holding the block's own default is placeholder text nobody
 * chose, so generated copy replaces it. A field that differs was set by
 * whoever built the asset or template, and generated copy must not overwrite
 * a deliberate choice.
 */
function mergeGenerated(
  current: Record<string, unknown>,
  generated: Record<string, unknown>,
  defaults: Record<string, unknown>,
): Record<string, unknown> {
  const next = { ...current }
  for (const [key, value] of Object.entries(generated)) {
    if (JSON.stringify(current[key]) !== JSON.stringify(defaults[key])) continue
    next[key] = value
  }
  return next
}

async function writeCopyFor(inserted: Section[]) {
  if (!inserted.length || !can('page:write')) return

  generatingIds.value = inserted.map((section) => section.id)
  announce(`Writing copy for ${inserted.length} new section${inserted.length === 1 ? '' : 's'}.`)

  try {
    const response = await Promise.race([
      api.post<{ model: string | null; contextual: boolean; note: string; sections: GeneratedSection[] }>(
        `/api/v1/pages/${pageId.value}/sections/generate`,
        { blockIds: inserted.map((section) => section.block) },
      ),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), GENERATE_TIMEOUT_MS),
      ),
    ])

    // Answered in the order asked, so index is the pairing. Sections the user
    // has since undone or deleted are simply not found and skipped.
    const byId = new Map(inserted.map((section, index) => [section.id, response.sections[index]]))
    const pending = new Set(generatingIds.value)

    // `amend`, not `mutate`: the insert already took the snapshot, and this is
    // the same user action finishing. One click stays one undo.
    amend(
      sections.value.map((section) => {
        if (!pending.has(section.id)) return section
        const generated = byId.get(section.id)
        if (!generated?.generated) return section
        return {
          ...section,
          props: mergeGenerated(section.props, generated.props, defaultsFor(section.block)),
        }
      }),
    )

    const written = response.sections.filter((section: GeneratedSection) => section.generated).length
    message.value = written ? response.note : (response.sections[0]?.reason ?? response.note)
    announce(written ? `Copy written for ${written} section${written === 1 ? '' : 's'}.` : response.note)
  } catch {
    // Never strand a section. The defaults are already on the canvas and are a
    // perfectly usable starting point, so this is a note, not an error.
    message.value = 'Could not write copy just now — the new sections kept their default text.'
    announce(message.value)
  } finally {
    generatingIds.value = []
  }
}

function addBlock(blockId: string) {
  const section = createSection(blockId)
  mutate([...sections.value, section])
  selectedId.value = section.id
  rightTab.value = 'style'
  styleTab.value = 'content'
}

function undo() {
  const restored = history.undo(sections.value)
  if (!restored) return
  sections.value = restored
  if (!sections.value.some((section) => section.id === selectedId.value)) {
    selectedId.value = sections.value[0]?.id ?? null
  }
  markDirty()
}

function redo() {
  const restored = history.redo(sections.value)
  if (!restored) return
  sections.value = restored
  markDirty()
}

/**
 * Editor shortcuts. Ignored while a field has focus so typing "d" in a
 * headline never deletes a section, and ignored entirely while a dialog is
 * open — Backspace on the "Cancel" button of a dialog must not delete the
 * section behind it.
 */
function onKeydown(event: KeyboardEvent) {
  if (document.querySelector('[role="dialog"]')) return

  const target = event.target as HTMLElement | null
  const typing =
    target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)

  const modifier = event.metaKey || event.ctrlKey

  if (modifier && event.key.toLowerCase() === 'z') {
    event.preventDefault()
    if (event.shiftKey) redo()
    else undo()
    return
  }

  if (modifier && event.key.toLowerCase() === 's') {
    event.preventDefault()
    if (dirty.value) void save()
    return
  }

  if (typing) return

  // Alt+arrow reorders the selection: the keyboard equal of dragging it on the
  // canvas, so direct manipulation is never the only way to rearrange a page.
  // After the typing guard, because Option+arrow moves the caret in a textarea
  // and taking that away to move a section would be a poor trade.
  if (event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
    event.preventDefault()
    moveSelected(event.key === 'ArrowUp' ? -1 : 1)
    return
  }

  const index = sections.value.findIndex((section) => section.id === selectedId.value)

  if (modifier && event.key.toLowerCase() === 'd' && index !== -1) {
    event.preventDefault()
    duplicate(index)
    return
  }

  if ((event.key === 'Backspace' || event.key === 'Delete') && index !== -1) {
    event.preventDefault()
    remove(index)
    return
  }

  if (event.key === 'Escape') selectedId.value = null
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

// --- per-section AI ---------------------------------------------------------

const aiOpen = ref(false)
const aiInstruction = ref('')
const aiAutoApply = ref(false)

watch(aiOpen, (isOpen) => {
  if (!isOpen) {
    aiAutoApply.value = false
    aiInstruction.value = ''
  }
})

function askAi(index: number) {
  const section = sections.value[index]
  if (!section) return
  selectedId.value = section.id
  rightOpen.value = true
  rightTab.value = 'style'
  aiInstruction.value = ''
  aiAutoApply.value = false
  aiOpen.value = true
}

/**
 * Close Add, place Motionsites on the canvas under a generating veil, then
 * either reveal the exact island or finish live codegen into the same slot.
 */
async function onGenerateMotion(payload: {
  mode: 'exact' | 'live'
  templateId: string
  title: string
  brief?: string
  previewImage?: string
  previewVideo?: string
}) {
  picking.value = false
  aiOpen.value = false

  const brand = brandFromIslandId(payload.templateId)
  const incoming = [
    createSection(MOTIONSITES_ISLAND_HEADER_BLOCK, { brand, trademark: true }),
    createSection('motion-section-01', {
      sectionId: payload.templateId,
      title: payload.title,
      minHeight: '100vh',
    }),
  ]
  insertSections(incoming)

  const island = [...sections.value]
    .reverse()
    .find((section) => section.block === 'motion-section-01')
  if (!island) return

  generatingIds.value = [island.id]
  announce(
    payload.mode === 'live'
      ? `Generating Motionsites “${payload.title}”.`
      : `Placing Motionsites “${payload.title}”.`,
  )
  message.value =
    payload.mode === 'live' ? 'Generating Motionsites…' : 'Building Motionsites on the canvas…'

  try {
    if (payload.mode === 'live') {
      const brief =
        payload.brief?.trim() ||
        `Rebuild this section in the spirit of MotionSites “${payload.title}” — cinematic motion, theme colours only, no third-party assets.`
      const result = await Promise.race([
        api.post<{ sectionId: string }>('/api/v1/ai/motionsites-generate-live', {
          brief,
          templateId: payload.templateId,
          title: payload.title,
          previewImage: payload.previewImage,
          previewVideo: payload.previewVideo,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('MotionSites generate timed out')), MOTION_LIVE_TIMEOUT_MS),
        ),
      ])

      amend(
        sections.value.map((section) =>
          section.id === island.id
            ? {
                ...section,
                props: {
                  ...section.props,
                  sectionId: result.sectionId,
                  title: payload.title || result.sectionId,
                },
              }
            : section,
        ),
      )
      message.value = `Live island “${result.sectionId}” inserted.`
      announce(message.value)
    } else {
      await new Promise((resolve) => setTimeout(resolve, MOTION_EXACT_REVEAL_MS))
      message.value = `Exact island “${payload.templateId}” inserted.`
      announce(message.value)
    }
  } catch (error) {
    message.value =
      error instanceof Error ? error.message : 'Could not generate a Motionsites island.'
    announce(message.value)
  } finally {
    generatingIds.value = []
  }
}

/**
 * MotionSites background / section rebuild: optionally insert a seed block,
 * then open Ask AI — unless the instruction is a React Motionsites brief, which
 * must go through generate-live → island (Ask AI rejects those as invalid).
 *
 * When the catalogue carries same-origin preview media (`/motionsites/...`),
 * patch those onto the newly inserted seed as `image` / `video` props so the
 * hero can show the photo or looping video immediately (ADR-0003 — no CDN).
 */
async function onRebuildAi(payload: {
  instruction: string
  blockIds?: string[]
  motionTypes?: TemplateMotionType[]
  templateId?: string
  previewImage?: string
  previewVideo?: string
  openAi?: boolean
}) {
  // Exact React Motionsites briefs must never rewrite Vue template props.
  const islandId = detectExactIslandIntent(payload.instruction)
  if (islandId) {
    await onGenerateMotion({
      mode: 'exact',
      templateId: islandId,
      title: payload.templateId || islandId,
      brief: payload.instruction,
      previewImage: payload.previewImage,
      previewVideo: payload.previewVideo,
    })
    return
  }

  // Full Motionsites React/Vite briefs → codegen live island (not Ask AI).
  if (isMotionsitesCodegenBrief(payload.instruction)) {
    await onGenerateMotion({
      mode: 'live',
      templateId: payload.templateId || 'generated-island',
      title: payload.templateId || 'Motionsites island',
      brief: payload.instruction,
      previewImage: payload.previewImage,
      previewVideo: payload.previewVideo,
    })
    return
  }

  const insertedCount = payload.blockIds?.length ?? 0
  if (payload.blockIds?.length) {
    insertBlockIds({
      blockIds: payload.blockIds,
      source: payload.templateId ? 'template' : 'block',
      templateId: payload.templateId,
      motionTypes: payload.motionTypes,
    })
  }

  const media: Record<string, string> = {}
  if (payload.previewImage) media.image = payload.previewImage
  if (payload.previewVideo) media.video = payload.previewVideo
  if (insertedCount > 0 && Object.keys(media).length) {
    // Same undo step as the insert (`amend`): media is part of seeding.
    // Apply to the last inserted section (the seed hero).
    const last = sections.value[sections.value.length - 1]
    if (last) {
      amend(
        sections.value.map((section) =>
          section.id === last.id
            ? { ...section, props: { ...section.props, ...media } }
            : section,
        ),
      )
      selectedId.value = last.id
      markDirty()
    }
  }

  picking.value = false
  // Prefer the section insertSections just selected; otherwise the last layer.
  if (!selectedId.value && sections.value.length) {
    selectedId.value = sections.value[sections.value.length - 1]!.id
  }

  // Motionsites backgrounds: media is already on the section — stay on canvas.
  if (payload.openAi === false) {
    message.value = 'Background added to the page.'
    return
  }

  // Persist before Ask AI — otherwise suggest returns "Section not found."
  try {
    await ensureDraftSaved()
  } catch {
    message.value = 'Save the draft before asking AI to edit this section.'
    return
  }

  aiInstruction.value = payload.instruction
  aiAutoApply.value = true
  await nextTick()
  aiOpen.value = true
}

/**
 * Replace a seed / selected section with the shared liquid-glass header (once)
 * plus the exact React island — never a Vue prop rewrite of the Motionsites brief.
 */
function onUseIsland(sectionId: string) {
  picking.value = false
  aiOpen.value = false
  aiInstruction.value = ''
  aiAutoApply.value = false

  const brand = brandFromIslandId(sectionId)
  const title = brandFromIslandId(sectionId)
  const incoming = [
    createSection(MOTIONSITES_ISLAND_HEADER_BLOCK, { brand, trademark: true }),
    createSection('motion-section-01', {
      sectionId,
      title: `${title} Hero`,
      minHeight: '100vh',
    }),
  ]

  // Drop the temporary seed the rebuild flow may have inserted.
  if (selectedId.value) {
    mutate(sections.value.filter((section) => section.id !== selectedId.value))
  }

  insertSections(incoming)
  message.value = `Exact island “${sectionId}” inserted with shared header.`
}

/**
 * A proposal the user accepted. The server has already written and audited it;
 * the canvas takes the same change locally so the page on screen matches, and
 * as one undo step like any other edit.
 *
 * Seeded same-origin `image` / `video` (MotionSites backgrounds) are kept when
 * the proposal omits them, so auto-apply after rebuild does not blank the media.
 */
function applyAiProposal(props: Record<string, unknown>) {
  mutate(
    sections.value.map((section) => {
      if (section.id !== selectedId.value) return section
      const next = { ...props }
      for (const key of ['image', 'video'] as const) {
        const existing = section.props[key]
        if (
          typeof existing === 'string' &&
          existing &&
          (next[key] === undefined || next[key] === '')
        ) {
          next[key] = existing
        }
      }
      return { ...section, props: next }
    }),
  )
  announce('AI change applied. Undo with ⌘Z.')
  message.value = 'AI change applied and saved to the draft.'
}

// --- layers list drag and drop (canvas drag lives in EditorCanvas) -----------
const draggingIndex = ref<number | null>(null)
const dropIndex = ref<number | null>(null)

function onDragStart(index: number, event: DragEvent) {
  draggingIndex.value = index
  event.dataTransfer!.effectAllowed = 'move'
  event.dataTransfer!.setData('text/plain', String(index))
}
function onDragOver(index: number, event: DragEvent) {
  event.preventDefault()
  event.dataTransfer!.dropEffect = 'move'
  dropIndex.value = index
}
function onDrop(index: number) {
  if (draggingIndex.value !== null) reorder(draggingIndex.value, index)
  draggingIndex.value = null
  dropIndex.value = null
}
function onDragEnd() {
  draggingIndex.value = null
  dropIndex.value = null
}

// --- persistence ------------------------------------------------------------

async function save(): Promise<boolean> {
  saving.value = true
  errorMessage.value = ''
  try {
    await api.patch<Page>(`/api/v1/pages/${pageId.value}`, {
      title: title.value,
      seo: seo.value,
      sections: sections.value,
    })
    await refresh()
    message.value = 'Draft saved.'
    return true
  } catch (caught) {
    errorMessage.value = caught instanceof ApiError ? caught.message : 'Could not save.'
    return false
  } finally {
    saving.value = false
  }
}

/**
 * Section AI looks up the section on the stored page. Fresh inserts must be
 * saved first or the API returns "Section not found."
 */
async function ensureDraftSaved() {
  if (!dirty.value) return
  const ok = await save()
  if (!ok) throw new Error(errorMessage.value || 'Could not save.')
}

async function publish() {
  publishing.value = true
  errorMessage.value = ''
  try {
    if (dirty.value) await save()
    await api.post<Page>(`/api/v1/pages/${pageId.value}/publish`)
    await refresh()
    message.value = 'Published.'
  } catch (caught) {
    errorMessage.value = caught instanceof ApiError ? caught.message : 'Could not publish.'
  } finally {
    publishing.value = false
  }
}

const liveUrl = computed(() =>
  data.value?.site.primaryHostname
    ? `http://${data.value.site.primaryHostname}:3001${data.value.page.path}`
    : `${config.public.storefrontUrl}${data.value?.page.path ?? '/'}`,
)

const ZOOM_STEPS = [50, 70, 100, 125]
const DEVICES = [
  { id: 'desktop', label: 'Desktop', icon: Monitor },
  { id: 'tablet', label: 'Tablet', icon: Tablet },
  { id: 'mobile', label: 'Mobile', icon: Smartphone },
] as const

function togglePropertiesPanel() {
  rightOpen.value = !rightOpen.value
  if (rightOpen.value) rightTab.value = 'style'
}
</script>

<template>
  <div
    v-if="loadStatus === 'pending' && !data"
    class="grid h-screen place-items-center bg-sunken px-6 text-center"
  >
    <p class="text-[0.875rem] text-soft">Opening page editor…</p>
  </div>

  <div
    v-else-if="!data"
    class="grid h-screen place-items-center bg-sunken px-6 text-center"
  >
    <div class="max-w-md">
      <p class="text-[1.125rem] font-semibold text-ink">Could not open this page</p>
      <p class="mt-2 text-[0.875rem] leading-relaxed text-soft">
        {{
          loadError instanceof Error
            ? loadError.message
            : 'The page may have been deleted, or the API is unreachable.'
        }}
      </p>
      <div class="mt-5 flex justify-center gap-2">
        <UiButton to="/website/pages">Back to pages</UiButton>
        <UiButton variant="primary" @click="refresh()">Try again</UiButton>
      </div>
    </div>
  </div>

  <div v-else class="flex h-screen min-h-0 flex-col overflow-hidden">
    <!-- Top bar ------------------------------------------------------------ -->
    <!--
      Header z-index: the body paints after this row, so an absolute Page
      popover would otherwise sit under the side panels and canvas chrome.
    -->
    <header class="editor-chrome relative z-[var(--z-nav-flyout)] flex h-12 shrink-0 items-center gap-3 border-b border-line bg-paper px-3">
      <NuxtLink
        to="/website/pages"
        class="grid h-8 w-8 place-items-center rounded-md text-faint no-underline transition-colors hover:bg-sunken hover:text-ink"
        aria-label="Back to pages"
      >
        <ArrowLeft class="h-4 w-4" :stroke-width="1.75" aria-hidden="true" />
      </NuxtLink>

      <div class="min-w-0">
        <p class="type-button truncate text-ink">{{ data.page.title }}</p>
        <p class="type-button-10 truncate text-faint">{{ data.site.name }} · {{ data.page.path }}</p>
      </div>

      <div class="ml-4 flex items-center gap-0.5 rounded-lg bg-sunken p-0.5">
        <button
          type="button"
          class="type-button-12 rounded-md px-2.5 py-1.5 transition-colors"
          :class="!interactive ? 'bg-raised text-ink shadow-card' : 'text-faint hover:text-ink'"
          :aria-pressed="!interactive"
          title="Classic editor — layers, canvas, properties"
          @click="setBuilderMode('classic')"
        >Editor</button>
        <button
          type="button"
          class="type-button-12 inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 transition-colors"
          :class="interactive ? 'bg-raised text-ink shadow-card' : 'text-faint hover:text-ink'"
          :aria-pressed="interactive"
          title="Interactive builder — AI assistant + live preview"
          @click="setBuilderMode('interactive')"
        >
          <Sparkles class="h-3.5 w-3.5" :stroke-width="ICON_STROKE" aria-hidden="true" />
          Interactive
        </button>
      </div>

      <div class="flex items-center gap-0.5 rounded-lg bg-sunken p-0.5">
        <button
          v-if="!interactive"
          type="button"
          class="grid h-7 w-8 place-items-center rounded-md transition-colors"
          :class="leftOpen ? 'bg-raised text-ink shadow-card' : 'text-faint hover:text-ink'"
          aria-label="Toggle layers panel"
          :aria-pressed="leftOpen"
          title="Layers"
          @click="leftOpen = !leftOpen"
        >
          <PanelLeft class="h-4 w-4" :stroke-width="ICON_STROKE" aria-hidden="true" />
        </button>
        <button
          type="button"
          class="grid h-7 w-8 place-items-center rounded-md transition-colors"
          :class="rightOpen ? 'bg-raised text-ink shadow-card' : 'text-faint hover:text-ink'"
          aria-label="Toggle properties panel"
          :aria-pressed="rightOpen"
          title="Properties"
          @click="togglePropertiesPanel"
        >
          <PanelRight class="h-4 w-4" :stroke-width="ICON_STROKE" aria-hidden="true" />
        </button>
      </div>

      <div class="flex items-center gap-0.5 rounded-lg bg-sunken p-0.5">
        <button
          v-for="option in DEVICES"
          :key="option.id"
          type="button"
          class="grid h-7 w-8 place-items-center rounded-md transition-colors"
          :class="device === option.id ? 'bg-raised text-ink shadow-card' : 'text-faint hover:text-ink'"
          :aria-label="option.label"
          :aria-pressed="device === option.id"
          @click="device = option.id"
        >
          <component :is="option.icon" class="h-4 w-4" :stroke-width="ICON_STROKE" aria-hidden="true" />
        </button>
      </div>

      <div class="flex items-center gap-0.5">
        <button
          type="button"
          class="grid h-7 w-7 place-items-center rounded-md text-faint transition-colors hover:bg-sunken hover:text-ink disabled:opacity-30"
          :disabled="!history.canUndo.value"
          title="Undo (⌘Z)"
          aria-label="Undo"
          @click="undo"
        >
          <Undo2 class="h-4 w-4" :stroke-width="ICON_STROKE" aria-hidden="true" />
        </button>
        <button
          type="button"
          class="grid h-7 w-7 place-items-center rounded-md text-faint transition-colors hover:bg-sunken hover:text-ink disabled:opacity-30"
          :disabled="!history.canRedo.value"
          title="Redo (⇧⌘Z)"
          aria-label="Redo"
          @click="redo"
        >
          <Redo2 class="h-4 w-4" :stroke-width="ICON_STROKE" aria-hidden="true" />
        </button>
      </div>

      <select
        v-model.number="zoom"
        class="type-button-12 h-7 rounded-md border border-line bg-raised px-1.5 tabular-nums text-soft"
        aria-label="Zoom"
      >
        <option v-for="step in ZOOM_STEPS" :key="step" :value="step">{{ step }}%</option>
      </select>

      <!-- Page title and SEO live beside the zoom control now: they belong to
           the page, not to the layer list they used to sit under. Guarded by
           the parent `v-if="data"` and always passed seo/sections (never
           undefined on first paint — seo defaults to `{ noIndex: false }`). -->
      <PageSettingsPopover
        v-if="data"
        :page="data.page"
        :title="title"
        :seo="seo"
        :sections="sections"
        :theme="data.site.theme"
        :disabled="!can('page:write')"
        @update:title="title = $event; markDirty()"
        @update:seo="seo = $event; markDirty()"
        @update:theme="patchSiteTheme"
      />

      <div class="ml-auto flex items-center gap-2">
        <UiBadge v-if="dirty" tone="warning">Unsaved</UiBadge>
        <UiBadge v-else-if="data.page.hasUnpublishedChanges" tone="warning">Not published</UiBadge>
        <UiBadge v-else-if="data.page.status === 'published'" tone="positive">Live</UiBadge>

        <UiButton size="sm" :to="liveUrl" target="_blank" external>View</UiButton>
        <UiButton
          size="sm"
          :loading="saving"
          :disabled="!dirty || !can('page:write')"
          @click="save"
        >Save</UiButton>
        <UiButton v-if="can('page:publish')" size="sm" variant="primary" :loading="publishing" @click="publish">
          Publish
        </UiButton>
      </div>
    </header>

    <div class="flex min-h-0 flex-1 overflow-hidden">
      <!-- Interactive: assistant + canvas + properties (when a section is selected) -->
      <template v-if="interactive">
        <aside
          class="editor-chrome flex min-h-0 shrink-0 flex-col border-r border-line bg-paper"
          :style="{ width: `${interactiveAssistantWidth}px` }"
        >
          <AssistantPanel
            @insert-catalogue="onInsertCatalogue"
            @theme-updated="applyThemeLocal"
          />
        </aside>

        <EditorResizer
          v-model="interactiveAssistantWidth"
          side="left"
          :min="300"
          :max="560"
          label="Resize the assistant panel"
        />

        <div data-editor-scroll class="relative min-h-0 min-w-0 flex-1 overflow-auto bg-canvas">
          <InsertPanel
            v-model:open="picking"
            :max-performance-class="data.site.theme.maxPerformanceClass"
            :theme="data.site.theme"
            :can-write="can('page:write')"
            :site-id="data.site.id"
            :page-id="data.page.id"
            @insert="insertBlockIds"
            @insert-sections="(sections) => { insertSections(sections); picking = false }"
            @generate-motion="onGenerateMotion"
            @rebuild-ai="onRebuildAi"
          />

          <p
            v-if="message || errorMessage"
            class="type-button-12 absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded-lg px-3 py-1.5 shadow-raised"
            :class="errorMessage ? 'bg-danger-soft text-danger' : 'bg-positive-soft text-positive'"
            role="status"
          >
            {{ errorMessage || message }}
          </p>

          <div class="pointer-events-none absolute left-3 top-3 z-10">
            <UiButton
              v-if="can('page:write')"
              class="pointer-events-auto"
              size="sm"
              variant="ghost"
              @click="picking = true"
            >+ Add</UiButton>
          </div>

          <EditorCanvas
            :sections="sections"
            :theme="data.site.theme"
            :selected-id="selectedId"
            :device="device"
            :zoom="zoom"
            :can-write="can('page:write')"
            :generating-ids="generatingIds"
            :brand-logo="brandLogo"
            @select="selectedId = $event; rightTab = 'style'; rightOpen = true"
            @reorder="reorder"
            @move-up="move($event, -1)"
            @move-down="move($event, 1)"
            @duplicate="duplicate"
            @remove="remove"
            @ask-ai="askAi"
            @library-drop="onLibraryDrop"
          />
        </div>

        <EditorResizer
          v-if="rightOpen"
          v-model="rightWidth"
          side="right"
          :min="260"
          :max="560"
          label="Resize the properties panel"
        />

        <aside
          v-if="rightOpen"
          class="editor-chrome flex min-h-0 shrink-0 flex-col border-l border-line bg-paper"
          :style="{ width: `${rightWidth}px` }"
        >
          <div class="flex shrink-0 items-center justify-between gap-2 border-b border-line px-3 py-2">
            <span class="type-button-12 text-ink">Properties</span>
            <button
              type="button"
              class="type-button-10 rounded-md px-2 py-1 text-faint hover:bg-sunken hover:text-ink"
              aria-label="Close properties"
              @click="rightOpen = false"
            >Close</button>
          </div>
          <div class="min-h-0 flex-1 overflow-y-auto p-4">
            <template v-if="selected && selectedBlock">
              <div class="mb-4 border-b border-line pb-3">
                <h2 class="type-button text-ink">{{ selectedBlock.name }}</h2>
                <p class="type-caption-12 mt-1 leading-relaxed text-soft">{{ selectedBlock.description }}</p>
              </div>
              <div class="mb-4 flex gap-0.5 rounded-lg bg-sunken p-0.5">
                <button
                  v-for="tab in ([
                    { id: 'content' as const, label: 'Content' },
                    { id: 'design' as const, label: 'Design' },
                  ])"
                  :key="tab.id"
                  type="button"
                  class="type-button-12 flex-1 rounded-md py-1.5 transition-colors"
                  :class="styleTab === tab.id ? 'bg-raised text-ink shadow-card' : 'text-soft hover:text-ink'"
                  :aria-pressed="styleTab === tab.id"
                  @click="styleTab = tab.id"
                >{{ tab.label }}</button>
              </div>
              <SectionForm
                v-if="styleTab === 'content'"
                :section="selected"
                :block="selectedBlock"
                :pages="data.siblings"
                :site-id="data.page.siteId"
                @update="updateSelectedProps"
              />
              <SectionProperties v-else :section="selected" @update="updateSelectedSection" />
            </template>
            <SiteDesignRail
              v-else
              :theme="data.site.theme"
              :disabled="!can('page:write')"
              @update:theme="patchSiteTheme"
            />
          </div>
        </aside>
      </template>

      <!-- Classic: layers / canvas / properties ----------------------------- -->
      <template v-else>
      <!-- Left: pages / layers ------------------------------------------- -->
      <aside
        v-if="leftOpen"
        class="editor-chrome flex min-h-0 shrink-0 flex-col bg-paper"
        :style="{ width: `${leftWidth}px` }"
      >
        <div class="flex shrink-0 gap-0.5 border-b border-line px-2 py-2" role="tablist">
          <button
            v-for="tab in (['pages', 'layers'] as const)"
            :key="tab"
            role="tab"
            :aria-selected="leftTab === tab"
            class="type-button-12 rounded-md px-2.5 py-1.5 capitalize transition-colors"
            :class="leftTab === tab ? 'bg-sunken text-ink' : 'text-soft hover:text-ink'"
            @click="leftTab = tab"
          >{{ tab }}</button>
        </div>

        <!-- Layers -->
        <div v-if="leftTab === 'layers'" class="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div class="flex shrink-0 items-center justify-between px-3 py-2">
            <span class="type-button-10 uppercase tracking-[0.08em] text-faint">Sections</span>
            <!-- TODO(Wave 0.5+): when selected section is layout-canvas-01, show Structure
                 subtree (walkLayoutNodes / isLayoutCanvasBlock) with nest/rename/duplicate. -->
            <UiButton v-if="can('page:write')" size="sm" variant="ghost" @click="picking = true">+ Add</UiButton>
          </div>

          <ul v-if="sections.length" class="min-h-0 flex-1 overflow-y-auto px-1.5 pb-3">
            <li
              v-for="(section, index) in sections"
              :key="section.id"
              draggable="true"
              class="rounded-md transition-[opacity,box-shadow]"
              :class="[
                draggingIndex === index ? 'opacity-40' : '',
                dropIndex === index && draggingIndex !== index ? 'shadow-[inset_0_2px_0_0_var(--brand)]' : '',
              ]"
              @dragstart="onDragStart(index, $event)"
              @dragover="onDragOver(index, $event)"
              @drop="onDrop(index)"
              @dragend="onDragEnd"
            >
              <div
                class="group flex items-center gap-1 rounded-md px-1.5 py-1.5 transition-colors"
                :class="section.id === selectedId ? 'bg-brand-soft' : 'hover:bg-sunken'"
              >
                <!-- The grip gives way to a pulse while the section's copy is
                     being written: the row still reads as a section, with its
                     state where the affordance was. -->
                <span
                  v-if="generatingIds.includes(section.id)"
                  class="grid h-4 w-4 shrink-0 place-items-center px-0.5"
                  :title="section.block === 'motion-section-01' ? 'Generating Motionsites…' : 'Writing copy…'"
                >
                  <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" aria-hidden="true" />
                  <span class="sr-only">{{
                    section.block === 'motion-section-01' ? 'Generating Motionsites' : 'Writing copy'
                  }}</span>
                </span>
                <span v-else class="type-button-12 cursor-grab select-none px-0.5 text-faint active:cursor-grabbing" aria-hidden="true">⠿</span>

                <button
                  type="button"
                  class="type-button-12 min-w-0 flex-1 truncate rounded px-0.5 py-0.5 text-left"
                  :class="section.id === selectedId ? 'text-brand' : 'text-ink'"
                  @click="selectedId = section.id; rightTab = 'style'; rightOpen = true"
                >{{ labelFor(section) }}</button>

                <span class="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100">
                  <button type="button" class="grid h-6 w-5 place-items-center rounded text-faint hover:text-ink disabled:opacity-25" :disabled="index === 0" aria-label="Move up" @click="move(index, -1)">↑</button>
                  <button type="button" class="grid h-6 w-5 place-items-center rounded text-faint hover:text-ink disabled:opacity-25" :disabled="index === sections.length - 1" aria-label="Move down" @click="move(index, 1)">↓</button>
                  <button type="button" class="grid h-6 w-5 place-items-center rounded text-faint hover:text-ink" aria-label="Duplicate" title="Duplicate (⌘D)" @click="duplicate(index)">⧉</button>
                  <button type="button" class="grid h-6 w-5 place-items-center rounded text-faint hover:text-danger" aria-label="Remove" @click="remove(index)">×</button>
                </span>
              </div>
            </li>
          </ul>

          <p v-else class="px-4 py-8 text-center text-[0.75rem] text-faint">No sections yet.</p>
        </div>

        <!-- Pages -->
        <div v-else class="min-h-0 flex-1 overflow-y-auto px-1.5 py-2">
          <NuxtLink
            v-for="sibling in data.siblings"
            :key="sibling.id"
            :to="`/pages/${sibling.id}`"
            class="flex items-center gap-2 rounded-md px-2 py-1.5 no-underline transition-colors"
            :class="sibling.id === data.page.id ? 'bg-brand-soft text-brand' : 'text-ink hover:bg-sunken'"
          >
            <span class="min-w-0 flex-1">
              <span class="type-button-12 block truncate">{{ sibling.title }}</span>
              <span class="type-button-10 block truncate text-faint">{{ sibling.path }}</span>
            </span>
            <span v-if="sibling.hasUnpublishedChanges" class="h-1.5 w-1.5 shrink-0 rounded-full bg-warning" aria-label="Unpublished changes" />
          </NuxtLink>
        </div>
      </aside>

      <EditorResizer
        v-if="leftOpen"
        v-model="leftWidth"
        side="left"
        :min="200"
        :max="480"
        label="Resize the layers panel"
      />

      <!-- Canvas ----------------------------------------------------------- -->
      <!-- `data-editor-scroll` marks the scroll parent the canvas auto-scrolls
           while a section is being dragged towards the edge. -->
      <div data-editor-scroll class="relative min-h-0 min-w-0 flex-1 overflow-auto bg-canvas">
        <!-- Hosted here, not at the editor root: the panel is `absolute`, so it
             anchors to the canvas column rather than to the viewport. -->
        <InsertPanel
          v-model:open="picking"
          :max-performance-class="data.site.theme.maxPerformanceClass"
          :theme="data.site.theme"
          :can-write="can('page:write')"
          :site-id="data.site.id"
          :page-id="data.page.id"
          @insert="insertBlockIds"
          @insert-sections="(sections) => { insertSections(sections); picking = false }"
          @generate-motion="onGenerateMotion"
          @rebuild-ai="onRebuildAi"
        />

        <p
          v-if="message || errorMessage"
          class="type-button-12 absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded-lg px-3 py-1.5 shadow-raised"
          :class="errorMessage ? 'bg-danger-soft text-danger' : 'bg-positive-soft text-positive'"
          role="status"
        >
          {{ errorMessage || message }}
        </p>

        <EditorCanvas
          :sections="sections"
          :theme="data.site.theme"
          :selected-id="selectedId"
          :device="device"
          :zoom="zoom"
          :can-write="can('page:write')"
          :generating-ids="generatingIds"
          :brand-logo="brandLogo"
          @select="selectedId = $event; rightTab = 'style'; rightOpen = true"
          @reorder="reorder"
          @move-up="move($event, -1)"
          @move-down="move($event, 1)"
          @duplicate="duplicate"
          @remove="remove"
          @ask-ai="askAi"
          @library-drop="onLibraryDrop"
        />
      </div>

      <EditorResizer
        v-if="rightOpen"
        v-model="rightWidth"
        side="right"
        :min="260"
        :max="560"
        label="Resize the properties panel"
      />

      <!-- Right: agent / style --------------------------------------------- -->
      <aside
        v-if="rightOpen"
        class="editor-chrome flex min-h-0 shrink-0 flex-col bg-paper"
        :style="{ width: `${rightWidth}px` }"
      >
        <div class="flex shrink-0 gap-0.5 border-b border-line px-2 py-2" role="tablist">
          <button
            v-for="tab in (['agent', 'style'] as const)"
            :key="tab"
            role="tab"
            :aria-selected="rightTab === tab"
            class="type-button-12 rounded-md px-2.5 py-1.5 capitalize transition-colors"
            :class="rightTab === tab ? 'bg-sunken text-ink' : 'text-soft hover:text-ink'"
            @click="rightTab = tab"
          >{{ tab }}</button>
        </div>

        <div v-if="rightTab === 'style'" class="min-h-0 flex-1 overflow-y-auto p-4">
          <template v-if="selected && selectedBlock">
            <div class="mb-4 border-b border-line pb-3">
              <div class="flex items-start justify-between gap-2">
                <h2 class="type-button text-ink">{{ selectedBlock.name }}</h2>
                <div class="flex shrink-0 items-center gap-1">
                  <UiBadge :tone="selectedBlock.performanceClass === 'A' ? 'positive' : selectedBlock.performanceClass === 'B' ? 'neutral' : 'warning'">
                    {{ selectedBlock.performanceClass }}
                  </UiBadge>
                  <button
                    v-if="can('page:write')"
                    type="button"
                    class="type-button-10 rounded-md border border-line px-2 py-1 text-soft transition-colors hover:border-brand hover:text-brand disabled:opacity-40"
                    :disabled="selectedIndex < 0"
                    title="Duplicate section (⌘D)"
                    aria-label="Duplicate this section"
                    @click="selectedIndex >= 0 && duplicate(selectedIndex)"
                  >Duplicate</button>
                  <button
                    v-if="can('page:write')"
                    type="button"
                    class="type-button-10 rounded-md border border-line px-2 py-1 text-soft transition-colors hover:border-brand hover:bg-brand-soft hover:text-brand disabled:opacity-40"
                    :disabled="selectedIndex < 0"
                    title="Ask AI"
                    aria-label="Ask AI to edit this section"
                    @click="selectedIndex >= 0 && askAi(selectedIndex)"
                  >Ask AI</button>
                </div>
              </div>
              <p class="type-caption-12 mt-1 leading-relaxed text-soft">{{ selectedBlock.description }}</p>
            </div>

            <div class="mb-4 flex gap-0.5 rounded-lg bg-sunken p-0.5">
              <button
                v-for="tab in ([
                  { id: 'content' as const, label: 'Content' },
                  { id: 'design' as const, label: 'Design' },
                ])"
                :key="tab.id"
                type="button"
                class="type-button-12 flex-1 rounded-md py-1.5 transition-colors"
                :class="styleTab === tab.id ? 'bg-raised text-ink shadow-card' : 'text-soft hover:text-ink'"
                :aria-pressed="styleTab === tab.id"
                @click="styleTab = tab.id"
              >{{ tab.label }}</button>
            </div>

            <SectionForm
              v-if="styleTab === 'content'"
              :section="selected"
              :block="selectedBlock"
              :pages="data.siblings"
              :site-id="data.page.siteId"
              @update="updateSelectedProps"
            />
            <SectionProperties v-else :section="selected" @update="updateSelectedSection" />
          </template>

          <SiteDesignRail
            v-else
            :theme="data.site.theme"
            :disabled="!can('page:write')"
            @update:theme="patchSiteTheme"
          />
        </div>

        <div v-else class="min-h-0 flex-1 overflow-hidden">
          <AssistantPanel
            @insert-catalogue="onInsertCatalogue"
            @theme-updated="applyThemeLocal"
          />
        </div>
      </aside>
      </template>
    </div>


    <SectionAiDialog
      v-model:open="aiOpen"
      :page-id="pageId"
      :section="selected"
      :block-name="selectedBlock?.name ?? ''"
      :initial-instruction="aiInstruction"
      :auto-apply="aiAutoApply"
      :persist="ensureDraftSaved"
      @apply="applyAiProposal"
      @use-island="onUseIsland"
    />

    <!-- Reordering has no visual anchor for a screen reader, so every move is
         announced here rather than only drawn. -->
    <p class="sr-only" role="status" aria-live="polite">{{ announcement }}</p>
  </div>
</template>
