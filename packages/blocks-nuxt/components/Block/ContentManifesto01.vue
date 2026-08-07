<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{ heading?: string; body?: string; attribution?: string; tone?: 'light' | 'muted' | 'primary' | 'dark' }>(),
  { heading: '', body: '', attribution: '', tone: 'dark' },
)

/**
 * Surface and text are chosen together, never separately. That is what stops a
 * theme change from producing a manifesto nobody can read.
 */
const surface = computed(
  () =>
    ({
      light: { backgroundColor: 'var(--site-surface)', color: 'var(--site-text)' },
      muted: { backgroundColor: 'var(--site-surface-alt)', color: 'var(--site-text)' },
      primary: { backgroundColor: 'var(--site-primary)', color: '#fff' },
      dark: { backgroundColor: 'var(--site-text)', color: 'var(--site-surface)' },
    })[props.tone],
)
</script>

<template>
  <div :style="surface">
    <div class="mx-auto w-full max-w-5xl px-6 py-24 lg:px-10 lg:py-32">
      <p v-if="heading" class="mb-10 text-[0.75rem] font-bold uppercase tracking-[0.2em] opacity-60">{{ heading }}</p>

      <blockquote
        class="text-[clamp(1.75rem,1rem+3.2vw,3.75rem)] font-bold leading-[1.04] tracking-[-0.04em] text-balance"
        :style="{ fontFamily: 'var(--site-font-heading)' }"
      >
        {{ body }}
      </blockquote>

      <p v-if="attribution" class="mt-10 text-[0.8125rem] font-semibold uppercase tracking-[0.16em] opacity-70">
        — {{ attribution }}
      </p>
    </div>
  </div>
</template>
