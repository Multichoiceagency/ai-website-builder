<script setup lang="ts">
import { computed, ref } from 'vue'
import type { CrmContact, CrmPipelineBoard } from '@platform/schemas'

const api = useApi()
const can = useCan()

const { data: board, refresh } = await useAsyncData(
  'crm:pipeline',
  () => api.get<CrmPipelineBoard>('/api/v1/crm/pipeline'),
  { default: () => null },
)

const error = ref('')
const draggingDealId = ref('')
const dropTargetStage = ref('')
const busy = ref(false)

const currency = computed(() => board.value?.currency ?? 'EUR')

function money(cents: number): string {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: currency.value,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

/** "3d", "4h", "12m" — a stage age is only ever read at a glance. */
function duration(seconds: number): string {
  if (seconds < 3600) return `${Math.max(1, Math.round(seconds / 60))}m`
  if (seconds < 86_400) return `${Math.round(seconds / 3600)}h`
  return `${Math.round(seconds / 86_400)}d`
}

const stageOptions = computed(() =>
  (board.value?.columns ?? []).map((column) => ({ label: column.stage.name, value: column.stage.key })),
)

async function moveDeal(dealId: string, stageKey: string) {
  error.value = ''
  busy.value = true
  try {
    await api.post(`/api/v1/crm/deals/${dealId}/move`, { stageKey })
    await refresh()
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'Could not move the deal.'
  } finally {
    busy.value = false
    draggingDealId.value = ''
    dropTargetStage.value = ''
  }
}

function onDragStart(event: DragEvent, dealId: string) {
  draggingDealId.value = dealId
  event.dataTransfer?.setData('text/plain', dealId)
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}

function onDrop(event: DragEvent, stageKey: string) {
  const dealId = event.dataTransfer?.getData('text/plain') || draggingDealId.value
  dropTargetStage.value = ''
  if (dealId) void moveDeal(dealId, stageKey)
}

// Creating a deal
const creating = ref(false)
const title = ref('')
const value = ref('')
const contactId = ref('')

const { data: contacts } = await useAsyncData(
  'crm:pipeline:contacts',
  () => api.get<CrmContact[]>('/api/v1/crm/contacts', { limit: 100 }),
  { default: () => [] as CrmContact[] },
)

const contactOptions = computed(() => [
  { label: 'No contact', value: '' },
  ...contacts.value.map((contact) => ({
    label: [contact.firstName, contact.lastName].filter(Boolean).join(' ') || contact.email,
    value: contact.id,
  })),
])

async function createDeal() {
  error.value = ''
  busy.value = true
  try {
    await api.post('/api/v1/crm/deals', {
      title: title.value,
      valueCents: Math.round(Number(value.value || 0) * 100),
      contactId: contactId.value || null,
    })
    creating.value = false
    title.value = ''
    value.value = ''
    await refresh()
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'Could not create the deal.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div>
    <UiPageHeader title="Pipeline" :description="board ? `${board.pipeline.name} · ${board.columns.length} stages` : ''">
      <template #actions>
        <UiButton v-if="can('crm:write')" size="sm" variant="primary" @click="creating = true">New deal</UiButton>
      </template>
    </UiPageHeader>

    <div class="mb-5 grid gap-3 sm:grid-cols-3">
      <UiStat label="Open" :value="money(board?.openValueCents ?? 0)" hint="Value of every open deal" />
      <UiStat label="Forecast" :value="money(board?.forecastCents ?? 0)" hint="Weighted by stage probability" />
      <UiStat label="Won" :value="money(board?.wonValueCents ?? 0)" hint="Closed and won" />
    </div>

    <p v-if="error" class="mb-4 rounded-lg bg-danger-soft px-3 py-2 text-[0.8125rem] text-danger" role="alert">
      {{ error }}
    </p>

    <!--
      Drag-and-drop is the fast path, not the only path: every card also carries
      a stage select, so the board is usable with a keyboard and a screen reader.
    -->
    <div class="flex gap-3 overflow-x-auto pb-4">
      <section
        v-for="column in board?.columns ?? []"
        :key="column.stage.id"
        class="flex w-72 shrink-0 flex-col rounded-card border bg-sunken/40 transition-colors"
        :class="dropTargetStage === column.stage.key ? 'border-brand bg-brand-soft/30' : 'border-line'"
        :aria-label="`${column.stage.name}, ${column.deals.length} deals`"
        @dragover.prevent="dropTargetStage = column.stage.key"
        @dragleave="dropTargetStage = dropTargetStage === column.stage.key ? '' : dropTargetStage"
        @drop.prevent="onDrop($event, column.stage.key)"
      >
        <header class="flex items-baseline justify-between px-3.5 py-3">
          <h2 class="text-[0.8125rem] font-semibold uppercase tracking-[0.06em] text-faint">
            {{ column.stage.name }}
          </h2>
          <span class="text-[0.75rem] tabular-nums text-faint">{{ column.deals.length }}</span>
        </header>

        <p class="px-3.5 pb-3 text-[0.8125rem] text-soft">
          {{ money(column.totalValueCents) }}
          <span v-if="!column.stage.isWon && !column.stage.isLost" class="text-faint">
            · {{ Math.round(column.stage.probability * 100) }}%
          </span>
          <span v-if="column.averageTimeInStageSeconds" class="text-faint">
            · avg {{ duration(column.averageTimeInStageSeconds) }}
          </span>
        </p>

        <div class="flex flex-col gap-2 px-2.5 pb-2.5">
          <article
            v-for="deal in column.deals"
            :key="deal.id"
            class="rounded-lg border border-line bg-raised p-3 shadow-card transition-[transform,box-shadow] hover:-translate-y-px"
            :class="draggingDealId === deal.id ? 'opacity-50' : ''"
            :draggable="can('crm:write')"
            @dragstart="onDragStart($event, deal.id)"
            @dragend="draggingDealId = ''"
          >
            <p class="truncate text-sm font-medium text-ink">{{ deal.title }}</p>
            <p v-if="deal.contactName" class="truncate text-[0.8125rem] text-faint">{{ deal.contactName }}</p>

            <div class="mt-2 flex items-center justify-between gap-2">
              <span class="text-[0.8125rem] font-semibold tabular-nums text-ink">{{ money(deal.valueCents) }}</span>
              <span class="text-[0.75rem] tabular-nums text-faint" :title="'Time in this stage'">
                {{ duration(deal.timeInStageSeconds) }}
              </span>
            </div>

            <label v-if="can('crm:write')" class="mt-2.5 block">
              <span class="sr-only">Move {{ deal.title }} to another stage</span>
              <select
                class="h-8 w-full rounded-md border border-line bg-sunken px-2 text-[0.8125rem] text-soft transition-colors hover:border-line-strong"
                :value="deal.stageKey"
                :disabled="busy"
                @change="moveDeal(deal.id, ($event.target as HTMLSelectElement).value)"
              >
                <option v-for="option in stageOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </label>
          </article>

          <p v-if="!column.deals.length" class="px-1 py-4 text-center text-[0.8125rem] text-faint">
            Nothing here
          </p>
        </div>
      </section>
    </div>

    <UiDialog v-model:open="creating" title="New deal">
      <form class="flex flex-col gap-4" @submit.prevent="createDeal">
        <UiField v-slot="{ id }" label="Title" required>
          <UiInput :id="id" v-model="title" placeholder="New website" />
        </UiField>
        <UiField v-slot="{ id, describedBy }" label="Value" help="In euros.">
          <UiInput :id="id" v-model="value" :described-by="describedBy" type="number" placeholder="5000" />
        </UiField>
        <UiField v-slot="{ id }" label="Contact">
          <UiSelect :id="id" v-model="contactId" :options="contactOptions" />
        </UiField>
      </form>
      <template #footer>
        <UiButton @click="creating = false">Cancel</UiButton>
        <UiButton variant="primary" :loading="busy" :disabled="!title.trim()" @click="createDeal">Create</UiButton>
      </template>
    </UiDialog>
  </div>
</template>
