<script setup lang="ts">
import { computed } from 'vue'
import type { CommerceStatus, ShippingRate } from '@platform/schemas'

/**
 * Shipping (§76).
 *
 * Zones decide where you ship; rates and bands decide what it costs. Carrier
 * quotes, when enabled, are merged with your own rather than replacing them — a
 * merchant may offer pickup alongside live carrier prices.
 *
 * Flat rates live in `commerce_shipping_rates` and have their own endpoints, so
 * they are shown here read-only: duplicating their editor would give a merchant
 * two places to change one number.
 */
const props = defineProps<{ status: CommerceStatus | null; rates: ShippingRate[] }>()

const carriers = computed(() => (props.status?.shipping ?? []).map((provider) => provider.id))

function toggleCarrier(draft: Record<string, unknown>, carrier: string) {
  const current = (draft.enabledCarriers as string[] | undefined) ?? []
  draft.enabledCarriers = current.includes(carrier)
    ? current.filter((entry) => entry !== carrier)
    : [...current, carrier]
}

function hasCarrier(draft: Record<string, unknown>, carrier: string): boolean {
  return ((draft.enabledCarriers as string[] | undefined) ?? []).includes(carrier)
}

function parseCountries(value: string): string[] {
  return value
    .split(',')
    .map((entry) => entry.trim().toUpperCase())
    .filter((entry) => entry.length === 2)
}
</script>

