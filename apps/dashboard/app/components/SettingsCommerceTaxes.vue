<script setup lang="ts">
/**
 * Taxes.
 *
 * Whether catalogue prices already contain tax changes every total in the
 * store, so it is the first thing on the screen rather than a checkbox at the
 * bottom. Rates are basis points — 21% is 2100 — so a rate never becomes a
 * float; the conversion to a percentage happens only for the input.
 */
function bpsToPercent(bps: number): string {
  return (bps / 100).toFixed(2)
}

function percentToBps(percent: string): number {
  return Math.round((Number(percent) || 0) * 100)
}
</script>

<template>
  <SettingsSection
    scope="commerce"
    section-key="taxes"
    title="Taxes"
    description="Set this before you have orders, not after — whether prices include tax changes every total in the store."
  >
    <template #default="{ draft }">
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="type-button-12 text-ink">Prices include tax</p>
          <p class="type-caption-12 mt-0.5 max-w-lg text-soft">
            On, a €121 product is €100 plus 21% VAT. Off, tax is added at checkout.
          </p>
        </div>
        <UiSwitch
          :model-value="(draft as any).pricesIncludeTax !== false"
          label="Prices include tax"
          @update:model-value="(value: boolean) => ((draft as any).pricesIncludeTax = value)"
        />
      </div>

      <div class="mt-5 grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
        <UiField label="Tax number" help="VAT or GST registration, printed on invoices.">
          <template #default="{ id }">
            <UiInput :id="id" v-model="(draft as any).taxNumber" placeholder="NL001234567B01" />
          </template>
        </UiField>

        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="type-button-12 text-ink">Tax on shipping</p>
            <p class="type-caption-12 mt-0.5 text-soft">Most EU jurisdictions require this.</p>
          </div>
          <UiSwitch
            :model-value="(draft as any).chargeTaxOnShipping !== false"
            label="Tax on shipping"
            @update:model-value="(value: boolean) => ((draft as any).chargeTaxOnShipping = value)"
          />
        </div>
      </div>

      <div class="mt-4 flex items-start justify-between gap-4">
        <div>
          <p class="type-button-12 text-ink">Reverse charge for valid EU VAT numbers</p>
          <p class="type-caption-12 mt-0.5 max-w-lg text-soft">
            Zero-rates B2B orders where the customer supplies a VAT number that validates.
          </p>
        </div>
        <UiSwitch
          :model-value="Boolean((draft as any).reverseChargeForValidVatNumbers)"
          label="Reverse charge"
          @update:model-value="(value: boolean) => ((draft as any).reverseChargeForValidVatNumbers = value)"
        />
      </div>

      <div class="mt-6 border-t border-line pt-5">
        <div class="mb-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="type-caption text-soft">Rates</p>
            <p class="type-caption-12 mt-0.5 text-faint">Name, country, region and percentage.</p>
          </div>
          <UiButton
            size="sm"
            @click="
              (draft as any).rates = [
                ...((draft as any).rates ?? []),
                {
                  id: `rate_${Date.now().toString(36)}`,
                  name: 'Standard',
                  country: 'NL',
                  region: '',
                  rateBps: 2100,
                  isDefault: !((draft as any).rates ?? []).length,
                },
              ]
            "
          >
            Add rate
          </UiButton>
        </div>

        <ul class="flex flex-col gap-2">
          <li
            v-for="(rate, index) in ((draft as any).rates ?? []) as any[]"
            :key="rate.id"
            class="grid gap-2 rounded-lg border border-line p-3 sm:grid-cols-[minmax(0,1fr)_5rem_5rem_6rem_auto]"
          >
            <UiInput v-model="rate.name" placeholder="Standard rate" />
            <UiInput v-model="rate.country" placeholder="NL" />
            <UiInput v-model="rate.region" placeholder="—" />
            <UiInput
              :model-value="bpsToPercent(rate.rateBps)"
              type="number"
              @update:model-value="(value: string) => (rate.rateBps = percentToBps(value))"
            />
            <UiButton
              size="sm"
              variant="ghost"
              @click="(draft as any).rates = ((draft as any).rates as any[]).filter((_, i) => i !== index)"
            >
              Remove
            </UiButton>
          </li>
        </ul>
        <p class="type-caption-12 mt-2 text-faint">
          Stored as basis points, so a rate never becomes a float.
        </p>
      </div>
    </template>
  </SettingsSection>
</template>
