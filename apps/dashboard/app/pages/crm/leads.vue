<script setup lang="ts">
import { computed, ref } from 'vue'
import type { CrmLead, CrmLeadStatus } from '@platform/schemas'

const api = useApi()
const can = useCan()

const status = ref<'' | CrmLeadStatus>('')

const { data: leads, refresh } = await useAsyncData(
  () => `crm:leads:${status.value}`,
  () => api.get<CrmLead[]>('/api/v1/crm/leads', { status: status.value || undefined, limit: 100 }),
  { watch: [status], default: () => [] as CrmLead[] },
)

const STATUS_OPTIONS = [
  { label: 'All statuses', value: '' },
  { label: 'New', value: 'new' },
  { label: 'Working', value: 'working' },
  { label: 'Qualified', value: 'qualified' },
  { label: 'Converted', value: 'converted' },
  { label: 'Disqualified', value: 'disqualified' },
]

const STATUS_TONES: Record<CrmLeadStatus, 'neutral' | 'positive' | 'warning' | 'danger' | 'brand'> = {
  new: 'brand',
  working: 'warning',
  qualified: 'positive',
  converted: 'positive',
  disqualified: 'neutral',
}

const busyId = ref('')
const error = ref('')

const converting = ref<CrmLead | null>(null)
const dealTitle = ref('')
const dealValue = ref('')

async function setStatus(lead: CrmLead, next: CrmLeadStatus) {
  error.value = ''
  busyId.value = lead.id
  try {
    await api.patch(`/api/v1/crm/leads/${lead.id}`, { status: next })
    await refresh()
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'Could not update the lead.'
  } finally {
    busyId.value = ''
  }
}

function startConversion(lead: CrmLead) {
  converting.value = lead
  dealTitle.value = lead.name || lead.email || 'New deal'
  dealValue.value = ''
}

async function convert() {
  const lead = converting.value
  if (!lead) return

  error.value = ''
  busyId.value = lead.id
  try {
    await api.post(`/api/v1/crm/leads/${lead.id}/convert`, {
      title: dealTitle.value,
      valueCents: Math.round(Number(dealValue.value || 0) * 100),
    })
    converting.value = null
    await navigateTo('/crm/pipeline')
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'Could not convert the lead.'
  } finally {
    busyId.value = ''
  }
}

const newCount = computed(() => leads.value.filter((lead) => lead.status === 'new').length)

function relative(value: string): string {
  const minutes = Math.round((Date.now() - new Date(value).getTime()) / 60_000)
  if (minutes < 60) return `${Math.max(1, minutes)}m ago`
  if (minutes < 1440) return `${Math.round(minutes / 60)}h ago`
  return `${Math.round(minutes / 1440)}d ago`
}
</script>

<template>
  <div>
    <UiPageHeader
      title="Leads"
      :description="`${leads.length} lead(s)${newCount ? ` · ${newCount} new` : ''}`"
    >
      <template #actions>
        <div class="w-44">
          <UiSelect v-model="status" :options="STATUS_OPTIONS" />
        </div>
      </template>
    </UiPageHeader>

    <p v-if="error" class="mb-4 rounded-lg bg-danger-soft px-3 py-2 text-[0.8125rem] text-danger" role="alert">
      {{ error }}
    </p>

    <UiEmptyState
      v-if="!leads.length"
      title="No leads yet"
      description="Every website form submission arrives here, scored and attributed to the campaign that produced it."
    />

    <UiCard v-else :padded="false">
      <ul class="divide-y divide-line">
        <li
          v-for="lead in leads"
          :key="lead.id"
          class="flex flex-wrap items-center gap-4 px-4 py-3.5 transition-colors hover:bg-sunken/60"
        >
          <span
            class="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[0.8125rem] font-semibold tabular-nums"
            :class="lead.score >= 60 ? 'bg-positive-soft text-positive' : 'bg-sunken text-soft'"
            :title="`Lead score ${lead.score} out of 100`"
          >
            {{ lead.score }}
          </span>

          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium text-ink">
              {{ lead.name || lead.email || 'Anonymous enquiry' }}
            </p>
            <p class="truncate text-[0.8125rem] text-faint">
              {{ [lead.email, lead.phone].filter(Boolean).join(' · ') || 'No contact details' }}
            </p>
            <p v-if="lead.message" class="mt-1 line-clamp-2 max-w-2xl text-[0.8125rem] leading-relaxed text-soft">
              {{ lead.message }}
            </p>
          </div>

          <div class="shrink-0 text-right text-[0.8125rem] text-faint">
            <p>{{ lead.sourceDetail || lead.source }}</p>
            <p v-if="lead.attribution.source">
              {{ [lead.attribution.source, lead.attribution.medium].filter(Boolean).join(' / ') }}
            </p>
            <p>{{ relative(lead.createdAt) }}</p>
          </div>

          <div class="flex shrink-0 items-center gap-2">
            <UiBadge :tone="STATUS_TONES[lead.status]">{{ lead.status }}</UiBadge>

            <template v-if="can('crm:write')">
              <UiButton
                v-if="lead.status === 'new'"
                size="sm"
                :loading="busyId === lead.id"
                @click="setStatus(lead, 'working')"
              >
                Pick up
              </UiButton>
              <UiButton
                v-else-if="lead.status === 'working'"
                size="sm"
                :loading="busyId === lead.id"
                @click="setStatus(lead, 'qualified')"
              >
                Qualify
              </UiButton>
              <UiButton
                v-if="lead.status !== 'converted' && lead.status !== 'disqualified'"
                size="sm"
                variant="primary"
                @click="startConversion(lead)"
              >
                Create deal
              </UiButton>
            </template>
          </div>
        </li>
      </ul>
    </UiCard>

    <UiDialog
      :open="converting !== null"
      title="Create a deal"
      description="The lead keeps its history; the deal starts in the first stage of your pipeline."
      @update:open="converting = null"
    >
      <form class="flex flex-col gap-4" @submit.prevent="convert">
        <UiField v-slot="{ id }" label="Deal title" required>
          <UiInput :id="id" v-model="dealTitle" placeholder="New website" />
        </UiField>
        <UiField v-slot="{ id, describedBy }" label="Value" help="In euros. Leave empty if you do not know yet.">
          <UiInput :id="id" v-model="dealValue" :described-by="describedBy" type="number" placeholder="5000" />
        </UiField>
      </form>
      <template #footer>
        <UiButton @click="converting = null">Cancel</UiButton>
        <UiButton variant="primary" :disabled="!dealTitle.trim()" @click="convert">Create deal</UiButton>
      </template>
    </UiDialog>
  </div>
</template>
