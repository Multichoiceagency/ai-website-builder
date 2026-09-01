<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, provide, ref, watch } from 'vue'
import { createSection, getBlock, listBlockMetadata } from '@platform/blocks'
import {
  brandFromIslandId,
  detectExactIslandIntent,
  isMotionsitesCodegenBrief,
  MOTIONSITES_ISLAND_HEADER_BLOCK,
} from '@platform/templates'
import {
  applyTemplateMotionTypes,
  createDesignArtboardRoot,
  createLayoutNode,
  insertLayoutNode,
  findLayoutNodeParent,
  isLayoutCanvasBlock,
  layoutCanvasPropsSchema,
  layoutNodeSchema,
  setLayoutNodeFrame,
  type LayoutContainerNode,
  type LayoutCustomScript,
  type LayoutNode,
  type LayoutNodeType,
  type Page,
  type PageSummary,
  type Section,
  type Seo,
  type SeoSettings,
  type Site,
  type TemplateMotionType,
  type Theme,
} from '@platform/schemas'
import { ArrowLeft, Monitor, MousePointer2, PanelLeft, PanelRight, Redo2, Smartphone, Tablet, Undo2 } from '@lucide/vue'
import { applySectionsThrough } from '../../utils/assistantSections'

/**
 * The visual studio.
 *
 * Lovable-style assistant on the left, Figma artboard in the middle, inspector
 * on the right. The canvas renders the *real* layout-canvas blocks through the
 * shared Nuxt layer — editing a field updates the published page document.
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

/** Frappe-Builder style left rail: blocks / layers / pages / assets. */
type LeftTab = 'blocks' | 'layers' | 'pages' | 'assets'
const LEFT_TABS: LeftTab[] = ['blocks', 'layers', 'pages', 'assets']
const leftTab = ref<LeftTab>('blocks')
const rightTab = ref<'agent' | 'style'>('style')
/** Open by default so Layers + Properties are available as soon as the editor loads. */
const leftOpen = ref(true)
const rightOpen = ref(true)
const device = ref<'desktop' | 'tablet' | 'mobile'>('desktop')
const zoom = ref(70)
const selectToEdit = ref(true)

/** Single studio: assistant + artboard + inspector. */
const designMode = computed(() => true)
// Off since the generator writes registry sections again (commit 58ece31):
// with this true the editor filtered them all out and showed a blank artboard
// over a page that had content.
const freeformOnly = computed(() => false)
const aiFreeform = computed(() => false)
const assistantLed = computed(() => false)

/** Panel widths + open state persist per browser. */
const leftWidth = ref(256)
const rightWidth = ref(336)
/** Assistant column (Lovable-style chat). */
const interactiveAssistantWidth = ref(360)

onMounted(() => {
  const stored = localStorage.getItem('editor:panels')
  if (!stored) return
  try {
    const parsed = JSON.parse(stored) as {
      left?: number
      right?: number
      leftOpen?: boolean
      rightOpen?: boolean
      leftTab?: string
      interactiveAssistantWidth?: number
    }
    if (parsed.left) leftWidth.value = parsed.left
    if (parsed.right) rightWidth.value = parsed.right
    if (typeof parsed.leftOpen === 'boolean') leftOpen.value = parsed.leftOpen
    if (typeof parsed.rightOpen === 'boolean') rightOpen.value = parsed.rightOpen
    if (parsed.leftTab && LEFT_TABS.includes(parsed.leftTab as LeftTab)) {
      leftTab.value = parsed.leftTab as LeftTab
    }
    if (parsed.interactiveAssistantWidth) interactiveAssistantWidth.value = parsed.interactiveAssistantWidth
  } catch {
    // A corrupt value just means the defaults stand.
  }
})

watch(
  [leftWidth, rightWidth, leftOpen, rightOpen, leftTab, interactiveAssistantWidth],
  ([left, right, leftIsOpen, rightIsOpen, activeLeftTab, assistantWidth]) => {
    localStorage.setItem(
      'editor:panels',
      JSON.stringify({
        left,
        right,
        leftOpen: leftIsOpen,
        rightOpen: rightIsOpen,
        leftTab: activeLeftTab,
        interactiveAssistantWidth: assistantWidth,
      }),
    )
  },
)

watch(
  () => data.value,
  (value) => {
    if (!value || !can('page:write')) return
    // Always-open also honours ?mode=ai from /website/new: a freshly
    // generated page lands with the assistant waiting.
    leftOpen.value = true
    leftTab.value = 'layers'
    rightOpen.value = true
    rightTab.value = 'style'
    nextTick(() => {
      // Only a page with nothing on it gets a starter artboard. A generated
      // page arrives with registry sections, and prepending an empty artboard
      // buried them under a blank frame and dirtied the page on open.
      if (sections.value.length > 0) return
      const root = ensureDesignArtboard()
      if (root && !layoutCanvas.selectedNodeId.value) {
        layoutCanvas.selectedNodeId.value = root.id
      }
    })
  },
  { immediate: true },
)

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

