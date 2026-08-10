<script setup lang="ts">
import type { BusinessLocationOption } from './OnboardSelectBusiness.vue'

/**
 * Step 3 — Google Business Profile or manual URL / name (§80).
 * When Google is connected, locations are listed here so the user can pick a GBP.
 */

const website = defineModel<string>('website', { default: '' })
const businessName = defineModel<string>('businessName', { default: '' })
const city = defineModel<string>('city', { default: '' })
const locale = defineModel<string>('locale', { default: 'nl' })
const connectMode = defineModel<'google' | 'manual' | null>('connectMode', { default: null })
const selectedLocationId = defineModel<string | null>('selectedLocationId', { default: null })

const emit = defineEmits<{
  continue: []
  connectGoogle: []
  refreshLocations: []
}>()

const { busy: connectingGoogle, error: connectGoogleError } = useGoogleConnect()

const props = defineProps<{
  googleConnected?: boolean
  googleAvailable?: boolean
  googleReason?: string
  googleCallbackStatus?: string
  locations?: BusinessLocationOption[]
  loadingLocations?: boolean
}>()

const canManual = computed(() => Boolean(website.value.trim() || businessName.value.trim()))

const canContinueGoogle = computed(() => {
  if (!props.googleConnected) return false
  if (props.loadingLocations) return false
  if ((props.locations?.length ?? 0) > 0) return Boolean(selectedLocationId.value)
  return canManual.value
})

function chooseGoogle() {
  connectMode.value = 'google'
  if (!props.googleConnected) {
    emit('connectGoogle')
  }
}

function chooseManual() {
  connectMode.value = 'manual'
}

function submitManual() {
  if (!canManual.value) return
  connectMode.value = 'manual'
  emit('continue')
}

function continueWithGoogle() {
  if (!canContinueGoogle.value) return
  connectMode.value = 'google'
  emit('continue')
}

function pickLocation(id: string) {
  selectedLocationId.value = id
  connectMode.value = 'google'
  const location = props.locations?.find((entry) => entry.externalId === id)
  if (location && !businessName.value.trim()) businessName.value = location.label
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <button
      type="button"
      class="flex items-start gap-4 rounded-xl border bg-raised p-5 text-left transition-colors"
      :class="connectMode === 'google' ? 'border-brand ring-2 ring-brand/30' : 'border-line hover:border-brand/40'"
      @click="chooseGoogle"
    >
      <span class="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-sunken">
        <UiGoogleMark class="h-5 w-5" />
      </span>
      <span class="min-w-0">
        <span class="block text-[0.9375rem] font-semibold text-ink">Connect Google</span>
        <span class="mt-1 block text-[0.8125rem] leading-relaxed text-soft">
          {{
            googleConnected
              ? googleReason || 'Connected — pick a Business Profile location below.'
              : googleAvailable
                ? 'Business Profile, Search Console, Analytics, Ads and Gmail in one consent.'
                : googleReason || 'Google needs setup on this workspace.'
          }}
        </span>
        <UiBadge v-if="googleConnected" tone="positive" class="mt-2">Connected</UiBadge>
        <UiBadge v-else-if="!googleAvailable" tone="warning" class="mt-2">Needs setup</UiBadge>
        <span v-else-if="connectingGoogle" class="mt-2 block text-[0.75rem] text-faint">Opening Google…</span>
      </span>
    </button>

    <p
      v-if="connectGoogleError || (googleCallbackStatus && googleCallbackStatus !== 'connected')"
      class="rounded-lg bg-danger-soft px-3 py-2 text-[0.75rem] text-danger"
      role="alert"
    >
      {{ connectGoogleError || `Google connection failed: ${googleCallbackStatus}` }}
    </p>
    <p v-else-if="googleCallbackStatus === 'connected'" class="text-[0.75rem] text-positive" role="status">
      Google is connected.
    </p>

    <div v-if="googleConnected" class="rounded-xl border border-line bg-raised p-5">
      <h2 class="text-[0.8125rem] font-semibold uppercase tracking-[0.06em] text-faint">
        Business Profile locations
      </h2>

      <div v-if="loadingLocations" class="mt-4 py-6 text-center">
        <span class="mx-auto mb-3 block h-7 w-7 animate-spin rounded-full border-2 border-line border-t-brand" />
        <p class="text-sm text-soft">Loading locations…</p>
      </div>

      <template v-else-if="locations?.length">
        <p class="mt-2 text-[0.8125rem] text-soft">Choose the location we should scan.</p>
        <div class="mt-3 flex flex-col gap-2">
          <button
            v-for="location in locations"
            :key="location.externalId"
            type="button"
            class="rounded-xl border bg-raised px-4 py-3 text-left transition-colors"
            :class="
              selectedLocationId === location.externalId
                ? 'border-brand ring-2 ring-brand/30'
                : 'border-line hover:border-brand/40'
            "
            @click="pickLocation(location.externalId)"
          >
            <span class="block text-[0.875rem] font-semibold text-ink">{{ location.label }}</span>
            <span v-if="location.address" class="mt-0.5 block text-[0.75rem] text-faint">
              {{ location.address }}
            </span>
          </button>
        </div>
        <div class="mt-4 flex flex-wrap gap-2">
          <UiButton
            type="button"
            variant="primary"
            size="lg"
            arrow
            :disabled="!canContinueGoogle"
            @click="continueWithGoogle"
          >
            Continue with this location
          </UiButton>
          <UiButton type="button" variant="ghost" size="sm" @click="emit('refreshLocations')">
            Refresh
          </UiButton>
        </div>
      </template>

      <div v-else class="mt-3">
        <p class="text-sm text-soft">
          No locations found yet. Enter a name or website below, or refresh after Google finishes syncing.
        </p>
        <UiButton type="button" size="sm" class="mt-3" @click="emit('refreshLocations')">Refresh</UiButton>
      </div>
    </div>

    <div class="flex items-center gap-3 py-1">
      <span class="h-px flex-1 bg-line" />
      <span class="text-[0.75rem] text-faint">or enter details manually</span>
      <span class="h-px flex-1 bg-line" />
    </div>

    <div
      class="rounded-xl border bg-raised p-5 transition-colors"
      :class="connectMode === 'manual' ? 'border-brand ring-2 ring-brand/30' : 'border-line'"
    >
      <form class="flex flex-col gap-4" @submit.prevent="submitManual">
        <UiField
          v-slot="{ id, describedBy }"
          label="Business website"
          help="The richest source. We read pages, structured data and social links."
        >
          <UiInput
            :id="id"
            v-model="website"
            :described-by="describedBy"
            placeholder="vandijkloodgieters.nl"
            @focus="chooseManual"
          />
        </UiField>

        <div class="grid gap-4 sm:grid-cols-2">
          <UiField v-slot="{ id }" label="Business name">
            <UiInput :id="id" v-model="businessName" placeholder="Van Dijk Loodgieters" @focus="chooseManual" />
          </UiField>
          <UiField v-slot="{ id }" label="City">
            <UiInput :id="id" v-model="city" placeholder="Rotterdam" @focus="chooseManual" />
          </UiField>
        </div>

        <UiField v-slot="{ id }" label="Language">
          <UiSelect
            :id="id"
            v-model="locale"
            :options="[
              { label: 'Nederlands', value: 'nl' },
              { label: 'English', value: 'en' },
            ]"
          />
        </UiField>

        <UiButton type="submit" variant="primary" size="lg" class="self-start" arrow :disabled="!canManual">
          Continue
        </UiButton>
      </form>
    </div>
  </div>
</template>
