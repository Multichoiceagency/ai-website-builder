<script setup lang="ts">
import { ref } from 'vue'
import type { IconName } from '@platform/blocks'

interface Tab {
  icon: IconName
  title: string
  description: string
}

const props = withDefaults(
  defineProps<{ heading?: string; intro?: string; items?: Tab[] }>(),
  { heading: '', intro: '', items: () => [] },
)

const active = ref(0)
const tabRefs = ref<HTMLElement[]>([])

/**
 * The ARIA tabs pattern, implemented rather than approximated: arrow keys move
 * between tabs, Home and End jump to the ends, and only the selected tab is in
 * the tab sequence so Tab reaches the panel next.
 */
function onKeydown(event: KeyboardEvent) {
  const last = props.items.length - 1
  let next = active.value

  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = active.value === last ? 0 : active.value + 1
  else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = active.value === 0 ? last : active.value - 1
  else if (event.key === 'Home') next = 0
  else if (event.key === 'End') next = last
  else return

  event.preventDefault()
  active.value = next
  tabRefs.value[next]?.focus()
}

function registerTab(element: unknown, index: number) {
  if (element instanceof HTMLElement) tabRefs.value[index] = element
}
</script>

<template>
  <div class="mx-auto w-full max-w-6xl px-6 py-20 lg:px-10 lg:py-24">
    <div class="max-w-2xl">
      <h2
        v-if="heading"
        class="text-[clamp(1.75rem,1.2rem+1.9vw,2.5rem)] font-semibold leading-[1.1] tracking-[-0.03em] text-balance text-[var(--site-text)]"
        :style="{ fontFamily: 'var(--site-font-heading)' }"
      >{{ heading }}</h2>
      <p v-if="intro" class="mt-4 text-[1.0625rem] leading-relaxed text-[var(--site-text-muted)]">{{ intro }}</p>
    </div>

    <div class="mt-10 grid gap-8 lg:grid-cols-[19rem_1fr] lg:gap-12">
      <div
        class="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0"
        role="tablist"
        aria-orientation="vertical"
        @keydown="onKeydown"
      >
        <button
          v-for="(item, index) in items"
          :ref="(element) => registerTab(element, index)"
          :id="`tab-${index}`"
          :key="item.title"
          type="button"
          role="tab"
          class="flex shrink-0 items-center gap-3 rounded-[var(--site-radius)] border px-4 py-3.5 text-left text-[0.9375rem] font-semibold transition-[background-color,border-color,transform] duration-200 lg:shrink"
          :class="
            active === index
              ? 'border-[var(--site-primary)] bg-[var(--site-primary)]/8 text-[var(--site-text)]'
              : 'border-transparent text-[var(--site-text-muted)] hover:border-[var(--site-line)] hover:bg-[var(--site-surface-alt)]'
          "
          :aria-selected="active === index"
          :aria-controls="`panel-${index}`"
          :tabindex="active === index ? 0 : -1"
          @click="active = index"
        >
          <BlockIcon :name="item.icon" class="h-4 w-4 shrink-0" />
          {{ item.title }}
        </button>
      </div>

      <!-- Panels cross-fade. Only the selected one is in the accessibility tree,
           and the inactive ones are hidden rather than merely transparent. -->
      <div class="relative min-h-[13rem] rounded-[calc(var(--site-radius)*1.75)] border border-[var(--site-line)] bg-[var(--site-surface-alt)] p-8 lg:p-10">
        <div
          v-for="(item, index) in items"
          :id="`panel-${index}`"
          :key="item.title"
          role="tabpanel"
          :aria-labelledby="`tab-${index}`"
          :hidden="active !== index"
          class="[animation:tab-in_0.32s_cubic-bezier(0.16,1,0.3,1)_both] motion-reduce:animate-none"
        >
          <span class="grid h-11 w-11 place-items-center rounded-full bg-[var(--site-primary)]/12 text-[var(--site-primary)]">
            <BlockIcon :name="item.icon" class="h-5 w-5" />
          </span>
          <h3
            class="mt-5 text-[1.375rem] font-semibold tracking-[-0.025em] text-[var(--site-text)]"
            :style="{ fontFamily: 'var(--site-font-heading)' }"
          >{{ item.title }}</h3>
          <p class="mt-3 max-w-xl text-[1rem] leading-relaxed text-pretty text-[var(--site-text-muted)]">
            {{ item.description }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
@keyframes tab-in {
  from { opacity: 0; transform: translate3d(0, 0.5rem, 0); }
  to { opacity: 1; transform: none; }
}
</style>