function applyAssistantSections(
  transform: (input: Section[]) => Section[],
): { applied: boolean } {
  return applySectionsThrough(sections.value, transform, mutate)
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

/** Freeform layout-canvas selection + immutable tree ops. */
const layoutCanvas = useLayoutCanvasSelection()
const layoutRoot = computed(() => layoutCanvas.rootOf(selected.value))
const layoutSelectedNode = computed(() => layoutCanvas.selectedNode(selected.value))
const selectedLayoutNodeId = computed(() => layoutCanvas.selectedNodeId.value)
const isSelectedLayoutCanvas = computed(
  () => Boolean(selected.value && isLayoutCanvasBlock(selected.value.block)),
)
const selectedLayoutScripts = computed(
  () =>
    ((selected.value?.props as { customScripts?: LayoutCustomScript[] } | undefined)?.customScripts ??
      []) as LayoutCustomScript[],
)

provide(
  'layoutCmsSiteId',
  computed(() => data.value?.site.id ?? ''),
)
provide('layoutCmsTenantId', useActiveTenantId())

watch(
  selected,
  (section) => {
    layoutCanvas.syncWithSection(section)
    if (section && isLayoutCanvasBlock(section.block) && layoutCanvas.selectedNodeId.value === null) {
      const root = layoutCanvas.rootOf(section)
      if (root) layoutCanvas.selectedNodeId.value = root.id
    }
  },
  { immediate: true },
)

function applyLayoutResult(result: { root: LayoutNode; selectedNodeId?: string }) {
  if (!selected.value) return
  updateSelectedProps({ ...selected.value.props, root: result.root })
  if (result.selectedNodeId !== undefined) {
    layoutCanvas.selectedNodeId.value = result.selectedNodeId
  }
}

function onSelectLayoutNode(nodeId: string) {
  layoutCanvas.selectedNodeId.value = nodeId
  rightTab.value = 'style'
  rightOpen.value = true
}

function onLayoutAddChild(parentId: string, type: LayoutNodeType) {
  const root = layoutRoot.value
  if (!root) return
  applyLayoutResult(layoutCanvas.addChild(root, parentId, type))
}

function onLayoutDuplicateNode(id: string) {
  const root = layoutRoot.value
  if (!root) return
  applyLayoutResult(layoutCanvas.duplicateNode(root, id))
}

function onLayoutRemoveNode(id: string) {
  const root = layoutRoot.value
  if (!root) return
  applyLayoutResult(layoutCanvas.removeNode(root, id))
}

function onLayoutMoveNode(id: string, delta: -1 | 1) {
  const root = layoutRoot.value
  if (!root) return
  applyLayoutResult(delta < 0 ? layoutCanvas.moveNodeUp(root, id) : layoutCanvas.moveNodeDown(root, id))
}

function onLayoutNodePatch(patch: Partial<LayoutNode>) {
  const root = layoutRoot.value
  const id = layoutCanvas.selectedNodeId.value
  if (!root || !id) return
  applyLayoutResult(layoutCanvas.patchNode(root, id, patch))
}

function onLayoutNodeStyles(styles: Record<string, unknown>) {
  const root = layoutRoot.value
  const id = layoutCanvas.selectedNodeId.value
  if (!root || !id) return
  applyLayoutResult(layoutCanvas.patchStyles(root, id, styles))
}

function onLayoutNodeHoverStyles(styles: Record<string, unknown>) {
  const root = layoutRoot.value
  const id = layoutCanvas.selectedNodeId.value
  if (!root || !id) return
  applyLayoutResult(layoutCanvas.patchHoverStyles(root, id, styles))
}

function onDesignNudge(id: string, dx: number, dy: number) {
  const root = layoutRoot.value
  if (!root) return
  applyLayoutResult(layoutCanvas.nudge(root, id, dx, dy))
}

function onDesignAlign(id: string, alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') {
  const root = layoutRoot.value
  if (!root) return
  applyLayoutResult(layoutCanvas.alignInParent(root, id, alignment))
}

function onDesignBumpZ(id: string, delta: number) {
  const root = layoutRoot.value
  if (!root) return
  applyLayoutResult(layoutCanvas.bumpZ(root, id, delta))
}

function alignSelected(alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') {
  const id = layoutCanvas.selectedNodeId.value
  if (!id) return
  onDesignAlign(id, alignment)
}

function bumpSelectedZ(delta: number) {
  const id = layoutCanvas.selectedNodeId.value
  if (!id) return
  onDesignBumpZ(id, delta)
}

const assistDraftMessage = ref('')
const assistSendNonce = ref(0)
const imageFileInput = ref<HTMLInputElement | null>(null)
const pendingImageNodeId = ref<string | null>(null)
const mediaUpload = useMediaUpload()
const assistLayoutContext = computed(() => {
  if (!freeformOnly.value || !selected.value || !isLayoutCanvasBlock(selected.value.block)) return null
  return {
    sectionId: selected.value.id,
    selectedNodeId: layoutCanvas.selectedNodeId.value ?? undefined,
    selectedNode: layoutSelectedNode.value ?? undefined,
  }
})

function onEditLayoutNodeWithAi() {
  const node = layoutSelectedNode.value
  if (!node) return
  leftOpen.value = true
  const text = `Modify the selected ${node.type} node (${node.id}): improve visual hierarchy, spacing, and hover styles while keeping its purpose.`
  assistDraftMessage.value = ''
  nextTick(() => {
    assistDraftMessage.value = text
  })
}

async function onPromptInPlace(text: string) {
  const node = layoutSelectedNode.value
  if (!node) return
  leftOpen.value = true
  assistDraftMessage.value = ''
  await nextTick()
  assistDraftMessage.value = `On the selected ${node.type} (${node.id}): ${text}`
  await nextTick()
  assistSendNonce.value += 1
}

function onSelectParent(id: string) {
  const root = layoutRoot.value
  if (!root) return
  const loc = findLayoutNodeParent(root, id)
  if (loc) onSelectLayoutNode(loc.parent.id)
}

function onCanvasPatch(id: string, patch: Partial<LayoutNode>) {
  const root = layoutRoot.value
  if (!root) return
  layoutCanvas.selectedNodeId.value = id
  applyLayoutResult(layoutCanvas.patchNode(root, id, patch))
}

function onPickImage(id: string) {
  pendingImageNodeId.value = id
  imageFileInput.value?.click()
}

async function onImageFileChosen(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  const id = pendingImageNodeId.value
  pendingImageNodeId.value = null
  if (!file || !id) return
  const [asset] = await mediaUpload.upload([file], { folder: 'design' })
  if (asset?.url) onCanvasPatch(id, { src: asset.url })
}

async function onRevisionRestored() {
  await refresh()
  message.value = 'Restored a previous version.'
}

function onCustomScripts(scripts: LayoutCustomScript[]) {
  if (!selected.value || !isLayoutCanvasBlock(selected.value.block)) return
  updateSelectedProps({ ...selected.value.props, customScripts: scripts })
}

function onAssistLayoutAction(
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
) {
  const section = sections.value.find((entry) => entry.id === action.sectionId)
  if (!section || !isLayoutCanvasBlock(section.block)) {
    errorMessage.value = 'Layout action targets a missing layout-canvas section.'
    return
  }
  const currentRoot = layoutCanvas.rootOf(section)
  if (!currentRoot) return

  try {
    if (action.type === 'replaceLayoutRoot') {
      const validated = layoutCanvasPropsSchema.parse({ root: action.root })
      selectedId.value = action.sectionId
      applyLayoutResult({ root: validated.root, selectedNodeId: validated.root.id })
      message.value = 'Artboard replaced by AI.'
      return
    }
    if (action.type === 'patchLayoutNode') {
      let next = currentRoot
      if (action.patch && Object.keys(action.patch).length) {
        next = layoutCanvas.patchNode(next, action.nodeId, action.patch as Partial<LayoutNode>).root
      }
      if (action.styles && Object.keys(action.styles).length) {
        next = layoutCanvas.patchStyles(next, action.nodeId, action.styles).root
      }
      if (action.stylesHover && Object.keys(action.stylesHover).length) {
        next = layoutCanvas.patchHoverStyles(next, action.nodeId, action.stylesHover).root
      }
      selectedId.value = action.sectionId
      applyLayoutResult({ root: next, selectedNodeId: action.nodeId })
      message.value = 'Node updated by AI.'
      return
    }
    const node = layoutNodeSchema.parse({ ...action.node, id: action.nodeId })
    selectedId.value = action.sectionId
    applyLayoutResult(layoutCanvas.replaceSubtree(currentRoot, action.nodeId, node))
    message.value = 'Subtree replaced by AI.'
  } catch (caught) {
    errorMessage.value =
      caught instanceof Error ? caught.message : 'Could not apply that layout action.'
  }
}

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
  const blockIds = freeformOnly.value
    ? payload.blockIds.filter((id) => isLayoutCanvasBlock(id))
    : payload.blockIds
  if (!blockIds.length) {
    if (freeformOnly.value) {
      errorMessage.value = 'This mode only inserts Empty section (layout canvas).'
    }
    return
  }
  const built = blockIds.map((blockId) => createSection(blockId))
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
  if (blockIds.some((id) => isLayoutCanvasBlock(id))) {
    leftTab.value = 'layers'
    leftOpen.value = true
    rightTab.value = 'style'
    rightOpen.value = true
  }
}

