<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{ items?: string; speed?: 'slow' | 'medium' | 'fast' }>(), {
  items: '', speed: 'medium',
})

const phrases = computed(() => props.items.split(',').map((p) => p.trim()).filter(Boolean))
const duration = computed(() => ({ slow: '46s', medium: '32s', fast: '20s' })[props.speed])
</script>

<template>
  <div class="group overflow-hidden border-y border-[var(--site-line)] py-5">
    <!-- The list is duplicated so the loop is seamless; the copy is hidden from
         assistive tech so nothing is announced twice. -->
    <div
      class="flex w-max [animation:marquee_var(--marquee-duration)_linear_infinite] group-hover:[animation-play-state:paused] motion-reduce:animate-none"
      :style="{ '--marquee-duration': duration }"
    >
      <ul v-for="copy in 2" :key="copy" class="flex shrink-0 items-center" :aria-hidden="copy === 2 ? 'true' : undefined">
        <li
          v-for="(phrase, index) in phrases"
          :key="`${copy}-${index}`"
          class="flex items-center whitespace-nowrap px-7 text-[1.125rem] font-semibold tracking-[-0.02em] text-[var(--site-text)]"
          :style="{ fontFamily: 'var(--site-font-heading)' }"
        >
          {{ phrase }}
          <span class="ml-7 h-1.5 w-1.5 rounded-full bg-[var(--site-primary)]" aria-hidden="true" />
        </li>
      </ul>
    </div>
  </div>
</template>

<style>
@keyframes marquee { from { transform: translate3d(0, 0, 0); } to { transform: translate3d(-50%, 0, 0); } }
</style>
