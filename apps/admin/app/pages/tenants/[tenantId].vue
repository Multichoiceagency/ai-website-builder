<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import type { WhiteLabelSettings } from '@platform/schemas'

const route = useRoute()
const api = useAdminApi()
const config = useRuntimeConfig()

interface Detail {
  tenant: {
    id: string
    name: string
    slug: string
    plan: string
    organizationName: string
    createdAt: string
    members: number
    sites: number
    pages: number
    publishedPages: number
    lastActivityAt: string | null
  }
  members: { id: string; email: string; name: string; role: string; joinedAt: string }[]
  sites: {
    id: string
    name: string
    slug: string
    hostname: string | null
    locale: string
    pages: number
    publishedPages: number
  }[]
  branding: WhiteLabelSettings
}

const PLAN_OPTIONS = [
  { label: 'Launch', value: 'launch' },
  { label: 'Grow', value: 'grow' },
  { label: 'Scale', value: 'scale' },
  { label: 'Advanced', value: 'advanced' },
  { label: 'Enterprise', value: 'enterprise' },
]

const { data, refresh } = await useAsyncData(`admin:tenant:${route.params.tenantId}`, () =>
  api.get<Detail>(`/tenants/${route.params.tenantId}`),
)

const form = reactive({
  brandName: '',
  logoUrl: '',
  faviconUrl: '',
  colorPrimary: '#1d4ed8',
  colorAccent: '#0f766e',
  colorSurface: '#fafaf9',
  colorSurfaceAlt: '#ffffff',
  colorText: '#18181b',
  fontHeading: 'Figtree',
  fontBody: 'Rubik',
  supportEmail: '',
  hidePlatformBranding: false,
  customDomain: '',
})

const saving = ref(false)
const saveError = ref('')
const saveOk = ref(false)
const plan = ref('launch')
const planBusy = ref(false)
const planError = ref('')
const planOk = ref(false)
const impersonating = ref<string | null>(null)
const impersonateError = ref('')

const FONT_OPTIONS = [
  'Figtree',
  'Plus Jakarta Sans',
  'Inter',
  'DM Sans',
  'Outfit',
  'Manrope',
  'Space Grotesk',
  'Rubik',
  'Work Sans',
  'Source Sans 3',
  'Instrument Serif',
  'Fraunces',
  'Libre Baskerville',
  'Source Serif 4',
  'Lora',
  'Merriweather',
  'Playfair Display',
  'Cormorant Garamond',
]

watch(
  () => data.value?.branding,
  (branding) => {
    if (!branding) return
    form.brandName = branding.brandName ?? ''
    form.logoUrl = branding.logoUrl ?? ''
    form.faviconUrl = branding.faviconUrl ?? ''
    form.colorPrimary = branding.colorPrimary
    form.colorAccent = branding.colorAccent
    form.colorSurface = branding.colorSurface
    form.colorSurfaceAlt = branding.colorSurfaceAlt
    form.colorText = branding.colorText
    form.fontHeading = branding.fontHeading
    form.fontBody = branding.fontBody
    form.supportEmail = branding.supportEmail ?? ''
    form.hidePlatformBranding = branding.hidePlatformBranding
    form.customDomain = branding.customDomain ?? ''
  },
  { immediate: true },
)

watch(
  () => data.value?.tenant.plan,
  (value) => {
    if (value) plan.value = value
  },
  { immediate: true },
)

async function savePlan() {
  planError.value = ''
  planOk.value = false
  planBusy.value = true
  try {
    await api.patch(`/tenants/${route.params.tenantId}/plan`, { plan: plan.value })
    await refresh()
    planOk.value = true
  } catch (caught) {
    planError.value = caught instanceof Error ? caught.message : 'Could not update plan.'
  } finally {
    planBusy.value = false
  }
}

async function impersonate(userId: string) {
  impersonateError.value = ''
  impersonating.value = userId
  try {
    const result = await api.post<{ token: string; tenantId: string }>('/impersonate', {
      userId,
      tenantId: String(route.params.tenantId),
    })
    const url = new URL('/impersonate', config.public.dashboardUrl)
    url.searchParams.set('token', result.token)
    url.searchParams.set('tenantId', result.tenantId)
    window.open(url.toString(), '_blank', 'noopener')
  } catch (caught) {
    impersonateError.value = caught instanceof Error ? caught.message : 'Impersonation failed.'
  } finally {
    impersonating.value = null
  }
}