function insertEmptyLayoutCanvas() {
  insertBlockIds({ blockIds: ['layout-canvas-01'], source: 'block' })
  message.value = 'Added Empty section.'
}

const designImportOpen = ref(false)
const designOptimizeBusy = ref(false)
const designGenerateOpen = ref(false)
const designGenerateBusy = ref(false)
const designGeneratePrompt = ref('')

function ensureDesignArtboard(): LayoutNode | null {
  if (!selected.value || !isLayoutCanvasBlock(selected.value.block)) {
    const root = createDesignArtboardRoot()
    const section = createSection('layout-canvas-01', { root })
    insertSections([section])
    selectedId.value = section.id
    return root
  }
  const root = layoutRoot.value
  if (!root) return null
  // Promote to artboard if still a flow empty section
  if (!root.styles?.position || root.styles.position !== 'relative' || root.styles.width === '100%') {
    const artboard = createDesignArtboardRoot()
    artboard.children = root.type === 'container' ? [...(root.children ?? [])] : []
    applyLayoutResult({ root: artboard, selectedNodeId: artboard.id })
    return artboard
  }
  return root
}

function addDesignNode(type: LayoutNodeType) {
  addDesignPreset(
    type === 'container'
      ? 'frame'
      : type === 'text'
        ? 'text'
        : type === 'image'
          ? 'image'
          : 'button',
  )
}

type DesignPreset =
  | 'frame'
  | 'rectangle'
  | 'ellipse'
  | 'line'
  | 'heading'
  | 'text'
  | 'image'
  | 'button'

