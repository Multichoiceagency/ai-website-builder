<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Link2,
  ShoppingBag,
  Upload,
} from '@lucide/vue'

/**
 * Marketplace product feeds — live public URLs for Google/Meta tools, plus
 * downloadable XML/CSV. Options persist on the commerce feeds settings doc.
 * Connect/export status is export readiness only (no autonomous ads).
 */

interface FeedChannelRow {
  id: string
  name: string
  description: string
  format: 'xml' | 'csv'
  docsUrl: string
  connectMode: 'live_url' | 'file_upload'
  connectHint: string
  exportStatus: 'ready' | 'needs_products'
  downloadPath: string
  publicUrl: string
}

interface FeedSettingsRow {
  includeOutOfStock: boolean
  currency: string
  titleSuffix: string
}

const api = useApi()
const can = useCan()
const config = useRuntimeConfig()
const tenantId = useActiveTenantId()

const busy = ref('')
const saving = ref(false)
const error = ref('')
const savedMessage = ref('')
const copiedUrl = ref('')

const draft = reactive<FeedSettingsRow>({
  includeOutOfStock: false,
  currency: '',
  titleSuffix: '',
})

const { data, status, refresh } = await useAsyncData('commerce:feeds', () =>
  api.get<{
    channels: FeedChannelRow[]
    settings: FeedSettingsRow
    productCount: number
  }>('/api/v1/commerce/feeds'),
)

watch(
  data,
  (value) => {
    if (!value?.settings) return
    draft.includeOutOfStock = value.settings.includeOutOfStock
    draft.currency = value.settings.currency
    draft.titleSuffix = value.settings.titleSuffix
  },
  { immediate: true },
)

const productCount = computed(() => data.value?.productCount ?? 0)
const exportReady = computed(() => productCount.value > 0)
const channels = computed(() => data.value?.channels ?? [])

function exportLabel(channel: FeedChannelRow): string {
  return channel.exportStatus === 'ready' ? 'Export ready' : 'Needs products'
}

function connectLabel(channel: FeedChannelRow): string {
  return channel.connectMode === 'live_url' ? 'Live URL' : 'File export'
}

async function saveSettings() {
  if (!can('commerce:write')) {
    error.value = 'You need commerce write access to update feed options.'
    return
  }
  saving.value = true
  error.value = ''
  savedMessage.value = ''
  try {
    await api.put<FeedSettingsRow>('/api/v1/commerce/feeds/settings', {
      includeOutOfStock: draft.includeOutOfStock,
      currency: draft.currency.trim().toUpperCase(),
      titleSuffix: draft.titleSuffix,
    })
    await refresh()
    savedMessage.value = 'Feed options saved. Live URLs use the updated rules on the next fetch.'
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'Could not save feed options.'
  } finally {
    saving.value = false
  }
}

async function copyPublicUrl(channel: FeedChannelRow) {
  error.value = ''
  try {
    await navigator.clipboard.writeText(channel.publicUrl)
    copiedUrl.value = channel.id
    window.setTimeout(() => {
      if (copiedUrl.value === channel.id) copiedUrl.value = ''
    }, 2000)
  } catch {
    error.value = 'Could not copy the URL. Select it manually.'
  }
}