<template>
  <SettingsSection
    scope="commerce"
    section-key="shipping"
    title="Shipping"
    description="Zones decide where you ship; rates and weight bands decide what it costs. Carrier quotes are merged with your own rather than replacing them."
  >
    <template #default="{ draft }">
      <div class="grid gap-4 sm:grid-cols-2">
        <UiField label="Default parcel weight" help="Grams. Used when a product carries no weight of its own.">
          <template #default="{ id }">
            <UiInput
              :id="id"
              :model-value="String((draft as any).defaultWeightGrams ?? 500)"
              type="number"
              @update:model-value="(value: string) => ((draft as any).defaultWeightGrams = Number(value) || 0)"
            />
          </template>
        </UiField>

        <UiField label="Free shipping above" help="Cents, in the store's base currency. Empty disables it.">
          <template #default="{ id }">
            <UiInput
              :id="id"
              :model-value="String(((draft as any).freeShippingThreshold?.amount ?? '') || '')"
              type="number"
              placeholder="7500"
              @update:model-value="
                (value: string) =>
                  ((draft as any).freeShippingThreshold = value
                    ? { amount: Number(value), currency: (draft as any).freeShippingThreshold?.currency ?? 'EUR' }
                    : null)
              "
            />
          </template>
        </UiField>
      </div>

      <!-- Zones ---------------------------------------------------------- -->
      <div class="mt-6 border-t border-line pt-5">
        <div class="mb-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="type-caption text-soft">Zones</p>
            <p class="type-caption-12 mt-0.5 text-faint">
              Comma-separated ISO country codes. Empty means "the rest of the world".
            </p>
          </div>
          <UiButton
            size="sm"
            @click="
              (draft as any).zones = [
                ...((draft as any).zones ?? []),
                {
                  id: `zone_${Date.now().toString(36)}`,
                  name: 'Benelux',
                  countries: ['NL', 'BE', 'LU'],
                  enabled: true,
                },
              ]
            "
          >
            Add zone
          </UiButton>
        </div>

        <ul v-if="((draft as any).zones ?? []).length" class="flex flex-col gap-2">
          <li
            v-for="(zone, index) in ((draft as any).zones ?? []) as any[]"
            :key="zone.id"
            class="grid items-center gap-2 rounded-lg border border-line p-3 sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)_auto_auto]"
          >
            <UiInput v-model="zone.name" placeholder="Zone name" />
            <UiInput
              :model-value="(zone.countries ?? []).join(', ')"
              placeholder="NL, BE, DE"
              @update:model-value="(value: string) => (zone.countries = parseCountries(value))"
            />
            <UiSwitch v-model="zone.enabled" :label="`Enable ${zone.name}`" />
            <UiButton
              size="sm"
              variant="ghost"
              @click="(draft as any).zones = ((draft as any).zones as any[]).filter((_, i) => i !== index)"
            >
              Remove
            </UiButton>
          </li>
        </ul>
        <p v-else class="type-caption-12 text-faint">
          No zones yet — the store ships wherever your rates allow.
        </p>
      </div>

      <!-- Weight bands ---------------------------------------------------- -->
      <div class="mt-6 border-t border-line pt-5">
        <div class="mb-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="type-caption text-soft">Weight bands</p>
            <p class="type-caption-12 mt-0.5 text-faint">
              Grams from and to, then the price in cents. Leave "to" empty for the top band.
            </p>
          </div>
          <UiButton
            size="sm"
            @click="
              (draft as any).weightBands = [
                ...((draft as any).weightBands ?? []),
                { fromGrams: 0, toGrams: 1000, price: { amount: 495, currency: 'EUR' } },
              ]
            "
          >
            Add band
          </UiButton>
        </div>

        <ul class="flex flex-col gap-2">
          <li
            v-for="(band, index) in ((draft as any).weightBands ?? []) as any[]"
            :key="index"
            class="grid gap-2 rounded-lg border border-line p-3 sm:grid-cols-[6rem_6rem_minmax(0,1fr)_auto]"
          >
            <UiInput
              :model-value="String(band.fromGrams ?? 0)"
              type="number"
              @update:model-value="(value: string) => (band.fromGrams = Number(value) || 0)"
            />
            <UiInput
              :model-value="band.toGrams === null ? '' : String(band.toGrams)"
              type="number"
              placeholder="and up"
              @update:model-value="(value: string) => (band.toGrams = value === '' ? null : Number(value))"
            />
            <UiInput
              :model-value="String(band.price?.amount ?? 0)"
              type="number"
              @update:model-value="
                (value: string) =>
                  (band.price = { amount: Number(value) || 0, currency: band.price?.currency ?? 'EUR' })
              "
            />
            <UiButton
              size="sm"
              variant="ghost"
              @click="(draft as any).weightBands = ((draft as any).weightBands as any[]).filter((_, i) => i !== index)"
            >
              Remove
            </UiButton>
          </li>
        </ul>
      </div>

      <!-- Pickup ---------------------------------------------------------- -->
      <div class="mt-6 border-t border-line pt-5">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="type-button-12 text-ink">Offer pickup</p>
            <p class="type-caption-12 mt-0.5 text-soft">Collection at one of your own locations, free of charge.</p>
          </div>
          <UiSwitch
            :model-value="Boolean((draft as any).pickupEnabled)"
            label="Offer pickup"
            @update:model-value="(value: boolean) => ((draft as any).pickupEnabled = value)"
          />
        </div>

        <template v-if="(draft as any).pickupEnabled">
          <div class="mb-2 mt-4 flex items-center justify-between gap-3">
            <p class="type-caption text-soft">Pickup locations</p>
            <UiButton
              size="sm"
              @click="
                (draft as any).pickupLocations = [
                  ...((draft as any).pickupLocations ?? []),
                  {
                    id: `pickup_${Date.now().toString(36)}`,
                    name: 'Shop',
                    address: '',
                    instructions: '',
                    enabled: true,
                  },
                ]
              "
            >
              Add location
            </UiButton>
          </div>

          <ul class="flex flex-col gap-2">
            <li
              v-for="(location, index) in ((draft as any).pickupLocations ?? []) as any[]"
              :key="location.id"
              class="grid items-center gap-2 rounded-lg border border-line p-3 sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)_auto_auto]"
            >
              <UiInput v-model="location.name" placeholder="Shop" />
              <UiInput v-model="location.address" placeholder="Kalverstraat 1, Amsterdam" />
              <UiSwitch v-model="location.enabled" :label="`Enable ${location.name}`" />
              <UiButton
                size="sm"
                variant="ghost"
                @click="
                  (draft as any).pickupLocations = ((draft as any).pickupLocations as any[]).filter(
                    (_, i) => i !== index,
                  )
                "
              >
                Remove
              </UiButton>
            </li>
          </ul>
        </template>
      </div>

      <!-- Carriers -------------------------------------------------------- -->
      <div v-if="carriers.length" class="mt-6 border-t border-line pt-5">
        <p class="type-caption mb-2 text-soft">Live carrier rates</p>
        <div class="flex flex-wrap gap-1">
          <button
            v-for="carrier in carriers"
            :key="carrier"
            type="button"
            class="type-button-10 rounded-full border px-2.5 py-1 transition-colors"
            :class="
              hasCarrier(draft as any, carrier)
                ? 'border-brand bg-brand-soft text-brand'
                : 'border-line text-soft hover:border-line-strong hover:text-ink'
            "
            @click="toggleCarrier(draft as any, carrier)"
          >
            {{ carrier }}
          </button>
        </div>
      </div>

      <!-- Flat rates (read-only mirror) ----------------------------------- -->
      <div class="mt-6 border-t border-line pt-5">
        <p class="type-caption mb-2 text-soft">Flat rates</p>
        <ul v-if="rates.length" class="flex flex-col divide-y divide-line rounded-lg border border-line">
          <li v-for="rate in rates" :key="rate.id" class="flex items-center justify-between gap-3 px-3 py-2.5">
            <div class="min-w-0">
              <p class="type-button-12 truncate text-ink">{{ rate.name }}</p>
              <p class="type-caption-12 text-faint">
                {{ rate.countries.length ? rate.countries.join(', ') : 'Everywhere' }}
              </p>
            </div>
            <span class="type-button-12 tabular-nums text-ink">{{ formatMoney(rate.price) }}</span>
          </li>
        </ul>
        <p v-else class="type-caption-12 text-faint">
          No flat rates yet. They are managed under Commerce → shipping rates.
        </p>
      </div>
    </template>
  </SettingsSection>
</template>
