<script setup lang="ts">
import { ref } from 'vue'

const api = useAdminApi()

interface Campaign {
  id: string
  title: string
  status: string
  body: string
  createdAt: string
  updatedAt: string
}

const { data: campaigns, refresh } = await useAsyncData('admin:marketing', () =>
  api.get<Campaign[]>('/marketing/campaigns'),
)

const title = ref('')
const body = ref('')
const busy = ref(false)
const error = ref('')

async function createDraft() {
  error.value = ''
  if (!title.value.trim()) {
    error.value = 'Enter a title.'
    return
  }
  busy.value = true
  try {
    await api.post('/marketing/campaigns', {
      title: title.value.trim(),
      body: body.value.trim(),
      status: 'draft',
    })
    title.value = ''
    body.value = ''
    await refresh()
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Could not create campaign.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div>
    <UiPageHeader
      title="Marketing"
      description="Stub inbox for platform campaigns — send pipeline comes later."
    />

    <UiCard class="mb-5">
      <h2 class="mb-3 text-heading font-semibold text-ink">New draft</h2>
      <p v-if="error" class="mb-3 rounded-lg bg-danger-soft px-3 py-2 text-[0.8125rem] text-danger" role="alert">
        {{ error }}
      </p>
      <div class="grid gap-3">
        <UiField v-slot="{ id }" label="Title">
          <UiInput :id="id" v-model="title" placeholder="Spring launch note" />
        </UiField>
        <UiField v-slot="{ id }" label="Body">
          <textarea
            :id="id"
            v-model="body"
            rows="4"
            class="w-full rounded-lg border border-line bg-raised px-3 py-2 text-[0.875rem] text-ink"
            placeholder="Draft copy…"
          />
        </UiField>
        <div>
          <UiButton variant="primary" :loading="busy" @click="createDraft">Save draft</UiButton>
        </div>
      </div>
    </UiCard>

    <UiCard :padded="false">
      <ul v-if="campaigns?.length" class="divide-y divide-line">
        <li v-for="campaign in campaigns" :key="campaign.id" class="px-4 py-3">
          <div class="flex items-center justify-between gap-3">
            <p class="text-[0.875rem] font-medium text-ink">{{ campaign.title }}</p>
            <UiBadge>{{ campaign.status }}</UiBadge>
          </div>
          <p v-if="campaign.body" class="mt-1 line-clamp-2 text-[0.8125rem] text-soft">{{ campaign.body }}</p>
        </li>
      </ul>
      <p v-else class="px-4 py-10 text-center text-[0.8125rem] text-faint">No campaigns yet.</p>
    </UiCard>
  </div>
</template>
