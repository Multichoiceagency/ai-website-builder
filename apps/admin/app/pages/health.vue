<script setup lang="ts">
const api = useAdminApi()
const { data } = await useAsyncData('admin:health', () =>
  api.get<{ services: { id: string; name: string; status: string; detail: string }[] }>('/health'),
)

const TONE: Record<string, 'positive' | 'warning' | 'danger'> = { up: 'positive', degraded: 'warning', down: 'danger' }
</script>

<template>
  <div>
    <UiPageHeader title="Service health" description="What this installation can currently do." />
    <UiCard :padded="false">
      <ul class="divide-y divide-line">
        <li v-for="service in data?.services ?? []" :key="service.id" class="flex items-center justify-between gap-4 px-4 py-3.5">
          <span class="min-w-0">
            <span class="block truncate text-[0.875rem] font-medium text-ink">{{ service.name }}</span>
            <span class="block truncate text-[0.75rem] text-faint">{{ service.detail }}</span>
          </span>
          <UiBadge :tone="TONE[service.status] ?? 'neutral'">{{ service.status }}</UiBadge>
        </li>
      </ul>
    </UiCard>
  </div>
</template>
