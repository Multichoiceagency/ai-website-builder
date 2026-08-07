<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type {
  CrmActivity,
  CrmContact,
  CrmDeal,
  CrmNote,
  CrmTask,
  EmailMessage,
} from '@platform/schemas'

interface ContactDetail {
  contact: CrmContact
  activities: CrmActivity[]
  notes: CrmNote[]
  tasks: CrmTask[]
  deals: CrmDeal[]
  emails: EmailMessage[]
}

const api = useApi()
const can = useCan()

const search = ref('')
const selectedId = ref('')
const error = ref('')
const busy = ref(false)

const { data: contacts, refresh: refreshList } = await useAsyncData(
  () => `crm:contacts:${search.value}`,
  () => api.get<CrmContact[]>('/api/v1/crm/contacts', { search: search.value || undefined, limit: 100 }),
  { watch: [search], default: () => [] as CrmContact[] },
)

const { data: detail, refresh: refreshDetail } = await useAsyncData(
  () => `crm:contact:${selectedId.value}`,
  () =>
    selectedId.value
      ? api.get<ContactDetail>(`/api/v1/crm/contacts/${selectedId.value}`)
      : Promise.resolve(null),
  { watch: [selectedId], default: () => null },
)

watch(
  contacts,
  (list) => {
    if (!selectedId.value && list.length) selectedId.value = list[0]!.id
  },
  { immediate: true },
)

function fullName(contact: CrmContact): string {
  return [contact.firstName, contact.lastName].filter(Boolean).join(' ') || contact.email || 'Unnamed contact'
}

function money(cents: number, currency: string): string {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency, maximumFractionDigits: 0 }).format(
    cents / 100,
  )
}

function when(value: string): string {
  return new Date(value).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
}

/**
 * One timeline out of four record types. A CRM whose e-mails, notes, forms and
 * stage moves live on separate tabs makes the user do the merge in their head.
 */
const timeline = computed(() => {
  if (!detail.value) return []

  const entries = [
    ...detail.value.activities.map((activity) => ({
      id: activity.id,
      at: activity.occurredAt,
      kind: activity.type,
      title: activity.subject || 'Activity',
      body: activity.body,
    })),
    ...detail.value.notes.map((note) => ({
      id: note.id,
      at: note.createdAt,
      kind: 'note',
      title: `Note by ${note.createdBy}`,
      body: note.body,
    })),
    ...detail.value.emails.map((message) => ({
      id: message.id,
      at: message.createdAt,
      kind: 'email',
      title: message.subject || 'E-mail',
      body: `${message.status} · ${message.provider || 'not sent'}`,
    })),
  ]

  return entries.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 50)
})

const noteBody = ref('')

async function addNote() {
  if (!selectedId.value || !noteBody.value.trim()) return
  error.value = ''
  busy.value = true
  try {
    await api.post(`/api/v1/crm/contacts/${selectedId.value}/notes`, { body: noteBody.value })
    noteBody.value = ''
    await refreshDetail()
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'Could not save the note.'
  } finally {
    busy.value = false
  }
}

const erasing = ref(false)

async function eraseContact() {
  if (!selectedId.value) return
  error.value = ''
  busy.value = true
  try {
    await api.del(`/api/v1/crm/contacts/${selectedId.value}`)
    erasing.value = false
    selectedId.value = ''
    await refreshList()
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'Could not erase the contact.'
  } finally {
    busy.value = false
  }
}

function exportUrl(contactId: string): string {
  return `/api/v1/crm/contacts/${contactId}/export`
}

const exporting = ref(false)

/** The export is fetched through the API client so it carries the session. */
async function downloadExport() {
  if (!selectedId.value) return
  exporting.value = true
  try {
    const payload = await api.get<unknown>(exportUrl(selectedId.value))
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `contact-${selectedId.value}.json`
    link.click()
    URL.revokeObjectURL(url)
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : 'Could not build the export.'
  } finally {
    exporting.value = false
  }
}
</script>

