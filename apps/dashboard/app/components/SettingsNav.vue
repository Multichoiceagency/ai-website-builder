<script setup lang="ts">
import { computed } from 'vue'

/**
 * The settings sub-navigation.
 *
 * Settings is the one module whose sections are not in the global nav — there
 * are eleven of them and they belong to the screen, not to the rail. Grouping
 * them is what keeps "where do I change my plan?" answerable without reading
 * every label.
 */
interface SettingsNavItem {
  label: string
  to: string
  hint?: string
}

interface SettingsNavGroup {
  label: string
  items: SettingsNavItem[]
}

const props = defineProps<{ groups: SettingsNavGroup[] }>()

const route = useRoute()

const isActive = (to: string) => route.path === to
const flat = computed(() => props.groups.flatMap((group) => group.items))
</script>

<template>
  <!-- Sticky on desktop; a horizontal scroller on narrow screens, where a
       vertical rail would eat the whole viewport. -->
  <nav class="md:sticky md:top-0 md:self-start" aria-label="Settings">
    <div class="-mx-1 flex gap-1 overflow-x-auto pb-2 md:hidden">
      <NuxtLink
        v-for="item in flat"
        :key="item.to"
        :to="item.to"
        class="type-button-12 shrink-0 rounded-full border px-3 py-1.5 no-underline transition-colors"
        :class="
          isActive(item.to)
            ? 'border-brand bg-brand-soft text-brand'
            : 'border-line text-soft hover:border-line-strong hover:text-ink'
        "
      >
        {{ item.label }}
      </NuxtLink>
    </div>

    <div class="hidden flex-col gap-5 md:flex">
      <div v-for="group in groups" :key="group.label">
        <p class="type-button-10 mb-1.5 px-2 uppercase tracking-[0.08em] text-faint">{{ group.label }}</p>
        <ul class="flex flex-col gap-0.5">
          <li v-for="item in group.items" :key="item.to">
            <NuxtLink
              :to="item.to"
              class="type-button-12 flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 no-underline transition-colors"
              :class="isActive(item.to) ? 'bg-brand-soft text-brand' : 'text-soft hover:bg-sunken hover:text-ink'"
              :aria-current="isActive(item.to) ? 'page' : undefined"
            >
              <span>{{ item.label }}</span>
              <span v-if="item.hint" class="type-button-10 text-faint">{{ item.hint }}</span>
            </NuxtLink>
          </li>
        </ul>
      </div>
    </div>
  </nav>
</template>
