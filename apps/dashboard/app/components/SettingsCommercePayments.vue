<script setup lang="ts">
import { computed, nextTick } from 'vue'
import type { CommerceStatus } from '@platform/schemas'

/**
 * Payments (§75).
 *
 * Credentials are not part of the settings document — they go through
 * `SettingsSecretField`, which the API stores encrypted and describes back with
 * a masked hint. There is no code path on this screen that can display one.
 */
const props = defineProps<{ status: CommerceStatus | null }>()
const emit = defineEmits<{ statusChanged: [] }>()

const METHOD_LABELS: Record<string, string> = {
  card: 'Card',
  ideal: 'iDEAL',
  bancontact: 'Bancontact',
  paypal: 'PayPal',
  sepa: 'SEPA Debit',
  klarna: 'Klarna',
  apple_pay: 'Apple Pay',
  google_pay: 'Google Pay',
  manual: 'Manual / bank transfer',
}

const PAYMENT_METHODS = [
  'card',
  'ideal',
  'bancontact',
  'paypal',
  'sepa',
  'klarna',
  'apple_pay',
  'google_pay',
  'manual',
]

const PROVIDER_COPY: Record<
  string,
  {
    label: string
    blurb: string
    docsUrl?: string
    installSteps?: string[]
    keyLocation?: string
  }
> = {
  mollie: {
    label: 'Mollie',
    blurb: 'Best for NL/EU — iDEAL, Bancontact, Klarna, cards in one account.',
    docsUrl: 'https://docs.mollie.com/',
    keyLocation: 'Mollie Web app → Developers → API access tokens (test_… or live_…)',
    installSteps: [
      'Choose Mollie as the active provider below.',
      'Paste a Test API key under Credentials (switch to Live later).',
      'Save — status updates to Ready when the key is stored.',
    ],
  },
  stripe: {
    label: 'Stripe',
    blurb: 'Global cards, Apple Pay, Google Pay, and strong subscription tooling.',
    docsUrl: 'https://docs.stripe.com/',
    keyLocation: 'Stripe Dashboard → Developers → API keys (sk_test_… / pk_test_…)',
    installSteps: [
      'Choose Stripe as the active provider below.',
      'Paste the Secret key (and Publishable key for the storefront).',
      'Save — keys stay encrypted; status shows Ready after save.',
    ],
  },
  paypal: {
    label: 'PayPal',
    blurb: 'Wallet checkout shoppers already trust. Needs client credentials.',
    docsUrl: 'https://developer.paypal.com/',
    keyLocation: 'PayPal Developer Dashboard → Apps & Credentials',
    installSteps: [
      'Choose PayPal as the active provider below.',
      'Paste Client ID (publishable) and Secret (API key) under Credentials.',
      'Save — then finish adapter wiring before live checkout.',
    ],
  },
  manual: {
    label: 'Manual',
    blurb: 'Bank transfer or cash on collection — always available without a gateway.',
  },
}

const providerOptions = computed(() =>
  (props.status?.payments ?? []).map((provider) => ({
    label: `${PROVIDER_COPY[provider.id]?.label ?? provider.id}${provider.configured ? '' : ' — needs credentials'}`,
    value: provider.id,
  })),
)

const needsSetup = computed(() =>
  (props.status?.payments ?? []).filter(
    (provider) => !provider.configured && ['mollie', 'stripe', 'paypal'].includes(provider.id),
  ),
)

const allGatewaysNeedSetup = computed(() => {
  const gateways = (props.status?.payments ?? []).filter((p) => p.id !== 'manual')
  return gateways.length > 0 && needsSetup.value.length === gateways.length
})

function toggleMethod(draft: Record<string, unknown>, method: string) {
  const current = (draft.methods as string[] | undefined) ?? []
  draft.methods = current.includes(method)
    ? current.filter((entry) => entry !== method)
    : [...current, method]
}

function hasMethod(draft: Record<string, unknown>, method: string): boolean {
  return ((draft.methods as string[] | undefined) ?? []).includes(method)
}

function providerMeta(id: string) {
  return PROVIDER_COPY[id] ?? { label: id, blurb: 'Payment provider' }
}

