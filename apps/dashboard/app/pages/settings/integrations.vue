<script setup lang="ts">
import { ref } from 'vue'

/**
 * Integrations (§18, §60).
 *
 * Reads the existing gateway endpoint rather than modelling providers here. The
 * `reason` a provider is unconfigured is shown verbatim: an operator who cannot
 * see *why* a connector is dark will open a ticket instead of fixing the
 * environment variable.
 */
interface ProviderRow {
  id: string
  name: string
  description: string
  configured: boolean
  reason: string | null
  scopes: string[]
  connection: {
    id: string
    provider: string
    accountLabel?: string
    lastError?: string | null
    createdAt?: string
  } | null
}

const api = useApi()
const can = useCan()

const { data, refresh } = await useAsyncData('settings:integrations', () =>
  api.get<{ providers: ProviderRow[] }>('/api/v1/integrations'),
)

const busy = ref('')
const error = ref('')

async function connect(providerId: string) {
  busy.value = providerId
  error.value = ''
  try {
    const result = await api.post<{ authorizeUrl: string }>(
      `/api/v1/integrations/${providerId}/authorize`,
      { redirectTo: '/settings/integrations' },
    )
    // A full navigation, not a fetch: the consent screen belongs to the user's
    // browser, not to this XHR.
    window.location.href = result.authorizeUrl
  } catch (cause) {
    error.value = cause instanceof ApiError ? cause.message : 'Could not start that connection.'
    busy.value = ''
  }
}
</script>

<template>
  <div class="flex flex-col gap-5">
    <section class="rounded-card border border-line bg-raised">
      <header class="border-b border-line px-5 py-4">
        <h2 class="type-button text-ink">Connections</h2>
        <p class="type-caption-12 mt-1 max-w-xl text-soft">
          Third-party accounts this workspace can act on. Tokens are stored encrypted server-side and are
          never sent to your browser.
        </p>
      </header>

      <p v-if="error" class="type-caption-12 border-b border-line px-5 py-2 text-danger" role="alert">
        {{ error }}
      </p>

      <ul class="divide-y divide-line">
        <li
          v-for="provider in data?.providers ?? []"
          :key="provider.id"
          class="flex flex-wrap items-start gap-4 px-5 py-4"
        >
          <div class="min-w-0 flex-1">
            <p class="type-button-12 flex flex-wrap items-center gap-2 text-ink">
              {{ provider.name }}
              <UiBadge :tone="provider.connection ? 'positive' : provider.configured ? 'neutral' : 'warning'">
                {{ provider.connection ? 'Connected' : provider.configured ? 'Available' : 'Unavailable' }}
              </UiBadge>
            </p>
            <p class="type-caption-12 mt-1 text-soft">{{ provider.description }}</p>

            <p v-if="provider.reason" class="type-caption-12 mt-1.5 text-warning">{{ provider.reason }}</p>
            <p v-else-if="provider.connection?.lastError" class="type-caption-12 mt-1.5 text-danger">
              Last call failed: {{ provider.connection.lastError }}
            </p>
            <p v-else-if="provider.connection?.accountLabel" class="type-caption-12 mt-1.5 text-faint">
              Connected as {{ provider.connection.accountLabel }}
            </p>

            <ul v-if="!provider.connection" class="mt-2 flex flex-wrap gap-1">
              <li v-for="scope in provider.scopes.slice(0, 4)" :key="scope">
                <UiBadge>{{ scope.split('/').pop() }}</UiBadge>
              </li>
            </ul>
          </div>

          <div v-if="can('integration:write')" class="flex shrink-0 items-center gap-2">
            <UiButton
              v-if="!provider.connection"
              size="sm"
              variant="primary"
              :disabled="!provider.configured"
              :loading="busy === provider.id"
              @click="connect(provider.id)"
            >
              Connect
            </UiButton>
            <SettingsDangerAction
              v-else
              title="Disconnect integration"
              :description="`The platform loses access to ${provider.name}. Anything scheduled against it stops.`"
              action-label="Disconnect"
              method="DELETE"
              :path="`/api/v1/integrations/${provider.id}`"
              @done="refresh()"
            />
          </div>
        </li>
      </ul>
    </section>
  </div>
</template>
