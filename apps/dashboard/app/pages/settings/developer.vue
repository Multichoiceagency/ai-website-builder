<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ApiKey, WebhookDelivery, WebhookEndpoint } from '@platform/schemas'

/**
 * Developer settings (§61, §62).
 *
 * The one screen in the product that ever shows a live credential, and it does
 * so exactly once. Everything after creation is a masked hint — including in
 * this component's own state, which is why the plaintext lives in a ref that is
 * cleared the moment the dialog closes.
 */
const api = useApi()
const session = useSession()

const { data: keys, refresh: refreshKeys } = await useAsyncData(
  'settings:api-keys',
  () => api.get<ApiKey[]>('/api/v1/settings/api-keys'),
  { default: () => [] as ApiKey[] },
)

const { data: webhooks, refresh: refreshWebhooks } = await useAsyncData(
  'settings:webhooks',
  () => api.get<WebhookEndpoint[]>('/api/v1/settings/webhooks'),
  { default: () => [] as WebhookEndpoint[] },
)

// --- API keys --------------------------------------------------------------

const keyDialog = ref(false)
const keyName = ref('')
const keyScopes = ref<string[]>([])
const keyBusy = ref(false)
const keyError = ref('')
/** Shown once, then discarded. Never persisted, never re-fetchable. */
const revealed = ref<{ name: string; secret: string } | null>(null)

const availableScopes = computed(() => session.value?.permissions ?? [])

async function createKey() {
  keyBusy.value = true
  keyError.value = ''
  try {
    const created = await api.post<ApiKey & { secret: string }>('/api/v1/settings/api-keys', {
      name: keyName.value.trim(),
      scopes: keyScopes.value,
    })
    revealed.value = { name: created.name, secret: created.secret }
    keyName.value = ''
    keyScopes.value = []
    keyDialog.value = false
    await refreshKeys()
  } catch (cause) {
    keyError.value = cause instanceof ApiError ? cause.message : 'Could not create that key.'
  } finally {
    keyBusy.value = false
  }
}

// --- Webhooks --------------------------------------------------------------

const WEBHOOK_EVENTS = [
  'page.published',
  'page.unpublished',
  'order.placed',
  'payment.captured',
  'refund.created',
  'lead.created',
  'deal.won',
  'experiment.completed',
]

const hookDialog = ref(false)
const hookUrl = ref('')
const hookEvents = ref<string[]>([])
const hookBusy = ref(false)
const hookError = ref('')
const expandedHook = ref<string | null>(null)
const deliveries = ref<WebhookDelivery[]>([])

async function createHook() {
  hookBusy.value = true
  hookError.value = ''
  try {
    const created = await api.post<WebhookEndpoint & { secret: string }>('/api/v1/settings/webhooks', {
      url: hookUrl.value.trim(),
      events: hookEvents.value,
      active: true,
    })
    revealed.value = { name: `Signing secret for ${created.url}`, secret: created.secret }
    hookUrl.value = ''
    hookEvents.value = []
    hookDialog.value = false
    await refreshWebhooks()
  } catch (cause) {
    hookError.value = cause instanceof ApiError ? cause.message : 'Could not register that endpoint.'
  } finally {
    hookBusy.value = false
  }
}

async function openDeliveries(endpointId: string) {
  if (expandedHook.value === endpointId) {
    expandedHook.value = null
    return
  }
  expandedHook.value = endpointId
  deliveries.value = await api.get<WebhookDelivery[]>(
    `/api/v1/settings/webhooks/${endpointId}/deliveries`,
  )
}

function onRotated(result: unknown) {
  const rotated = result as { url: string; secret: string }
  revealed.value = { name: `New signing secret for ${rotated.url}`, secret: rotated.secret }
  void refreshWebhooks()
}

function copy(value: string) {
  void navigator.clipboard?.writeText(value)
}
</script>

