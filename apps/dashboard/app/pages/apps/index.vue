<script setup lang="ts">
import { computed, ref } from 'vue'
import type { AppInstallation, MarketplaceApp } from '@platform/schemas'

/**
 * Apps — marketplace, detail, installed (§33, §35).
 *
 * The one screen in the product where a customer hands a third party access to
 * their business. So the permission list is not a collapsed "advanced" section:
 * it is the largest thing in the install dialog, written as sentences, and the
 * install button sits underneath it rather than above it.
 */

const api = useApi()
const can = useCan()

const { data: marketplace, pending } = await useAsyncData('apps-marketplace', () =>
  api.get<MarketplaceApp[]>('/api/v1/apps/marketplace'),
)

const {
  data: installed,
  pending: installedPending,
  refresh: refreshInstalled,
} = await useAsyncData('apps-installed', () => api.get<AppInstallation[]>('/api/v1/apps/installations'))

const view = ref<'marketplace' | 'installed'>('marketplace')
const category = ref('')
const search = ref('')
const selected = ref<MarketplaceApp | null>(null)
const busy = ref(false)
const error = ref('')

const categories = computed(() => [...new Set((marketplace.value ?? []).map((entry) => entry.category))].sort())

const installedSlugs = computed(() => new Set((installed.value ?? []).map((entry) => entry.appSlug)))

const visible = computed(() => {
  const term = search.value.trim().toLowerCase()
  return (marketplace.value ?? []).filter((entry) => {
    if (category.value && entry.category !== category.value) return false
    if (!term) return true
    return `${entry.name} ${entry.tagline}`.toLowerCase().includes(term)
  })
})

/**
 * Permissions read as capabilities, not as identifiers. `crm:write` tells a
 * plumber nothing; "add and change contacts in your CRM" tells them exactly
 * what they are agreeing to.
 */
const PERMISSION_LABELS: Record<string, string> = {
  'tenant:read': 'See your workspace details',
  'tenant:write': 'Change your workspace settings',
  'member:read': 'See who is on your team',
  'member:invite': 'Invite people to your workspace',
  'member:manage': 'Add, change and remove team members',
  'billing:read': 'See your plan and invoices',
  'billing:manage': 'Change your plan and payment details',
  'audit:read': 'Read your activity log',
  'site:read': 'See your websites',
  'site:write': 'Create and change websites',
  'site:delete': 'Delete websites',
  'page:read': 'Read your pages',
  'page:write': 'Create and change pages',
  'page:publish': 'Publish pages to your live website',
  'page:delete': 'Delete pages',
  'media:read': 'See your media library',
  'media:write': 'Upload and change media',
  'domain:read': 'See your domains',
  'domain:write': 'Connect and change domains',
  'seo:read': 'Read your SEO settings and reports',
  'seo:write': 'Change your SEO settings',
  'ads:read': 'Read your ad campaigns',
  'ads:write': 'Create and change ad campaigns',
  'email:read': 'Read your e-mail campaigns',
  'email:write': 'Create and send e-mail campaigns',
  'automation:read': 'Read your automations',
  'automation:write': 'Create and change automations',
  'experiment:read': 'Read your experiments',
  'experiment:write': 'Start and stop experiments',
  'commerce:read': 'Read your shop data',
  'commerce:write': 'Change products and shop settings',
  'order:read': 'Read your orders',
  'order:write': 'Change orders',
  'customer:read': 'Read your customers',
  'customer:write': 'Add and change customers',
  'crm:read': 'Read your leads and deals',
  'crm:write': 'Add and change leads and deals',
  'analytics:read': 'Read your analytics',
  'tracking:read': 'Read your tracking setup',
  'tracking:write': 'Change your tracking setup',
  'app:read': 'See which apps you have installed',
  'app:install': 'Install and remove apps',
  'developer:read': 'Read developer settings',
  'developer:write': 'Change developer settings',
  'integration:read': 'Read connected integrations',
  'integration:write': 'Change its own settings and connections',
  'ai:use': 'Use AI on your behalf',
  'ai:autonomous': 'Act autonomously with AI',
}

/** Anything here is worth a second look before it is granted. */
const SENSITIVE = new Set([
  'tenant:write',
  'member:manage',
  'member:invite',
  'billing:manage',
  'site:delete',
  'page:delete',
  'ai:autonomous',
])

function label(permission: string): string {
  return PERMISSION_LABELS[permission] ?? permission
}

