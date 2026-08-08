<script setup lang="ts">
import { computed, nextTick } from 'vue'
import type { CommerceStatus } from '@platform/schemas'

/**
 * Commerce connection — Shopify / WooCommerce / Medusa / platform engine.
 * Credentials go through SettingsSecretField (encrypted); store URL can be
 * public in the document or stored as a secret for private hosts.
 */
const props = defineProps<{ status: CommerceStatus | null }>()
const emit = defineEmits<{ statusChanged: [] }>()

const ENGINE_COPY: Record<
  string,
  {
    label: string
    blurb: string
    docsUrl?: string
    needsUrl?: boolean
    needsKey?: boolean
    needsSecret?: boolean
    keyLabel?: string
    secretLabel?: string
  }
> = {
  platform: {
    label: 'Platform',
    blurb: 'Built-in catalogue, carts and checkout — no external shop required.',
  },
  medusa: {
    label: 'Medusa',
    blurb: 'Headless commerce backend. Point at your Medusa Admin URL + API token.',
    docsUrl: 'https://docs.medusajs.com/',
    needsUrl: true,
    needsKey: true,
    keyLabel: 'API token',
  },
  shopify: {
    label: 'Shopify',
    blurb: 'Manage products, collections, orders and customers via Admin API.',
    docsUrl: 'https://shopify.dev/docs/api/admin-rest',
    needsUrl: true,
    needsKey: true,
    keyLabel: 'Admin API access token',
  },
  woocommerce: {
    label: 'WooCommerce',
    blurb: 'Connect a WordPress shop with REST consumer key + secret.',
    docsUrl: 'https://developer.woocommerce.com/docs/apis/rest-api/',
    needsUrl: true,
    needsKey: true,
    needsSecret: true,
    keyLabel: 'Consumer key',
    secretLabel: 'Consumer secret',
  },
  bigcommerce: {
    label: 'BigCommerce',
    blurb: 'Coming soon — same dashboard once the adapter ships.',
  },
}

const engineOptions = computed(() =>
  (props.status?.engines ?? []).map((engine) => ({
    label: `${ENGINE_COPY[engine.id]?.label ?? engine.id}${engine.configured ? '' : ' — setup'}`,
    value: engine.id,
  })),
)

const activeId = computed(() => props.status?.activeEngineId ?? props.status?.commerce?.id ?? 'platform')

function meta(id: string) {
  return ENGINE_COPY[id] ?? { label: id, blurb: 'Commerce engine' }
}

async function scrollToCredentials() {
  await nextTick()
  document.getElementById('engine-credentials')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function onSecretChanged(refreshSettings: () => void) {
  refreshSettings()
  emit('statusChanged')
}
</script>

<template>
  <div class="flex flex-col gap-5">
    <UiCard>
      <p class="text-[0.8125rem] leading-relaxed text-soft">
        Connect Shopify, WooCommerce, Medusa, or keep the built-in platform engine.
        Products, orders and customers in this dashboard talk to the active engine through one API
        (ADR-0006) — you manage every webshop from here.
      </p>
      <p class="mt-2 text-[0.75rem] text-faint">
        Active now:
        <span class="font-semibold text-ink">{{ meta(activeId).label }}</span>
      </p>
    </UiCard>

    <ul class="grid gap-3 sm:grid-cols-2">
      <li
        v-for="engine in status?.engines ?? []"
        :key="engine.id"
        class="rounded-2xl border border-line bg-raised p-4 shadow-sm"
      >
        <div class="flex items-start justify-between gap-2">
          <div>
            <p class="text-[0.9375rem] font-semibold text-ink">{{ meta(engine.id).label }}</p>
            <p class="mt-1 text-[0.75rem] leading-relaxed text-soft">{{ meta(engine.id).blurb }}</p>
          </div>
          <UiBadge
            :tone="
              engine.id === activeId && engine.configured
                ? 'positive'
                : engine.configured
                  ? 'brand'
                  : 'warning'
            "
          >
            {{
              engine.id === activeId && engine.configured
                ? 'Active'
                : engine.configured
                  ? 'Ready'
                  : 'Setup'
            }}
          </UiBadge>
        </div>
        <p v-if="engine.reason && !engine.configured" class="mt-2 text-[0.8125rem] text-warning">
          {{ engine.reason }}
        </p>
        <p v-else-if="engine.capabilities?.length" class="mt-2 text-[0.6875rem] text-faint">
          {{ engine.capabilities.join(' · ') }}
        </p>
        <div v-if="!engine.configured && engine.id !== 'platform'" class="mt-3">
          <UiButton size="sm" variant="primary" class="cursor-pointer" @click="scrollToCredentials">
            Connect {{ meta(engine.id).label }}
          </UiButton>
          <a
            v-if="meta(engine.id).docsUrl"
            :href="meta(engine.id).docsUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="ml-2 inline-flex h-8 items-center rounded-md border border-line-strong px-3 text-[0.8125rem] font-semibold text-ink no-underline hover:bg-sunken"
          >
            Docs
          </a>
        </div>
      </li>
    </ul>

    <SettingsSection
      scope="commerce"
      section-key="engine"
      title="Active engine"
      description="Choose which backend this workspace manages. Save, then paste credentials below."
    >
      <template #default="{ draft, secrets, refresh }">
        <UiField label="Provider">
          <UiSelect v-model="draft.providerId" :options="engineOptions" />
        </UiField>
        <UiField
          label="Store URL / shop domain"
          hint="Shopify: mystore.myshopify.com · Woo: https://shop.example.com · Medusa: https://api.example.com"
        >
          <UiInput v-model="draft.storeUrl" placeholder="mystore.myshopify.com" />
        </UiField>
        <UiField v-if="draft.providerId === 'shopify'" label="API version" hint="Shopify Admin API pin">
          <UiInput v-model="draft.apiVersion" placeholder="2024-10" />
        </UiField>

        <div id="engine-credentials" class="mt-4 scroll-mt-24 space-y-3 border-t border-line pt-4">
          <p class="text-[0.8125rem] font-semibold text-ink">Credentials</p>
          <p class="text-[0.75rem] text-soft">
            Stored encrypted. Never shown again — only a masked hint.
          </p>
          <SettingsSecretField
            scope="commerce"
            section-key="engine"
            field="apiKey"
            :label="meta(String(draft.providerId)).keyLabel ?? 'API key / access token'"
            :state="secrets.find((entry) => entry.field === 'apiKey') ?? null"
            @changed="onSecretChanged(refresh)"
          />
          <SettingsSecretField
            v-if="meta(String(draft.providerId)).needsSecret"
            scope="commerce"
            section-key="engine"
            field="apiSecret"
            :label="meta(String(draft.providerId)).secretLabel ?? 'API secret'"
            :state="secrets.find((entry) => entry.field === 'apiSecret') ?? null"
            @changed="onSecretChanged(refresh)"
          />
        </div>
      </template>
    </SettingsSection>
  </div>
</template>
