<script setup lang="ts">
import { computed, nextTick, ref, type Component } from 'vue'
import { ArrowRight, ArrowUpRight, FilePlus2, Globe, Search, Sparkles } from '@lucide/vue'

/**
 * The AI assistant panel (§11).
 *
 * It runs a **tool registry**, not a chat box wired to a model. Every quick
 * action is a declared tool with a risk level, and medium/high-risk tools show
 * a confirmation before they run (ADR-0007). That is the part worth building
 * first — the language model is the interchangeable half.
 *
 * With no model configured the panel still works: it understands the actions,
 * runs them, and says plainly that free-text understanding needs a key.
 */
const api = useApi()
const route = useRoute()
const activeSiteId = useActiveSiteId()

withDefaults(defineProps<{ closable?: boolean }>(), { closable: false })
const emit = defineEmits<{ close: [] }>()

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
  pending?: boolean
}

const messages = ref<Message[]>([])
const draft = ref('')
const busy = ref(false)
const confirming = ref<AssistantTool | null>(null)
const log = ref<HTMLElement | null>(null)

let nextId = 1

function say(role: Message['role'], text: string) {
  messages.value = [...messages.value, { id: nextId++, role, text }]
  void nextTick(() => log.value?.scrollTo({ top: log.value.scrollHeight, behavior: 'smooth' }))
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
    icon: ArrowUpRight,
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
        { title: string; path: string; status: string; hasUnpublishedChanges: boolean; sectionCount: number }[]
      >(`/api/v1/sites/${activeSiteId.value}/pages`)

      const findings: string[] = []
      const drafts = pages.filter((page) => page.status === 'draft')
      const stale = pages.filter((page) => page.status === 'published' && page.hasUnpublishedChanges)
      const thin = pages.filter((page) => page.sectionCount < 3)

      if (drafts.length) findings.push(`${drafts.length} page(s) never published: ${drafts.map((p) => p.path).join(', ')}`)
      if (stale.length) findings.push(`${stale.length} page(s) edited but not republished: ${stale.map((p) => p.path).join(', ')}`)
      if (thin.length) findings.push(`${thin.length} page(s) look thin (under 3 sections): ${thin.map((p) => p.path).join(', ')}`)

      return findings.length
        ? `I checked ${pages.length} pages:\n\n• ${findings.join('\n• ')}`
        : `I checked ${pages.length} pages and found nothing to flag. Everything is published and has real content.`
    },
  },
  {
    id: 'build_website',
    label: 'Build a website from a business',
    hint: 'Discovers a business and generates a site',
    risk: 'low',
    icon: Globe,
    available: () => true,
    async run() {
      await navigateTo('/onboarding')
      return 'Opened the builder. Give me a website address or a business name and I will read it and build the site.'
    },
  },
]

const availableTools = computed(() => TOOLS.filter((tool) => tool.available()))

async function execute(tool: AssistantTool) {
  confirming.value = null
  busy.value = true
  say('assistant', `Working on it — ${tool.label.toLowerCase()}…`)

  try {
    const result = await tool.run()
    messages.value = messages.value.slice(0, -1)
    say('assistant', result)
  } catch (error) {
    messages.value = messages.value.slice(0, -1)
    say('assistant', error instanceof ApiError ? `That did not work: ${error.message}` : 'That did not work.')
  } finally {
    busy.value = false
  }
}

function invoke(tool: AssistantTool) {
  say('user', tool.label)
  // Anything that writes gets a confirmation step, per ADR-0007.
  if (tool.risk === 'low') void execute(tool)
  else confirming.value = tool
}

/**
 * Free text. Matched against the tool registry by keyword first; anything
 * else goes to the language model when one is configured. The panel never
 * pretends a model answered when none is available.
 */
