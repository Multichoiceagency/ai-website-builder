<script setup lang="ts">
/**
 * Multi-CMS connections: platform collections plus Frappe REST and WordPress REST.
 * API keys are stored encrypted — never in the settings JSON document.
 */
</script>

<template>
  <SettingsSection
    section-key="cms"
    title="CMS"
    description="Pages bind to Platform collections, a Frappe DocType, or WordPress REST. Credentials stay encrypted."
  >
    <template #default="{ draft, secrets, refresh }">
      <div class="flex flex-col gap-6">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="type-button-12 text-ink">Platform CMS</p>
            <p class="type-caption-12 mt-0.5 text-soft">Collections and entries under Website → CMS.</p>
          </div>
          <UiSwitch
            :model-value="Boolean((draft as Record<string, unknown>).platformEnabled)"
            label="Platform CMS"
            @update:model-value="(draft as Record<string, unknown>).platformEnabled = $event"
          />
        </div>

        <div class="border-t border-line pt-5">
          <div class="mb-4 flex items-start justify-between gap-4">
            <div>
              <p class="type-button-12 text-ink">Frappe</p>
              <p class="type-caption-12 mt-0.5 max-w-xl text-soft">
                REST <code>/api/resource/&#123;doctype&#125;</code>. Token is <code>api_key:api_secret</code>.
                Local Docker: <code>docker compose -f pwd.yml up -d</code> in frappe_docker, then
                <code>http://localhost:8080</code>. Bench: <code>bench start</code> on port 8000.
              </p>
            </div>
            <UiSwitch
              :model-value="Boolean((draft as Record<string, unknown>).frappeEnabled)"
              label="Frappe"
              @update:model-value="(draft as Record<string, unknown>).frappeEnabled = $event"
            />
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <UiField label="Base URL">
              <UiInput
                :model-value="String((draft as Record<string, unknown>).frappeBaseUrl ?? '')"
                placeholder="http://localhost:8080"
                @update:model-value="(draft as Record<string, unknown>).frappeBaseUrl = $event"
              />
            </UiField>
            <UiField label="Default DocType">
              <UiInput
                :model-value="String((draft as Record<string, unknown>).frappeDoctype ?? '')"
                placeholder="Blog Post"
                @update:model-value="(draft as Record<string, unknown>).frappeDoctype = $event"
              />
            </UiField>
          </div>
          <div class="mt-4">
            <SettingsSecretField
              scope="platform"
              section-key="cms"
              field="frappeApiKey"
              label="Frappe API token"
              help="Paste api_key:api_secret from User → API Access."
              :state="secrets.find((item) => item.field === 'frappeApiKey') ?? null"
              @changed="refresh()"
            />
          </div>
        </div>

        <div class="border-t border-line pt-5">
          <div class="mb-4 flex items-start justify-between gap-4">
            <div>
              <p class="type-button-12 text-ink">WordPress</p>
              <p class="type-caption-12 mt-0.5 text-soft">REST <code>/wp-json/wp/v2/&#123;type&#125;</code>.</p>
            </div>
            <UiSwitch
              :model-value="Boolean((draft as Record<string, unknown>).wordpressEnabled)"
              label="WordPress"
              @update:model-value="(draft as Record<string, unknown>).wordpressEnabled = $event"
            />
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <UiField label="Base URL">
              <UiInput
                :model-value="String((draft as Record<string, unknown>).wordpressBaseUrl ?? '')"
                placeholder="https://example.com"
                @update:model-value="(draft as Record<string, unknown>).wordpressBaseUrl = $event"
              />
            </UiField>
            <UiField label="Post type">
              <UiInput
                :model-value="String((draft as Record<string, unknown>).wordpressPostType ?? '')"
                placeholder="posts"
                @update:model-value="(draft as Record<string, unknown>).wordpressPostType = $event"
              />
            </UiField>
          </div>
          <div class="mt-4">
            <SettingsSecretField
              scope="platform"
              section-key="cms"
              field="wordpressApiKey"
              label="WordPress application password"
              help="Optional. Base64 user:application-password for private posts."
              :state="secrets.find((item) => item.field === 'wordpressApiKey') ?? null"
              @changed="refresh()"
            />
          </div>
        </div>
      </div>
    </template>
  </SettingsSection>
</template>
