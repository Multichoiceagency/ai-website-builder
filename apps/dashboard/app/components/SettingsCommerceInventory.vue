<script setup lang="ts">
/**
 * Inventory.
 *
 * Overselling is off by default and stated as a deliberate default, because the
 * failure it causes — selling something you cannot ship — is invisible until a
 * customer is already waiting.
 */
</script>

<template>
  <SettingsSection
    scope="commerce"
    section-key="inventory"
    title="Inventory"
    description="Whether stock is a number you track or a thing you keep in your head."
  >
    <template #default="{ draft }">
      <div class="flex flex-col gap-3">
        <label class="flex items-start justify-between gap-4">
          <span class="min-w-0">
            <span class="type-button-12 block text-ink">Track stock</span>
            <span class="type-caption-12 block text-soft">Off means every product is always available.</span>
          </span>
          <UiSwitch
            :model-value="(draft as any).trackInventory !== false"
            label="Track stock"
            @update:model-value="(value: boolean) => ((draft as any).trackInventory = value)"
          />
        </label>

        <label class="flex items-start justify-between gap-4">
          <span class="min-w-0">
            <span class="type-button-12 block text-ink">Allow overselling</span>
            <span class="type-caption-12 block text-soft">
              Lets an out-of-stock variant still be bought. Off by default, deliberately.
            </span>
          </span>
          <UiSwitch
            :model-value="Boolean((draft as any).allowOverselling)"
            label="Allow overselling"
            @update:model-value="(value: boolean) => ((draft as any).allowOverselling = value)"
          />
        </label>

        <label class="flex items-start justify-between gap-4">
          <span class="min-w-0">
            <span class="type-button-12 block text-ink">Hide out-of-stock products</span>
            <span class="type-caption-12 block text-soft">
              Removes them from listings rather than showing them as unavailable.
            </span>
          </span>
          <UiSwitch
            :model-value="Boolean((draft as any).hideOutOfStockProducts)"
            label="Hide out-of-stock products"
            @update:model-value="(value: boolean) => ((draft as any).hideOutOfStockProducts = value)"
          />
        </label>
      </div>

      <div class="mt-5 grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
        <UiField label="Low stock threshold" help="Below this, a variant is flagged in the catalogue.">
          <template #default="{ id }">
            <UiInput
              :id="id"
              :model-value="String((draft as any).lowStockThreshold ?? 5)"
              type="number"
              @update:model-value="(value: string) => ((draft as any).lowStockThreshold = Number(value) || 0)"
            />
          </template>
        </UiField>

        <UiField label="Reservation window" help="Minutes stock is held once a checkout starts. 0 disables it.">
          <template #default="{ id }">
            <UiInput
              :id="id"
              :model-value="String((draft as any).reservationMinutes ?? 30)"
              type="number"
              @update:model-value="(value: string) => ((draft as any).reservationMinutes = Number(value) || 0)"
            />
          </template>
        </UiField>
      </div>
    </template>
  </SettingsSection>
</template>