async function submit() {
  const text = draft.value.trim()
  if (!text || busy.value) return

  draft.value = ''
  say('user', text)

  const lower = text.toLowerCase()
  const matched = availableTools.value.find((tool) =>
    tool.id.split('_').every((word) => lower.includes(word)) ||
    lower.includes(tool.label.toLowerCase()),
  )

  if (matched) {
    if (matched.risk === 'low') void execute(matched)
    else confirming.value = matched
    return
  }

  busy.value = true
  say('assistant', 'Thinking…')
  try {
    const result = await api.post<{ answer: string; model: string }>('/api/v1/ai/assist', {
      message: text,
    })
    messages.value = messages.value.slice(0, -1)
    say('assistant', result.answer)
  } catch (error) {
    messages.value = messages.value.slice(0, -1)
    if (error instanceof ApiError && (error.status === 503 || error.code === 'ai_unavailable')) {
      say(
        'assistant',
        'I can run the actions listed below right now. Understanding free-form questions needs a language model connected — add a Gemini or Anthropic key under Settings → AI.',
      )
    } else {
      say(
        'assistant',
        error instanceof ApiError
          ? `That did not work: ${error.message}`
          : 'That did not work. Try one of the actions below.',
      )
    }
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col bg-paper" aria-label="AI assistant">
    <header class="flex items-center justify-between border-b border-line px-4 py-3">
      <div class="flex items-center gap-2">
        <span class="grid h-6 w-6 place-items-center rounded-md bg-brand text-brand-ink" aria-hidden="true">
          <Sparkles class="h-3.5 w-3.5" :stroke-width="ICON_STROKE" />
        </span>
        <p class="text-[0.8125rem] font-semibold text-ink">Assistant</p>
        <UiBadge tone="neutral">Beta</UiBadge>
      </div>
      <button
        v-if="closable"
        type="button"
        class="grid h-7 w-7 place-items-center rounded-md text-faint transition-colors hover:bg-sunken hover:text-ink"
        aria-label="Hide assistant"
        @click="emit('close')"
      >
        &times;
      </button>
    </header>

    <div ref="log" class="flex-1 overflow-y-auto px-4 py-4">
      <div v-if="!messages.length" class="pt-6 text-center">
        <p class="text-[0.9375rem] font-semibold text-ink">Ask me to do something</p>
        <p class="mx-auto mt-1.5 max-w-[15rem] text-[0.8125rem] leading-relaxed text-soft">
          I can build a website from a business, add pages, publish, and review what you have.
        </p>
      </div>

      <ul v-else class="flex flex-col gap-3">
        <li v-for="message in messages" :key="message.id" class="flex" :class="message.role === 'user' ? 'justify-end' : ''">
          <div
            class="max-w-[16rem] rounded-lg px-3 py-2 text-[0.8125rem] leading-relaxed whitespace-pre-line"
            :class="message.role === 'user' ? 'bg-brand text-brand-ink' : 'bg-sunken text-ink'"
          >
            {{ message.text }}
          </div>
        </li>
      </ul>
    </div>

    <div class="border-t border-line px-4 py-3">
      <form class="relative" @submit.prevent="submit">
        <input
          v-model="draft"
          type="text"
          placeholder="Ask a question…"
          aria-label="Ask the assistant"
          class="h-10 w-full rounded-lg border border-line bg-raised pl-3 pr-10 text-[0.8125rem] text-ink placeholder:text-faint"
        />
        <button
          type="submit"
          class="absolute right-1 top-1 grid h-8 w-8 place-items-center rounded-md text-faint transition-colors hover:bg-sunken hover:text-ink disabled:opacity-40"
          :disabled="!draft.trim() || busy"
          aria-label="Send"
        >
          <ArrowRight class="h-4 w-4" :stroke-width="2" aria-hidden="true" />
        </button>
      </form>

      <ul class="mt-3 flex flex-col gap-0.5">
        <li v-for="tool in availableTools" :key="tool.id">
          <button
            type="button"
            class="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-[0.8125rem] text-soft transition-colors hover:bg-sunken hover:text-ink disabled:opacity-40"
            :disabled="busy"
            :title="tool.hint"
            @click="invoke(tool)"
          >
            <component :is="tool.icon" class="h-3.5 w-3.5 shrink-0" :stroke-width="ICON_STROKE" aria-hidden="true" />
            {{ tool.label }}
            <span v-if="tool.risk !== 'low'" class="ml-auto text-[0.6875rem] text-faint">confirm</span>
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
