<script setup lang="ts">
import { onMounted, ref } from 'vue'

/**
 * Commerce chrome — shared shop footer for the active site.
 */

definePageMeta({ layout: 'default' })

const activeSiteId = useActiveSiteId()
const error = ref('')
const busy = ref(true)

onMounted(async () => {
  if (!activeSiteId.value) {
    busy.value = false
    return
  }
  try {
    await openChromeEditor('footer')
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : caught instanceof Error ? caught.message : 'Could not open footer.'
    busy.value = false
  }
})
</script>

<template>
  <div>
    <UiPageHeader
      title="Shop footer"
      description="Storefront footer chrome reused across shop pages."
      back="/commerce"
      back-label="Commerce"
    />
    <UiEmptyState
      v-if="!activeSiteId"
      title="No website selected"
      description="Pick a site first — the shop footer is stored on the active site."
    >
      <UiButton to="/sites">All websites</UiButton>
    </UiEmptyState>
    <p v-else-if="busy" class="text-sm text-soft" role="status">Opening footer editor…</p>
    <p v-else-if="error" class="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">{{ error }}</p>
  </div>
</template>
