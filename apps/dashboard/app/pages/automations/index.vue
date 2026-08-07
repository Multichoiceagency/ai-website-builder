<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Automation, AutomationRun, AutomationStatus } from '@platform/schemas'

/**
 * Automations (§31) — the surface over an engine that already exists.
 *
 * Two questions get asked of an automation screen, and both are about the
 * past: "what will this do?" and "why did that run stop where it did?". The
 * graph answers the first. The run inspector answers the second by drawing the
 * *same* graph with each node's recorded outcome on it, so a run that ended
 * early shows the condition that ended it rather than a status word.
 *
 * Nothing here can edit the graph. Authoring is a separate act with its own
 * validation; this screen reads, enables, pauses and explains.
 */
interface AutomationList {
  automations: Automation[]
  triggerEvents: string[]
}

interface AutomationDetail {
  automation: Automation
  runs: AutomationRun[]
}

const api = useApi()
const can = useCan()

const { data: list, refresh } = await useAsyncData(
  'automations',
  () => api.get<AutomationList>('/api/v1/crm/automations'),
  { default: () => ({ automations: [], triggerEvents: [] }) as AutomationList },
)

const selectedId = ref('')

const { data: detail, refresh: refreshDetail } = await useAsyncData(
  () => `automation:${selectedId.value}`,
  () =>
    selectedId.value
      ? api.get<AutomationDetail>(`/api/v1/crm/automations/${selectedId.value}`)
      : Promise.resolve(null),
  { watch: [selectedId], default: () => null },
)

const error = ref('')
const busyId = ref('')

// The inspected run is fetched on its own, because the list endpoint returns
// runs without their per-node rows — those are what the inspector is for.
const inspected = ref<AutomationRun | null>(null)

const STATUS_TONES: Record<AutomationStatus, 'neutral' | 'positive' | 'warning'> = {
  draft: 'neutral',
  active: 'positive',
  paused: 'warning',
}

const RUN_TONES: Record<string, 'neutral' | 'positive' | 'warning' | 'danger'> = {
  completed: 'positive',
  waiting: 'warning',
  running: 'warning',
  failed: 'danger',
  cancelled: 'neutral',
  pending: 'neutral',
}

const NODE_RUN_TONES: Record<string, 'positive' | 'danger' | 'warning'> = {
  completed: 'positive',
  failed: 'danger',
  skipped: 'warning',
}

async function setStatus(automation: Automation, status: AutomationStatus) {
  error.value = ''
  busyId.value = automation.id
  try {
    await api.patch(`/api/v1/crm/automations/${automation.id}`, { status })
    await refresh()
    await refreshDetail()
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'Could not update the automation.'
  } finally {
    busyId.value = ''
  }
}

async function resumeDue() {
  error.value = ''
  busyId.value = 'resume'
  try {
    await api.post('/api/v1/crm/automations/resume-due')
    await refresh()
    await refreshDetail()
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'Could not resume the waiting runs.'
  } finally {
    busyId.value = ''
  }
}

async function inspect(run: AutomationRun) {
  error.value = ''
  try {
    inspected.value = await api.get<AutomationRun>(`/api/v1/crm/automations/runs/${run.id}`)
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'Could not load that run.'
  }
}

const waitingRuns = computed(() => (detail.value?.runs ?? []).filter((run) => run.status === 'waiting').length)

/**
 * Why the run ended, stated plainly.
 *
 * Derived rather than stored: the engine records what each node did, and the
 * ending follows from that — a failure names itself, a condition that ended a
 * run leaves the last recorded node with nowhere to go.
 */
const endingReason = computed(() => {
  const run = inspected.value
  if (!run) return ''

  if (run.status === 'failed') return run.error || 'A node failed.'
  if (run.status === 'waiting') return `Parked by a delay${run.resumeAt ? `, resuming ${when(run.resumeAt)}` : ''}.`
  if (run.status === 'cancelled') return 'Cancelled before it finished.'
  if (run.status === 'running') return 'Still running.'

  const skipped = run.nodeRuns.find((node) => node.status === 'skipped')
  if (skipped) return `Ended at "${skipped.nodeId}" — a condition there was not met.`

  return 'Ran to the end of the graph.'
})

