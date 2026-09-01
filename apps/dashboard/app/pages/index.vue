<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import type { PageSummary, Site } from '@platform/schemas'
import { ExternalLink, Laptop, Loader2, Monitor, RotateCcw, Send, Smartphone, Tablet } from '@lucide/vue'
import { useLocale } from '../composables/useLocale'
import { buildStorefrontUrl } from '../utils/storefront-url'

/**
 * THESIS: the owner says what they want changed and watches it happen on their
 * own site. Refuses the KPI command centre this category ships — a plumber who
 * opens this once a month has no use for a metric strip.
 *
 * OWN-WORLD: the incumbent Swiss/admin system, unchanged. Warm paper ground,
 * one ink in three weights, one terracotta accent on the primary action only,
 * Figtree throughout, three elevations. Agent mode and classic mode share every
 * token; switching changes what leads, never how anything looks.
 *
 * STORY: this is my site, that is what I asked, this is what it did, and here
 * is the way back.
 *
 * FIRST VIEWPORT: the live site fills the left two-thirds at full height. The
 * right third is one ask line at eye level with today's change cards beneath
 * it, newest first. Primary action sits inside the ask line. Below 64rem the
 * two become tabs, site first.
 *
 * FORM: split — site beside the agent. Fifth on the ordered list; assigned by
 * seed 93e56a79 (surface, operate).
 */

definePageMeta({ layout: 'default', alias: ['/agent'] })

const api = useApi()
const activeSiteId = useActiveSiteId()
const config = useRuntimeConfig()
const { t } = useLocale()

const { data: sites } = await useAsyncData('agent:sites', () =>
  api.get<Site[]>('/api/v1/sites'),
)

const site = computed(
  () => sites.value?.find((candidate) => candidate.id === activeSiteId.value) ?? sites.value?.[0] ?? null,
)

/** Only a connected domain yields a real address; a guessed one is someone else's site. */
const { data: pages } = await useAsyncData(
  'agent:pages',
  () => (site.value ? api.get<PageSummary[]>(`/api/v1/sites/${site.value.id}/pages`) : Promise.resolve([])),
  { watch: [site] },
)

/** Where a proposed edit gets applied: the home page, or the first one there is. */
const homePageId = computed(
  () => (pages.value?.find((page) => page.path === '/') ?? pages.value?.[0])?.id ?? null,
)

const previewUrl = computed(() =>
  site.value?.primaryHostname
    ? buildStorefrontUrl({
        storefrontBase: String(config.public.storefrontUrl || 'http://localhost:3001'),
        primaryHostname: site.value.primaryHostname,
        path: '/',
      })
    : null,
)

interface Change {
  id: string
  /** What the owner asked, in their words. */
  asked: string
  /** What the agent did, in business language — never system language. */
  did: string
  where: string
  at: Date
  /** Absent when the action has no revision behind it; the card then says so. */
  undo: (() => Promise<void>) | null
  undone: boolean
  /**
   * Edits the assistant proposed but did not make. They are applied in the page
   * editor, which snapshots for undo first — PRODUCT.md: never act further than
   * you can undo, and site-level changes here have no revision behind them.
   */
  proposed: number
  pageHref: string | null
}

interface AssistReply {
  answer: string
  model?: string
  actions?: { type: string }[]
}

const changes = ref<Change[]>([])
const draft = ref('')
const busy = ref(false)
const failure = ref('')
const askField = ref<HTMLTextAreaElement | null>(null)

async function ask() {
  const question = draft.value.trim()
  if (!question || busy.value) return

  busy.value = true
  failure.value = ''
  try {
    const result = await api.post<AssistReply>('/api/v1/ai/assist', {
      message: question,
      includeCatalogue: true,
    })

    changes.value.unshift({
      id: crypto.randomUUID(),
      asked: question,
      did: result?.answer?.trim() || t('agent.card.noSummary'),
      where: site.value?.name ?? '',
      at: new Date(),
      // Undo arrives with the action that earned it. Pages and posts carry
      // revisions; prices, theme, navigation and domains do not yet, and an
      // undo button that cannot work is worse than none.
      undo: null,
      undone: false,
      proposed: result?.actions?.length ?? 0,
      pageHref: homePageId.value ? `/pages/${homePageId.value}?mode=ai` : null,
    })
    draft.value = ''
    await nextTick()
    askField.value?.focus()
  } catch (error) {
    failure.value = error instanceof Error ? error.message : t('agent.error.generic')
  } finally {
    busy.value = false
  }
}

