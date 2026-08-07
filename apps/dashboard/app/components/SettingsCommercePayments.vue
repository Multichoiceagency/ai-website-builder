<script setup lang="ts">
import { computed } from 'vue'
import type { CommerceStatus } from '@platform/schemas'

/**
 * Payments (§75).
 *
 * Credentials are not part of the settings document — they go through
 * `SettingsSecretField`, which the API stores encrypted and describes back with
 * a masked hint. There is no code path on this screen that can display one.
 */
const props = defineProps<{ status: CommerceStatus | null }>()

const PAYMENT_METHODS = ['card', 'ideal', 'bancontact', 'paypal', 'sepa', 'klarna', 'manual']

const providerOptions = computed(() =>
  (props.status?.payments ?? []).map((provider) => ({
    label: provider.configured ? provider.id : `${provider.id} — needs credentials`,
    value: provider.id,
  })),
)

function toggleMethod(draft: Record<string, unknown>, method: string) {
  const current = (draft.methods as string[] | undefined) ?? []
  draft.methods = current.includes(method)
    ? current.filter((entry) => entry !== method)
    : [...current, method]
}

function hasMethod(draft: Record<string, unknown>, method: string): boolean {
  return ((draft.methods as string[] | undefined) ?? []).includes(method)
}
</script>

<template>
  <SettingsSection
    scope="commerce"
    section-key="payments"
    title="Payments"
    description="Which provider takes the money. Manual payment — bank transfer, cash on collection — always works, so a store can take orders before any gateway account exists."
  >
    <template #default="{ draft, secrets, refresh }">
      <div class="grid gap-4 sm:grid-cols-2">
        <UiField label="Provider" help="The credentials below belong to the selected provider.">
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
            class="type-button-10 rounded-full border px-2.5 py-1 capitalize transition-colors"
            :class="
              hasMethod(draft as any, method)
                ? 'border-brand bg-brand-soft text-brand'
                : 'border-line text-soft hover:border-line-strong hover:text-ink'
            "
            @click="toggleMethod(draft as any, method)"
          >
            {{ method }}
          </button>
        </div>
      </div>

      <div class="mt-6 flex flex-col gap-4 border-t border-line pt-5">
        <div>
          <p class="type-caption text-soft">Credentials</p>
          <p class="type-caption-12 mt-0.5 max-w-xl text-faint">
            Stored encrypted. Once saved, a credential is only ever shown as its last four characters — there
            is no endpoint that returns it.
          </p>
        </div>

        <SettingsSecretField
          scope="commerce"
          section-key="payments"
          field="apiKey"
          label="Secret API key"
          :state="secrets.find((entry) => entry.field === 'apiKey') ?? null"
          @changed="refresh()"
        />
        <SettingsSecretField
          scope="commerce"
          section-key="payments"
          field="publishableKey"
          label="Publishable key"
          help="Safe for the storefront. Stored the same way regardless."
          :state="secrets.find((entry) => entry.field === 'publishableKey') ?? null"
          @changed="refresh()"
        />
        <SettingsSecretField
          scope="commerce"
          section-key="payments"
          field="webhookSecret"
          label="Webhook signing secret"
          help="Used to verify callbacks from the provider."
          :state="secrets.find((entry) => entry.field === 'webhookSecret') ?? null"
          @changed="refresh()"
        />
      </div>
    </template>
  </SettingsSection>
</template>
