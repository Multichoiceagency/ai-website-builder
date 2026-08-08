<script setup lang="ts">
/**
 * Full-bleed shop promo strip — shipping, drops, offers.
 */
const props = withDefaults(
  defineProps<{
    messages?: string
    sticky?: boolean
  }>(),
  { messages: '', sticky: false },
)

function parts(value: string): string[] {
  return value
    .split(/\n|·|•/)
    .map((part) => part.trim())
    .filter(Boolean)
}
</script>

<template>
  <div
    class="w-full bg-[var(--site-primary)] text-[var(--site-text)]"
    :class="sticky ? 'sticky top-0 z-40' : ''"
    role="region"
    aria-label="Store announcement"
  >
    <p
      class="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-2.5 text-center text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-white"
    >
      <template v-for="(part, index) in parts(messages)" :key="`${part}-${index}`">
        <span v-if="index > 0" aria-hidden="true" class="opacity-60">·</span>
        <span>{{ part }}</span>
      </template>
    </p>
  </div>
</template>
