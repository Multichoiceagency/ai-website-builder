<script setup lang="ts">
/**
 * Install + update + offline banners for @vite-pwa/nuxt ($pwa).
 * Client-only: service workers and beforeinstallprompt are browser APIs.
 */
const { $pwa } = useNuxtApp()

const online = ref(true)

function onOnline() {
  online.value = true
}
function onOffline() {
  online.value = false
}

onMounted(() => {
  online.value = navigator.onLine
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)
})

onBeforeUnmount(() => {
  window.removeEventListener('online', onOnline)
  window.removeEventListener('offline', onOffline)
})

const showInstall = computed(
  () => Boolean($pwa?.showInstallPrompt && !$pwa?.isPWAInstalled),
)
const showUpdate = computed(() => Boolean($pwa?.needRefresh))
const showOfflineReady = computed(() => Boolean($pwa?.offlineReady))
const showOffline = computed(() => !online.value)
</script>

<template>
  <ClientOnly>
    <div
      class="pointer-events-none fixed inset-x-0 bottom-0 z-[80] flex flex-col items-center gap-2 p-3 sm:p-4"
      aria-live="polite"
    >
      <div
        v-if="showOffline"
        class="pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl border border-black/10 bg-ink px-4 py-3 text-sm text-paper shadow-lg"
        role="status"
      >
        <span class="font-medium">You’re offline</span>
        <span class="text-paper/70">Cached pages still work.</span>
      </div>

      <div
        v-else-if="showOfflineReady"
        class="pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl border border-black/10 bg-paper px-4 py-3 text-sm text-ink shadow-lg"
        role="status"
      >
        <span class="min-w-0 flex-1">Ready for offline use.</span>
        <button
          type="button"
          class="shrink-0 rounded-lg px-2 py-1 text-soft hover:bg-black/5 hover:text-ink"
          @click="$pwa?.cancelPrompt()"
        >
          Dismiss
        </button>
      </div>

      <div
        v-else-if="showUpdate"
        class="pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl border border-black/10 bg-paper px-4 py-3 text-sm text-ink shadow-lg"
        role="status"
      >
        <span class="min-w-0 flex-1">Update available.</span>
        <button
          type="button"
          class="shrink-0 rounded-lg px-2 py-1 text-soft hover:bg-black/5 hover:text-ink"
          @click="$pwa?.cancelPrompt()"
        >
          Later
        </button>
        <button
          type="button"
          class="shrink-0 rounded-lg bg-ink px-3 py-1.5 font-medium text-paper"
          @click="$pwa?.updateServiceWorker(true)"
        >
          Reload
        </button>
      </div>

      <div
        v-else-if="showInstall"
        class="pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl border border-black/10 bg-paper px-4 py-3 text-sm text-ink shadow-lg"
        role="dialog"
        aria-label="Install app"
      >
        <span class="min-w-0 flex-1">Install this app for quick access and offline use.</span>
        <button
          type="button"
          class="shrink-0 rounded-lg px-2 py-1 text-soft hover:bg-black/5 hover:text-ink"
          @click="$pwa?.cancelInstall()"
        >
          Not now
        </button>
        <button
          type="button"
          class="shrink-0 rounded-lg bg-ink px-3 py-1.5 font-medium text-paper"
          @click="$pwa?.install()"
        >
          Install
        </button>
      </div>
    </div>
  </ClientOnly>
</template>
