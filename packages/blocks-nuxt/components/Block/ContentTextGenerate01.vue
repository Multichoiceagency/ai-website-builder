<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{ heading?: string; body?: string; speed?: 'slow' | 'medium' | 'fast' }>(),
  { heading: '', body: '', speed: 'medium' },
)

const words = computed(() => props.body.split(/\s+/).filter(Boolean))
const step = computed(() => ({ slow: 90, medium: 55, fast: 32 })[props.speed])
</script>

<template>
  <div class="mx-auto w-full max-w-3xl px-6 py-20 lg:px-10 lg:py-28">
    <h2 v-if="heading" class="mb-8 text-[0.8125rem] font-semibold uppercase tracking-[0.16em] text-[var(--site-primary)]">
      {{ heading }}
    </h2>

    <!--
      The whole sentence is in the markup from the first byte. The effect is a
      per-word entrance animation with `both` fill, so if the animation never
      runs — reduced motion, no scripting, an old browser — the text is simply
      there. Nothing here is generated, only revealed.
    -->
    <p
      class="text-[clamp(1.25rem,1rem+1.2vw,1.875rem)] leading-[1.45] text-pretty text-[var(--site-text)]"
      :style="{ fontFamily: 'var(--site-font-heading)' }"
    >
      <span
        v-for="(word, index) in words"
        :key="`${word}-${index}`"
        class="inline-block [animation:text-generate_0.6s_ease-out_both] motion-reduce:animate-none"
        :style="{ animationDelay: `${index * step}ms` }"
      >{{ word }}&nbsp;</span>
    </p>
  </div>
</template>

<style>
@keyframes text-generate {
  from { opacity: 0; filter: blur(6px); }
  to { opacity: 1; filter: none; }
}
</style>
