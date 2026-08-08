<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { Search } from '@lucide/vue'
import { NAV_SECTIONS } from '~/composables/useNavigation'

/**
 * Global ⌘K destination search — filters NAV_SECTIONS destinations.
 */
const open = defineModel<boolean>('open', { default: false })

const can = useCan()
const inputRef = ref<HTMLInputElement | null>(null)
const query = ref('')
const activeIndex = ref(0)

interface SearchHit {
  id: string
  label: string
  section: string
  to: string
  soon?: boolean
}

const hits = computed(() => {
  const term = query.value.trim().toLowerCase()
  const results: SearchHit[] = []

  for (const section of NAV_SECTIONS) {
    if (section.id === 'ai') continue

    if (section.items.length === 0) {
      results.push({
        id: section.id,
        label: section.label,
        section: section.label,
        to: section.to,
        soon: Boolean(section.phase),
      })
      continue
    }

    for (const item of section.items) {
      if (item.permission && !can(item.permission)) continue
      results.push({
        id: `${section.id}:${item.to}`,
        label: item.label,
        section: section.label,
        to: item.to,
        soon: Boolean(item.phase),
      })
    }
  }

  if (!term) return results.slice(0, 12)
  return results
    .filter((hit) => `${hit.label} ${hit.section}`.toLowerCase().includes(term))
    .slice(0, 20)
})

watch(open, async (isOpen) => {
  if (isOpen) {
    query.value = ''
    activeIndex.value = 0
    await nextTick()
    inputRef.value?.focus()
  }
})

watch(hits, () => {
  activeIndex.value = 0
})

async function go(to: string) {
  open.value = false
  await navigateTo(to)
}

function onKeydown(event: KeyboardEvent) {
  if (!open.value) return
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    activeIndex.value = Math.min(activeIndex.value + 1, Math.max(hits.value.length - 1, 0))
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    activeIndex.value = Math.max(activeIndex.value - 1, 0)
  } else if (event.key === 'Enter') {
    event.preventDefault()
    const hit = hits.value[activeIndex.value]
    if (hit) void go(hit.to)
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[var(--z-modal)] flex items-start justify-center bg-ink/40 p-4 pt-[12vh] backdrop-blur-[2px]"
      @click.self="open = false"
      @keydown="onKeydown"
    >
      <div
        class="w-full max-w-lg overflow-hidden rounded-xl border border-line bg-raised shadow-float"
        role="dialog"
        aria-modal="true"
        aria-label="Search"
      >
        <div class="flex items-center gap-2 border-b border-line px-3">
          <Search class="h-4 w-4 shrink-0 text-faint" :stroke-width="ICON_STROKE" aria-hidden="true" />
          <input
            ref="inputRef"
            v-model="query"
            type="search"
            placeholder="Search pages and settings…"
            class="h-12 w-full bg-transparent text-[0.9375rem] text-ink placeholder:text-faint focus:outline-none"
            aria-label="Search destinations"
            autocomplete="off"
            @keydown="onKeydown"
            @keydown.esc.prevent="open = false"
          />
          <kbd class="hidden rounded border border-line px-1.5 py-0.5 text-[0.625rem] text-faint sm:inline">esc</kbd>
        </div>

        <ul v-if="hits.length" class="max-h-80 overflow-y-auto p-2" role="listbox">
          <li v-for="(hit, index) in hits" :key="hit.id" role="option" :aria-selected="index === activeIndex">
            <button
              type="button"
              class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors"
              :class="index === activeIndex ? 'bg-sunken text-ink' : 'text-soft hover:bg-sunken/70 hover:text-ink'"
              @click="go(hit.to)"
              @mouseenter="activeIndex = index"
            >
              <span class="min-w-0 flex-1">
                <span class="block truncate text-[0.8125rem] font-medium">{{ hit.label }}</span>
                <span class="block truncate text-[0.75rem] text-faint">{{ hit.section }}</span>
              </span>
              <span v-if="hit.soon" class="shrink-0 text-[0.625rem] text-faint">soon</span>
            </button>
          </li>
        </ul>
        <p v-else class="px-4 py-8 text-center text-[0.8125rem] text-faint">No matches.</p>
      </div>
    </div>
  </Teleport>
</template>
