<script setup lang="ts">
/**
 * Store e-mail: what a customer receives after they buy.
 *
 * Bodies are plain text with placeholders, never raw HTML — a merchant-editable
 * HTML body is an injection vector into every customer's inbox.
 */
const TEMPLATES = [
  { key: 'order_confirmation', label: 'Order confirmation' },
  { key: 'shipping_confirmation', label: 'Shipping confirmation' },
  { key: 'refund_confirmation', label: 'Refund confirmation' },
  { key: 'abandoned_cart', label: 'Abandoned cart reminder' },
]

interface Template {
  template: string
  enabled: boolean
  subject: string
  body: string
  bcc: string[]
}

function templateFor(draft: Record<string, unknown>, key: string): Template {
  const templates = (draft.templates as Template[] | undefined) ?? []
  return (
    templates.find((entry) => entry.template === key) ?? {
      template: key,
      enabled: true,
      subject: '',
      body: '',
      bcc: [],
    }
  )
}

function setTemplate(draft: Record<string, unknown>, key: string, patch: Partial<Template>) {
  const rest = ((draft.templates as Template[] | undefined) ?? []).filter((entry) => entry.template !== key)
  draft.templates = [...rest, { ...templateFor(draft, key), ...patch, template: key }]
}
</script>

<template>
  <SettingsSection
    scope="commerce"
    section-key="notifications"
    title="Store e-mail"
    description="What a customer receives after they buy. Double-brace placeholders such as order.number are filled in when the mail is sent."
  >
    <template #default="{ draft }">
      <div class="grid gap-4 sm:grid-cols-3">
        <UiField label="From name">
          <template #default="{ id }">
            <UiInput :id="id" v-model="(draft as any).fromName" placeholder="Acme Store" />
          </template>
        </UiField>

        <UiField label="From address">
          <template #default="{ id }">
            <UiInput :id="id" v-model="(draft as any).fromEmail" type="email" placeholder="orders@acme.nl" />
          </template>
        </UiField>

        <UiField label="Reply-to">
          <template #default="{ id }">
            <UiInput :id="id" v-model="(draft as any).replyTo" type="email" placeholder="support@acme.nl" />
          </template>
        </UiField>
      </div>

      <ul class="mt-5 flex flex-col gap-3 border-t border-line pt-4">
        <li v-for="template in TEMPLATES" :key="template.key" class="rounded-lg border border-line p-3">
          <div class="flex items-center justify-between gap-4">
            <p class="type-button-12 text-ink">{{ template.label }}</p>
            <UiSwitch
              :model-value="templateFor(draft as any, template.key).enabled !== false"
              :label="template.label"
              @update:model-value="(value: boolean) => setTemplate(draft as any, template.key, { enabled: value })"
            />
          </div>

          <div v-if="templateFor(draft as any, template.key).enabled !== false" class="mt-3 flex flex-col gap-2">
            <UiInput
              :model-value="templateFor(draft as any, template.key).subject"
              placeholder="Subject line"
              @update:model-value="(value: string) => setTemplate(draft as any, template.key, { subject: value })"
            />
            <UiTextarea
              :model-value="templateFor(draft as any, template.key).body"
              :rows="3"
              placeholder="Body text"
              @update:model-value="(value: string) => setTemplate(draft as any, template.key, { body: value })"
            />
            <UiInput
              :model-value="templateFor(draft as any, template.key).bcc.join(', ')"
              placeholder="Internal copies: fulfilment@acme.nl"
              @update:model-value="
                (value: string) =>
                  setTemplate(draft as any, template.key, {
                    bcc: value
                      .split(',')
                      .map((entry) => entry.trim().toLowerCase())
                      .filter(Boolean),
                  })
              "
            />
          </div>
        </li>
      </ul>
    </template>
  </SettingsSection>
</template>