async function saveBranding() {
  saveError.value = ''
  saveOk.value = false
  saving.value = true
  try {
    await api.put(`/tenants/${route.params.tenantId}/branding`, {
      brandName: form.brandName.trim() || null,
      logoUrl: form.logoUrl.trim() || null,
      faviconUrl: form.faviconUrl.trim() || null,
      colorPrimary: form.colorPrimary,
      colorAccent: form.colorAccent,
      colorSurface: form.colorSurface,
      colorSurfaceAlt: form.colorSurfaceAlt,
      colorText: form.colorText,
      fontHeading: form.fontHeading,
      fontBody: form.fontBody,
      supportEmail: form.supportEmail.trim() || null,
      hidePlatformBranding: form.hidePlatformBranding,
      customDomain: form.customDomain.trim() || null,
    })
    await refresh()
    saveOk.value = true
  } catch (caught) {
    saveError.value = caught instanceof Error ? caught.message : 'Could not save branding.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div v-if="data">
    <UiPageHeader
      :title="data.tenant.name"
      :description="`${data.tenant.organizationName} · created ${new Date(data.tenant.createdAt).toLocaleDateString('en-GB')}`"
      back="/tenants"
      back-label="Clients"
    >
      <template #actions><UiBadge tone="brand">{{ data.tenant.plan }}</UiBadge></template>
    </UiPageHeader>

    <div class="grid gap-3 sm:grid-cols-4">
      <UiStat label="Users" :value="data.tenant.members" />
      <UiStat label="Websites" :value="data.tenant.sites" />
      <UiStat label="Pages" :value="data.tenant.pages" />
      <UiStat label="Published" :value="data.tenant.publishedPages" />
    </div>

    <UiCard class="mt-7">
      <div class="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 class="text-heading font-semibold text-ink">Plan</h2>
          <p class="mt-1 text-[0.8125rem] text-soft">Billing entitlement for this workspace.</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <UiSelect v-model="plan" :options="PLAN_OPTIONS" />
          <UiButton variant="primary" :loading="planBusy" @click="savePlan">Update plan</UiButton>
        </div>
      </div>
      <p v-if="planError" class="rounded-lg bg-danger-soft px-3 py-2 text-[0.8125rem] text-danger" role="alert">
        {{ planError }}
      </p>
      <p v-else-if="planOk" class="rounded-lg bg-positive-soft px-3 py-2 text-[0.8125rem] text-positive" role="status">
        Plan updated.
      </p>
    </UiCard>

    <UiCard class="mt-7">
      <div class="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 class="text-heading font-semibold text-ink">Dashboard branding</h2>
          <p class="mt-1 max-w-xl text-[0.8125rem] leading-relaxed text-soft">
            Logo, colours and fonts paint the client’s dashboard chrome — sidebar, buttons, surfaces —
            so the workspace feels like theirs from the first login.
          </p>
        </div>
        <UiButton variant="primary" :loading="saving" @click="saveBranding">Save branding</UiButton>
      </div>

      <p v-if="saveError" class="mb-4 rounded-lg bg-danger-soft px-3 py-2 text-[0.8125rem] text-danger" role="alert">
        {{ saveError }}
      </p>
      <p v-else-if="saveOk" class="mb-4 rounded-lg bg-positive-soft px-3 py-2 text-[0.8125rem] text-positive" role="status">
        Branding saved. The client dashboard picks it up on the next load.
      </p>

      <div class="grid gap-4 lg:grid-cols-2">
        <UiField v-slot="{ id }" label="Brand name">
          <UiInput :id="id" v-model="form.brandName" placeholder="Acme Studio" />
        </UiField>
        <UiField v-slot="{ id }" label="Support e-mail">
          <UiInput :id="id" v-model="form.supportEmail" type="email" placeholder="hello@client.com" />
        </UiField>
        <UiField v-slot="{ id, describedBy }" label="Logo URL" help="Absolute URL or media path shown in the sidebar.">
          <UiInput :id="id" v-model="form.logoUrl" :described-by="describedBy" placeholder="https://…/logo.svg" />
        </UiField>
        <UiField v-slot="{ id }" label="Favicon URL">
          <UiInput :id="id" v-model="form.faviconUrl" placeholder="https://…/favicon.ico" />
        </UiField>
      </div>

      <div class="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <UiField label="Primary">
          <div class="flex items-center gap-2">
            <input v-model="form.colorPrimary" type="color" class="h-9 w-12 cursor-pointer rounded border border-line bg-raised p-1" />
            <UiInput v-model="form.colorPrimary" class="font-mono text-[0.8125rem]" />
          </div>
        </UiField>
        <UiField label="Accent">
          <div class="flex items-center gap-2">
            <input v-model="form.colorAccent" type="color" class="h-9 w-12 cursor-pointer rounded border border-line bg-raised p-1" />
            <UiInput v-model="form.colorAccent" class="font-mono text-[0.8125rem]" />
          </div>
        </UiField>
        <UiField label="Text">
          <div class="flex items-center gap-2">
            <input v-model="form.colorText" type="color" class="h-9 w-12 cursor-pointer rounded border border-line bg-raised p-1" />
            <UiInput v-model="form.colorText" class="font-mono text-[0.8125rem]" />
          </div>
        </UiField>
        <UiField label="Surface">
          <div class="flex items-center gap-2">
            <input v-model="form.colorSurface" type="color" class="h-9 w-12 cursor-pointer rounded border border-line bg-raised p-1" />
            <UiInput v-model="form.colorSurface" class="font-mono text-[0.8125rem]" />
          </div>
        </UiField>
        <UiField label="Raised surface">
          <div class="flex items-center gap-2">
            <input v-model="form.colorSurfaceAlt" type="color" class="h-9 w-12 cursor-pointer rounded border border-line bg-raised p-1" />
            <UiInput v-model="form.colorSurfaceAlt" class="font-mono text-[0.8125rem]" />
          </div>
        </UiField>
      </div>

      <div class="mt-5 grid gap-4 sm:grid-cols-2">
        <UiField v-slot="{ id }" label="Heading font">
          <UiSelect
            :id="id"
            v-model="form.fontHeading"
            :options="FONT_OPTIONS.map((f) => ({ label: f, value: f }))"
          />
        </UiField>
        <UiField v-slot="{ id }" label="Body font">
          <UiSelect
            :id="id"
            v-model="form.fontBody"
            :options="FONT_OPTIONS.map((f) => ({ label: f, value: f }))"
          />
        </UiField>
      </div>

      <div class="mt-5 grid gap-4 sm:grid-cols-2">
        <UiField v-slot="{ id, describedBy }" label="Custom dashboard domain" help="Advanced white-label — optional.">
          <UiInput :id="id" v-model="form.customDomain" :described-by="describedBy" placeholder="app.client.com" />
        </UiField>
        <label class="flex items-start gap-3 pt-6">
          <input v-model="form.hidePlatformBranding" type="checkbox" class="mt-1 accent-[var(--brand)]" />
          <span>
            <span class="block text-[0.8125rem] font-medium text-ink">Hide platform branding</span>
            <span class="block text-[0.75rem] text-soft">Advanced white-label — remove “Powered by” cues.</span>
          </span>
        </label>
      </div>

      <div
        v-if="form.logoUrl"
        class="mt-5 flex items-center gap-3 rounded-lg border border-line bg-sunken px-3 py-3"
      >
        <img :src="form.logoUrl" alt="" class="h-10 max-w-[10rem] object-contain" />
        <p class="text-[0.75rem] text-soft">Logo preview</p>
      </div>
    </UiCard>

    <div class="mt-7 grid gap-5 lg:grid-cols-2 lg:items-start">
      <UiCard :padded="false">
        <h2 class="border-b border-line px-4 py-3 text-heading font-semibold text-ink">Team</h2>
        <p
          v-if="impersonateError"
          class="mx-4 mt-3 rounded-lg bg-danger-soft px-3 py-2 text-[0.8125rem] text-danger"
          role="alert"
        >
          {{ impersonateError }}
        </p>
        <ul class="divide-y divide-line">
          <li v-for="member in data.members" :key="member.id" class="flex items-center justify-between gap-4 px-4 py-3">
            <span class="min-w-0">
              <span class="block truncate text-[0.8125rem] font-medium text-ink">{{ member.name }}</span>
              <span class="block truncate text-[0.75rem] text-faint">{{ member.email }}</span>
            </span>
            <div class="flex shrink-0 items-center gap-2">
              <UiBadge>{{ member.role.replace('_', ' ') }}</UiBadge>
              <UiButton
                size="sm"
                :loading="impersonating === member.id"
                :disabled="Boolean(impersonating)"
                @click="impersonate(member.id)"
              >
                Impersonate
              </UiButton>
            </div>
          </li>
        </ul>
      </UiCard>

      <UiCard :padded="false">
        <h2 class="border-b border-line px-4 py-3 text-heading font-semibold text-ink">Websites</h2>
        <ul v-if="data.sites.length" class="divide-y divide-line">
          <li v-for="site in data.sites" :key="site.id" class="flex items-center justify-between gap-4 px-4 py-3">
            <span class="min-w-0">
              <span class="block truncate text-[0.8125rem] font-medium text-ink">{{ site.name }}</span>
              <span class="block truncate text-[0.75rem] text-faint">{{ site.hostname ?? site.slug }} · {{ site.locale }}</span>
            </span>
            <span class="shrink-0 text-[0.8125rem] tabular-nums text-soft">{{ site.publishedPages }}/{{ site.pages }}</span>
          </li>
        </ul>
        <p v-else class="px-4 py-8 text-center text-[0.8125rem] text-faint">No websites yet.</p>
      </UiCard>
    </div>

    <UiCard class="mt-5">
      <p class="text-[0.8125rem] leading-relaxed text-soft">
        This view shows metadata, usage and dashboard branding — never page content, customer records or credentials.
        Opening it was written to the staff access log.
      </p>
    </UiCard>
  </div>
</template>