<template>
  <div>
    <UiPageHeader title="Contacts" :description="`${contacts.length} contact(s)`">
      <template #actions>
        <div class="w-56">
          <UiInput v-model="search" type="search" placeholder="Search name or e-mail" />
        </div>
      </template>
    </UiPageHeader>

    <p v-if="error" class="mb-4 rounded-lg bg-danger-soft px-3 py-2 text-[0.8125rem] text-danger" role="alert">
      {{ error }}
    </p>

    <UiEmptyState
      v-if="!contacts.length"
      title="No contacts yet"
      description="Contacts appear as soon as someone submits a form or places an order."
    />

    <div v-else class="grid gap-5 lg:grid-cols-[20rem_1fr] lg:items-start">
      <UiCard :padded="false">
        <ul class="max-h-[32rem] divide-y divide-line overflow-y-auto">
          <li v-for="contact in contacts" :key="contact.id">
            <button
              type="button"
              class="w-full px-4 py-3 text-left transition-colors hover:bg-sunken/60"
              :class="selectedId === contact.id ? 'bg-sunken' : ''"
              :aria-current="selectedId === contact.id ? 'true' : undefined"
              @click="selectedId = contact.id"
            >
              <p class="truncate text-sm font-medium text-ink">{{ fullName(contact) }}</p>
              <p class="truncate text-[0.8125rem] text-faint">
                {{ contact.companyName || contact.email || contact.phone || '—' }}
              </p>
            </button>
          </li>
        </ul>
      </UiCard>

      <div v-if="detail" class="flex flex-col gap-4">
        <UiCard>
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="min-w-0">
              <h2 class="text-heading font-semibold text-ink">{{ fullName(detail.contact) }}</h2>
              <p class="mt-0.5 text-[0.8125rem] text-soft">
                {{ [detail.contact.jobTitle, detail.contact.companyName].filter(Boolean).join(' · ') || 'No company' }}
              </p>
              <p class="mt-2 text-[0.8125rem] text-faint">
                {{ [detail.contact.email, detail.contact.phone].filter(Boolean).join(' · ') || 'No contact details' }}
              </p>
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <UiBadge :tone="detail.contact.consent.email ? 'positive' : 'neutral'">
                {{ detail.contact.consent.email ? 'Opted in' : 'No e-mail consent' }}
              </UiBadge>
              <UiBadge>{{ detail.contact.source }}</UiBadge>
            </div>
          </div>

          <div v-if="detail.contact.tags.length" class="mt-3 flex flex-wrap gap-1.5">
            <UiBadge v-for="tag in detail.contact.tags" :key="tag" tone="brand">{{ tag }}</UiBadge>
          </div>

          <!--
            Export and erasure sit on the record itself. A right that lives
            three menus deep is a right nobody exercises in time.
          -->
          <div class="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
            <UiButton size="sm" :loading="exporting" @click="downloadExport">Export data</UiButton>
            <UiButton v-if="can('crm:write')" size="sm" variant="danger" @click="erasing = true">
              Erase contact
            </UiButton>
          </div>
        </UiCard>

        <div class="grid gap-4 xl:grid-cols-[1.4fr_1fr] xl:items-start">
          <UiCard>
            <h3 class="mb-3 text-[0.8125rem] font-semibold uppercase tracking-[0.06em] text-faint">Timeline</h3>

            <form v-if="can('crm:write')" class="mb-4 flex flex-col gap-2" @submit.prevent="addNote">
              <UiTextarea v-model="noteBody" :rows="2" placeholder="Add a note…" />
              <div class="flex justify-end">
                <UiButton size="sm" :loading="busy" :disabled="!noteBody.trim()" @click="addNote">Save note</UiButton>
              </div>
            </form>

            <p v-if="!timeline.length" class="text-[0.8125rem] text-soft">Nothing recorded yet.</p>

            <ol v-else class="flex flex-col gap-3.5">
              <li v-for="entry in timeline" :key="entry.id" class="border-l-2 border-line pl-3.5">
                <p class="text-[0.8125rem] font-medium text-ink">{{ entry.title }}</p>
                <p v-if="entry.body" class="mt-0.5 text-[0.8125rem] leading-relaxed text-soft">{{ entry.body }}</p>
                <p class="mt-0.5 text-[0.75rem] text-faint">{{ when(entry.at) }}</p>
              </li>
            </ol>
          </UiCard>

          <div class="flex flex-col gap-4">
            <UiCard>
              <h3 class="mb-3 text-[0.8125rem] font-semibold uppercase tracking-[0.06em] text-faint">Deals</h3>
              <p v-if="!detail.deals.length" class="text-[0.8125rem] text-soft">No deals for this contact.</p>
              <ul v-else class="flex flex-col gap-2.5">
                <li v-for="deal in detail.deals" :key="deal.id" class="flex items-center justify-between gap-3">
                  <div class="min-w-0">
                    <p class="truncate text-[0.875rem] text-ink">{{ deal.title }}</p>
                    <p class="text-[0.75rem] text-faint">{{ deal.stageName }}</p>
                  </div>
                  <span class="shrink-0 text-[0.8125rem] font-semibold tabular-nums text-ink">
                    {{ money(deal.valueCents, deal.currency) }}
                  </span>
                </li>
              </ul>
            </UiCard>

            <UiCard>
              <h3 class="mb-3 text-[0.8125rem] font-semibold uppercase tracking-[0.06em] text-faint">Tasks</h3>
              <p v-if="!detail.tasks.length" class="text-[0.8125rem] text-soft">No open tasks.</p>
              <ul v-else class="flex flex-col gap-2">
                <li v-for="task in detail.tasks" :key="task.id" class="text-[0.8125rem] text-ink">
                  {{ task.title }}
                  <span v-if="task.dueAt" class="text-faint"> · {{ when(task.dueAt) }}</span>
                </li>
              </ul>
            </UiCard>
          </div>
        </div>
      </div>
    </div>

    <UiDialog
      v-model:open="erasing"
      title="Erase this contact?"
      description="The contact, their timeline and the personal data on their leads and messages are deleted. Deals and lead counts stay, without a name. This cannot be undone."
    >
      <template #footer>
        <UiButton @click="erasing = false">Cancel</UiButton>
        <UiButton variant="danger" :loading="busy" @click="eraseContact">Erase permanently</UiButton>
      </template>
    </UiDialog>
  </div>
</template>
