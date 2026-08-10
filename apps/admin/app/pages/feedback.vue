<script setup lang="ts">
const api = useAdminApi()

interface FeedbackRow {
  id: string
  message: string
  pagePath: string
  createdAt: string
  userEmail: string | null
  userName: string | null
  tenantName: string | null
}

const { data: items } = await useAsyncData('admin:feedback', () => api.get<FeedbackRow[]>('/feedback'))
</script>

<template>
  <div>
    <UiPageHeader title="Feedback" description="Messages sent from the customer dashboard." />

    <UiCard :padded="false">
      <ul v-if="items?.length" class="divide-y divide-line">
        <li v-for="item in items" :key="item.id" class="px-4 py-3.5">
          <div class="flex flex-wrap items-baseline justify-between gap-2">
            <p class="text-[0.8125rem] font-medium text-ink">
              {{ item.userName || 'Unknown' }}
              <span class="font-normal text-faint"> · {{ item.userEmail || '—' }}</span>
            </p>
            <time class="text-[0.75rem] text-faint" :datetime="item.createdAt">
              {{ new Date(item.createdAt).toLocaleString() }}
            </time>
          </div>
          <p class="mt-1 text-[0.75rem] text-soft">
            {{ item.tenantName || 'No workspace' }}
            <span v-if="item.pagePath"> · {{ item.pagePath }}</span>
          </p>
          <p class="mt-2 whitespace-pre-wrap text-[0.875rem] leading-relaxed text-ink">{{ item.message }}</p>
        </li>
      </ul>
      <p v-else class="px-4 py-10 text-center text-[0.8125rem] text-faint">No feedback yet.</p>
    </UiCard>
  </div>
</template>
