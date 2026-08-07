<script setup lang="ts">
/**
 * Workspace settings — the identity of the workspace itself plus the defaults
 * everything else inherits (locale, timezone, currency, language).
 */
const session = useSession()
const membership = useActiveMembership()

const LOCALES = [
  { label: 'Nederlands (nl)', value: 'nl' },
  { label: 'Nederlands – België (nl-BE)', value: 'nl-BE' },
  { label: 'English (en)', value: 'en' },
  { label: 'English – US (en-US)', value: 'en-US' },
  { label: 'Deutsch (de)', value: 'de' },
  { label: 'Français (fr)', value: 'fr' },
]

const TIMEZONES = [
  'Europe/Amsterdam',
  'Europe/Brussels',
  'Europe/Berlin',
  'Europe/London',
  'Europe/Madrid',
  'UTC',
  'America/New_York',
  'America/Los_Angeles',
].map((zone) => ({ label: zone, value: zone }))

const CURRENCIES = ['EUR', 'GBP', 'USD', 'CHF', 'SEK', 'DKK', 'PLN'].map((code) => ({
  label: code,
  value: code,
}))
</script>

<template>
  <div class="flex flex-col gap-5">
    <SettingsSection
      section-key="workspace"
      title="Workspace"
      description="Who this workspace is, and the defaults every site, store and campaign inherits from it."
    >
      <template #default="{ draft, writable }">
        <div class="grid gap-4 sm:grid-cols-2">
          <UiField label="Workspace name" help="Shown in the switcher and on invitations.">
            <template #default="{ id, describedBy }">
              <UiInput
                :id="id"
                v-model="(draft as any).name"
                :described-by="describedBy"
                :disabled="!writable"
                :placeholder="membership?.tenantName ?? ''"
              />
            </template>
          </UiField>

          <UiField label="Support e-mail" help="Where customers reply. Used as the reply-to on store mail.">
            <template #default="{ id, describedBy }">
              <UiInput :id="id" v-model="(draft as any).supportEmail" type="email" :described-by="describedBy" />
            </template>
          </UiField>

          <UiField label="Interface locale">
            <template #default="{ id }">
              <UiSelect :id="id" v-model="(draft as any).locale" :options="LOCALES" />
            </template>
          </UiField>

          <UiField label="Default content language" help="The language the builder writes new pages in.">
            <template #default="{ id }">
              <UiSelect :id="id" v-model="(draft as any).defaultLanguage" :options="LOCALES" />
            </template>
          </UiField>

          <UiField label="Time zone" help="Reports, schedules and audit timestamps use this zone.">
            <template #default="{ id }">
              <UiSelect :id="id" v-model="(draft as any).timezone" :options="TIMEZONES" />
            </template>
          </UiField>

          <UiField label="Reporting currency" help="Dashboard totals. The store's own currency is set under Commerce.">
            <template #default="{ id }">
              <UiSelect :id="id" v-model="(draft as any).currency" :options="CURRENCIES" />
            </template>
          </UiField>
        </div>
      </template>
    </SettingsSection>

    <!--
      Account facts, not settings: the identity here belongs to the user, not to
      the workspace, so it is shown rather than edited on this screen.
    -->
    <section class="rounded-card border border-line bg-raised px-5 py-4">
      <h2 class="type-button mb-3 text-ink">Your account</h2>
      <dl class="grid gap-3 sm:grid-cols-3">
        <div>
          <dt class="type-caption-12 text-faint">Name</dt>
          <dd class="type-button-12 mt-0.5 text-ink">{{ session?.user.name }}</dd>
        </div>
        <div class="min-w-0">
          <dt class="type-caption-12 text-faint">E-mail</dt>
          <dd class="type-button-12 mt-0.5 truncate text-ink">{{ session?.user.email }}</dd>
        </div>
        <div>
          <dt class="type-caption-12 text-faint">Role in this workspace</dt>
          <dd class="type-button-12 mt-0.5 capitalize text-ink">
            {{ membership?.role.replace('_', ' ') }}
          </dd>
        </div>
      </dl>
    </section>
  </div>
</template>
