<script setup lang="ts">
definePageMeta({ layout: false })
</script>

<template>
  <main class="grid min-h-screen place-items-center bg-[#f3f1ec] px-6 text-center text-ink">
    <div class="max-w-md space-y-4">
      <p class="text-xs font-semibold uppercase tracking-[0.14em] text-faint">Offline</p>
      <h1 class="text-2xl font-semibold tracking-tight">You’re offline</h1>
      <p class="text-sm text-soft">
        This page isn’t cached yet. Reconnect, or open a page you’ve already visited —
        those stay available offline.
      </p>
      <NuxtLink
        to="/"
        class="inline-flex h-10 items-center justify-center rounded-xl bg-ink px-4 text-sm font-medium text-paper no-underline"
      >
        Go home
      </NuxtLink>
    </div>
  </main>
</template>