async function scrollToCredentials() {
  await nextTick()
  document.getElementById('credentials')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function onSecretChanged(refreshSettings: () => void) {
  refreshSettings()
  emit('statusChanged')
}
</script>

<template>
  <div class="flex flex-col gap-5">
    <UiEmptyState
      v-if="allGatewaysNeedSetup"
      title="No payment gateway yet"
      description="Add Mollie or Stripe credentials below. Manual / bank transfer still works so you can take orders today."
    >
      <UiButton variant="primary" @click="scrollToCredentials">Start installation</UiButton>
      <UiButton to="/settings/integrations">Integrations</UiButton>
    </UiEmptyState>

    <ul class="grid gap-3 sm:grid-cols-2">
      <li
        v-for="provider in status?.payments ?? []"
        :key="provider.id"
        class="rounded-2xl border border-line bg-raised p-4 shadow-sm"
      >
        <div class="flex items-start justify-between gap-2">
          <div>
            <p class="text-[0.9375rem] font-semibold text-ink">{{ providerMeta(provider.id).label }}</p>
            <p class="mt-1 text-[0.75rem] leading-relaxed text-soft">{{ providerMeta(provider.id).blurb }}</p>
          </div>
          <UiBadge :tone="provider.configured ? 'positive' : 'warning'">
            {{ provider.configured ? 'Ready' : 'Setup needed' }}
          </UiBadge>
        </div>

        <template v-if="!provider.configured && provider.id !== 'manual'">
          <p class="mt-2 text-[0.8125rem] text-warning">
            {{ provider.reason ?? `${providerMeta(provider.id).label} needs setup — add credentials below.` }}
          </p>
          <ol
            v-if="providerMeta(provider.id).installSteps?.length"
            class="mt-2 list-decimal space-y-1 pl-4 text-[0.6875rem] leading-relaxed text-soft"
          >
            <li v-for="step in providerMeta(provider.id).installSteps" :key="step">{{ step }}</li>
          </ol>
          <p
            v-if="providerMeta(provider.id).keyLocation"
            class="mt-2 text-[0.6875rem] text-faint"
          >
            Keys: {{ providerMeta(provider.id).keyLocation }}
          </p>
          <div class="mt-3 flex flex-wrap items-center gap-2">
            <UiButton size="sm" variant="primary" @click="scrollToCredentials">
              Install {{ providerMeta(provider.id).label }}
            </UiButton>
            <a
              v-if="providerMeta(provider.id).docsUrl"
              :href="providerMeta(provider.id).docsUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex h-8 items-center rounded-md border border-line-strong bg-raised px-3 text-[0.8125rem] font-semibold text-ink no-underline hover:bg-sunken"
            >
              {{ providerMeta(provider.id).label }} docs
            </a>
          </div>
        </template>

        <p v-else-if="provider.capabilities?.length" class="mt-2 text-[0.6875rem] text-faint">
          {{ provider.capabilities.join(' · ') }}
        </p>
      </li>
    </ul>

    <SettingsSection
      scope="commerce"
      section-key="payments"
      title="Active checkout"
      description="Select the gateway, paste its keys under Credentials, then save. Manual payment always works without a gateway account."
      @saved="emit('statusChanged')"
    >
      <template #default="{ draft, secrets, refresh }">
        <div class="grid gap-4 sm:grid-cols-2">
          <UiField label="Provider" help="Credentials below apply to the selected provider.">
            <template #default="{ id }">
              <UiSelect :id="id" v-model="(draft as any).providerId" :options="providerOptions" />
            </template>
          </UiField>

          <UiField label="Mode" help="Test mode never moves real money.">
            <template #default="{ id }">
              <UiSelect
                :id="id"
                v-model="(draft as any).mode"
                :options="[
                  { label: 'Test', value: 'test' },
                  { label: 'Live', value: 'live' },
                ]"
              />
            </template>
          </UiField>

          <UiField label="Statement descriptor" help="What the shopper sees on their bank statement. 22 characters.">
            <template #default="{ id }">
              <UiInput :id="id" v-model="(draft as any).statementDescriptor" placeholder="ACME STORE" />
            </template>
          </UiField>

          <UiField label="Capture" help="Manual capture authorises now and takes the money when you fulfil.">
            <template #default="{ id }">
              <UiSelect
                :id="id"
                v-model="(draft as any).captureMode"
                :options="[
                  { label: 'Automatic', value: 'automatic' },
                  { label: 'Manual', value: 'manual' },
                ]"
              />
            </template>
          </UiField>
        </div>

        <div class="mt-5 border-t border-line pt-4">
          <p class="type-caption mb-2 text-soft">Accepted methods</p>
          <div class="flex flex-wrap gap-1">
            <button
              v-for="method in PAYMENT_METHODS"
              :key="method"
              type="button"
              class="type-button-10 rounded-full border px-2.5 py-1 transition-colors"
              :class="
                hasMethod(draft as any, method)
                  ? 'border-brand bg-brand-soft text-brand'
                  : 'border-line text-soft hover:border-line-strong hover:text-ink'
              "
              @click="toggleMethod(draft as any, method)"
            >
              {{ METHOD_LABELS[method] ?? method }}
            </button>
          </div>
        </div>

        <div id="credentials" class="mt-6 scroll-mt-24 flex flex-col gap-4 border-t border-line pt-5">
          <div>
            <p class="type-caption text-soft">Credentials</p>
            <p class="type-caption-12 mt-0.5 max-w-xl text-faint">
              1) Pick the provider above · 2) Paste keys here · 3) Save the section.
              Stored encrypted — only the last four characters are shown afterward.
              <a
                href="https://docs.mollie.com/"
                target="_blank"
                rel="noopener noreferrer"
                class="text-soft underline hover:text-ink"
              >Mollie</a>
              or
              <a
                href="https://dashboard.stripe.com/apikeys"
                target="_blank"
                rel="noopener noreferrer"
                class="text-soft underline hover:text-ink"
              >Stripe</a>
              dashboards issue the keys.
            </p>
          </div>

          <SettingsSecretField
            scope="commerce"
            section-key="payments"
            field="apiKey"
            label="Secret API key / Mollie API key"
            :state="secrets.find((entry) => entry.field === 'apiKey') ?? null"
            @changed="onSecretChanged(refresh)"
          />
          <SettingsSecretField
            scope="commerce"
            section-key="payments"
            field="publishableKey"
            label="Publishable key / PayPal client id"
            help="Safe for the storefront. Stored the same way regardless."
            :state="secrets.find((entry) => entry.field === 'publishableKey') ?? null"
            @changed="onSecretChanged(refresh)"
          />
          <SettingsSecretField
            scope="commerce"
            section-key="payments"
            field="webhookSecret"
            label="Webhook signing secret"
            help="Used to verify callbacks from the provider."
            :state="secrets.find((entry) => entry.field === 'webhookSecret') ?? null"
            @changed="onSecretChanged(refresh)"
          />
        </div>
      </template>
    </SettingsSection>
  </div>
</template>
