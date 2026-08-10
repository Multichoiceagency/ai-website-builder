<script setup lang="ts">
import { onMounted, ref } from 'vue'

/**
 * Website chrome — opens (or creates) the shared footer for the active site.
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
      title="Footer"
      description="Site-wide footer chrome. Edits apply to every page when published."
      back="/website/pages"
      back-label="Website"
    />
    <UiEmptyState
      v-if="!activeSiteId"
      title="No website selected"
      description="Pick a site in the sidebar or open All websites."
    >
      <UiButton to="/sites">All websites</UiButton>
    </UiEmptyState>
    <p v-else-if="busy" class="text-sm text-soft" role="status">Opening footer editor…</p>
    <p v-else-if="error" class="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">{{ error }}</p>
  </div>
</template>