function when(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleString('nl-NL', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <div>
    <UiPageHeader
      title="Automations"
      :description="`${list.automations.length} automation(s) · triggers, conditions, delays, branches and actions`"
    >
      <template #actions>
        <UiButton v-if="can('automation:write')" size="sm" :loading="busyId === 'resume'" @click="resumeDue">
          Resume waiting runs
        </UiButton>
      </template>
    </UiPageHeader>

    <p v-if="error" class="mb-4 rounded-lg bg-danger-soft px-3 py-2 text-[0.8125rem] text-danger" role="alert">
      {{ error }}
    </p>

    <UiEmptyState
      v-if="!list.automations.length"
      title="No automations yet"
      description="An automation is a stored graph: something happens, a condition is checked, and an action runs. Runs are recorded per step, so a restart never repeats an action."
    />

    <div v-else class="grid gap-5 lg:grid-cols-[22rem_1fr] lg:items-start">
      <UiCard :padded="false">
        <ul class="divide-y divide-line">
          <li v-for="automation in list.automations" :key="automation.id">
            <button
              type="button"
              class="w-full px-4 py-3.5 text-left transition-colors hover:bg-sunken/60"
              :class="selectedId === automation.id ? 'bg-sunken' : ''"
              :aria-current="selectedId === automation.id ? 'true' : undefined"
              @click="selectedId = automation.id"
            >
              <div class="flex items-center justify-between gap-2">
                <p class="truncate text-sm font-medium text-ink">{{ automation.name }}</p>
                <UiBadge :tone="STATUS_TONES[automation.status]">{{ automation.status }}</UiBadge>
              </div>
              <p class="mt-0.5 truncate text-[0.8125rem] text-faint">
                {{ automation.triggerEvent || 'manual trigger' }} ·
                {{ automation.runCount }} run{{ automation.runCount === 1 ? '' : 's' }} ·
                last {{ when(automation.lastRunAt) }}
              </p>
            </button>
          </li>
        </ul>
      </UiCard>

      <div v-if="detail" class="flex flex-col gap-4">
        <UiCard>
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="min-w-0">
              <h2 class="text-heading font-semibold text-ink">{{ detail.automation.name }}</h2>
              <p v-if="detail.automation.description" class="mt-0.5 text-[0.8125rem] text-soft">
                {{ detail.automation.description }}
              </p>
              <p class="mt-2 text-[0.8125rem] text-faint">
                Version {{ detail.automation.version }} · last run {{ when(detail.automation.lastRunAt) }}
                <span v-if="waitingRuns"> · {{ waitingRuns }} waiting</span>
                <span v-if="detail.automation.sourceFlowId"> · compiled from an e-mail flow</span>
              </p>
            </div>

            <div v-if="can('automation:write')" class="flex shrink-0 items-center gap-2">
              <UiButton
                v-if="detail.automation.status !== 'active'"
                size="sm"
                variant="primary"
                :loading="busyId === detail.automation.id"
                @click="setStatus(detail.automation, 'active')"
              >
                Enable
              </UiButton>
              <UiButton
                v-else
                size="sm"
                :loading="busyId === detail.automation.id"
                @click="setStatus(detail.automation, 'paused')"
              >
                Pause
              </UiButton>
            </div>
          </div>
        </UiCard>

        <UiCard>
          <h3 class="mb-4 text-[0.8125rem] font-semibold uppercase tracking-[0.06em] text-faint">The graph</h3>
          <AutomationGraph :graph="detail.automation.graph" />
        </UiCard>

        <UiCard :padded="false">
          <h3 class="px-5 py-4 text-[0.8125rem] font-semibold uppercase tracking-[0.06em] text-faint">
            Recent runs
          </h3>

          <p v-if="!detail.runs.length" class="border-t border-line px-5 py-8 text-center text-[0.8125rem] text-soft">
            This automation has not run yet.
          </p>

          <ul v-else class="divide-y divide-line border-t border-line">
            <li v-for="run in detail.runs" :key="run.id">
              <button
                type="button"
                class="flex w-full items-center gap-4 px-5 py-3 text-left transition-colors hover:bg-sunken/60"
                @click="inspect(run)"
              >
                <div class="min-w-0 flex-1">
                  <p class="truncate font-mono text-[0.75rem] text-soft">{{ run.triggerKey }}</p>
                  <p class="text-[0.75rem] text-faint">
                    started {{ when(run.startedAt) }}
                    <span v-if="run.resumeAt"> · resumes {{ when(run.resumeAt) }}</span>
                    <span v-if="run.error" class="text-danger"> · {{ run.error }}</span>
                  </p>
                </div>
                <UiBadge :tone="RUN_TONES[run.status] ?? 'neutral'">{{ run.status }}</UiBadge>
              </button>
            </li>
          </ul>
        </UiCard>
      </div>

      <UiCard v-else>
        <p class="text-[0.8125rem] text-soft">Select an automation to see its graph and its runs.</p>
      </UiCard>
    </div>

    <!-- Run inspector: read-only by design. -->
    <UiDialog
      :open="Boolean(inspected)"
      title="Run"
      wide
      @update:open="(value: boolean) => { if (!value) inspected = null }"
    >
      <div v-if="inspected && detail" class="flex flex-col gap-5">
        <div class="flex flex-wrap items-center gap-3">
          <UiBadge :tone="RUN_TONES[inspected.status] ?? 'neutral'">{{ inspected.status }}</UiBadge>
          <p class="font-mono text-[0.75rem] text-soft">{{ inspected.triggerKey }}</p>
          <p class="text-[0.75rem] text-faint">
            {{ when(inspected.startedAt) }} → {{ when(inspected.finishedAt) }}
          </p>
        </div>

        <p class="rounded-lg bg-sunken/60 px-3 py-2 text-[0.8125rem] text-soft">{{ endingReason }}</p>

        <div>
          <h3 class="mb-3 text-[0.8125rem] font-semibold uppercase tracking-[0.06em] text-faint">
            What ran
          </h3>
          <AutomationGraph
            :graph="detail.automation.graph"
            :node-runs="inspected.nodeRuns"
            :current-node-id="inspected.currentNodeId"
          />
        </div>

        <div v-if="inspected.nodeRuns.length">
          <h3 class="mb-2 text-[0.8125rem] font-semibold uppercase tracking-[0.06em] text-faint">Step by step</h3>
          <ol class="divide-y divide-line rounded-lg border border-line">
            <li
              v-for="nodeRun in inspected.nodeRuns"
              :key="nodeRun.id"
              class="flex items-center gap-3 px-3 py-2.5"
            >
              <span class="w-20 shrink-0 text-[0.6875rem] uppercase tracking-[0.06em] text-faint">
                {{ nodeRun.kind }}
              </span>
              <span class="min-w-0 flex-1 truncate font-mono text-[0.75rem] text-ink">{{ nodeRun.nodeId }}</span>
              <span class="hidden text-[0.75rem] text-faint sm:inline">{{ when(nodeRun.finishedAt) }}</span>
              <UiBadge :tone="NODE_RUN_TONES[nodeRun.status] ?? 'neutral'">{{ nodeRun.status }}</UiBadge>
            </li>
          </ol>
        </div>

        <div v-if="Object.keys(inspected.context).length">
          <h3 class="mb-2 text-[0.8125rem] font-semibold uppercase tracking-[0.06em] text-faint">Context</h3>
          <pre class="overflow-x-auto rounded-lg bg-sunken/60 p-3 text-[0.75rem] leading-relaxed text-soft">{{
            JSON.stringify(inspected.context, null, 2)
          }}</pre>
        </div>
      </div>

      <template #footer>
        <UiButton size="sm" @click="inspected = null">Close</UiButton>
      </template>
    </UiDialog>
  </div>
</template>