function timeOf(value: Date): string {
  return value.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

const tab = ref<'site' | 'agent'>('agent')

/**
 * Device widths for the preview frame.
 *
 * The iframe narrows and the page inside is left alone, so what shows at 390px
 * is the site's own mobile layout rather than a scaled-down desktop render.
 * These are the widths the owner's customers actually arrive on.
 */
const VIEWPORTS = [
  { id: 'mobile', label: 'Telefoon', width: 390, icon: Smartphone },
  { id: 'tablet', label: 'Tablet', width: 834, icon: Tablet },
  { id: 'laptop', label: 'Laptop', width: 1280, icon: Laptop },
  { id: 'desktop', label: 'Desktop', width: 0, icon: Monitor },
] as const

type ViewportId = (typeof VIEWPORTS)[number]['id']
const viewport = ref<ViewportId>('desktop')

/** Desktop is width 0: fill the pane rather than pin it to an arbitrary number. */
const frameStyle = computed(() => {
  const chosen = VIEWPORTS.find((entry) => entry.id === viewport.value)
  return chosen?.width ? { width: `min(100%, ${chosen.width}px)`, marginInline: 'auto' } : {}
})
</script>

<template>
  <div class="agent">
    <nav class="agent__tabs" role="tablist" :aria-label="t('agent.tabs.label')">
      <button type="button" role="tab" :aria-selected="tab === 'site'" @click="tab = 'site'">
        {{ t('agent.tabs.site') }}
      </button>
      <button type="button" role="tab" :aria-selected="tab === 'agent'" @click="tab = 'agent'">
        {{ t('agent.tabs.agent') }}
      </button>
    </nav>

    <section class="agent__site" :data-active="tab === 'site'">
      <header class="agent__site-bar">
        <span class="agent__site-name">{{ site?.name ?? t('agent.site.none') }}</span>
        <div class="agent__devices" role="group" :aria-label="t('agent.site.viewport')">
          <button
            v-for="entry in VIEWPORTS"
            :key="entry.id"
            type="button"
            :aria-pressed="viewport === entry.id"
            :title="entry.width ? `${entry.label} — ${entry.width}px` : entry.label"
            @click="viewport = entry.id"
          >
            <component :is="entry.icon" :size="15" aria-hidden="true" />
            <span class="agent__sr">{{ entry.label }}</span>
          </button>
        </div>

        <a
          v-if="previewUrl"
          :href="previewUrl"
          target="_blank"
          rel="noopener"
          class="agent__site-link"
        >
          {{ site?.primaryHostname }}
          <ExternalLink :size="13" aria-hidden="true" />
        </a>
        <span v-else class="agent__site-link is-muted">{{ t('agent.site.noDomain') }}</span>
      </header>

      <iframe
        v-if="previewUrl"
        :src="previewUrl"
        :title="t('agent.site.frameTitle')"
        class="agent__frame"
        :style="frameStyle"
        loading="lazy"
      />
      <UiEmptyState
        v-else
        class="agent__frame-empty"
        :title="t('agent.site.emptyTitle')"
        :description="t('agent.site.emptyBody')"
      />
    </section>

    <section class="agent__panel" :data-active="tab === 'agent'">
      <form class="agent__ask" @submit.prevent="ask">
        <label for="agent-ask" class="agent__ask-label">{{ t('agent.ask.label') }}</label>
        <div class="agent__ask-row">
          <textarea
            id="agent-ask"
            ref="askField"
            v-model="draft"
            class="agent__ask-input"
            rows="2"
            :placeholder="t('agent.ask.placeholder')"
            :disabled="busy"
            @keydown.enter.exact.prevent="ask"
          />
          <UiButton type="submit" :disabled="busy || !draft.trim()" :aria-label="t('agent.ask.send')">
            <Loader2 v-if="busy" :size="16" class="agent__spin" aria-hidden="true" />
            <Send v-else :size="16" aria-hidden="true" />
          </UiButton>
        </div>
        <p class="agent__ask-hint">{{ t('agent.ask.hint') }}</p>
      </form>

      <p v-if="failure" role="alert" class="agent__failure">{{ failure }}</p>

      <ol v-if="changes.length" class="agent__changes">
        <li v-for="change in changes" :key="change.id">
          <article class="agent__change" :data-undone="change.undone">
            <p class="agent__change-asked">{{ change.asked }}</p>
            <p class="agent__change-did">{{ change.did }}</p>
            <NuxtLink
              v-if="change.proposed && change.pageHref"
              class="agent__change-open"
              :to="change.pageHref"
            >
              {{ t('agent.card.openToApply') }} ({{ change.proposed }})
            </NuxtLink>
            <footer class="agent__change-foot">
              <span>{{ change.where }} · {{ timeOf(change.at) }}</span>
              <button
                v-if="change.undo && !change.undone"
                type="button"
                class="agent__undo"
                @click="change.undo?.()"
              >
                <RotateCcw :size="13" aria-hidden="true" />
                {{ t('agent.card.undo') }}
              </button>
              <span v-else-if="change.undone" class="agent__undone">{{ t('agent.card.undone') }}</span>
              <span v-else class="agent__no-undo">{{ t('agent.card.noUndo') }}</span>
            </footer>
          </article>
        </li>
      </ol>

      <UiEmptyState
        v-else
        :title="t('agent.empty.title')"
        :description="t('agent.empty.body')"
      />
    </section>
  </div>
</template>

<style scoped>
.agent {
  display: grid;
  grid-template-rows: auto 1fr;
  gap: 0;
  height: calc(100dvh - var(--app-header-height, 3.5rem));
}

/* Tabs exist only where the split cannot: the owner is often on a phone. */
.agent__tabs {
  display: flex;
  gap: 0.25rem;
  padding: 0.5rem 1rem;
  border-bottom: 1px solid var(--line);
  background: var(--paper);
}
.agent__tabs button {
  padding: 0.4rem 0.85rem;
  border-radius: 999px;
  font-size: var(--text-14, 0.875rem);
  color: var(--ink-soft);
}
.agent__tabs button[aria-selected='true'] {
  background: var(--paper-sunken);
  color: var(--ink);
  font-weight: 600;
}

.agent__site,
.agent__panel {
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.agent__site[data-active='false'],
.agent__panel[data-active='false'] {
  display: none;
}

.agent__site {
  background: var(--editor-canvas);
}
.agent__site-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.6rem 1rem;
  background: var(--paper);
  border-bottom: 1px solid var(--line);
}
.agent__site-name {
  font-weight: 600;
  font-size: var(--text-14, 0.875rem);
}
.agent__devices {
  display: flex;
  gap: 0.15rem;
  margin-left: auto;
}
.agent__devices button {
  display: grid;
  place-items: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 0.5rem;
  color: var(--ink-faint);
}
.agent__devices button:hover {
  background: var(--paper-sunken);
  color: var(--ink);
}
.agent__devices button[aria-pressed='true'] {
  background: var(--paper-sunken);
  color: var(--ink);
}
.agent__sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
.agent__site-link {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: var(--text-13, 0.8125rem);
  color: var(--ink-soft);
}
.agent__site-link:hover {
  color: var(--ink);
}
.agent__site-link.is-muted {
  color: var(--ink-faint);
}
.agent__frame {
  flex: 1;
  width: 100%;
  border: 0;
  background: var(--paper-raised);
}
.agent__frame-empty {
  margin: auto;
  padding: 2rem;
}

.agent__panel {
  border-left: 1px solid var(--line);
  background: var(--paper);
  overflow-y: auto;
  padding: 1rem;
  gap: 1rem;
}

.agent__ask-label {
  display: block;
  font-size: var(--text-label);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-faint);
  margin-bottom: 0.5rem;
}
.agent__ask-row {
  display: flex;
  gap: 0.5rem;
  align-items: flex-end;
}
.agent__ask-input {
  flex: 1;
  min-height: 3.25rem;
  resize: vertical;
  padding: 0.65rem 0.75rem;
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-card);
  background: var(--paper-raised);
  color: var(--ink);
  font: inherit;
  font-size: 1rem;
}
.agent__ask-input:focus-visible {
  outline: 2px solid var(--focus);
  outline-offset: 1px;
}
.agent__ask-hint {
  margin-top: 0.5rem;
  font-size: var(--text-13, 0.8125rem);
  color: var(--ink-faint);
}
.agent__spin {
  animation: agent-spin 900ms linear infinite;
}
@keyframes agent-spin {
  to { transform: rotate(360deg); }
}
@media (prefers-reduced-motion: reduce) {
  .agent__spin { animation: none; }
}

