<script setup lang="ts">
/**
 * Step 3 — Google Business Profile or manual URL / name (§80).
 */

const website = defineModel<string>('website', { default: '' })
const businessName = defineModel<string>('businessName', { default: '' })
const city = defineModel<string>('city', { default: '' })
const locale = defineModel<string>('locale', { default: 'nl' })
const connectMode = defineModel<'google' | 'manual' | null>('connectMode', { default: null })

const emit = defineEmits<{
  continue: []
  connectGoogle: []
}>()

const { busy: connectingGoogle, error: connectGoogleError } = useGoogleConnect()

const props = defineProps<{
  googleConnected?: boolean
  googleAvailable?: boolean
  googleReason?: string
  googleCallbackStatus?: string
}>()

const canManual = computed(() => Boolean(website.value.trim() || businessName.value.trim()))

function chooseGoogle() {
  connectMode.value = 'google'
  if (props.googleConnected) {
    emit('continue')
    return
  }
  emit('connectGoogle')
}

function chooseManual() {
  connectMode.value = 'manual'
}

function submitManual() {
  if (!canManual.value) return
  connectMode.value = 'manual'
  emit('continue')
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
              ? googleReason || 'Connected — we will list your Business Profile locations next.'
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
