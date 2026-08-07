<script setup lang="ts">
const api = useAdminApi()
const { data } = await useAsyncData('admin:access-log', () =>
  api.get<{ id: string; action: string; tenantId: string | null; staff: string; createdAt: string }[]>('/access-log'),
)
</script>

<template>
  <div>
    <UiPageHeader
      title="Staff access"
      description="Every time staff looked at a customer workspace. Visible to staff, so the accountability runs both ways."
    />
    <UiCard :padded="false">
      <ul class="divide-y divide-line">
        <li v-for="entry in data ?? []" :key="entry.id" class="flex items-center justify-between gap-4 px-4 py-3">
          <span class="min-w-0">
            <span class="block truncate text-[0.8125rem] text-ink">{{ entry.action.replace(/_/g, ' ') }}</span>
            <span class="block truncate text-[0.75rem] text-faint">{{ entry.staff }}</span>
          </span>
          <span class="shrink-0 text-[0.75rem] text-faint">{{ new Date(entry.createdAt).toLocaleString() }}</span>
        </li>
      </ul>
      <p v-if="!data?.length" class="px-4 py-10 text-center text-[0.8125rem] text-faint">No staff access recorded.</p>
    </UiCard>
  </div>
</template>