function open(entry: MarketplaceApp) {
  error.value = ''
  selected.value = entry
}

async function install() {
  if (!selected.value) return
  error.value = ''
  busy.value = true
  try {
    await api.post('/api/v1/apps/installations', { slug: selected.value.slug })
    selected.value = null
    await refreshInstalled()
    view.value = 'installed'
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'Could not install this app.'
  } finally {
    busy.value = false
  }
}

async function uninstall(installation: AppInstallation) {
  busy.value = true
  try {
    await api.del(`/api/v1/apps/installations/${installation.id}`)
    await refreshInstalled()
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'Could not remove this app.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div>
    <UiPageHeader
      title="Apps"
      description="Extend the platform. Every app runs behind a permission-checked gateway — it only ever gets what you grant it."
    >
      <template #actions>
        <div class="inline-flex rounded-lg border border-line bg-raised p-0.5" role="tablist">
          <button
            v-for="tab in (['marketplace', 'installed'] as const)"
            :key="tab"
            type="button"
            role="tab"
            :aria-selected="view === tab"
            class="rounded-[0.4rem] px-3 py-1.5 text-[0.8125rem] font-medium capitalize transition-colors duration-150"
            :class="
              view === tab ? 'bg-sunken text-ink shadow-raised' : 'text-faint hover:text-soft'
            "
            @click="view = tab"
          >
            {{ tab }}
            <span v-if="tab === 'installed' && installed?.length" class="ml-1 text-faint">{{ installed?.length }}</span>
          </button>
        </div>
      </template>
    </UiPageHeader>

    <p v-if="error" class="mb-4 rounded-lg bg-danger-soft px-3 py-2 text-[0.8125rem] text-danger" role="alert">
      {{ error }}
    </p>

    <!-- Marketplace -->
    <section v-if="view === 'marketplace'" aria-label="App marketplace">
      <div class="mb-5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          class="rounded-full border px-3 py-1 text-[0.8125rem] transition-colors duration-150"
          :class="category === '' ? 'border-brand bg-brand-soft text-brand' : 'border-line text-soft hover:border-line-strong'"
          @click="category = ''"
        >
          All
        </button>
        <button
          v-for="entry in categories"
          :key="entry"
          type="button"
          class="rounded-full border px-3 py-1 text-[0.8125rem] capitalize transition-colors duration-150"
          :class="
            category === entry ? 'border-brand bg-brand-soft text-brand' : 'border-line text-soft hover:border-line-strong'
          "
          @click="category = entry"
        >
          {{ entry }}
        </button>
        <input
          v-model="search"
          type="search"
          placeholder="Search apps"
          aria-label="Search apps"
          class="ml-auto w-48 rounded-lg border border-line bg-raised px-3 py-1.5 text-[0.8125rem] text-ink placeholder:text-faint focus:border-brand focus:outline-none"
        />
      </div>

      <UiEmptyState
        v-if="!pending && visible.length === 0"
        title="No apps here yet"
        description="Approved apps appear in the marketplace. Build your own in the developer portal."
      />

      <ul v-else class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <li v-for="entry in visible" :key="entry.slug">
          <article
            class="flex h-full flex-col rounded-card border border-line bg-raised p-5 transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-raised"
          >
            <div class="flex items-start gap-3">
              <img
                v-if="entry.iconUrl"
                :src="entry.iconUrl"
                alt=""
                width="40"
                height="40"
                class="h-10 w-10 shrink-0 rounded-lg border border-line object-cover"
              />
              <span
                v-else
                class="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-soft text-[0.9375rem] font-semibold text-brand"
                aria-hidden="true"
              >
                {{ entry.name.slice(0, 1).toUpperCase() }}
              </span>
              <div class="min-w-0">
                <h2 class="truncate text-[0.9375rem] font-semibold tracking-[-0.015em] text-ink">{{ entry.name }}</h2>
                <p class="truncate text-[0.8125rem] text-faint">{{ entry.publisher }}</p>
              </div>
            </div>

            <p class="mt-3 line-clamp-2 text-[0.8125rem] text-soft">{{ entry.tagline || entry.description }}</p>

            <div class="mt-4 flex flex-wrap items-center gap-2">
              <UiBadge class="capitalize">{{ entry.category }}</UiBadge>
              <UiBadge v-if="installedSlugs.has(entry.slug)" tone="positive">Installed</UiBadge>
              <span class="text-[0.75rem] text-faint">
                {{ entry.requestedPermissions.length }} permission{{ entry.requestedPermissions.length === 1 ? '' : 's' }}
              </span>
            </div>

            <div class="mt-5 flex justify-end">
              <UiButton size="sm" @click="open(entry)">
                {{ installedSlugs.has(entry.slug) ? 'View' : 'View and install' }}
              </UiButton>
            </div>
          </article>
        </li>
      </ul>
    </section>

    <!-- Installed -->
    <section v-else aria-label="Installed apps">
      <UiEmptyState
        v-if="!installedPending && !installed?.length"
        title="No apps installed"
        description="Anything you install shows up here with the exact permissions you granted it."
      >
        <UiButton variant="primary" @click="view = 'marketplace'">Browse the marketplace</UiButton>
      </UiEmptyState>

      <ul v-else class="flex flex-col gap-3">
        <li
          v-for="installation in installed"
          :key="installation.id"
          class="rounded-card border border-line bg-raised p-5"
        >
          <div class="flex items-start justify-between gap-4">
            <div class="min-w-0">
              <p class="truncate text-[0.9375rem] font-semibold tracking-[-0.015em] text-ink">
                {{ installation.appName }}
              </p>
              <p class="mt-0.5 text-[0.8125rem] text-faint">
                Installed by {{ installation.installedBy }} ·
                {{ new Date(installation.installedAt).toLocaleDateString() }}
              </p>
            </div>
            <UiButton
              v-if="can('app:install')"
              size="sm"
              :loading="busy"
              @click="uninstall(installation)"
            >
              Remove
            </UiButton>
          </div>

          <ul class="mt-4 flex flex-wrap gap-1.5">
            <li v-for="permission in installation.grantedPermissions" :key="permission">
              <UiBadge :tone="SENSITIVE.has(permission) ? 'warning' : 'neutral'">
                {{ label(permission) }}
              </UiBadge>
            </li>
            <li v-if="installation.grantedPermissions.length === 0">
              <UiBadge>No permissions granted</UiBadge>
            </li>
          </ul>
        </li>
      </ul>
    </section>

    <!-- Detail. The permission list is the dialog; the button is the footnote. -->
    <UiDialog
      :open="selected !== null"
      wide
      :title="selected?.name ?? ''"
      :description="selected?.tagline ?? ''"
      @update:open="(value: boolean) => { if (!value) selected = null }"
    >
      <div v-if="selected" class="flex flex-col gap-5">
        <p class="text-sm text-soft">{{ selected.description }}</p>

        <div class="rounded-card border border-line-strong bg-sunken/50 p-4">
          <h3 class="text-[0.8125rem] font-semibold text-ink">This app will be able to:</h3>
          <ul class="mt-3 flex flex-col gap-2">
            <li
              v-for="permission in selected.requestedPermissions"
              :key="permission"
              class="flex items-start gap-2 text-[0.8125rem]"
              :class="SENSITIVE.has(permission) ? 'text-warning' : 'text-soft'"
            >
              <span aria-hidden="true" class="mt-[0.35rem] h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
              <span>{{ label(permission) }}</span>
            </li>
            <li v-if="selected.requestedPermissions.length === 0" class="text-[0.8125rem] text-soft">
              Nothing. This app requests no access to your data.
            </li>
          </ul>
          <p class="mt-3 text-[0.75rem] text-faint">
            It only ever receives permissions you already hold, and every call it makes is checked against this list.
          </p>
        </div>

        <dl class="grid grid-cols-2 gap-3 text-[0.8125rem]">
          <div>
            <dt class="text-faint">Publisher</dt>
            <dd class="text-ink">{{ selected.publisher }}</dd>
          </div>
          <div>
            <dt class="text-faint">Version</dt>
            <dd class="text-ink">{{ selected.version }}</dd>
          </div>
          <div>
            <dt class="text-faint">Installs</dt>
            <dd class="text-ink">{{ selected.installCount }}</dd>
          </div>
          <div>
            <dt class="text-faint">Events</dt>
            <dd class="text-ink">{{ selected.events.length || 'None' }}</dd>
          </div>
        </dl>
      </div>

      <template #footer>
        <UiButton @click="selected = null">Cancel</UiButton>
        <UiButton
          v-if="selected && !installedSlugs.has(selected.slug) && can('app:install')"
          variant="primary"
          :loading="busy"
          @click="install"
        >
          Install
        </UiButton>
      </template>
    </UiDialog>
  </div>
</template>
