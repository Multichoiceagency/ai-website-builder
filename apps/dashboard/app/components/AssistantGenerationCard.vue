<script setup lang="ts">
import { computed } from 'vue'

/**
 * Lovable-style “Generated image” status card — soft stage art while the
 * assistant reviews structure / applies answers / builds.
 */
const props = withDefaults(
  defineProps<{
    title?: string
    caption?: string
    phase?: 'review' | 'structure' | 'theme' | 'build' | 'done'
    thinkingSeconds?: number | null
  }>(),
  {
    title: 'Generated image',
    caption: 'Reviewing design and structure options.',
    phase: 'review',
    thinkingSeconds: null,
  },
)

const phaseLabel = computed(() => {
  switch (props.phase) {
    case 'structure':
      return 'Designing landing page structure'
    case 'theme':
      return 'Applying colour and type'
    case 'build':
      return 'Building your page'
    case 'done':
      return 'Ready to continue'
    default:
      return props.caption
  }
})
</script>

<template>
  <div class="w-full max-w-[20rem] overflow-hidden rounded-2xl border border-black/8 bg-white shadow-sm">
    <p
      v-if="thinkingSeconds != null"
      class="px-3.5 pt-3 text-[0.75rem] text-faint"
    >
      Thought for {{ thinkingSeconds }}s
    </p>

    <div class="px-3.5 pb-2 pt-2">
      <p class="text-[0.8125rem] font-semibold text-ink">{{ title }}</p>
      <p class="mt-0.5 text-[0.75rem] leading-relaxed text-soft">{{ phaseLabel }}</p>
    </div>

    <!-- Soft wireframe stage (peach atmosphere + UI nodes) -->
    <div
      class="relative mx-3.5 mb-3.5 aspect-[16/11] overflow-hidden rounded-xl"
      aria-hidden="true"
    >
      <div class="absolute inset-0 bg-gradient-to-br from-[#f6d5c4] via-[#f0c4b0] to-[#e8b8a6]" />
      <div class="absolute -right-6 -top-8 h-28 w-28 rounded-full bg-white/25 blur-2xl" />
      <div class="absolute -bottom-8 left-4 h-24 w-32 rounded-full bg-[#d4a08a]/40 blur-2xl" />

      <!-- Floating chrome chips -->
      <div class="absolute left-3 top-3 rounded-lg bg-white/85 px-2 py-1 shadow-sm backdrop-blur-sm">
        <div class="h-1.5 w-10 rounded-full bg-ink/15" />
        <div class="mt-1 h-1 w-7 rounded-full bg-ink/10" />
      </div>
      <div class="absolute right-3 top-4 rounded-lg bg-white/80 px-2 py-1.5 shadow-sm backdrop-blur-sm">
        <div class="flex gap-1">
          <span class="h-2 w-2 rounded-full bg-[#f87171]/70" />
          <span class="h-2 w-2 rounded-full bg-[#fbbf24]/70" />
          <span class="h-2 w-2 rounded-full bg-[#34d399]/70" />
        </div>
      </div>

      <!-- Center wireframe board -->
      <div
        class="absolute left-1/2 top-1/2 w-[72%] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-white/50 bg-white/55 p-3 shadow-md backdrop-blur-md"
      >
        <div class="h-2 w-1/3 rounded-full bg-ink/20" />
        <div class="mt-2 space-y-1.5">
          <div class="h-1.5 w-full rounded-full bg-ink/10" />
          <div class="h-1.5 w-4/5 rounded-full bg-ink/10" />
          <div class="h-1.5 w-3/5 rounded-full bg-ink/10" />
        </div>
        <div class="mt-3 grid grid-cols-3 gap-1.5">
          <div class="aspect-square rounded-md bg-ink/8" />
          <div class="aspect-square rounded-md bg-ink/8" />
          <div class="aspect-square rounded-md bg-ink/8" />
        </div>
      </div>

      <!-- Connection nodes -->
      <svg class="absolute inset-0 h-full w-full opacity-40" viewBox="0 0 160 110" fill="none">
        <circle cx="28" cy="78" r="3" fill="#1c1917" opacity="0.35" />
        <circle cx="132" cy="72" r="3" fill="#1c1917" opacity="0.35" />
        <circle cx="80" cy="96" r="2.5" fill="#1c1917" opacity="0.3" />
        <path d="M28 78 C48 88, 60 70, 80 62" stroke="#1c1917" stroke-width="1" opacity="0.25" />
        <path d="M132 72 C110 80, 100 70, 80 62" stroke="#1c1917" stroke-width="1" opacity="0.25" />
        <path d="M80 62 V96" stroke="#1c1917" stroke-width="1" opacity="0.2" stroke-dasharray="2 2" />
      </svg>

      <!-- Pulse while not done -->
      <div
        v-if="phase !== 'done'"
        class="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1"
      >
        <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-ink/40" />
        <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-ink/40 [animation-delay:150ms]" />
        <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-ink/40 [animation-delay:300ms]" />
      </div>
    </div>
  </div>
</template>
