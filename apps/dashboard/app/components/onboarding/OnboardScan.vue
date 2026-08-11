<script setup lang="ts">
import type { BusinessProfile, DiscoveryResult } from '@platform/schemas'
import { extractPaletteFromLogoFile } from '../../utils/logoPalette'

/**
 * Step 5 — AI scan (§81). Runs discover, then lets the user correct the profile.
 */

const props = defineProps<{
  website: string
  businessName: string
  city: string
  locale: string
  googleLocationId?: string | null
}>()

const profile = defineModel<BusinessProfile | null>('profile', { default: null })
const discovery = defineModel<DiscoveryResult | null>('discovery', { default: null })

const emit = defineEmits<{
  continue: []
  back: []
}>()

const api = useApi()
const config = useRuntimeConfig()
const { upload: uploadMedia } = useMediaUpload()

const phase = ref('')
const scanning = ref(false)
const error = ref('')
const dashboardLogoUrl = ref('')
const logoUploading = ref(false)
const logoUploadError = ref('')
const logoFileInput = ref<HTMLInputElement | null>(null)

const logoMissing = computed(() => !dashboardLogoUrl.value.trim() && !profile.value?.brand.logo)
const logoPreviewSrc = computed(() => {
  const url = dashboardLogoUrl.value.trim()
  if (!url) return ''
  if (url.startsWith('/')) return `${String(config.public.coreApiUrl).replace(/\/$/, '')}${url}`
  return url
})

function runPhases(labels: string[], done: () => boolean) {
  let index = 0
  phase.value = labels[0]!
  const timer = setInterval(() => {
    if (done() || index >= labels.length - 1) {
      clearInterval(timer)
      return
    }
    index += 1
    phase.value = labels[index]!
  }, 900)
  return () => clearInterval(timer)
}

async function scan() {
  error.value = ''
  scanning.value = true
  let finished = false
  const stop = runPhases(
    ['Reading your website', 'Understanding your business', 'Finding your services', 'Analyzing your brand'],
    () => finished,
  )

  try {
    const result = await api.post<DiscoveryResult>('/api/v1/onboarding/discover', {
      website: props.website.trim() || undefined,
      businessName: props.businessName.trim() || undefined,
      city: props.city.trim() || undefined,
      locale: props.locale,
      googleLocationId: props.googleLocationId?.trim() || undefined,
      socialUrls: [],
      maxPages: 8,
    })
    discovery.value = result
    profile.value = result.profile
    if (props.businessName.trim()) profile.value.company.name = props.businessName.trim()
    if (result.profile.brand.logo && !dashboardLogoUrl.value) {
      dashboardLogoUrl.value = result.profile.brand.logo
    }
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'Could not read that business.'
  } finally {
    finished = true
    stop()
    scanning.value = false
  }
}

function mergeBrandColors(colors: string[]) {
  if (!profile.value || !colors.length) return
  const merged = [...colors, ...profile.value.brand.colors]
    .filter((hex, index, all) => /^#[0-9a-fA-F]{6}$/.test(hex) && all.indexOf(hex) === index)
    .slice(0, 8)
  profile.value.brand.colors = merged
  if (!profile.value.brand.primaryColor || !merged.includes(profile.value.brand.primaryColor)) {
    profile.value.brand.primaryColor = merged[0] ?? ''
  }
}

async function onLogoFileSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || !profile.value) return

  logoUploadError.value = ''
  logoUploading.value = true
  try {
    const palette = await extractPaletteFromLogoFile(file).catch(() => [] as string[])
    const [asset] = await uploadMedia([file], { folder: 'brand' })
    if (!asset) {
      logoUploadError.value = 'Could not upload that logo. Try a PNG, SVG or JPEG under 25 MB.'
      return
    }
    dashboardLogoUrl.value = asset.url
    profile.value.brand.logo = asset.url
    mergeBrandColors(palette)
  } catch (caught) {
    logoUploadError.value = caught instanceof Error ? caught.message : 'Could not read that logo.'
  } finally {
    logoUploading.value = false
  }
}

function removeService(index: number) {
  if (!profile.value) return
  profile.value.services = profile.value.services.filter((_, i) => i !== index)
}

function submit() {
  if (!profile.value) return
  const logo = dashboardLogoUrl.value.trim()
  if (logo) profile.value.brand.logo = logo
  emit('continue')
}

onMounted(() => {
  if (!profile.value && !scanning.value) void scan()
})
</script>