async function downloadFeed(channel: FeedChannelRow) {
  busy.value = channel.id
  error.value = ''
  try {
    const headers: Record<string, string> = {}
    if (tenantId.value) headers['x-tenant-id'] = tenantId.value

    const blob = await $fetch<Blob>(`${config.public.coreApiUrl}${channel.downloadPath}`, {
      method: 'GET',
      headers,
      credentials: 'include',
      responseType: 'blob',
    })

    const ext = channel.format === 'xml' ? 'xml' : 'csv'
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${channel.id}-feed.${ext}`
    anchor.click()
    URL.revokeObjectURL(url)
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Download failed.'
  } finally {
    busy.value = ''
  }
}
</script>

<template>
  <div>
    <UiPageHeader
      title="Product feeds"
      description="Connect Google, Meta, Amazon, eBay, and Marktplaats with a live URL or file export. No ads are launched from here."
      back="/commerce"
      back-label="Commerce"
    >
      <template #actions>
        <UiButton size="sm" to="/commerce/products">Products</UiButton>
        <UiButton size="sm" to="/commerce/builder">Store builder</UiButton>
      </template>
    </UiPageHeader>

    <p v-if="error" class="mb-4 text-[0.8125rem] text-danger" role="alert">{{ error }}</p>
    <p v-else-if="savedMessage" class="mb-4 text-[0.8125rem] text-positive" role="status">{{ savedMessage }}</p>

    <UiCard class="mb-6">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 class="text-[0.9375rem] font-semibold text-ink">Export status</h2>
          <p class="mt-1 text-[0.8125rem] text-soft">
            <template v-if="exportReady">
              {{ productCount }} active product{{ productCount === 1 ? '' : 's' }} — feeds are ready to connect.
            </template>
            <template v-else>
              No active products yet — add at least one product before marketplace tools can import a feed.
            </template>
          </p>
        </div>
        <UiBadge :tone="exportReady ? 'positive' : 'warning'">
          {{ exportReady ? 'Ready to export' : 'Needs products' }}
        </UiBadge>
      </div>
      <ol class="mt-4 list-decimal space-y-1.5 pl-5 text-[0.8125rem] leading-relaxed text-soft">
        <li>
          <NuxtLink to="/commerce/products/new" class="font-medium text-brand no-underline hover:underline">
            Add active products
          </NuxtLink>
          with titles, prices, and images.
        </li>
        <li>Adjust feed options below and save (currency, title suffix, out-of-stock).</li>
        <li>Copy a live URL (Google / Meta) or download a file (Amazon / eBay / Marktplaats).</li>
        <li>Paste or upload in the marketplace tool — this page never launches ads.</li>
      </ol>
    </UiCard>

    <UiEmptyState
      v-if="status !== 'pending' && !exportReady"
      class="mb-6"
      title="Nothing to export yet"
      description="Create an active product first. Until then every channel shows Needs products."
    >
      <UiButton variant="primary" to="/commerce/products/new">Add a product</UiButton>
      <UiButton to="/commerce/products">View products</UiButton>
    </UiEmptyState>

    <UiCard class="mb-6">
      <h2 class="text-[0.9375rem] font-semibold text-ink">Feed options</h2>
      <p class="mt-1 text-[0.8125rem] text-soft">
        Applied to every live URL and download. Save before expecting merchant tools to see changes.
      </p>
      <div class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label class="flex items-start gap-2.5 rounded-lg border border-line px-3 py-2.5">
          <input
            v-model="draft.includeOutOfStock"
            type="checkbox"
            class="mt-0.5"
            :disabled="!can('commerce:write')"
          >
          <span>
            <span class="block text-[0.8125rem] font-medium text-ink">Include out of stock</span>
            <span class="block text-[0.75rem] text-soft">Keep zero-stock products in the feed as unavailable.</span>
          </span>
        </label>
        <UiField v-slot="{ id }" label="Currency override" help="Leave empty to use each product’s currency.">
          <UiInput
            :id="id"
            v-model="draft.currency"
            placeholder="EUR"
            maxlength="3"
            :disabled="!can('commerce:write')"
          />
        </UiField>
        <UiField v-slot="{ id }" label="Title suffix" help="Appended to every product title.">
          <UiInput
            :id="id"
            v-model="draft.titleSuffix"
            placeholder=" | Acme Store"
            maxlength="80"
            :disabled="!can('commerce:write')"
          />
        </UiField>
      </div>
      <div class="mt-4 flex justify-end">
        <UiButton
          v-if="can('commerce:write')"
          size="sm"
          variant="primary"
          :loading="saving"
          @click="saveSettings"
        >
          Save options
        </UiButton>
      </div>
    </UiCard>

    <p v-if="status === 'pending'" class="text-[0.8125rem] text-soft">Loading feed channels…</p>

    <UiEmptyState
      v-else-if="channels.length === 0"
      title="No feed channels"
      description="Feed channels did not load. Refresh the page or check your commerce access."
    >
      <UiButton @click="refresh()">Retry</UiButton>
    </UiEmptyState>

    <ul v-else class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <li
        v-for="channel in channels"
        :key="channel.id"
        class="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4"
      >
        <div class="flex items-start gap-3">
          <span
            class="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-sunken text-ink"
            aria-hidden="true"
          >
            <ShoppingBag class="h-5 w-5" />
          </span>
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="text-[0.9375rem] font-semibold text-ink">{{ channel.name }}</h2>
              <UiBadge tone="neutral">{{ channel.format.toUpperCase() }}</UiBadge>
            </div>
            <p class="mt-1 text-[0.8125rem] leading-relaxed text-soft">{{ channel.description }}</p>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <UiBadge :tone="channel.exportStatus === 'ready' ? 'positive' : 'warning'">
            {{ exportLabel(channel) }}
          </UiBadge>
          <UiBadge tone="neutral">
            <span class="inline-flex items-center gap-1">
              <Link2 v-if="channel.connectMode === 'live_url'" class="h-3 w-3" aria-hidden="true" />
              <Upload v-else class="h-3 w-3" aria-hidden="true" />
              {{ connectLabel(channel) }}
            </span>
          </UiBadge>
        </div>

        <p class="text-[0.75rem] leading-relaxed text-faint">{{ channel.connectHint }}</p>
        <p
          v-if="channel.exportStatus === 'needs_products'"
          class="text-[0.75rem] leading-relaxed text-warning"
        >
          Next: add an active product, then return here to copy the URL or export the file.
        </p>

        <div
          v-if="channel.connectMode === 'live_url'"
          class="rounded-lg border border-line bg-sunken/50 px-3 py-2"
        >
          <p class="type-button-10 mb-1 uppercase tracking-[0.06em] text-faint">Live URL</p>
          <p class="break-all font-mono text-[0.6875rem] leading-relaxed text-ink">{{ channel.publicUrl }}</p>
        </div>

        <div class="mt-auto flex flex-wrap gap-2">
          <UiButton
            v-if="channel.connectMode === 'live_url'"
            size="sm"
            variant="primary"
            :disabled="channel.exportStatus === 'needs_products'"
            @click="copyPublicUrl(channel)"
          >
            <Check v-if="copiedUrl === channel.id" class="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            <Copy v-else class="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            {{ copiedUrl === channel.id ? 'Copied' : 'Copy URL' }}
          </UiButton>
          <UiButton
            size="sm"
            :variant="channel.connectMode === 'file_upload' ? 'primary' : undefined"
            :loading="busy === channel.id"
            :disabled="channel.exportStatus === 'needs_products'"
            @click="downloadFeed(channel)"
          >
            <Download class="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            {{ channel.connectMode === 'file_upload' ? 'Export file' : 'Download' }}
          </UiButton>
          <a
            class="inline-flex h-8 items-center gap-1.5 rounded-md border border-line-strong bg-raised px-3 text-[0.8125rem] font-semibold text-ink hover:bg-sunken"
            :href="channel.docsUrl"
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink class="h-3.5 w-3.5" aria-hidden="true" />
            Docs
          </a>
        </div>
      </li>
    </ul>
  </div>
</template>
