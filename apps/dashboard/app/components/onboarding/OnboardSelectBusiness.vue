<script setup lang="ts">
/**
 * Step 4 — pick a Google Business location, or confirm the manual identity.
 */

export interface BusinessLocationOption {
  externalId: string
  label: string
  address?: string
}

const props = defineProps<{
  connectMode: 'google' | 'manual' | null
  locations: BusinessLocationOption[]
  loadingLocations?: boolean
  website: string
  businessName: string
  city: string
}>()

const selectedId = defineModel<string | null>('selectedId', { default: null })

const emit = defineEmits<{
  continue: []
  refreshLocations: []
}>()

const canContinue = computed(() => {
  if (props.connectMode === 'google') {
    if (!props.locations.length) return Boolean(props.businessName.trim() || props.website.trim())
    return Boolean(selectedId.value)
  }
  return Boolean(props.businessName.trim() || props.website.trim())
})

function submit() {
  if (!canContinue.value) return
  emit('continue')
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <template v-if="connectMode === 'google'">
      <div v-if="loadingLocations" class="rounded-xl border border-line bg-raised p-8 text-center">
        <span class="mx-auto mb-3 block h-7 w-7 animate-spin rounded-full border-2 border-line border-t-brand" />
        <p class="text-sm text-soft">Loading Business Profile locations…</p>
      </div>

      <template v-else-if="locations.length">
        <p class="text-[0.8125rem] text-soft">Choose the location we should scan.</p>
        <div class="flex flex-col gap-2">
          <button
            v-for="location in locations"
            :key="location.externalId"
            type="button"
            class="rounded-xl border bg-raised px-4 py-3 text-left transition-colors"
            :class="
              selectedId === location.externalId
                ? 'border-brand ring-2 ring-brand/30'
                : 'border-line hover:border-brand/40'
            "
            @click="selectedId = location.externalId"
          >
            <span class="block text-[0.875rem] font-semibold text-ink">{{ location.label }}</span>
            <span v-if="location.address" class="mt-0.5 block text-[0.75rem] text-faint">
              {{ location.address }}
            </span>
          </button>
        </div>
        <UiButton type="button" variant="ghost" size="sm" class="self-start" @click="emit('refreshLocations')">
          Refresh locations
        </UiButton>
      </template>

      <div v-else class="rounded-xl border border-line bg-raised p-5">
        <p class="text-sm text-soft">
          No Business Profile locations found yet. Continue with the name or website you entered, or refresh after
          connecting Google.
        </p>
        <UiButton type="button" size="sm" class="mt-3" @click="emit('refreshLocations')">Refresh</UiButton>
      </div>
    </template>

    <div v-else class="rounded-xl border border-line bg-raised p-5">
      <h2 class="text-[0.8125rem] font-semibold uppercase tracking-[0.06em] text-faint">Confirm business</h2>
      <dl class="mt-3 flex flex-col gap-2 text-[0.8125rem]">
        <div v-if="businessName" class="flex gap-2">
          <dt class="w-24 shrink-0 text-faint">Name</dt>
          <dd class="font-medium text-ink">{{ businessName }}</dd>
        </div>
        <div v-if="website" class="flex gap-2">
          <dt class="w-24 shrink-0 text-faint">Website</dt>
          <dd class="font-medium text-ink">{{ website }}</dd>
        </div>
        <div v-if="city" class="flex gap-2">
          <dt class="w-24 shrink-0 text-faint">City</dt>
          <dd class="font-medium text-ink">{{ city }}</dd>
        </div>
      </dl>
    </div>

    <UiButton variant="primary" size="lg" class="self-start" arrow :disabled="!canContinue" @click="submit">
      Start AI scan
    </UiButton>
  </div>
</template>