.agent__failure {
  padding: 0.7rem 0.85rem;
  border-radius: var(--radius-card);
  background: var(--danger-soft);
  color: var(--danger);
  font-size: var(--text-14, 0.875rem);
}

.agent__changes {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.agent__change {
  background: var(--paper-raised);
  border: 1px solid var(--line);
  border-radius: var(--radius-card);
  padding: 0.9rem 1rem;
  box-shadow: var(--shadow-sm);
}
.agent__change[data-undone='true'] {
  opacity: 0.6;
}
.agent__change-asked {
  font-size: var(--text-13, 0.8125rem);
  color: var(--ink-faint);
}
.agent__change-open {
  align-self: start;
  color: var(--brand);
  font: inherit;
  text-decoration: none;
}
.agent__change-open:hover {
  text-decoration: underline;
}

.agent__change-did {
  margin-top: 0.35rem;
  font-size: var(--text-15, 0.9375rem);
  line-height: 1.5;
}
.agent__change-foot {
  margin-top: 0.7rem;
  padding-top: 0.6rem;
  border-top: 1px solid var(--line);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  font-size: var(--text-13, 0.8125rem);
  color: var(--ink-faint);
}
.agent__undo {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  min-height: 2.75rem;
  padding: 0 0.6rem;
  margin: -0.5rem -0.35rem;
  border-radius: 0.4rem;
  color: var(--ink-soft);
  font-weight: 600;
}
.agent__undo:hover {
  background: var(--paper-sunken);
  color: var(--ink);
}
.agent__undone,
.agent__no-undo {
  color: var(--ink-faint);
}

@media (min-width: 64rem) {
  .agent {
    grid-template-rows: 1fr;
    grid-template-columns: 2fr minmax(22rem, 1fr);
  }
  .agent__tabs {
    display: none;
  }
  .agent__site[data-active='false'],
  .agent__panel[data-active='false'] {
    display: flex;
  }
}
</style>
