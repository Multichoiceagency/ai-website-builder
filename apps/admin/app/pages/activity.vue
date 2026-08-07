<script setup lang="ts">
const api = useAdminApi()
const { data } = await useAsyncData('admin:activity:all', () =>
  api.get<{ id: string; tenantId: string; tenantName: string; name: string; actor: string | null; createdAt: string }[]>(
    '/activity',
    { limit: 100 },
  ),
)
</script>

<template>
  <div>
    <UiPageHeader title="Activity" description="Events across every workspace. Names and timestamps only." />
    <UiCard :padded="false">
      <ul class="divide-y divide-line">
        <li v-for="entry in data ?? []" :key="entry.id" class="flex items-center justify-between gap-4 px-4 py-3">
          <span class="min-w-0">
            <span class="block truncate text-[0.8125rem] text-ink">{{ entry.name }}</span>
            <span class="block truncate text-[0.75rem] text-faint">
              <NuxtLink :to="`/tenants/${entry.tenantId}`" class="hover:underline">{{ entry.tenantName }}</NuxtLink>
              <template v-if="entry.actor"> · {{ entry.actor }}</template>
            </span>
          </span>
          <span class="shrink-0 text-[0.75rem] text-faint">{{ new Date(entry.createdAt).toLocaleString() }}</span>
        </li>
      </ul>
      <p v-if="!data?.length" class="px-4 py-10 text-center text-[0.8125rem] text-faint">No activity yet.</p>
    </UiCard>
  </div>
</template>