<template>
  <div class="flex flex-col gap-5">
    <!-- API keys --------------------------------------------------------- -->
    <section class="rounded-card border border-line bg-raised">
      <header class="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <h2 class="type-button text-ink">API keys</h2>
          <p class="type-caption-12 mt-1 max-w-xl text-soft">
            Machine access to this workspace. A key can never grant more than the person who created it
            holds.
          </p>
        </div>
        <UiButton size="sm" variant="primary" @click="keyDialog = true">Create key</UiButton>
      </header>

      <UiEmptyState
        v-if="!keys?.length"
        title="No API keys"
        description="Create one when you need to reach this workspace from your own code."
      />

      <ul v-else class="divide-y divide-line">
        <li v-for="key in keys" :key="key.id" class="flex flex-wrap items-center gap-3 px-5 py-3">
          <div class="min-w-0 flex-1">
            <p class="type-button-12 truncate text-ink">
              {{ key.name }}
              <UiBadge v-if="key.revokedAt" tone="danger">Revoked</UiBadge>
            </p>
            <p class="type-caption-12 text-faint">
              {{ key.lastUsedAt ? `Last used ${new Date(key.lastUsedAt).toLocaleDateString()}` : 'Never used' }}
              · {{ key.scopes.length }} scope{{ key.scopes.length === 1 ? '' : 's' }}
            </p>
          </div>

          <code class="rounded-md border border-line bg-sunken px-2.5 py-1.5 font-mono text-[0.75rem] text-soft">
            {{ key.hint }}
          </code>

          <SettingsDangerAction
            v-if="!key.revokedAt"
            title="Revoke API key"
            :description="`Anything using ${key.name} stops working immediately.`"
            action-label="Revoke"
            method="DELETE"
            :path="`/api/v1/settings/api-keys/${key.id}`"
            @done="refreshKeys()"
          />
        </li>
      </ul>
    </section>

    <!-- Webhooks --------------------------------------------------------- -->
    <section class="rounded-card border border-line bg-raised">
      <header class="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <h2 class="type-button text-ink">Webhook endpoints</h2>
          <p class="type-caption-12 mt-1 max-w-xl text-soft">
            Where domain events are delivered. Each request is signed with the endpoint's own secret —
            verify it before you trust the body.
          </p>
        </div>
        <UiButton size="sm" variant="primary" @click="hookDialog = true">Add endpoint</UiButton>
      </header>

      <UiEmptyState
        v-if="!webhooks?.length"
        title="No endpoints"
        description="Add one to receive events as they happen instead of polling for them."
      />

      <ul v-else class="divide-y divide-line">
        <li v-for="hook in webhooks" :key="hook.id">
          <div class="flex flex-wrap items-center gap-3 px-5 py-3">
            <div class="min-w-0 flex-1">
              <p class="type-button-12 truncate font-mono text-ink">{{ hook.url }}</p>
              <p class="type-caption-12 text-faint">
                {{ hook.events.length }} event{{ hook.events.length === 1 ? '' : 's' }}
                <template v-if="hook.lastDeliveryAt">
                  · last delivery {{ new Date(hook.lastDeliveryAt).toLocaleString() }}
                  <span :class="(hook.lastStatus ?? 500) < 300 ? 'text-positive' : 'text-danger'">
                    ({{ hook.lastStatus }})
                  </span>
                </template>
                <template v-else> · never delivered</template>
              </p>
            </div>

            <code class="rounded-md border border-line bg-sunken px-2.5 py-1.5 font-mono text-[0.75rem] text-soft">
              {{ hook.secretHint }}
            </code>

            <UiButton size="sm" variant="ghost" @click="openDeliveries(hook.id)">
              {{ expandedHook === hook.id ? 'Hide log' : 'Delivery log' }}
            </UiButton>

            <SettingsDangerAction
              title="Rotate signing secret"
              description="Every receiver must be updated with the new secret. Deliveries signed with the old one will fail verification."
              action-label="Rotate secret"
              method="POST"
              :path="`/api/v1/settings/webhooks/${hook.id}/rotate`"
              @done="onRotated"
            />

            <SettingsDangerAction
              title="Remove endpoint"
              :description="`${hook.url} stops receiving events.`"
              action-label="Remove"
              method="DELETE"
              :path="`/api/v1/settings/webhooks/${hook.id}`"
              @done="refreshWebhooks()"
            />
          </div>

          <div v-if="expandedHook === hook.id" class="border-t border-line bg-sunken/40 px-5 py-4">
            <p v-if="!deliveries.length" class="type-caption-12 text-soft">No deliveries yet.</p>
            <ul v-else class="flex flex-col gap-1.5">
              <li
                v-for="delivery in deliveries"
                :key="delivery.id"
                class="flex flex-wrap items-baseline gap-3 type-caption-12"
              >
                <span class="w-40 shrink-0 text-faint">
                  {{ new Date(delivery.createdAt).toLocaleString() }}
                </span>
                <span class="font-mono text-ink">{{ delivery.event }}</span>
                <span :class="(delivery.statusCode ?? 500) < 300 ? 'text-positive' : 'text-danger'">
                  {{ delivery.statusCode ?? 'failed' }}
                </span>
                <span class="text-faint">{{ delivery.durationMs }}ms</span>
                <span v-if="delivery.error" class="text-danger">{{ delivery.error }}</span>
              </li>
            </ul>
          </div>
        </li>
      </ul>
    </section>

    <!-- Create key ------------------------------------------------------- -->
    <UiDialog
      v-model:open="keyDialog"
      title="Create an API key"
      description="You will see the key once. Store it somewhere safe before closing the dialog."
    >
      <div class="flex flex-col gap-4">
        <UiField label="Name" help="What uses this key. Makes revocation a decision rather than a guess." required :error="keyError">
          <template #default="{ id, describedBy }">
            <UiInput :id="id" v-model="keyName" :described-by="describedBy" placeholder="Order sync worker" />
          </template>
        </UiField>

        <div>
          <p class="type-caption mb-1.5 text-soft">Scopes</p>
          <div class="flex max-h-52 flex-wrap gap-1 overflow-y-auto rounded-lg border border-line p-2">
            <button
              v-for="scope in availableScopes"
              :key="scope"
              type="button"
              class="type-button-10 rounded-full border px-2 py-1 transition-colors"
              :class="
                keyScopes.includes(scope)
                  ? 'border-brand bg-brand-soft text-brand'
                  : 'border-line text-soft hover:border-line-strong hover:text-ink'
              "
              @click="
                keyScopes = keyScopes.includes(scope)
                  ? keyScopes.filter((entry) => entry !== scope)
                  : [...keyScopes, scope]
              "
            >
              {{ scope }}
            </button>
          </div>
        </div>
      </div>

      <template #footer>
        <UiButton size="sm" @click="keyDialog = false">Cancel</UiButton>
        <UiButton size="sm" variant="primary" :loading="keyBusy" @click="createKey">Create key</UiButton>
      </template>
    </UiDialog>

    <!-- Add webhook ------------------------------------------------------ -->
    <UiDialog v-model:open="hookDialog" title="Add a webhook endpoint" description="HTTPS only.">
      <div class="flex flex-col gap-4">
        <UiField label="Endpoint URL" required :error="hookError">
          <template #default="{ id, describedBy }">
            <UiInput :id="id" v-model="hookUrl" :described-by="describedBy" placeholder="https://api.acme.nl/hooks/platform" />
          </template>
        </UiField>

        <div>
          <p class="type-caption mb-1.5 text-soft">Events</p>
          <div class="flex flex-wrap gap-1">
            <button
              v-for="event in WEBHOOK_EVENTS"
              :key="event"
              type="button"
              class="type-button-10 rounded-full border px-2 py-1 font-mono transition-colors"
              :class="
                hookEvents.includes(event)
                  ? 'border-brand bg-brand-soft text-brand'
                  : 'border-line text-soft hover:border-line-strong hover:text-ink'
              "
              @click="
                hookEvents = hookEvents.includes(event)
                  ? hookEvents.filter((entry) => entry !== event)
                  : [...hookEvents, event]
              "
            >
              {{ event }}
            </button>
          </div>
        </div>
      </div>

      <template #footer>
        <UiButton size="sm" @click="hookDialog = false">Cancel</UiButton>
        <UiButton size="sm" variant="primary" :loading="hookBusy" @click="createHook">Add endpoint</UiButton>
      </template>
    </UiDialog>

    <!-- The one-time reveal ---------------------------------------------- -->
    <UiDialog
      :open="revealed !== null"
      title="Copy this now"
      description="This value is not stored in a readable form and cannot be shown again."
      @update:open="(value: boolean) => { if (!value) revealed = null }"
    >
      <div v-if="revealed" class="flex flex-col gap-3">
        <p class="type-caption-12 text-soft">{{ revealed.name }}</p>
        <code
          class="block overflow-x-auto rounded-lg border border-line bg-sunken px-3 py-2.5 font-mono text-[0.75rem] text-ink"
        >
          {{ revealed.secret }}
        </code>
      </div>

      <template #footer>
        <UiButton size="sm" @click="copy(revealed?.secret ?? '')">Copy</UiButton>
        <UiButton size="sm" variant="primary" @click="revealed = null">I have stored it</UiButton>
      </template>
    </UiDialog>
  </div>
</template>
