<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'

/**
 * Modal dialog with the behaviour Radix treats as mandatory: focus moves in,
 * Tab is trapped, Escape closes, focus returns to the trigger, and the page
 * behind cannot scroll.
 *
 * Nothing in the product hand-rolls a dialog — every one goes through here.
 */
const props = withDefaults(defineProps<{ title: string; description?: string; wide?: boolean }>(), {
  description: '',
  wide: false,
})

const open = defineModel<boolean>('open', { default: false })

const panel = ref<HTMLElement | null>(null)
let previouslyFocused: HTMLElement | null = null

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function focusableElements(): HTMLElement[] {
  return panel.value ? [...panel.value.querySelectorAll<HTMLElement>(FOCUSABLE)] : []
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    open.value = false
    return
  }

  if (event.key !== 'Tab') return

  const elements = focusableElements()
  if (elements.length === 0) {
    event.preventDefault()
    return
  }

  const first = elements[0]!
  const last = elements[elements.length - 1]!
  const active = document.activeElement

  if (event.shiftKey && active === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && active === last) {
    event.preventDefault()
    first.focus()
  }
}

watch(open, async (isOpen) => {
  if (isOpen) {
    previouslyFocused = document.activeElement as HTMLElement | null
    document.body.style.overflow = 'hidden'
    await nextTick()
    ;(focusableElements()[0] ?? panel.value)?.focus()
  } else {
    document.body.style.overflow = ''
    previouslyFocused?.focus()
    previouslyFocused = null
  }
})

onBeforeUnmount(() => {
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[var(--z-modal)] flex items-start justify-center overflow-y-auto bg-ink/35 p-4 backdrop-blur-[2px] sm:p-8"
      @click.self="open = false"
    >
      <div
        ref="panel"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
        :aria-description="description || undefined"
        tabindex="-1"
        class="my-auto w-full rounded-card border border-line bg-raised shadow-float outline-none"
        :class="wide ? 'max-w-3xl' : 'max-w-lg'"
        @keydown="onKeydown"
      >
        <header class="flex items-start justify-between gap-6 border-b border-line px-6 py-4">
          <div>
            <h2 class="text-heading font-semibold text-ink">{{ title }}</h2>
            <p v-if="description" class="mt-0.5 text-[0.8125rem] text-soft">{{ description }}</p>
          </div>
          <button
            type="button"
            class="-mr-1.5 -mt-1 grid h-8 w-8 place-items-center rounded-md text-faint transition-colors hover:bg-sunken hover:text-ink"
            aria-label="Sluiten"
            @click="open = false"
          >
            &times;
          </button>
        </header>

        <div class="px-6 py-5">
          <slot />
        </div>

        <footer v-if="$slots.footer" class="flex justify-end gap-2 border-t border-line px-6 py-4">
          <slot name="footer" />
        </footer>
      </div>
    </div>
  </Teleport>
</template>
