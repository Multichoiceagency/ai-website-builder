<script setup lang="ts">
/**
 * Onboarding (§39).
 *
 * These settings are read by the site builder through
 * `GET /api/v1/settings/onboarding` — this screen is the editor for a document
 * another module consumes, which is why the field names here are the contract
 * and not screen-local labels.
 */
const STEPS = [
  { key: 'business', label: 'Business details', detail: 'Name, industry, region and what the business sells.' },
  { key: 'brand', label: 'Brand', detail: 'Logo, colours and tone of voice.' },
  { key: 'template', label: 'Template choice', detail: 'Pick a starting layout.' },
  { key: 'style', label: 'Style direction', detail: 'Pick a visual direction for the generated site.' },
  { key: 'pages', label: 'Page selection', detail: 'Which pages the builder generates.' },
  { key: 'domain', label: 'Domain', detail: 'Connect a hostname during the build.' },
  { key: 'publish', label: 'Publish', detail: 'Review and go live.' },
] as const

const PERFORMANCE = [
  { label: 'A — fastest blocks only', value: 'A' },
  { label: 'B — fast, with light motion', value: 'B' },
  { label: 'C — richer visuals allowed', value: 'C' },
  { label: 'D — anything in the registry', value: 'D' },
]

const LANGUAGES = [
  { label: 'Nederlands (nl)', value: 'nl' },
  { label: 'English (en)', value: 'en' },
  { label: 'Deutsch (de)', value: 'de' },
  { label: 'Français (fr)', value: 'fr' },
]

function toggleStep(draft: Record<string, unknown>, key: string, enabled: boolean) {
  const order = STEPS.map((step) => step.key) as readonly string[]
  const current = new Set((draft.steps as string[] | undefined) ?? order)

  if (enabled) current.add(key)
  else current.delete(key)

  // Kept in canonical order, so a re-enabled step returns to its place in the
  // flow instead of to the end of it.
  draft.steps = order.filter((step) => current.has(step))
}
</script>

<template>
  <SettingsSection
    section-key="onboarding"
    title="Builder flow"
    description="Which steps run when someone builds a site in this workspace, and what the builder assumes when they do not choose."
  >
    <template #default="{ draft }">
      <ul class="flex flex-col divide-y divide-line">
        <li
          v-for="step in STEPS"
          :key="step.key"
          class="flex items-start justify-between gap-4 py-3 first:pt-0"
        >
          <div class="min-w-0">
            <p class="type-button-12 text-ink">{{ step.label }}</p>
            <p class="type-caption-12 mt-0.5 text-soft">{{ step.detail }}</p>
          </div>
          <UiSwitch
            :model-value="((draft as any).steps ?? []).includes(step.key)"
            :label="step.label"
            @update:model-value="(value: boolean) => toggleStep(draft as any, step.key, value)"
          />
        </li>
      </ul>

      <div class="mt-6 grid gap-4 border-t border-line pt-5 sm:grid-cols-2">
        <UiField label="Default language" help="The language generated copy is written in.">
          <template #default="{ id }">
            <UiSelect :id="id" v-model="(draft as any).defaultLanguage" :options="LANGUAGES" />
          </template>
        </UiField>

        <UiField
          label="Performance ceiling"
          help="The heaviest block class the builder may reach for. Lower is faster."
        >
          <template #default="{ id }">
            <UiSelect :id="id" v-model="(draft as any).maxPerformanceClass" :options="PERFORMANCE" />
          </template>
        </UiField>

        <UiField label="Default template" help="Leave empty to let the user choose.">
          <template #default="{ id }">
            <UiInput :id="id" v-model="(draft as any).defaultTemplateId" placeholder="e.g. services-nl-01" />
          </template>
        </UiField>

        <UiField label="Default style" help="Leave empty to let the user choose.">
          <template #default="{ id }">
            <UiInput :id="id" v-model="(draft as any).defaultStyleId" placeholder="e.g. editorial-warm" />
          </template>
        </UiField>
      </div>

      <div class="mt-5 flex flex-col gap-3 border-t border-line pt-4">
        <label class="flex items-start justify-between gap-4">
          <span class="min-w-0">
            <span class="type-button-12 block text-ink">Let the user pick a template</span>
            <span class="type-caption-12 block text-soft">Off means the default above is always used.</span>
          </span>
          <UiSwitch
            :model-value="(draft as any).allowTemplateChoice !== false"
            label="Let the user pick a template"
            @update:model-value="(value: boolean) => ((draft as any).allowTemplateChoice = value)"
          />
        </label>

        <label class="flex items-start justify-between gap-4">
          <span class="min-w-0">
            <span class="type-button-12 block text-ink">Let the user pick a style</span>
            <span class="type-caption-12 block text-soft">Off means the default style is always used.</span>
          </span>
          <UiSwitch
            :model-value="(draft as any).allowStyleChoice !== false"
            label="Let the user pick a style"
            @update:model-value="(value: boolean) => ((draft as any).allowStyleChoice = value)"
          />
        </label>

        <label class="flex items-start justify-between gap-4">
          <span class="min-w-0">
            <span class="type-button-12 block text-ink">Publish immediately</span>
            <span class="type-caption-12 block text-soft">
              Off leaves the generated site in draft, which is the safer default for agencies.
            </span>
          </span>
          <UiSwitch
            :model-value="Boolean((draft as any).publishImmediately)"
            label="Publish immediately"
            @update:model-value="(value: boolean) => ((draft as any).publishImmediately = value)"
          />
        </label>

        <label class="flex items-start justify-between gap-4">
          <span class="min-w-0">
            <span class="type-button-12 block text-ink">Skip for returning users</span>
            <span class="type-caption-12 block text-soft">Send people who already built a site straight to the editor.</span>
          </span>
          <UiSwitch
            :model-value="(draft as any).skipForReturningUsers !== false"
            label="Skip for returning users"
            @update:model-value="(value: boolean) => ((draft as any).skipForReturningUsers = value)"
          />
        </label>
      </div>
    </template>
  </SettingsSection>
</template>
