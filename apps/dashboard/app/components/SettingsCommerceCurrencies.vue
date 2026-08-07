<script setup lang="ts">
/**
 * Currencies. Plan-gated at Scale — the base currency is free, the additional
 * ones are not. `SettingsSection` renders the badge and disables the save; the
 * API is what actually refuses the write.
 */
const CURRENCIES = ['EUR', 'GBP', 'USD', 'CHF', 'SEK', 'DKK', 'PLN', 'NOK'].map((code) => ({
  label: code,
  value: code,
}))

const ROUNDING = [
  { label: 'No rounding', value: 'none' },
  { label: 'Nearest 5 cents', value: 'nearest_5' },
  { label: 'Nearest 10 cents', value: 'nearest_10' },
  { label: 'Nearest 50 cents', value: 'nearest_50' },
  { label: 'Charm pricing (x.99)', value: 'charm_99' },
]
</script>

<template>
  <SettingsSection
    scope="commerce"
    section-key="currencies"
    title="Currencies"
    description="The base currency every price is stored in, plus the currencies you also display."
  >
    <template #default="{ draft, writable }">
      <UiField label="Base currency" help="Changing this does not convert existing prices.">
        <template #default="{ id }">
          <UiSelect :id="id" v-model="(draft as any).baseCurrency" :options="CURRENCIES" />
        </template>
      </UiField>

      <div class="mt-5 border-t border-line pt-4">
        <div class="mb-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="type-caption text-soft">Additional currencies</p>
            <p class="type-caption-12 mt-0.5 max-w-lg text-faint">
              Rates are stored as integers in ten-thousandths — 1.0850 is 10850 — so a conversion never
              introduces a float.
            </p>
          </div>
          <UiButton
            size="sm"
            :disabled="!writable"
            @click="
              (draft as any).additional = [
                ...((draft as any).additional ?? []),
                { currency: 'GBP', rateTenThousandths: 10000, rounding: 'none', enabled: true },
              ]
            "
          >
            Add currency
          </UiButton>
        </div>

        <ul class="flex flex-col gap-2">
          <li
            v-for="(entry, index) in ((draft as any).additional ?? []) as any[]"
            :key="index"
            class="grid gap-2 rounded-lg border border-line p-3 sm:grid-cols-[6rem_7rem_minmax(0,1fr)_auto]"
          >
            <UiSelect v-model="entry.currency" :options="CURRENCIES" />
            <UiInput
              :model-value="(entry.rateTenThousandths / 10000).toFixed(4)"
              type="number"
              @update:model-value="
                (value: string) => (entry.rateTenThousandths = Math.max(1, Math.round(Number(value) * 10000)))
              "
            />
            <UiSelect v-model="entry.rounding" :options="ROUNDING" />
            <UiButton
              size="sm"
              variant="ghost"
              @click="(draft as any).additional = ((draft as any).additional as any[]).filter((_, i) => i !== index)"
            >
              Remove
            </UiButton>
          </li>
        </ul>

        <div class="mt-4 flex items-start justify-between gap-4">
          <div>
            <p class="type-button-12 text-ink">Pick automatically by locale</p>
            <p class="type-caption-12 mt-0.5 text-soft">
              Shows a shopper the enabled currency matching their locale, where there is one.
            </p>
          </div>
          <UiSwitch
            :model-value="Boolean((draft as any).autoSelectByLocale)"
            label="Pick automatically by locale"
            @update:model-value="(value: boolean) => ((draft as any).autoSelectByLocale = value)"
          />
        </div>
      </div>
    </template>
  </SettingsSection>
</template>
