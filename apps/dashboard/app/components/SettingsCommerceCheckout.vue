<script setup lang="ts">
/**
 * Checkout.
 *
 * Every extra required field costs conversions, so required and optional are
 * separate lists rather than one list with a flag — the cost of asking is the
 * thing the merchant should be looking at.
 */
const CHECKOUT_FIELDS = ['email', 'phone', 'company', 'vatNumber', 'note', 'birthDate']

function toggleField(draft: Record<string, unknown>, list: 'requiredFields' | 'optionalFields', field: string) {
  const current = (draft[list] as string[] | undefined) ?? []
  draft[list] = current.includes(field) ? current.filter((entry) => entry !== field) : [...current, field]
}

function has(draft: Record<string, unknown>, list: string, field: string): boolean {
  return ((draft[list] as string[] | undefined) ?? []).includes(field)
}
</script>

<template>
  <SettingsSection
    scope="commerce"
    section-key="checkout"
    title="Checkout"
    description="Ask for what you need to fulfil the order, and no more. Every extra required field costs conversions."
  >
    <template #default="{ draft }">
      <div class="flex flex-col gap-3">
        <label class="flex items-start justify-between gap-4">
          <span class="min-w-0">
            <span class="type-button-12 block text-ink">Guest checkout</span>
            <span class="type-caption-12 block text-soft">Buying without creating an account.</span>
          </span>
          <UiSwitch
            :model-value="(draft as any).guestCheckout !== false"
            label="Guest checkout"
            @update:model-value="(value: boolean) => ((draft as any).guestCheckout = value)"
          />
        </label>

        <label class="flex items-start justify-between gap-4">
          <span class="min-w-0">
            <span class="type-button-12 block text-ink">Require terms acceptance</span>
            <span class="type-caption-12 block text-soft">A tick box before the order can be placed.</span>
          </span>
          <UiSwitch
            :model-value="(draft as any).requireTermsAcceptance !== false"
            label="Require terms acceptance"
            @update:model-value="(value: boolean) => ((draft as any).requireTermsAcceptance = value)"
          />
        </label>

        <label class="flex items-start justify-between gap-4">
          <span class="min-w-0">
            <span class="type-button-12 block text-ink">Marketing opt-in ticked by default</span>
            <span class="type-caption-12 block text-soft">
              Off is the lawful default in the EU. Turn this on only where you know it is allowed.
            </span>
          </span>
          <UiSwitch
            :model-value="Boolean((draft as any).marketingOptInDefault)"
            label="Marketing opt-in default"
            @update:model-value="(value: boolean) => ((draft as any).marketingOptInDefault = value)"
          />
        </label>
      </div>

      <div class="mt-5 grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
        <div>
          <p class="type-caption mb-2 text-soft">Required fields</p>
          <div class="flex flex-wrap gap-1">
            <button
              v-for="field in CHECKOUT_FIELDS"
              :key="field"
              type="button"
              class="type-button-10 rounded-full border px-2.5 py-1 transition-colors"
              :class="
                has(draft as any, 'requiredFields', field)
                  ? 'border-brand bg-brand-soft text-brand'
                  : 'border-line text-soft hover:border-line-strong hover:text-ink'
              "
              @click="toggleField(draft as any, 'requiredFields', field)"
            >
              {{ field }}
            </button>
          </div>
        </div>

        <div>
          <p class="type-caption mb-2 text-soft">Shown but optional</p>
          <div class="flex flex-wrap gap-1">
            <button
              v-for="field in CHECKOUT_FIELDS"
              :key="field"
              type="button"
              class="type-button-10 rounded-full border px-2.5 py-1 transition-colors"
              :class="
                has(draft as any, 'optionalFields', field)
                  ? 'border-line-strong bg-sunken text-ink'
                  : 'border-line text-soft hover:border-line-strong hover:text-ink'
              "
              @click="toggleField(draft as any, 'optionalFields', field)"
            >
              {{ field }}
            </button>
          </div>
        </div>
      </div>

      <div class="mt-5 grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
        <UiField label="Terms URL">
          <template #default="{ id }">
            <UiInput :id="id" v-model="(draft as any).termsUrl" placeholder="/algemene-voorwaarden" />
          </template>
        </UiField>

        <UiField label="Privacy URL">
          <template #default="{ id }">
            <UiInput :id="id" v-model="(draft as any).privacyUrl" placeholder="/privacy" />
          </template>
        </UiField>

        <UiField
          label="Abandoned cart window"
          help="Minutes of inactivity before a cart counts as abandoned. 0 disables it."
        >
          <template #default="{ id }">
            <UiInput
              :id="id"
              :model-value="String((draft as any).abandonedCartMinutes ?? 60)"
              type="number"
              @update:model-value="(value: string) => ((draft as any).abandonedCartMinutes = Number(value) || 0)"
            />
          </template>
        </UiField>

        <UiField label="Order number format" help="# is the sequence number. {YYYY} and {MM} are the date.">
          <template #default="{ id }">
            <UiInput :id="id" v-model="(draft as any).orderNumberFormat" placeholder="ORD-{YYYY}-####" />
          </template>
        </UiField>
      </div>
    </template>
  </SettingsSection>
</template>