function addDesignPreset(preset: DesignPreset) {
  const root = ensureDesignArtboard()
  if (!root || root.type !== 'container') return
  const count = root.children?.length ?? 0
  const offset = `${40 + (count % 5) * 28}px`

  let node = createLayoutNode(
    preset === 'heading' || preset === 'text'
      ? 'text'
      : preset === 'image'
        ? 'image'
        : preset === 'button'
          ? 'button'
          : 'container',
  )

  let width = '240px'
  let height = '120px'

  if (node.type === 'container') {
    if (preset === 'frame') {
      node.styles = {
        ...(node.styles ?? {}),
        background: 'transparent',
        borderWidth: '1px',
        borderStyle: 'dashed',
        borderColor: '#cbd5e1',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }
      width = '320px'
      height = '200px'
    } else if (preset === 'rectangle') {
      node.styles = {
        background: '#e2e8f0',
        borderRadius: '8px',
      }
      width = '200px'
      height = '120px'
    } else if (preset === 'ellipse') {
      node.styles = {
        background: '#e2e8f0',
        borderRadius: '9999px',
      }
      width = '140px'
      height = '140px'
    } else if (preset === 'line') {
      node.styles = {
        background: '#94a3b8',
        borderRadius: '1px',
      }
      width = '240px'
      height = '2px'
    }
  } else if (node.type === 'text') {
    if (preset === 'heading') {
      node.tag = 'h1'
      node.content = 'Heading'
      node.styles = {
        fontSize: '2rem',
        fontWeight: '700',
        color: '#0f172a',
        letterSpacing: '-0.02em',
        lineHeight: '1.2',
      }
      width = '420px'
      height = '56px'
    } else {
      node.tag = 'p'
      node.content = 'Double-click properties to edit this text.'
      node.styles = {
        fontSize: '1rem',
        color: '#334155',
        lineHeight: '1.6',
      }
      width = '320px'
      height = '48px'
    }
  } else if (node.type === 'image') {
    node.alt = 'Image'
    node.styles = {
      background: '#f1f5f9',
      objectFit: 'cover',
      borderRadius: '8px',
    }
    width = '280px'
    height = '180px'
  } else if (node.type === 'button') {
    node.label = 'Button'
    node.styles = {
      background: '#0f172a',
      color: '#fff',
      paddingTop: '0.65rem',
      paddingRight: '1.1rem',
      paddingBottom: '0.65rem',
      paddingLeft: '1.1rem',
      borderRadius: '0.5rem',
      fontWeight: '600',
      cursor: 'pointer',
      textAlign: 'center',
    }
    node.stylesHover = { background: '#1e293b' }
    width = '140px'
    height = '44px'
  }

  const withChild = insertLayoutNode(root, root.id, node)
  const withFrame = setLayoutNodeFrame(withChild, node.id, {
    left: offset,
    top: offset,
    width,
    height,
  })
  applyLayoutResult({ root: withFrame, selectedNodeId: node.id })
  message.value = `Added ${preset}.`
}

const designSections = computed(() =>
  sections.value.filter((section) => isLayoutCanvasBlock(section.block)),
)

function designIndexToPage(index: number): number {
  const section = designSections.value[index]
  if (!section) return -1
  return sections.value.findIndex((entry) => entry.id === section.id)
}

function onDesignReorder(from: number, to: number) {
  const fromI = designIndexToPage(from)
  const toI = designIndexToPage(to)
  if (fromI < 0 || toI < 0) return
  reorder(fromI, toI)
}

function onDesignMove(index: number, delta: number) {
  const pageIndex = designIndexToPage(index)
  if (pageIndex < 0) return
  move(pageIndex, delta)
}

function onDesignDuplicate(index: number) {
  const pageIndex = designIndexToPage(index)
  if (pageIndex < 0) return
  duplicate(pageIndex)
}

function onDesignRemove(index: number) {
  const pageIndex = designIndexToPage(index)
  if (pageIndex < 0) return
  remove(pageIndex)
}

function onDesignCommitFrame(
  id: string,
  frame: { left: string; top: string; width: string; height: string },
) {
  const root = layoutRoot.value
  if (!root) return
  applyLayoutResult(layoutCanvas.setFrame(root, id, frame))
}

function onDesignImported(root: LayoutContainerNode) {
  if (!selected.value || !isLayoutCanvasBlock(selected.value.block)) {
    const section = createSection('layout-canvas-01', { root })
    insertSections([section])
    selectedId.value = section.id
  } else {
    applyLayoutResult({ root, selectedNodeId: root.id })
  }
  message.value = 'Imported into Design artboard.'
}

async function onDesignPaste(event: ClipboardEvent) {
  if (!designMode.value || !can('page:write')) return
  const html = event.clipboardData?.getData('text/html')
  const text = event.clipboardData?.getData('text/plain')
  if (!html && !text) return
  // Don't steal paste from inputs
  const target = event.target as HTMLElement | null
  if (target?.closest?.('input, textarea, [contenteditable="true"]')) return
  event.preventDefault()
  try {
    const result = await api.post<{ ok: true; root: LayoutContainerNode }>('/api/v1/ai/design-import', {
      format: 'html',
      html: html || `<p>${text}</p>`,
    })
    onDesignImported(result.root)
  } catch (caught) {
    errorMessage.value =
      caught instanceof ApiError ? caught.message : 'Paste import failed. Try Import HTML.'
  }
}

