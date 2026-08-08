<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ExternalLink, Search, Sparkles } from '@lucide/vue'

/**
 * Dark charcoal admin top bar — Shopify-like chrome.
 * Global ⌘K opens search; assistant is a separate toggle (drawer).
 */
const props = defineProps<{
  workspaceLabel: string
  logoUrl: string | null
  hidePlatformBranding: boolean
  previewUrl: string
  planLabel?: string | null
  userName?: string | null
  assistantOpen: boolean
}>()

const emit = defineEmits<{
  'toggle-assistant': []
  'open-search': []
  'sign-out': []
}>()

const menuOpen = ref(false)
const menuRef = ref<HTMLElement | null>(null)

const initials = computed(() => (props.userName ?? '?').charAt(0).toUpperCase())

function onDocClick(event: MouseEvent) {
  if (!menuOpen.value) return
  const target = event.target as Node
  if (menuRef.value && !menuRef.value.contains(target)) menuOpen.value = false
}

onMounted(() => document.addEventListener('click', onDocClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocClick))
</script>

<template>
  <header
    class="flex h-12 shrink-0 items-center gap-3 bg-ink px-3 text-paper sm:px-4"
    role="banner"
  >
    <NuxtLink
      to="/"
      class="flex shrink-0 items-center gap-2 no-underline"
      :aria-label="workspaceLabel"
    >
      <span
        class="grid h-7 w-7 place-items-center overflow-hidden rounded-md"
        :class="logoUrl ? 'bg-paper/10' : 'bg-paper text-ink'"
      >
        <img
          v-if="logoUrl"
          :src="logoUrl"
          :alt="workspaceLabel"
          class="h-7 w-7 object-contain"
        />
        <Sparkles v-else class="h-3.5 w-3.5" :stroke-width="ICON_STROKE" aria-hidden="true" />
      </span>
      <span class="hidden max-w-[10rem] truncate text-[0.8125rem] font-semibold tracking-[-0.01em] sm:inline">
        {{ workspaceLabel }}
      </span>
    </NuxtLink>

    <button
      type="button"
      class="ml-1 flex h-8 min-w-0 max-w-md flex-1 items-center gap-2 rounded-lg border border-paper/15 bg-paper/10 px-3 text-left text-[0.8125rem] text-paper/70 transition-colors hover:bg-paper/15 hover:text-paper sm:max-w-sm"
      aria-label="Search (⌘K)"
      @click="emit('open-search')"
    >
      <Search class="h-3.5 w-3.5 shrink-0 opacity-70" :stroke-width="ICON_STROKE" aria-hidden="true" />
      <span class="min-w-0 flex-1 truncate">Search</span>
      <kbd
        class="hidden shrink-0 rounded border border-paper/20 px-1.5 py-0.5 text-[0.625rem] font-medium text-paper/55 sm:inline"
      >
        ⌘K
      </kbd>
    </button>

    <div class="ml-auto flex items-center gap-1.5 sm:gap-2">
      <a
        :href="previewUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[0.8125rem] font-medium text-paper/80 no-underline transition-colors hover:bg-paper/10 hover:text-paper"
      >
        <span class="hidden sm:inline">View store</span>
        <ExternalLink class="h-3.5 w-3.5" :stroke-width="ICON_STROKE" aria-hidden="true" />
      </a>

      <button
        type="button"
        class="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[0.8125rem] font-medium transition-colors"
        :class="
          assistantOpen
            ? 'bg-paper text-ink'
            : 'text-paper/80 hover:bg-paper/10 hover:text-paper'
        "
        :aria-pressed="assistantOpen"
        aria-label="Toggle AI assistant"
        @click="emit('toggle-assistant')"
      >
        <Sparkles class="h-3.5 w-3.5" :stroke-width="ICON_STROKE" aria-hidden="true" />
        <span class="hidden sm:inline">Assistant</span>
      </button>

      <div ref="menuRef" class="relative">
        <button
          type="button"
          class="grid h-8 w-8 place-items-center rounded-full bg-paper/15 text-[0.75rem] font-semibold text-paper transition-colors hover:bg-paper/25"
          :aria-expanded="menuOpen"
          aria-haspopup="menu"
          :aria-label="userName ? `${userName} menu` : 'Workspace menu'"
          @click.stop="menuOpen = !menuOpen"
        >
          {{ initials }}
        </button>

        <div
          v-if="menuOpen"
          class="absolute right-0 top-full z-[var(--z-nav-flyout)] mt-1.5 w-56 overflow-hidden rounded-lg border border-line bg-raised py-1 shadow-float"
          role="menu"
        >
          <div class="border-b border-line px-3 py-2.5">
            <p class="truncate text-[0.8125rem] font-semibold text-ink">{{ workspaceLabel }}</p>
            <p v-if="userName" class="truncate text-[0.75rem] text-faint">{{ userName }}</p>
            <p v-if="planLabel" class="mt-1">
              <UiBadge tone="brand">{{ planLabel }}</UiBadge>
            </p>
            <p v-if="!hidePlatformBranding" class="mt-1 text-[0.6875rem] text-faint">Platform</p>
          </div>
          <NuxtLink
            to="/settings"
            class="block px-3 py-2 text-[0.8125rem] text-soft no-underline hover:bg-sunken hover:text-ink"
            role="menuitem"
            @click="menuOpen = false"
          >
            Settings
          </NuxtLink>
          <button
            type="button"
            class="block w-full px-3 py-2 text-left text-[0.8125rem] text-soft hover:bg-sunken hover:text-ink"
            role="menuitem"
            @click="emit('sign-out'); menuOpen = false"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  </header>
</template>
