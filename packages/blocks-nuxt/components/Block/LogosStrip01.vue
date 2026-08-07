<script setup lang="ts">
withDefaults(
  defineProps<{ heading?: string; items?: { name: string; image: string }[] }>(),
  { heading: '', items: () => [] },
)
</script>

<template>
  <div class="mx-auto w-full max-w-6xl px-6 py-14 lg:px-10">
    <p
      v-if="heading"
      class="mb-8 text-center text-[0.75rem] font-semibold uppercase tracking-[0.16em] text-[var(--site-text-muted)]"
    >
      {{ heading }}
    </p>
    <ul class="flex flex-wrap items-center justify-center gap-x-12 gap-y-8">
      <li v-for="item in items" :key="item.name" class="opacity-60 transition-opacity duration-200 hover:opacity-100">
        <img v-if="item.image" :src="item.image" :alt="item.name" class="h-7 w-auto" height="28" loading="lazy" />
        <span
          v-else
          class="text-lg font-semibold tracking-[-0.02em] text-[var(--site-text-muted)]"
          :style="{ fontFamily: 'var(--site-font-heading)' }"
        >{{ item.name }}</span>
      </li>
    </ul>
  </div>
</template>