async function optimizeDesignWithAi() {
  const root = layoutRoot.value
  if (!root) {
    errorMessage.value = 'Select an Empty section / artboard first.'
    return
  }
  designOptimizeBusy.value = true
  errorMessage.value = ''
  try {
    const result = await api.post<{ root: LayoutContainerNode; model: string }>(
      '/api/v1/ai/design-optimize',
      {
        root,
        instruction: 'Improve spacing, hierarchy, and readability while keeping absolute frames.',
      },
      { timeoutMs: 35_000 },
    )
    applyLayoutResult({ root: result.root, selectedNodeId: result.root.id })
    message.value = `Optimized (${result.model}).`
  } catch (caught) {
    errorMessage.value =
      caught instanceof ApiError ? caught.message : 'Optimize failed.'
  } finally {
    designOptimizeBusy.value = false
  }
}

async function generateDesignWithAi() {
  const prompt = designGeneratePrompt.value.trim()
  if (!prompt) {
    errorMessage.value = 'Describe the artboard you want to generate.'
    return
  }
  ensureDesignArtboard()
  const root = layoutRoot.value
  designGenerateBusy.value = true
  errorMessage.value = ''
  try {
    const result = await api.post<{ root: LayoutContainerNode; model: string }>(
      '/api/v1/ai/design-generate',
      { prompt, root: root ?? undefined },
      { timeoutMs: 40_000 },
    )
    applyLayoutResult({ root: result.root, selectedNodeId: result.root.id })
    message.value = `Generated (${result.model}).`
    designGenerateOpen.value = false
    designGeneratePrompt.value = ''
  } catch (caught) {
    errorMessage.value =
      caught instanceof ApiError ? caught.message : 'Generate failed.'
  } finally {
    designGenerateBusy.value = false
  }
}

onMounted(() => {
  if (import.meta.client) {
    window.addEventListener('paste', onDesignPaste)
  }
})
onBeforeUnmount(() => {
  if (import.meta.client) {
    window.removeEventListener('paste', onDesignPaste)
  }
})

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
    if (aiFreeform.value && (hit.kind !== 'block' || !isLayoutCanvasBlock(hit.id))) {
      insertEmptyLayoutCanvas()
      return
    }
    if (designMode.value && (hit.kind !== 'block' || !isLayoutCanvasBlock(hit.id))) {
      ensureDesignArtboard()
      return
    }
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
  if (isLayoutCanvasBlock(blockId)) {
    leftTab.value = 'layers'
    leftOpen.value = true
    rightOpen.value = true
  }
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

  if (modifier && (event.key === '=' || event.key === '+' || event.code === 'Equal')) {
    event.preventDefault()
    nudgeZoom(10)
    return
  }

  if (modifier && (event.key === '-' || event.code === 'Minus')) {
    event.preventDefault()
    nudgeZoom(-10)
    return
  }

  if (modifier && event.key === '0') {
    event.preventDefault()
    zoom.value = 100
    return
  }

  if (typing) return

  if (event.altKey && event.key.toLowerCase() === 's') {
    event.preventDefault()
    selectToEdit.value = !selectToEdit.value
    return
  }

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
  const nodeId = layoutCanvas.selectedNodeId.value
  const layoutActive = isSelectedLayoutCanvas.value && nodeId

  if (modifier && event.key.toLowerCase() === 'd' && index !== -1) {
    event.preventDefault()
    if (layoutActive && nodeId) {
      onLayoutDuplicateNode(nodeId)
      return
    }
    duplicate(index)
    return
  }

  if ((event.key === 'Backspace' || event.key === 'Delete') && index !== -1) {
    event.preventDefault()
    if (layoutActive && nodeId) {
      onLayoutRemoveNode(nodeId)
      return
    }
    remove(index)
    return
  }

  if (event.key === 'Escape') {
    if (layoutCanvas.selectedNodeId.value) {
      layoutCanvas.clearNodeSelection()
      return
    }
    selectedId.value = null
  }
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
  buildStorefrontUrl({
    storefrontBase: String(config.public.storefrontUrl || 'http://localhost:3001'),
    primaryHostname: data.value?.site.primaryHostname,
    path: data.value?.page.path ?? '/',
  }),
)

const pageIsLive = computed(() => Boolean(data.value?.page.publishedAt))

async function openLiveView() {
  if (!pageIsLive.value) {
    if (!can('page:publish')) {
      message.value = 'Publish this page first — drafts are not on the live storefront yet.'
      return
    }
    await publish()
    if (!data.value?.page.publishedAt) return
  }
  if (import.meta.client) window.open(liveUrl.value, '_blank', 'noopener,noreferrer')
}

const ZOOM_MIN = 25
const ZOOM_MAX = 200
const ZOOM_STEPS = [25, 50, 70, 100, 125, 150, 200]

function clampZoom(value: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(value)))
}

/** Figma-style: ⌘/Ctrl + scroll (and trackpad pinch) zooms the artboard. */
function onDesignCanvasWheel(event: WheelEvent) {
  if (!designMode.value) return
  if (!(event.ctrlKey || event.metaKey)) return
  event.preventDefault()
  const intensity = Math.min(24, Math.abs(event.deltaY))
  const step = Math.max(3, Math.round(intensity * 0.35))
  const direction = event.deltaY > 0 ? -1 : 1
  zoom.value = clampZoom(zoom.value + direction * step)
}

