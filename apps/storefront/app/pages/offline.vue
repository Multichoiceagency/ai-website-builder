<script setup lang="ts">
useSeoMeta({
  title: 'Offline',
  robots: 'noindex',
})
</script>

<template>
  <main class="grid min-h-[70vh] place-items-center px-6 text-center">
    <div class="max-w-md space-y-4">
      <p class="text-xs font-semibold uppercase tracking-[0.14em] opacity-60">Offline</p>
      <h1 class="text-2xl font-semibold tracking-tight">You’re offline</h1>
      <p class="text-sm opacity-70">
        This page isn’t available offline yet. Check your connection, or revisit a page
        you’ve opened before.
      </p>
      <NuxtLink
        to="/"
        class="inline-flex h-10 items-center justify-center rounded-xl bg-black px-4 text-sm font-medium text-white no-underline"
      >
        Go home
      </NuxtLink>
    </div>
  </main>
</template>
