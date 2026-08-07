<script setup lang="ts">
withDefaults(defineProps<{ items?: { value: string; label: string }[] }>(), { items: () => [] })
</script>

<template>
  <div class="mx-auto w-full max-w-6xl px-6 py-14 lg:px-10">
    <dl
      class="grid gap-px overflow-hidden rounded-[calc(var(--site-radius)*1.5)] border border-[var(--site-line)] bg-[var(--site-line)]"
      style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr))"
    >
      <!-- `flex-col` is what makes `order` apply: the number leads, the label
           follows, while the markup keeps the dt-before-dd pairing. -->
      <div v-for="item in items" :key="item.label" class="flex flex-col bg-[var(--site-surface)] px-7 py-8">
        <dt class="order-2 mt-1.5 text-sm font-medium text-[var(--site-text-muted)]">{{ item.label }}</dt>
        <dd
          class="order-1 text-[2.5rem] font-semibold leading-none tracking-[-0.04em] text-[var(--site-text)] tabular-nums"
          :style="{ fontFamily: 'var(--site-font-heading)' }"
        >
          {{ item.value }}
        </dd>
      </div>
    </dl>
  </div>
</template>