const designCanvasScrollEl = ref<HTMLElement | null>(null)

watch(
  [designMode, designCanvasScrollEl],
  ([on, el], _prev, onCleanup) => {
    if (!import.meta.client || !on || !el) return
    el.addEventListener('wheel', onDesignCanvasWheel, { passive: false })
    onCleanup(() => el.removeEventListener('wheel', onDesignCanvasWheel))
  },
)

function nudgeZoom(delta: number) {
  zoom.value = clampZoom(zoom.value + delta)
}

const DEVICES = [
  { id: 'desktop', label: 'Desktop', icon: Monitor },
  { id: 'tablet', label: 'Tablet', icon: Tablet },
  { id: 'mobile', label: 'Mobile', icon: Smartphone },
] as const
const ICON_STROKE = 1.75

function togglePropertiesPanel() {
  rightOpen.value = !rightOpen.value
  if (rightOpen.value) rightTab.value = 'style'
}

/** Rail behaviour: a click opens the panel; a second click on the active tab collapses it. */
function onRailSelect(tab: LeftTab) {
  if (leftTab.value === tab && leftOpen.value) {
    leftOpen.value = false
    return
  }
  leftTab.value = tab
  leftOpen.value = true
}

/** A section was picked in a left panel: select it and surface its properties. */
function selectFromPanel(id: string) {
  selectedId.value = id
  rightTab.value = 'style'
  rightOpen.value = true
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

      <div class="flex items-center gap-0.5 rounded-lg bg-sunken p-0.5">
        <button
          type="button"
          class="grid h-7 w-8 place-items-center rounded-md transition-colors"
          :class="leftOpen ? 'bg-raised text-ink shadow-card' : 'text-faint hover:text-ink'"
          aria-label="Toggle assistant"
          :aria-pressed="leftOpen"
          title="Assistant"
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
          class="grid h-7 w-7 place-items-center rounded-md transition-colors"
          :class="selectToEdit ? 'bg-raised text-ink shadow-card' : 'text-faint hover:bg-sunken hover:text-ink'"
          title="Select to Edit (⌥S)"
          aria-label="Select to Edit"
          :aria-pressed="selectToEdit"
          @click="selectToEdit = !selectToEdit"
        >
          <MousePointer2 class="h-4 w-4" :stroke-width="ICON_STROKE" aria-hidden="true" />
        </button>
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

      <div class="flex items-center gap-1">
        <button
          type="button"
          class="type-button-12 grid h-7 w-7 place-items-center rounded-md border border-line bg-raised text-soft hover:text-ink"
          title="Zoom out (⌘-)"
          aria-label="Zoom out"
          @click="nudgeZoom(-10)"
        >−</button>
        <select
          v-model.number="zoom"
          class="type-button-12 h-7 rounded-md border border-line bg-raised px-1.5 tabular-nums text-soft"
          aria-label="Zoom"
          title="⌘ scroll to zoom"
        >
          <option v-if="!ZOOM_STEPS.includes(zoom)" :value="zoom">{{ zoom }}%</option>
          <option v-for="step in ZOOM_STEPS" :key="step" :value="step">{{ step }}%</option>
        </select>
        <button
          type="button"
          class="type-button-12 grid h-7 w-7 place-items-center rounded-md border border-line bg-raised text-soft hover:text-ink"
          title="Zoom in (⌘+)"
          aria-label="Zoom in"
          @click="nudgeZoom(10)"
        >+</button>
      </div>

      <!-- Page title and SEO live beside the zoom control now: they belong to
           the page, not to the layer list they used to sit under. Guarded by
           the parent `v-if="data"` and always passed seo/sections (never
           undefined on first paint — seo defaults to `{ noIndex: false }`). -->
      <PageRevisionsPopover
        v-if="data"
        :page-id="data.page.id"
        :disabled="!can('page:write')"
        @restored="onRevisionRestored"
      />
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

        <UiButton
          size="sm"
          :loading="publishing && !pageIsLive"
          :disabled="(!pageIsLive && !can('page:publish')) || publishing"
          :title="pageIsLive ? liveUrl : 'Publish, then open the live storefront'"
          @click="openLiveView"
        >
          {{ pageIsLive ? 'View' : 'Publish & view' }}
        </UiButton>
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
      <aside
        v-if="leftOpen"
        class="editor-chrome flex min-h-0 shrink-0 flex-col border-r border-line bg-paper"
        :style="{ width: `${interactiveAssistantWidth}px` }"
      >
        <AssistantPanel
          :freeform-mode="true"
          :apply-sections="applyAssistantSections"
          :layout-context="assistLayoutContext"
          :draft-message="assistDraftMessage"
          :send-nonce="assistSendNonce"
          @insert-catalogue="onInsertCatalogue"
          @theme-updated="applyThemeLocal"
          @insert-layout-canvas="ensureDesignArtboard()"
          @layout-action="onAssistLayoutAction"
        />
      </aside>
      <EditorResizer
        v-if="leftOpen"
        v-model="interactiveAssistantWidth"
        side="left"
        :min="280"
        :max="520"
        label="Resize the assistant panel"
      />

      <aside
        class="editor-chrome flex min-h-0 w-[280px] shrink-0 flex-col border-r border-line bg-paper"
      >
        <div class="flex shrink-0 flex-col gap-1.5 border-b border-line px-2 py-2">
          <p class="type-button-10 px-0.5 uppercase tracking-[0.06em] text-faint">Insert</p>
          <div class="flex flex-wrap gap-1">
            <UiButton size="sm" variant="ghost" :disabled="!can('page:write')" title="Frame" @click="addDesignPreset('frame')">Frame</UiButton>
            <UiButton size="sm" variant="ghost" :disabled="!can('page:write')" title="Rectangle" @click="addDesignPreset('rectangle')">Rect</UiButton>
            <UiButton size="sm" variant="ghost" :disabled="!can('page:write')" title="Ellipse" @click="addDesignPreset('ellipse')">Ellipse</UiButton>
            <UiButton size="sm" variant="ghost" :disabled="!can('page:write')" title="Line" @click="addDesignPreset('line')">Line</UiButton>
            <UiButton size="sm" variant="ghost" :disabled="!can('page:write')" title="Heading" @click="addDesignPreset('heading')">H1</UiButton>
            <UiButton size="sm" variant="ghost" :disabled="!can('page:write')" title="Text" @click="addDesignPreset('text')">Text</UiButton>
            <UiButton size="sm" variant="ghost" :disabled="!can('page:write')" title="Image" @click="addDesignPreset('image')">Image</UiButton>
            <UiButton size="sm" variant="ghost" :disabled="!can('page:write')" title="Button" @click="addDesignPreset('button')">Button</UiButton>
          </div>
          <div class="flex flex-wrap gap-1">
            <UiButton size="sm" variant="ghost" :disabled="!can('page:write')" @click="designImportOpen = true">Import</UiButton>
            <UiButton
              size="sm"
              variant="ghost"
              :disabled="!can('page:write')"
              @click="designGenerateOpen = true"
            >Generate AI</UiButton>
            <UiButton
              size="sm"
              variant="ghost"
              :loading="designOptimizeBusy"
              :disabled="!can('page:write') || !isSelectedLayoutCanvas"
              @click="optimizeDesignWithAi"
            >Optimize AI</UiButton>
          </div>
        </div>
        <div
          v-if="selectedLayoutNodeId && selectedLayoutNodeId !== layoutRoot?.id"
          class="flex shrink-0 flex-wrap gap-1 border-b border-line px-2 py-1.5"
        >
          <UiButton size="sm" variant="ghost" :disabled="!can('page:write')" title="Align left" @click="alignSelected('left')">L</UiButton>
          <UiButton size="sm" variant="ghost" :disabled="!can('page:write')" title="Align center" @click="alignSelected('center')">C</UiButton>
          <UiButton size="sm" variant="ghost" :disabled="!can('page:write')" title="Align right" @click="alignSelected('right')">R</UiButton>
          <UiButton size="sm" variant="ghost" :disabled="!can('page:write')" title="Align top" @click="alignSelected('top')">T</UiButton>
          <UiButton size="sm" variant="ghost" :disabled="!can('page:write')" title="Align middle" @click="alignSelected('middle')">M</UiButton>
          <UiButton size="sm" variant="ghost" :disabled="!can('page:write')" title="Align bottom" @click="alignSelected('bottom')">B</UiButton>
          <UiButton size="sm" variant="ghost" :disabled="!can('page:write')" title="Bring forward (⌘])" @click="bumpSelectedZ(1)">↑Z</UiButton>
          <UiButton size="sm" variant="ghost" :disabled="!can('page:write')" title="Send backward (⌘[)" @click="bumpSelectedZ(-1)">↓Z</UiButton>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <EditorLayersPanel
            variant="design"
            :sections="designSections"
            :selected-id="selectedId"
            :generating-ids="generatingIds"
            :can-write="can('page:write')"
            :structure-root="layoutRoot"
            :selected-node-id="selectedLayoutNodeId"
            @select="selectFromPanel"
            @reorder="onDesignReorder"
            @move="onDesignMove"
            @duplicate="onDesignDuplicate"
            @remove="onDesignRemove"
            @add="ensureDesignArtboard()"
            @select-node="onSelectLayoutNode"
            @add-child="onLayoutAddChild"
            @duplicate-node="onLayoutDuplicateNode"
            @remove-node="onLayoutRemoveNode"
            @move-node="onLayoutMoveNode"
          />
        </div>
      </aside>

      <div
        ref="designCanvasScrollEl"
        data-editor-scroll
        class="relative min-h-0 min-w-0 flex-1 overflow-auto bg-canvas"
      >
        <p
          v-if="message || errorMessage"
          class="type-button-12 absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded-lg px-3 py-1.5 shadow-raised"
          :class="errorMessage ? 'bg-danger-soft text-danger' : 'bg-positive-soft text-positive'"
          role="status"
        >
          {{ errorMessage || message }}
        </p>

        <DesignCanvasOverlay
          v-if="layoutRoot"
          class="min-h-full p-8"
          :root="layoutRoot"
          :selected-node-id="selectedLayoutNodeId"
          :zoom="zoom"
          :disabled="!can('page:write')"
          :select-to-edit="selectToEdit"
          @select="onSelectLayoutNode"
          @commit-frame="onDesignCommitFrame"
          @nudge="onDesignNudge"
          @align="onDesignAlign"
          @bump-z="onDesignBumpZ"
          @select-parent="onSelectParent"
          @prompt-in-place="onPromptInPlace"
          @patch-node="onCanvasPatch"
          @delete-node="onLayoutRemoveNode"
          @pick-image="onPickImage"
        >
          <EditorCanvas
            :sections="sections"
            :theme="data.site.theme"
            :selected-id="selectedId"
            :selected-node-id="selectedLayoutNodeId"
            :device="device"
            :zoom="zoom"
            :can-write="can('page:write')"
            :generating-ids="generatingIds"
            :brand-logo="brandLogo"
            :hide-section-toolbar="true"
            @select="selectedId = $event; rightTab = 'style'; rightOpen = true"
            @select-node="onSelectLayoutNode"
            @reorder="onDesignReorder"
            @move-up="onDesignMove($event, -1)"
            @move-down="onDesignMove($event, 1)"
            @duplicate="onDesignDuplicate"
            @remove="onDesignRemove"
            @ask-ai="askAi"
            @library-drop="onLibraryDrop"
            @open-insert="ensureDesignArtboard()"
          />
        </DesignCanvasOverlay>
        <div
          v-else
          class="flex min-h-[20rem] flex-col items-center justify-center gap-3 p-8 text-center"
        >
          <p class="type-button text-ink">Start a Design artboard</p>
          <p class="type-caption-12 max-w-sm text-soft">
            Insert Frame, Text, Image, or Button — or describe the page in the assistant.
          </p>
          <div class="flex flex-wrap justify-center gap-2">
            <UiButton size="sm" :disabled="!can('page:write')" @click="addDesignPreset('frame')">Add Frame</UiButton>
            <UiButton size="sm" variant="ghost" :disabled="!can('page:write')" @click="designGenerateOpen = true">Generate AI</UiButton>
            <UiButton size="sm" variant="primary" :disabled="!can('page:write')" @click="ensureDesignArtboard()">
              New artboard
            </UiButton>
          </div>
        </div>
        <input
          ref="imageFileInput"
          type="file"
          accept="image/*"
          class="sr-only"
          @change="onImageFileChosen"
        />
      </div>

      <aside
        v-if="rightOpen"
        class="editor-chrome flex min-h-0 shrink-0 flex-col border-l border-line bg-paper"
        :style="{ width: `${rightWidth}px` }"
      >
        <div class="flex shrink-0 items-center justify-between gap-2 border-b border-line px-3 py-2">
          <span class="type-button-12 text-ink">Design</span>
          <button
            type="button"
            class="type-button-10 rounded-md px-2 py-1 text-faint hover:bg-sunken hover:text-ink"
            @click="rightOpen = false"
          >Close</button>
        </div>
        <div class="min-h-0 flex-1 overflow-y-auto p-2">
          <template v-if="isSelectedLayoutCanvas && layoutSelectedNode">
            <LayoutNodeInspector
              variant="design"
              :node="layoutSelectedNode"
              :disabled="!can('page:write')"
              :site-id="data.site.id"
              :show-ai-edit="true"
              :custom-scripts="selectedLayoutScripts"
              @update="onLayoutNodePatch"
              @update-styles="onLayoutNodeStyles"
              @update-hover-styles="onLayoutNodeHoverStyles"
              @edit-with-ai="onEditLayoutNodeWithAi"
              @update-scripts="onCustomScripts"
            />
          </template>
          <!-- A registry section edits through its block's own field
               definitions; the node inspector has nothing to show for it. -->
          <template v-else-if="selected && !isSelectedLayoutCanvas && selectedBlock">
            <SectionProperties :section="selected" @update="updateSelectedSection" />
            <SectionForm
              class="mt-3"
              :section="selected"
              :block="selectedBlock"
              :pages="data.siblings ?? []"
              :site-id="data.site.id"
              @update="updateSelectedProps"
            />
          </template>
          <SiteDesignRail
            v-else
            :theme="data.site.theme"
            :disabled="!can('page:write')"
            @update:theme="patchSiteTheme"
          />
        </div>
      </aside>

      <DesignImportDialog v-model:open="designImportOpen" @imported="onDesignImported" />

      <div
        v-if="designGenerateOpen"
        class="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
        role="dialog"
        aria-modal="true"
        aria-label="Generate artboard with AI"
      >
        <div class="w-full max-w-md rounded-xl border border-line bg-paper p-4 shadow-raised">
          <h2 class="type-button text-ink">Generate artboard</h2>
          <p class="type-caption-12 mt-1 text-soft">Describe the page composition. Replaces the current Design artboard.</p>
          <UiTextarea
            class="mt-3"
            :rows="4"
            :model-value="designGeneratePrompt"
            placeholder="Hero for a fitness studio: bold headline, short subcopy, dark CTA…"
            @update:model-value="designGeneratePrompt = $event"
          />
          <div class="mt-3 flex justify-end gap-2">
            <UiButton size="sm" variant="ghost" :disabled="designGenerateBusy" @click="designGenerateOpen = false">Cancel</UiButton>
            <UiButton size="sm" variant="primary" :loading="designGenerateBusy" @click="generateDesignWithAi">Generate</UiButton>
          </div>
        </div>
      </div>

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