<template>
  <div>
    <p v-if="error" class="mb-5 rounded-lg bg-danger-soft px-3 py-2 text-[0.8125rem] text-danger" role="alert">
      {{ error }}
    </p>

    <div v-if="scanning" class="rounded-xl border border-line bg-raised px-5 py-14 text-center shadow-card">
      <span class="mx-auto mb-4 block h-8 w-8 animate-spin rounded-full border-2 border-line border-t-brand" />
      <p class="text-heading font-semibold text-ink" role="status" aria-live="polite">{{ phase }}…</p>
      <p class="mx-auto mt-2 max-w-sm text-[0.8125rem] text-soft">
        This usually takes a few seconds. We only read pages that allow automated access.
      </p>
    </div>

    <div v-else-if="profile" class="grid gap-5 lg:grid-cols-[1.4fr_1fr] lg:items-start">
      <div class="rounded-xl border border-line bg-raised p-5 shadow-card sm:p-6">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-heading font-semibold text-ink">What we found</h2>
          <UiBadge tone="positive">{{ discovery?.pagesCrawled ?? 0 }} pages read</UiBadge>
        </div>

        <div class="flex flex-col gap-4">
          <UiField v-slot="{ id }" label="Business name">
            <UiInput :id="id" v-model="profile.company.name" />
          </UiField>

          <UiField v-slot="{ id, describedBy }" label="What the business does" help="This becomes your homepage intro.">
            <UiTextarea :id="id" v-model="profile.company.shortDescription" :described-by="describedBy" :rows="3" />
          </UiField>

          <div class="grid gap-4 sm:grid-cols-2">
            <UiField v-slot="{ id }" label="Phone">
              <UiInput :id="id" v-model="profile.contact.phone" />
            </UiField>
            <UiField v-slot="{ id }" label="E-mail">
              <UiInput :id="id" v-model="profile.contact.email" />
            </UiField>
          </div>

          <UiField
            v-slot="{ id, describedBy }"
            label="Logo"
            :help="
              logoMissing
                ? 'No logo was found. Upload one — we read brand colours from it.'
                : 'Used on your website and in the workspace sidebar.'
            "
          >
            <div class="flex flex-col gap-3">
              <div class="flex flex-wrap items-center gap-2">
                <UiInput
                  :id="id"
                  v-model="dashboardLogoUrl"
                  :described-by="describedBy"
                  placeholder="https://…/logo.svg"
                  class="min-w-0 flex-1"
                  @update:model-value="(value: string) => profile && (profile.brand.logo = String(value).trim())"
                />
                <UiButton type="button" size="sm" variant="secondary" :loading="logoUploading" @click="logoFileInput?.click()">
                  {{ logoMissing ? 'Upload' : 'Replace' }}
                </UiButton>
              </div>
              <input
                ref="logoFileInput"
                type="file"
                class="sr-only"
                accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif,.svg,.png,.jpg,.jpeg,.webp"
                @change="onLogoFileSelected"
              />
              <p v-if="logoUploadError" class="text-[0.75rem] text-danger" role="alert">{{ logoUploadError }}</p>
              <div v-if="dashboardLogoUrl.trim()" class="flex items-center gap-3 rounded-lg border border-line bg-sunken px-3 py-2.5">
                <img :src="logoPreviewSrc" alt="" class="h-9 max-w-[9rem] object-contain" />
                <p class="text-[0.75rem] text-soft">Logo preview</p>
              </div>
            </div>
          </UiField>

          <div>
            <p class="mb-2 text-[0.8125rem] font-medium text-soft">
              Services ({{ profile.services.length }})
            </p>
            <ul v-if="profile.services.length" class="flex flex-col gap-1.5">
              <li
                v-for="(service, index) in profile.services"
                :key="index"
                class="flex items-center gap-2 rounded-lg border border-line px-3 py-2"
              >
                <span class="min-w-0 flex-1 truncate text-[0.8125rem] text-ink">{{ service.name }}</span>
                <button
                  type="button"
                  class="grid h-6 w-6 shrink-0 place-items-center rounded text-faint transition-colors hover:text-danger"
                  aria-label="Remove service"
                  @click="removeService(index)"
                >
                  &times;
                </button>
              </li>
            </ul>
            <p v-else class="text-[0.8125rem] text-faint">None found — we will use a general layout.</p>
          </div>
        </div>
      </div>

      <div class="flex flex-col gap-3">
        <div class="rounded-xl border border-line bg-raised p-5 shadow-card">
          <h2 class="mb-3 text-[0.8125rem] font-semibold uppercase tracking-[0.06em] text-faint">Brand colours</h2>
          <div v-if="profile.brand.colors.length" class="flex flex-wrap gap-1.5">
            <span
              v-for="color in profile.brand.colors.slice(0, 8)"
              :key="color"
              class="h-7 w-7 rounded-md border border-line"
              :style="{ backgroundColor: color }"
              :title="color"
            />
          </div>
          <p v-else class="text-[0.75rem] text-faint">No colours yet — upload a logo to pull them.</p>
        </div>

        <div class="rounded-xl border border-line bg-raised p-5 shadow-card">
          <div class="flex gap-2">
            <UiButton @click="emit('back')">Back</UiButton>
            <UiButton variant="primary" size="lg" class="flex-1" arrow @click="submit">
              Choose style
            </UiButton>
          </div>
          <UiButton class="mt-2 w-full" variant="ghost" size="sm" @click="scan">Scan again</UiButton>
        </div>
      </div>
    </div>

    <div v-else class="rounded-xl border border-line bg-raised p-5 text-center">
      <p class="text-sm text-soft">Ready to scan this business.</p>
      <UiButton class="mt-4" variant="primary" @click="scan">Start scan</UiButton>
    </div>
  </div>
</template>
